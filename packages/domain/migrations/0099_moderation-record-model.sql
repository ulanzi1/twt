-- Migration 0099 — the MODERATION RECORD MODEL (Story 10.20, Task 4; WS-A / WS-B / WS-E).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0098): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY this story's DDL. No snapshot file is emitted.
--
-- ── What this migration is for ──────────────────────────────────────────────────────────────────
-- Today a moderation action carries ONE structured `reason_code` and ONE free-text
-- `rationale_ciphertext`. That single field is asked to answer three different questions at once —
-- WHAT HAPPENED, WHY THIS SANCTION, and HOW THE CASE CAN BE RECONSTRUCTED — and it answers none of
-- them testably. This migration splits the record into its three separable parts, and adds the
-- structural half of the safeguards Niyamavali §8.5/§8.6 now require (Decision `2026-08-12-099`).
--
-- ── ⭐ PREMISE #4 — WHICH GRANTS SURVIVE, AND WHICH DO NOT. READ BEFORE EDITING ──────────────────
-- Migration 0092 granted `UPDATE ("rationale_ciphertext")` — a Postgres COLUMN-LEVEL privilege —
-- so the DPDPA-RTBF scrub could erase that Tier-1 field on an otherwise append-only table.
--
--   · THE RENAME NEEDS NO RE-GRANT. Postgres tracks column privileges BY ATTRIBUTE, not by name,
--     so 0092's `GRANT UPDATE ("rationale_ciphertext")` and its tenant-scoped RLS UPDATE policy
--     follow the column through `RENAME COLUMN` automatically and keep working on
--     `decision_note_ciphertext`. ⛔ Do NOT "helpfully" re-grant it — it is already there.
--
--   · EVERY NEW TIER-1 COLUMN STARTS WITH NO UPDATE GRANT, AND IS THEREFORE UN-ERASABLE UNTIL
--     GRANTED. A column-level GRANT does NOT extend to columns added later. Every Tier-1 column
--     this migration adds is therefore granted BY NAME below. Shipping without that re-creates
--     0092's own defect on three new columns, and the failure is SILENT: the scrub compiles, runs,
--     and raises a permission error only against a real database — or, worse, is simply never
--     written, which is exactly how 0091 shipped.
--
-- ── ⭐ THE REPO'S FIRST `NOT VALID`, and why it is not a weakened constraint ─────────────────────
-- `member_moderation_actions_escalation_iff_terminate` is added `NOT VALID`. `grep -l "NOT VALID"
-- packages/domain/migrations/` returned nothing before this file; the precedent is deliberate.
--
-- 0091's identically-shaped `..._rejoin_iff_terminate` CHECK was created INSIDE `CREATE TABLE`, on
-- an EMPTY table. This one is an `ALTER TABLE` against a POPULATED one: Stories 10.10 and 10.19
-- have been writing `action = 'terminate'` rows since they shipped, and every one of them carries
-- NULL in both new escalation columns. A bare `ADD CONSTRAINT` therefore scans those rows and dies
-- with `23514` AT MIGRATE TIME.
--
-- A sentinel backfill is NOT available and must not be attempted: `encSentinel` is a per-Pariwar
-- Tier-1 ENVELOPE ENCRYPT, a `.sql` migration cannot make a KMS round-trip, and writing a plaintext
-- literal into a ciphertext column would poison `decryptSafe` for those rows forever.
--
-- `NOT VALID` skips the scan of pre-existing rows while enforcing EVERY INSERT AND UPDATE from this
-- moment on — and because this table is append-only, that is FULL FORWARD ENFORCEMENT. The legacy
-- rows are grandfathered UNVALIDATED, and `VALIDATE CONSTRAINT` is recorded as an OWED obligation
-- in `deferred-work.md`; it is dischargeable only once those legacy `terminate` rows are
-- dispositioned by a governance act, which is not this story's.
-- ⛔ Do NOT blanket-apply `NOT VALID` to the `evidence_refs` constraints below because this one
-- needs it — see the contrast note there.
--
-- ── ⭐ AC4's per-entry evidence shape rides an IMMUTABLE FUNCTION, and it has to ─────────────────
-- Evidence is "references only, never free text". Array-ness and a cardinality cap do NOT deliver
-- that: `[{"kind":"anything","ref":"<a full sentence of prose>"}]` satisfies both, and is precisely
-- the free-text evidence the rule exists to make impossible. The PER-ENTRY SHAPE is the half that
-- closes it — and it cannot be an inline CHECK. Both obvious spellings are hard errors, re-verified
-- against `twt-test-pg` (PG 16.14) while authoring this migration:
--     CHECK ((SELECT bool_and(…) FROM jsonb_array_elements(v) e))
--       → ERROR: cannot use subquery in check constraint
--     CHECK (jsonb_array_elements(v) ? 'kind')
--       → ERROR: set-returning functions are not allowed in check constraints
-- The set-returning scan is legal inside a function body, so the shape check calls one. Declaring
-- functions in a migration is precedented (0001, 0035, 0036 and seven others).
--
-- ── ⚠ FINDING while driving this live: a non-array raised 22023, NOT a check violation ──────────
-- The first cut spelled the cap as `CHECK (jsonb_array_length(evidence_refs) <= 10)`. Inserting a
-- JSON OBJECT (not an array) then raised `ERROR: cannot get array length of a non-array` — SQLSTATE
-- **22023**, a runtime error, NOT the `23514` a constraint violation must produce. Postgres does
-- not guarantee that `AND` short-circuits, so the sibling `jsonb_typeof(...) = 'array'` CHECK
-- cannot be relied on to run first and spare it.
--   ⇒ the cap CHECK is GUARDED (`jsonb_typeof(...) <> 'array' OR …`) so it returns true for a
--     non-array and lets the array CHECK name the violation, and the FUNCTION uses `CASE` (which
--     DOES guarantee evaluation order) rather than a bare `AND` chain.
-- All nine rejection cases now return a clean 23514. ⛔ Do not "simplify" either guard away.
--
-- ⚠ The function deliberately does NOT re-implement array-ness or the cap (AC4): those stay INLINE
-- and SEPARATE so a violation names WHICH rule it broke. The function returns true for a non-array
-- because that case is the array CHECK's to report, not its own.
--
-- ── The three ruling-dependent columns (Decision `2026-08-12-099`) ──────────────────────────────
-- Two were ruled INTO existence and a third is created by the ruling's own addition:
--   · `r7a_restorations_used_snapshot` — Q5(a). NULLABLE, and NULL means UNKNOWN, never 0.
--   · `dwell_policy_version`           — Q4.4 (registry, not a code constant). The version pin that
--     lets a historical decision be read back against the dwell policy that governed it.
--   · `immediate_termination_reason_ciphertext` — Q4.1. The Panel preserved an immediate-
--     termination exception conditioned on the actor RECORDING THE REASON; a recorded reason with
--     no column is not recorded. It is Tier-1 free text, so UNLIKE the other two it takes a
--     `GRANT UPDATE` by name and is scrubbed under RTBF. It is a SEPARATE field from both
--     escalation parts: those answer WHY TERMINATION, this answers WHY NOW.
-- ⚠ The first two are NOT Tier-1 — a bounded integer and a version string are non-PII, so they take
-- no GRANT and are not scrubbed. The posture on this table is otherwise the opposite, which is why
-- that is said out loud here.
--
-- The roles (twt_app / twt_service) already exist from migration 0002 — no CREATE ROLE.

