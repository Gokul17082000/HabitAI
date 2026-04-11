-- V1__baseline.sql
-- Baseline schema migration — captures the full schema as it existed before Flyway was introduced.
-- After applying this, all future schema changes must be new versioned migration files (V2__, V3__, etc.)
-- Generated from the Hibernate DDL. Run: pg_dump --schema-only -d habitai to verify against your live DB.

CREATE TABLE IF NOT EXISTS users (
        id          BIGSERIAL PRIMARY KEY,
        email       VARCHAR(150) NOT NULL,
password    VARCHAR(255) NOT NULL,
created_at  TIMESTAMP   NOT NULL,
push_token  VARCHAR(255),
timezone    VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
CONSTRAINT uk_user_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS habits (
        id           BIGSERIAL PRIMARY KEY,
        user_id      BIGINT       NOT NULL,
        title        VARCHAR(100) NOT NULL,
description  VARCHAR(100),
category     VARCHAR(50)  NOT NULL,
frequency    VARCHAR(50)  NOT NULL,
target_time  TIME         NOT NULL,
target_count INT          NOT NULL DEFAULT 1,
is_countable BOOLEAN      NOT NULL DEFAULT FALSE,
paused       BOOLEAN      NOT NULL DEFAULT FALSE,
paused_until DATE,
created_at   DATE         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_habit_user ON habits (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_time ON habits (target_time);

CREATE TABLE IF NOT EXISTS habit_days_of_week (
        habit_id    BIGINT      NOT NULL REFERENCES habits(id),
days_of_week VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_days_of_month (
        habit_id     BIGINT NOT NULL REFERENCES habits(id),
days_of_month INT   NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_log (
        id            BIGSERIAL PRIMARY KEY,
        habit_id      BIGINT      NOT NULL,
        user_id       BIGINT      NOT NULL,
        date          DATE        NOT NULL,
        status        VARCHAR(50) NOT NULL,
current_count INT         NOT NULL DEFAULT 0,
note          VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_habit_log_user_date ON habit_log (user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_log_habit_user ON habit_log (habit_id, user_id);

CREATE TABLE IF NOT EXISTS refresh_token (
        id         BIGSERIAL PRIMARY KEY,
        token      VARCHAR(512) NOT NULL UNIQUE,
user_id    BIGINT       NOT NULL,
expires_at TIMESTAMP    NOT NULL,
used       BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_token (user_id);