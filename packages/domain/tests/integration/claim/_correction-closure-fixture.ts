// The correction CLOSURE's live-DB FIXTURE — Story 6.19c. Shared by `correction-closure.spec.ts` and
// `correction-closure-shape.spec.ts` (extracted, ⛔ copied: one fixture, so the two specs cannot drift).
//
// ⭐ The clock: every writer takes `now` — a returned claim's family run opens TODAY (day 0), so "day 95" is simply
// `now = 10:00 IST on day 0 + 95`. A person is REACHED by an `accepted` family SMS whose `recipient_number_hash` is their
// CURRENT number's (REAL envelopes, a fake KMS — the production hash).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import {
  CorrectionClosureRefusedError,
  claimCorrectionReminder,
  currentCorrectionNumberHash,
  decideCorrectionClosure,
  decideEscalatedClosure,
  finaliseCorrectionReminder,
  isCorrectionClaimHeld,
  noCorrectionHold,
  readCorrectionRecipients,
  requestCorrectionClosure,
  returnToDistrictAdmin,
  writeCorrectionMark,
  type CorrectionClosureRefusal,
} from '../../../src/claim/index.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  MEMBER_NOMINEE_FIELD_CLASS,
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
  type FieldCryptoDeps,
} from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  driveClaimTo,
  enterAppScope,
  seedNomineeDeclaration,
  seedNomineeNameCheck,
} from '../_helpers.js';

export type Client = ReturnType<typeof getTx>['client'];
export type Tx = ReturnType<typeof getTx>['tx'];

export const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
export const DA = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
export const SA = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
export const HOUR = 3_600_000;

export const KMS = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
export const ENC: FieldCryptoDeps = {
  kms: KMS,
  kekRef: { resourceName: 'fake:correction-closure-kek' },
  hmacKeyRef: { resourceName: 'fake:correction-closure-hmac' },
};

export async function encryptNomineeMobile(plaintext: string): Promise<string> {
  return serializeEnvelope(
    await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, KMS, ENC.kekRef),
  );
}

export const tenAmIst = (date: string) => new Date(`${date}T04:30:00.000Z`);

/** `claimCaseId`'s claim state, read from its row. */
export async function stateOf(tx: Tx, cid: ClaimId): Promise<string> {
  const [row] = await tx.select({ s: schema.claims.currentState }).from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
  return row!.s;
}

export async function eventTypesOf(tx: Tx, cid: ClaimId): Promise<string[]> {
  const rows = await tx
    .select({ t: schema.eventsLog.eventType })
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)))
    .orderBy(schema.eventsLog.eventVersion);
  return rows.map((r) => r.t);
}

export const markInput = (cid: ClaimId, mustAct: 'family' | 'staff', now: Date) => ({
  pariwarId: PARIWAR_A,
  claimCaseId: cid,
  mustAct,
  actorId: DA,
  actorDisplay: 'District Admin One',
  setByRole: 'district_admin' as const,
  noteCiphertext: 'enc:v1:note',
  now,
  hold: isCorrectionClaimHeld,
});

/**
 * A returned claim (verifier_approved, two accounts, a passing check, a determination, a contact record whose
 * claimant IS nominee 1) whose ONE nominee has a REAL mobile; marked `mustAct` at the return. With `timeline`, the
 * return moves to T − 3 h and the accounts + checks to T − 4 h (a later rewrite then lands AFTER the return).
 */
export async function returnedClaim(client: Client, opts: { readonly mustAct?: 'family' | 'staff'; readonly timeline?: boolean } = {}) {
  const { tx } = getTx();
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await driveClaimTo(client, PARIWAR_A, cid, mid, 'verifier_approved');
  await seedNomineeDeclaration(tx, PARIWAR_A, mid, { nominees: [{ mobileCiphertext: await encryptNomineeMobile('9812345678') }] });
  await seedNomineeNameCheck(client, PARIWAR_A, cid);
  const ret = await returnToDistrictAdmin(client, {
    claimCaseId: cid,
    pariwarId: PARIWAR_A,
    reasonCode: 'other',
    rationaleCiphertext: 'enc:v1:return-note',
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    actor: 'trustee',
  });
  const returnId = ret.decision.decisionId as string;
  let returnedAt = ret.decision.decidedAt;
  if (opts.timeline === true) {
    await asSuperuser(client, async () => {
      await client.query(`UPDATE claim_state_trustee_decisions SET decided_at = decided_at - interval '3 hours' WHERE decision_id = $1`, [returnId]);
      await client.query("SET LOCAL session_replication_role = 'replica'");
      await client.query(
        `UPDATE events_log SET occurred_at = occurred_at - interval '4 hours' WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`,
        [cid],
      );
      await client.query("SET LOCAL session_replication_role = 'origin'");
    });
    await tx
      .update(schema.claimNomineeBankAccounts)
      .set({ updatedAt: new Date(returnedAt.getTime() - 4 * HOUR) })
      .where(eq(schema.claimNomineeBankAccounts.claimCaseId, cid));
    returnedAt = new Date(returnedAt.getTime() - 3 * HOUR);
  }
  const w = await writeCorrectionMark(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: cid,
    mustAct: opts.mustAct ?? 'family',
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    setByRole: 'pariwar_admin',
    noteCiphertext: null,
    isReturnMark: true,
    hold: noCorrectionHold,
  });
  const day0 = w.openedRun!.day0;
  const person = (await readCorrectionRecipients(tx, PARIWAR_A, cid)).people[0]!;
  return { cid, mid, returnId, returnedAt, runId: w.openedRun!.runId, day0, person, day: (n: number) => tenAmIst(addCalendarDays(day0, n)) };
}

