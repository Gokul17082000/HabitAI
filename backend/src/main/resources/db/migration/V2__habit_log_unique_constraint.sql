-- V2__habit_log_unique_constraint.sql
-- SUGGESTION FIX: Add a unique constraint on (habit_id, user_id, date) to
-- prevent duplicate log entries under concurrent requests (e.g. rapid double-taps).
--
-- The service layer uses findByHabitIdAndUserIdAndDate + conditional save, but
-- without a DB-level constraint a race window exists between the SELECT and INSERT.
-- This makes the guarantee transactional at the database level.
--
-- The DO block deduplicates any existing rows before adding the constraint,
-- keeping the last inserted row (highest id) per (habit_id, user_id, date) group.

DO $$
BEGIN
    -- Remove any pre-existing duplicates, keeping the row with the highest id
    DELETE FROM habit_log a
    USING habit_log b
    WHERE a.habit_id = b.habit_id
      AND a.user_id  = b.user_id
      AND a.date     = b.date
      AND a.id < b.id;
END $$;

ALTER TABLE habit_log
    ADD CONSTRAINT uq_habit_log_habit_user_date
    UNIQUE (habit_id, user_id, date);