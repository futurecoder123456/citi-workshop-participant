def _incident(world, incidents, who="sam", seat=0, **extra):
    body = {"title": "Issue", "description": "Something broke", "category": "hardware", "seat_id": world["seats"][seat]["id"], **extra}
    return incidents.post("/", body, token=world[who]["token"]).body


def test_admin_dashboard_answers_the_business_questions(world, incidents, dashboard):
    admin = world["admin"]["token"]
    marcus = world["marcus"]["user"]["id"]
    a = _incident(world, incidents)
    b = _incident(world, incidents, category="software")
    _incident(world, incidents, who="ava", seat=1, description="extreme heat from the vent", category="facility")

    for inc in (a, b):
        incidents.post(f"/{inc['id']}/assign", {"assignee_id": marcus}, token=admin)
        incidents.post(f"/{inc['id']}/status", {"status": "in_progress"}, token=world["marcus"]["token"])
    incidents.post(f"/{a['id']}/status", {"status": "resolved", "reason": "Fixed"}, token=world["marcus"]["token"])
    incidents.post(f"/{b['id']}/status", {"status": "blocked", "reason": "Vendor"}, token=world["marcus"]["token"])

    res = dashboard.get("/", token=admin)
    assert res.status == 200
    d = res.body
    assert d["by_status"] == {"open": 1, "resolved": 1, "blocked": 1}
    assert d["by_category"] == {"hardware": 1, "software": 1, "facility": 1}
    assert d["by_priority"]["critical"] == 1
    assert d["escalated_active"] == 1 and d["unassigned_active"] == 1
    escalated = next(i for i in incidents.get("/", token=admin).body if i["is_escalated"])
    assert [r["id"] for r in d["needs_attention"]] == [escalated["id"], b["id"]]  # escalated first, then blocked
    assert d["hotspots"] == [{"seat_id": world["seats"][0]["id"], "building_name": "Harbor Tower", "floor_name": "Floor 4",
                              "seat_code": "4-112", "incidents": 2}]
    assert d["by_building"][0]["incidents"] == 3
    assert d["average_minutes"]["acknowledge"] is not None and d["average_minutes"]["resolve"] is not None
    assert d["communication"]["tickets"] == 2 and d["communication"]["staff_update_rate"] == 0.5

    workload = {w["full_name"]: w for w in d["workload"]}
    assert workload["Marcus Chen"]["active"] == 1 and workload["Marcus Chen"]["resolved"] == 1
    assert workload["Dana Okafor"]["active"] == 0 and "availability" in workload["Dana Okafor"]


def test_dashboard_is_scoped_per_persona(world, incidents, dashboard):
    _incident(world, incidents)
    _incident(world, incidents, who="ava")

    sam = dashboard.get("/", token=world["sam"]["token"]).body
    assert sam["by_status"] == {"open": 1} and "workload" not in sam

    marcus = dashboard.get("/", token=world["marcus"]["token"]).body
    assert marcus["by_status"] == {} and [w["full_name"] for w in marcus["workload"]] == ["Marcus Chen"]

    bad = dashboard.get("/", token=world["admin"]["token"], query={"days": "0"})
    assert bad.status == 400 and bad.error["details"] == {"days": "Must be between 1 and 365"}
