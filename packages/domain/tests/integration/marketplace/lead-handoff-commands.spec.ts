// Story 12.5 (Task 3 / 9.1; AC1's W legs, AC2, AC5's order, AC6's state half; QE4, QE6, QE7, QE18, QE21 (C)) — the domain commands,
// live. Per-test ROLLBACK (setupLiveDb): every write is the real function on the real table; `recordLeadHandoff`, the requeue and the
// status read run as `twt_app` under the Pariwar's scope, the sweep's writers as the session user (the jobs login BYPASSES RLS).
// ⚠ The claim and the lapse are cross-tenant: a row seeded here has `next_attempt_at` a century ago, so it is claimed FIRST, and
// every assertion names its own ids (a foreign COMMITTED row may be touched in this transaction too — it is rolled back).

import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { CONSENTS_FOR_ARTIFACT_LIMIT_CAP } from '../../../src/consent/read.js';
import { bindScopedDb } from '../../../src/db.js';
import {
  LeadHandoffAlreadyRecordedError,
  LeadHandoffConsentInvalidError,
  LeadHandoffFieldsGoneError,
  LeadHandoffFieldsInvalidError,
  LeadHandoffNotRequeueableError,
} from '../../../src/marketplace/errors.js';
import {
  LEAD_HANDOFF_CONSENT_PAGE,
  cancelLeadHandoff,
  cancelWaitingLeadHandoff,
  claimDueLeadHandoff,
  failLeadHandoff,
  getLeadHandoffStatus,
  holdLeadHandoff,
  lapseLeadHandoffs,
  listFailedLeadHandoffs,
  listWaitingLeadHandoffs,
  purgeLeadHandoffFields,
  readLeadHandoffModule,
  readLeadHandoffPredicates,
  recordLeadHandoff,
  releaseLeadHandoff,
  requeueLeadHandoff,
  settleLeadHandoffDelivered,
} from '../../../src/marketplace/lead-handoff.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent } from '../_helpers.js';
import {
  SEALED_PLACEHOLDER,
  archiveModuleRow,
  handoffRow,
  insertHandoffRaw,
  seedHandoffWorld,
  seedLeadConsent,
  seedMemberRow,
  seedModule,
  type HandoffWorld,
} from './_lead-handoff-fixtures.js';
import { purgeExpiredPartnerFormVisits } from '../../../src/marketplace/partner-form.js';
import { expectSqlRejected, seedPartner } from './_fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const SCHEDULE = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 86_400_000];

/** Seconds between two instants. */
const secondsBetween = (a: Date, b: Date): number => (a.getTime() - b.getTime()) / 1000;

