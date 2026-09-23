"""Incidents service: ticket CRUD, workflow transitions, assignment, escalation, and notes.

Visibility: admins see every ticket, engineers see tickets assigned to them (plus their own reports),
employees see only tickets they reported. Hidden tickets return 404, not 403.
"""

import logging
import re
from typing import Any

from psycopg import sql

from common import api, auth, db
from common.api import Request, Route, json_response
from common.errors import Conflict, Forbidden, NotFound, ValidationError
from common.validation import Validator, reject_unknown_fields

logging.getLogger().setLevel(logging.INFO)

CATEGORIES = ("hardware", "software", "facility", "other")
PRIORITIES = ("low", "medium", "high", "critical")
STATUSES = ("open", "in_progress", "blocked", "resolved", "closed")
ACTIVE_STATUSES = ("open", "in_progress", "blocked")
STATUS_LABELS = {"open": "Open", "in_progress": "In progress", "blocked": "Blocked", "resolved": "Resolved", "closed": "Closed"}

ESCALATION_KEYWORD = re.compile(r"\bextreme\b", re.IGNORECASE)

ASSIGNEE = "assignee"
REPORTER = "reporter"
# Allowed moves: current status -> {next status: who may make the move}. Admins may make any listed move.
WORKFLOW = {
    "open": {"in_progress": ASSIGNEE, "blocked": ASSIGNEE},
    "in_progress": {"blocked": ASSIGNEE, "resolved": ASSIGNEE},
    "blocked": {"in_progress": ASSIGNEE},
    "resolved": {"closed": REPORTER, "in_progress": REPORTER},
    "closed": {},
}

# User-facing messages, kept in one place so the frontend and tests can rely on them.
MSG_NOT_FOUND = "This incident doesn't exist or you don't have access to it."
MSG_MISSING_REPORT = "Add a title, choose where it is, and describe the problem."
MSG_UNKNOWN_SEAT = "Choose a location from the list."
MSG_BLOCKED_REASON = "Add what's blocking this ticket before marking it blocked."
MSG_RESOLUTION_NOTE = "Add a resolution note so the reporter knows what was fixed."
MSG_NEEDS_ASSIGNEE = "Assign an engineer before starting work."
MSG_ASSIGN_ADMIN_ONLY = "Only facility admins can assign tickets."
MSG_ASSIGN_MISSING = "Choose an engineer to assign."
MSG_ASSIGN_INACTIVE = "That person isn't an active engineer."
MSG_ASSIGN_CLOSED = "Closed tickets can't be reassigned."
MSG_ESCALATE_REASON = "Say why this needs escalating so the admin can prioritise it."
MSG_ESCALATE_FORBIDDEN = "Only the person who reported this ticket or an admin can escalate it."
MSG_ALREADY_ESCALATED = "This ticket is already escalated."
MSG_ESCALATE_INACTIVE = "Only open, in-progress, or blocked tickets can be escalated."
MSG_NOTE_EMPTY = "Write a note before posting."
MSG_NOTE_FORBIDDEN = "Only the reporter, the assigned engineer, or an admin can add notes."
MSG_NOTE_CLOSED = "Closed tickets can't take new notes."
MSG_EDIT_FORBIDDEN = "Only the reporter or an admin can edit this ticket."
MSG_EDIT_NOT_OPEN = "Tickets can only be edited while they're open."

SELECT_INCIDENT = """
    SELECT i.*,
           s.code AS seat_code, f.id AS floor_id, f.level AS floor_level, f.name AS floor_name,
           b.id AS building_id, b.code AS building_code, b.name AS building_name,
           r.full_name AS reporter_name, a.full_name AS assignee_name
    FROM incidents i
    JOIN seats s ON s.id = i.seat_id
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    JOIN users r ON r.id = i.reporter_id
    LEFT JOIN users a ON a.id = i.assignee_id
"""


