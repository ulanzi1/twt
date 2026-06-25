-- Migration 0020 — add member_refresh_tokens.pariwar_id (Story 3.2, Task 3). The
-- session's Pariwar scope, self-describing so a rotated refresh token reissues the
-- access token for the SAME scope (correct for multi-Pariwar members, R2). Additive
-- ADD COLUMN; the table is brand-new (0019) and empty, so NOT NULL needs no default.
-- ⚠ DO NOT REGENERATE (drizzle skips applied migrations by journal `when`).
ALTER TABLE "member_refresh_tokens" ADD COLUMN "pariwar_id" uuid NOT NULL;