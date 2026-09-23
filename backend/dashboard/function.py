"""Dashboard service: per-persona reporting. Admins see everything; engineers and employees see their own tickets."""

import logging
from typing import Any

from common import api, auth, db, schedule
from common.api import Request, Route, json_response
from common.validation import Validator

logging.getLogger().setLevel(logging.INFO)


def _scope(user: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Same visibility rules as the incidents service."""
    if user["role"] == auth.ADMIN:
        return "TRUE", {}
    if user["role"] == auth.ENGINEER:
        return "(i.assignee_id = %(viewer)s OR i.reporter_id = %(viewer)s)", {"viewer": user["id"]}
    return "i.reporter_id = %(viewer)s", {"viewer": user["id"]}


def _counts(column: str, scope: str, params: dict[str, Any]) -> dict[str, int]:
    rows = db.fetch_all(f"SELECT {column} AS key, COUNT(*) AS n FROM incidents i WHERE {scope} GROUP BY 1", params)
    return {r["key"]: r["n"] for r in rows}


def summary(request: Request) -> dict[str, Any]:
    """?days=90 sets the window for hotspots, timings, and communication stats."""
    days = Validator(request.query).integer("days", maximum=365).validate().get("days") or 90
    user = request.user
    scope, params = _scope(user)
    windowed = {**params, "days": days}
    in_window = f"{scope} AND i.created_at >= NOW() - make_interval(days => %(days)s)"

    timings = db.fetch_one(f"""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM i.acknowledged_at - i.created_at)) / 60)::int AS acknowledge_minutes,
               ROUND(AVG(EXTRACT(EPOCH FROM i.assigned_at - i.created_at)) / 60)::int AS assign_minutes,
               ROUND(AVG(EXTRACT(EPOCH FROM i.resolved_at - i.created_at)) / 60)::int AS resolve_minutes
        FROM incidents i WHERE {in_window}
    """, windowed)

    hotspots = db.fetch_all(f"""
        SELECT s.id AS seat_id, b.name AS building_name, coalesce(f.name, 'Floor ' || f.level) AS floor_name, s.code AS seat_code,
               COUNT(*) AS incidents
        FROM incidents i JOIN seats s ON s.id = i.seat_id JOIN floors f ON f.id = s.floor_id JOIN buildings b ON b.id = f.building_id
        WHERE {in_window} GROUP BY s.id, b.name, f.name, f.level, s.code HAVING COUNT(*) > 1
        ORDER BY incidents DESC, b.name, s.code LIMIT 10
    """, windowed)

    buildings = db.fetch_all(f"""
        SELECT b.id AS building_id, b.name AS building_name, COUNT(*) AS incidents
        FROM incidents i JOIN seats s ON s.id = i.seat_id JOIN floors f ON f.id = s.floor_id JOIN buildings b ON b.id = f.building_id
        WHERE {in_window} GROUP BY b.id, b.name ORDER BY incidents DESC, b.name
    """, windowed)

    attention = db.fetch_all(f"""
        SELECT i.id, i.title, i.status, i.priority, i.is_escalated, i.escalation_reason, i.blocked_reason, i.created_at,
               a.full_name AS assignee_name
        FROM incidents i LEFT JOIN users a ON a.id = i.assignee_id
        WHERE {scope} AND i.status IN ('open', 'in_progress', 'blocked') AND (i.is_escalated OR i.status = 'blocked')
        ORDER BY i.is_escalated DESC, i.created_at
    """, params)

    communication = db.fetch_one(f"""
        SELECT COUNT(*) AS tickets,
               COUNT(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM incident_notes n WHERE n.incident_id = i.id AND n.author_id <> i.reporter_id)) AS with_staff_update,
               ROUND(AVG((SELECT COUNT(*) FROM incident_notes n WHERE n.incident_id = i.id)), 1) AS avg_notes
        FROM incidents i WHERE {in_window} AND i.status <> 'open'
    """, windowed)
    communication["staff_update_rate"] = (
        round(communication["with_staff_update"] / communication["tickets"], 2) if communication["tickets"] else None
    )

    body = {
        "window_days": days,
        "by_status": _counts("i.status", scope, params),
        "by_priority": _counts("i.priority", scope, params),
        "by_category": _counts("i.category", scope, params),
        "escalated_active": sum(1 for r in attention if r["is_escalated"]),
        "unassigned_active": db.fetch_one(
            f"SELECT COUNT(*) AS n FROM incidents i WHERE {scope} AND i.assignee_id IS NULL AND i.status IN ('open', 'in_progress', 'blocked')",
            params)["n"],
        "average_minutes": {"acknowledge": timings["acknowledge_minutes"], "assign": timings["assign_minutes"], "resolve": timings["resolve_minutes"]},
        "hotspots": hotspots,
        "by_building": buildings,
        "needs_attention": attention,
        "communication": communication,
    }
    if user["role"] in (auth.ADMIN, auth.ENGINEER):
        body["workload"] = _workload(user)
    return json_response(200, body)


def _workload(user: dict[str, Any]) -> list[dict[str, Any]]:
    """Per-engineer ticket counts by status plus current availability. Engineers see only their own row."""
    only_me = "AND u.id = %(viewer)s" if user["role"] == auth.ENGINEER else ""
    rows = db.fetch_all(f"""
        SELECT u.id, u.full_name, p.specialty, p.shift_start, p.shift_end, p.lunch_start, p.lunch_end, p.is_active,
               COUNT(i.id) FILTER (WHERE i.status = 'open') AS open,
               COUNT(i.id) FILTER (WHERE i.status = 'in_progress') AS in_progress,
               COUNT(i.id) FILTER (WHERE i.status = 'blocked') AS blocked,
               COUNT(i.id) FILTER (WHERE i.status = 'resolved') AS resolved,
               COUNT(i.id) FILTER (WHERE i.status IN ('open', 'in_progress', 'blocked')) AS active
        FROM users u JOIN engineer_profiles p ON p.user_id = u.id LEFT JOIN incidents i ON i.assignee_id = u.id
        WHERE p.is_active {only_me}
        GROUP BY u.id, p.id ORDER BY active DESC, u.full_name
    """, {"viewer": user["id"]})
    return [{**r, "availability": schedule.availability(r)} for r in rows]


ROUTES = [Route("GET", "/", summary)]


def handler(event, context=None):
    return api.dispatch(event, ROUTES, auth.authenticate)