-- ── (0) The AC4 per-entry evidence-shape validator, declared BEFORE any DDL that calls it ───────
CREATE OR REPLACE FUNCTION moderation_evidence_refs_valid(v jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN jsonb_typeof(v) <> 'array' THEN true  -- the array CHECK names that violation, not this one
    ELSE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v) e
       WHERE jsonb_typeof(e) <> 'object'
          OR (SELECT count(*) FROM jsonb_object_keys(e)) <> 2
          OR NOT (e ? 'kind' AND e ? 'ref')
          OR e->>'kind' NOT IN ('complaint','investigation','helpdesk-ticket','document','external-order')
          OR e->>'ref' !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$' )
  END;
$$;--> statement-breakpoint

-- ── (1) The rename. Privileges and the 0092 RLS UPDATE policy follow the attribute — no re-grant.
ALTER TABLE "member_moderation_actions" RENAME COLUMN "rationale_ciphertext" TO "decision_note_ciphertext";--> statement-breakpoint

-- ── (2) The two-part escalation justification. TWO columns, never one: the two parts must be
--        separately answerable, and one column lets a UI concatenate them and satisfy a presence
--        check with a single paragraph. The record's SHAPE is the enforcement.
ALTER TABLE "member_moderation_actions" ADD COLUMN "escalation_inadequacy_ciphertext" text;--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD COLUMN "escalation_proportionality_ciphertext" text;--> statement-breakpoint

