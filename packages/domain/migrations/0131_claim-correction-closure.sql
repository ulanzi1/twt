-- Migration 0131 — the CLOSURE record of a correction return (Story 6.19c, Task 1; AC6, AC14, AC17; the shared spec's
-- D1, D17, D18; `2026-10-01-273` §3(a)/(b)/(c)/(d), §5, §7, §10; `2026-10-01-274` 1a–1d, 2).
--
-- ⭐ ONE LIVE ROW PER RETURN (`-273` §3b) — keyed on `return_decision_id`, ⛔ never per claim: a second return starts
-- afresh, and a row left by an EARLIER return holds ⛔ nothing on a later one (S-T9). The partial UNIQUE excludes
-- `lapsed`, so a request that lapsed (`-273` §3d) ⛔ never blocks the District Admin asking again at day 90 of a later
-- family run.
-- ⭐ TWO ORIGINS:
--   · `declined_closure` — the District Admin REQUESTED a closure (key (2)) against a family run
--     (`request_family_run_id`); the Pariwar Admin (key (3)) APPROVED it (→ `closed`, the D1 chain) or DECLINED it
--     with a REQUIRED note (→ `escalated` to the Super Admin, `-232` H);
--   · `staff_case` — a staff-must-act return still unresolved at day 90 of its staff run, escalated by the day-90 JOB
--     as a RECORD (`-273` §3a) — ⛔ no request, ⛔ no Pariwar Admin decision.
-- ⭐ WHILE `escalated` / `under_review` the claim is HELD (`-273` §3b, §4): only the Super Admin decides it (key (4) —
-- `closed` / `refused` / `approved`, each with a REQUIRED closure-scoped reason and a REQUIRED note, `-273` §10).
-- ⛔⛔ A STAFF-ORIGIN ROW IS NEVER CLOSABLE (`-274` 1a, Trustee-ratified; `-273` §3c) — `..._staff_case_never_closed`
-- is the DB backstop under the writer's `409 closure.staff_case_origin`, keyed on the ORIGIN, ⛔ never the mark.
-- ⭐ THE CLOSURE NOTICE is an OUTBOX (`-273` §5): the approving transaction records it as DUE (`closure_notice_due_at`,
-- the closed run's `closure_notice_run_id` as provenance, the recipients' person keys); a jobs sweep sends it and
-- marks it done. ⭐ THE CLOSURE LETTER (`-274` 2): the people owed one are recorded at the closure
-- (`closure_letter_person_keys` — reached, number known dead); the letters themselves are 0134's.
-- ⭐ THE HIGHLIGHT (`-273` §7): an approval records whether the name check was waived and the check's RECORDED state at
-- approval (`approval_name_check_state`) — ⛔ never a name comparison.
-- PII: every note is Tier-1 ciphertext (encrypted in the API handler, the 6.19b mark-note precedent), ⛔ never echoed
-- to a member. ⛔ No RTBF path reaches them (invariant 9 — recorded in `deferred-work.md`, ⛔ not fixed).
-- ⚠ Every compound CHECK is NULL-SAFE (`IS NOT DISTINCT FROM`, an explicit `IS NOT NULL` leg): a CHECK that evaluates
-- to NULL PASSES, so `"decision" = 'approved'` alone would let a row with ⛔ no decision through (caught by the policy
-- spec's refusal legs before 0131 ever left the branch).
-- `twt_app`: SELECT / INSERT / UPDATE (column-narrowed: a row's identity — claim, return, origin, the request — is
-- ⛔ never rewritten). ⛔ No DELETE.

CREATE TABLE "claim_correction_closures" (
	"closure_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"return_decision_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"state" text NOT NULL,
	"request_family_run_id" uuid,
	"requested_by_actor" text,
	"requested_by_display" text,
	"request_note_ciphertext" text,
	"requested_at" timestamp with time zone,
	"lapsed_at" timestamp with time zone,
	"pariwar_decision" text,
	"pariwar_decided_by_actor" text,
	"pariwar_decided_by_display" text,
	"pariwar_decision_note_ciphertext" text,
	"pariwar_decided_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"under_review_since" timestamp with time zone,
	"under_review_by_actor" text,
	"under_review_by_display" text,
	"under_review_note_ciphertext" text,
	"super_admin_decision" text,
	"super_admin_reason" text,
	"super_admin_decided_by_actor" text,
	"super_admin_decided_by_display" text,
	"super_admin_note_ciphertext" text,
	"super_admin_decided_at" timestamp with time zone,
	"name_check_waived" boolean,
	"approval_name_check_state" text,
	"closed_at" timestamp with time zone,
	"closure_notice_run_id" uuid,
	"closure_notice_due_at" timestamp with time zone,
	"closure_notice_done_at" timestamp with time zone,
	"closure_notice_person_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"closure_letter_person_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_return_decision_id_fk" FOREIGN KEY ("return_decision_id") REFERENCES "public"."claim_state_trustee_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_request_family_run_id_fk" FOREIGN KEY ("request_family_run_id") REFERENCES "public"."claim_correction_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_closure_notice_run_id_fk" FOREIGN KEY ("closure_notice_run_id") REFERENCES "public"."claim_correction_runs"("run_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_origin_check" CHECK ("origin" IN ('declined_closure', 'staff_case'));--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_state_check" CHECK ("state" IN ('requested', 'lapsed', 'escalated', 'under_review', 'closed', 'refused', 'approved'));--> statement-breakpoint
-- A declined-closure row carries its whole REQUEST (who, why, when, against which family run); a staff-case row
-- carries ⛔ none — and ⛔ no Pariwar Admin decision either (`-273` §3a).
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_request_by_origin_check" CHECK (
	(
		"origin" = 'declined_closure'
		AND "request_family_run_id" IS NOT NULL
		AND "requested_by_actor" IS NOT NULL
		AND length(btrim("requested_by_actor")) > 0
		AND "requested_by_display" IS NOT NULL
		AND length(btrim("requested_by_display")) > 0
		AND "request_note_ciphertext" IS NOT NULL
		AND "requested_at" IS NOT NULL
	) OR (
		"origin" = 'staff_case'
		AND "request_family_run_id" IS NULL
		AND "requested_by_actor" IS NULL
		AND "requested_by_display" IS NULL
		AND "request_note_ciphertext" IS NULL
		AND "requested_at" IS NULL
		AND "pariwar_decision" IS NULL
		AND "state" NOT IN ('requested', 'lapsed')
	)
);--> statement-breakpoint
-- `lapsed` ⇔ `lapsed_at` (materialised ONLY on a `requested` row — `-273` §3d).
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_lapsed_pair_check" CHECK (("state" = 'lapsed') = ("lapsed_at" IS NOT NULL));--> statement-breakpoint
-- The Pariwar Admin's decision is all-or-nothing; a DECLINE carries its REQUIRED note (`-232` H).
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_pariwar_decision_check" CHECK (
	(
		"pariwar_decision" IS NULL
		AND "pariwar_decided_by_actor" IS NULL
		AND "pariwar_decided_by_display" IS NULL
		AND "pariwar_decision_note_ciphertext" IS NULL
		AND "pariwar_decided_at" IS NULL
	) OR (
		"pariwar_decision" IN ('approved', 'declined')
		AND "pariwar_decided_by_actor" IS NOT NULL
		AND "pariwar_decided_by_display" IS NOT NULL
		AND "pariwar_decided_at" IS NOT NULL
		AND ("pariwar_decision" = 'approved' OR "pariwar_decision_note_ciphertext" IS NOT NULL)
	)
);--> statement-breakpoint
-- Escalated (either origin) ⇔ `escalated_at`; a declined-closure row is escalated ONLY by a decline.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_escalation_check" CHECK (
	("state" IN ('requested', 'lapsed') OR "pariwar_decision" IS NOT DISTINCT FROM 'approved') = ("escalated_at" IS NULL)
	AND ("origin" = 'staff_case' OR "escalated_at" IS NULL OR "pariwar_decision" IS NOT DISTINCT FROM 'declined')
);--> statement-breakpoint
-- Under review is all-or-nothing, and only on an escalated row.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_review_check" CHECK (
	(
		"under_review_since" IS NULL
		AND "under_review_by_actor" IS NULL
		AND "under_review_by_display" IS NULL
		AND "under_review_note_ciphertext" IS NULL
	) OR (
		"under_review_since" IS NOT NULL
		AND "under_review_by_actor" IS NOT NULL
		AND "under_review_by_display" IS NOT NULL
		AND "under_review_note_ciphertext" IS NOT NULL
		AND "escalated_at" IS NOT NULL
	)
);--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_under_review_state_check" CHECK ("state" <> 'under_review' OR "under_review_since" IS NOT NULL);--> statement-breakpoint
-- The Super Admin's decision is all-or-nothing — a REQUIRED reason AND a REQUIRED note (`-255` F3, `-273` §10) — and
-- its reason is from the closure-scoped set, paired with the decision.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_super_admin_decision_check" CHECK (
	(
		"super_admin_decision" IS NULL
		AND "super_admin_reason" IS NULL
		AND "super_admin_decided_by_actor" IS NULL
		AND "super_admin_decided_by_display" IS NULL
		AND "super_admin_note_ciphertext" IS NULL
		AND "super_admin_decided_at" IS NULL
	) OR (
		"super_admin_decision" IS NOT NULL
		AND "super_admin_reason" IS NOT NULL
		AND "super_admin_decided_by_actor" IS NOT NULL
		AND "super_admin_decided_by_display" IS NOT NULL
		AND "super_admin_note_ciphertext" IS NOT NULL
		AND "super_admin_decided_at" IS NOT NULL
		AND "escalated_at" IS NOT NULL
		AND (
			("super_admin_decision" = 'closed' AND "super_admin_reason" = 'family_silent_after_reached')
			OR ("super_admin_decision" = 'refused' AND "super_admin_reason" IN ('claim_not_payable', 'other'))
			OR ("super_admin_decision" = 'approved' AND "super_admin_reason" IN ('name_difference_accepted', 'details_verified', 'other'))
		)
	)
);--> statement-breakpoint
-- ⛔⛔ `-274` 1a (Trustee-ratified) — a staff-origin escalation is NEVER closed for no response, whatever the mark later
-- says. The writer refuses it first (`409 closure.staff_case_origin`); this is the backstop.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_staff_case_never_closed_check" CHECK ("origin" <> 'staff_case' OR ("state" <> 'closed' AND "super_admin_decision" IS DISTINCT FROM 'closed'));--> statement-breakpoint
-- The terminal states follow their decision: `closed` ⇐ the Pariwar Admin's approval or the Super Admin's close;
-- `refused` / `approved` ⇐ the Super Admin's.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_terminal_state_check" CHECK (
	("state" <> 'closed' OR "pariwar_decision" IS NOT DISTINCT FROM 'approved' OR "super_admin_decision" IS NOT DISTINCT FROM 'closed')
	AND ("state" <> 'refused' OR "super_admin_decision" IS NOT DISTINCT FROM 'refused')
	AND ("state" <> 'approved' OR "super_admin_decision" IS NOT DISTINCT FROM 'approved')
	AND ("super_admin_decision" IS NULL OR "state" = "super_admin_decision")
);--> statement-breakpoint
-- An approval records the name-check facts the highlight is derived from (`-273` §7); nothing else does.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_approval_facts_check" CHECK (
	("super_admin_decision" IS NOT DISTINCT FROM 'approved') = ("name_check_waived" IS NOT NULL AND "approval_name_check_state" IS NOT NULL)
	AND ("approval_name_check_state" IS NULL OR "approval_name_check_state" IN ('passing', 'never_checked', 'stale', 'does_not_match'))
);--> statement-breakpoint
-- A closed row carries its closure date and its notice outbox (`-273` §5); ⛔ no other row does.
ALTER TABLE "claim_correction_closures" ADD CONSTRAINT "claim_correction_closures_closed_outbox_check" CHECK (
	("state" = 'closed') = ("closed_at" IS NOT NULL)
	AND ("state" = 'closed') = ("closure_notice_due_at" IS NOT NULL)
	AND ("closure_notice_done_at" IS NULL OR "closure_notice_due_at" IS NOT NULL)
	AND ("state" = 'closed' OR (cardinality("closure_notice_person_keys") = 0 AND cardinality("closure_letter_person_keys") = 0))
);--> statement-breakpoint
GRANT SELECT, INSERT ON "claim_correction_closures" TO twt_app;--> statement-breakpoint
GRANT UPDATE ("state", "lapsed_at", "pariwar_decision", "pariwar_decided_by_actor", "pariwar_decided_by_display", "pariwar_decision_note_ciphertext", "pariwar_decided_at", "escalated_at", "under_review_since", "under_review_by_actor", "under_review_by_display", "under_review_note_ciphertext", "super_admin_decision", "super_admin_reason", "super_admin_decided_by_actor", "super_admin_decided_by_display", "super_admin_note_ciphertext", "super_admin_decided_at", "name_check_waived", "approval_name_check_state", "closed_at", "closure_notice_run_id", "closure_notice_due_at", "closure_notice_done_at", "closure_notice_person_keys", "closure_letter_person_keys", "updated_at") ON "claim_correction_closures" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_correction_closures" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_correction_closures_tenant_isolation_select" ON "claim_correction_closures" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_closures_tenant_isolation_insert" ON "claim_correction_closures" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_correction_closures_tenant_isolation_update" ON "claim_correction_closures" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ `-273` §3b — ONE live closures row per RETURN; a `lapsed` request ⛔ never blocks a new one.
CREATE UNIQUE INDEX "claim_correction_closures_one_live_per_return_uq" ON "claim_correction_closures" USING btree ("return_decision_id") WHERE "state" <> 'lapsed';--> statement-breakpoint
CREATE INDEX "claim_correction_closures_pariwar_claim_idx" ON "claim_correction_closures" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_correction_closures_held_idx" ON "claim_correction_closures" USING btree ("escalated_at") WHERE "state" IN ('escalated', 'under_review');--> statement-breakpoint
CREATE INDEX "claim_correction_closures_closed_idx" ON "claim_correction_closures" USING btree ("closed_at") WHERE "state" = 'closed';
