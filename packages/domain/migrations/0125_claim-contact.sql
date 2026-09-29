-- Migration 0125 — the claim's CONTACT RECORD, bound to the nominee declaration's VERSIONS (Story 6.19a, Task 1;
-- AC1; shared spec D5 / D16, as committed in `2026-09-28-265`; the write rules are 6.19a AC1's W1–W10).
--
-- The rulings: `2026-09-20-232` G (an address for each nominee, and the claimant's name and mobile when the
-- claimant is ⛔ not a nominee, captured AT FILING), `2026-09-27-253` cl.1/cl.2/cl.4 (the agreement; the
-- claimant-to-nominee relationship; one address per declared nominee, the claimant's details once),
-- `2026-09-27-255` F8 and `2026-09-27-257` (the relationship values).
-- Hand-authored. ⛔ NOT generated (the drizzle-kit snapshots stop at 0020; regenerating an applied migration is
-- the 42P07 footgun). ⛔ NO BACKFILL — nothing is in production (`-232`).
--
-- ⭐ WHY VERSIONS, ⛔ NOT THE EFFECTIVE DECLARATION: `getEffectiveNomineeDeclaration` is `undetermined` until the
-- District Admin's determination in the review window (T12), and the determination can land mid-filing. So a
-- child row binds to ONE `member_nominee_versions` row; the approval check (D14) resolves the EFFECTIVE versions'
-- rows at approval — through the correction chain (W4a) — and rows bound to versions that prove ⛔ not effective
-- stay, unused. ⛔ The declaration itself is never edited (`-233`) — the address lives here.
--
-- ⚠ NEW Tier-1 PII (shared spec invariant 9 / T8): the claimant's name, mobile and address and each nominee's
-- postal address are envelope ciphertext, encrypted in the API handler before insert. ⛔ NO RTBF path reaches
-- these tables yet — recorded in `deferred-work.md`, ⛔ not fixed here.
--
-- ⛔ NO DELETE for `twt_app` (W4: a write upserts the rows it carries and never deletes one it does not carry).
-- The only rows that ever go are the `ON DELETE cascade` from `claims` (a spec's cleanup / a hard delete of the
-- claim). Policies are per-command; ⛔ never `FOR ALL` (a DELETE leg).
-- Statement order per table: CREATE → FKs → CHECKs → GRANT → ENABLE → FORCE → POLICY → indexes (the 0122 order).

-- ══ claim_contacts — ONE row per claim ═════════════════════════════════════════════════════════════════════
-- Exactly ONE claimant side: either the claimant IS one of the nominees (`claimant_nominee_version_id`), or the
-- claimant block (name, mobile, address — all three, Tier-1). ⭐ The CHECK is the truth; every writer clears the
-- other side in the same statement (W6), and the creating write refuses a body with neither side as a 400
-- (`claim_contact.claimant_required`, W7) BEFORE the INSERT, so this CHECK never surfaces as a 500.
CREATE TABLE "claim_contacts" (
	"contact_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"deceased_member_id" uuid NOT NULL,
	"claimant_nominee_version_id" uuid,
	"claimant_name_ciphertext" text,
	"claimant_mobile_ciphertext" text,
	"claimant_address_ciphertext" text,
	"agreement_consent_id" uuid NOT NULL,
	"contact_locale" text DEFAULT 'hi' NOT NULL,
	"recorded_by_actor" text NOT NULL,
	"recorded_via" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_claimant_nominee_version_id_fk" FOREIGN KEY ("claimant_nominee_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⭐ The agreement is linked PER CLAIM (D15, `-261` C3) — ⛔ never looked up by subject.
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_agreement_consent_id_fk" FOREIGN KEY ("agreement_consent_id") REFERENCES "public"."consent_records"("consent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ LOCKSTEP with `CLAIM_CONTACT_LOCALES` / `CLAIM_CONTACT_RECORDED_VIA` (schema/claim_contacts.ts) and the
-- `@twt/contracts` request shapes — re-declared, not shared.
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_contact_locale_check" CHECK ("contact_locale" IN ('hi', 'en'));--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_recorded_via_check" CHECK ("recorded_via" IN ('member_app', 'helpline'));--> statement-breakpoint
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_recorded_by_actor_check" CHECK (length(btrim("recorded_by_actor")) > 0);--> statement-breakpoint
-- W6 — "claimant fields present ⇔ the claimant version is null", and the block is all-or-nothing.
ALTER TABLE "claim_contacts" ADD CONSTRAINT "claim_contacts_one_claimant_side_check" CHECK (
	(
		"claimant_nominee_version_id" IS NOT NULL
		AND "claimant_name_ciphertext" IS NULL
		AND "claimant_mobile_ciphertext" IS NULL
		AND "claimant_address_ciphertext" IS NULL
	) OR (
		"claimant_nominee_version_id" IS NULL
		AND "claimant_name_ciphertext" IS NOT NULL
		AND "claimant_mobile_ciphertext" IS NOT NULL
		AND "claimant_address_ciphertext" IS NOT NULL
	)
);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_contacts" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contacts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contacts_tenant_isolation_select" ON "claim_contacts" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contacts_tenant_isolation_insert" ON "claim_contacts" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contacts_tenant_isolation_update" ON "claim_contacts" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ ONE contact record per claim.
CREATE UNIQUE INDEX "claim_contacts_claim_case_id_uq" ON "claim_contacts" USING btree ("claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_contacts_pariwar_id_idx" ON "claim_contacts" USING btree ("pariwar_id");--> statement-breakpoint
CREATE INDEX "claim_contacts_deceased_member_idx" ON "claim_contacts" USING btree ("pariwar_id", "deceased_member_id");--> statement-breakpoint
CREATE INDEX "claim_contacts_agreement_consent_id_idx" ON "claim_contacts" USING btree ("agreement_consent_id");--> statement-breakpoint
CREATE INDEX "claim_contacts_claimant_nominee_version_id_idx" ON "claim_contacts" USING btree ("claimant_nominee_version_id");--> statement-breakpoint

-- ══ claim_contact_nominees — one row per (contact, nominee VERSION) ════════════════════════════════════════
-- Each nominee's postal address (Tier-1, required when the row is created — W7), and — only when the claimant is
-- none of the nominees — the claimant-to-nominee `relationship` (plain text, ⛔ not Tier-1: a label, like
-- `member_nominees.relationship`; D16). ⛔ The DB does not constrain the relationship's values — the contracts
-- enum does (`ClaimantNomineeRelationship`, the twenty minus `other`), as for `member_nominees.relationship`.
CREATE TABLE "claim_contact_nominees" (
	"contact_nominee_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"claim_case_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	"nominee_version_id" uuid NOT NULL,
	"address_ciphertext" text NOT NULL,
	"relationship" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "claim_contact_nominees" ADD CONSTRAINT "claim_contact_nominees_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."claim_contacts"("contact_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_contact_nominees" ADD CONSTRAINT "claim_contact_nominees_claim_case_id_claims_claim_case_id_fk" FOREIGN KEY ("claim_case_id") REFERENCES "public"."claims"("claim_case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_contact_nominees" ADD CONSTRAINT "claim_contact_nominees_nominee_version_id_fk" FOREIGN KEY ("nominee_version_id") REFERENCES "public"."member_nominee_versions"("version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ⚠ THE NULL TRAP (0119): a CHECK treats NULL as passing, so the non-empty guard on the NULLABLE column is
-- explicit.
ALTER TABLE "claim_contact_nominees" ADD CONSTRAINT "claim_contact_nominees_relationship_check" CHECK ("relationship" IS NULL OR length(btrim("relationship")) > 0);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON "claim_contact_nominees" TO twt_app;--> statement-breakpoint
ALTER TABLE "claim_contact_nominees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "claim_contact_nominees" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "claim_contact_nominees_tenant_isolation_select" ON "claim_contact_nominees" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_nominees_tenant_isolation_insert" ON "claim_contact_nominees" AS PERMISSIVE FOR INSERT TO "twt_app" WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "claim_contact_nominees_tenant_isolation_update" ON "claim_contact_nominees" AS PERMISSIVE FOR UPDATE TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
-- ⭐ W4 — one row per (contact, nominee version); every write UPSERTS on it.
CREATE UNIQUE INDEX "claim_contact_nominees_contact_version_uq" ON "claim_contact_nominees" USING btree ("contact_id", "nominee_version_id");--> statement-breakpoint
CREATE INDEX "claim_contact_nominees_pariwar_claim_idx" ON "claim_contact_nominees" USING btree ("pariwar_id", "claim_case_id");--> statement-breakpoint
CREATE INDEX "claim_contact_nominees_nominee_version_id_idx" ON "claim_contact_nominees" USING btree ("nominee_version_id");
