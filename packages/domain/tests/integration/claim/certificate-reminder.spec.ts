// The certificate reminder's RUNS and RECIPIENTS against the live DB — Story 6.19d (AC1, AC3; `2026-10-03-276` CR2,
// CR3, CR6). The facts reader through the REAL certificate status (`readDeathCertificateSnapshot` +
// `deathCertificateStatus`), the opener under the claim-row lock (re-plans under the lock ⇒ `stale`; a SAVEPOINT before
// ending the old run; a `-260` G5 restart ends the old run in the SAME transaction; ⛔ never an old run ended without its
// successor), the `missing` day 0 from the earliest `claim.peer_mesh_pinged`, a run past 180 opened AND completed at
// once, and the recipients (the contact record's people; ⛔ no record / an agreement ⛔ live ⇒ nobody). Per-test
// ROLLBACK (setupLiveDb); membership asserted, ⛔ never counts.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  CertificateLetterRefusedError,
  assertCertificateLetterAllowed,
  correctionNumberHash,
  hashCertificateRecipients,
  istDateOf,
  projectClaimState,
  recordCertificateLetter,
  recordCertificateLetterDelivery,
  lockCertificateClaim,
  openCertificateRun,
  planCertificateRun,
  readCertificatePlanFacts,
  readCertificateRecipients,
  readClaimCertificateRuns,
  type CertificateRunPlan,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
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
  seedDeathCertificate,
  seedEvent,
  seedNomineeDeclaration,
  seedRejectedDeathCertificate,
} from '../_helpers.js';

const PID = toPariwarId(PARIWAR_A);

// ⭐ REAL envelopes where a number is hashed (6.19b slice trap S5): a fake KMS, the SAME deps the child hashes with.
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

/**
 * A claim being CHECKED, driven through the projector (the review writer re-projects the claim from its events, so a
 * raw-seeded claim would fall back to `intake_pending`) — its `claim.peer_mesh_pinged` is emitted on the way.
 */
async function seedCheckedClaim(
  client: Client,
  opts: { readonly target?: 'documents_pending' | 'verifier_review'; readonly mobiles?: readonly [string, string] } = {},
) {
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
  if (opts.target !== 'documents_pending') {
    await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
      selected_member_ids: [randomUUID()],
      metric_id: 'district_cohort_v1',
      metric_version: 1,
    });
    await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  }
  return { cid, member };
}

