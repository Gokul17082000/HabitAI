-- V4__user_created_at_timestamptz.sql
-- MINOR FIX: created_at was stored as TIMESTAMP (without time zone).
-- LocalDateTime has no timezone info — if the server timezone ever changed,
-- stored values would become ambiguous.
--
-- Migrate to TIMESTAMPTZ (timestamp with time zone), which stores an absolute
-- UTC moment and is unambiguous regardless of server or client timezone config.
--
-- Existing rows are assumed to have been written in Asia/Kolkata (the original
-- APP_ZONE), so we reinterpret them at that offset before converting to UTC.

ALTER TABLE users
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'Asia/Kolkata';