async function dbNow(client: Client): Promise<Date> {
  return (await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!.now;
}

/** Set the scope GUC WITHOUT changing role — what `withPariwarScope` does on the jobs pool. */
async function scopeOnly(client: Client, pariwarId: string): Promise<void> {
  await client.query(`SELECT set_config('app.pariwar_id', $1, true)`, [pariwarId]);
}

async function predicates(client: Client, w: HandoffWorld) {
  await scopeOnly(client, w.pariwarId);
  return readLeadHandoffPredicates(bindScopedDb(client), client, w);
}

/** An `attempting` row with a known token. */
async function attempting(client: Client, w: HandoffWorld, o: Parameters<typeof insertHandoffRaw>[2] = {}): Promise<string> {
  const token = randomUUID();
  await insertHandoffRaw(client, w, { status: 'attempting', claimToken: token, attemptCount: 1, ...o });
  return token;
}

/** A member stream replayed through `events`, in order, on the member's own stream. */
async function memberEvents(client: Client, w: HandoffWorld, events: ReadonlyArray<{ type: string; payload?: unknown }>): Promise<void> {
  const tx = bindScopedDb(client);
  for (const [i, e] of events.entries()) {
    await seedEvent(tx, w.pariwarId, {
      streamId: w.memberId,
      eventType: e.type,
      payload: e.payload ?? {},
      eventVersion: i + 1,
      occurredAt: new Date(Date.now() - (events.length - i) * 60_000),
    });
  }
}

const JOINED = [
  { type: 'member.signup_initiated' },
  { type: 'member.kyc_completed' },
  { type: 'member.vyawastha_shulk_paid' },
  { type: 'member.lock_in_expired', payload: { kyc_verified: true } },
];

describe.skipIf(!hasDatabase)('Story 12.5 — the lead-handoff domain commands (live)', () => {
  setupLiveDb();

  describe('recordLeadHandoff (W1; AC2)', () => {
    it('writes a due row with the sealed string, attempt 0, no detail, next_attempt_at = now() — as twt_app under scope', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await recordLeadHandoff(client, { ...w, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() });
      const row = await handoffRow(client, w.leadId);
      const now = (await client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
      expect(row).toMatchObject({
        status: 'due',
        attempt_count: 0,
        outcome_detail: null,
        member_fields_ciphertext: SEALED_PLACEHOLDER,
        consent_id: w.consentId,
        envelope_version: 1,
        claim_token: null,
      });
      expect((row['next_attempt_at'] as Date).getTime()).toBe(now.getTime());
    });

    it.each([
      ['a consent of another type', 'wrong_type', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, w.pariwarId, { subjectId: w.memberId, artifactRef: w.leadId, consentType: 'marketing' })],
      ['a consent for another subject', 'wrong_subject', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, w.pariwarId, { subjectId: randomUUID(), artifactRef: w.leadId })],
      ['a revoked consent', 'revoked', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, w.pariwarId, { subjectId: w.memberId, artifactRef: w.leadId, revoked: true })],
      ['a consent for another lead', 'wrong_artifact', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, w.pariwarId, { subjectId: w.memberId, artifactRef: randomUUID() })],
      ['a consent with no artifact', 'wrong_artifact', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, w.pariwarId, { subjectId: w.memberId, artifactRef: null })],
      ['a consent of ANOTHER Pariwar', 'not_found', async (c: Client, w: HandoffWorld) => seedLeadConsent(c, PARIWAR_B, { subjectId: w.memberId, artifactRef: w.leadId })],
      ['no consent at all', 'not_found', async () => randomUUID()],
    ] as const)('refuses %s (LeadHandoffConsentInvalidError %s), writes nothing, the transaction stays usable', async (_label, reason, consent) => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const consentId = await consent(client, w);
      await enterAppScope(client, PARIWAR_A);
      const err = await recordLeadHandoff(client, { ...w, consentId, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadHandoffConsentInvalidError);
      expect((err as LeadHandoffConsentInvalidError).reason).toBe(reason);
      const { rows } = await client.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1', [w.leadId]);
      expect(rows).toHaveLength(0);
    });

    it('refuses a sealed string that is not an envelope (LeadHandoffFieldsInvalidError) before any SQL', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const spy = vi.spyOn(client, 'query');
      try {
        await expect(recordLeadHandoff(client, { ...w, sealedFields: 'plain text', auditId: randomUUID() })).rejects.toBeInstanceOf(LeadHandoffFieldsInvalidError);
        // "before any SQL" is OBSERVED: not even the SAVEPOINT.
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('refuses a member of ANOTHER Pariwar (member_not_in_pariwar) — the member FK is single-column and ignores RLS', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const foreign = await seedMemberRow(client, PARIWAR_B);
      // A consent in A whose subject is B's member: `subject_id` carries no FK, so this row is constructible.
      const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: foreign, artifactRef: w.leadId });
      await enterAppScope(client, PARIWAR_A);
      const err = await recordLeadHandoff(client, { ...w, memberId: foreign, consentId, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadHandoffConsentInvalidError);
      expect((err as LeadHandoffConsentInvalidError).reason).toBe('member_not_in_pariwar');
      expect((await client.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1', [w.leadId])).rows).toHaveLength(0);
      // Control: the SAME call with this Pariwar's own member and consent is recorded.
      await recordLeadHandoff(client, { ...w, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() });
      expect((await client.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1', [w.leadId])).rows).toHaveLength(1);
    });

    it('a second call with the same lead_id ⇒ LeadHandoffAlreadyRecordedError(lead_id), and the transaction stays usable (TR3)', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await recordLeadHandoff(client, { ...w, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() });
      const err = await recordLeadHandoff(client, { ...w, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadHandoffAlreadyRecordedError);
      expect((err as LeadHandoffAlreadyRecordedError).constraint).toBe('lead_id');
      // Usable: a follow-up statement in the SAME transaction succeeds, and the first row is still there.
      expect((await handoffRow(client, w.leadId))['status']).toBe('due');
    });

    it('a consent already used by another handoff ⇒ LeadHandoffAlreadyRecordedError(consent_id)', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      // A row (seeded raw — the artifact rule makes this unreachable through the command) already names the consent.
      await insertHandoffRaw(client, { ...w, leadId: randomUUID() });
      await enterAppScope(client, PARIWAR_A);
      const err = await recordLeadHandoff(client, { ...w, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(LeadHandoffAlreadyRecordedError);
      expect((err as LeadHandoffAlreadyRecordedError).constraint).toBe('consent_id');
      expect((await client.query('SELECT 1')).rows).toHaveLength(1);
    });
  });

  describe('the claim (W2) and the module read (S4)', () => {
    it('claims the due row: attempting, the token, claimed_at, attempt_count + 1, the authority', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, w);
      const token = randomUUID();
      const claimed = await claimDueLeadHandoff(client, { claimToken: token });
      expect(claimed).toMatchObject({ leadId: w.leadId, pariwarId: w.pariwarId, moduleId: w.moduleId, memberId: w.memberId, attemptCount: 1, authority: 'leads.partner.example' });
      const row = await handoffRow(client, w.leadId);
      expect(row).toMatchObject({ status: 'attempting', claim_token: token, attempt_count: 1 });
      expect(row['claimed_at']).not.toBeNull();
    });

    it('does NOT claim a row of an excluded module or authority, nor one not yet due', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, w);
      const later = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, later, { nextAttemptAtSql: "now() + interval '1 hour'" });
      const byModule = await claimDueLeadHandoff(client, { claimToken: randomUUID(), excludeModuleIds: [w.moduleId, later.moduleId] });
      const byAuthority = await claimDueLeadHandoff(client, { claimToken: randomUUID(), excludeAuthorities: ['leads.partner.example'] });
      for (const c of [byModule, byAuthority]) expect([w.leadId, later.leadId]).not.toContain(c?.leadId);
      expect((await handoffRow(client, w.leadId))['status']).toBe('due');
      // Control: unexcluded, the due row IS claimed, the later one is not.
      expect((await claimDueLeadHandoff(client, { claimToken: randomUUID() }))?.leadId).toBe(w.leadId);
      // ⚠ Not yet due: with `w` gone, keep claiming until nothing is left — the row an hour ahead is NEVER handed out. (Without the
      // `next_attempt_at <= clock` predicate this loop reaches it: a mutation check, code review 2026-11-22 patch 9.)
      for (let i = 0; i < 200; i += 1) {
        const next = await claimDueLeadHandoff(client, { claimToken: randomUUID() });
        if (next === null) break;
        expect(next.leadId).not.toBe(later.leadId);
      }
      expect(await claimDueLeadHandoff(client, { claimToken: randomUUID() })).toBeNull();
      expect((await handoffRow(client, later.leadId))['status']).toBe('due');
    });

    it('reads the module with an explicit Pariwar predicate (another Pariwar ⇒ null)', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      expect(await readLeadHandoffModule(client, w)).toMatchObject({ moduleId: w.moduleId, partnerId: w.partnerId, currentState: 'active', archiveReason: null });
      expect(await readLeadHandoffModule(client, { pariwarId: PARIWAR_B, moduleId: w.moduleId })).toBeNull();
    });
  });

  describe('the compare-and-set writes (W3–W9; I11)', () => {
    it('W3 — delivered, delivered_at, a sanitised reference; held_since cleared', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w, { heldSinceSql: "now() - interval '1 hour'" });
      expect(await settleLeadHandoffDelivered(client, { ...w, claimToken: token, httpStatus: 202, partnerReference: 'REF-123.ok' })).toBe(true);
      expect(await handoffRow(client, w.leadId)).toMatchObject({ status: 'delivered', outcome_detail: 'delivered:http_2xx:202', partner_reference: 'REF-123.ok', claim_token: null, claimed_at: null, held_since: null });
      const other = await seedHandoffWorld(client, PARIWAR_A);
      const t2 = await attempting(client, other);
      await settleLeadHandoffDelivered(client, { ...other, claimToken: t2, httpStatus: 200, partnerReference: 'has space<script>' });
      expect((await handoffRow(client, other.leadId))['partner_reference']).toBeNull();
    });

    it('a STALE token writes nothing (false / "stale"), on every CAS writer', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await attempting(client, w);
      const stale = { ...w, claimToken: randomUUID() };
      expect(await settleLeadHandoffDelivered(client, { ...stale, httpStatus: 200, partnerReference: null })).toBe(false);
      expect(await releaseLeadHandoff(client, { ...stale, detail: 'released:timeout' })).toBe('stale');
      expect(await holdLeadHandoff(client, { ...stale, word: 'kms' })).toBe('stale');
      expect(await failLeadHandoff(client, { ...stale, detail: 'failed_delivery:http_4xx:400' })).toBe(false);
      expect(await cancelLeadHandoff(client, { ...stale, word: 'consent_revoked' })).toBe(false);
      expect((await handoffRow(client, w.leadId))['status']).toBe('attempting');
    });

    it('the RIGHT token under ANOTHER Pariwar writes nothing, on every CAS writer (TR11 — the sweep\'s pool bypasses RLS)', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w);
      const wrong = { pariwarId: PARIWAR_B, leadId: w.leadId, claimToken: token };
      expect(await settleLeadHandoffDelivered(client, { ...wrong, httpStatus: 200, partnerReference: null })).toBe(false);
      expect(await releaseLeadHandoff(client, { ...wrong, detail: 'released:timeout' })).toBe('stale');
      expect(await holdLeadHandoff(client, { ...wrong, word: 'kms' })).toBe('stale');
      expect(await failLeadHandoff(client, { ...wrong, detail: 'failed_delivery:http_4xx:400' })).toBe(false);
      expect(await cancelLeadHandoff(client, { ...wrong, word: 'consent_revoked' })).toBe(false);
      expect(await handoffRow(client, w.leadId)).toMatchObject({ status: 'attempting', claim_token: token, member_fields_ciphertext: SEALED_PLACEHOLDER });
      // Control: the same token under the row's OWN Pariwar does write.
      expect(await cancelLeadHandoff(client, { ...w, claimToken: token, word: 'consent_revoked' })).toBe(true);
    });

    it('W4 — released: due, the attempt stays counted, next = clock + schedule[attempt − 1], held_since cleared', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w, { attemptCount: 3, heldSinceSql: "now() - interval '1 hour'" });
      const before = await dbNow(client);
      expect(await releaseLeadHandoff(client, { ...w, claimToken: token, detail: 'released:http_5xx:503', retryScheduleMs: SCHEDULE })).toBe('released');
      const row = await handoffRow(client, w.leadId);
      expect(row).toMatchObject({ status: 'due', outcome_detail: 'released:http_5xx:503', attempt_count: 3, held_since: null, claim_token: null });
      expect(secondsBetween(row['next_attempt_at'] as Date, before)).toBeGreaterThanOrEqual(1800);
      expect(secondsBetween(row['next_attempt_at'] as Date, before)).toBeLessThan(1810);
    });

    it('W5 — a transient outcome on attempt 7 ⇒ failed_delivery:retries_exhausted', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w, { attemptCount: 7 });
      expect(await releaseLeadHandoff(client, { ...w, claimToken: token, detail: 'released:timeout' })).toBe('exhausted');
      expect(await handoffRow(client, w.leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:retries_exhausted', attempt_count: 7 });
    });

    it('W6 — held: the attempt given back in the SAME statement (TR16), held_since set, next = clock + hold retry', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w, { attemptCount: 5 });
      const before = await dbNow(client);
      expect(await holdLeadHandoff(client, { ...w, claimToken: token, word: 'signing_key', holdRetryMs: 60_000 })).toBe('held');
      const row = await handoffRow(client, w.leadId);
      expect(row).toMatchObject({ status: 'due', outcome_detail: 'held:signing_key_unavailable', attempt_count: 4, claim_token: null });
      expect(row['held_since']).not.toBeNull();
      // The HOLD's own minute — bounded on both sides, so the retry schedule's time (attempt 5 ⇒ 6 h) would fail.
      expect(secondsBetween(row['next_attempt_at'] as Date, before)).toBeGreaterThanOrEqual(60);
      expect(secondsBetween(row['next_attempt_at'] as Date, before)).toBeLessThan(90);
    });

    it('W6 again keeps the run\'s start (COALESCE); W7 — 25 h of holds ⇒ failed_delivery:hold_expired:<this word>', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const t1 = await attempting(client, w, { attemptCount: 2, heldSinceSql: "now() - interval '2 hours'" });
      const startedAt = (await handoffRow(client, w.leadId))['held_since'] as Date;
      expect(await holdLeadHandoff(client, { ...w, claimToken: t1, word: 'dns' })).toBe('held');
      expect(((await handoffRow(client, w.leadId))['held_since'] as Date).getTime()).toBe(startedAt.getTime());
      const x = await seedHandoffWorld(client, PARIWAR_A);
      const t2 = await attempting(client, x, { attemptCount: 2, heldSinceSql: "now() - interval '25 hours'", outcomeDetail: 'held:kms_unavailable' });
      expect(await holdLeadHandoff(client, { ...x, claimToken: t2, word: 'audit' })).toBe('expired');
      const row = await handoffRow(client, x.leadId);
      expect(row).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:hold_expired:audit', attempt_count: 1 });
      expect(row['held_since']).not.toBeNull();
    });

    it('a row that spent 30 h in ORDINARY retries and then meets a hold is HELD (held_since was null), ⛔ failed', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, w, { attemptCount: 6, outcomeDetail: 'released:timeout' });
      expect(await holdLeadHandoff(client, { ...w, claimToken: token, word: 'signing_key' })).toBe('held');
    });

    it('W8 — permanent; W9 — cancelled with the fields dropped AT ONCE', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const t1 = await attempting(client, w);
      expect(await failLeadHandoff(client, { ...w, claimToken: t1, detail: 'failed_delivery:port_refused' })).toBe(true);
      expect(await handoffRow(client, w.leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:port_refused', member_fields_ciphertext: SEALED_PLACEHOLDER });
      const x = await seedHandoffWorld(client, PARIWAR_A);
      const t2 = await attempting(client, x);
      expect(await cancelLeadHandoff(client, { ...x, claimToken: t2, word: 'death_reported' })).toBe(true);
      expect(await handoffRow(client, x.leadId)).toMatchObject({ status: 'cancelled', outcome_detail: 'cancelled:death_reported', member_fields_ciphertext: null });
    });

    it('a writer refuses a detail outside its own prefix BEFORE any SQL', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await expect(failLeadHandoff(client, { ...w, claimToken: 'x', detail: 'released:timeout' })).rejects.toThrow(/grammar/);
      await expect(releaseLeadHandoff(client, { ...w, claimToken: 'x', detail: 'released:boom' })).rejects.toThrow(/grammar/);
    });
  });

  describe('the lapse (W10) and the purge (W12)', () => {
    it('W10 — a lease past its time ⇒ due, counted, lapsed:lease_expired, held_since cleared; on attempt 7 ⇒ outcome_unknown', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await attempting(client, w, { attemptCount: 2, claimedAtSql: "now() - interval '10 minutes'", heldSinceSql: "now() - interval '1 hour'" });
      const last = await seedHandoffWorld(client, PARIWAR_A);
      await attempting(client, last, { attemptCount: 7, claimedAtSql: "now() - interval '10 minutes'" });
      const fresh = await seedHandoffWorld(client, PARIWAR_A);
      await attempting(client, fresh, { attemptCount: 1 });
      const before = await dbNow(client);
      const lapsed = await lapseLeadHandoffs(client, { leaseMs: 300_000, retryScheduleMs: SCHEDULE });
      const mine = lapsed.filter((l) => [w.leadId, last.leadId, fresh.leadId].includes(l.leadId));
      expect(mine.map((l) => [l.leadId, l.status]).sort()).toEqual([[w.leadId, 'due'], [last.leadId, 'failed_delivery']].sort());
      const lapsedRow = await handoffRow(client, w.leadId);
      expect(lapsedRow).toMatchObject({ status: 'due', outcome_detail: 'lapsed:lease_expired', attempt_count: 2, held_since: null, claim_token: null });
      // The backoff of the attempt it KEPT: attempt 2 ⇒ the schedule's second wait (5 min), from the clock.
      expect(secondsBetween(lapsedRow['next_attempt_at'] as Date, before)).toBeGreaterThanOrEqual(300);
      expect(secondsBetween(lapsedRow['next_attempt_at'] as Date, before)).toBeLessThan(330);
      expect(await handoffRow(client, last.leadId)).toMatchObject({ status: 'failed_delivery', outcome_detail: 'failed_delivery:outcome_unknown' });
      expect((await handoffRow(client, fresh.leadId))['status']).toBe('attempting');
    });

    it('W12 — drops the fields of delivered and failed rows past the retention, and no younger one; status and detail unchanged', async () => {
      const { client } = getTx();
      const old = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, old, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200', updatedAtSql: "now() - interval '31 days'" });
      const oldFailed = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, oldFailed, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400', updatedAtSql: "now() - interval '31 days'" });
      const young = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, young, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200', updatedAtSql: "now() - interval '29 days'" });
      const oldDue = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, oldDue, { updatedAtSql: "now() - interval '31 days'" });
      const failedAt = (await handoffRow(client, oldFailed.leadId))['updated_at'] as Date;
      expect(await purgeLeadHandoffFields(client, { retentionDays: 30 })).toBeGreaterThanOrEqual(2);
      expect(await handoffRow(client, old.leadId)).toMatchObject({ status: 'delivered', outcome_detail: 'delivered:http_2xx:200', member_fields_ciphertext: null });
      expect((await handoffRow(client, oldFailed.leadId))['member_fields_ciphertext']).toBeNull();
      // The purge leaves `updated_at` — the time the row became final, the only failure time it has (patch 10).
      expect(((await handoffRow(client, oldFailed.leadId))['updated_at'] as Date).getTime()).toBe(failedAt.getTime());
      expect((await handoffRow(client, young.leadId))['member_fields_ciphertext']).toBe(SEALED_PLACEHOLDER);
      expect((await handoffRow(client, oldDue.leadId))['member_fields_ciphertext']).toBe(SEALED_PLACEHOLDER);
    });
  });

  describe('the requeue (W13; QE21 (C)) and the reads', () => {
    it('moves a failed row to due (requeued:manual, attempt 0, next = clock, held_since cleared) — as twt_app', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, w, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:hold_expired:kms', attemptCount: 4, heldSinceSql: "now() - interval '25 hours'" });
      const before = await dbNow(client);
      await enterAppScope(client, PARIWAR_A);
      await requeueLeadHandoff(client, w);
      await client.query('RESET ROLE');
      const requeued = await handoffRow(client, w.leadId);
      expect(requeued).toMatchObject({ status: 'due', outcome_detail: 'requeued:manual', attempt_count: 0, held_since: null });
      // "next = clock": due at once, ⛔ on the old schedule.
      expect(secondsBetween(requeued['next_attempt_at'] as Date, before)).toBeGreaterThanOrEqual(0);
      expect(secondsBetween(requeued['next_attempt_at'] as Date, before)).toBeLessThan(30);
    });

    it('refuses one whose fields are gone (LeadHandoffFieldsGoneError), a delivered one, and another Pariwar\'s (NotRequeueable)', async () => {
      const { client } = getTx();
      const gone = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, gone, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400', ciphertext: null });
      const done = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, done, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200' });
      const theirs = await seedHandoffWorld(client, PARIWAR_B);
      await insertHandoffRaw(client, theirs, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400' });
      await enterAppScope(client, PARIWAR_A);
      await expect(requeueLeadHandoff(client, gone)).rejects.toBeInstanceOf(LeadHandoffFieldsGoneError);
      await expect(requeueLeadHandoff(client, done)).rejects.toBeInstanceOf(LeadHandoffNotRequeueableError);
      await expect(requeueLeadHandoff(client, { pariwarId: PARIWAR_A, leadId: theirs.leadId })).rejects.toBeInstanceOf(LeadHandoffNotRequeueableError);
      await client.query('RESET ROLE');
      expect((await handoffRow(client, theirs.leadId))['status']).toBe('failed_delivery');
    });

    it('getLeadHandoffStatus maps every status (QE6) — as twt_app — and null for an unknown lead', async () => {
      const { client } = getTx();
      const cases = [
        ['due', null, 'pending_retry'],
        ['attempting', null, 'pending_retry'],
        ['delivered', 'delivered:http_2xx:200', 'delivered'],
        ['failed_delivery', 'failed_delivery:http_4xx:400', 'failed_delivery'],
        ['cancelled', 'cancelled:consent_revoked', 'cancelled'],
      ] as const;
      const worlds: Array<[HandoffWorld, string]> = [];
      for (const [status, outcomeDetail, expected] of cases) {
        const w = await seedHandoffWorld(client, PARIWAR_A);
        await insertHandoffRaw(client, w, { status, outcomeDetail, partnerReference: status === 'delivered' ? 'REF1' : null, ciphertext: status === 'cancelled' ? null : undefined });
        worlds.push([w, expected]);
      }
      await enterAppScope(client, PARIWAR_A);
      for (const [w, expected] of worlds) {
        // The derived word and nothing else: the read selects `status` alone (fence rule (b) fails the reference inside it).
        expect(await getLeadHandoffStatus(client, w)).toBe(expected);
      }
      const [first] = worlds[0]!;
      expect(await getLeadHandoffStatus(client, { pariwarId: PARIWAR_A, memberId: first.memberId, leadId: randomUUID() })).toBeNull();
      // ⭐ Member-scoped (checklist family 12 (b)): ANOTHER member of the same Pariwar reads null for this lead, as if there were none.
      const [second] = worlds[1]!;
      expect(await getLeadHandoffStatus(client, { pariwarId: PARIWAR_A, memberId: second.memberId, leadId: first.leadId })).toBeNull();
      expect(await getLeadHandoffStatus(client, { pariwarId: PARIWAR_A, memberId: first.memberId, leadId: first.leadId })).toBe('pending_retry');
    });

    it('listFailedLeadHandoffs returns this Pariwar\'s failed rows only', async () => {
      const { client } = getTx();
      const f = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, f, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:410', partnerReference: 'P-9' });
      const d = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, d, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200' });
      // ⚠ As the session user (RLS-exempt): ONLY the statement's own `pariwar_id` predicate keeps B's failed row out (TR11).
      const theirs = await seedHandoffWorld(client, PARIWAR_B);
      await insertHandoffRaw(client, theirs, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:410' });
      const list = await listFailedLeadHandoffs(client, PARIWAR_A, { limit: 200 });
      const ids = list.map((r) => r.leadId);
      expect(ids).toContain(f.leadId);
      expect(ids).not.toContain(d.leadId);
      expect(ids).not.toContain(theirs.leadId);
      expect((await listFailedLeadHandoffs(client, PARIWAR_B, { limit: 200 })).map((r) => r.leadId)).toContain(theirs.leadId);
      expect(list.find((r) => r.leadId === f.leadId)).toMatchObject({ outcomeDetail: 'failed_delivery:http_4xx:410', partnerReference: 'P-9', requeueable: true });
    });
  });

  describe('the waiting pass\'s read and W14 (Decision 2026-11-22-487)', () => {
    it('listWaitingLeadHandoffs returns EVERY due row — waiting OR due now (`-488` (1)) — and no other, with the offer\'s withdrawal, in lead_id order after the cursor', async () => {
      const { client } = getTx();
      const waiting = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, waiting, { nextAttemptAtSql: "now() + interval '1 hour'", outcomeDetail: 'released:timeout', attemptCount: 3 });
      const withdrawn = await seedHandoffWorld(client, PARIWAR_B);
      await insertHandoffRaw(client, withdrawn, { nextAttemptAtSql: "now() + interval '1 hour'" });
      await archiveModuleRow(client, withdrawn.moduleId, 'trustee_archived');
      const ended = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, ended, { nextAttemptAtSql: "now() + interval '1 hour'" });
      await archiveModuleRow(client, ended.moduleId, 'valid_until_reached');
      const dueNow = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, dueNow);
      const inFlight = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, inFlight, { status: 'attempting', nextAttemptAtSql: "now() + interval '1 hour'" });
      const final = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, final, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400', nextAttemptAtSql: "now() + interval '1 hour'" });

      const mine = [waiting, withdrawn, ended, dueNow, inFlight, final].map((x) => x.leadId);
      const all = (await listWaitingLeadHandoffs(client, { limit: 500 })).filter((r) => mine.includes(r.leadId));
      // A due-NOW row is in the list too (`-488` (1)): the claim may not reach it this tick. ⛔ In flight, ⛔ final.
      expect(all.map((r) => r.leadId)).toEqual([waiting.leadId, withdrawn.leadId, ended.leadId, dueNow.leadId].sort());
      expect(all.find((r) => r.leadId === waiting.leadId)).toEqual({
        leadId: waiting.leadId, pariwarId: PARIWAR_A, moduleId: waiting.moduleId, memberId: waiting.memberId, consentId: waiting.consentId, moduleWithdrawn: false,
        // Story 12.5b (QE5) — the route flag the pass reads first.
        routePartnerForm: false,
      });
      // Withdrawn = `trustee_archived` ONLY (QE22 (A)); an offer that simply ended is not.
      expect(all.find((r) => r.leadId === withdrawn.leadId)?.moduleWithdrawn).toBe(true);
      expect(all.find((r) => r.leadId === ended.leadId)?.moduleWithdrawn).toBe(false);
      // The cursor: strictly AFTER it, so a pass resumes behind the last row it looked at.
      const [firstId, secondId] = [waiting.leadId, withdrawn.leadId, ended.leadId, dueNow.leadId].sort();
      const after = (await listWaitingLeadHandoffs(client, { afterLeadId: firstId!, limit: 500 })).filter((r) => mine.includes(r.leadId));
      expect(after.map((r) => r.leadId)).not.toContain(firstId);
      expect(after[0]?.leadId).toBe(secondId);
    });

    it('W14 — a waiting due row ⇒ cancelled:<word>, the fields gone, held_since cleared; attempt count and next attempt untouched', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, w, { nextAttemptAtSql: "now() + interval '6 hours'", outcomeDetail: 'held:dns_unavailable', attemptCount: 4, heldSinceSql: "now() - interval '2 hours'" });
      const nextBefore = (await handoffRow(client, w.leadId))['next_attempt_at'] as Date;
      expect(await cancelWaitingLeadHandoff(client, { pariwarId: w.pariwarId, leadId: w.leadId, word: 'consent_revoked' })).toBe(true);
      expect(await handoffRow(client, w.leadId)).toMatchObject({
        status: 'cancelled', outcome_detail: 'cancelled:consent_revoked', member_fields_ciphertext: null, held_since: null, attempt_count: 4, claim_token: null, claimed_at: null,
      });
      expect(((await handoffRow(client, w.leadId))['next_attempt_at'] as Date).getTime()).toBe(nextBefore.getTime());
      // Final: a second cancel, and a claim, find nothing to do.
      expect(await cancelWaitingLeadHandoff(client, { pariwarId: w.pariwarId, leadId: w.leadId, word: 'member_withdrawn' })).toBe(false);
      expect((await handoffRow(client, w.leadId))['outcome_detail']).toBe('cancelled:consent_revoked');
    });

    it('W14 writes NOTHING to a row that is not due (the claim took it; a final row), nor under another Pariwar', async () => {
      const { client } = getTx();
      const inFlight = await seedHandoffWorld(client, PARIWAR_A);
      const token = await attempting(client, inFlight);
      const failed = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, failed, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400' });
      const due = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, due, { nextAttemptAtSql: "now() + interval '1 hour'" });
      expect(await cancelWaitingLeadHandoff(client, { pariwarId: PARIWAR_A, leadId: inFlight.leadId, word: 'consent_revoked' })).toBe(false);
      expect(await cancelWaitingLeadHandoff(client, { pariwarId: PARIWAR_A, leadId: failed.leadId, word: 'consent_revoked' })).toBe(false);
      expect(await cancelWaitingLeadHandoff(client, { pariwarId: PARIWAR_B, leadId: due.leadId, word: 'consent_revoked' })).toBe(false);
      expect(await handoffRow(client, inFlight.leadId)).toMatchObject({ status: 'attempting', claim_token: token, member_fields_ciphertext: SEALED_PLACEHOLDER });
      expect(await handoffRow(client, failed.leadId)).toMatchObject({ status: 'failed_delivery', member_fields_ciphertext: SEALED_PLACEHOLDER });
      expect(await handoffRow(client, due.leadId)).toMatchObject({ status: 'due', member_fields_ciphertext: SEALED_PLACEHOLDER });
      await expect(cancelWaitingLeadHandoff(client, { pariwarId: PARIWAR_A, leadId: due.leadId, word: 'boom' as never })).rejects.toThrow(/grammar/);
    });

    it('P1\'s page never exceeds the consent reader\'s cap — else a full page could not be told from "none revoked"', () => {
      expect(LEAD_HANDOFF_CONSENT_PAGE).toBeLessThanOrEqual(CONSENTS_FOR_ARTIFACT_LIMIT_CAP);
    });
  });

  describe('P0–P5, in order (QE7; AC5\'s order)', () => {
    async function row(client: Client): Promise<HandoffWorld> {
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await memberEvents(client, w, JOINED);
      await insertHandoffRaw(client, w, { status: 'attempting', attemptCount: 1 });
      return w;
    }

    it('a sound, consented, living member ⇒ ok, with the ciphertext', async () => {
      const { client } = getTx();
      const w = await row(client);
      expect(await predicates(client, w)).toEqual({ kind: 'ok', ciphertext: SEALED_PLACEHOLDER });
    });

    it('P0 — a member the scope read cannot see (another Pariwar\'s member) ⇒ unsound', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      const foreign = await seedMemberRow(client, PARIWAR_B);
      const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: foreign, artifactRef: w.leadId });
      const x = { ...w, memberId: foreign, consentId };
      await insertHandoffRaw(client, x, { status: 'attempting' });
      expect(await predicates(client, x)).toEqual({ kind: 'unsound', why: 'member_not_visible' });
    });

    it('P1 — the row\'s consent revoked ⇒ consent_revoked', async () => {
      const { client } = getTx();
      const w = await row(client);
      await client.query('UPDATE consent_records SET revoked_at = now() WHERE consent_id = $1', [w.consentId]);
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'consent_revoked' });
    });

    it('P1 — a revoke on a SECOND consent row for the same lead cancels too', async () => {
      const { client } = getTx();
      const w = await row(client);
      await seedLeadConsent(client, w.pariwarId, { subjectId: w.memberId, artifactRef: w.leadId, revoked: true });
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'consent_revoked' });
    });

    it('P1 — a revoke on ANOTHER offer\'s consent does NOT (G6)', async () => {
      const { client } = getTx();
      const w = await row(client);
      await seedLeadConsent(client, w.pariwarId, { subjectId: w.memberId, artifactRef: randomUUID(), revoked: true });
      expect((await predicates(client, w)).kind).toBe('ok');
    });

    it('P1 — a FULL page of consent rows is a fault (unsound), never an answer', async () => {
      const { client } = getTx();
      const w = await row(client);
      for (let i = 1; i < LEAD_HANDOFF_CONSENT_PAGE; i += 1) await seedLeadConsent(client, w.pariwarId, { subjectId: w.memberId, artifactRef: w.leadId });
      expect(await predicates(client, w)).toEqual({ kind: 'unsound', why: 'consent_page_full' });
    });

    it('P2 — the fields gone ⇒ member_erased; and the order: consent revoked AND fields gone ⇒ consent_revoked', async () => {
      const { client } = getTx();
      const w = await row(client);
      await client.query('UPDATE marketplace_lead_handoffs SET member_fields_ciphertext = NULL WHERE lead_id = $1', [w.leadId]);
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'member_erased' });
      await client.query('UPDATE consent_records SET revoked_at = now() WHERE consent_id = $1', [w.consentId]);
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'consent_revoked' });
    });

    it('P2 — an anonymized member ⇒ member_erased', async () => {
      const { client } = getTx();
      const w = await seedHandoffWorld(client, PARIWAR_A);
      await memberEvents(client, w, [...JOINED, { type: 'member.withdrawal_completed' }, { type: 'member.rtbf_anonymized' }]);
      await insertHandoffRaw(client, w, { status: 'attempting' });
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'member_erased' });
    });

    it('P3 — withdrawn ⇒ member_withdrawn; terminated ⇒ member_terminated; SUSPENDED is still a member', async () => {
      const { client } = getTx();
      const wd = await seedHandoffWorld(client, PARIWAR_A);
      await memberEvents(client, wd, [...JOINED, { type: 'member.withdrawal_completed' }]);
      await insertHandoffRaw(client, wd, { status: 'attempting' });
      expect(await predicates(client, wd)).toEqual({ kind: 'cancel', word: 'member_withdrawn' });

      const tm = await seedHandoffWorld(client, PARIWAR_A);
      await memberEvents(client, tm, [...JOINED, { type: 'member.moderation.suspended', payload: { reason_code: 'fraud' } }, { type: 'member.moderation.terminated', payload: { reason_code: 'fraud' } }]);
      await insertHandoffRaw(client, tm, { status: 'attempting' });
      expect(await predicates(client, tm)).toEqual({ kind: 'cancel', word: 'member_terminated' });

      const sp = await seedHandoffWorld(client, PARIWAR_A);
      await memberEvents(client, sp, [...JOINED, { type: 'member.moderation.suspended', payload: { reason_code: 'fraud' } }]);
      await insertHandoffRaw(client, sp, { status: 'attempting' });
      expect((await predicates(client, sp)).kind).toBe('ok');
    });

    it('P4 — an account frozen by a claim intake ⇒ account_frozen (P5 also true; P4 is read first)', async () => {
      const { client } = getTx();
      const w = await row(client);
      const claimId = await seedClaim(bindScopedDb(client), w.pariwarId, { deceasedMemberId: w.memberId });
      await seedEvent(bindScopedDb(client), w.pariwarId, { streamId: claimId, eventType: 'claim.intake_initiated', payload: { deceased_member_id: w.memberId }, occurredAt: new Date(Date.now() - 3_600_000) });
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'account_frozen' });
    });

    it('P5 — the freeze LIFTED by a settled claim, the death report still standing ⇒ death_reported', async () => {
      const { client } = getTx();
      const w = await row(client);
      const claimId = await seedClaim(bindScopedDb(client), w.pariwarId, { deceasedMemberId: w.memberId });
      await seedEvent(bindScopedDb(client), w.pariwarId, { streamId: claimId, eventType: 'claim.intake_initiated', payload: { deceased_member_id: w.memberId }, eventVersion: 1, occurredAt: new Date(Date.now() - 7_200_000) });
      await seedEvent(bindScopedDb(client), w.pariwarId, { streamId: claimId, eventType: 'claim.settled', payload: { deceased_member_id: w.memberId }, eventVersion: 2, occurredAt: new Date(Date.now() - 3_600_000) });
      expect(await predicates(client, w)).toEqual({ kind: 'cancel', word: 'death_reported' });
    });

    it('the module is NOT a predicate: a withdrawn module does not change the member-side verdict', async () => {
      const { client } = getTx();
      const w = await row(client);
      await archiveModuleRow(client, w.moduleId, 'trustee_archived');
      expect((await predicates(client, w)).kind).toBe('ok');
    });
  });
});

