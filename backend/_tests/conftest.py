"""Test harness: runs each service's Lambda handler against a real PostgreSQL test database.

Run from the repo root:
    python3 -m venv .venv && .venv/bin/pip install -r backend/_tests/requirements-dev.txt
    .venv/bin/pytest backend/_tests

Uses the local PostgreSQL from bin/start-dev.sh (override with POSTGRES_HOST/USER/PASS).
The TEST_POSTGRES_NAME database (default fixline_test) is wiped on every run.
"""

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

import psycopg
import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND / "_shared"))

TEST_DB = os.getenv("TEST_POSTGRES_NAME", "fixline_test")
os.environ.update({
    "IS_LOCAL": "true",
    "JWT_SECRET": "test-secret",
    "POSTGRES_HOST": os.getenv("POSTGRES_HOST", "localhost"),
    "POSTGRES_PORT": os.getenv("POSTGRES_PORT", "5432"),
    "POSTGRES_USER": os.getenv("POSTGRES_USER", "postgres"),
    "POSTGRES_PASS": os.getenv("POSTGRES_PASS", "postgres123"),
    "POSTGRES_NAME": TEST_DB,
})

from common import db  # noqa: E402  (needs sys.path and env above)

TABLES = "incident_status_history, incident_notes, incidents, engineer_profiles, seats, floors, buildings, users"


def _admin_conninfo(dbname: str) -> str:
    return psycopg.conninfo.make_conninfo(
        host=os.environ["POSTGRES_HOST"], port=os.environ["POSTGRES_PORT"], user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASS"], dbname=dbname,
    )


@pytest.fixture(scope="session", autouse=True)
def test_database():
    """Create the test database if needed and start from an empty schema."""
    with psycopg.connect(_admin_conninfo("postgres"), autocommit=True) as conn:
        if not conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,)).fetchone():
            conn.execute(psycopg.sql.SQL("CREATE DATABASE {}").format(psycopg.sql.Identifier(TEST_DB)))
    with psycopg.connect(_admin_conninfo(TEST_DB), autocommit=True) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    db.reset_connection()
    db._schema_ready = False
    yield
    db.reset_connection()


@pytest.fixture(autouse=True)
def clean_tables():
    db.get_connection().execute(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE")
    yield


def _load(service: str):
    spec = importlib.util.spec_from_file_location(f"svc_{service}", BACKEND / service / "function.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Response:
    def __init__(self, raw: dict[str, Any]) -> None:
        self.status = raw["statusCode"]
        self.body = json.loads(raw["body"]) if raw["body"] else None

    @property
    def error(self) -> dict[str, Any]:
        return self.body["error"]

    def __repr__(self) -> str:
        return f"<{self.status} {self.body}>"


class Api:
    """Calls a service handler the way CloudFront + Lambda Function URLs would."""

    def __init__(self, service: str) -> None:
        self.service = service
        self.module = _load(service)

    def call(self, method: str, path: str = "/", body: Any = None, token: str | None = None,
             query: dict[str, str] | None = None, raw_body: str | None = None) -> Response:
        headers = {"content-type": "application/json"}
        if token:
            headers["authorization"] = f"Bearer {token}"
        event = {
            "rawPath": f"/api/{self.service}{path if path != '/' else ''}",
            "requestContext": {"http": {"method": method}},
            "headers": headers,
            "queryStringParameters": query,
            "body": raw_body if raw_body is not None else (json.dumps(body) if body is not None else None),
            "isBase64Encoded": False,
        }
        return Response(self.module.handler(event))

    def get(self, path="/", **kw): return self.call("GET", path, **kw)
    def post(self, path="/", body=None, **kw): return self.call("POST", path, body=body, **kw)
    def put(self, path="/", body=None, **kw): return self.call("PUT", path, body=body, **kw)
    def delete(self, path="/", **kw): return self.call("DELETE", path, **kw)


@pytest.fixture(scope="session")
def apis():
    return {name: Api(name) for name in ("auth", "facilities", "engineers", "incidents", "dashboard")}


@pytest.fixture
def auth_api(apis): return apis["auth"]
@pytest.fixture
def facilities(apis): return apis["facilities"]
@pytest.fixture
def engineers(apis): return apis["engineers"]
@pytest.fixture
def incidents(apis): return apis["incidents"]
@pytest.fixture
def dashboard(apis): return apis["dashboard"]


def register(auth_api: Api, email: str, name: str, password: str = "correct-horse") -> dict[str, Any]:
    res = auth_api.post("/register", {"email": email, "password": password, "full_name": name})
    assert res.status == 201, res
    return res.body


@pytest.fixture
def world(apis):
    """An admin, two employees, two engineers, and one building with three seats."""
    a, f, e = apis["auth"], apis["facilities"], apis["engineers"]
    admin = register(a, "jordan.blake@acme.inc", "Jordan Blake")
    sam = register(a, "sam.rivera@acme.inc", "Sam Rivera")
    ava = register(a, "ava.thompson@acme.inc", "Ava Thompson")
    t = admin["token"]

    def make_engineer(email, name, specialty):
        res = e.post("/", {"email": email, "full_name": name, "password": "engineer-pass", "specialty": specialty,
                           "shift_start": "08:00", "shift_end": "16:00", "lunch_start": "13:00", "lunch_end": "14:00"}, token=t)
        assert res.status == 201, res
        login = a.post("/login", {"email": email, "password": "engineer-pass"})
        return {"token": login.body["token"], "user": login.body["user"]}

    marcus = make_engineer("marcus.chen@acme.inc", "Marcus Chen", "software")
    dana = make_engineer("dana.okafor@acme.inc", "Dana Okafor", "facility")

    building = f.post("/buildings", {"code": "ht", "name": "Harbor Tower"}, token=t).body
    floor = f.post(f"/buildings/{building['id']}/floors", {"level": 4}, token=t).body
    seats = [f.post(f"/floors/{floor['id']}/seats", {"code": code}, token=t).body for code in ("4-112", "4-118", "4-120")]
    return {"admin": admin, "sam": sam, "ava": ava, "marcus": marcus, "dana": dana,
            "building": building, "floor": floor, "seats": seats}
