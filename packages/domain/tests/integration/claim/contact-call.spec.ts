// The District Admin's CALL RECORD — the domain, live (Story 6.37c, Task 6; AC7; LD10, LD11). Per-test ROLLBACK
// (setupLiveDb); the claims are 6.19c's returned-claim fixture (REAL envelopes, a fake KMS). Legs: the record (one row,
// its `ladder_id`); every refusal (`reached` needs an answer — and the DB CHECK; a future / before-filing date; ⛔ a
// recipient; D30; LD11's nominee gate, uncleared and cleared); a REACHED call ends the person's RUNNING ladders of BOTH
// chases whose origin is on / before the call — ⛔ a later one, ⛔ another person's, ⛔ on a `not_reached` call; the
// number reveal returns the CURRENT number (after a change, the new one) and honours the nominee gate.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  ContactCallRefusedError,
  listContactCalls,
  readClaimLadders,
  readContactCallNumber,
  recordContactCall,
  type ContactCallRefusal,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import { CLAIM_CONTACT_FIELD_CLASS, encryptTier1, serializeEnvelope } from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope } from '../_helpers.js';
import { asSuperuser, DA, ENC, KMS, returnedClaim, type Client, type Returned, type Tx } from './_correction-closure-fixture.js';

const NOW = new Date();
const TODAY = istDateOf(NOW);

const input = (c: { cid: ReturnType<typeof toClaimId> }, over: Partial<Parameters<typeof recordContactCall>[1]> = {}) => ({
  pariwarId: PARIWAR_A,
  claimCaseId: c.cid,
  chase: 'correction' as const,
  personKey: 'claimant',
  calledOn: TODAY,
  answeredBy: 'the_person' as const,
  outcome: 'reached' as const,
  actorId: DA,
  actorDisplay: 'District Admin One',
  nomineeCallsCleared: false,
  now: NOW,
  ...over,
});

async function expectRefused(p: Promise<unknown>, refusal: ContactCallRefusal): Promise<void> {
  await expect(p).rejects.toBeInstanceOf(ContactCallRefusedError);
  await p.catch((err: ContactCallRefusedError) => expect(err.refusal).toBe(refusal));
}

async function encryptClaimantMobile(plaintext: string): Promise<string> {
  return serializeEnvelope(
    await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: CLAIM_CONTACT_FIELD_CLASS }, KMS, ENC.kekRef),
  );
}

/** Make the claimant a person who is NONE of the nominees (the claimant BLOCK), with a REAL mobile envelope. */
async function withClaimantBlock(tx: Tx, c: Returned, mobile = '9876501234'): Promise<void> {
  await tx
    .update(schema.claimContacts)
    .set({
      claimantNomineeVersionId: null,
      claimantNameCiphertext: 'enc:v1:claimant-name',
      claimantMobileCiphertext: await encryptClaimantMobile(mobile),
      claimantAddressCiphertext: 'enc:v1:claimant-address',
    })
    .where(eq(schema.claimContacts.claimCaseId, c.cid));
}

