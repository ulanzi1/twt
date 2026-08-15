-- Story 10.21 round-2 code review — Decision `2026-08-15-117` clauses 6 and 5. Hand-authored.
--
-- Two corrections to migration 0104's `data_export_delivery_grants`, both implementation-level:
-- ⛔ NEITHER supersedes ratified material. `2026-08-14-113` clauses 1–2 (the three gate elements, the
-- fail-closed posture, the MANDATED terminology) are untouched — no column here is renamed, and
-- `primary_delivery_not_completed_at` keeps its mandated name.

-- ── (1) The pending-uniqueness index blocked the MEMBER'S OWN route ────────────────────────────────
-- 0104 predicated `one_pending_per_export` on `status = 'pending'` ALONE. But a `staff_mediated` grant
-- is never consumable — `redeemDelivery` restricts redemption to `member_direct` and no other handler,
-- route or job reads a staff-mediated grant — so issuing the fallback parked an unconsumable row in the
-- slot for its whole TTL and made the export unreachable by EVERY party: staff had no route through it,
-- and the member's own re-issue collided with it on a misleading 409.
--
-- ⭐ The invariant actually worth protecting is ONE LIVE **REDEEMABLE** GRANT PER EXPORT — i.e. at most
-- one simultaneous way to *obtain* the dossier. A `staff_mediated` row records that an exception was
-- AUTHORISED; it is not a redeemable artifact and has no business holding the slot.
-- ⛔ The row's inertness is NOT changed here: the handover mechanism legitimately transferred to a named
-- successor story under `2026-08-14-109` clause 9.
DROP INDEX IF EXISTS "data_export_delivery_grants_one_pending_per_export";--> statement-breakpoint
CREATE UNIQUE INDEX "data_export_delivery_grants_one_pending_per_export" ON "data_export_delivery_grants" ("export_id") WHERE status = 'pending' AND channel = 'member_direct';--> statement-breakpoint

-- ── (2) `status` gates a PII-disclosure invariant and had no CHECK ─────────────────────────────────
-- 0104 gave `channel` and `outcome` CHECK constraints but left `status` app-layer-only, while the
-- partial unique index above is predicated on `status`'s exact spelling. A writer that stored 'Pending'
-- or 'PENDING' would silently fall OUTSIDE the index predicate and two live grants would coexist on one
-- export with no error anywhere — the invariant defeated by a typo rather than by a bug.
-- ⛔ This is the same reasoning 0104 applied to `channel`; `status` was the omission.
ALTER TABLE "data_export_delivery_grants" ADD CONSTRAINT "data_export_delivery_grants_status_check" CHECK ("status" IN ('pending', 'consumed', 'expired'));
