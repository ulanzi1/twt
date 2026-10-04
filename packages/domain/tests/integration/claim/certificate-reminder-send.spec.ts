// The certificate reminder's SEND/CLAIM/FINALIZE state machine against the live DB — Story 6.19d code review
// (2026-10-03). Closes the zero-coverage gap found for `claimCertificateReminder`, `beginCertificateFamilySend`,
// `skipCertificateReminder`, `finaliseCertificateReminder`, `expireOwnCertificateReminder`,
// `noteCertificateReminderTransient` and `recordCertificateHashFailure` — none of the seven had a single test
// anywhere in the domain suite. Covers the golden send path, every `beginCertificateFamilySend` skip/noop branch,
// the lease-based re-claim (same job at once, another job after the lease), the lost-CAS `false` returns, and the
// hash-failure final row. ⛔ Not the two concurrent-connection races (child vs review writer, child vs OCR job) —
// those are tracked separately in `deferred-work.md`, matching the story's own self-disclosed gap.
// Per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CertificateRecipientsMovedError,
  type CertificateReminderKey,
  claimCertificateReminder,
  expireOwnCertificateReminder,
  finaliseCertificateReminder,
  hashCertificateRecipients,
  istDateOf,
  lockCertificateClaim,
  noteCertificateReminderTransient,
  openCertificateRun,
  planCertificateRun,
  projectClaimState,
  readCertificatePlanFacts,
  readCertificateReminder,
  readCertificateRecipients,
  recordCertificateHashFailure,
  recordCertificateLetter,
  recordCertificateLetterDelivery,
  skipCertificateReminder,
  type CertificateRunPlan,
  beginCertificateFamilySend,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  MEMBER_NOMINEE_FIELD_CLASS,
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
  type FieldCryptoDeps,
} from '../../../src/encryption/index.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
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