describe.skipIf(!hasDatabase)('Story 12.5b — the sweep\'s domain half (QE5; AC5, AC8)', () => {
  setupLiveDb();

  it('listWaitingLeadHandoffs flags a partner_form offer\'s row (routePartnerForm); readLeadHandoffModule reads the route and NULL lead columns', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = await seedModule(client, PARIWAR_A, partnerId, { route: 'partner_form' });
    const memberId = await seedMemberRow(client, PARIWAR_A);
    const leadId = randomUUID();
    const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: memberId, artifactRef: leadId });
    // Planted past the 0216 trigger (session-local, inside the per-test transaction).
    await client.query("SET LOCAL session_replication_role = 'replica'");
    await insertHandoffRaw(client, { pariwarId: PARIWAR_A, partnerId, moduleId: pf, memberId, leadId, consentId });
    await client.query("SET LOCAL session_replication_role = 'origin'");
    const rows = (await listWaitingLeadHandoffs(client, { limit: 500 })).filter((r) => r.leadId === leadId);
    expect(rows).toEqual([expect.objectContaining({ leadId, routePartnerForm: true, moduleWithdrawn: false })]);
    expect(await readLeadHandoffModule(client, { pariwarId: PARIWAR_A, moduleId: pf })).toMatchObject({
      leadRoute: 'partner_form',
      leadHandoffUrl: null,
      signingKeySecretName: null,
    });
    // The claim returns it with an EMPTY authority (TR1), ⛔ NULL — even with another authority excluded.
    const claimed = await claimDueLeadHandoff(client, { claimToken: randomUUID(), excludeAuthorities: ['leads.partner.example'] });
    expect(claimed).toMatchObject({ leadId, authority: '' });
  });

  it('W15 purgeExpiredPartnerFormVisits: removes rows MORE than 90 days old (by the DB clock), keeps an 89-day one; bounded by its limit', async () => {
    const { client } = getTx();
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = await seedModule(client, PARIWAR_A, partnerId, { route: 'partner_form' });
    const memberId = await seedMemberRow(client, PARIWAR_A);
    const ins = async (age: string): Promise<string> => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO marketplace_partner_form_visits (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, clock_timestamp() - interval '${age}')`,
        [id, PARIWAR_A, pf, memberId],
      );
      return id;
    };
    // The two rows the BATCH LIMIT is proved on are the OLDEST possible (a century), so no other spec's committed expired row can sort before them
    // (the purge is oldest-first and global); the cut-off is proved on the other three.
    const old1 = await ins('36500 days');
    const old2 = await ins('36499 days');
    await ins('91 days');
    await ins('90 days 1 hour');
    const young = await ins('89 days 23 hours');
    const left = async (): Promise<string[]> =>
      (await client.query<{ visit_id: string }>('SELECT visit_id FROM marketplace_partner_form_visits WHERE member_id = $1', [memberId])).rows.map((r) => r.visit_id);
    // Bounded (review R2P1): a limit of 1 removes EXACTLY one — the oldest — and leaves the next-oldest. Without `LIMIT`, both would go.
    expect(await purgeExpiredPartnerFormVisits(client, { limit: 1 })).toBe(1);
    const afterOne = await left();
    expect(afterOne).not.toContain(old1);
    expect(afterOne).toContain(old2);
    expect(afterOne).toHaveLength(4);
    // The rest: every row MORE than 90 days old goes, the one at 89 days 23 hours stays.
    await purgeExpiredPartnerFormVisits(client, { limit: 5000 });
    expect((await left()).sort()).toEqual([young]);
  });

  // Review RP1 (Decision `2026-11-22-490` (2)). Every other leg here runs as the superuser, which holds every privilege, so a statement
  // the jobs login cannot run passes them all. This leg runs the REAL purge on a role shaped as the production jobs login (0007 DD-3:
  // BYPASSRLS, `IN ROLE twt_service`, created inside this test's transaction): it must remove the old rows on 0217's SELECT + DELETE
  // alone. A row lock (`FOR UPDATE`) would need an UPDATE privilege — 42501 — and the visits must stay un-updatable, which is asserted too.
  it('RP1 / W15: the purge runs on the jobs login\'s own privileges (BYPASSRLS, IN ROLE twt_service) — every Pariwar\'s old rows go; ⛔ UPDATE, ⛔ row lock', async () => {
    const { client } = getTx();
    const pa = await seedPartner(client, PARIWAR_A);
    const pb = await seedPartner(client, PARIWAR_B);
    const ma = await seedModule(client, PARIWAR_A, pa, { route: 'partner_form' });
    const mb = await seedModule(client, PARIWAR_B, pb, { route: 'partner_form' });
    const memA = await seedMemberRow(client, PARIWAR_A);
    const memB = await seedMemberRow(client, PARIWAR_B);
    const ins = async (p: string, m: string, member: string, age: string): Promise<string> => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO marketplace_partner_form_visits (visit_id, pariwar_id, module_id, member_id, opened_at) VALUES ($1, $2, $3, $4, clock_timestamp() - interval '${age}')`,
        [id, p, m, member],
      );
      return id;
    };
    await ins(PARIWAR_A, ma, memA, '91 days');
    await ins(PARIWAR_B, mb, memB, '120 days');
    const youngA = await ins(PARIWAR_A, ma, memA, '89 days 23 hours');
    const login = `twt_service_login_spec_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE ROLE ${login} NOLOGIN BYPASSRLS IN ROLE twt_service`);
    await client.query(`SET LOCAL ROLE ${login}`);
    expect(await purgeExpiredPartnerFormVisits(client)).toBeGreaterThanOrEqual(2);
    // The no-UPDATE contract holds for this login: ⛔ UPDATE, ⛔ a row lock (each refusal in its own savepoint).
    await expectSqlRejected(client, 'UPDATE marketplace_partner_form_visits SET opened_at = opened_at WHERE visit_id = $1', [youngA], '42501');
    await expectSqlRejected(client, 'SELECT 1 FROM marketplace_partner_form_visits WHERE visit_id = $1 FOR UPDATE', [youngA], '42501');
    await client.query('RESET ROLE');
    const left = (
      await client.query<{ visit_id: string }>('SELECT visit_id FROM marketplace_partner_form_visits WHERE member_id = ANY($1::uuid[])', [[memA, memB]])
    ).rows.map((r) => r.visit_id);
    expect(left).toEqual([youngA]);
  });
});
