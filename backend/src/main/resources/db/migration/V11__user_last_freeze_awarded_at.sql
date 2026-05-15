-- V11__user_last_freeze_awarded_at.sql
-- Tracks the last date a streak freeze was awarded so the daily scheduler
-- awards at most one freeze per 7-day window instead of every day the streak
-- satisfies the 7-consecutive-days check.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_freeze_awarded_at DATE;
