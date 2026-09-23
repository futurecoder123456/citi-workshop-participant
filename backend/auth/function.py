"""Auth service: register with an @acme.inc email, sign in, and fetch the current user."""

import logging
import re
from typing import Any

from common import api, auth, db
from common.api import Request, Route, json_response
from common.errors import Conflict, Unauthorized, ValidationError
from common.validation import Validator, reject_unknown_fields

logging.getLogger().setLevel(logging.INFO)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@acme\.inc$")
MIN_PASSWORD_LENGTH = 8


def _session(user: dict[str, Any]) -> dict[str, Any]:
    return {"token": auth.issue_token(user), "user": user}


def register(request: Request) -> dict[str, Any]:
    body = request.json()
    reject_unknown_fields(body, {"email", "password", "full_name"})
    data = Validator(body).string("email", required=True).string("password", required=True, max_length=128).string("full_name", required=True).validate()

    email = data["email"].lower()
    if not EMAIL_PATTERN.match(email):
        raise ValidationError("Use your @acme.inc work email to register.", {"email": "Must be an @acme.inc address"})
    if len(data["password"]) < MIN_PASSWORD_LENGTH:
        raise ValidationError(f"Choose a password with at least {MIN_PASSWORD_LENGTH} characters.", {"password": f"Must be at least {MIN_PASSWORD_LENGTH} characters"})

    with db.transaction() as cur:
        cur.execute("SELECT 1 FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            raise Conflict("An account with this email already exists. Sign in instead.", {"email": "Already registered"})
        # The very first account becomes the facility admin; everyone else registers as an employee.
        cur.execute("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE")
        cur.execute("SELECT NOT EXISTS (SELECT 1 FROM users) AS first")
        role = auth.ADMIN if cur.fetchone()["first"] else auth.EMPLOYEE
        cur.execute(
            f"INSERT INTO users (email, password_hash, full_name, role) VALUES (%s, %s, %s, %s) RETURNING {auth.USER_COLUMNS}",
            (email, auth.hash_password(data["password"]), data["full_name"], role),
        )
        user = cur.fetchone()
    return json_response(201, _session(user))


def login(request: Request) -> dict[str, Any]:
    body = request.json()
    data = Validator(body).string("email", required=True).string("password", required=True, max_length=128).validate()
    row = db.fetch_one(f"SELECT {auth.USER_COLUMNS}, password_hash FROM users WHERE email = %s", (data["email"].lower(),))
    if not auth.verify_password(data["password"], row["password_hash"] if row else None):
        raise Unauthorized("Email or password is incorrect.")
    row.pop("password_hash")
    return json_response(200, _session(row))


def me(request: Request) -> dict[str, Any]:
    return json_response(200, request.user)


ROUTES = [
    Route("POST", "/register", register, public=True),
    Route("POST", "/login", login, public=True),
    Route("GET", "/me", me),
]


def handler(event, context=None):
    return api.dispatch(event, ROUTES, auth.authenticate)
