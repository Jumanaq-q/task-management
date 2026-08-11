-- Task Management — database schema (PostgreSQL)


--  👍👍 CREATE DATABASE taskmgmt OWNER appuser;

CREATE TABLE IF NOT EXISTS users (
    user_id        SERIAL PRIMARY KEY,
    full_name      VARCHAR(120)  NOT NULL,
    email          VARCHAR(255)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255)  NOT NULL,
    role           VARCHAR(20)   NOT NULL,          -- 'Manager' | 'Employee'
    created_at     TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS tasks (
    task_id      SERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    priority     VARCHAR(10)  NOT NULL DEFAULT 'Medium',  -- High | Medium | Low
    deadline     DATE,
    created_at   TIMESTAMPTZ  DEFAULT now(),
    created_by   INTEGER      NOT NULL REFERENCES users (user_id)
);

-- One row per (task, employee): each assignee has an independent status + report.
CREATE TABLE IF NOT EXISTS task_assignments (
    assignment_id  SERIAL PRIMARY KEY,
    task_id        INTEGER     NOT NULL REFERENCES tasks (task_id),
    employee_id    INTEGER     NOT NULL REFERENCES users (user_id),
    status         VARCHAR(20) NOT NULL DEFAULT 'Assigned',
                   -- 'Assigned' -> 'Accepted' -> 'In Progress' -> 'Finished'
    accepted_at    TIMESTAMPTZ,
    started_at     TIMESTAMPTZ,
    finished_at    TIMESTAMPTZ,
    report         TEXT,
    report_sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id  SERIAL PRIMARY KEY,
    user_id          INTEGER      NOT NULL REFERENCES users (user_id),
    task_id          INTEGER      NOT NULL REFERENCES tasks (task_id),
    message          VARCHAR(300) NOT NULL,
    is_read          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  DEFAULT now()
);