def _visibility(user: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """SQL condition restricting incidents to those the user may see."""
    if user["role"] == auth.ADMIN:
        return "TRUE", {}
    if user["role"] == auth.ENGINEER:
        return "(i.assignee_id = %(viewer)s OR i.reporter_id = %(viewer)s)", {"viewer": user["id"]}
    return "i.reporter_id = %(viewer)s", {"viewer": user["id"]}


def _lock(cur: Any, user: dict[str, Any], incident_id: int) -> dict[str, Any]:
    """Load a visible incident row and lock it for the rest of the transaction."""
    condition, params = _visibility(user)
    cur.execute(f"SELECT i.* FROM incidents i WHERE i.id = %(id)s AND {condition} FOR UPDATE", {**params, "id": incident_id})
    row = cur.fetchone()
    if row is None:
        raise NotFound(MSG_NOT_FOUND)
    return row


def _detail(user: dict[str, Any], incident_id: int) -> dict[str, Any]:
    """Full incident with location, people, notes, and status history."""
    condition, params = _visibility(user)
    incident = db.fetch_one(f"{SELECT_INCIDENT} WHERE i.id = %(id)s AND {condition}", {**params, "id": incident_id})
    if incident is None:
        raise NotFound(MSG_NOT_FOUND)
    incident["notes"] = _notes(incident_id)
    incident["history"] = db.fetch_all("""
        SELECT h.id, h.from_status, h.to_status, h.reason, h.changed_at, h.changed_by, u.full_name AS changed_by_name
        FROM incident_status_history h JOIN users u ON u.id = h.changed_by
        WHERE h.incident_id = %s ORDER BY h.changed_at, h.id
    """, (incident_id,))
    return incident


def _notes(incident_id: int) -> list[dict[str, Any]]:
    return db.fetch_all("""
        SELECT n.id, n.incident_id, n.author_id, u.full_name AS author_name, u.role AS author_role, n.body, n.created_at, n.updated_at
        FROM incident_notes n JOIN users u ON u.id = n.author_id
        WHERE n.incident_id = %s ORDER BY n.created_at, n.id
    """, (incident_id,))


def _log(cur: Any, incident: dict[str, Any], user: dict[str, Any], to_status: str, reason: str | None) -> None:
    cur.execute("""
        INSERT INTO incident_status_history (incident_id, from_status, to_status, reason, changed_by)
        VALUES (%s, %s, %s, %s, %s)
    """, (incident["id"], incident["status"], to_status, reason, user["id"]))


def _raise_friendly(v: Validator, required: set[str], message: str) -> None:
    """Raise with a specific message when required fields are missing, otherwise the generic one."""
    if v.errors:
        missing = any(v.errors.get(name) == "This field is required" for name in required)
        raise ValidationError(message if missing else "One or more fields are invalid", v.errors)


def _keyword_escalation(title: str, description: str) -> str | None:
    """Return an escalation reason quoting the report if it contains the escalation keyword."""
    for text in (description, title):
        match = ESCALATION_KEYWORD.search(text)
        if match:
            start, end = max(0, match.start() - 40), min(len(text), match.end() + 60)
            snippet = ("…" if start else "") + text[start:end].strip() + ("…" if end < len(text) else "")
            return f"Auto-flagged — report contains “{match.group(0).lower()}”: “{snippet}”"
    return None


def _ensure_seat(seat_id: int) -> None:
    if db.fetch_one("SELECT 1 FROM seats WHERE id = %s", (seat_id,)) is None:
        raise ValidationError(MSG_UNKNOWN_SEAT, {"seat_id": "Unknown location"})


# Incidents

def list_incidents(request: Request) -> dict[str, Any]:
    """Filters: status, priority, category, building_id, floor_id, seat_id, assignee_id, unassigned, escalated, q, limit, offset."""
    f = (Validator(request.query)
         .choice("status", STATUSES).choice("priority", PRIORITIES).choice("category", CATEGORIES)
         .integer("building_id").integer("floor_id").integer("seat_id").integer("assignee_id")
         .boolean("unassigned").boolean("escalated").string("q", max_length=200)
         .integer("limit", maximum=500).integer("offset", minimum=0)
         .validate())
    condition, params = _visibility(request.user)
    where = [condition]
    for field, column in (("status", "i.status"), ("priority", "i.priority"), ("category", "i.category"),
                          ("building_id", "b.id"), ("floor_id", "f.id"), ("seat_id", "s.id"), ("assignee_id", "i.assignee_id")):
        if f.get(field) is not None:
            where.append(f"{column} = %({field})s")
            params[field] = f[field]
    if f.get("unassigned"):
        where.append("i.assignee_id IS NULL")
    if f.get("escalated") is not None:
        where.append("i.is_escalated = %(escalated)s")
        params["escalated"] = f["escalated"]
    if f.get("q"):
        where.append("""concat_ws(' ', 'INC-' || i.id, i.title, i.description, i.asset_tag, b.code, b.name, f.name, s.code, a.full_name)
                        ILIKE '%%' || %(q)s || '%%'""")
        params["q"] = f["q"]
    params.update(limit=f.get("limit") or 100, offset=f.get("offset") or 0)
    rows = db.fetch_all(f"{SELECT_INCIDENT} WHERE {' AND '.join(where)} ORDER BY i.created_at DESC, i.id DESC LIMIT %(limit)s OFFSET %(offset)s", params)
    return json_response(200, rows)


def create_incident(request: Request) -> dict[str, Any]:
    body = request.json()
    reject_unknown_fields(body, {"title", "description", "category", "priority", "seat_id", "asset_tag"})
    v = (Validator(body)
         .string("title", required=True).string("description", required=True, max_length=5000)
         .choice("category", CATEGORIES, required=True).choice("priority", PRIORITIES)
         .integer("seat_id", required=True).string("asset_tag", max_length=100))
    _raise_friendly(v, {"title", "description", "seat_id"}, MSG_MISSING_REPORT)
    data = v.validate()
    _ensure_seat(data["seat_id"])

    escalation = _keyword_escalation(data["title"], data["description"])
    values = {
        "asset_tag": None, "priority": "medium", **data,
        "reporter_id": request.user["id"],
        "is_escalated": escalation is not None,
        "escalation_reason": escalation,
    }
    if escalation:
        values["priority"] = "critical"
    with db.transaction() as cur:
        cur.execute("""
            INSERT INTO incidents (title, description, category, priority, seat_id, asset_tag, reporter_id,
                                   is_escalated, escalation_reason, escalated_at)
            VALUES (%(title)s, %(description)s, %(category)s, %(priority)s, %(seat_id)s, %(asset_tag)s, %(reporter_id)s,
                    %(is_escalated)s, %(escalation_reason)s, CASE WHEN %(is_escalated)s THEN NOW() END)
            RETURNING *
        """, values)
        incident = cur.fetchone()
        cur.execute("INSERT INTO incident_status_history (incident_id, from_status, to_status, reason, changed_by) VALUES (%s, NULL, 'open', %s, %s)",
                    (incident["id"], "Reported" + (" and auto-escalated" if escalation else ""), request.user["id"]))
    return json_response(201, _detail(request.user, incident["id"]))


def get_incident(request: Request, incident_id: int) -> dict[str, Any]:
    return json_response(200, _detail(request.user, incident_id))


def update_incident(request: Request, incident_id: int) -> dict[str, Any]:
    """Reporters may edit their ticket while it is open; admins may edit any ticket that isn't closed."""
    body = request.json()
    reject_unknown_fields(body, {"title", "description", "category", "priority", "seat_id", "asset_tag"})
    changes = (Validator(body)
               .string("title").string("description", max_length=5000)
               .choice("category", CATEGORIES).choice("priority", PRIORITIES)
               .integer("seat_id").string("asset_tag", max_length=100)
               .validate())
    for required in ("title", "description", "category", "priority", "seat_id"):
        if required in changes and changes[required] is None:
            raise ValidationError("One or more fields are invalid", {required: "This field is required"})
    if changes.get("seat_id"):
        _ensure_seat(changes["seat_id"])

    user = request.user
    with db.transaction() as cur:
        incident = _lock(cur, user, incident_id)
        if user["role"] != auth.ADMIN:
            if incident["reporter_id"] != user["id"]:
                raise Forbidden(MSG_EDIT_FORBIDDEN)
            if incident["status"] != "open":
                raise Conflict(MSG_EDIT_NOT_OPEN)
        elif incident["status"] == "closed":
            raise Conflict("Closed tickets can't be edited.")
        if changes:
            assignments = sql.SQL(", ").join(sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in changes)
            cur.execute(sql.SQL("UPDATE incidents SET {}, updated_at = NOW() WHERE id = %(id)s").format(assignments), {**changes, "id": incident_id})
    return json_response(200, _detail(user, incident_id))


def delete_incident(request: Request, incident_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    if db.fetch_one("DELETE FROM incidents WHERE id = %s RETURNING id", (incident_id,)) is None:
        raise NotFound(MSG_NOT_FOUND)
    return json_response(204)


# Workflow

def change_status(request: Request, incident_id: int) -> dict[str, Any]:
    """Body: {"status": "...", "reason": "..."}; reason is required for blocked (why) and resolved (resolution note)."""
    body = request.json()
    reject_unknown_fields(body, {"status", "reason"})
    data = Validator(body).choice("status", STATUSES, required=True).string("reason", max_length=2000).validate()
    to, reason = data["status"], data.get("reason")
    user = request.user

    with db.transaction() as cur:
        incident = _lock(cur, user, incident_id)
        current = incident["status"]
        if to == current:
            raise Conflict(f"This ticket is already {STATUS_LABELS[to]}.")
        allowed = WORKFLOW[current]
        if to not in allowed:
            raise Conflict(f"A ticket that is {STATUS_LABELS[current]} can't move to {STATUS_LABELS[to]}.")
        who = allowed[to]
        permitted = (user["role"] == auth.ADMIN
                     or (who == ASSIGNEE and incident["assignee_id"] == user["id"])
                     or (who == REPORTER and incident["reporter_id"] == user["id"]))
        if not permitted:
            raise Forbidden(f"You can't move this ticket to {STATUS_LABELS[to]}.")
        if to == "in_progress" and incident["assignee_id"] is None:
            raise Conflict(MSG_NEEDS_ASSIGNEE)
        if to == "blocked" and not reason:
            raise ValidationError(MSG_BLOCKED_REASON, {"reason": "This field is required"})
        if to == "resolved" and not reason:
            raise ValidationError(MSG_RESOLUTION_NOTE, {"reason": "This field is required"})

        # Timestamp expressions are fixed SQL fragments chosen by the transition, never user input.
        acknowledged = "COALESCE(acknowledged_at, NOW())" if current == "open" else "acknowledged_at"
        resolved = {"resolved": "NOW()", "closed": "resolved_at"}.get(to, "NULL")
        closed = "NOW()" if to == "closed" else "NULL"
        cur.execute(f"""
            UPDATE incidents SET status = %s, blocked_reason = %s, acknowledged_at = {acknowledged},
                   resolved_at = {resolved}, closed_at = {closed}, updated_at = NOW()
            WHERE id = %s
        """, (to, reason if to == "blocked" else None, incident_id))
        _log(cur, incident, user, to, reason)
        if to == "resolved":
            # The resolution note goes into the conversation so the reporter sees what was fixed.
            cur.execute("INSERT INTO incident_notes (incident_id, author_id, body) VALUES (%s, %s, %s)", (incident_id, user["id"], reason))
    return json_response(200, _detail(user, incident_id))


def assign_incident(request: Request, incident_id: int) -> dict[str, Any]:
    """Body: {"assignee_id": <engineer user id>}. Admin only."""
    user = request.user
    if user["role"] != auth.ADMIN:
        raise Forbidden(MSG_ASSIGN_ADMIN_ONLY)
    body = request.json()
    reject_unknown_fields(body, {"assignee_id"})
    v = Validator(body).integer("assignee_id", required=True)
    _raise_friendly(v, {"assignee_id"}, MSG_ASSIGN_MISSING)
    assignee_id = v.validate()["assignee_id"]

    with db.transaction() as cur:
        incident = _lock(cur, user, incident_id)
        if incident["status"] == "closed":
            raise Conflict(MSG_ASSIGN_CLOSED)
        cur.execute("""
            SELECT u.full_name FROM users u JOIN engineer_profiles p ON p.user_id = u.id
            WHERE u.id = %s AND u.role = 'engineer' AND p.is_active
        """, (assignee_id,))
        engineer = cur.fetchone()
        if engineer is None:
            raise ValidationError(MSG_ASSIGN_INACTIVE, {"assignee_id": "Not an active engineer"})
        if incident["assignee_id"] == assignee_id:
            raise Conflict(f"This ticket is already assigned to {engineer['full_name']}.")
        cur.execute("UPDATE incidents SET assignee_id = %s, assigned_at = NOW(), updated_at = NOW() WHERE id = %s", (assignee_id, incident_id))
        _log(cur, incident, user, incident["status"], f"Assigned to {engineer['full_name']}")
    return json_response(200, _detail(user, incident_id))


def escalate_incident(request: Request, incident_id: int) -> dict[str, Any]:
    """Body: {"reason": "..."}. Reporter or admin. Raises low/medium priority to high."""
    body = request.json()
    reject_unknown_fields(body, {"reason"})
    v = Validator(body).string("reason", required=True, max_length=2000)
    _raise_friendly(v, {"reason"}, MSG_ESCALATE_REASON)
    reason = v.validate()["reason"]
    user = request.user

    with db.transaction() as cur:
        incident = _lock(cur, user, incident_id)
        if user["role"] != auth.ADMIN and incident["reporter_id"] != user["id"]:
            raise Forbidden(MSG_ESCALATE_FORBIDDEN)
        if incident["status"] not in ACTIVE_STATUSES:
            raise Conflict(MSG_ESCALATE_INACTIVE)
        if incident["is_escalated"]:
            raise Conflict(MSG_ALREADY_ESCALATED)
        prefix = "Admin escalated" if user["role"] == auth.ADMIN and incident["reporter_id"] != user["id"] else "Employee requested"
        cur.execute("""
            UPDATE incidents SET is_escalated = TRUE, escalation_reason = %s, escalated_at = NOW(),
                   priority = CASE WHEN priority IN ('low', 'medium') THEN 'high' ELSE priority END, updated_at = NOW()
            WHERE id = %s
        """, (f"{prefix} — {reason}", incident_id))
        _log(cur, incident, user, incident["status"], f"Escalated: {reason}")
    return json_response(200, _detail(user, incident_id))


def deescalate_incident(request: Request, incident_id: int) -> dict[str, Any]:
    """Admin clears an escalation once it has been handled."""
    auth.require_role(request.user, auth.ADMIN)
    with db.transaction() as cur:
        incident = _lock(cur, request.user, incident_id)
        if not incident["is_escalated"]:
            raise Conflict("This ticket isn't escalated.")
        cur.execute("UPDATE incidents SET is_escalated = FALSE, escalation_reason = NULL, updated_at = NOW() WHERE id = %s", (incident_id,))
        _log(cur, incident, request.user, incident["status"], "Escalation cleared")
    return json_response(200, _detail(request.user, incident_id))


# Notes

def list_notes(request: Request, incident_id: int) -> dict[str, Any]:
    _detail(request.user, incident_id)  # visibility check
    return json_response(200, _notes(incident_id))


def add_note(request: Request, incident_id: int) -> dict[str, Any]:
    body = request.json() if request.raw_body else {}
    reject_unknown_fields(body, {"body"})
    v = Validator(body).string("body", required=True, max_length=5000)
    _raise_friendly(v, {"body"}, MSG_NOTE_EMPTY)
    text = v.validate()["body"]
    user = request.user

    with db.transaction() as cur:
        incident = _lock(cur, user, incident_id)
        if user["role"] != auth.ADMIN and user["id"] not in (incident["reporter_id"], incident["assignee_id"]):
            raise Forbidden(MSG_NOTE_FORBIDDEN)
        if incident["status"] == "closed":
            raise Conflict(MSG_NOTE_CLOSED)
        cur.execute("INSERT INTO incident_notes (incident_id, author_id, body) VALUES (%s, %s, %s) RETURNING id", (incident_id, user["id"], text))
        note_id = cur.fetchone()["id"]
        cur.execute("UPDATE incidents SET updated_at = NOW() WHERE id = %s", (incident_id,))
    return json_response(201, next(n for n in _notes(incident_id) if n["id"] == note_id))


def _own_note(request: Request, incident_id: int, note_id: int, allow_admin: bool) -> None:
    _detail(request.user, incident_id)  # visibility check
    note = db.fetch_one("SELECT author_id FROM incident_notes WHERE id = %s AND incident_id = %s", (note_id, incident_id))
    if note is None:
        raise NotFound("Note not found")
    if note["author_id"] != request.user["id"] and not (allow_admin and request.user["role"] == auth.ADMIN):
        raise Forbidden("You can only change notes you wrote.")


def update_note(request: Request, incident_id: int, note_id: int) -> dict[str, Any]:
    body = request.json()
    reject_unknown_fields(body, {"body"})
    v = Validator(body).string("body", required=True, max_length=5000)
    _raise_friendly(v, {"body"}, MSG_NOTE_EMPTY)
    _own_note(request, incident_id, note_id, allow_admin=False)
    db.fetch_one("UPDATE incident_notes SET body = %s, updated_at = NOW() WHERE id = %s RETURNING id", (v.validate()["body"], note_id))
    return json_response(200, next(n for n in _notes(incident_id) if n["id"] == note_id))


def delete_note(request: Request, incident_id: int, note_id: int) -> dict[str, Any]:
    _own_note(request, incident_id, note_id, allow_admin=True)
    db.fetch_one("DELETE FROM incident_notes WHERE id = %s RETURNING id", (note_id,))
    return json_response(204)


ROUTES = [
    Route("GET", "/", list_incidents),
    Route("POST", "/", create_incident),
    Route("GET", "/{incident_id}", get_incident),
    Route("PUT", "/{incident_id}", update_incident),
    Route("DELETE", "/{incident_id}", delete_incident),
    Route("POST", "/{incident_id}/status", change_status),
    Route("POST", "/{incident_id}/assign", assign_incident),
    Route("POST", "/{incident_id}/escalate", escalate_incident),
    Route("DELETE", "/{incident_id}/escalate", deescalate_incident),
    Route("GET", "/{incident_id}/notes", list_notes),
    Route("POST", "/{incident_id}/notes", add_note),
    Route("PUT", "/{incident_id}/notes/{note_id}", update_note),
    Route("DELETE", "/{incident_id}/notes/{note_id}", delete_note),
]


def handler(event, context=None):
    return api.dispatch(event, ROUTES, auth.authenticate)
