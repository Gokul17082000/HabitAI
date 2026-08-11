-- V12__hash_existing_refresh_tokens.sql
-- Refresh tokens are now stored as SHA-256 hashes instead of raw values
-- (see AuthService.hashToken). Any rows written before this change hold raw
-- tokens that (a) can no longer be matched on refresh and (b) are exactly the
-- at-rest exposure we're eliminating. Delete them — affected users simply log
-- in again, which issues a freshly hashed token.
DELETE FROM refresh_tokens;
