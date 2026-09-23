"""Engineer availability from shift and lunch hours, evaluated in the office time zone."""

import os
from datetime import datetime, time
from typing import Any
from zoneinfo import ZoneInfo

AVAILABLE = "available"
LUNCH = "lunch"
OFF_SHIFT = "off"


def office_now() -> datetime:
    """Current time in the office time zone (APP_TIMEZONE, default America/New_York)."""
    return datetime.now(ZoneInfo(os.getenv("APP_TIMEZONE", "America/New_York")))


def availability(profile: dict[str, Any], at: time | None = None) -> dict[str, str]:
    """Return {"state", "label"} for an engineer profile at the given local time (default: now)."""
    now = at or office_now().time()
    if not profile["is_active"]:
        return {"state": OFF_SHIFT, "label": "Inactive"}
    if not profile["shift_start"] <= now < profile["shift_end"]:
        return {"state": OFF_SHIFT, "label": "Off shift"}
    if profile["lunch_start"] <= now < profile["lunch_end"]:
        return {"state": LUNCH, "label": f"Lunch until {profile['lunch_end'].strftime('%H:%M')}"}
    return {"state": AVAILABLE, "label": "Available"}