/** A RAW-seeded claim in the window with ⛔ no events (its window entry is whatever a spec seeds). */
async function seedRawCheckedClaim(client: Client) {
  const { tx } = getTx();
  const cid = toClaimId(await seedClaim(tx, PARIWAR_A, { currentState: 'verifier_review' }));
  await enterAppScope(client, PARIWAR_A);
  return { cid };
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

describe.skipIf(!hasDatabase)('the certificate reminder — runs and recipients (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ a REJECTED certificate in the window opens ONE `rejected` run anchored on the upload + review; the next plan continues it', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaim(client);
    const reviewId = await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const plan = await planNow(client, cid);
    expect(plan).toMatchObject({ kind: 'open', cause: 'rejected', anchorReviewId: reviewId, day0: TODAY(), supersedeRunId: null });
    const opened = await openUnderLock(client, cid, plan);
    expect(opened.status).toBe('opened');
    const runs = await readClaimCertificateRuns(bindScopedDb(client), PID, cid);
    expect(runs.map((r) => [r.cause, r.anchorReviewId, r.endedAt])).toContainEqual(['rejected', reviewId, null]);
    expect(await planNow(client, cid)).toMatchObject({ kind: 'continue', runDay: 0 });
  });

  it('⭐ the opener RE-PLANS under the lock: a plan made BEFORE another sweep opened the run is `stale` — ⛔ no write, ⛔ the new run is ⛔ never ended', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaim(client);
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const plan = await planNow(client, cid);
    expect((await openUnderLock(client, cid, plan)).status).toBe('opened');
    expect((await openUnderLock(client, cid, plan)).status).toBe('stale');
    const runs = await readClaimCertificateRuns(bindScopedDb(client), PID, cid);
    expect(runs.filter((r) => r.endedAt === null)).toHaveLength(1);
  });

  it('⭐ `-260` G5 — a rejection of a DIFFERENT upload opens a new run and ends the old one `superseded` in the SAME transaction', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaim(client);
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const first = await openUnderLock(client, cid, await planNow(client, cid));
    if (first.status !== 'opened') throw new Error('first run not opened');
    await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    // A new certificate awaiting review ⇒ the old run is due to end `certificate_received` …
    expect(await planNow(client, cid)).toEqual({ kind: 'end', runId: first.run.runId, reason: 'certificate_received' });
    // … but rejected before the sweep ran ⇒ `open` WINS.
    const secondReview = await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const plan = await planNow(client, cid);
    expect(plan).toMatchObject({ kind: 'open', cause: 'rejected', anchorReviewId: secondReview, supersedeRunId: first.run.runId });
    const second = await openUnderLock(client, cid, plan);
    expect(second.status).toBe('opened');
    const runs = await readClaimCertificateRuns(bindScopedDb(client), PID, cid);
    const byId = new Map(runs.map((r) => [r.runId, r]));
    expect(byId.get(first.run.runId)?.endReason).toBe('superseded');
    expect(second.status === 'opened' && byId.get(second.run.runId)?.endedAt).toBeNull();
  });

  it('⭐ Trap 4 — a re-review of the SAME upload (re-rejected) ⛔ never opens a second run', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaim(client);
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    await openUnderLock(client, cid, await planNow(client, cid));
    await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid, reason: 'date_of_death_unclear' });
    expect(await planNow(client, cid)).toMatchObject({ kind: 'continue' });
  });

  it('⭐ `missing` — day 0 = the IST date of the EARLIEST `claim.peer_mesh_pinged`; ⛔ no event ⇒ ⛔ no run + an alarm', async () => {
    const { client, tx } = getTx();
    const { cid } = await seedRawCheckedClaim(client);
    expect(await planNow(client, cid)).toEqual({ kind: 'none', alarm: 'no_window_entry' });
    await seedEvent(tx, PARIWAR_A, { streamId: cid, eventType: 'claim.peer_mesh_pinged', eventVersion: 3, occurredAt: new Date('2026-09-30T19:00:00Z') });
    await seedEvent(tx, PARIWAR_A, { streamId: cid, eventType: 'claim.peer_mesh_pinged', eventVersion: 9, occurredAt: new Date('2026-10-05T04:30:00Z') });
    const plan = await planNow(client, cid);
    expect(plan).toMatchObject({ kind: 'open', cause: 'missing', day0: '2026-10-01', anchorUploadId: null });
    expect((await openUnderLock(client, cid, plan)).status).toBe('opened');
  });

  it('⭐ `-275` Q2 — a run whose day 0 is more than 180 days back is opened AND ended `completed` in ONE transaction (⛔ no send)', async () => {
    const { client, tx } = getTx();
    const { cid } = await seedRawCheckedClaim(client);
    await seedEvent(tx, PARIWAR_A, { streamId: cid, eventType: 'claim.peer_mesh_pinged', eventVersion: 3, occurredAt: new Date('2025-01-01T04:30:00Z') });
    const plan = await planNow(client, cid);
    expect(plan).toMatchObject({ kind: 'open', cause: 'missing', completeAtOnce: true });
    const opened = await openUnderLock(client, cid, plan);
    expect(opened.status === 'opened' && opened.run.endReason).toBe('completed');
    expect(await planNow(client, cid)).toEqual({ kind: 'none' });
  });

  it('⛔ a claim still being FILED (`documents_pending`) is ⛔ never planned — even with ⛔ no certificate', async () => {
    const { client } = getTx();
    const { cid } = await seedCheckedClaim(client, { target: 'documents_pending' });
    expect(await planNow(client, cid)).toEqual({ kind: 'none' });
  });

  describe('the recipients (CR6) — the CONTACT RECORD\'s people, ⛔ never the effective declaration', () => {
    it('⭐ each nominee on the record (an UNDETERMINED claim) + positions; the SMS language is the record\'s', async () => {
      const { client } = getTx();
      const { cid } = await seedCheckedClaim(client);
      const seeded = await seedClaimContact(client, PARIWAR_A, cid);
      const r = await readCertificateRecipients(bindScopedDb(client), PID, cid);
      expect(r.cannotRemind).toBeNull();
      expect(r.contactLocale).toBe('hi');
      const nominees = r.people.filter((p) => p.role === 'nominee');
      expect(nominees.map((p) => p.versionId).sort()).toEqual([...seeded!.boundVersionIds].sort());
      expect(nominees.map((p) => p.position)).toEqual(['A', 'B']);
      // The claimant is the first bound nominee ⇒ ⛔ no separate claimant block.
      expect(r.people.some((p) => p.role === 'claimant')).toBe(false);
    });

    it('⛔ no contact record ⇒ `no_contact_record`; a REVOKED agreement ⇒ `agreement_not_live` (⛔ never `undetermined`)', async () => {
      const { client } = getTx();
      const a = await seedCheckedClaim(client);
      expect(await readCertificateRecipients(bindScopedDb(client), PID, a.cid)).toMatchObject({ cannotRemind: 'no_contact_record', people: [] });
      await seedClaimContact(client, PARIWAR_A, a.cid, { agreementRevoked: true });
      expect(await readCertificateRecipients(bindScopedDb(client), PID, a.cid)).toMatchObject({ cannotRemind: 'agreement_not_live', people: [] });
    });
  });

  describe('the ONE letter (CR9; `-275` Q1 A)', () => {
    /** A rejected-certificate claim with an open run, two nominees on the record at `mobiles`, and its people. */
    async function letterClaim(client: Client, mobiles: readonly [string, string]) {
      const { cid } = await seedCheckedClaim(client, { mobiles });
      await seedClaimContact(client, PARIWAR_A, cid);
      await seedRejectedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
      const opened = await openUnderLock(client, cid, await planNow(client, cid));
      if (opened.status !== 'opened') throw new Error('run not opened');
      const people = (await readCertificateRecipients(bindScopedDb(client), PID, cid)).people;
      const hashes = await hashCertificateRecipients(people, PARIWAR_A, ENC);
      const hashOf = (k: string): string => {
        const h = hashes.get(k);
        if (h === undefined || 'failed' in h || h.hash === null) throw new Error(`no hash for ${k}`);
        return h.hash;
      };
      return { cid, runId: opened.run.runId, a: people[0]!, b: people[1]!, hashOf };
    }
    /** A dead-number row for `personKey` at the number whose keyed hash is `hash`. */
    async function deadRow(client: Client, cid: string, runId: string, personKey: string, hash: string, slotDay = 1) {
      await client.query(
        `INSERT INTO claim_certificate_reminders (run_id, claim_case_id, pariwar_id, slot_day, sent_on, recipient_key, purpose, outcome, recipient_number_hash)
         VALUES ($1, $2, $3, $4, $5, $6, 'family_sms', 'rejected_invalid_number', $7)`,
        [runId, cid, PARIWAR_A, slotDay, TODAY(), personKey, hash],
      );
    }
    const refusal = (code: string) => (err: unknown) => err instanceof CertificateLetterRefusedError && err.refusal === code;
    const record = (client: Client, cid: string, personKey: string, postedOn = TODAY()) =>
      recordCertificateLetter(
        client,
        {
          pariwarId: PID,
          claimCaseId: toClaimId(cid),
          personKey,
          postedOn,
          trackingNumberCiphertext: 'enc:v1:track',
          actorId: randomUUID(),
          actorDisplay: 'Test District Admin',
        },
        { crypto: ENC },
      );

    it('⛔ `no_run` before any certificate run exists', async () => {
      const { client } = getTx();
      const { cid } = await seedCheckedClaim(client, { mobiles: ['9876543210', '9123456789'] });
      await seedClaimContact(client, PARIWAR_A, cid);
      await expect(assertCertificateLetterAllowed(bindScopedDb(client), PID, cid, 'claimant', { crypto: ENC })).rejects.toSatisfy(refusal('no_run'));
    });

    it('⭐ letter-eligible from a dead outcome of the CURRENT number; ⛔ a person with ⛔ no dead row is ⛔ not; the address is THAT person\'s', async () => {
      const { client } = getTx();
      const c = await letterClaim(client, ['9876543210', '9123456789']);
      await deadRow(client, c.cid, c.runId, c.a.personKey, c.hashOf(c.a.personKey));
      const ok = await assertCertificateLetterAllowed(bindScopedDb(client), PID, c.cid, c.a.personKey, { crypto: ENC });
      expect(ok.address.addressCiphertext).toBe(`enc:v1:address-${c.a.versionId!.slice(0, 8)}`);
      expect(ok.runId).toBe(c.runId);
      await expect(assertCertificateLetterAllowed(bindScopedDb(client), PID, c.cid, c.b.personKey, { crypto: ENC })).rejects.toSatisfy(
        refusal('not_letter_eligible'),
      );
    });

    it('⭐ a 6.20 number change RESETS eligibility — the dead row was about ANOTHER number', async () => {
      const { client } = getTx();
      const c = await letterClaim(client, ['9876543210', '9123456789']);
      await deadRow(client, c.cid, c.runId, c.a.personKey, await correctionNumberHash('+919000000001', PARIWAR_A, ENC));
      await expect(assertCertificateLetterAllowed(bindScopedDb(client), PID, c.cid, c.a.personKey, { crypto: ENC })).rejects.toSatisfy(
        refusal('not_letter_eligible'),
      );
    });

    it('⭐ `-275` Q1 A — ONE letter per person per CLAIM: a second is `already_recorded`; a delivery is recorded once, ⛔ before posting', async () => {
      const { client } = getTx();
      const c = await letterClaim(client, ['9876543210', '9123456789']);
      await deadRow(client, c.cid, c.runId, c.a.personKey, c.hashOf(c.a.personKey));
      const letter = await record(client, c.cid, c.a.personKey, '2026-10-01');
      expect(letter.runId).toBe(c.runId);
      await expect(record(client, c.cid, c.a.personKey)).rejects.toSatisfy(refusal('already_recorded'));
      const deliver = (letterId: string, deliveredOn: string) =>
        recordCertificateLetterDelivery(client, {
          pariwarId: PID,
          claimCaseId: toClaimId(c.cid),
          letterId,
          deliveredOn,
          screenshotStorageKey: `k/${letterId}`,
          screenshotContentType: 'image/png',
          screenshotSizeBytes: 10,
          actorId: randomUUID(),
          actorDisplay: 'Test District Admin',
        });
      await expect(deliver(letter.letterId, '2026-09-30')).rejects.toSatisfy(refusal('delivered_before_posted'));
      await expect(deliver(randomUUID(), '2026-10-05')).rejects.toSatisfy(refusal('not_found'));
      expect((await deliver(letter.letterId, '2026-10-05')).deliveredOn).toBe('2026-10-05');
      await expect(deliver(letter.letterId, '2026-10-06')).rejects.toSatisfy(refusal('already_delivered'));
    });

    it('⭐ CR6 — one letter per NUMBER: a second person at the SAME number is refused `already_recorded`', async () => {
      const { client } = getTx();
      const c = await letterClaim(client, ['9876543210', '9876543210']);
      await deadRow(client, c.cid, c.runId, c.a.personKey, c.hashOf(c.a.personKey));
      await deadRow(client, c.cid, c.runId, c.b.personKey, c.hashOf(c.b.personKey), 2);
      await record(client, c.cid, c.a.personKey);
      await expect(record(client, c.cid, c.b.personKey)).rejects.toSatisfy(refusal('already_recorded'));
    });

    it('⛔ a revoked agreement ⇒ `agreement_not_live`', async () => {
      const { client } = getTx();
      const c = await letterClaim(client, ['9876543210', '9123456789']);
      await deadRow(client, c.cid, c.runId, c.a.personKey, c.hashOf(c.a.personKey));
      await client.query(
        `UPDATE consent_records SET revoked_at = now() WHERE consent_id = (SELECT agreement_consent_id FROM claim_contacts WHERE claim_case_id = $1)`,
        [c.cid],
      );
      await expect(record(client, c.cid, c.a.personKey)).rejects.toSatisfy(refusal('agreement_not_live'));
    });
  });
});
