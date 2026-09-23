-- Idempotent schema: safe to run on every Lambda cold start.

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email) AND email ~ '^[^@\s]+@acme\.inc$'),
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('employee', 'engineer', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(255) NOT NULL,
    address    VARCHAR(500),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS floors (
    id          SERIAL PRIMARY KEY,
    building_id INTEGER      NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    level       INTEGER      NOT NULL,
    name        VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (building_id, level)
);

CREATE TABLE IF NOT EXISTS seats (
    id         SERIAL PRIMARY KEY,
    floor_id   INTEGER     NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    code       VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (floor_id, code)
);

CREATE TABLE IF NOT EXISTS engineer_profiles (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialty   VARCHAR(20) NOT NULL CHECK (specialty IN ('hardware', 'software', 'facility', 'other')),
    shift_start TIME        NOT NULL DEFAULT '09:00',
    shift_end   TIME        NOT NULL DEFAULT '17:00',
    lunch_start TIME        NOT NULL DEFAULT '12:00',
    lunch_end   TIME        NOT NULL DEFAULT '13:00',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (shift_start < shift_end),
    CHECK (lunch_start < lunch_end)
);

CREATE TABLE IF NOT EXISTS incidents (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    description       TEXT         NOT NULL,
    category          VARCHAR(20)  NOT NULL CHECK (category IN ('hardware', 'software', 'facility', 'other')),
    priority          VARCHAR(20)  NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status            VARCHAR(20)  NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'in_progress', 'blocked', 'resolved', 'closed')),
    seat_id           INTEGER      NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    asset_tag         VARCHAR(100),
    reporter_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id       INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    is_escalated      BOOLEAN      NOT NULL DEFAULT FALSE,
    escalation_reason TEXT,
    blocked_reason    TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acknowledged_at   TIMESTAMPTZ,
    assigned_at       TIMESTAMPTZ,
    escalated_at      TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ,
    closed_at         TIMESTAMPTZ,
    CONSTRAINT incidents_blocked_reason_check CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL),
    CONSTRAINT incidents_escalation_reason_check CHECK (NOT is_escalated OR escalation_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_assignee ON incidents (assignee_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents (reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_seat     ON incidents (seat_id);

CREATE TABLE IF NOT EXISTS incident_notes (
    id          SERIAL PRIMARY KEY,
    incident_id INTEGER     NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body        TEXT        NOT NULL CHECK (length(trim(body)) > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_incident ON incident_notes (incident_id);

CREATE TABLE IF NOT EXISTS incident_status_history (
    id          SERIAL PRIMARY KEY,
    incident_id INTEGER     NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    reason      TEXT,
    changed_by  INTEGER     NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_incident ON incident_status_history (incident_id);
