-- V7__move_indexes_to_hibernate.sql
DROP INDEX IF EXISTS idx_habit_log_habit_user;
DROP INDEX IF EXISTS idx_habit_log_user_date;
DROP INDEX IF EXISTS idx_habit_user;
DROP INDEX IF EXISTS idx_habit_time;
DROP INDEX IF EXISTS idx_refresh_token_user;
DROP INDEX IF EXISTS idx_refresh_token_value;