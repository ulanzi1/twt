// Story 3.13 — staff check a typed-in identity in life: the writer, the eligibility rule, the death lock, the queue and
// the detail (Task 2.4; AC3, AC4, AC5, AC6, AC10's domain half). Live DB (the story's own container), each test in its
// own rolled-back transaction.
//
// ⚠ Every "nothing written" assertion has a passing control beside it ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import { intakeAdvisoryLockKey } from '../../../src/claim/icp-lock.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type MemberId, type PariwarId } from '../../../src/ids/index.js';
import {
  IdentityValidationRecordedPayloadSchema,
  IdentityValidationRefusedError,
  assertIdentityCheckAwaited,
  listIdentityCheckQueue,
  listIdentityCheckQueuePage,
  readIdentityCheckDetail,
  recordIdentityValidation,
  type RecordIdentityValidationInput,
} from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedEvent } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

/** The staff member (`events_log.actor_id` is a uuid). */
const STAFF_ACTOR = randomUUID();

/** The event types that replay a fresh stream to each state (the reducer's own arms — ⛔ a `members.state` poke). */
const STREAM_TO: Record<string, string[]> = {
  'pending-kyc': ['member.signup_initiated'],
  'pending-fee': ['member.signup_initiated', 'member.kyc_manual_fallback'],
  'lock-in': ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid'],
  'pending-valid': ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:false'],
  active: ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:true'],
  'active-in-grace': [
    'member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:true',
    'member.grace_entered',
  ],
  'lapsed-unpaid': [
    'member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:true',
    'member.grace_entered', 'member.grace_expired',
  ],
  withdrawn: [
    'member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:true',
    'member.withdrawal_completed',
  ],
  anonymized: ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.rtbf_anonymized'],
};

interface SeedOpts {
  state?: keyof typeof STREAM_TO;
  kyc?: { verificationStrength: 'aadhaar_kyc' | 'self_declared' | 'unverified'; trusteeVerified: boolean } | null;
  moderation?: ('suspended' | 'terminated' | 'restored')[];
  district?: string | null;
  createdAt?: Date;
  pariwarId?: PariwarId;
}

/** Seed (as the superuser) a member whose stream replays to `state`, its `members` row, a KYC row, a posting. */
async function seedTypedInMember(tx: Tx, opts: SeedOpts = {}): Promise<MemberId> {
  const pariwarId = opts.pariwarId ?? PARIWAR_A;
  const memberId = randomUUID();
  const state = opts.state ?? 'lock-in';
  const events = [...STREAM_TO[state]!, ...(opts.moderation ?? []).map((m) => `member.moderation.${m}`)];
  for (const [i, spec] of events.entries()) {
    const [eventType, flag] = spec.split(':');
    const payload = flag === undefined ? {} : { kyc_verified: flag === 'true' };
    await seedEvent(tx, pariwarId, { streamId: memberId, eventType, payload, eventVersion: i + 1 });
  }
  await tx.insert(schema.members).values({
    memberId: toMemberId(memberId),
    pariwarId,
    state: state as never,
    stateEventVersion: events.length,
    ...(opts.createdAt !== undefined ? { createdAt: opts.createdAt } : {}),
  });
  const kyc = opts.kyc === undefined ? { verificationStrength: 'self_declared' as const, trusteeVerified: false } : opts.kyc;
  if (kyc !== null) {
    await tx.insert(schema.memberKycProfiles).values({
      memberId: toMemberId(memberId),
      pariwarId,
      nameCiphertext: 'enc:v1:name',
      dobCiphertext: 'enc:v1:dob',
      photoCiphertext: 'enc:v1:photo',
      aadhaarMaskedId: null,
      verificationStrength: kyc.verificationStrength,
      source: kyc.verificationStrength === 'aadhaar_kyc' ? 'digilocker' : 'manual',
      trusteeVerified: kyc.trusteeVerified,
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    });
  }
  const district = opts.district === undefined ? 'district-north' : opts.district;
  if (district !== null) {
    await tx.insert(schema.memberPostings).values({ memberId: toMemberId(memberId), pariwarId, district, isRetirement: false });
  }
  return toMemberId(memberId);
}

