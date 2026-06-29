// Signup ₹110 Vyawastha Shulk E2E (live DB :5433) — Story 3.6b (Task 10; AC1–AC5).
//
// Drives the full surface through `app.inject`:
//   · Headline (the signup loop closes): a pending-fee member with nominees + medical + tc_acceptance
//     + the niy.lock-in.policy clause → intent → confirm → ONE member.vyawastha_shulk_paid
//     (pending-fee → lock-in) + ONE member.lock_in_entered (lock_in_days_at_join 30 + a real policy
//     version), members.state='lock-in', members.lock_in_days_at_join=30, a receipt row (+1yr).
//   · Gate matrix (AC2) — confirm with EACH of (KYC, nominees, medical, tc) missing → receipt
//     persisted, NO lifecycle event, lockInEntered:false, `outstanding` names the right step.
//   · Idempotency (AC1) — re-confirm with the same tr → same receipt (no 2nd row), no 2nd event.
//   · Policy-unavailable (AC3) — gate satisfied but clause unprovisioned → 503; then provision +
//     re-confirm (same tr) → lock-in completes.
//   · Reference Code (AC4) — 6-digit code → member_attribution row, no validation; omitted → no row;
//     malformed → 400 (contract regex).
//   · Auth — no session → 401; terminal-state member → 409. Intent unconfigured VPA → 503.
//
// Member creation is the signup flow (3.6a); this harness SEEDS members + clauses directly (committed,
// superuser bypasses RLS). Assert MEMBERSHIP not counts (own-committing writers accumulate rows).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const VPA_ENV = { VYAWASTHA_SHULK_VPA: 'twt-trust@upi' };

/** Seed a member in `pending-fee` (signup_initiated → kyc_manual_fallback), committed. */
async function seedMemberPendingFee(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  return seedMember(t, ['signup', 'kyc']);
}

/** Seed a member in `pending-kyc` (signup_initiated only) — the "KYC missing" gate case. */
async function seedMemberPendingKyc(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  return seedMember(t, ['signup']);
}

async function seedMember(
  t: TestApp,
  steps: ('signup' | 'kyc')[],
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    if (steps.includes('signup')) {
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      });
    }
    if (steps.includes('kyc')) {
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
        payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
      });
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed a WITHDRAWN (terminal) member: pending-kyc → pending-fee → lock-in → active → withdrawn. */
async function seedWithdrawnMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    const seq: Array<[string, Json]> = [
      ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
      ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
      ['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 110 }],
      ['member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'expiry', actor: 'system', kyc_verified: true }],
      ['member.withdrawal_completed', { from_state: 'active', to_state: 'withdrawn', trigger: 'withdrawal', actor: 'member' }],
    ];
    for (const [eventType, payload] of seq) {
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: eventType as never, actorId: memberId, payload,
      });
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed the niy.lock-in.policy clause (lock_in_days) into a Pariwar (committed, RLS-bypassed). */
async function seedLockInClause(t: TestApp, pariwarId: string, lockInDays = 30): Promise<string> {
  const cvid = randomUUID();
  await t.pool.query(
    `INSERT INTO clause_versions
       (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
     VALUES ($1, 'niy.lock-in.policy', $2, 1, '2025-01-01T00:00:00Z', $3::jsonb, 'pool')`,
    [cvid, pariwarId, JSON.stringify({ rule_code: 'LOCK-IN', lock_in_days: lockInDays, provisional: true })],
  );
  return cvid;
}

/** Seed a nominee row (gate fact b). */
async function seedNominee(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  await t.pool.query(
    `INSERT INTO member_nominees (member_id, pariwar_id, rank, name_ciphertext, relationship, mobile_ciphertext, split_pct)
     VALUES ($1, $2, 1, 'enc:v1:name', 'spouse', 'enc:v1:mobile', 100)`,
    [memberId, pariwarId],
  );
}

/** Seed a medical disclosure row (gate fact c) — needs a consent row first (FK). */
async function seedMedical(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  const consentId = randomUUID();
  await t.pool.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
     VALUES ($1, $2, $3, 'medical_disclosure_ack', 'member_self', '{}'::jsonb)`,
    [consentId, memberId, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO member_medical_disclosures
       (member_id, pariwar_id, ima_list_version, disclosed_conditions_ciphertext, condition_count, acknowledgment_text_locale, clause_version_id, consent_id)
     VALUES ($1, $2, 'ima-v1', 'enc:v1:[]', 0, 'en', $3, $4)`,
    [memberId, pariwarId, randomUUID(), consentId],
  );
}