-- ── (3) The immediate-termination exception reason (Q4.1). Tier-1.
ALTER TABLE "member_moderation_actions" ADD COLUMN "immediate_termination_reason_ciphertext" text;--> statement-breakpoint

-- ── (4) The two non-PII ruling-dependent columns (Q5(a) snapshot, Q4.4 version pin).
ALTER TABLE "member_moderation_actions" ADD COLUMN "r7a_restorations_used_snapshot" integer;--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD COLUMN "dwell_policy_version" text;--> statement-breakpoint

-- ── (5) Evidence references — added VALID, and the CONTRAST WITH (6) IS THE LESSON. Every
--        pre-existing row acquires the '[]' default, which satisfies all three checks, so the
--        validating scan passes. A constraint added NOT VALID without cause leaves a permanent
--        un-validated gap for nothing.
ALTER TABLE "member_moderation_actions" ADD COLUMN "evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_evidence_refs_is_array" CHECK (jsonb_typeof("member_moderation_actions"."evidence_refs") = 'array');--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_evidence_refs_cap" CHECK (jsonb_typeof("member_moderation_actions"."evidence_refs") <> 'array' OR jsonb_array_length("member_moderation_actions"."evidence_refs") <= 10);--> statement-breakpoint
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_evidence_refs_shape" CHECK (moderation_evidence_refs_valid("member_moderation_actions"."evidence_refs"));--> statement-breakpoint

-- ── (6) The escalation-presence CHECK — NOT VALID, and the qualifier is load-bearing (see header).
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_escalation_iff_terminate" CHECK (("member_moderation_actions"."action" = 'terminate') = ("member_moderation_actions"."escalation_inadequacy_ciphertext" IS NOT NULL AND "member_moderation_actions"."escalation_proportionality_ciphertext" IS NOT NULL)) NOT VALID;--> statement-breakpoint

-- ── (7) Premise #4: GRANT UPDATE on EVERY new Tier-1 column, BY NAME. Without these three lines the
--        columns above ship structurally UN-ERASABLE under DPDPA RTBF. The two non-PII columns
--        (r7a_restorations_used_snapshot, dwell_policy_version) deliberately get NO grant.
--        NOT granted to twt_service: the pre-scope signup rejoin guard reads this table and has no
--        business writing to it; RTBF runs under a normal member scope tx.
GRANT UPDATE ("escalation_inadequacy_ciphertext") ON "member_moderation_actions" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("escalation_proportionality_ciphertext") ON "member_moderation_actions" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("immediate_termination_reason_ciphertext") ON "member_moderation_actions" TO twt_app;--> statement-breakpoint

