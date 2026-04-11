-- V3__email_case_insensitive_index.sql
-- SUGGESTION FIX: The existing uk_user_email constraint is case-sensitive on
-- PostgreSQL's default collation. "User@Gmail.com" and "user@gmail.com" would
-- create two separate accounts even though they represent the same address.
--
-- We add a unique index on lower(email) as the canonical enforcement point.
-- The application layer also normalises to lowercase on register/login, so
-- this is a belt-and-suspenders guarantee at the DB level.
--
-- The original uk_user_email constraint is dropped first since it's now
-- superseded by this case-insensitive version.

ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_user_email;

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_email_ci ON users (lower(email));