// The certificate reminder's ADMIN LIST (`certificate-reminder-read.ts`) against the live DB — Story 6.19d code
// review (2026-10-03). Closes the zero-coverage gap for `listCertificateReminderClaims` and `readCertificateListItem`
// — neither had a single test anywhere in the domain suite. Covers: the basic shape, every `smsState` derivation,
// `nextReminderOn`'s "today is due" and "the run is ending/restarting" cases (both patched by this same review pass),
// the `NEVER_REENTERS` listing gate, and the scan cap's `truncated` flag (also patched this pass).
// Per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  beginCertificateFamilySend,
  finaliseCertificateReminder,
  hashCertificateRecipients,
  istDateOf,
  lockCertificateClaim,
  openCertificateRun,
  planCertificateRun,
  projectClaimState,
  readCertificateListItem,
  readCertificatePlanFacts,
  readCertificateRecipients,
  recordCertificateLetter,
  recordCertificateLetterDelivery,
  listCertificateReminderClaims,
  type CertificateRunPlan,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  MEMBER_NOMINEE_FIELD_CLASS,
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
  type FieldCryptoDeps,
} from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  enterAppScope,
  seedClaim,
  seedClaimContact,
  seedEvent,
  seedNomineeDeclaration,
  seedRejectedDeathCertificate,
} from '../_helpers.js';

const PID = toPariwarId(PARIWAR_A);
const KMS = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const ENC: FieldCryptoDeps = {
  kms: KMS,
  kekRef: { resourceName: 'fake:certificate-kek' },
  hmacKeyRef: { resourceName: 'fake:certificate-hmac' },
};
async function encryptNomineeMobile(plaintext: string): Promise<string> {
  return serializeEnvelope(
    await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, KMS, ENC.kekRef),
  );
}
const TODAY = () => istDateOf(new Date());

type Client = ReturnType<typeof getTx>['client'];

async function seedMissingWindowClaim(client: Client, opts: { readonly mobiles?: readonly [string, string]; readonly daysAgo?: number } = {}) {
  const { tx } = getTx();
  const member = randomUUID();
  const nominees = opts.mobiles
    ? await Promise.all(opts.mobiles.map(async (m) => ({ mobileCiphertext: await encryptNomineeMobile(m) })))
    : [{}, {}];
  await seedNomineeDeclaration(tx, PARIWAR_A, member, { nominees });
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(await seedClaim(tx, PARIWAR_A, { deceasedMemberId: member, currentState: 'verifier_review' }));
  const day0 = addCalendarDays(TODAY(), -(opts.daysAgo ?? 1));
  await seedEvent(tx, PARIWAR_A, { streamId: cid, eventType: 'claim.peer_mesh_pinged', eventVersion: 3, occurredAt: new Date(`${day0}T12:00:00Z`) });
  return { cid, member };
}

async function planNow(client: Client, cid: ReturnType<typeof toClaimId>, today: string = TODAY()): Promise<CertificateRunPlan> {
  const facts = await readCertificatePlanFacts(bindScopedDb(client), PID, cid);
  return planCertificateRun(facts!, today);
}

async function openUnderLock(client: Client, cid: ReturnType<typeof toClaimId>, plan: CertificateRunPlan, today: string = TODAY()) {
  if (plan.kind !== 'open') throw new Error(`expected an open plan, got ${plan.kind}`);
  await lockCertificateClaim(bindScopedDb(client), PID, cid);
  return openCertificateRun(client, { pariwarId: PID, claimCaseId: cid, plan, today });
}

/**
 * A properly event-sourced claim (⛔ not `seedMissingWindowClaim`'s raw path): `projectClaimState` RE-DERIVES state
 * from events_log, so a raw-seeded claim collapses to `intake_pending` the moment a second transition is projected
 * onto it. Use this for any test that transitions the claim's state AFTER the run is opened.
 */
async function seedCheckedClaim(client: Client, opts: { readonly mobiles?: readonly [string, string] } = {}) {
  const { tx } = getTx();
  const member = randomUUID();
  const nominees = opts.mobiles
    ? await Promise.all(opts.mobiles.map(async (m) => ({ mobileCiphertext: await encryptNomineeMobile(m) })))
    : [{}, {}];
  await seedNomineeDeclaration(tx, PARIWAR_A, member, { nominees });
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(randomUUID());
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(member),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: member, intake_channel: 'member_app', claimant_actor_id: null });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  return { cid, member };
}