export type Returned = Awaited<ReturnType<typeof returnedClaim>>;

export async function asSuperuser<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('RESET ROLE');
  try {
    return await fn();
  } finally {
    await enterAppScope(client, PARIWAR_A);
  }
}

/** A family-SMS outcome for the person on `runId` slot `slotDay` — `hash` defaults to their CURRENT number's. */
export async function familyRow(
  tx: Tx,
  c: Returned,
  outcome: 'accepted' | 'rejected_invalid_number' | 'no_target',
  opts: { readonly runId?: string; readonly slotDay?: number; readonly hash?: string | null; readonly sentOn?: string } = {},
) {
  const slotDay = opts.slotDay ?? 1;
  const hash =
    opts.hash !== undefined
      ? opts.hash
      : outcome === 'no_target'
        ? null
        : await currentCorrectionNumberHash(c.person.mobileCiphertext, c.person.mobileSource, PARIWAR_A, ENC);
  const claimed = await claimCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    runId: opts.runId ?? c.runId,
    slotDay,
    recipientKey: c.person.personKey,
    purpose: 'family_sms',
    subjectKey: '',
    sentOn: opts.sentOn ?? addCalendarDays(c.day0, slotDay),
    late: false,
    jobId: `j-${slotDay}-${randomUUID()}`,
    now: new Date(),
  });
  if (claimed.status !== 'claimed') throw new Error('claim');
  const jobId = (await tx.select().from(schema.claimCorrectionReminders).where(eq(schema.claimCorrectionReminders.reminderId, claimed.reminderId)))[0]!
    .claimedByJob!;
  await finaliseCorrectionReminder(tx, {
    pariwarId: PARIWAR_A,
    reminderId: claimed.reminderId,
    jobId,
    outcome,
    recipientVersionId: c.person.versionId,
    recipientNumberHash: hash,
  });
}

/** A returned FAMILY claim whose one person was reached (an accepted SMS to their current number). */
export async function reachedClaim(client: Client, tx: Tx, opts: { readonly timeline?: boolean } = {}) {
  const c = await returnedClaim(client, { mustAct: 'family', ...opts });
  await familyRow(tx, c, 'accepted');
  return c;
}

export const request = (client: Client, c: Returned, now = c.day(95)) =>
  requestCorrectionClosure(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    actorId: DA,
    actorDisplay: 'District Admin One',
    now,
    noteCiphertext: 'enc:v1:request-note',
    crypto: ENC,
  });

export const approve = (client: Client, c: Returned, now = c.day(96)) =>
  decideCorrectionClosure(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    now,
    decision: 'approve',
    noteCiphertext: null,
    decisionRationaleCiphertext: 'enc:v1:closed-for-no-response',
    crypto: ENC,
  });

export const decline = (client: Client, c: Returned, now = c.day(96)) =>
  decideCorrectionClosure(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    now,
    decision: 'decline',
    noteCiphertext: 'enc:v1:decline-note',
  });

export const superAdmin = (client: Client, c: Returned, decision: 'close' | 'refuse' | 'approve', reason: string, now = c.day(100)) =>
  decideEscalatedClosure(client, {
    pariwarId: PARIWAR_A,
    claimCaseId: c.cid,
    actorId: SA,
    actorDisplay: 'Super Admin One',
    now,
    reason,
    noteCiphertext: 'enc:v1:super-admin-note',
    decisionRationaleCiphertext: 'enc:v1:super-admin-rationale',
    ...(decision === 'close'
      ? { decision, crypto: ENC }
      : decision === 'refuse'
        ? { decision, refusalReasonCode: 'documents_insufficient' }
        : { decision }),
  } as Parameters<typeof decideEscalatedClosure>[1]);

export async function expectRefused(p: Promise<unknown>, refusal: CorrectionClosureRefusal): Promise<CorrectionClosureRefusedError> {
  const err = await p.then(
    () => {
      throw new Error(`expected refusal '${refusal}', but it succeeded`);
    },
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(CorrectionClosureRefusedError);
  expect((err as CorrectionClosureRefusedError).refusal).toBe(refusal);
  return err as CorrectionClosureRefusedError;
}

/** The claim's closures rows, oldest first. */
export async function closuresOf(tx: Tx, cid: ClaimId) {
  return tx
    .select()
    .from(schema.claimCorrectionClosures)
    .where(eq(schema.claimCorrectionClosures.claimCaseId, cid))
    .orderBy(schema.claimCorrectionClosures.createdAt);
}

/** Make the claim RESUBMITTED (tier (a)): every account rewritten after the return, then a fresh passing check. */
export async function resubmit(client: Client, tx: Tx, c: Returned) {
  await tx
    .update(schema.claimNomineeBankAccounts)
    .set({ updatedAt: new Date(c.returnedAt.getTime() + HOUR) })
    .where(eq(schema.claimNomineeBankAccounts.claimCaseId, c.cid));
  await seedNomineeNameCheck(client, PARIWAR_A, c.cid, { reuseAccounts: true });
}