/** A `missing`-cause claim: the window entry (`claim.peer_mesh_pinged`) is backdated so day0 is `daysAgo` IST days back. */
async function seedMissingWindowClaim(
  client: Client,
  opts: { readonly mobiles?: readonly [string, string]; readonly daysAgo?: number } = {},
) {
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

/**
 * A `rejected`-cause claim driven through the REAL event-sourced transitions (`seedClaim`'s `app.claim_state_writer`
 * escape hatch backs only a BARE row — `projectClaimState` re-derives from events_log, so a raw-seeded claim with no
 * real history collapses to `intake_pending` the moment anything calls it again). Use this, ⛔ not
 * `seedMissingWindowClaim`, for any test that transitions the claim's state a SECOND time after opening the run.
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

async function planNow(client: Client, cid: ReturnType<typeof toClaimId>): Promise<CertificateRunPlan> {
  const facts = await readCertificatePlanFacts(bindScopedDb(client), PID, cid);
  return planCertificateRun(facts!, TODAY());
}

async function openUnderLock(client: Client, cid: ReturnType<typeof toClaimId>, plan: CertificateRunPlan) {
  if (plan.kind !== 'open') throw new Error(`expected an open plan, got ${plan.kind}`);
  await lockCertificateClaim(bindScopedDb(client), PID, cid);
  return openCertificateRun(client, { pariwarId: PID, claimCaseId: cid, plan, today: TODAY() });
}

/** A `missing` run opened `daysAgo` back (default 1, so today's `runDay` is the first scheduled slot, day 1). */
async function openMissingRun(client: Client, opts: { readonly mobiles?: readonly [string, string]; readonly daysAgo?: number } = {}) {
  const { cid, member } = await seedMissingWindowClaim(client, opts);
  await seedClaimContact(client, PARIWAR_A, cid);
  const opened = await openUnderLock(client, cid, await planNow(client, cid));
  if (opened.status !== 'opened') throw new Error('run not opened');
  const people = (await readCertificateRecipients(bindScopedDb(client), PID, cid)).people;
  const hashes = await hashCertificateRecipients(people, PARIWAR_A, ENC);
  return { cid, member, runId: opened.run.runId, people, hashes, a: people[0]!, b: people[1]! };
}

/** A dead-number row for `personKey` at the number whose keyed hash is `hash` (letter-eligibility's own precondition). */
async function deadRow(client: Client, cid: string, runId: string, personKey: string, hash: string, slotDay = 1) {
  await client.query(
    `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
     VALUES ($1, $2, $3, $4, $5, $6, 'family_sms', 'rejected_invalid_number', $7)`,
    [runId, cid, PARIWAR_A, slotDay, TODAY(), personKey, hash],
  );
}

function sendInput(
  c: Awaited<ReturnType<typeof openMissingRun>>,
  personKey: string,
  overrides: Partial<Parameters<typeof beginCertificateFamilySend>[1]> = {},
) {
  return {
    pariwarId: PID,
    claimCaseId: c.cid,
    runId: c.runId,
    slotDay: 1,
    personKey,
    sentOn: TODAY(),
    late: false,
    jobId: 'job-1',
    now: new Date(),
    prelock: { people: c.people, hashes: c.hashes },
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('the certificate reminder — send/claim/finalize state machine (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('beginCertificateFamilySend', () => {
    it('⭐ sends to the sole eligible recipient on a due slot (day0 yesterday ⇒ runDay 1 today)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const result = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      expect(result.kind).toBe('send');
      if (result.kind !== 'send') throw new Error('unreachable');
      expect(result.person.personKey).toBe(c.a.personKey);
      expect(result.attemptCount).toBe(1);
      const row = await readCertificateReminder(bindScopedDb(client), {
        pariwarId: PID,
        claimCaseId: c.cid,
        runId: c.runId,
        slotDay: 1,
        recipientKey: c.a.personKey,
        purpose: 'family_sms',
        subjectKey: '',
      });
      expect(row).toMatchObject({ outcome: 'attempting', claimedByJob: 'job-1' });
    });

    it('⛔ skip `not_due` — slot 0 (before day 1) and a slot past the plan\'s runDay are both refused', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await expect(beginCertificateFamilySend(client, sendInput(c, c.a.personKey, { slotDay: 0 }))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'not_due',
      });
      await expect(beginCertificateFamilySend(client, sendInput(c, c.a.personKey, { slotDay: 2 }))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'not_due',
      });
    });

    it('⛔ skip `not_a_recipient` — a key off the record', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await expect(beginCertificateFamilySend(client, sendInput(c, 'claimant'))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'not_a_recipient',
      });
    });

    it('⛔ skip `letter_delivered` — a delivered letter at the CURRENT number stops the text (`-250` #1)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      // Letter-eligibility's own precondition: a dead outcome of the CURRENT number (sibling spec's `deadRow`).
      await deadRow(client, c.cid, c.runId, c.a.personKey, (c.hashes.get(c.a.personKey) as { hash: string }).hash);
      const letter = await recordCertificateLetter(
        client,
        {
          pariwarId: PID,
          claimCaseId: c.cid,
          personKey: c.a.personKey,
          postedOn: TODAY(),
          trackingNumberCiphertext: 'enc:v1:track',
          actorId: randomUUID(),
          actorDisplay: 'Test District Admin',
        },
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
      await expect(beginCertificateFamilySend(client, sendInput(c, c.a.personKey))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'letter_delivered',
      });
    });

    it('⭐ CR6 `same_number_in_slot` — the LOWER-keyed person at a shared number blocks the higher; a row already there blocks EITHER', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9876543210'] });
      // `a` is the lower key (people is personKey-ordered) and hasn't sent yet ⇒ `b` is blocked by `lower`.
      await expect(beginCertificateFamilySend(client, sendInput(c, c.b.personKey))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'same_number_in_slot',
      });
      // `a` sends and is accepted ⇒ a row now carries the shared hash for this run+slot.
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      await finaliseCertificateReminder(bindScopedDb(client), { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', outcome: 'accepted' });
      // `b` is STILL blocked by `lower` (⚠ `lower` ignores whether `a` sent — code review round 2 corrected this
      // comment, which said `taken`); `taken` alone is isolated in the next test.
      await expect(beginCertificateFamilySend(client, sendInput(c, c.b.personKey))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'same_number_in_slot',
      });
    });

    it('⭐ CR6 `taken` ALONE — a HIGHER-keyed person\'s row at the shared number blocks the LOWER one (`lower` is false)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9876543210'] });
      const shared = (c.hashes.get(c.a.personKey) as { hash: string }).hash;
      expect((c.hashes.get(c.b.personKey) as { hash: string }).hash).toBe(shared);
      // `b` (the HIGHER key) already has this slot's row at the shared number — e.g. a child that ran first on a
      // fail-open hash. ⛔ Nobody is lower than `a`, so only `taken` can refuse it.
      await deadRow(client, c.cid, c.runId, c.b.personKey, shared);
      await expect(beginCertificateFamilySend(client, sendInput(c, c.a.personKey))).resolves.toMatchObject({
        kind: 'skipped',
        reason: 'same_number_in_slot',
      });
    });

    it('⛔ `no_target` — a vacated head (⛔ no sendable number) is recorded WITHOUT a send', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      // A hash map reporting ⛔ no number for `a` (the vacated-head / malformed-number shape).
      const hashes = new Map(c.hashes);
      hashes.set(c.a.personKey, { hash: null });
      const result = await beginCertificateFamilySend(client, { ...sendInput(c, c.a.personKey), prelock: { people: c.people, hashes } });
      expect(result).toEqual({ kind: 'no_target' });
      const row = await readCertificateReminder(bindScopedDb(client), {
        pariwarId: PID,
        claimCaseId: c.cid,
        runId: c.runId,
        slotDay: 1,
        recipientKey: c.a.personKey,
        purpose: 'family_sms',
        subjectKey: '',
      });
      expect(row).toMatchObject({ outcome: 'no_target', recipientNumberHash: null });
    });

    it('⛔ `noop: paused` — outside the review window', async () => {
      const { client } = getTx();
      // A properly event-sourced claim (⛔ not the raw `seedMissingWindowClaim` path): `projectClaimState`
      // RE-DERIVES state from events_log, so a raw-seeded claim would collapse to `intake_pending` the moment
      // a second transition is projected onto it, masking what this test means to prove.
      const { cid, member } = await seedCheckedClaim(client, { mobiles: ['9876543210', '9123456789'] });
      await seedClaimContact(client, PARIWAR_A, cid);
      await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
      const opened = await openUnderLock(client, cid, await planNow(client, cid));
      if (opened.status !== 'opened') throw new Error('run not opened');
      const people = (await readCertificateRecipients(bindScopedDb(client), PID, cid)).people;
      const hashes = await hashCertificateRecipients(people, PARIWAR_A, ENC);
      const c = { cid, member, runId: opened.run.runId, people, hashes, a: people[0]!, b: people[1]! };
      // `verifier_review` → `state_trustee_approved` (`claim.r9_outcome`, outcome `approved`) — OUTSIDE
      // `CLAIM_REVIEW_WINDOW_STATES`, through the REAL projector (claim state is ⛔ never a raw write).
      await projectClaimState(client, {
        claimCaseId: c.cid,
        pariwarId: PARIWAR_A,
        deceasedMemberId: toMemberId(c.member),
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
      await expect(beginCertificateFamilySend(client, sendInput(c, c.a.personKey))).resolves.toEqual({ kind: 'noop', reason: 'paused' });
    });

    it('⛔ `CertificateRecipientsMovedError` — the prelock snapshot no longer matches the record under the lock', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await expect(
        beginCertificateFamilySend(client, { ...sendInput(c, c.a.personKey), prelock: { people: [], hashes: c.hashes } }),
      ).rejects.toBeInstanceOf(CertificateRecipientsMovedError);
    });
  });

  describe('claimCertificateReminder — the lease-based compare-and-set', () => {
    function key(c: Awaited<ReturnType<typeof openMissingRun>>, personKey: string): CertificateReminderKey {
      return { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, recipientKey: personKey, purpose: 'family_sms', subjectKey: '' };
    }

    it('⭐ a fresh claim, then the SAME job re-claiming at once increments `attemptCount`', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const db = bindScopedDb(client);
      const hash = (c.hashes.get(c.a.personKey) as { hash: string }).hash;
      const first = await claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', now: new Date(), recipientVersionId: c.a.versionId, recipientNumberHash: hash });
      expect(first).toMatchObject({ status: 'claimed', attemptCount: 1 });
      const retry = await claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', now: new Date(), recipientVersionId: c.a.versionId, recipientNumberHash: hash });
      expect(retry).toMatchObject({ status: 'claimed', attemptCount: 2 });
      if (first.status !== 'claimed' || retry.status !== 'claimed') throw new Error('unreachable');
      expect(retry.reminderId).toBe(first.reminderId);
    });

    it('⭐ another job is `held_by_other` before the 10-minute lease, then re-claims once it has expired', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const db = bindScopedDb(client);
      const hash = (c.hashes.get(c.a.personKey) as { hash: string }).hash;
      const t0 = new Date();
      await claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', now: t0, recipientVersionId: c.a.versionId, recipientNumberHash: hash });
      const soon = new Date(t0.getTime() + 60_000);
      await expect(
        claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-2', now: soon, recipientVersionId: c.a.versionId, recipientNumberHash: hash }),
      ).resolves.toEqual({ status: 'held_by_other' });
      const later = new Date(t0.getTime() + 11 * 60_000);
      await expect(
        claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-2', now: later, recipientVersionId: c.a.versionId, recipientNumberHash: hash }),
      ).resolves.toMatchObject({ status: 'claimed', attemptCount: 2 });
    });

    it('⛔ a FINAL row refuses any further claim — `already_final`', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const db = bindScopedDb(client);
      const hash = (c.hashes.get(c.a.personKey) as { hash: string }).hash;
      const claimed = await claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', now: new Date(), recipientVersionId: c.a.versionId, recipientNumberHash: hash });
      if (claimed.status !== 'claimed') throw new Error('unreachable');
      await finaliseCertificateReminder(db, { pariwarId: PID, reminderId: claimed.reminderId, jobId: 'job-1', outcome: 'accepted' });
      await expect(
        claimCertificateReminder(db, { ...key(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', now: new Date(), recipientVersionId: c.a.versionId, recipientNumberHash: hash }),
      ).resolves.toEqual({ status: 'already_final' });
    });
  });

  describe('finaliseCertificateReminder / expireOwnCertificateReminder — the lost-CAS `false`', () => {
    it('⭐ finalise: `attempting` → `accepted` for the holding job (true); a second finalise is a lost CAS (false)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      const db = bindScopedDb(client);
      await expect(finaliseCertificateReminder(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', outcome: 'accepted' })).resolves.toBe(true);
      await expect(finaliseCertificateReminder(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', outcome: 'error' })).resolves.toBe(false);
      const row = await readCertificateReminder(db, { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, recipientKey: c.a.personKey, purpose: 'family_sms', subjectKey: '' });
      expect(row?.outcome).toBe('accepted'); // the lost CAS never overwrote it
    });

    it('⭐ expireOwn: `attempting` → `error` for the holding job (true); a DIFFERENT job is a lost CAS (false)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      const db = bindScopedDb(client);
      await expect(expireOwnCertificateReminder(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-2', detail: 'x' })).resolves.toBe(false);
      await expect(expireOwnCertificateReminder(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', detail: 'exhausted:x' })).resolves.toBe(true);
    });
  });

  describe('skipCertificateReminder', () => {
    const skipKey = (c: Awaited<ReturnType<typeof openMissingRun>>, personKey: string) => ({
      pariwarId: PID,
      claimCaseId: c.cid,
      runId: c.runId,
      slotDay: 1,
      recipientKey: personKey,
      purpose: 'family_sms' as const,
      subjectKey: '',
    });

    it('⛔ no existing row ⇒ inserts a FINAL `skipped_superseded` marker directly', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const db = bindScopedDb(client);
      await expect(skipCertificateReminder(db, { ...skipKey(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', reason: 'run_ended' })).resolves.toEqual({ expiredAttempt: false });
      const row = await readCertificateReminder(db, skipKey(c, c.a.personKey));
      expect(row).toMatchObject({ outcome: 'skipped_superseded', detail: 'run_ended' });
    });

    it('⛔ an `attempting` row held by this job, with ⛔ no detail ⇒ `skipped_superseded`', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      const db = bindScopedDb(client);
      await expect(skipCertificateReminder(db, { ...skipKey(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', reason: 'not_due' })).resolves.toEqual({ expiredAttempt: false });
      const row = await readCertificateReminder(db, skipKey(c, c.a.personKey));
      expect(row).toMatchObject({ outcome: 'skipped_superseded', detail: 'not_due' });
    });

    it('⭐ 6.19b\'s K4 — an `attempting` row ALREADY carrying a detail (a transient failure that may have sent) is EXPIRED `error`, ⛔ never `skipped_superseded`', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      const db = bindScopedDb(client);
      await noteCertificateReminderTransient(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', detail: 'api_unavailable' });
      await expect(
        skipCertificateReminder(db, { ...skipKey(c, c.a.personKey), sentOn: TODAY(), late: false, jobId: 'job-1', reason: 'not_due' }),
      ).resolves.toEqual({ expiredAttempt: true });
      const row = await readCertificateReminder(db, skipKey(c, c.a.personKey));
      expect(row).toMatchObject({ outcome: 'error', detail: 'exhausted:recheck_not_due', firstDetail: 'api_unavailable' });
    });
  });

  describe('noteCertificateReminderTransient', () => {
    it('⭐ records the detail on the holding job\'s `attempting` row — the row stays `attempting` (a retry re-claims it)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const sent = await beginCertificateFamilySend(client, sendInput(c, c.a.personKey));
      if (sent.kind !== 'send') throw new Error('expected a send');
      const db = bindScopedDb(client);
      await noteCertificateReminderTransient(db, { pariwarId: PID, reminderId: sent.reminderId, jobId: 'job-1', detail: 'api_unavailable' });
      const row = await readCertificateReminder(db, { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, recipientKey: c.a.personKey, purpose: 'family_sms', subjectKey: '' });
      expect(row).toMatchObject({ outcome: 'attempting', detail: 'api_unavailable' });
    });
  });

  describe('recordCertificateHashFailure (CR8)', () => {
    it('⭐ writes a FINAL `error` row — non-evidential, ⛔ no hash', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await expect(
        recordCertificateHashFailure(client, { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, personKey: c.a.personKey, sentOn: TODAY(), late: false }),
      ).resolves.toBe(true);
      const row = await readCertificateReminder(bindScopedDb(client), { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, recipientKey: c.a.personKey, purpose: 'family_sms', subjectKey: '' });
      expect(row).toMatchObject({ outcome: 'error', detail: 'exhausted:hash_failed', recipientNumberHash: null });
    });

    it('⛔ the claim is gone ⇒ `false`, ⛔ nothing written', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      await expect(
        recordCertificateHashFailure(client, { pariwarId: PID, claimCaseId: toClaimId(randomUUID()), runId: c.runId, slotDay: 1, personKey: c.a.personKey, sentOn: TODAY(), late: false }),
      ).resolves.toBe(false);
    });

    it('⛔ a row already at that key ⇒ `false` (`ON CONFLICT DO NOTHING`, ⛔ no duplicate)', async () => {
      const { client } = getTx();
      const c = await openMissingRun(client, { mobiles: ['9876543210', '9123456789'] });
      const input = { pariwarId: PID, claimCaseId: c.cid, runId: c.runId, slotDay: 1, personKey: c.a.personKey, sentOn: TODAY(), late: false };
      await expect(recordCertificateHashFailure(client, input)).resolves.toBe(true);
      await expect(recordCertificateHashFailure(client, input)).resolves.toBe(false);
    });
  });
});