/** A `missing` run opened `daysAgo` back (default 1 ⇒ runDay 1 today), with a contact record + recipients. */
async function openMissingRun(client: Client, opts: { readonly mobiles?: readonly [string, string]; readonly daysAgo?: number } = {}) {
  const { cid, member } = await seedMissingWindowClaim(client, opts);
  await seedClaimContact(client, PARIWAR_A, cid);
  const opened = await openUnderLock(client, cid, await planNow(client, cid));
  if (opened.status !== 'opened') throw new Error('run not opened');
  const people = (await readCertificateRecipients(bindScopedDb(client), PID, cid)).people;
  const hashes = await hashCertificateRecipients(people, PARIWAR_A, ENC);
  return { cid, member, runId: opened.run.runId, people, hashes, a: people[0]!, b: people[1]! };
}

function sendInput(c: Awaited<ReturnType<typeof openMissingRun>>, personKey: string, slotDay = 1) {
  return {
    pariwarId: PID,
    claimCaseId: c.cid,
    runId: c.runId,
    slotDay,
    personKey,
    sentOn: TODAY(),
    late: false,
    jobId: 'job-1',
    now: new Date(),
    prelock: { people: c.people, hashes: c.hashes },
  };
}

describe.skipIf(!hasDatabase)('the certificate reminder — admin LIST (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ the basic shape: cause, runState `open`, runDay, `nextReminderOn`, people with position/role', async () => {
    const { client } = getTx();
    const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
    const item = await readCertificateListItem(bindScopedDb(client), PID, c.cid, TODAY());
    expect(item).toMatchObject({ cause: 'missing', runState: 'open', runDay: 1 });
    expect(item!.nextReminderOn).toBe(TODAY()); // day 1 is itself scheduled and due today (the `>=` fix)
    expect(item!.people.map((p) => p.position).sort()).toEqual(['A', 'B']);
    expect(item!.people.every((p) => p.smsState === 'not_yet_reminded')).toBe(true);
  });

  it('⭐ `nextReminderOn` uses `>=`, ⛔ not `>` — a slot due TODAY still reads as next (the sweep may not have run yet)', async () => {
    const { client } = getTx();
    // day0 two days back ⇒ today's runDay is 2, which is itself a scheduled day (CORRECTION_REMINDER_DAYS has 2).
    const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'], daysAgo: 2 });
    const item = await readCertificateListItem(bindScopedDb(client), PID, c.cid, TODAY());
    expect(item!.runDay).toBe(2);
    expect(item!.nextReminderOn).toBe(TODAY());
  });

  describe('smsState — every outcome bucket', () => {
    const cases: readonly [string, string | null][] = [
      ['accepted', 'reminded'],
      ['rejected_invalid_number', 'number_not_working'],
      ['rejected_unreachable', 'unreachable'],
      ['no_target', 'no_number'],
      ['error', 'not_sent'],
    ];
    for (const [outcome, expected] of cases) {
      it(`⭐ outcome '${outcome}' ⇒ smsState '${expected}'`, async () => {
        const { client } = getTx();
        const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
        const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
        if (sent.kind !== 'send') throw new Error('expected a send');
        if (outcome === 'error') {
          await client.query(`UPDATE claim_certificate_reminders SET outcome = 'error', detail = 'x' WHERE reminder_id = $1`, [sent.reminderId]);
        } else {
          await finaliseCertificateReminder(bindScopedDb(client), {
            pariwarId: PID,
            reminderId: sent.reminderId,
            jobId: 'job-1',
            outcome: outcome as 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'error',
          });
        }
        const item = await readCertificateListItem(bindScopedDb(client), PID, c.cid, TODAY());
        const person = item!.people.find((p) => p.personKey === c.a.personKey)!;
        expect(person.smsState).toBe(expected);
      });
    }

    it("⭐ a delivered letter at the CURRENT number ⇒ 'letter_delivered_no_sms' (overrides any SMS outcome)", async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await client.query(
        `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
         VALUES ($1, $2, $3, 1, $4, $5, 'family_sms', 'rejected_invalid_number', $6)`,
        [c.runId, c.cid, PARIWAR_A, TODAY(), c.a.personKey, (c.hashes.get(c.a.personKey) as { hash: string }).hash],
      );
      const letter = await recordCertificateLetter(
        client,
        { pariwarId: PID, claimCaseId: c.cid, personKey: c.a.personKey, postedOn: TODAY(), trackingNumberCiphertext: 'enc:v1:track', actorId: randomUUID(), actorDisplay: 'Test District Admin' },
        { crypto: ENC },
      );
      await recordCertificateLetterDelivery(client, {
        pariwarId: PID,
        claimCaseId: c.cid,
        letterId: letter.letterId,
        deliveredOn: TODAY(),
        screenshotStorageKey: `k/${letter.letterId}`,
        screenshotContentType: 'image/png',
        screenshotSizeBytes: 10,
        actorId: randomUUID(),
        actorDisplay: 'Test District Admin',
      });
      const item = await readCertificateListItem(bindScopedDb(client), PID, c.cid, TODAY());
      const person = item!.people.find((p) => p.personKey === c.a.personKey)!;
      expect(person.smsState).toBe('letter_delivered_no_sms');
      expect(person.letter).toMatchObject({ letterId: letter.letterId, deliveredOn: TODAY() });
    });
  });

  it('⛔ NEVER_REENTERS — paused in `state_trustee_approved` with ⛔ no letter owed is ⛔ not listed; a letter owed keeps it listed', async () => {
    const { client } = getTx();
    const { cid, member } = await seedCheckedClaim(client, { mobiles: ['9876543210', '9123456789'] });
    await seedClaimContact(client, PARIWAR_A, cid);
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const opened = await openUnderLock(client, cid, await planNow(client, cid));
    if (opened.status !== 'opened') throw new Error('run not opened');
    const people = (await readCertificateRecipients(bindScopedDb(client), PID, cid)).people;
    const hashes = await hashCertificateRecipients(people, PARIWAR_A, ENC);
    const a = people[0]!;
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(member),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.r9_outcome',
      payload: {
        from_state: 'verifier_review',
        to_state: 'state_trustee_approved',
        trigger: 'test',
        actor: 'system',
        outcome: 'approved',
        clause_id: 'c1',
        clause_version_id: randomUUID(),
        voting_requirement: 'majority',
        approve_count: 3,
        deny_count: 0,
      },
      actorId: null,
    });
    expect(await readCertificateListItem(bindScopedDb(client), PID, cid, TODAY())).toBeNull();
    // A dead-number row makes `a` letter-eligible (owed, unrecorded) ⇒ the claim is listed again despite the state.
    await client.query(
      `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
       VALUES ($1, $2, $3, 1, $4, $5, 'family_sms', 'rejected_invalid_number', $6)`,
      [opened.run.runId, cid, PARIWAR_A, TODAY(), a.personKey, (hashes.get(a.personKey) as { hash: string }).hash],
    );
    const item = await readCertificateListItem(bindScopedDb(client), PID, cid, TODAY());
    expect(item).not.toBeNull();
    expect(item!.people.find((p) => p.personKey === a.personKey)?.letterEligible).toBe(true);
  });

  it('⛔ `runDay`/`nextReminderOn` are `null` when the plan says `end` — the run is still open in the DB but ending next sweep', async () => {
    const { client } = getTx();
    // `day0` can ⛔ never be rewritten after the fact (0137: twt_app's grant is column-narrowed to `ended_at`/
    // `end_reason`) — so instead, OPEN the run as if "today" were day 100 of a window entered 185 days back
    // (well within the 180-day horizon ⇒ `completeAtOnce: false`, a normal ongoing `ended_at IS NULL` row), then
    // READ it with the REAL today, 185 days past day0 — past the horizon, so the plan now says `end: completed`
    // while the DB row is still open (the next sweep hasn't processed it yet).
    const { cid } = await seedMissingWindowClaim(client, { mobiles: ['9876543210', '9123456789'], daysAgo: 185 });
    await seedClaimContact(client, PARIWAR_A, cid);
    const day0 = addCalendarDays(TODAY(), -185);
    const fakeOpenToday = addCalendarDays(day0, 100);
    const opened = await openUnderLock(client, cid, await planNow(client, cid, fakeOpenToday), fakeOpenToday);
    if (opened.status !== 'opened') throw new Error('run not opened');
    expect(opened.run.endedAt).toBeNull();
    const item = await readCertificateListItem(bindScopedDb(client), PID, cid, TODAY());
    expect(item).toMatchObject({ runState: 'open', runDay: null, nextReminderOn: null });
  });

  it('⭐ `listCertificateReminderClaims` sets `truncated` exactly when the scan hits its limit', async () => {
    const { client } = getTx();
    await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
    await openMissingRun(client, { mobiles: ['9000000001', '9000000002'] });
    await expect(listCertificateReminderClaims(bindScopedDb(client), PID, TODAY(), { limit: 1 })).resolves.toMatchObject({ truncated: true });
    const full = await listCertificateReminderClaims(bindScopedDb(client), PID, TODAY(), { limit: 5 });
    expect(full.truncated).toBe(false);
    expect(full.items).toHaveLength(2);
  });
});
