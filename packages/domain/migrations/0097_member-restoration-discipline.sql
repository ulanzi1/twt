-- Migration 0097 — member_restoration_impositions (Story 10.23, Task 2). The restoration-discipline
-- lock-in instrument: the SECOND event-derived governance overlay on the member's own stream.
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0096): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── ⚠ NO `ALTER TYPE member_lifecycle_state` — this is an OVERLAY, not a lifecycle state (AC1) ───
-- `epics.md:3880` rejects a lifecycle edge for this instrument by name (D2-b rejected), and the
-- Story 10.10 precedent settles why the naive reading is not implementable: there is NO `never` guard
-- over `MemberLifecycleState` anywhere, so a new label produces ZERO compile errors while silently
-- mis-classifying five TERMINAL_STATES Sets, the news audience filter, peer-mesh selection, every
-- seeded niyamavali `member_state_in` clause, and the renewal grace clock.
--
-- This migration therefore contains:
--   · NO `ALTER TYPE member_lifecycle_state`
--   · NO state-writer trigger and NO `current_state` column (contrast 0084 helpdesk_tickets / 0078
--     alerts) — the restoration standing is DERIVED by folding `member.restoration_discipline.*`
--     events, and `members.state` is written only by the existing Story 3.1 projector
--   · NO change to `app.member_state_writer`, the `members` BEFORE UPDATE trigger, or the
--     `member-state-invariant` CI-gate allowlist (`scripts/member-state-invariant/check.ts:32,37`)
--   · NO new validity-cache trigger. Migration `0036`'s `member_validity_cache_invalidate()` already
--     fires `AFTER INSERT ON events_log WHEN (NEW.event_type LIKE 'member.%')` and deletes
--     `WHERE member_id = NEW.stream_id`. These events are `member.*` on the MEMBER's OWN stream, so
--     they are covered as-is — contrast Story 10.24's contribution events, which ride the ALERT
--     stream and needed `0093`'s sibling trigger. AC10(b) asserts this with a live-DB test rather
--     than assuming it.
--
-- ── APPEND-ONLY, ABSOLUTELY (the member_addresses / member_postings posture) ─────────────────────
-- `twt_app` gets SELECT + INSERT and deliberately NOT UPDATE or DELETE. Unlike
-- `member_moderation_actions` — which needed 0092 to add a COLUMN-scoped UPDATE so the DPDPA-RTBF
-- scrub could erase its Tier-1 `rationale_ciphertext` — this table has NO PII column at all (D5:
-- the imposition is automatic, so there is no rationale, no actor and no Tier-1 byte). There is
-- nothing here to scrub, so append-only needs no relaxation.
--
-- ── Why `twt_service` gets SELECT (and NOT INSERT) ──────────────────────────────────────────────
-- The apps/jobs imposition writer runs INSIDE a Pariwar scope transaction on `twt_app` (AC2: "the
-- writer runs in the caller's scope tx — it never opens its own", matching `moderateMember`), so it
-- does not need `twt_service` INSERT. `twt_service` gets SELECT only, for BYPASSRLS operational
-- reads. ⛔ Granting INSERT to `twt_service` would create a path by which a lock-in could be imposed
-- with NO tenant scope set — coverage removal outside RLS. Do not add it.
--
-- ── The load-bearing CHECKs ─────────────────────────────────────────────────────────────────────
--   · `..._lock_in_months_positive` — D3. `imposesRestorationObligation` returns TRUE for R7(A),
--     which ships `restoration.lock_in_months: 0`, so a trigger reading only that predicate would
--     impose a ZERO-LENGTH lock-in on every R7(A) member. This makes that unwritable on EVERY path,
--     including a raw SQL one.
--   · `..._expires_after_imposed`   — §3.1 prescribes a BOUNDED consequence. A row with
--     `expires_at <= imposed_at` is an already-expired imposition; a corrupted far-future one is
--     what a machine-imposed PERMANENT coverage removal looks like in this table. Both are refused.
--   · `..._concurrency_rule_known`  — review finding. `concurrency_rule` is registry data (AC5) with
--     only an app-layer Zod enum guarding it; this backstops it at the DB like the other two,
--     mirroring `RESTORATION_COMBINATION_RULES`. A future ratified rule needs this list widened in
--     the SAME migration that widens `combineLiveExpiries`'s exhaustive `switch`.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.

CREATE TABLE "member_restoration_impositions" (
	"restoration_imposition_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"clause_id" text NOT NULL,
	"clause_version_id" uuid NOT NULL,
	"policy_clause_version_id" uuid NOT NULL,
	"lock_in_months" integer NOT NULL,
	"concurrency_rule" text NOT NULL,
	"episode_key" text NOT NULL,
	"imposed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_restoration_impositions_lock_in_months_positive" CHECK ("member_restoration_impositions"."lock_in_months" > 0),
	CONSTRAINT "member_restoration_impositions_expires_after_imposed" CHECK ("member_restoration_impositions"."expires_at" > "member_restoration_impositions"."imposed_at"),
	CONSTRAINT "member_restoration_impositions_concurrency_rule_known" CHECK ("member_restoration_impositions"."concurrency_rule" IN ('max_over_live'))
);
--> statement-breakpoint
ALTER TABLE "member_restoration_impositions" ADD CONSTRAINT "member_restoration_impositions_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- (1) Table privileges. APPEND-ONLY for the app role; SELECT-only for operational service reads.
GRANT SELECT, INSERT ON "member_restoration_impositions" TO twt_app;--> statement-breakpoint
GRANT SELECT ON "member_restoration_impositions" TO twt_service;--> statement-breakpoint
-- (2) drizzle-kit-emitted: turn RLS on, then FORCE it (applies even to the non-superuser owner).
ALTER TABLE "member_restoration_impositions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_restoration_impositions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The one composite BOTH reads ride: the per-member history and the Pariwar-wide list.
CREATE INDEX "member_restoration_impositions_pariwar_member_imposed_idx" ON "member_restoration_impositions" USING btree ("pariwar_id","member_id","imposed_at");--> statement-breakpoint
-- (3) Per-tenant RLS policies. APPEND-ONLY: SELECT + INSERT only — no UPDATE/DELETE leg, matching
--     the GRANT above (the member_addresses / member_postings append-only-history precedent).
CREATE POLICY "member_restoration_impositions_tenant_isolation_select" ON "member_restoration_impositions" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_restoration_impositions_tenant_isolation_insert" ON "member_restoration_impositions" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
