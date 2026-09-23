"""API error types that map directly to HTTP error responses."""


class ApiError(Exception):
    """Base error carrying an HTTP status, machine-readable code, and optional field details."""

    status = 500
    code = "internal_error"

    def __init__(self, message: str, details: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(ApiError):
    """Request is malformed or fails validation."""

    status = 400
    code = "validation_error"


class Unauthorized(ApiError):
    """Caller is not authenticated."""

    status = 401
    code = "unauthorized"


class Forbidden(ApiError):
    """Caller is authenticated but not allowed to perform the action."""

    status = 403
    code = "forbidden"


class NotFound(ApiError):
    """Resource does not exist or is not visible to the caller."""

    status = 404
    code = "not_found"


class MethodNotAllowed(ApiError):
    """Path exists but does not support the HTTP method."""

    status = 405
    code = "method_not_allowed"


class Conflict(ApiError):
    """Request conflicts with the current state of the resource."""

    status = 409
    code = "conflict"


class ServiceUnavailable(ApiError):
    """A dependency such as the database is temporarily unavailable."""

    status = 503
    code = "service_unavailable"
