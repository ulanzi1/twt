-- Story 10.22 — Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
-- Hand-authored. ⛔ NOT generated: the drizzle-kit snapshots stop at 0020, and regenerating an applied
-- migration is the 42P07 footgun (memory: project_live_db_test_gotchas).
--
-- ── THE INSTRUMENT LANDED FIRST ────────────────────────────────────────────────────────────────────
-- §8.8 was a RESERVED number whose closure §8.6's *Recorded gap* clause said "requires its own
-- amendment". That amendment is `2026-08-15-121`, and it is the ONLY durable copy of the §8.8 text
-- (`docs/legal/` is gitignored). This table implements it; it does not define it.
--
-- ── THIS IS A RECORD, NOT A SECOND MODERATION WRITE PATH (§8.8; Q4B) ──────────────────────────────
-- An allowed appeal DIRECTS that the act be undone; it never undoes it. Nothing in this table moves
-- the moderation overlay: `members.state` is untouched, `member_moderation_actions` is untouched, and
-- the two `member.moderation.appeal-*` events deliberately omit `overlayShape`. Restoration from
-- termination remains an act of the Trustee Panel through the ordinary path, gated on the
-- Panel-exclusive `member.restore_terminated`.
--
-- ⛔ NOT Epic 6's claim appeal. Part 9 is claim-scoped and Part 8 does not reference it (§8.8 says so
-- expressly). No shared table, no shared id, no shared route. `appeal_id` here is a
-- `MemberModerationAppealId`, NOT the `AppealId` bound to `claim_appeals.appeal_id`.
--
-- ── KEYED TO THE ACT, NOT THE MEMBER (§8.8; Q3C / D4) ─────────────────────────────────────────────
-- Suspension and termination are DISTINCT acts under §8.4a — "not two intensities of one act" — each
-- with its own record and each separately appealable. Keying uniqueness to the member would make a
-- later termination unappealable because an earlier suspension had been appealed.
--
-- ── ONE OPEN AT A TIME, AND THE RIGHT IS NOT EXHAUSTED (§8.8; Q3D option (a)) ─────────────────────
-- The uniqueness index is PARTIAL — `WHERE status = 'open'`. Once an appeal is decided, a further
-- appeal against the SAME act may be filed, and §8.8 does not exhaust the right after any number of
-- determinations. ⛔ Do NOT "tighten" this to a plain UNIQUE constraint to match Part 9's
-- one-journey-per-claim-EVER language: §8.8 is deliberately narrower, and Part 9 does not govern here.
-- ⚠ A three-tier ladder with a finality cap WAS raised against this question and is NOT RATIFIED
-- (`2026-08-15-121` clause 8) — partly because it conflicted with Trust Deed Clauses 18(a) and 19(c).
-- The guard is a read; THIS INDEX is the truth, and a guard-bypass race hits 23505.
--
-- ── PII discipline (R1) ───────────────────────────────────────────────────────────────────────────
--   · grounds_ciphertext           → Tier-1. MEMBER-authored free text. NEVER in an event payload,
--     an audit entry, or a log line — `events_log.payload` is plaintext JSONB.
--   · reasoned_outcome_ciphertext  → Tier-1. ADJUDICATOR-authored prose. Same posture.
--   · filed_via / status / outcome → NON-PII bounded vocabulary. Safe in audit context.
--   · decided_by_display           → controlled STAFF data, snapshotted at decision time so a later
--     rename cannot rewrite history ([[project_admin_display_name_attribution]]). NEVER email-derived.
--
-- ── GRANT POSTURE: append-only for the filing, single-decision for the outcome (AC4) ──────────────
-- SELECT + INSERT table-wide; UPDATE granted COLUMN-BY-COLUMN and nowhere else, so a recorded appeal's
-- filing (its member, its act, its grounds, its intake surface, its instant) is structurally immutable.
-- Postgres tracks column privileges BY ATTRIBUTE — a column not named below cannot be updated at all.
-- The decision columns are writable ONCE in practice: the
-- `member_moderation_appeals_decision_coherence_check` makes a decided row's fields mutually
-- required, and the app-layer write is guarded on `status = 'open'`.
-- ⚠ `grounds_ciphertext` is granted UPDATE for exactly ONE reason — the DPDPA-RTBF scrub (AC9), the
-- migration-0092 / 0099 discipline applied at birth. It is not a correction path.

