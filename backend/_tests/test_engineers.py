from datetime import datetime, time

import pytest

from common import schedule


@pytest.fixture
def clock(monkeypatch):
    """Pin the office clock: clock(12, 30)."""
    def set_time(hour, minute=0):
        monkeypatch.setattr(schedule, "office_now", lambda: datetime(2026, 9, 23, hour, minute))
    return set_time


def test_admin_creates_engineer_with_default_hours(world, engineers):
    res = engineers.post("/", {"email": "kim.park@acme.inc", "full_name": "Kim Park", "password": "initial-pass", "specialty": "software"},
                         token=world["admin"]["token"])
    assert res.status == 201
    assert res.body["shift_start"] == "09:00:00" and res.body["lunch_end"] == "13:00:00"
    assert res.body["active_tickets"] == 0 and res.body["availability"]["state"] in {"available", "lunch", "off"}


def test_existing_employee_is_promoted_not_duplicated(world, engineers, auth_api):
    res = engineers.post("/", {"email": "ava.thompson@acme.inc", "full_name": "Ava Thompson", "password": "ignored-pass", "specialty": "hardware"},
                         token=world["admin"]["token"])
    assert res.status == 201 and res.body["id"] == world["ava"]["user"]["id"]
    assert auth_api.get("/me", token=world["ava"]["token"]).body["role"] == "engineer"


def test_engineer_validation_messages(world, engineers):
    t = world["admin"]["token"]
    bad_hours = engineers.post("/", {"email": "x@acme.inc", "full_name": "X", "password": "initial-pass", "specialty": "software",
                                     "shift_start": "09:00", "shift_end": "17:00", "lunch_start": "18:00", "lunch_end": "19:00"}, token=t)
    assert bad_hours.status == 400 and bad_hours.error["message"] == "Check the shift and lunch hours."
    assert bad_hours.error["details"] == {"lunch_start": "Lunch must fall within the shift"}

    bad_time = engineers.post("/", {"email": "x@acme.inc", "full_name": "X", "password": "initial-pass", "specialty": "software",
                                    "shift_start": "9am"}, token=t)
    assert bad_time.error["details"] == {"shift_start": "Must be a time like 09:00"}

    taken = engineers.post("/", {"email": "marcus.chen@acme.inc", "full_name": "M", "password": "initial-pass", "specialty": "software"}, token=t)
    assert taken.status == 400 and taken.error["message"] == "This person already has an engineer or admin account."


def test_roster_access(world, engineers):
    assert engineers.get("/", token=world["sam"]["token"]).status == 403
    assert len(engineers.get("/", token=world["marcus"]["token"]).body) == 2
    marcus_id, dana_id = world["marcus"]["user"]["id"], world["dana"]["user"]["id"]
    assert engineers.get(f"/{marcus_id}", token=world["marcus"]["token"]).status == 200
    other = engineers.get(f"/{dana_id}", token=world["marcus"]["token"])
    assert other.status == 403 and other.error["message"] == "You can only view your own engineer profile."
    assert engineers.put(f"/{dana_id}", {"specialty": "hardware"}, token=world["marcus"]["token"]).status == 403


def test_availability_follows_shift_and_lunch(world, engineers, clock):
    t = world["admin"]["token"]
    marcus_id = world["marcus"]["user"]["id"]  # shift 08-16, lunch 13-14
    engineers.put(f"/{world['dana']['user']['id']}", {"shift_start": "10:00", "shift_end": "18:00", "lunch_start": "14:00", "lunch_end": "15:00"}, token=t)

    clock(13, 30)
    states = {e["id"]: e["availability"] for e in engineers.get("/", token=t).body}
    assert states[marcus_id] == {"state": "lunch", "label": "Lunch until 14:00"}
    assert [e["full_name"] for e in engineers.get("/", token=t, query={"available": "now"}).body] == ["Dana Okafor"]

    clock(7, 0)
    assert engineers.get("/", token=t, query={"available": "now"}).body == []
    assert engineers.get(f"/{marcus_id}", token=t).body["availability"]["label"] == "Off shift"


def test_availability_helper_boundaries():
    profile = {"is_active": True, "shift_start": time(9), "shift_end": time(17), "lunch_start": time(12), "lunch_end": time(13)}
    assert schedule.availability(profile, time(9))["state"] == "available"
    assert schedule.availability(profile, time(12))["state"] == "lunch"
    assert schedule.availability(profile, time(13))["state"] == "available"
    assert schedule.availability(profile, time(17))["state"] == "off"
    assert schedule.availability({**profile, "is_active": False}, time(10))["label"] == "Inactive"


def test_deactivating_engineer_unassigns_active_tickets(world, engineers, incidents):
    t = world["admin"]["token"]
    marcus_id = world["marcus"]["user"]["id"]
    inc = incidents.post("/", {"title": "VPN", "description": "drops", "category": "software", "seat_id": world["seats"][0]["id"]},
                         token=world["sam"]["token"]).body
    incidents.post(f"/{inc['id']}/assign", {"assignee_id": marcus_id}, token=t)

    assert engineers.delete(f"/{marcus_id}", token=t).status == 204
    assert incidents.get(f"/{inc['id']}", token=t).body["assignee_id"] is None
    assert [e["id"] for e in engineers.get("/", token=t).body] == [world["dana"]["user"]["id"]]
    res = incidents.post(f"/{inc['id']}/assign", {"assignee_id": marcus_id}, token=t)
    assert res.status == 400 and res.error["message"] == "That person isn't an active engineer."
