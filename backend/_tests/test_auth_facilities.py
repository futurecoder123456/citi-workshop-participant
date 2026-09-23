from conftest import register


# Auth

def test_first_account_is_admin_and_later_ones_are_employees(auth_api):
    assert register(auth_api, "first@acme.inc", "First")["user"]["role"] == "admin"
    assert register(auth_api, "second@acme.inc", "Second")["user"]["role"] == "employee"


def test_register_requires_acme_email(auth_api):
    res = auth_api.post("/register", {"email": "sam@gmail.com", "password": "long-enough", "full_name": "Sam"})
    assert res.status == 400
    assert res.error["message"] == "Use your @acme.inc work email to register."
    assert res.error["details"] == {"email": "Must be an @acme.inc address"}


def test_register_rejects_short_password_and_duplicates(auth_api):
    res = auth_api.post("/register", {"email": "sam@acme.inc", "password": "short", "full_name": "Sam"})
    assert res.status == 400 and res.error["message"] == "Choose a password with at least 8 characters."

    register(auth_api, "sam@acme.inc", "Sam")
    res = auth_api.post("/register", {"email": "SAM@acme.inc", "password": "long-enough", "full_name": "Sam"})
    assert res.status == 409
    assert res.error["message"] == "An account with this email already exists. Sign in instead."


def test_register_reports_every_missing_field(auth_api):
    res = auth_api.post("/register", {"email": "sam@acme.inc"})
    assert res.status == 400
    assert set(res.error["details"]) == {"password", "full_name"}


def test_login_and_me(auth_api):
    register(auth_api, "sam@acme.inc", "Sam Rivera")
    bad = auth_api.post("/login", {"email": "sam@acme.inc", "password": "wrong-password"})
    assert bad.status == 401 and bad.error["message"] == "Email or password is incorrect."
    unknown = auth_api.post("/login", {"email": "nobody@acme.inc", "password": "whatever-pass"})
    assert unknown.status == 401 and unknown.error["message"] == "Email or password is incorrect."

    ok = auth_api.post("/login", {"email": "Sam@Acme.inc", "password": "correct-horse"})
    assert ok.status == 200
    me = auth_api.get("/me", token=ok.body["token"])
    assert me.status == 200
    assert me.body["email"] == "sam@acme.inc" and "password_hash" not in me.body


def test_protected_routes_need_a_valid_token(auth_api, incidents):
    assert auth_api.get("/me").error["message"] == "Sign in to continue."
    res = incidents.get("/", token="not-a-jwt")
    assert res.status == 401 and res.error["code"] == "unauthorized"


def test_request_errors_use_the_error_envelope(auth_api):
    bad_json = auth_api.call("POST", "/login", raw_body="{nope")
    assert bad_json.status == 400 and bad_json.error["message"] == "Request body must be valid JSON"
    assert auth_api.get("/login").status == 405
    missing = auth_api.get("/nowhere")
    assert missing.status == 404 and missing.error == {"code": "not_found", "message": "Resource not found", "details": {}}


# Facilities

def test_only_admins_change_facilities(world, facilities):
    res = facilities.post("/buildings", {"code": "RA", "name": "Riverside Annex"}, token=world["sam"]["token"])
    assert res.status == 403
    assert res.error["message"] == "You do not have permission to perform this action"
    assert facilities.get("/buildings", token=world["sam"]["token"]).status == 200


def test_building_floor_seat_crud(world, facilities):
    t = world["admin"]["token"]
    buildings = facilities.get("/buildings", token=t).body
    assert buildings[0]["code"] == "HT" and buildings[0]["floor_count"] == 1 and buildings[0]["seat_count"] == 3

    b = facilities.put(f"/buildings/{world['building']['id']}", {"address": "1 Harbor Way"}, token=t)
    assert b.status == 200 and b.body["address"] == "1 Harbor Way"

    dup = facilities.post("/buildings", {"code": "HT", "name": "Again"}, token=t)
    assert dup.status == 409 and dup.error["message"] == "A record with the same unique value already exists"

    seat = world["seats"][2]
    assert facilities.put(f"/seats/{seat['id']}", {"code": "4-121"}, token=t).body["code"] == "4-121"
    assert facilities.delete(f"/seats/{seat['id']}", token=t).status == 204
    assert facilities.delete(f"/seats/{seat['id']}", token=t).error["message"] == "Seat not found"
    assert facilities.post("/floors/999/seats", {"code": "x"}, token=t).error["message"] == "Floor not found"


def test_seat_options_have_readable_labels_and_search(world, facilities):
    options = facilities.get("/seats", token=world["sam"]["token"]).body
    assert options[0]["label"] == "Harbor Tower › Floor 4 › 4-112"
    assert [o["seat_code"] for o in facilities.get("/seats", token=world["sam"]["token"], query={"q": "118"}).body] == ["4-118"]


def test_seat_in_use_cannot_be_deleted(world, facilities, incidents):
    seat = world["seats"][0]
    incidents.post("/", {"title": "t", "description": "d", "category": "hardware", "seat_id": seat["id"]}, token=world["sam"]["token"])
    res = facilities.delete(f"/seats/{seat['id']}", token=world["admin"]["token"])
    assert res.status == 409
    assert res.error["message"] == "Referenced record does not exist or the record is still in use"