/** Seed a tc_acceptance consent (gate fact d). */
async function seedTcConsent(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  await t.pool.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_via_actor, consent_payload)
     VALUES ($1, $2, $3, 'tc_acceptance', 'member_self', '{}'::jsonb)`,
    [randomUUID(), memberId, pariwarId],
  );
}

/** Seed ALL four pre-payment gate facts + the lock-in clause. */
async function seedAllGateFacts(t: TestApp, pariwarId: string, memberId: string): Promise<string> {
  await seedNominee(t, pariwarId, memberId);
  await seedMedical(t, pariwarId, memberId);
  await seedTcConsent(t, pariwarId, memberId);
  return seedLockInClause(t, pariwarId);
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function eventTypes(t: TestApp, memberId: string): Promise<string[]> {
  const res = await t.pool.query<{ event_type: string }>(
    `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
    [memberId],
  );
  return res.rows.map((r) => r.event_type);
}

async function receiptCount(t: TestApp, memberId: string): Promise<number> {
  const r = await t.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM vyawastha_shulk_receipts WHERE member_id = $1`,
    [memberId],
  );
  return r.rows[0]?.n ?? 0;
}

const goodUtr = '123456789012';

describe.skipIf(!hasDatabase)('Vyawastha Shulk — E2E (:5433)', () => {
  it('Headline: full signup loop closes — intent → confirm → lock-in with the 30-day snapshot', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);

      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      expect(intent.status).toBe(200);
      expect(intent.body.amountInr).toBe(110);
      expect(intent.body.vpa).toBe('twt-trust@upi');
      const upiUrl = String(intent.body.upiUrl);
      expect(upiUrl).toContain('upi://pay?');
      expect(upiUrl).toContain('pa=twt-trust%40upi');
      expect(upiUrl).toContain('am=110');
      expect(upiUrl).toContain(`tn=signup-shulk-${memberId}`);
      const tr = String(intent.body.tr);

      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr, utr: goodUtr },
        token: tok,
      });
      expect(confirm.status).toBe(200);
      expect(confirm.body.lockInEntered).toBe(true);
      expect(confirm.body.lockInDaysAtJoin).toBe(30);
      expect(confirm.body.outstanding).toEqual([]);
      expect((confirm.body.receipt as Json).utr).toBe(goodUtr);
      expect((confirm.body.receipt as Json).amountInr).toBe(110);

      // ONE vyawastha_shulk_paid + ONE lock_in_entered; state = lock-in; column = 30.
      const types = await eventTypes(t, memberId);
      expect(types.filter((e) => e === 'member.vyawastha_shulk_paid')).toHaveLength(1);
      expect(types.filter((e) => e === 'member.lock_in_entered')).toHaveLength(1);
      const st = await t.pool.query<{ state: string; days: number }>(
        `SELECT state, lock_in_days_at_join AS days FROM members WHERE member_id = $1`,
        [memberId],
      );
      expect(st.rows[0]?.state).toBe('lock-in');
      expect(st.rows[0]?.days).toBe(30);

      // The lock_in_entered payload carries the snapshot + a real policy version.
      const ev = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.lock_in_entered'`,
        [memberId],
      );
      expect(ev.rows[0]?.payload).toMatchObject({ lock_in_days_at_join: 30 });
      expect(String((ev.rows[0]?.payload as Json).lock_in_policy_version)).toMatch(/[0-9a-f-]{36}/);

      // ONE receipt, valid_through ≈ +1yr.
      expect(await receiptCount(t, memberId)).toBe(1);
      const rc = await t.pool.query<{ paid_at: Date; valid_through: Date }>(
        `SELECT paid_at, valid_through FROM vyawastha_shulk_receipts WHERE member_id = $1`,
        [memberId],
      );
      const deltaDays =
        (rc.rows[0]!.valid_through.getTime() - rc.rows[0]!.paid_at.getTime()) / (24 * 3600 * 1000);
      expect(deltaDays).toBeGreaterThan(360);
      expect(deltaDays).toBeLessThan(370);
    } finally {
      await teardown(t);
    }
  });

  // Gate matrix (AC2) — each of the four pre-payment facts missing → receipt kept, NO event.
  const gateCases: Array<{
    name: string;
    seed: (t: TestApp, pariwarId: string, memberId: string) => Promise<void>;
    pendingKyc?: boolean;
    expectStep: string;
  }> = [
    {
      name: 'KYC missing (member in pending-kyc)',
      pendingKyc: true,
      seed: async (t, p, m) => {
        await seedNominee(t, p, m);
        await seedMedical(t, p, m);
        await seedTcConsent(t, p, m);
        await seedLockInClause(t, p);
      },
      expectStep: 'kyc',
    },
    {
      name: 'nominees missing',
      seed: async (t, p, m) => {
        await seedMedical(t, p, m);
        await seedTcConsent(t, p, m);
        await seedLockInClause(t, p);
      },
      expectStep: 'nominees',
    },
    {
      name: 'medical missing',
      seed: async (t, p, m) => {
        await seedNominee(t, p, m);
        await seedTcConsent(t, p, m);
        await seedLockInClause(t, p);
      },
      expectStep: 'medical',
    },
    {
      name: 'tc_acceptance missing',
      seed: async (t, p, m) => {
        await seedNominee(t, p, m);
        await seedMedical(t, p, m);
        await seedLockInClause(t, p);
      },
      expectStep: 'tc',
    },
  ];

  for (const c of gateCases) {
    it(`Gate (AC2): ${c.name} → receipt persisted, NO lifecycle event, outstanding=[${c.expectStep}]`, async () => {
      const t = await createTestApp({ env: VPA_ENV });
      try {
        const { memberId, pariwarId } = c.pendingKyc
          ? await seedMemberPendingKyc(t)
          : await seedMemberPendingFee(t);
        await c.seed(t, pariwarId, memberId);
        const tok = token(t, memberId, pariwarId);

        const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
        const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
          payload: { tr: String(intent.body.tr), utr: goodUtr },
          token: tok,
        });
        expect(confirm.status).toBe(200);
        expect(confirm.body.lockInEntered).toBe(false);
        expect(confirm.body.outstanding).toContain(c.expectStep);

        // Receipt persisted; NO lifecycle event; state unchanged (still pending-fee / pending-kyc).
        expect(await receiptCount(t, memberId)).toBe(1);
        const types = await eventTypes(t, memberId);
        expect(types).not.toContain('member.vyawastha_shulk_paid');
        expect(types).not.toContain('member.lock_in_entered');
      } finally {
        await teardown(t);
      }
    });
  }

  it('Idempotency (AC1): re-confirm with the same tr → same receipt (no 2nd row), no 2nd event', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);

      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const tr = String(intent.body.tr);

      const first = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(first.status).toBe(200);
      expect(first.body.lockInEntered).toBe(true);

      const second = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(second.status).toBe(200);
      expect(second.body.lockInEntered).toBe(true);

      // Exactly ONE receipt + ONE of each lifecycle event despite the re-confirm.
      expect(await receiptCount(t, memberId)).toBe(1);
      const types = await eventTypes(t, memberId);
      expect(types.filter((e) => e === 'member.vyawastha_shulk_paid')).toHaveLength(1);
      expect(types.filter((e) => e === 'member.lock_in_entered')).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });

  it('Policy-unavailable (AC3): gate satisfied but clause unprovisioned → 503; then provision + re-confirm completes', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      // Seed the four facts but NOT the lock-in clause.
      await seedNominee(t, pariwarId, memberId);
      await seedMedical(t, pariwarId, memberId);
      await seedTcConsent(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);

      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const tr = String(intent.body.tr);

      const blocked = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(blocked.status).toBe(503);
      expect(String((blocked.body.error as Json)?.code)).toBe('lock_in.policy_unavailable');
      // Receipt persisted (D3); NO event; state still pending-fee.
      expect(await receiptCount(t, memberId)).toBe(1);
      expect(await eventTypes(t, memberId)).not.toContain('member.vyawastha_shulk_paid');

      // Provision the clause, then re-confirm (same tr) → lock-in completes idempotently.
      await seedLockInClause(t, pariwarId);
      const completed = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(completed.status).toBe(200);
      expect(completed.body.lockInEntered).toBe(true);
      expect(await receiptCount(t, memberId)).toBe(1); // still ONE receipt
      const types = await eventTypes(t, memberId);
      expect(types.filter((e) => e === 'member.vyawastha_shulk_paid')).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });

  it('Reference Code (AC4): a 6-digit code → member_attribution row (no validation); omitted → no row', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const withCode = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, withCode.pariwarId, withCode.memberId);
      const tokA = token(t, withCode.memberId, withCode.pariwarId);
      const intentA = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tokA });
      const withRes = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intentA.body.tr), utr: goodUtr, referenceCode: '654321' },
        token: tokA,
      });
      expect(withRes.status).toBe(200);
      const attr = await t.pool.query<{ attribution_source: string }>(
        `SELECT attribution_source FROM member_attribution WHERE member_id = $1`,
        [withCode.memberId],
      );
      expect(attr.rows).toHaveLength(1);
      expect(attr.rows[0]?.attribution_source).toBe('654321');

      // Omitted code → no attribution row.
      const noCode = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, noCode.pariwarId, noCode.memberId);
      const tokB = token(t, noCode.memberId, noCode.pariwarId);
      const intentB = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tokB });
      await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intentB.body.tr), utr: goodUtr }, token: tokB,
      });
      const none = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM member_attribution WHERE member_id = $1`,
        [noCode.memberId],
      );
      expect(none.rows[0]?.n).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('Reference Code (AC4): a malformed (non-6-digit) code → 400 (contract regex)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intent.body.tr), utr: goodUtr, referenceCode: '12ab' },
        token: tok,
      });
      expect(res.status).toBe(400);
      expect(await receiptCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects a malformed UTR (400 — contract regex)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intent.body.tr), utr: 'short' }, token: tok,
      });
      expect(res.status).toBe(400);
      expect(await receiptCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('accepts a 22-char alphanumeric UTR (NEFT/RTGS permissive validation)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intent.body.tr), utr: 'ABCD1234EFGH5678IJKL90' }, token: tok,
      });
      expect(res.status).toBe(200);
      expect(res.body.lockInEntered).toBe(true);
    } finally {
      await teardown(t);
    }
  });

  it('intent 503s when the trust VPA is unconfigured', async () => {
    const t = await createTestApp(); // no VPA env
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(503);
      expect(String((res.body.error as Json)?.code)).toBe('vyawastha_shulk.unconfigured');
    } finally {
      await teardown(t);
    }
  });

  it('confirm rejects a terminal-state member (409)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedWithdrawnMember(t);
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intent.body.tr), utr: goodUtr }, token: tok,
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('vyawastha_shulk.member_terminal');
    } finally {
      await teardown(t);
    }
  });

  it('status returns paid / lock-in view', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedAllGateFacts(t, pariwarId, memberId);
      const tok = token(t, memberId, pariwarId);

      const before = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/status', { token: tok });
      expect(before.status).toBe(200);
      expect(before.body.paid).toBe(false);
      expect(before.body.lockInEntered).toBe(false);

      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', { token: tok });
      await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: String(intent.body.tr), utr: goodUtr }, token: tok,
      });

      const after = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/status', { token: tok });
      expect(after.body.paid).toBe(true);
      expect(after.body.lockInEntered).toBe(true);
      expect(after.body.validThrough).toBeDefined();
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/intent', {});
      expect(intent.status).toBe(401);
      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/confirm', {
        payload: { tr: 'x', utr: goodUtr },
      });
      expect(confirm.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
