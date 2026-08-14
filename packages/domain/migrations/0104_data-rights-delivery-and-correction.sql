-- Story 10.21 — AC-R1 (delivery) + AC-R2 (correction). Hand-authored.
--
-- Implements the Trustee Panel's rulings: `2026-08-14-109` cl.1 (member-direct primary),
-- `2026-08-14-110` (a narrow staff-mediated fallback), `2026-08-14-111` (the member's own request is
-- the trigger; the justification is withheld from the export), `2026-08-14-112` (BOTH conditions
-- required), `2026-08-14-113` (option (i): the three-part gate + the MANDATED terminology), and
-- `2026-08-14-109` cl.2 (a recorded, staff-executed correction process on the helpdesk substrate).
--
-- ⛔ TERMINOLOGY IS MANDATED (`2026-08-14-113` cl.2). The gate column below is
-- `primary_delivery_not_completed_at`. ⛔ It is NEVER named for the handset. The check observes that an
-- OTP was issued and THE PRIMARY ROUTE DID NOT COMPLETE; it does not observe the device — there is no
-- delivery receipt (no DLR seam in v1) and no mobile-change history. A handset-flavoured name would
-- assert what the system never established. Enforced tree-wide by
-- `packages/contracts/tests/delivery-terminology-gate.test.ts`.
--
-- ⚠ `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is permitted inside the migrator's transaction (PG 12+)
-- BECAUSE the new value is only ADDED here and never USED in the same transaction — the 0065 precedent.

-- A DISTINCT OTP pool for the member-direct delivery grant. ⛔ It cannot reuse `step_up`:
-- `invalidateLiveOtps` clears the live OTP per (mobile, intent), so sharing the pool would make a
-- delivery OTP and a step-up OTP silently burn each other.
ALTER TYPE "public"."member_otp_intent" ADD VALUE IF NOT EXISTS 'data_export_delivery';--> statement-breakpoint

-- ── AC-R1 — delivery grants ────────────────────────────────────────────────────────────────────────
CREATE TABLE "data_export_delivery_grants" (
	"grant_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"export_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- 'member_direct' = the PRIMARY route. 'staff_mediated' = the NARROW EXCEPTION.
	-- ⛔ These are not two co-equal routes and must never be presented as such.
	"channel" text NOT NULL,
	-- 'pending' | 'consumed' | 'expired'. App-layer enum (the data_exports.status posture).
	"status" text NOT NULL,
	-- ── The THREE-PART GATE (`2026-08-14-113` cl.1). staff_mediated ONLY; NULL on member_direct. ──
	-- (1) the member's OWN explicit request. ⛔ The fallback is MEMBER-INITIATED: staff may not
	--     initiate or unilaterally select it (`2026-08-14-111` cl.2).
	"member_request_recorded_at" timestamp with time zone,
	-- (2) ⛔ MANDATED NAME. The instant at which an OTP issued for the member-direct grant was observed
	--     to have expired unconsumed. It records that THE PRIMARY ROUTE DID NOT COMPLETE — ⛔ NOT that
	--     the member lost or cannot be reached on the mobile, which this system cannot observe.
	"primary_delivery_not_completed_at" timestamp with time zone,
	-- (3) the staff attestation, Tier-1. ⛔ WITHHELD from the member export (`2026-08-14-111` cl.1) —
	--     an internal operational/audit record, not member-facing content.
	"attestation_ciphertext" text,
	"helpdesk_ticket_id" uuid,
	"granted_by_actor_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_export_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."data_exports"("export_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_helpdesk_ticket_id_fk" FOREIGN KEY ("helpdesk_ticket_id") REFERENCES "public"."helpdesk_tickets"("ticket_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_channel_check" CHECK ("channel" IN ('member_direct', 'staff_mediated'));--> statement-breakpoint

-- ⭐ THE RULING, ENFORCED AT THE DATABASE. A staff-mediated grant CANNOT exist unless all three gate
-- elements are recorded. ⛔ This is deliberately a DB CHECK and not app-layer-only: it gates a
-- PII-DISCLOSURE path — the one path on which a staff actor obtains a member's assembled, DECRYPTED
-- Tier-1 export — so a caller-side bug must not be able to create an ungated grant. Same reasoning as
-- `data_exports_requested_via_check`, and the opposite of the display-value columns.
ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_three_part_gate_check" CHECK (
	"channel" <> 'staff_mediated' OR (
		"member_request_recorded_at" IS NOT NULL
		AND "primary_delivery_not_completed_at" IS NOT NULL
		AND "attestation_ciphertext" IS NOT NULL
	)
);--> statement-breakpoint

-- ⛔ And the converse: a member_direct grant must carry NONE of the three. The gate elements exist only
-- to justify an exception; recording them on the primary route would misrepresent an ordinary delivery
-- as an exceptional one in every audit query that filters on them.
ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_member_direct_clean_check" CHECK (
	"channel" <> 'member_direct' OR (
		"member_request_recorded_at" IS NULL
		AND "primary_delivery_not_completed_at" IS NULL
		AND "attestation_ciphertext" IS NULL
	)
);--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON "data_export_delivery_grants" TO twt_app;--> statement-breakpoint
ALTER TABLE "data_export_delivery_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "data_export_delivery_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "data_export_delivery_grants_tenant_isolation_select" ON "data_export_delivery_grants" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "data_export_delivery_grants_tenant_isolation_write" ON "data_export_delivery_grants" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

CREATE INDEX "data_export_delivery_grants_member_id_idx" ON "data_export_delivery_grants" ("member_id");--> statement-breakpoint
CREATE INDEX "data_export_delivery_grants_pariwar_id_idx" ON "data_export_delivery_grants" ("pariwar_id");--> statement-breakpoint
-- At most ONE live (pending) grant per export — a second live grant would mean two simultaneous ways to
-- obtain the same dossier.
CREATE UNIQUE INDEX "data_export_delivery_grants_one_pending_per_export" ON "data_export_delivery_grants" ("export_id") WHERE status = 'pending';--> statement-breakpoint

-- ── AC-R2 — the recorded, staff-executed correction process ────────────────────────────────────────
-- ⛔ This is a RECORD, not a write path. `2026-08-14-109` cl.2 ratified that three mechanized rights
-- plus a RECORDED, STAFF-EXECUTED CORRECTION PROCESS discharge the release gate — it did NOT authorise
-- a general member-profile editor, which carries its own RBAC surface, its own PII write-audit posture
-- and its own correction-vs-falsification governance question. ⛔ Nothing here writes a member field.
CREATE TABLE "member_data_rights_corrections" (
	"correction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"pariwar_id" uuid NOT NULL,
	-- The originating helpdesk ticket. ⛔ The ruling puts this process ON the helpdesk substrate, so the
	-- linkage is REQUIRED here (unlike the optional provenance elsewhere in this story).
	"helpdesk_ticket_id" uuid NOT NULL,
	-- What the member asked to be corrected (member-authored, relayed at intake) — Tier-1.
	"requested_change_ciphertext" text NOT NULL,
	-- What the staff actor actually did about it (staff-authored) — Tier-1.
	"action_taken_ciphertext" text NOT NULL,
	-- 'recorded' | 'applied' | 'declined'. App-layer enum.
	"outcome" text NOT NULL,
	"recorded_by_actor_id" uuid NOT NULL,
	"recorded_by_display" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "member_data_rights_corrections" ADD CONSTRAINT "member_data_rights_corrections_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_data_rights_corrections" ADD CONSTRAINT "member_data_rights_corrections_ticket_id_fk" FOREIGN KEY ("helpdesk_ticket_id") REFERENCES "public"."helpdesk_tickets"("ticket_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_data_rights_corrections" ADD CONSTRAINT "member_data_rights_corrections_outcome_check" CHECK ("outcome" IN ('recorded', 'applied', 'declined'));--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON "member_data_rights_corrections" TO twt_app;--> statement-breakpoint
ALTER TABLE "member_data_rights_corrections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "member_data_rights_corrections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "member_data_rights_corrections_tenant_isolation_select" ON "member_data_rights_corrections" AS PERMISSIVE FOR SELECT TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_data_rights_corrections_tenant_isolation_write" ON "member_data_rights_corrections" AS PERMISSIVE FOR ALL TO "twt_app" USING (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid) WITH CHECK (pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid);--> statement-breakpoint

CREATE INDEX "member_data_rights_corrections_member_id_idx" ON "member_data_rights_corrections" ("member_id");--> statement-breakpoint
CREATE INDEX "member_data_rights_corrections_pariwar_id_idx" ON "member_data_rights_corrections" ("pariwar_id");
