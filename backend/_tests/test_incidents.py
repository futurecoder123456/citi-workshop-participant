import pytest


@pytest.fixture
def report(world, incidents):
    """Report an incident as Sam (or another user) and return its body."""
    def create(title="Docking station won't charge", description="Battery isn't charging through the dock.",
               who="sam", seat=0, **extra):
        res = incidents.post("/", {"title": title, "description": description, "category": "hardware",
                                   "seat_id": world["seats"][seat]["id"], **extra}, token=world[who]["token"])
        assert res.status == 201, res
        return res.body
    return create


@pytest.fixture
def move(world, incidents):
    """Change status as a given persona and return the response."""
    def change(incident, status, who, reason=None):
        body = {"status": status} | ({"reason": reason} if reason is not None else {})
        return incidents.post(f"/{incident['id']}/status", body, token=world[who]["token"])
    return change


def assign(world, incidents, incident, engineer="marcus"):
    res = incidents.post(f"/{incident['id']}/assign", {"assignee_id": world[engineer]["user"]["id"]}, token=world["admin"]["token"])
    assert res.status == 200, res
    return res.body


# Creating and reading

def test_report_returns_location_people_and_history(world, report):
    inc = report(asset_tag="DK-0391")
    assert inc["status"] == "open" and inc["priority"] == "medium" and inc["is_escalated"] is False
    assert (inc["building_name"], inc["floor_level"], inc["seat_code"]) == ("Harbor Tower", 4, "4-112")
    assert inc["reporter_name"] == "Sam Rivera" and inc["assignee_name"] is None
    assert [(h["from_status"], h["to_status"], h["reason"]) for h in inc["history"]] == [(None, "open", "Reported")]


def test_missing_report_fields_use_friendly_message(world, incidents):
    res = incidents.post("/", {"category": "hardware"}, token=world["sam"]["token"])
    assert res.status == 400
    assert res.error["message"] == "Add a title, choose where it is, and describe the problem."
    assert set(res.error["details"]) == {"title", "description", "seat_id"}

    bad_choice = incidents.post("/", {"title": "t", "description": "d", "category": "plumbing", "seat_id": world["seats"][0]["id"]},
                                token=world["sam"]["token"])
    assert bad_choice.error["message"] == "One or more fields are invalid"
    assert bad_choice.error["details"] == {"category": "Must be one of: hardware, software, facility, other"}

    unknown_seat = incidents.post("/", {"title": "t", "description": "d", "category": "hardware", "seat_id": 9999}, token=world["sam"]["token"])
    assert unknown_seat.status == 400 and unknown_seat.error["message"] == "Choose a location from the list."

    extra = incidents.post("/", {"title": "t", "description": "d", "category": "hardware", "seat_id": 1, "status": "closed"},
                           token=world["sam"]["token"])
    assert extra.status == 400 and extra.error["details"] == {"status": "Unknown field"}


def test_extreme_keyword_auto_escalates_with_quote(report):
    inc = report(title="Monitor smoking", description="Screen flickers. There's an EXTREME burning smell from the back.", priority="low")
    assert inc["is_escalated"] is True and inc["priority"] == "critical" and inc["escalated_at"]
    assert inc["escalation_reason"].startswith("Auto-flagged — report contains “extreme”: “")
    assert "EXTREME burning smell" in inc["escalation_reason"]
    assert inc["history"][0]["reason"] == "Reported and auto-escalated"


def test_keyword_must_be_a_whole_word(report):
    assert report(description="The extremely loud fan is annoying")["is_escalated"] is False


def test_visibility_by_role(world, incidents, report):
    sams = report()
    avas = report(who="ava", title="Ava's printer")
    assign(world, incidents, avas)

    assert [i["id"] for i in incidents.get("/", token=world["sam"]["token"]).body] == [sams["id"]]
    hidden = incidents.get(f"/{avas['id']}", token=world["sam"]["token"])
    assert hidden.status == 404 and hidden.error["message"] == "This incident doesn't exist or you don't have access to it."
    assert [i["id"] for i in incidents.get("/", token=world["marcus"]["token"]).body] == [avas["id"]]
    assert len(incidents.get("/", token=world["admin"]["token"]).body) == 2


