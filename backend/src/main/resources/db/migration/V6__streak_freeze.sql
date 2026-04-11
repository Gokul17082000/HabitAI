-- V6__streak_freeze.sql
-- Adds streak freeze support to users.
-- streakFreezes: how many freezes the user currently holds (max 2).
-- A freeze_used table records which dates were protected by a freeze,
-- so streak calculation can skip them instead of counting them as MISSED.

ALTER TABLE users ADD COLUMN streak_freezes INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS streak_freeze_usage (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_on    DATE   NOT NULL,
    CONSTRAINT uq_freeze_user_date UNIQUE (user_id, used_on)
);

CREATE INDEX IF NOT EXISTS idx_freeze_usage_user
    ON streak_freeze_usage (user_id);