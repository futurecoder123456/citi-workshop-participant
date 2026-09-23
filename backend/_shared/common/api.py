"""Lambda Function URL request parsing, routing, and JSON responses."""

import base64
import binascii
import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

import psycopg
from psycopg import errors as pg_errors

from common import db
from common.errors import ApiError, Conflict, MethodNotAllowed, NotFound, ServiceUnavailable, ValidationError

logger = logging.getLogger(__name__)

JSON_HEADERS = {"Content-Type": "application/json"}


@dataclass
class Request:
    """Normalized HTTP request extracted from a Lambda event."""

    method: str
    segments: list[str]
    query: dict[str, str]
    headers: dict[str, str]
    raw_body: str | None
    user: dict[str, Any] | None = None
    _json: Any = field(default=None, repr=False)

    def json(self) -> dict[str, Any]:
        """Return the body parsed as a JSON object, raising ValidationError otherwise."""
        if self._json is None:
            if not self.raw_body:
                raise ValidationError("Request body is required")
            try:
                parsed = json.loads(self.raw_body)
            except json.JSONDecodeError as exc:
                raise ValidationError("Request body must be valid JSON") from exc
            if not isinstance(parsed, dict):
                raise ValidationError("Request body must be a JSON object")
            self._json = parsed
        return self._json


Handler = Callable[..., dict[str, Any]]
Authenticator = Callable[[Request], dict[str, Any]]


@dataclass(frozen=True)
class Route:
    """Maps an HTTP method and path template (e.g. "/{incident_id}/notes") to a handler."""

    method: str
    path: str
    handler: Handler
    public: bool = False

    @property
    def parts(self) -> list[str]:
        """Path template split into segments."""
        return [p for p in self.path.split("/") if p]


def parse_request(event: dict[str, Any]) -> Request:
    """Build a Request from a Lambda Function URL (payload v2) event."""
    method = (event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod") or "GET").upper()
    segments = [s for s in (event.get("rawPath") or event.get("path") or "/").split("/") if s]
    # Through CloudFront the path keeps its "/api/<service>" prefix; the local proxy strips it.
    if segments[:1] == ["api"]:
        segments = segments[2:]
    raw_body = event.get("body")
    if raw_body and event.get("isBase64Encoded"):
        try:
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError) as exc:
            raise ValidationError("Request body could not be decoded") from exc
    return Request(
        method=method,
        segments=segments,
        query=dict(event.get("queryStringParameters") or {}),
        headers={k.lower(): v for k, v in (event.get("headers") or {}).items()},
        raw_body=raw_body,
    )


def _match(routes: list[Route], request: Request) -> tuple[Route, dict[str, int]]:
    """Find the route for the request and extract integer path parameters."""
    path_matched = False
    for route in routes:
        parts = route.parts
        if len(parts) != len(request.segments):
            continue
        params: dict[str, int] = {}
        for template, value in zip(parts, request.segments):
            if template.startswith("{") and template.endswith("}"):
                if not value.isdigit():
                    break
                params[template[1:-1]] = int(value)
            elif template != value:
                break
        else:
            path_matched = True
            if route.method == request.method:
                return route, params
    if path_matched:
        raise MethodNotAllowed(f"Method {request.method} is not allowed on this path")
    raise NotFound("Resource not found")


def _json_default(value: Any) -> Any:
    """Serialize database types that json does not handle natively."""
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def json_response(status: int, body: Any = None) -> dict[str, Any]:
    """Build a Lambda proxy response with a JSON body (empty for 204)."""
    return {
        "statusCode": status,
        "headers": JSON_HEADERS,
        "body": "" if status == 204 else json.dumps(body, default=_json_default),
    }


def error_response(error: ApiError) -> dict[str, Any]:
    """Build the consistent error envelope: {"error": {"code", "message", "details"}}."""
    return json_response(error.status, {"error": {"code": error.code, "message": error.message, "details": error.details}})


def _translate_db_error(exc: psycopg.Error) -> ApiError | None:
    """Map integrity violations to client errors without leaking SQL details."""
    constraint = getattr(getattr(exc, "diag", None), "constraint_name", None)
    details = {"constraint": constraint} if constraint else None
    if isinstance(exc, pg_errors.UniqueViolation):
        return Conflict("A record with the same unique value already exists", details)
    if isinstance(exc, (pg_errors.ForeignKeyViolation, pg_errors.RestrictViolation)):
        return Conflict("Referenced record does not exist or the record is still in use", details)
    if isinstance(exc, (pg_errors.CheckViolation, pg_errors.NotNullViolation)):
        return ValidationError("One or more fields have invalid values", details)
    return None


def dispatch(event: dict[str, Any], routes: list[Route], authenticate: Authenticator) -> dict[str, Any]:
    """Route the event, enforce authentication on non-public routes, and convert errors to responses."""
    try:
        request = parse_request(event)
        route, params = _match(routes, request)
        if not route.public:
            request.user = authenticate(request)
        return route.handler(request, **params)
    except ApiError as err:
        return error_response(err)
    except psycopg.OperationalError:
        logger.exception("Database unavailable")
        db.reset_connection()
        return error_response(ServiceUnavailable("Database is temporarily unavailable, please retry"))
    except psycopg.Error as exc:
        translated = _translate_db_error(exc)
        if translated is not None:
            return error_response(translated)
        logger.exception("Unhandled database error")
        return error_response(ApiError("An unexpected error occurred"))
    except Exception:
        logger.exception("Unhandled error")
        return error_response(ApiError("An unexpected error occurred"))
