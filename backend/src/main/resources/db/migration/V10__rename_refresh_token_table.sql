-- V10__rename_refresh_token_table.sql
-- The RefreshToken entity maps to "refresh_tokens" (plural) but V1 created
-- the table as "refresh_token" (singular). Under validate this mismatch causes
-- startup failure. Rename the table to match the entity annotation.
ALTER TABLE IF EXISTS refresh_token RENAME TO refresh_tokens;
