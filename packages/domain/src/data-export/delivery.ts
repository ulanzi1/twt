// Story 10.21 AC-R1 — the delivery store + the three-part fallback gate.
//
// ⛔ READ THE NAMING RULE BEFORE TOUCHING ANYTHING HERE (Decision `2026-08-14-113` clause 2).
// The observable this module computes is `primaryDeliveryNotCompleted`. It means: **an OTP was issued
// for the member-direct grant and the primary route did not complete.** It does NOT mean the member
// lost the handset, and it must never be named as though it did — there is no delivery receipt (no DLR
// seam in v1) and no mobile-change history, so the system CANNOT observe the device. A handset-flavoured
// name would assert to every later reader what was never established, and would be plainly wrong for a
// member who was asleep, busy, or simply ignored the message.
// ⚠ `packages/contracts/tests/delivery-terminology-gate.test.ts` fails the build on the banned terms.

import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { DataExportId, HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';
import { memberAuthOtps } from '../schema/member_auth_otps.js';
import {
  type DataExportDeliveryGrantRow,
  type DeliveryChannel,
  dataExportDeliveryGrants,
} from '../schema/data_export_delivery_grants.js';

/** The OTP intent pool reserved for the member-direct delivery grant (migration 0104).
 *  ⛔ A DISTINCT pool: `invalidateLiveOtps` clears the live OTP per (mobile, intent), so sharing the
 *  `step_up` pool would make a delivery OTP and a step-up OTP silently burn each other. */
export const DATA_EXPORT_DELIVERY_OTP_INTENT = 'data_export_delivery' as const;

/**
 * Has the PRIMARY (member-direct) route been tried and failed **FOR THIS EXPORT**?
 *
 * ⭐ THIS IS ELEMENT 2 OF THE THREE-PART GATE, AND IT IS A PROXY — the honest one available.
 * True when an OTP was issued on the delivery pool **for this export's own member-direct grant** and
 * **expired without being consumed** (`consumed_at IS NULL AND expires_at < now`).
 *
 * ⛔ SCOPED TO THE GRANT, AND THE SCOPING IS LOAD-BEARING (Decision `2026-08-15-117` clause 3,
 * correcting the implementation to `2026-08-14-113` clause 3's own words — *"an OTP was issued **for
 * the member-direct delivery grant** and expired without being consumed"*). ⚠ This function was first
 * shipped MEMBER-scoped, with no export scoping and no lower time bound, and that was BROADER than the
 * predicate it implements. Two things followed, both defeating what element 2 is documented to buy:
 *   · a staff actor could MANUFACTURE it — issue a member-direct grant on any member, wait out the OTP
 *     TTL, and element 2 was server-observed true with no member participation at all;
 *   · it was PERMANENT — one OTP that expired unconsumed satisfied element 2 for every export that
 *     member ever had thereafter, and a member who then redeemed every grant never re-closed it.
 * ⛔ Do NOT reintroduce a member-only predicate here. The question is always about THIS delivery.
 *
 * ⛔ FAILS CLOSED WHEN THE PRIMARY WAS NEVER ATTEMPTED. No `member_direct` grant for this export ⇒
 * `null` ⇒ the staff-mediated route refuses. That is what forecloses reaching the fallback without
 * trying the primary at all.
 *
 * ⛔ WHAT IT PROVES: the primary route did not complete for this export.
 * ⛔ WHAT IT DOES NOT PROVE: that the member no longer controls the registered mobile. It is satisfied
 * identically by a member who was asleep, busy, or ignored the message. That condition is **not
 * machine-verifiable in this system** and is carried as the staff ATTESTATION (element 3) instead.
 * ⛔ Do not "strengthen" this into a claim about the device.
 *
 * ⚠ WHY NO `grant_id` ON THE OTP ROW. `member_auth_otps` is GLOBAL and pre-scope, shared with the
 * `login` and `step_up` pools, so threading a correlation id through `requestOtp` would change shared
 * authentication code. `invalidateLiveOtps` already burns the prior live OTP per `(mobile, intent)` on
 * re-issue, so the surviving expired-unconsumed row is always the latest — which makes the grant's
 * `created_at` lower bound sufficient to identify "the OTP issued for this grant".
 *
 * ⚠ OPEN, NON-BLOCKING (`2026-08-14-113` *Open follow-ups*, restated unchanged by `2026-08-15-117`):
 * should this additionally require `attempts = 0`? A NON-ZERO attempt count means somebody received the
 * message and entered a wrong code — which is evidence the member **DOES** control the mobile, cutting
 * against element 3. It is deliberately NOT in the predicate, because adding it narrows eligibility
 * beyond what was ruled and `2026-08-14-112` clause 3 forbids inventing mechanism. ⛔ The grant scoping
 * above is ORTHOGONAL to this question: it changes WHICH OTP is read, never WHAT is read from it.
 * ⚠ The asymmetry, for whoever answers: wrong permissively admits a fallback that should have been
 * refused; wrong restrictively denies a member a statutory route.
 */
export async function primaryDeliveryNotCompletedAt(
  db: Db,
  memberId: MemberId,
  exportId: DataExportId,
  now: Date,
): Promise<Date | null> {
  // The most recent member-direct grant for THIS export, at ANY status — an expired or consumed grant
  // still evidences that the primary route was attempted, which is the fact element 2 turns on.
  const [grant] = await db
    .select({ createdAt: dataExportDeliveryGrants.createdAt })
    .from(dataExportDeliveryGrants)
    .where(
      and(
        eq(dataExportDeliveryGrants.exportId, exportId),
        eq(dataExportDeliveryGrants.channel, 'member_direct' satisfies DeliveryChannel),
      ),
    )
    .orderBy(sql`${dataExportDeliveryGrants.createdAt} DESC`)
    .limit(1);
  // ⛔ FAIL CLOSED: the primary was never attempted for this export.
  if (!grant) return null;

  const rows = await db
    .select({ expiresAt: memberAuthOtps.expiresAt })
    .from(memberAuthOtps)
    .where(
      and(
        eq(memberAuthOtps.memberId, memberId),
        eq(memberAuthOtps.intent, DATA_EXPORT_DELIVERY_OTP_INTENT),
        isNull(memberAuthOtps.consumedAt),
        lt(memberAuthOtps.expiresAt, now),
        // ⛔ The lower bound is what makes this THIS delivery's OTP and not a stale one from months ago.
        gte(memberAuthOtps.createdAt, grant.createdAt),
      ),
    )
    .orderBy(sql`${memberAuthOtps.expiresAt} DESC`)
    .limit(1);
  return rows[0]?.expiresAt ?? null;
}

export interface InsertMemberDirectGrantInput {
  readonly exportId: DataExportId;
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  readonly helpdeskTicketId: HelpdeskTicketId;
  readonly grantedByActorId: string;
  readonly expiresAt: Date;
}

/** The PRIMARY route. ⛔ Carries NONE of the three gate elements — migration 0104's
 *  `member_direct_clean_check` refuses a row that does, because recording them here would
 *  misrepresent an ordinary delivery as an exceptional one in every audit query. */
export async function insertMemberDirectGrant(
  db: Db,
  input: InsertMemberDirectGrantInput,
): Promise<DataExportDeliveryGrantRow> {
  const [row] = await db
    .insert(dataExportDeliveryGrants)
    .values({
      exportId: input.exportId,
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      channel: 'member_direct' satisfies DeliveryChannel,
      status: 'pending',
      helpdeskTicketId: input.helpdeskTicketId,
      grantedByActorId: input.grantedByActorId,
      expiresAt: input.expiresAt,
    })
    .returning();
  if (!row) throw new Error('insertMemberDirectGrant: INSERT returning produced no row');
  return row;
}

export interface InsertStaffMediatedGrantInput {
  readonly exportId: DataExportId;
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  readonly helpdeskTicketId: HelpdeskTicketId;
  readonly grantedByActorId: string;
  readonly expiresAt: Date;
  /** Element 1 — when the member's OWN explicit request was recorded. */
  readonly memberRequestRecordedAt: Date;
  /** Element 2 — ⛔ MANDATED NAME. When the primary route was observed not to have completed. */
  readonly primaryDeliveryNotCompletedAt: Date;
  /** Element 3 — the staff attestation, already Tier-1 encrypted by the caller. */
  readonly attestationCiphertext: string;
}

/**
 * The NARROW EXCEPTION. All three gate elements are required and are additionally enforced by
 * migration 0104's `three_part_gate_check` — ⛔ a DB CHECK, not app-layer-only, because this gates a
 * PII-disclosure path and a caller-side bug must not be able to create an ungated grant.
 */
export async function insertStaffMediatedGrant(
  db: Db,
  input: InsertStaffMediatedGrantInput,
): Promise<DataExportDeliveryGrantRow> {
  const [row] = await db
    .insert(dataExportDeliveryGrants)
    .values({
      exportId: input.exportId,
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      channel: 'staff_mediated' satisfies DeliveryChannel,
      status: 'pending',
      helpdeskTicketId: input.helpdeskTicketId,
      grantedByActorId: input.grantedByActorId,
      expiresAt: input.expiresAt,
      memberRequestRecordedAt: input.memberRequestRecordedAt,
      primaryDeliveryNotCompletedAt: input.primaryDeliveryNotCompletedAt,
      attestationCiphertext: input.attestationCiphertext,
    })
    .returning();
  if (!row) throw new Error('insertStaffMediatedGrant: INSERT returning produced no row');
  return row;
}

/**
 * Expire a stale `pending` grant on this export, if any, BEFORE issuing a new one.
 *
 * ⭐ LAZY-EXPIRE-ON-READ (code-review decision, this story). Without this, migration 0104's
 * `data_export_delivery_grants_one_pending_per_export` partial unique index permanently blocks
 * reissuing a grant on this export once the live one's `expires_at` passes with nobody having
 * redeemed it — which is exactly the sequence AC-R1's fallback exists for (member-direct tried →
 * its OTP expires unconsumed → the member asks for staff-mediated delivery on the SAME export).
 * ⛔ No new scheduled job: the transition happens inline, in the SAME tx as the new grant's insert,
 * the first time anyone asks for a grant on this export after the old one has gone stale.
 * ⚠ A no-op when the live grant is still within its window — that grant keeps blocking a second one,
 * which is correct: `one_pending_per_export` is doing its job there.
 */
export async function expireStaleGrantForExport(
  db: Db,
  exportId: DataExportId,
  now: Date,
): Promise<void> {
  await db
    .update(dataExportDeliveryGrants)
    .set({ status: 'expired' })
    .where(
      and(
        eq(dataExportDeliveryGrants.exportId, exportId),
        eq(dataExportDeliveryGrants.status, 'pending'),
        lt(dataExportDeliveryGrants.expiresAt, now),
      ),
    );
}

/**
 * The UNSCOPED grant lookup for the unauthenticated member redemption path.
 *
 * ⛔ RUNS ON THE SERVICE POOL (BYPASSRLS) BY NECESSITY, and the reason is stated so nobody mistakes it
 * for carelessness: the redeeming member has NO session and therefore no tenant scope, so there is no
 * scope tx to read under. The TENANT COMES FROM THE GRANT, and every subsequent read in the caller is
 * scoped to it.
 * ⛔ It is not an enumeration surface: `grantId` is an unguessable UUID, redemption additionally
 * requires the OTP, and the caller returns the SAME 404 for absent / spent / expired / wrong-code.
 * ⛔ Do NOT widen this to accept any other predicate — it exists for exactly one lookup.
 */
export async function findLiveGrantUnscoped(
  pool: { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  grantId: string,
  now: Date,
): Promise<DataExportDeliveryGrantRow | null> {
  const { rows } = await pool.query(
    `SELECT grant_id, export_id, member_id, pariwar_id, channel, status,
            member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext,
            helpdesk_ticket_id, granted_by_actor_id, expires_at, consumed_at, created_at
       FROM data_export_delivery_grants
      WHERE grant_id = $1 AND status = 'pending' AND expires_at > $2
      LIMIT 1`,
    [grantId, now],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    grantId: r['grant_id'],
    exportId: r['export_id'],
    memberId: r['member_id'],
    pariwarId: r['pariwar_id'],
    channel: r['channel'],
    status: r['status'],
    memberRequestRecordedAt: r['member_request_recorded_at'],
    primaryDeliveryNotCompletedAt: r['primary_delivery_not_completed_at'],
    attestationCiphertext: r['attestation_ciphertext'],
    helpdeskTicketId: r['helpdesk_ticket_id'],
    grantedByActorId: r['granted_by_actor_id'],
    expiresAt: r['expires_at'],
    consumedAt: r['consumed_at'],
    createdAt: r['created_at'],
  } as DataExportDeliveryGrantRow;
}

/** Atomically burn a grant. Returns false when a concurrent redemption already consumed it — the
 *  one-time guarantee lives HERE, in the conditional UPDATE, not in a read-then-write. */
export async function consumeGrant(db: Db, grantId: string, now: Date): Promise<boolean> {
  const rows = await db
    .update(dataExportDeliveryGrants)
    .set({ status: 'consumed', consumedAt: now })
    .where(
      and(eq(dataExportDeliveryGrants.grantId, grantId), eq(dataExportDeliveryGrants.status, 'pending')),
    )
    .returning({ grantId: dataExportDeliveryGrants.grantId });
  return rows.length === 1;
}
