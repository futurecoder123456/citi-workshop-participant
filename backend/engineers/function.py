"""Engineers service: admin-managed engineer profiles with shift-based availability.

Engineers are addressed by their user id, the same id stored in incidents.assignee_id.
"""

import logging
from datetime import time
from typing import Any

from psycopg import sql

from common import api, auth, db, schedule
from common.api import Request, Route, json_response
from common.errors import Forbidden, NotFound, ValidationError
from common.validation import Validator, reject_unknown_fields

logging.getLogger().setLevel(logging.INFO)

SPECIALTIES = ("hardware", "software", "facility", "other")
PROFILE_FIELDS = ("specialty", "shift_start", "shift_end", "lunch_start", "lunch_end", "is_active")
DEFAULT_HOURS = {"shift_start": time(9), "shift_end": time(17), "lunch_start": time(12), "lunch_end": time(13)}

SELECT_ENGINEERS = """
    SELECT u.id, u.email, u.full_name, p.specialty, p.shift_start, p.shift_end, p.lunch_start, p.lunch_end, p.is_active,
           (SELECT COUNT(*) FROM incidents i WHERE i.assignee_id = u.id AND i.status IN ('open', 'in_progress', 'blocked')) AS active_tickets
    FROM users u JOIN engineer_profiles p ON p.user_id = u.id
"""


def _with_availability(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "availability": schedule.availability(row)}


def _get(user_id: int) -> dict[str, Any]:
    row = db.fetch_one(SELECT_ENGINEERS + " WHERE u.id = %s", (user_id,))
    if row is None:
        raise NotFound("Engineer not found")
    return _with_availability(row)


def _profile_values(body: dict[str, Any], partial: bool) -> dict[str, Any]:
    v = Validator(body).choice("specialty", SPECIALTIES, required=not partial).boolean("is_active")
    for name in ("shift_start", "shift_end", "lunch_start", "lunch_end"):
        v.time_of_day(name)
    return v.validate()


def _check_hours(profile: dict[str, Any]) -> None:
    """Shift must be a real window and lunch must sit inside it."""
    errors = {}
    if profile["shift_start"] >= profile["shift_end"]:
        errors["shift_end"] = "Shift must end after it starts"
    if profile["lunch_start"] >= profile["lunch_end"]:
        errors["lunch_end"] = "Lunch must end after it starts"
    elif not (profile["shift_start"] <= profile["lunch_start"] and profile["lunch_end"] <= profile["shift_end"]):
        errors["lunch_start"] = "Lunch must fall within the shift"
    if errors:
        raise ValidationError("Check the shift and lunch hours.", errors)


def list_engineers(request: Request) -> dict[str, Any]:
    """Admins and engineers see the roster. ?specialty=, ?available=now, ?include_inactive=true"""
    auth.require_role(request.user, auth.ADMIN, auth.ENGINEER)
    filters = Validator(request.query).choice("specialty", SPECIALTIES).choice("available", ("now",)).boolean("include_inactive").validate()
    where, params = [], {}
    if not filters.get("include_inactive"):
        where.append("p.is_active")
    if filters.get("specialty"):
        where.append("p.specialty = %(specialty)s")
        params["specialty"] = filters["specialty"]
    query = SELECT_ENGINEERS + (" WHERE " + " AND ".join(where) if where else "") + " ORDER BY u.full_name"
    rows = [_with_availability(r) for r in db.fetch_all(query, params)]
    if filters.get("available") == "now":
        rows = [r for r in rows if r["availability"]["state"] == schedule.AVAILABLE]
    return json_response(200, rows)


def get_engineer(request: Request, user_id: int) -> dict[str, Any]:
    if request.user["role"] != auth.ADMIN and request.user["id"] != user_id:
        raise Forbidden("You can only view your own engineer profile.")
    return json_response(200, _get(user_id))


