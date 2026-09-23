"""Authentication and role checks.

TEMPORARY: identifies the caller via the X-Dev-User-Id header, accepted only when IS_LOCAL is true.
Replaced by JWT bearer tokens in the auth step.
"""

import os
from typing import Any

from common import db
from common.api import Request
from common.errors import Forbidden, Unauthorized

EMPLOYEE = "employee"
ENGINEER = "engineer"
ADMIN = "admin"

DEV_USER_HEADER = "x-dev-user-id"


def authenticate(request: Request) -> dict[str, Any]:
    """Resolve the calling user or raise Unauthorized."""
    if os.getenv("IS_LOCAL", "false") != "true":
        raise Unauthorized("Authentication is not configured for this environment")
    raw_id = request.headers.get(DEV_USER_HEADER, "")
    if not raw_id.isdigit():
        raise Unauthorized("Missing or invalid credentials")
    user = db.fetch_one("SELECT id, email, full_name, role FROM users WHERE id = %s", (int(raw_id),))
    if user is None:
        raise Unauthorized("Missing or invalid credentials")
    return user


def require_role(user: dict[str, Any], *roles: str) -> None:
    """Raise Forbidden unless the user has one of the given roles."""
    if user["role"] not in roles:
        raise Forbidden("You do not have permission to perform this action")