CREATE TABLE "member_moderation_appeals" (
	"appeal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- The moderation act under appeal. §8.8: "identified by its record under §8.6".
	"moderation_action_id" uuid NOT NULL,
	-- The member's own grounds of appeal — MEMBER-authored. Tier-1.
	"grounds_ciphertext" text NOT NULL,
	-- Which of the two ruled intake surfaces produced this record (Q7). 'portal' | 'helpline'.
	"filed_via" text NOT NULL,
	-- The originating helpdesk ticket. Required on the OFF-PORTAL arm only — see the CHECK below.
	"helpdesk_ticket_id" uuid,
	"filed_at" timestamp with time zone NOT NULL,
	-- 'open' | 'decided'. §8.8 states a single internal review; there is no third status.
	"status" text NOT NULL,
	-- 'upheld' | 'allowed', NULL until decided. ⛔ There is NO third "varied" outcome: a lesser
	-- sanction is a FRESH moderation act with its own §8.6 record and its own right of appeal (Q4A).
	"outcome" text,
	-- The reasoned outcome §8.8 requires — ADJUDICATOR-authored. Tier-1. NULL until decided.
	"reasoned_outcome_ciphertext" text,
	"decided_by_actor_id" uuid,
	"decided_by_display" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_action_id_fk" FOREIGN KEY ("moderation_action_id") REFERENCES "public"."member_moderation_actions"("moderation_action_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_ticket_id_fk" FOREIGN KEY ("helpdesk_ticket_id") REFERENCES "public"."helpdesk_tickets"("ticket_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_filed_via_check" CHECK ("filed_via" IN ('portal', 'helpline'));--> statement-breakpoint
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_status_check" CHECK ("status" IN ('open', 'decided'));--> statement-breakpoint
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_outcome_check" CHECK ("outcome" IS NULL OR "outcome" IN ('upheld', 'allowed'));--> statement-breakpoint

-- The off-portal arm rides the helpdesk substrate as its intake artifact (Q7, and the 10.21
-- corrections precedent). A 'helpline' filing with no ticket would be a filing outside the ruled
-- process. ⛔ The IN-PORTAL arm is deliberately relaxed: the member's own session IS the artifact
-- there, and forcing a synthetic ticket would put a member-authored appeal on an operator queue.
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_helpline_needs_ticket_check" CHECK (
	"filed_via" <> 'helpline' OR "helpdesk_ticket_id" IS NOT NULL
);--> statement-breakpoint

-- A decided appeal carries ALL FIVE decision fields or none of them. §8.8 requires a reasoned outcome
-- and this is where "reasoned" stops being advisory: a decided row without prose cannot exist. The
-- attribution snapshot is required by the same constraint so an outcome can never be unattributable.
ALTER TABLE "member_moderation_appeals" ADD CONSTRAINT "member_moderation_appeals_decision_coherence_check" CHECK (
	(
		"status" = 'open'
		AND "outcome" IS NULL
		AND "reasoned_outcome_ciphertext" IS NULL
		AND "decided_by_actor_id" IS NULL
		AND "decided_by_display" IS NULL
		AND "decided_at" IS NULL
	) OR (
		"status" = 'decided'
		AND "outcome" IS NOT NULL
		AND "reasoned_outcome_ciphertext" IS NOT NULL
		AND "decided_by_actor_id" IS NOT NULL
		AND "decided_by_display" IS NOT NULL
		AND "decided_at" IS NOT NULL
	)
);--> statement-breakpoint

GRANT SELECT, INSERT ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
-- ⛔ NO table-wide UPDATE. Column-by-column only — the filing is immutable by attribute privilege.
GRANT UPDATE ("status") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("outcome") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("reasoned_outcome_ciphertext") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("decided_by_actor_id") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("decided_by_display") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint
-- Granted for the DPDPA-RTBF scrub ONLY (AC9). ⛔ Not a correction path for the member's grounds.
GRANT UPDATE ("grounds_ciphertext") ON "member_moderation_appeals" TO twt_app;--> statement-breakpoint

ALTER TABLE "member_moderation_appeals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_moderation_appeals" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- ⛔ THREE policies, never one `FOR ALL`. A `FOR ALL` policy carries a DELETE leg, and a recorded
-- appeal is immutable — the `member-moderation-grounds-rls.ts` posture, not 0104's.
CREATE POLICY "member_moderation_appeals_tenant_isolation_select" ON "member_moderation_appeals" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_moderation_appeals_tenant_isolation_insert" ON "member_moderation_appeals" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- The decision write (§8.8's reasoned outcome) and the DPDPA-RTBF scrub. Tenant-scoped on BOTH legs;
-- the column-level GRANTs above are what keep this from being a general edit capability.
CREATE POLICY "member_moderation_appeals_tenant_isolation_update" ON "member_moderation_appeals" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

-- ⭐ THE ONE-OPEN-PER-ACT RULE. PARTIAL by design (§8.8; Q3D option (a)): re-filing after a
-- determination is intentional and uncapped. The app-layer guard is a read; this index is the truth.
CREATE UNIQUE INDEX "member_moderation_appeals_one_open_per_action" ON "member_moderation_appeals" ("moderation_action_id") WHERE status = 'open';--> statement-breakpoint

CREATE INDEX "member_moderation_appeals_member_id_idx" ON "member_moderation_appeals" ("member_id");--> statement-breakpoint
CREATE INDEX "member_moderation_appeals_pariwar_id_idx" ON "member_moderation_appeals" ("pariwar_id");--> statement-breakpoint
-- The adjudication LIST read (AC5): open appeals within the caller's scope, oldest first. Without a
-- list the Panel cannot FIND a filed appeal, and a record nobody can find reproduces the
-- helpdesk-is-not-a-queue defect this story exists to avoid (D6).
CREATE INDEX "member_moderation_appeals_pariwar_status_filed_idx" ON "member_moderation_appeals" ("pariwar_id", "status", "filed_at");--> statement-breakpoint
CREATE INDEX "member_moderation_appeals_action_id_idx" ON "member_moderation_appeals" ("moderation_action_id");
