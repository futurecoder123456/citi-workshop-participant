"""Facilities service: buildings, floors, and seats. Anyone signed in can read; only admins can change."""

import logging
from typing import Any

from psycopg import sql

from common import api, auth, db
from common.api import Request, Route, json_response
from common.errors import NotFound
from common.validation import Validator, reject_unknown_fields

logging.getLogger().setLevel(logging.INFO)


def _update(table: str, row_id: int, values: dict[str, Any], label: str) -> dict[str, Any]:
    """Apply a partial update and return the row, or raise NotFound."""
    if values:
        assignments = sql.SQL(", ").join(sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in values)
        query = sql.SQL("UPDATE {} SET {}, updated_at = NOW() WHERE id = %(id)s RETURNING *").format(sql.Identifier(table), assignments)
    else:
        query = sql.SQL("SELECT * FROM {} WHERE id = %(id)s").format(sql.Identifier(table))
    row = db.fetch_one(query, {**values, "id": row_id})
    if row is None:
        raise NotFound(f"{label} not found")
    return row


def _delete(table: str, row_id: int, label: str) -> dict[str, Any]:
    row = db.fetch_one(sql.SQL("DELETE FROM {} WHERE id = %s RETURNING id").format(sql.Identifier(table)), (row_id,))
    if row is None:
        raise NotFound(f"{label} not found")
    return json_response(204)


def _require(table: str, row_id: int, label: str) -> None:
    if db.fetch_one(sql.SQL("SELECT 1 FROM {} WHERE id = %s").format(sql.Identifier(table)), (row_id,)) is None:
        raise NotFound(f"{label} not found")


# Buildings

BUILDING_FIELDS = {"code", "name", "address"}


def _building_values(body: dict[str, Any], partial: bool) -> dict[str, Any]:
    reject_unknown_fields(body, BUILDING_FIELDS)
    values = (Validator(body)
              .string("code", required=not partial, max_length=20)
              .string("name", required=not partial)
              .string("address", max_length=500)
              .validate())
    if "code" in values:
        values["code"] = values["code"].upper()
    return values


def list_buildings(request: Request) -> dict[str, Any]:
    rows = db.fetch_all("""
        SELECT b.*, COUNT(DISTINCT f.id) AS floor_count, COUNT(s.id) AS seat_count
        FROM buildings b
        LEFT JOIN floors f ON f.building_id = b.id
        LEFT JOIN seats s ON s.floor_id = f.id
        GROUP BY b.id ORDER BY b.code
    """)
    return json_response(200, rows)


def create_building(request: Request) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    values = _building_values(request.json(), partial=False)
    row = db.fetch_one("INSERT INTO buildings (code, name, address) VALUES (%(code)s, %(name)s, %(address)s) RETURNING *",
                       {"address": None, **values})
    return json_response(201, row)


def get_building(request: Request, building_id: int) -> dict[str, Any]:
    building = _update("buildings", building_id, {}, "Building")
    building["floors"] = db.fetch_all("SELECT * FROM floors WHERE building_id = %s ORDER BY level", (building_id,))
    return json_response(200, building)


def update_building(request: Request, building_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    return json_response(200, _update("buildings", building_id, _building_values(request.json(), partial=True), "Building"))


def delete_building(request: Request, building_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    return _delete("buildings", building_id, "Building")


# Floors

def list_floors(request: Request, building_id: int) -> dict[str, Any]:
    _require("buildings", building_id, "Building")
    rows = db.fetch_all("""
        SELECT f.*, COUNT(s.id) AS seat_count FROM floors f LEFT JOIN seats s ON s.floor_id = f.id
        WHERE f.building_id = %s GROUP BY f.id ORDER BY f.level
    """, (building_id,))
    return json_response(200, rows)


def create_floor(request: Request, building_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"level", "name"})
    values = Validator(body).integer("level", required=True, minimum=-10, maximum=200).string("name").validate()
    _require("buildings", building_id, "Building")
    row = db.fetch_one("INSERT INTO floors (building_id, level, name) VALUES (%(building_id)s, %(level)s, %(name)s) RETURNING *",
                       {"name": None, **values, "building_id": building_id})
    return json_response(201, row)


def update_floor(request: Request, floor_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"level", "name"})
    values = Validator(body).integer("level", minimum=-10, maximum=200).string("name").validate()
    return json_response(200, _update("floors", floor_id, values, "Floor"))


def delete_floor(request: Request, floor_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    return _delete("floors", floor_id, "Floor")


# Seats

def list_floor_seats(request: Request, floor_id: int) -> dict[str, Any]:
    _require("floors", floor_id, "Floor")
    return json_response(200, db.fetch_all("SELECT * FROM seats WHERE floor_id = %s ORDER BY code", (floor_id,)))


def create_seat(request: Request, floor_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"code"})
    values = Validator(body).string("code", required=True, max_length=50).validate()
    _require("floors", floor_id, "Floor")
    row = db.fetch_one("INSERT INTO seats (floor_id, code) VALUES (%s, %s) RETURNING *", (floor_id, values["code"]))
    return json_response(201, row)


def update_seat(request: Request, seat_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    body = request.json()
    reject_unknown_fields(body, {"code"})
    return json_response(200, _update("seats", seat_id, Validator(body).string("code", max_length=50).validate(), "Seat"))


def delete_seat(request: Request, seat_id: int) -> dict[str, Any]:
    auth.require_role(request.user, auth.ADMIN)
    return _delete("seats", seat_id, "Seat")


def list_seat_options(request: Request) -> dict[str, Any]:
    """Flattened building › floor › seat list for location pickers. Optional ?q= filter."""
    q = request.query.get("q", "").strip()
    rows = db.fetch_all("""
        SELECT s.id, s.code AS seat_code, f.id AS floor_id, f.level, f.name AS floor_name,
               b.id AS building_id, b.code AS building_code, b.name AS building_name,
               concat_ws(' › ', b.name, coalesce(f.name, 'Floor ' || f.level), s.code) AS label
        FROM seats s JOIN floors f ON f.id = s.floor_id JOIN buildings b ON b.id = f.building_id
        WHERE %(q)s = '' OR concat_ws(' ', b.code, b.name, f.name, s.code) ILIKE '%%' || %(q)s || '%%'
        ORDER BY b.code, f.level, s.code
    """, {"q": q})
    return json_response(200, rows)


ROUTES = [
    Route("GET", "/buildings", list_buildings),
    Route("POST", "/buildings", create_building),
    Route("GET", "/buildings/{building_id}", get_building),
    Route("PUT", "/buildings/{building_id}", update_building),
    Route("DELETE", "/buildings/{building_id}", delete_building),
    Route("GET", "/buildings/{building_id}/floors", list_floors),
    Route("POST", "/buildings/{building_id}/floors", create_floor),
    Route("PUT", "/floors/{floor_id}", update_floor),
    Route("DELETE", "/floors/{floor_id}", delete_floor),
    Route("GET", "/floors/{floor_id}/seats", list_floor_seats),
    Route("POST", "/floors/{floor_id}/seats", create_seat),
    Route("GET", "/seats", list_seat_options),
    Route("PUT", "/seats/{seat_id}", update_seat),
    Route("DELETE", "/seats/{seat_id}", delete_seat),
]


def handler(event, context=None):
    return api.dispatch(event, ROUTES, auth.authenticate)
