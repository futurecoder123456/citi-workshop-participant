"""Password hashing, JWT issuing/verification, and role checks.

Callers send "Authorization: Bearer <token>" obtained from POST /api/auth/login.
When IS_LOCAL is true, the X-Dev-User-Id header is also accepted to simplify curl testing.
"""

import base64
import hashlib
import hmac
import os
import secrets
import time
from typing import Any

import jwt

from common import db
from common.api import Request
from common.errors import ApiError, Forbidden, Unauthorized

EMPLOYEE = "employee"
ENGINEER = "engineer"
ADMIN = "admin"

DEV_USER_HEADER = "x-dev-user-id"
TOKEN_TTL_SECONDS = 12 * 60 * 60
JWT_ALGORITHM = "HS256"
LOCAL_DEV_SECRET = "local-dev-secret-not-for-production"

PBKDF2_ITERATIONS = 200_000
# Compared against when the email is unknown, so failed logins take the same time either way.
_DUMMY_HASH = f"pbkdf2_sha256${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

USER_COLUMNS = "id, email, full_name, role, created_at"


def _is_local() -> bool:
    return os.getenv("IS_LOCAL", "false") == "true"


def _secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if secret:
        return secret
    if _is_local():
        return LOCAL_DEV_SECRET
    raise ApiError("Authentication is not configured for this environment")


def hash_password(password: str) -> str:
    """Return a salted PBKDF2-SHA256 hash in the form pbkdf2_sha256$iterations$salt$hash."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str | None) -> bool:
    """Check a password against a stored hash in constant time."""
    try:
        scheme, iterations, salt_b64, hash_b64 = (stored or _DUMMY_HASH).split("$")
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), base64.b64decode(salt_b64), int(iterations))
    return hmac.compare_digest(digest, base64.b64decode(hash_b64)) and stored is not None


def issue_token(user: dict[str, Any]) -> str:
    """Sign a JWT identifying the user."""
    now = int(time.time())
    claims = {"sub": str(user["id"]), "role": user["role"], "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    return jwt.encode(claims, _secret(), algorithm=JWT_ALGORITHM)


def _user_by_id(user_id: int) -> dict[str, Any]:
    user = db.fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = %s", (user_id,))
    if user is None:
        raise Unauthorized("Your session is no longer valid. Sign in again.")
    return user


def authenticate(request: Request) -> dict[str, Any]:
    """Resolve the calling user from the bearer token (or dev header locally), or raise Unauthorized."""
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        try:
            claims = jwt.decode(header[7:].strip(), _secret(), algorithms=[JWT_ALGORITHM], options={"require": ["exp", "sub"]})
        except jwt.ExpiredSignatureError as exc:
            raise Unauthorized("Your session has expired. Sign in again.") from exc
        except jwt.InvalidTokenError as exc:
            raise Unauthorized("Sign in to continue.") from exc
        if not str(claims["sub"]).isdigit():
            raise Unauthorized("Sign in to continue.")
        return _user_by_id(int(claims["sub"]))

    raw_id = request.headers.get(DEV_USER_HEADER, "")
    if _is_local() and raw_id.isdigit():
        return _user_by_id(int(raw_id))

    raise Unauthorized("Sign in to continue.")


def require_role(user: dict[str, Any], *roles: str) -> None:
    """Raise Forbidden unless the user has one of the given roles."""
    if user["role"] not in roles:
        raise Forbidden("You do not have permission to perform this action")
