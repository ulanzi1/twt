-- Migration 0022 — member_pariwar_selects (single-use multi-Pariwar scope-select
-- registry; Story 3.2 code-review PR-Patch-10 / D3-Decision-2).
--
-- GLOBAL member-identity/auth carve-out (the sibling of member_signup_continuations):
-- enforces SINGLE-USE of the pariwar-select token so one OTP cannot be replayed to mint
-- multiple full sessions within the token TTL. Keyed by the token's jti (PK); the
-- /otp/select-pariwar handler burns consumed_at atomically (409 on replay).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` — drizzle-kit skips applied
-- migrations by journal `when`, not SQL hash. A regenerate silently drops the hand-
-- supplements (GRANT, FORCE, POLICY) and can raise 42P07. Hand-authored to mirror the
-- 0019/0021 member-auth carve-out pattern.

CREATE TABLE "member_pariwar_selects" (
    "jti"                uuid PRIMARY KEY NOT NULL,
    "mobile_blind_index" text NOT NULL,
    "expires_at"         timestamp with time zone NOT NULL,
    "consumed_at"        timestamp with time zone,
    "created_at"         timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_pariwar_selects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- ── Hand-supplements ──────────────────────────────────────────────────────────────
-- GRANT + FORCE + POLICY mirror migration 0019 (member-auth carve-out family).
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_pariwar_selects" TO twt_app;
--> statement-breakpoint
CREATE POLICY "member_pariwar_selects_global_access" ON "member_pariwar_selects"
    AS PERMISSIVE FOR ALL TO "twt_app" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE "member_pariwar_selects" FORCE ROW LEVEL SECURITY;