def create_engineer(request: Request) -> dict[str, Any]:
    """Create the engineer's account and profile together. The admin sets an initial password."""
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"email", "full_name", "password", *PROFILE_FIELDS})
    account = Validator(body).string("email", required=True).string("full_name", required=True).string("password", required=True, max_length=128).validate()
    email = account["email"].lower()
    if not email.endswith("@acme.inc"):
        raise ValidationError("Engineers need an @acme.inc email address.", {"email": "Must be an @acme.inc address"})
    if len(account["password"]) < 8:
        raise ValidationError("Choose an initial password with at least 8 characters.", {"password": "Must be at least 8 characters"})

    profile = {**DEFAULT_HOURS, "is_active": True, **_profile_values(body, partial=False)}
    _check_hours(profile)

    with db.transaction() as cur:
        cur.execute("SELECT id, role FROM users WHERE email = %s FOR UPDATE", (email,))
        existing = cur.fetchone()
        if existing and existing["role"] != auth.EMPLOYEE:
            raise ValidationError("This person already has an engineer or admin account.", {"email": "Already an engineer or admin"})
        if existing:
            # Promote an existing employee account rather than creating a duplicate.
            cur.execute("UPDATE users SET role = 'engineer', full_name = %s, updated_at = NOW() WHERE id = %s RETURNING id",
                        (account["full_name"], existing["id"]))
        else:
            cur.execute("INSERT INTO users (email, password_hash, full_name, role) VALUES (%s, %s, %s, 'engineer') RETURNING id",
                        (email, auth.hash_password(account["password"]), account["full_name"]))
        user_id = cur.fetchone()["id"]
        cur.execute("""
            INSERT INTO engineer_profiles (user_id, specialty, shift_start, shift_end, lunch_start, lunch_end, is_active)
            VALUES (%(user_id)s, %(specialty)s, %(shift_start)s, %(shift_end)s, %(lunch_start)s, %(lunch_end)s, %(is_active)s)
        """, {**profile, "user_id": user_id})
    return json_response(201, _get(user_id))


def update_engineer(request: Request, user_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"full_name", *PROFILE_FIELDS})
    changes = _profile_values(body, partial=True)
    name = Validator(body).string("full_name").validate().get("full_name")
    current = _get(user_id)
    _check_hours({k: changes.get(k, current[k]) for k in ("shift_start", "shift_end", "lunch_start", "lunch_end")})

    with db.transaction() as cur:
        if changes:
            assignments = sql.SQL(", ").join(sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in changes)
            cur.execute(sql.SQL("UPDATE engineer_profiles SET {}, updated_at = NOW() WHERE user_id = %(user_id)s").format(assignments),
                        {**changes, "user_id": user_id})
        if name:
            cur.execute("UPDATE users SET full_name = %s, updated_at = NOW() WHERE id = %s", (name, user_id))
    return json_response(200, _get(user_id))


def deactivate_engineer(request: Request, user_id: int) -> dict[str, Any]:
    """Deactivate rather than delete, so ticket history keeps its author. Active tickets become unassigned."""
    auth.require_role(request.user, auth.ADMIN)
    with db.transaction() as cur:
        cur.execute("UPDATE engineer_profiles SET is_active = FALSE, updated_at = NOW() WHERE user_id = %s RETURNING user_id", (user_id,))
        if cur.fetchone() is None:
            raise NotFound("Engineer not found")
        cur.execute("""
            UPDATE incidents SET assignee_id = NULL, updated_at = NOW()
            WHERE assignee_id = %s AND status IN ('open', 'in_progress', 'blocked')
        """, (user_id,))
    return json_response(204)


ROUTES = [
    Route("GET", "/", list_engineers),
    Route("POST", "/", create_engineer),
    Route("GET", "/{user_id}", get_engineer),
    Route("PUT", "/{user_id}", update_engineer),
    Route("DELETE", "/{user_id}", deactivate_engineer),
]


def handler(event, context=None):
    return api.dispatch(event, ROUTES, auth.authenticate)
