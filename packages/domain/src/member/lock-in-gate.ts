// The 5-condition lock-in entry gate — Story 3.6b (Task 3; AC2, the load-bearing boundary).
//
// A successful Vyawastha Shulk payment ALONE does NOT enter `lock-in` (epics L1732). The reducer is
// total + agnostic — it transitions `pending-fee → lock-in` the instant it sees
// `member.vyawastha_shulk_paid`, with no knowledge of nominees/medical/T&C — so the EMITTER (the
// confirm handler) owns the gate (state.ts header: "Whether a transition SHOULD be emitted is the
// EMITTER's concern"; R2). This module reads the FOUR pre-payment facts; the handler combines them with
// (e) the receipt it just persisted to decide whether to emit the two events.
//
// In the normal wizard order (3.6a R6: tc → kyc → nominees → medical → payment) all four hold by the
// time the member reaches payment — the gate is DEFENSE-IN-DEPTH against a skipped/partial step.
//
// DB-light read-only PRIMITIVE: NO HTTP, NO audit, NO emission. Tenant-scoped (the caller has set
// `app.pariwar_id`; each accessor also takes `pariwarId` explicitly).

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { consentExists } from '../consent/read.js';
import { getLatestMedicalDisclosure } from '../medical/disclosure-read.js';
import { getMemberNominees } from '../nominee/declaration-read.js';
import { getMemberStateAt } from './read.js';

/**
 * The four pre-payment signup steps the gate echoes for the UI when outstanding (AC2). Payment (e) is
 * NOT in this enum — it is the receipt the handler just wrote (the gate does not re-read it).
 *   · `kyc`      — KYC not completed (the member is not yet in `pending-fee`; Story 3.3b).
 *   · `nominees` — no nominee declared (Story 3.4).
 *   · `medical`  — no medical disclosure recorded (Story 3.5).
 *   · `tc`       — no valid `tc_acceptance` consent (Story 2.7 registry / 3.6a).
 */
export type LockInGateStep = 'kyc' | 'nominees' | 'medical' | 'tc';

export interface LockInGateResult {
  /** True iff ALL four pre-payment facts hold (with the receipt (e), the handler may enter lock-in). */
  satisfied: boolean;
  /** The outstanding step(s) — empty when satisfied; the UI signals which is incomplete. */
  outstanding: LockInGateStep[];
}

/**
 * Evaluate the four pre-payment lock-in conditions for a member at `now`:
 *   (a) the member is in `pending-fee` (KYC completed or manual-fallback recorded — a `pending-kyc`
 *       member has KYC outstanding; anything past `pending-fee` is already locked-in/active, not a
 *       fresh signup), (b) ≥1 nominee, (c) ≥1 medical disclosure, (d) a valid `tc_acceptance` consent.
 *
 * Returns `{ satisfied, outstanding }`. The handler adds (e) the just-persisted receipt and emits the
 * lifecycle events only when `satisfied` (R2). Tenant-scoped.
 */
export async function evaluateLockInGate(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  now: Date,
): Promise<LockInGateResult> {
  const outstanding: LockInGateStep[] = [];

  // (a) KYC done ⇒ state is `pending-fee` (Story 3.3b: kyc_completed / kyc_manual_fallback).
  const state = await getMemberStateAt(db, memberId, now);
  if (state !== 'pending-fee') outstanding.push('kyc');

  // (b) nominee declaration recorded (Story 3.4).
  const nominees = await getMemberNominees(db, pariwarId, memberId);
  if (nominees.length === 0) outstanding.push('nominees');

  // (c) medical disclosure + concealment ack recorded (Story 3.5).
  const medical = await getLatestMedicalDisclosure(db, pariwarId, memberId);
  if (medical === null) outstanding.push('medical');

  // (d) T&C acceptance recorded (Story 2.7 consent registry; subject_id = the member id string).
  const tcAccepted = await consentExists(db, pariwarId, memberId, 'tc_acceptance', now);
  if (!tcAccepted) outstanding.push('tc');

  return { satisfied: outstanding.length === 0, outstanding };
}
