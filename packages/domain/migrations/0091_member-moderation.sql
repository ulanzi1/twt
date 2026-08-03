-- Migration 0091 — member_moderation_actions (Story 10.10, Task 2). The member-moderation `[SURFACE]`.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0090): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── ⚠ NO `ALTER TYPE member_lifecycle_state` — the whole story turns on this (Decision 1) ────────
-- The naive reading of `epics.md:3548` ("member state machine transitions accordingly") is to add
-- `suspended` + `terminated` as `member_lifecycle_state` labels. That reading is NOT implementable:
-- `restore` has no answer under the pure `(state, event) => state` reducer (it cannot know the
-- pre-suspension state, and reading a `restore_to` label from the payload violates the reducer's own
-- stated invariant), and because there is NO `never` guard over `MemberLifecycleState` anywhere, two
-- new labels would produce ZERO compile errors while silently mis-classifying five TERMINAL_STATES
-- Sets, the news audience filter, peer-mesh selection, every seeded niyamavali `member_state_in`
-- clause, and the renewal grace clock (whose grace clock would STALL for a suspended member).
--
-- Moderation is therefore a SECOND, orthogonal, event-derived state machine on the member's own
-- stream. This migration consequently contains:
--   · NO `ALTER TYPE member_lifecycle_state`
--   · NO state-writer trigger and NO `current_state` column (contrast 0084 helpdesk_tickets /
--     0078 alerts) — the moderation STATUS is derived by folding `member.moderation.*` events, and
--     `members.state` is written only by the existing Story 3.1 projector under its existing trigger
--   · NO change to `app.member_state_writer`, the `members` BEFORE UPDATE trigger, or the
--     `member-state-invariant` CI-gate allowlist
--
-- ── APPEND-ONLY (the member_addresses / member_postings posture) ─────────────────────────────────
-- A recorded moderation decision is immutable. `twt_app` gets SELECT + INSERT and deliberately NOT
-- UPDATE or DELETE — contrast `member_withdrawals`, which grants UPDATE for its `aadhaar_hmac`
-- backfill seam. There is no such seam here.
--
-- ── Why `twt_service` gets SELECT ───────────────────────────────────────────────────────────────
-- The FR-56 → FR-6 rejoin guard at signup runs PRE-scope on the BYPASSRLS service pool
-- (`member-auth.repo.ts` `resolveMembersByMobile`), before any `app.pariwar_id` exists — it must
-- read this table cross-tenant to tell a currently-terminated identity from a live duplicate. That
-- is exactly why `member_withdrawals` is read the same way today. `twt_service` gets SELECT ONLY:
-- no background job writes moderation decisions (the only writer is the admin request path on
-- `twt_app`), and the moderation-notice worker in apps/jobs reads its subject from the job payload.
--
-- ── The load-bearing CHECK ──────────────────────────────────────────────────────────────────────
--   · `member_moderation_actions_rejoin_iff_terminate` — AC7: `rejoin_permitted_at IS NOT NULL`
--     IFF `action = 'terminate'`. The STRUCTURAL half of the invariant (the domain sets NULL for
--     suspend/restore); it makes a suspension carrying a rejoin lock, or a termination missing one,
--     impossible on EVERY write path including a raw SQL one.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.

CREATE TYPE "public"."moderation_action" AS ENUM('suspend', 'terminate', 'restore');--> statement-breakpoint
CREATE TYPE "public"."moderation_reason_code" AS ENUM('r7-contribution-discipline', 'r14-forgery', 'r10a-parallel-org-office', 'concealment-confirmed', 'helpdesk-escalated-abuse', 'regulator-action', 'voluntary-pending-review', 'rule-clearance', 'trustee-discretion', 'moderation-error');--> statement-breakpoint
CREATE TABLE "member_moderation_actions" (
	"moderation_action_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"action" "moderation_action" NOT NULL,
	"reason_code" "moderation_reason_code" NOT NULL,
	"rationale_ciphertext" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_display" text NOT NULL,
	"rejoin_permitted_at" timestamp with time zone,
	"acted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_moderation_actions_rejoin_iff_terminate" CHECK (("member_moderation_actions"."action" = 'terminate') = ("member_moderation_actions"."rejoin_permitted_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges. APPEND-ONLY for the app role; SELECT-only for the pre-scope rejoin guard.
GRANT SELECT, INSERT ON "member_moderation_actions" TO twt_app;--> statement-breakpoint
GRANT SELECT ON "member_moderation_actions" TO twt_service;--> statement-breakpoint
-- (2) drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser owner).
ALTER TABLE "member_moderation_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_moderation_actions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The one composite BOTH reads ride: the per-member history and the Pariwar-wide moderated list.
CREATE INDEX "member_moderation_actions_pariwar_member_acted_idx" ON "member_moderation_actions" USING btree ("pariwar_id","member_id","acted_at");--> statement-breakpoint
-- (3) Per-tenant RLS policies. APPEND-ONLY: SELECT + INSERT only — no UPDATE/DELETE leg, matching
--     the GRANT above (the member_addresses / member_postings append-only-history precedent).
CREATE POLICY "member_moderation_actions_tenant_isolation_select" ON "member_moderation_actions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_moderation_actions_tenant_isolation_insert" ON "member_moderation_actions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
