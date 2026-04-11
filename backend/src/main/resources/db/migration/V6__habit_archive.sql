-- V6__habit_archive.sql
-- Adds archiving support to habits.
-- Archived habits are hidden from the active list and home screen
-- but all history, streaks and notes are permanently preserved.
-- Users can unarchive at any time to restart the habit.

ALTER TABLE habits ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_habit_archived
    ON habits (user_id, archived);