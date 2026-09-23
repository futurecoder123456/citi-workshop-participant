"""PostgreSQL connection management and schema bootstrap shared by all services."""

import logging
import os
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import psycopg
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

SCHEMA_PATH = Path(__file__).with_name("schema.sql")
# Arbitrary app-wide key; serializes schema creation across concurrent cold starts.
SCHEMA_LOCK_ID = 7241001
CONNECT_ATTEMPTS = 2

_conn: psycopg.Connection | None = None
_schema_ready = False


def _conninfo() -> str:
    """Build the connection string from the environment injected by Terraform."""
    is_local = os.getenv("IS_LOCAL", "false") == "true"
    return make_conninfo(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASS", ""),
        dbname=os.getenv("POSTGRES_NAME", "postgres"),
        # Aurora Serverless v2 may be auto-paused and needs time to resume.
        connect_timeout=30,
        sslmode="prefer" if is_local else "require",
    )


def _connect() -> psycopg.Connection:
    """Open a new autocommit connection, retrying once for transient failures."""
    for attempt in range(1, CONNECT_ATTEMPTS + 1):
        try:
            return psycopg.connect(_conninfo(), autocommit=True, row_factory=dict_row)
        except psycopg.OperationalError:
            if attempt == CONNECT_ATTEMPTS:
                raise
            logger.warning("PostgreSQL connection attempt %d failed, retrying", attempt)
            time.sleep(2)
    raise RuntimeError("unreachable")


def _ensure_schema(conn: psycopg.Connection) -> None:
    """Apply the idempotent schema once per Lambda container."""
    global _schema_ready
    if _schema_ready:
        return
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("SELECT pg_advisory_xact_lock(%s)", (SCHEMA_LOCK_ID,))
        cur.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
    _schema_ready = True


def get_connection() -> psycopg.Connection:
    """Return the pooled connection for this container, reconnecting if needed."""
    global _conn
    if _conn is None or _conn.closed or _conn.broken:
        _conn = _connect()
    _ensure_schema(_conn)
    return _conn


def reset_connection() -> None:
    """Drop the pooled connection so the next call reconnects."""
    global _conn
    if _conn is not None:
        try:
            _conn.close()
        except psycopg.Error:
            pass
    _conn = None


def fetch_all(query: Any, params: Any = None) -> list[dict[str, Any]]:
    """Run a query and return all rows as dicts."""
    with get_connection().cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def fetch_one(query: Any, params: Any = None) -> dict[str, Any] | None:
    """Run a query and return the first row as a dict, or None."""
    with get_connection().cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


@contextmanager
def transaction() -> Iterator[psycopg.Cursor]:
    """Yield a cursor inside a transaction that commits on success and rolls back on error."""
    conn = get_connection()
    with conn.transaction(), conn.cursor() as cur:
        yield cur
