"""Declarative field validation for request bodies and query strings."""

from typing import Any

from common.errors import ValidationError

TRUE_STRINGS = {"true", "1", "yes"}
FALSE_STRINGS = {"false", "0", "no"}


class Validator:
    """Collects cleaned values and per-field errors; only fields present in the input are returned."""

    def __init__(self, data: dict[str, Any]) -> None:
        self.data = data
        self.values: dict[str, Any] = {}
        self.errors: dict[str, str] = {}

    def _present(self, name: str, required: bool) -> bool:
        """Return True if the field should be validated; record an error if required and missing."""
        value = self.data.get(name)
        missing = value is None or (isinstance(value, str) and not value.strip())
        if missing:
            if required:
                self.errors[name] = "This field is required"
            elif name in self.data:
                self.values[name] = None
            return False
        return True

    def string(self, name: str, required: bool = False, max_length: int = 255) -> "Validator":
        """Validate a non-empty string, trimmed, up to max_length characters."""
        if self._present(name, required):
            value = self.data[name]
            if not isinstance(value, str):
                self.errors[name] = "Must be a string"
            elif len(value.strip()) > max_length:
                self.errors[name] = f"Must be at most {max_length} characters"
            else:
                self.values[name] = value.strip()
        return self

    def integer(self, name: str, required: bool = False, minimum: int = 1, maximum: int | None = None) -> "Validator":
        """Validate an integer (or digit string, for query parameters) within bounds."""
        if self._present(name, required):
            value = self.data[name]
            if isinstance(value, str) and value.strip().lstrip("-").isdigit():
                value = int(value)
            if not isinstance(value, int) or isinstance(value, bool):
                self.errors[name] = "Must be an integer"
            elif value < minimum or (maximum is not None and value > maximum):
                bound = f"between {minimum} and {maximum}" if maximum is not None else f"at least {minimum}"
                self.errors[name] = f"Must be {bound}"
            else:
                self.values[name] = value
        return self

    def choice(self, name: str, choices: tuple[str, ...], required: bool = False) -> "Validator":
        """Validate that the value is one of the allowed strings."""
        if self._present(name, required):
            value = self.data[name]
            if value not in choices:
                self.errors[name] = f"Must be one of: {', '.join(choices)}"
            else:
                self.values[name] = value
        return self

    def boolean(self, name: str, required: bool = False) -> "Validator":
        """Validate a boolean (or "true"/"false" string, for query parameters)."""
        if self._present(name, required):
            value = self.data[name]
            if isinstance(value, str) and value.lower() in TRUE_STRINGS | FALSE_STRINGS:
                value = value.lower() in TRUE_STRINGS
            if not isinstance(value, bool):
                self.errors[name] = "Must be true or false"
            else:
                self.values[name] = value
        return self

    def validate(self) -> dict[str, Any]:
        """Return cleaned values or raise ValidationError with all field errors."""
        if self.errors:
            raise ValidationError("One or more fields are invalid", self.errors)
        return self.values


def reject_unknown_fields(data: dict[str, Any], allowed: set[str]) -> None:
    """Raise ValidationError if the body contains fields outside the allowed set."""
    unknown = sorted(set(data) - allowed)
    if unknown:
        raise ValidationError("Unknown fields in request", {name: "Unknown field" for name in unknown})