def test_search_and_filters(world, incidents, report):
    t = world["admin"]["token"]
    vpn = report(title="VPN drops", description="every ten minutes", category="software")
    report(title="Desk stuck", seat=1)
    assign(world, incidents, vpn)

    def ids(**query):
        return [i["id"] for i in incidents.get("/", token=t, query={k: str(v) for k, v in query.items()}).body]

    assert ids(q="vpn") == [vpn["id"]]
    assert ids(q=f"INC-{vpn['id']}") == [vpn["id"]]
    assert ids(q="marcus") == [vpn["id"]]
    assert ids(category="software") == [vpn["id"]]
    assert ids(unassigned="true") != [] and vpn["id"] not in ids(unassigned="true")
    assert ids(seat_id=world["seats"][1]["id"]) != [vpn["id"]]
    assert len(ids(building_id=world["building"]["id"])) == 2
    bad = incidents.get("/", token=t, query={"status": "done"})
    assert bad.status == 400 and bad.error["details"] == {"status": "Must be one of: open, in_progress, blocked, resolved, closed"}


def test_reporter_edits_only_while_open(world, incidents, report, move):
    inc = report()
    res = incidents.put(f"/{inc['id']}", {"title": "Dock and monitor dead"}, token=world["sam"]["token"])
    assert res.status == 200 and res.body["title"] == "Dock and monitor dead"

    other = incidents.put(f"/{inc['id']}", {"title": "x"}, token=world["ava"]["token"])
    assert other.status == 404  # not visible to Ava at all

    assign(world, incidents, inc)
    move(inc, "in_progress", "marcus")
    locked = incidents.put(f"/{inc['id']}", {"title": "x"}, token=world["sam"]["token"])
    assert locked.status == 409 and locked.error["message"] == "Tickets can only be edited while they're open."
    assert incidents.put(f"/{inc['id']}", {"priority": "high"}, token=world["admin"]["token"]).body["priority"] == "high"


def test_only_admin_deletes(world, incidents, report):
    inc = report()
    assert incidents.delete(f"/{inc['id']}", token=world["sam"]["token"]).status == 403
    assert incidents.delete(f"/{inc['id']}", token=world["admin"]["token"]).status == 204
    assert incidents.get(f"/{inc['id']}", token=world["admin"]["token"]).status == 404


# Assignment

def test_assignment_rules(world, incidents, report):
    inc = report()
    by_engineer = incidents.post(f"/{inc['id']}/assign", {"assignee_id": world["marcus"]["user"]["id"]}, token=world["marcus"]["token"])
    assert by_engineer.status == 403 and by_engineer.error["message"] == "Only facility admins can assign tickets."

    missing = incidents.post(f"/{inc['id']}/assign", {}, token=world["admin"]["token"])
    assert missing.status == 400 and missing.error["message"] == "Choose an engineer to assign."

    to_employee = incidents.post(f"/{inc['id']}/assign", {"assignee_id": world["ava"]["user"]["id"]}, token=world["admin"]["token"])
    assert to_employee.status == 400 and to_employee.error["message"] == "That person isn't an active engineer."

    body = assign(world, incidents, inc)
    assert body["assignee_name"] == "Marcus Chen" and body["assigned_at"]
    assert body["history"][-1]["reason"] == "Assigned to Marcus Chen"
    again = incidents.post(f"/{inc['id']}/assign", {"assignee_id": world["marcus"]["user"]["id"]}, token=world["admin"]["token"])
    assert again.status == 409 and again.error["message"] == "This ticket is already assigned to Marcus Chen."


# Workflow

def test_full_lifecycle(world, incidents, report, move):
    inc = report()

    early = move(inc, "in_progress", "admin")
    assert early.status == 409 and early.error["message"] == "Assign an engineer before starting work."

    assign(world, incidents, inc)
    started = move(inc, "in_progress", "marcus")
    assert started.status == 200 and started.body["acknowledged_at"]

    no_reason = move(inc, "blocked", "marcus")
    assert no_reason.status == 400 and no_reason.error["message"] == "Add what's blocking this ticket before marking it blocked."
    blocked = move(inc, "blocked", "marcus", "Waiting on replacement dock")
    assert blocked.body["status"] == "blocked" and blocked.body["blocked_reason"] == "Waiting on replacement dock"

    unblocked = move(inc, "in_progress", "marcus")
    assert unblocked.body["blocked_reason"] is None

    no_note = move(inc, "resolved", "marcus", "   ")
    assert no_note.status == 400 and no_note.error["message"] == "Add a resolution note so the reporter knows what was fixed."
    resolved = move(inc, "resolved", "marcus", "Swapped the dock for a new one.")
    assert resolved.body["resolved_at"] and resolved.body["notes"][-1]["body"] == "Swapped the dock for a new one."

    engineer_close = move(inc, "closed", "marcus")
    assert engineer_close.status == 403 and engineer_close.error["message"] == "You can't move this ticket to Closed."
    closed = move(inc, "closed", "sam")
    assert closed.status == 200 and closed.body["closed_at"]

    reopen = move(inc, "in_progress", "sam")
    assert reopen.status == 409 and reopen.error["message"] == "A ticket that is Closed can't move to In progress."
    note = incidents.post(f"/{inc['id']}/notes", {"body": "still broken"}, token=world["sam"]["token"])
    assert note.status == 409 and note.error["message"] == "Closed tickets can't take new notes."

    transitions = [(h["from_status"], h["to_status"]) for h in closed.body["history"] if h["from_status"] != h["to_status"]]
    assert transitions == [(None, "open"), ("open", "in_progress"), ("in_progress", "blocked"), ("blocked", "in_progress"),
                           ("in_progress", "resolved"), ("resolved", "closed")]