const CONFIRM: Omit<RecordIdentityValidationInput, 'memberId' | 'pariwarId'> = {
  outcome: 'confirmed',
  evidenceKind: 'photo_id_in_person',
  documentKind: 'voter_id',
  notConfirmedReason: null,
  noteCiphertext: null,
  actorId: STAFF_ACTOR,
  actorDisplay: 'Asha District Admin',
};

const NOT_CONFIRMED: Omit<RecordIdentityValidationInput, 'memberId' | 'pariwarId'> = {
  ...CONFIRM,
  outcome: 'not_confirmed',
  notConfirmedReason: 'details_do_not_match',
  noteCiphertext: 'enc:v1:the-note',
};

async function kycRow(client: pg.PoolClient, memberId: string) {
  const r = await client.query(`SELECT * FROM member_kyc_profiles WHERE member_id = $1`, [memberId]);
  return r.rows[0] as Record<string, unknown> | undefined;
}
async function eventTypes(client: pg.PoolClient, memberId: string): Promise<string[]> {
  const r = await client.query<{ event_type: string }>(
    `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
    [memberId],
  );
  return r.rows.map((x) => x.event_type);
}
async function validationCount(client: pg.PoolClient, memberId: string): Promise<number> {
  const r = await client.query<{ n: string }>(`SELECT count(*) AS n FROM member_identity_validations WHERE member_id = $1`, [memberId]);
  return Number(r.rows[0]!.n);
}

async function refusal(p: Promise<unknown>): Promise<IdentityValidationRefusedError> {
  const err = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(IdentityValidationRefusedError);
  return err as IdentityValidationRefusedError;
}

/** A proxy over the client that records every SQL text, in order (the lock-order proof). */
function recording(client: pg.PoolClient): { client: pg.PoolClient; texts: string[] } {
  const texts: string[] = [];
  const proxy = new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'query') {
        return (...args: unknown[]) => {
          const first = args[0];
          texts.push(typeof first === 'string' ? first : String((first as { text?: string }).text ?? ''));
          return (target.query as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      const v = Reflect.get(target, prop, receiver) as unknown;
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  });
  return { client: proxy, texts };
}

describe.skipIf(!hasDatabase)('Story 3.13 — recordIdentityValidation (live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  // ── AC3 / AC4 — the confirmed path ───────────────────────────────────────────────────────────────────────────────

  it('⭐ AC3 — `confirmed` flips `trustee_verified` and ⛔ other KYC column changes (byte-identical except the flag + updated_at)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const before = await kycRow(client, memberId);
    const result = await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    const after = await kycRow(client, memberId);
    expect(before!.trustee_verified).toBe(false);
    expect(after!.trustee_verified).toBe(true);
    expect((after!.updated_at as Date).getTime()).not.toBe((before!.updated_at as Date).getTime());
    const without = (r: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'trustee_verified' && k !== 'updated_at'));
    const restBefore = without(before!);
    const restAfter = without(after!);
    expect(restAfter).toEqual(restBefore);
    expect(Object.keys(restBefore).length).toBeGreaterThan(6); // the control: the comparison sees the identity columns
    expect(result.outcome).toBe('confirmed');
    // The record snapshots the KYC row it checked (F2).
    const row = await client.query(`SELECT kyc_profile_updated_at FROM member_identity_validations WHERE validation_id = $1`, [
      result.validationId,
    ]);
    expect((row.rows[0]!.kyc_profile_updated_at as Date).toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('⭐ AC3 — ONE transaction: a failure AFTER the flag UPDATE leaves the flag false and ⛔ row (with the control that both had been written)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    // Fail the first events_log INSERT (the marker — step 6, AFTER the row insert and the flag UPDATE).
    const failing = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'query') {
          return (...args: unknown[]) => {
            const first = args[0];
            const text = typeof first === 'string' ? first : String((first as { text?: string }).text ?? '');
            if (/insert into "events_log"/i.test(text)) return Promise.reject(new Error('forced failure after the flag'));
            return (target.query as (...a: unknown[]) => unknown).apply(target, args);
          };
        }
        const v = Reflect.get(target, prop, receiver) as unknown;
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
      },
    });
    await client.query('SAVEPOINT one_tx');
    const err = await recordIdentityValidation(failing, { ...CONFIRM, pariwarId: PARIWAR_A, memberId }).then(
      () => undefined,
      (e: unknown) => e,
    );
    // The reason (drizzle wraps the driver error under `.cause`).
    expect(String((err as { cause?: Error }).cause?.message ?? (err as Error).message)).toBe('forced failure after the flag');
    // The control: inside the transaction, BOTH writes had happened before the failure.
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(true);
    expect(await validationCount(client, memberId)).toBe(1);
    await client.query('ROLLBACK TO SAVEPOINT one_tx');
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(false);
    expect(await validationCount(client, memberId)).toBe(0);
  });

  it('⭐ AC4 — from `lock-in`: the marker ONLY (⛔ `kyc_completed`), the state stays `lock-in`, the payload is DL3', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { state: 'lock-in' });
    await enterAppScope(client, PARIWAR_A);
    const before = await eventTypes(client, memberId);
    const result = await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect(await eventTypes(client, memberId)).toEqual([...before, 'member.identity_validation_recorded']);
    expect(result).toMatchObject({ state: 'lock-in', kycCompleted: false });
    const ev = await client.query(
      `SELECT payload, actor_id FROM events_log WHERE stream_id = $1 AND event_type = 'member.identity_validation_recorded'`,
      [memberId],
    );
    expect(ev.rows[0]).toEqual({
      actor_id: STAFF_ACTOR,
      payload: {
        from_state: 'lock-in',
        to_state: 'lock-in',
        trigger: 'staff_identity_validation',
        actor: 'trustee',
        validation_id: result.validationId,
        outcome: 'confirmed',
      },
    });
    const m = await client.query(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
    expect(m.rows[0]!.state).toBe('lock-in');
  });

  it('⭐ AC4 — from `pending-valid`: the marker AND `member.kyc_completed`; the projected state becomes `active`', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { state: 'pending-valid' });
    await enterAppScope(client, PARIWAR_A);
    const result = await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    const types = await eventTypes(client, memberId);
    expect(types.slice(-2)).toEqual(['member.identity_validation_recorded', 'member.kyc_completed']);
    expect(result).toMatchObject({ state: 'active', kycCompleted: true });
    const kc = await client.query(`SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.kyc_completed'`, [memberId]);
    expect(kc.rows[0]!.payload).toEqual({
      from_state: 'pending-valid',
      to_state: 'active',
      trigger: 'staff_identity_validation',
      actor: 'trustee',
      kyc_reference: result.validationId,
    });
    const m = await client.query(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
    expect(m.rows[0]!.state).toBe('active');
  });

  it('AC4 — a `not_confirmed` from `pending-valid` moves ⛔ (N6): the marker only, the flag untouched', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { state: 'pending-valid' });
    await enterAppScope(client, PARIWAR_A);
    const result = await recordIdentityValidation(client, { ...NOT_CONFIRMED, pariwarId: PARIWAR_A, memberId });
    expect(result).toMatchObject({ state: 'pending-valid', kycCompleted: false, outcome: 'not_confirmed' });
    expect((await eventTypes(client, memberId)).at(-1)).toBe('member.identity_validation_recorded');
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(false);
  });

  it('AC4 — the marker payload is `.strict()`: an extra key (a name) is refused; the DL3 shape parses', () => {
    const ok = {
      from_state: 'lock-in',
      to_state: 'lock-in',
      trigger: 'staff_identity_validation',
      actor: 'trustee',
      validation_id: randomUUID(),
      outcome: 'not_confirmed',
    };
    expect(IdentityValidationRecordedPayloadSchema.safeParse(ok).success).toBe(true);
    expect(IdentityValidationRecordedPayloadSchema.safeParse({ ...ok, name: 'Asha' }).success).toBe(false);
    expect(IdentityValidationRecordedPayloadSchema.safeParse({ ...ok, not_confirmed_reason: 'details_do_not_match' }).success).toBe(false);
    expect(IdentityValidationRecordedPayloadSchema.safeParse({ ...ok, actor: 'member' }).success).toBe(false);
  });

  it('DL9 — staff may record again: a later act supersedes the live one (one live row; the history kept)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const first = await recordIdentityValidation(client, { ...NOT_CONFIRMED, pariwarId: PARIWAR_A, memberId });
    const second = await recordIdentityValidation(client, {
      ...NOT_CONFIRMED,
      notConfirmedReason: 'member_not_reached',
      evidenceKind: null,
      documentKind: null,
      pariwarId: PARIWAR_A,
      memberId,
    });
    expect(second.supersededValidationId).toBe(first.validationId);
    const third = await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect(third.supersededValidationId).toBe(second.validationId);
    const rows = await client.query(
      `SELECT validation_id, superseded_reason FROM member_identity_validations WHERE member_id = $1 AND superseded_at IS NULL`,
      [memberId],
    );
    expect(rows.rows).toEqual([{ validation_id: third.validationId, superseded_reason: null }]);
    expect(await validationCount(client, memberId)).toBe(3);
  });

  // ── AC5 — DL4: every refused case writes nothing ─────────────────────────────────────────────────────────────────

  const REFUSED: [string, SeedOpts][] = [
    ['no KYC row', { kyc: null }],
    ['a DigiLocker identity (aadhaar_kyc)', { kyc: { verificationStrength: 'aadhaar_kyc', trusteeVerified: false } }],
    ['the `unverified` headroom value', { kyc: { verificationStrength: 'unverified', trusteeVerified: false } }],
    ['already verified', { kyc: { verificationStrength: 'self_declared', trusteeVerified: true } }],
    ['pending-kyc (⛔ yet a member)', { state: 'pending-kyc' }],
    ['pending-fee (⛔ yet a member)', { state: 'pending-fee' }],
    ['active', { state: 'active' }],
    ['active-in-grace', { state: 'active-in-grace' }],
    ['lapsed-unpaid', { state: 'lapsed-unpaid' }],
    ['withdrawn', { state: 'withdrawn' }],
    ['anonymized', { state: 'anonymized' }],
    ['moderation `terminated`', { moderation: ['suspended', 'terminated'] }],
  ];

  it.each(REFUSED)('⭐ AC5 — refused `not_eligible`, ⛔ row, ⛔ event, flag unchanged: %s', async (_label, opts) => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, opts);
    const control = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const eventsBefore = await eventTypes(client, memberId);
    const flagBefore = (await kycRow(client, memberId))?.trustee_verified;
    await client.query('SAVEPOINT refused');
    const err = await refusal(recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId }));
    expect(err.reason).toBe('not_eligible');
    await client.query('ROLLBACK TO SAVEPOINT refused');
    expect(await validationCount(client, memberId)).toBe(0);
    expect(await eventTypes(client, memberId)).toEqual(eventsBefore);
    expect((await kycRow(client, memberId))?.trustee_verified).toBe(flagBefore);
    // The passing control beside it: an eligible typed-in member in the same transaction is recorded.
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId: control });
    expect(await validationCount(client, control)).toBe(1);
  });

  it('⭐ AC5 — the refusal is thrown BEFORE any write (⛔ a savepoint hides a written row): a refused call issues ⛔ INSERT / UPDATE', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { kyc: { verificationStrength: 'self_declared', trusteeVerified: true } });
    await enterAppScope(client, PARIWAR_A);
    const rec = recording(client);
    await refusal(recordIdentityValidation(rec.client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId }));
    expect(rec.texts.length).toBeGreaterThan(2); // the control: the reads ran through the recorder
    expect(rec.texts.filter((t) => /^\s*(insert|update)\b/i.test(t))).toEqual([]);
  });

  it('DL4 — a `suspended` member CAN be checked (identity is a fact; a suspension ends)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { moderation: ['suspended'] });
    await enterAppScope(client, PARIWAR_A);
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(true);
  });

  it('a malformed shape is refused `invalid_shape` before any read (a confirmation with a reason; a blank display)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const rec = recording(client);
    expect((await refusal(recordIdentityValidation(rec.client, { ...CONFIRM, notConfirmedReason: 'details_do_not_match', pariwarId: PARIWAR_A, memberId }))).reason).toBe('invalid_shape');
    expect((await refusal(recordIdentityValidation(rec.client, { ...CONFIRM, actorDisplay: '  ', pariwarId: PARIWAR_A, memberId }))).reason).toBe('invalid_shape');
    expect((await refusal(recordIdentityValidation(rec.client, { ...NOT_CONFIRMED, noteCiphertext: null, pariwarId: PARIWAR_A, memberId }))).reason).toBe('invalid_shape');
    expect(rec.texts).toEqual([]);
  });

  it('an unknown member is `not_found`', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const err = await refusal(recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId: toMemberId(randomUUID()) }));
    expect(err.reason).toBe('not_found');
  });

  // ── AC6 — the death lock FIRST ──────────────────────────────────────────────────────────────────────────────────

  it('⭐⭐ AC6 — the FIRST statement is the intake advisory lock for (pariwar, member), and the key is HELD after the call', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const rec = recording(client);
    await recordIdentityValidation(rec.client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect(rec.texts[0]).toBe('SELECT pg_advisory_xact_lock($1)');
    const key = intakeAdvisoryLockKey(PARIWAR_A, memberId);
    const held = await client.query(
      `SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND granted
          AND classid = $1::bigint::oid AND objid = $2::bigint::oid`,
      [(key >> 32n).toString(), (key & 0xffffffffn).toString()],
    );
    expect(held.rows[0]!.n).toBe(1);
  });

  it('⭐ AC6 — a standing death report ⇒ `death_reported`, nothing written; the detail says so; released as innocent ⇒ the POST succeeds', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    const claimCaseId = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'intake_pending' });
    await enterAppScope(client, PARIWAR_A);
    const eventsBefore = await eventTypes(client, memberId);
    const rec = recording(client);
    const err = await refusal(recordIdentityValidation(rec.client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId }));
    expect(err.reason).toBe('death_reported');
    expect(rec.texts.filter((t) => /^\s*(insert|update)\b/i.test(t))).toEqual([]);
    expect(rec.texts[0]).toBe('SELECT pg_advisory_xact_lock($1)');
    expect(await validationCount(client, memberId)).toBe(0);
    expect(await eventTypes(client, memberId)).toEqual(eventsBefore);
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(false);
    const detail = await readIdentityCheckDetail(tx, PARIWAR_A, memberId, new Date());
    expect(detail!.deathReported).toBe(true);
    // The reveal is refused the same way (DL6a).
    expect((await refusal(assertIdentityCheckAwaited(client, PARIWAR_A, memberId))).reason).toBe('death_reported');

    // Released: the `member_found_innocent` finding (a RAW row — `seedClaim` has ⛔ events).
    await tx.insert(schema.claimNomineeFindings).values({
      findingId: randomUUID() as never,
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: PARIWAR_A,
      kind: 'member_found_innocent',
      rank: null,
      recordedByActorId: 'investigator',
      recordedByDisplay: 'Investigator',
    });
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect((await kycRow(client, memberId))!.trustee_verified).toBe(true);
    expect((await readIdentityCheckDetail(tx, PARIWAR_A, memberId, new Date()))!.deathReported).toBe(false);
  });

  // ── DL6a — the reveal's purpose check ──────────────────────────────────────────────────────────────────────────

  it('DL6a — `assertIdentityCheckAwaited` passes for an awaited member and refuses `not_eligible` once confirmed', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await expect(assertIdentityCheckAwaited(client, PARIWAR_A, memberId)).resolves.toBeUndefined();
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect((await refusal(assertIdentityCheckAwaited(client, PARIWAR_A, memberId))).reason).toBe('not_eligible');
  });

  it('⭐ P8 — `assertIdentityCheckAwaited` (the reveal\'s check) takes the intake advisory lock FIRST, as the writer does — with the death-claimed control refused the same way', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    const claimed = await seedTypedInMember(tx);
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: claimed, currentState: 'intake_pending' });
    await enterAppScope(client, PARIWAR_A);
    const rec = recording(client);
    await assertIdentityCheckAwaited(rec.client, PARIWAR_A, memberId);
    expect(rec.texts[0]).toBe('SELECT pg_advisory_xact_lock($1)');
    const recDead = recording(client);
    expect((await refusal(assertIdentityCheckAwaited(recDead.client, PARIWAR_A, claimed))).reason).toBe('death_reported');
    expect(recDead.texts[0]).toBe('SELECT pg_advisory_xact_lock($1)');
  });

  // ── AC10 (domain half) — the queue and the detail ───────────────────────────────────────────────────────────────

  it('⭐ AC10 — the queue: exactly the DL4-eligible members, `pending-valid` first, then signup ascending, ties by member_id; ⛔ ciphertext', async () => {
    const { tx, client } = getTx();
    const pariwarId = toPariwarId(randomUUID()); // a fresh tenant — committed rows of other specs never reach it
    const t = (d: string) => new Date(`2026-0${d}T00:00:00Z`);
    const old = await seedTypedInMember(tx, { pariwarId, createdAt: t('1-01') });
    const tieA = await seedTypedInMember(tx, { pariwarId, createdAt: t('2-01') });
    const tieB = await seedTypedInMember(tx, { pariwarId, createdAt: t('2-01') });
    const pv = await seedTypedInMember(tx, { pariwarId, state: 'pending-valid', createdAt: t('5-01') });
    const unposted = await seedTypedInMember(tx, { pariwarId, district: null, createdAt: t('3-01') });
    const south = await seedTypedInMember(tx, { pariwarId, district: 'district-south', createdAt: t('4-01') });
    // Not eligible — every one is left out.
    await seedTypedInMember(tx, { pariwarId, kyc: { verificationStrength: 'aadhaar_kyc', trusteeVerified: false } });
    await seedTypedInMember(tx, { pariwarId, kyc: { verificationStrength: 'self_declared', trusteeVerified: true } });
    await seedTypedInMember(tx, { pariwarId, kyc: null });
    await seedTypedInMember(tx, { pariwarId, state: 'pending-fee' });
    await seedTypedInMember(tx, { pariwarId, state: 'withdrawn' });
    await seedTypedInMember(tx, { pariwarId, moderation: ['suspended', 'terminated'] });
    // Restored after a termination ⇒ eligible again (the LATEST action decides).
    const restored = await seedTypedInMember(tx, { pariwarId, moderation: ['suspended', 'terminated', 'restored'], createdAt: t('6-01') });
    await enterAppScope(client, pariwarId);
    // A not_confirmed on `old` — latest outcome + attempt count.
    await recordIdentityValidation(client, { ...NOT_CONFIRMED, pariwarId, memberId: old });

    const [first, second] = [tieA, tieB].sort();
    const all = await listIdentityCheckQueue(tx, pariwarId, { at: new Date(), district: null });
    expect(all.map((r) => r.memberId)).toEqual([pv, old, first, second, unposted, south, restored]);
    expect(all.find((r) => r.memberId === old)).toMatchObject({ latestOutcome: 'not_confirmed', attemptCount: 1, district: 'district-north' });
    expect(all.find((r) => r.memberId === unposted)).toMatchObject({ district: null, latestOutcome: null, attemptCount: 0 });
    expect(JSON.stringify(all)).not.toContain('enc:v1');

    // A district caller's page: that district only, and ⛔ the unposted member.
    const north = await listIdentityCheckQueue(tx, pariwarId, { at: new Date(), district: 'district-north' });
    expect(north.map((r) => r.memberId)).toEqual([pv, old, first, second, restored]);
    // Pagination is a true page.
    const page = await listIdentityCheckQueue(tx, pariwarId, { at: new Date(), district: null, limit: 2, offset: 2 });
    expect(page.map((r) => r.memberId)).toEqual([first, second]);
    // A confirmed member leaves the queue.
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId, memberId: south });
    expect((await listIdentityCheckQueue(tx, pariwarId, { at: new Date(), district: null })).map((r) => r.memberId)).not.toContain(south);
  });

  it('⭐ `-504` item 3 — the queue leaves out a member with a standing death report (the claim module\'s ONE predicate) and lists them again once released as innocent; `hasMore` is true exactly when another page follows', async () => {
    const { tx, client } = getTx();
    const pariwarId = toPariwarId(randomUUID());
    const t = (d: string) => new Date(`2026-0${d}T00:00:00Z`);
    const first = await seedTypedInMember(tx, { pariwarId, createdAt: t('1-01') });
    const dead = await seedTypedInMember(tx, { pariwarId, createdAt: t('2-01') });
    const last = await seedTypedInMember(tx, { pariwarId, createdAt: t('3-01') });
    const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: dead, currentState: 'intake_pending' });
    await enterAppScope(client, pariwarId);
    const opts = { at: new Date(), district: null } as const;
    // The claim stands ⇒ ⛔ listed; every other member is (the control that the exclusion is the claim, not the data).
    expect((await listIdentityCheckQueue(tx, pariwarId, opts)).map((r) => r.memberId)).toEqual([first, last]);
    // Released as innocent ⇒ listed again, in his signup place.
    await tx.insert(schema.claimNomineeFindings).values({
      findingId: randomUUID() as never,
      claimCaseId: toClaimId(claimCaseId),
      pariwarId,
      kind: 'member_found_innocent',
      rank: null,
      recordedByActorId: 'investigator',
      recordedByDisplay: 'Investigator',
    });
    expect((await listIdentityCheckQueue(tx, pariwarId, opts)).map((r) => r.memberId)).toEqual([first, dead, last]);
    // `hasMore`: the page boundary, exactly. ONE row more is read; ⛔ it is returned.
    const p1 = await listIdentityCheckQueuePage(tx, pariwarId, { ...opts, limit: 2 });
    expect(p1.entries.map((r) => r.memberId)).toEqual([first, dead]);
    expect(p1.hasMore).toBe(true);
    const p2 = await listIdentityCheckQueuePage(tx, pariwarId, { ...opts, limit: 2, offset: 2 });
    expect(p2.entries.map((r) => r.memberId)).toEqual([last]);
    expect(p2.hasMore).toBe(false);
    const exact = await listIdentityCheckQueuePage(tx, pariwarId, { ...opts, limit: 3 });
    expect(exact.entries).toHaveLength(3);
    expect(exact.hasMore).toBe(false);
    expect((await listIdentityCheckQueuePage(tx, pariwarId, { ...opts, limit: 1, offset: 3 })).hasMore).toBe(false);
  });

  it('AC10 — the detail: ciphertext as stored, the posting, the history (live first) and ONLY the live note', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordIdentityValidation(client, { ...NOT_CONFIRMED, noteCiphertext: 'enc:v1:first-note', pariwarId: PARIWAR_A, memberId });
    await recordIdentityValidation(client, { ...NOT_CONFIRMED, notConfirmedReason: 'no_document_shown', documentKind: null, noteCiphertext: 'enc:v1:second-note', pariwarId: PARIWAR_A, memberId });
    const d = await readIdentityCheckDetail(tx, PARIWAR_A, memberId, new Date());
    expect(d).toMatchObject({
      state: 'lock-in',
      moderationStatus: 'none',
      deathReported: false,
      ineligibility: null,
      posting: { district: 'district-north', workplaceName: null },
      liveNoteCiphertext: 'enc:v1:second-note',
      kyc: { nameCiphertext: 'enc:v1:name', dobCiphertext: 'enc:v1:dob', photoCiphertext: 'enc:v1:photo', verificationStrength: 'self_declared' },
    });
    expect(d!.history.map((h) => [h.notConfirmedReason, h.live])).toEqual([
      ['no_document_shown', true],
      ['details_do_not_match', false],
    ]);
    expect(JSON.stringify(d!.history)).not.toContain('first-note');
    expect(await readIdentityCheckDetail(tx, PARIWAR_A, toMemberId(randomUUID()), new Date())).toBeNull();
  });
});
