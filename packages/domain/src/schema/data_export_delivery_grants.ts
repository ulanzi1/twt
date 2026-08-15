// `data_export_delivery_grants` — Story 10.21 AC-R1 (migration 0104).
//
// How a built export actually reaches the member. TENANT-ISOLATED (RLS in migration 0104).
//
// ── The ruled model: a PRIMARY and a NARROW EXCEPTION, never two co-equal routes ───────────────────
//   · `member_direct`   — the PRIMARY (`2026-08-14-109` cl.1). A one-time, OTP-verified grant to the
//                         registered mobile; the member proves possession and NO session is issued.
//   · `staff_mediated`  — the EXCEPTION (`2026-08-14-110`). A staff actor obtains the assembled,
//                         DECRYPTED Tier-1 export and hands it over. Gated three ways.
//
// ── The THREE-PART GATE on `staff_mediated` (`2026-08-14-113` cl.1) ────────────────────────────────
// All three required; none substitutes for another. Migration 0104 enforces this as a DB CHECK, not
// app-layer-only, because it gates a PII-DISCLOSURE path.
//   (1) `memberRequestRecordedAt`             — the member's OWN explicit request. The fallback is
//                                               MEMBER-INITIATED; staff may not initiate or
//                                               unilaterally select it (`2026-08-14-111` cl.2).
//   (2) `primaryDeliveryNotCompletedAt`       — see the naming note below.
//   (3) `attestationCiphertext`               — Tier-1, and WITHHELD from the member export
//                                               (`2026-08-14-111` cl.1).
//
// ⛔ NAMING IS MANDATED AND GATE-ENFORCED (`2026-08-14-113` cl.2). Element (2) is
// `primary_delivery_not_completed_at` and is NEVER named for the handset. It records that an OTP was
// issued for the member-direct grant and THE PRIMARY ROUTE DID NOT COMPLETE. It does NOT record that
// the member lost the device or cannot be reached — this system cannot observe that: there is no
// delivery receipt (no DLR seam in v1) and no mobile-change history. A handset-flavoured name would
// assert to every later reader what the system never established, and would be plainly wrong for a
// member who was asleep, busy, or ignored the message.
// Enforced tree-wide by `packages/contracts/tests/delivery-terminology-gate.test.ts`.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { DataExportId, HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';

/** The delivery route. ⛔ Not two co-equal choices — a primary and a narrow exception. */
export type DeliveryChannel = 'member_direct' | 'staff_mediated';
/** Grant lifecycle. App-layer enum (the `data_exports.status` posture). */
export type DeliveryGrantStatus = 'pending' | 'consumed' | 'expired';

export const dataExportDeliveryGrants = pgTable(
  'data_export_delivery_grants',
  {
    grantId: uuid('grant_id').defaultRandom().primaryKey(),
    exportId: uuid('export_id').notNull().$type<DataExportId>(),
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    channel: text('channel').notNull().$type<DeliveryChannel>(),
    status: text('status').notNull().$type<DeliveryGrantStatus>(),

    // ── The three-part gate (staff_mediated only; all NULL on member_direct) ────────────────────────
    memberRequestRecordedAt: timestamp('member_request_recorded_at', { withTimezone: true, mode: 'date' }),
    /** ⛔ MANDATED NAME — records that the PRIMARY ROUTE did not complete, never anything about the
     *  handset. See the module header before renaming anything here. */
    primaryDeliveryNotCompletedAt: timestamp('primary_delivery_not_completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    /** Tier-1 staff attestation. ⛔ WITHHELD from the member export — an internal operational/audit
     *  record (`2026-08-14-111` cl.1). ⚠ Scrubbed by `anonymizeMember`; it is member-related PII. */
    attestationCiphertext: piiColumn(1, 'data_rights_attestation')('attestation_ciphertext'),

    helpdeskTicketId: uuid('helpdesk_ticket_id').$type<HelpdeskTicketId>(),
    grantedByActorId: uuid('granted_by_actor_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('data_export_delivery_grants_member_id_idx').on(t.memberId),
    index('data_export_delivery_grants_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type DataExportDeliveryGrantRow = typeof dataExportDeliveryGrants.$inferSelect;