/** A ladder row, raw (the app role may INSERT — G-a). */
async function ladder(
  client: Client,
  c: Returned,
  over: { chase?: 'correction' | 'certificate'; personKey?: string; originSentOn?: string; state?: 'running' | 'concluded' } = {},
): Promise<string> {
  const chase = over.chase ?? 'correction';
  const origin = over.originSentOn ?? '2026-01-01';
  const due = new Date(Date.parse(`${origin}T00:00:00Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
  const concluded = over.state === 'concluded';
  const { rows } = await client.query<{ ladder_id: string }>(
    // Round 2 P31 — a CONCLUDED ladder resolved both steps (0170's `claim_contact_ladders_concluded_steps_check`): the
    // fixture records them `satisfied` on the due date (⛔ row — a satisfied step may carry none).
    `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
       origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on, state, ended_at, concluded_on,
       sms2_state, sms2_on, sms3_due_on, sms3_state, sms3_on, conclude_on)
     VALUES ($1, $2, $3, $4, $5, $6, 'h', gen_random_uuid(), $7, 'skipped:whatsapp_not_built', $8, $9, $10, $11,
       $12, $13, $13, $12, $13, $13) RETURNING ladder_id`,
    [
      PARIWAR_A,
      c.cid,
      chase,
      c.runId,
      chase === 'correction' ? c.returnId : null,
      over.personKey ?? 'claimant',
      origin,
      due,
      concluded ? 'concluded_undelivered' : 'running',
      concluded ? new Date() : null,
      concluded ? due : null,
      concluded ? 'satisfied' : 'pending',
      concluded ? due : null,
    ],
  );
  return rows[0]!.ladder_id;
}

async function stateOfLadder(client: Client, ladderId: string): Promise<{ state: string; end_detail: string | null }> {
  const { rows } = await client.query<{ state: string; end_detail: string | null }>(
    `SELECT state, end_detail FROM claim_contact_ladders WHERE ladder_id = $1`,
    [ladderId],
  );
  return rows[0]!;
}

describe.skipIf(!hasDatabase)('Story 6.37c — the call record (domain, live)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ a claimant call is ONE row (a role, a date, an outcome — ⛔ a number or name), listed; `ladder_id` the person\'s running ladder, else their latest concluded one, else null', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const first = await recordContactCall(client, input(c, { outcome: 'not_reached', answeredBy: 'nobody' }));
    expect(first.call).toMatchObject({ personKey: 'claimant', chase: 'correction', calledOn: TODAY, answeredBy: 'nobody', outcome: 'not_reached', ladderId: null });
    expect(first.call.recordedByDisplay).toBe('District Admin One');
    expect(first.endedLadderIds).toEqual([]);
    const concluded = await ladder(client, c, { state: 'concluded' });
    const second = await recordContactCall(client, input(c, { outcome: 'not_reached', answeredBy: 'someone_else' }));
    expect(second.call.ladderId).toBe(concluded);
    const running = await ladder(client, c, { originSentOn: '2026-02-01' });
    const third = await recordContactCall(client, input(c, { outcome: 'not_reached', answeredBy: 'nobody' }));
    expect(third.call.ladderId).toBe(running);
    // Round 2 P34 — EXACTLY these three, oldest first (same `called_on` ⇒ `created_at`, a `clock_timestamp()`).
    expect((await listContactCalls(tx, PARIWAR_A, c.cid)).map((x) => x.callId)).toEqual([first.call.callId, second.call.callId, third.call.callId]);
  });

  it('`reached` only when the person or a family member answered — the writer refuses, and so does the DB CHECK', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    await expectRefused(recordContactCall(client, input(c, { answeredBy: 'nobody' })), 'reached_needs_answer');
    await expectRefused(recordContactCall(client, input(c, { answeredBy: 'someone_else' })), 'reached_needs_answer');
    expect((await recordContactCall(client, input(c, { answeredBy: 'family_member' }))).call.outcome).toBe('reached');
    await client.query('SAVEPOINT direct');
    await expect(
      client.query(
        `INSERT INTO claim_contact_calls (pariwar_id, claim_case_id, person_key, chase, called_on, answered_by, outcome, recorded_by_actor, recorded_by_display)
         VALUES ($1, $2, 'claimant', 'correction', $3, 'nobody', 'reached', 'da', 'D')`,
        [PARIWAR_A, c.cid, TODAY],
      ),
    ).rejects.toMatchObject({ code: '23514', constraint: 'claim_contact_calls_reached_answered_check' });
    await client.query('ROLLBACK TO SAVEPOINT direct');
  });

  it('a call date later than today, or before the claim was filed, is refused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const tomorrow = istDateOf(new Date(NOW.getTime() + 86_400_000));
    await expectRefused(recordContactCall(client, input(c, { calledOn: tomorrow })), 'called_on_in_future');
    await expectRefused(recordContactCall(client, input(c, { calledOn: '2000-01-01' })), 'called_on_before_filing');
  });

  // Review P4 — the boundaries (`calledOn === today`, `calledOn === filedOn`) are INCLUSIVE: both must be ACCEPTED.
  it('a call dated exactly today, or exactly the day the claim was filed, is ACCEPTED — ⛔ refused', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const filedTwoDaysAgo = istDateOf(new Date(NOW.getTime() - 2 * 86_400_000));
    await asSuperuser(client, async () => {
      await client.query("SET LOCAL session_replication_role = 'replica'");
      await client.query(`UPDATE claims SET created_at = $2 WHERE claim_case_id = $1`, [c.cid, `${filedTwoDaysAgo}T00:00:00Z`]);
      await client.query("SET LOCAL session_replication_role = 'origin'");
    });
    // The lower (inclusive) boundary: calledOn === the (now backdated) filing date.
    await expect(recordContactCall(client, input(c, { calledOn: filedTwoDaysAgo, outcome: 'not_reached', answeredBy: 'nobody' }))).resolves.toBeDefined();
    // The upper (inclusive) boundary: calledOn === today.
    await expect(recordContactCall(client, input(c, { calledOn: TODAY, outcome: 'not_reached', answeredBy: 'nobody' }))).resolves.toBeDefined();
  });

  it('a person ⛔ on the chase\'s recipient set is refused; D30 — ⛔ a contact record (certificate) / an undetermined declaration (correction) / an agreement ⛔ live', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    await expectRefused(recordContactCall(client, input(c, { personKey: `nominee:${randomUUID()}`, nomineeCallsCleared: true })), 'not_a_recipient');
    await expectRefused(
      recordContactCall(client, input(c, { chase: 'certificate', personKey: `nominee:${randomUUID()}`, nomineeCallsCleared: true })),
      'not_a_recipient',
    );
    // A claim with ⛔ contact record and ⛔ determination.
    const bare = toClaimId(randomUUID());
    await driveClaimTo(client, PARIWAR_A, bare, toMemberId(randomUUID()), 'verification_in_progress');
    await expectRefused(recordContactCall(client, input({ cid: bare }, { chase: 'certificate' })), 'no_contact_record');
    await expectRefused(recordContactCall(client, input({ cid: bare })), 'undetermined');
    // The agreement withdrawn.
    const [contact] = await tx.select().from(schema.claimContacts).where(eq(schema.claimContacts.claimCaseId, c.cid));
    await tx
      .update(schema.consentRecords)
      .set({ revokedAt: new Date() })
      .where(eq(schema.consentRecords.consentId, contact!.agreementConsentId));
    await expectRefused(recordContactCall(client, input(c)), 'agreement_not_live');
    await expectRefused(recordContactCall(client, input(c, { chase: 'certificate' })), 'agreement_not_live');
  });

  it('⭐ LD11 — a NOMINEE is refused `nominee_calls_not_cleared` while the switch is off, on BOTH chases, and recorded once it is on', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client); // the fixture's claimant IS nominee 1 ⇒ the one person is a nominee
    const nominee = c.person.personKey;
    expect(nominee.startsWith('nominee:')).toBe(true);
    await expectRefused(recordContactCall(client, input(c, { personKey: nominee })), 'nominee_calls_not_cleared');
    await expectRefused(recordContactCall(client, input(c, { personKey: nominee, chase: 'certificate' })), 'nominee_calls_not_cleared');
    expect((await recordContactCall(client, input(c, { personKey: nominee, nomineeCallsCleared: true }))).call.personKey).toBe(nominee);
    expect(
      (await recordContactCall(client, input(c, { personKey: nominee, chase: 'certificate', nomineeCallsCleared: true }))).call.chase,
    ).toBe('certificate');
  });

  // Round 2 P34 — the title named "a later one" the body never built (a LATER origin is the next leg's).
  it('⭐ a REACHED call ENDS the person\'s RUNNING ladders of BOTH chases whose origin is on / before the call — ⛔ another person\'s, ⛔ a concluded one', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const corr = await ladder(client, c, { chase: 'correction', originSentOn: '2026-01-01' });
    const cert = await ladder(client, c, { chase: 'certificate', originSentOn: TODAY });
    const otherPerson = await ladder(client, c, { chase: 'correction', personKey: 'nominee:other', originSentOn: '2026-01-01' });
    const concluded = await ladder(client, c, { chase: 'certificate', originSentOn: '2026-03-01', state: 'concluded' });
    const out = await recordContactCall(client, input(c, { chase: 'certificate' }));
    expect([...out.endedLadderIds].sort()).toEqual([corr, cert].sort());
    expect(await stateOfLadder(client, corr)).toEqual({ state: 'ended_call', end_detail: 'call_reached' });
    expect(await stateOfLadder(client, cert)).toEqual({ state: 'ended_call', end_detail: 'call_reached' });
    expect((await stateOfLadder(client, otherPerson)).state).toBe('running');
    expect((await stateOfLadder(client, concluded)).state).toBe('concluded_undelivered');
  });

  // Round 2 P19 — after the correction closure SUPERSEDES the return there is ⛔ live return; the call's ladder reads
  // are scoped to the claim's LATEST RETURN (by `decided_at`), ⛔ every return (round 1's D10 read `undefined` as "never
  // returned" and read unscoped) and ⛔ the latest LADDER's return (fix-diff review: the stray ladder below is created
  // LAST, on a return that is ⛔ the claim's latest — scoping by the latest ladder would pick it).
  it('⭐ ⛔ live return (superseded at closure) ⇒ scoped to the claim\'s LATEST return — a ladder of ANOTHER return, even the newest ladder, is ⛔ attributed or ended', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const concluded = await ladder(client, c, { state: 'concluded' });
    const { rows } = await client.query<{ ladder_id: string }>(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
         origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
       VALUES ($1, $2, 'correction', $3, gen_random_uuid(), 'claimant', 'h', gen_random_uuid(), '2026-01-01', 'skipped:whatsapp_not_built', '2026-01-03')
       RETURNING ladder_id`,
      [PARIWAR_A, c.cid, c.runId],
    );
    const otherReturnRunning = rows[0]!.ladder_id;
    await asSuperuser(client, () =>
      client.query(`UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE decision_id = $1`, [c.returnId]),
    );
    const out = await recordContactCall(client, input(c));
    expect(out.call.ladderId).toBe(concluded);
    expect(out.endedLadderIds).toEqual([]);
    expect((await stateOfLadder(client, otherReturnRunning)).state).toBe('running');
  });

  it('a call EARLIER than a ladder\'s origin ends ⛔ it; a `not_reached` call ends ⛔ ladder', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    await withClaimantBlock(tx, c);
    const future = await ladder(client, c, { originSentOn: '2099-01-01' });
    expect((await recordContactCall(client, input(c))).endedLadderIds).toEqual([]);
    expect((await stateOfLadder(client, future)).state).toBe('running');
    const now = await ladder(client, c, { chase: 'certificate', originSentOn: '2026-01-01' });
    expect((await recordContactCall(client, input(c, { outcome: 'not_reached', answeredBy: 'family_member' }))).endedLadderIds).toEqual([]);
    expect((await stateOfLadder(client, now)).state).toBe('running');
    expect((await readClaimLadders(tx, PARIWAR_A, c.cid, 'certificate')).find((l) => l.ladderId === now)!.state).toBe('running');
  });

  it('⭐ the reveal returns the person\'s CURRENT number — after a change, the NEW one — and honours the nominee gate', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const c = await returnedClaim(client);
    const reveal = (personKey: string, cleared = false, chase: 'correction' | 'certificate' = 'correction') =>
      readContactCallNumber(tx, { pariwarId: PARIWAR_A, claimCaseId: c.cid, chase, personKey, nomineeCallsCleared: cleared, crypto: ENC });
    await expectRefused(reveal(c.person.personKey), 'nominee_calls_not_cleared');
    expect((await reveal(c.person.personKey, true)).e164).toBe('+919812345678');
    expect((await reveal(c.person.personKey, true, 'certificate')).e164).toBe('+919812345678');
    await withClaimantBlock(tx, c, '9876501234');
    expect((await reveal('claimant')).e164).toBe('+919876501234');
    await tx
      .update(schema.claimContacts)
      .set({ claimantMobileCiphertext: await encryptClaimantMobile('9123456780') })
      .where(eq(schema.claimContacts.claimCaseId, c.cid));
    expect((await reveal('claimant')).e164).toBe('+919123456780');
  });
});