-- ── (8) `member_moderation_grounds` (WS-E) — append-only supporting grounds attached to an action.
--
-- ⭐ `member_id` is DENORMALIZED here deliberately, and the RTBF is why. Every scrub in
-- `anonymize.ts` is `.where(eq(<table>.memberId, memberId))` — an erasure request carries a member
-- id and nothing else. A table reachable only through `moderation_action_id` would make "every
-- ground note for this member" unexpressible in the shape every other scrub uses, forcing a
-- correlated subquery inside an UPDATE or a two-step read-then-write, in the one code path where a
-- miss leaves PII behind an erasure request. This is the SAME denormalization `pariwar_id` already
-- takes for RLS, for the same reason: the row must be findable by the axis its guard queries on.
-- It is not a second source of truth — it is written in the action's own transaction, from the
-- action's own member_id, and both rows are append-only.
--
-- ⭐ EXACTLY ONE PRIMARY is the DB's job, via the partial unique index below; AT LEAST ONE is the
-- writer's. Together with the SELECT/INSERT-only grant this makes the primary ground structurally
-- IMMUTABLE: a second `is_primary` row raises 23505, and clearing the existing flag would be an
-- UPDATE no grant permits. Supersede is therefore a SUPPORTING-ground operation, by construction.
CREATE TABLE "member_moderation_grounds" (
	"ground_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moderation_action_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"code" "moderation_reason_code" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"note_ciphertext" text,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supersedes_ground_id" uuid,
	"added_by" uuid NOT NULL,
	"added_by_display" text NOT NULL,
	"added_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_moderation_grounds_evidence_refs_is_array" CHECK (jsonb_typeof("member_moderation_grounds"."evidence_refs") = 'array'),
	CONSTRAINT "member_moderation_grounds_evidence_refs_cap" CHECK (jsonb_typeof("member_moderation_grounds"."evidence_refs") <> 'array' OR jsonb_array_length("member_moderation_grounds"."evidence_refs") <= 10),
	CONSTRAINT "member_moderation_grounds_evidence_refs_shape" CHECK (moderation_evidence_refs_valid("member_moderation_grounds"."evidence_refs")),
	CONSTRAINT "member_moderation_grounds_primary_never_supersedes" CHECK (NOT ("is_primary" AND "supersedes_ground_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "member_moderation_grounds" ADD CONSTRAINT "member_moderation_grounds_action_id_fk" FOREIGN KEY ("moderation_action_id") REFERENCES "public"."member_moderation_actions"("moderation_action_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_moderation_grounds" ADD CONSTRAINT "member_moderation_grounds_member_id_members_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_moderation_grounds" ADD CONSTRAINT "member_moderation_grounds_supersedes_fk" FOREIGN KEY ("supersedes_ground_id") REFERENCES "public"."member_moderation_grounds"("ground_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Table privileges. APPEND-ONLY, exactly as 0091 set for the action itself. The ONE column-level
-- UPDATE exists SOLELY for the DPDPA-RTBF note scrub — the 0092 pattern, applied at birth this time
-- instead of as a follow-up. ⛔ NO twt_service grant: the pre-scope signup rejoin guard reads
-- `action` and `rejoin_permitted_at` from the ACTIONS table only and has no business here.
GRANT SELECT, INSERT ON "member_moderation_grounds" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("note_ciphertext") ON "member_moderation_grounds" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_moderation_grounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_moderation_grounds" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- AT MOST ONE primary ground per action — the structural half of AC9. The typed 409 in the route is
-- the INTERFACE; this index is the BACKSTOP. A 23505 must never leak to the caller as a 500.
CREATE UNIQUE INDEX "member_moderation_grounds_one_primary_idx" ON "member_moderation_grounds" USING btree ("moderation_action_id") WHERE "is_primary";--> statement-breakpoint
-- The composite the reads ride: per-action fold (console) and per-member scrub/history.
CREATE INDEX "member_moderation_grounds_action_added_idx" ON "member_moderation_grounds" USING btree ("moderation_action_id","added_at");--> statement-breakpoint
CREATE INDEX "member_moderation_grounds_pariwar_member_idx" ON "member_moderation_grounds" USING btree ("pariwar_id","member_id");--> statement-breakpoint

-- Per-tenant RLS. SELECT + INSERT mirror the append-only grant; the UPDATE leg is tenant-scoped on
-- BOTH sides so an RTBF in one Pariwar can never reach another's rows (the 0092 posture).
CREATE POLICY "member_moderation_grounds_tenant_isolation_select" ON "member_moderation_grounds" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_moderation_grounds_tenant_isolation_insert" ON "member_moderation_grounds" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_moderation_grounds_tenant_isolation_update" ON "member_moderation_grounds" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);