def test_role_limits_on_transitions(world, incidents, report, move):
    inc = report()
    assign(world, incidents, inc)
    employee = move(inc, "in_progress", "sam")
    assert employee.status == 403 and employee.error["message"] == "You can't move this ticket to In progress."
    # Dana is an engineer but not the assignee, so the ticket isn't visible to her.
    assert move(inc, "in_progress", "dana").status == 404
    same = move(inc, "open", "admin")
    assert same.status == 409 and same.error["message"] == "This ticket is already Open."
    skip = move(inc, "closed", "admin")
    assert skip.status == 409 and skip.error["message"] == "A ticket that is Open can't move to Closed."


def test_reporter_can_reopen_resolved_ticket(world, incidents, report, move):
    inc = report()
    assign(world, incidents, inc)
    move(inc, "in_progress", "marcus")
    move(inc, "resolved", "marcus", "Restarted it")
    reopened = move(inc, "in_progress", "sam")
    assert reopened.status == 200 and reopened.body["status"] == "in_progress" and reopened.body["resolved_at"] is None


# Escalation

def test_escalation_rules(world, incidents, report, move):
    inc = report(priority="low")
    path = f"/{inc['id']}/escalate"

    missing = incidents.post(path, {}, token=world["sam"]["token"])
    assert missing.status == 400 and missing.error["message"] == "Say why this needs escalating so the admin can prioritise it."

    assign(world, incidents, inc)
    engineer = incidents.post(path, {"reason": "urgent"}, token=world["marcus"]["token"])
    assert engineer.status == 403 and engineer.error["message"] == "Only the person who reported this ticket or an admin can escalate it."

    ok = incidents.post(path, {"reason": "Client demo in an hour"}, token=world["sam"]["token"])
    assert ok.status == 200 and ok.body["is_escalated"] and ok.body["priority"] == "high"
    assert ok.body["escalation_reason"] == "Employee requested — Client demo in an hour"

    again = incidents.post(path, {"reason": "still urgent"}, token=world["sam"]["token"])
    assert again.status == 409 and again.error["message"] == "This ticket is already escalated."

    assert incidents.delete(path, token=world["sam"]["token"]).status == 403
    cleared = incidents.delete(path, token=world["admin"]["token"])
    assert cleared.status == 200 and cleared.body["is_escalated"] is False

    move(inc, "in_progress", "marcus")
    move(inc, "resolved", "marcus", "done")
    late = incidents.post(path, {"reason": "again"}, token=world["sam"]["token"])
    assert late.status == 409 and late.error["message"] == "Only open, in-progress, or blocked tickets can be escalated."


# Notes

def test_notes_between_reporter_and_engineer(world, incidents, report):
    inc = report()
    assign(world, incidents, inc)
    path = f"/{inc['id']}/notes"

    empty = incidents.post(path, {"body": "  "}, token=world["sam"]["token"])
    assert empty.status == 400 and empty.error["message"] == "Write a note before posting."
    no_body = incidents.post(path, token=world["sam"]["token"])
    assert no_body.status == 400 and no_body.error["message"] == "Write a note before posting."

    n1 = incidents.post(path, {"body": "Part arrives Thursday"}, token=world["marcus"]["token"])
    assert n1.status == 201 and n1.body["author_name"] == "Marcus Chen" and n1.body["author_role"] == "engineer"
    incidents.post(path, {"body": "Thanks!"}, token=world["sam"]["token"])
    assert [n["body"] for n in incidents.get(path, token=world["sam"]["token"]).body] == ["Part arrives Thursday", "Thanks!"]
    assert incidents.post(path, {"body": "hi"}, token=world["ava"]["token"]).status == 404

    note_path = f"{path}/{n1.body['id']}"
    not_mine = incidents.put(note_path, {"body": "edited"}, token=world["sam"]["token"])
    assert not_mine.status == 403 and not_mine.error["message"] == "You can only change notes you wrote."
    assert incidents.put(note_path, {"body": "Part arrives Friday"}, token=world["marcus"]["token"]).body["body"] == "Part arrives Friday"
    assert incidents.delete(note_path, token=world["admin"]["token"]).status == 204
    assert incidents.delete(note_path, token=world["admin"]["token"]).error["message"] == "Note not found"
