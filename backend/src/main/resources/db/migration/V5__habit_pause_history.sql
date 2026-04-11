-- V5__habit_pause_history.sql
-- Adds an immutable audit log of every pause window applied to a habit.
--
-- Problem this solves:
--   Previously, pause state was tracked only on the habits table (paused + paused_until).
--   When a pause auto-expires (scheduler sets paused=false, paused_until=null), all
--   historical knowledge of that pause window is lost. This caused the calendar and
--   month summary to retroactively show those days as MISSED instead of correctly
--   treating them as paused — inaccurate and demoralising for the user.
--
-- Solution:
--   Every call to pauseHabit() writes one row here. The row is never deleted or
--   updated — it is an immutable record of the window [paused_from, paused_until].
--   isHabitPausedOnDate() now queries this table instead of reading habits.paused,
--   so history stays accurate even after the pause expires.
--
-- The habits.paused and habits.paused_until columns are kept as-is — they continue
-- to drive the active pause check (scheduler auto-resume, log guard, home screen
-- filter). This table is purely for historical lookups.

CREATE TABLE IF NOT EXISTS habit_pause_history (
    id           BIGSERIAL PRIMARY KEY,
    habit_id     BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    paused_from  DATE   NOT NULL,
    paused_until DATE   NOT NULL,
    CONSTRAINT chk_pause_window CHECK (paused_until >= paused_from)
);

-- Index for the primary query pattern:
--   WHERE habit_id = ? AND paused_from <= ? AND paused_until >= ?
-- This covers isHabitPausedOnDate() lookups efficiently.
CREATE INDEX IF NOT EXISTS idx_pause_history_habit_dates
    ON habit_pause_history (habit_id, paused_from, paused_until);