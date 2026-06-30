// Annual renewal E2E (live DB :5433) — Story 3.8 (Task 3 + Task 4; AC2/AC3/AC4/AC5).
//
// Drives the renewal surface through `app.inject`:
//   · renewal-status (AC4) — a member at each lifecycle position (active pre-grace, active-in-grace,
//     lapsed-unpaid, never-renewed) returns the canonical FR-12A payload {paid_through,
//     days_until_lapse, in_renewal_grace, grace_remaining_days}; 401 without a session.
//   · renew/intent + renew/confirm (AC2/AC3) — renew from active-in-grace → state returns to active,
//     a NEW receipt extends valid_through, NO lock_in_entered emitted (no re-lock-in); renew from
//     lapsed-unpaid → active; renew early from active → stays active; idempotent re-confirm on the
//     same `tr`; a non-renewable (pending-fee) member → 409.
//
// Members are SEEDED directly via projectMemberState (committed; superuser bypasses RLS) + a receipt
// row at a chosen valid_through. Assert MEMBERSHIP not counts (own-committing writers accumulate rows);
// each test uses a fresh member so per-stream event/receipt counts stay deterministic.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;
const VPA_ENV = { VYAWASTHA_SHULK_VPA: 'twt-trust@upi' };
const DAY_MS = 24 * 60 * 60 * 1000;
const goodUtr = '123456789012';

type SeedState = 'pending-fee' | 'active' | 'active-in-grace' | 'lapsed-unpaid';

/** Event sequence (type, payload) that drives a fresh stream to `target`. */
function sequenceFor(target: SeedState): Array<[string, Json]> {
  const seq: Array<[string, Json]> = [
    ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
    ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
  ];
  if (target === 'pending-fee') return seq;
  seq.push(['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0001', amount_inr: 110, kind: 'signup' }]);
  seq.push(['member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'expiry', actor: 'system', kyc_verified: true }]);
  if (target === 'active') return seq;
  seq.push(['member.grace_entered', { from_state: 'active', to_state: 'active-in-grace', trigger: 'grace', actor: 'system' }]);
  if (target === 'active-in-grace') return seq;
  seq.push(['member.grace_expired', { from_state: 'active-in-grace', to_state: 'lapsed-unpaid', trigger: 'grace_expired', actor: 'system' }]);
  return seq;
}

/**
 * Seed a member at `target` (committed) + optionally a receipt at `validThrough`. Returns ids. The
 * receipt is inserted directly (superuser bypasses RLS) so the renewal-status arithmetic is exercised
 * against a controlled `valid_through`.
 */
async function seedMember(
  t: TestApp,
  target: SeedState,
  validThrough?: Date,
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    for (const [eventType, payload] of sequenceFor(target)) {
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: mid, pariwarId: pid, eventType: eventType as never, actorId: memberId, payload,
      });
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  if (validThrough) {
    await t.pool.query(
      `INSERT INTO vyawastha_shulk_receipts (member_id, pariwar_id, tr, utr, amount_inr, payment_method, valid_through)
       VALUES ($1, $2, $3, $4, 110, 'upi_intent', $5)`,
      [memberId, pariwarId, `seed-${randomUUID()}`, goodUtr, validThrough.toISOString()],
    );
  }
  return { memberId, pariwarId };
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
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
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

async function memberState(t: TestApp, memberId: string): Promise<string | undefined> {
  const r = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
  return r.rows[0]?.state;
}

async function receiptCount(t: TestApp, memberId: string): Promise<number> {
  const r = await t.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM vyawastha_shulk_receipts WHERE member_id = $1`,
    [memberId],
  );
  return r.rows[0]?.n ?? 0;
}

describe.skipIf(!hasDatabase)('Vyawastha Shulk renewal — E2E (:5433)', () => {
  // ── renewal-status (AC4/AC5) ──────────────────────────────────────────────────────────────────────
  it('renewal-status: active pre-grace → not in grace, days_until_lapse > 90, paid_through set', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const validThrough = new Date(Date.now() + 10 * DAY_MS);
      const { memberId, pariwarId } = await seedMember(t, 'active', validThrough);
      const res = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/renewal-status', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body.in_renewal_grace).toBe(false);
      expect(res.body.grace_remaining_days).toBeNull();
      expect(res.body.paid_through).toBeTypeOf('string');
      // boundary = validThrough + 91d = now + 101d → ~101 days until lapse.
      expect(Number(res.body.days_until_lapse)).toBeGreaterThan(99);
      expect(Number(res.body.days_until_lapse)).toBeLessThanOrEqual(101);
    } finally {
      await teardown(t);
    }
  });

  it('renewal-status: active-in-grace → in grace, grace_remaining_days counts down', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const validThrough = new Date(Date.now() - 30 * DAY_MS); // 30 days into grace
      const { memberId, pariwarId } = await seedMember(t, 'active-in-grace', validThrough);
      const res = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/renewal-status', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body.in_renewal_grace).toBe(true);
      // boundary = validThrough + 91d = now + 61d → ~61 days of grace remaining.
      expect(Number(res.body.grace_remaining_days)).toBeGreaterThan(59);
      expect(Number(res.body.grace_remaining_days)).toBeLessThanOrEqual(61);
      expect(res.body.days_until_lapse).toEqual(res.body.grace_remaining_days);
    } finally {
      await teardown(t);
    }
  });

  it('renewal-status: lapsed-unpaid past +91 → days_until_lapse clamped 0, not in grace', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const validThrough = new Date(Date.now() - 100 * DAY_MS);
      const { memberId, pariwarId } = await seedMember(t, 'lapsed-unpaid', validThrough);
      const res = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/renewal-status', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body.in_renewal_grace).toBe(false);
      expect(res.body.days_until_lapse).toBe(0);
      expect(res.body.grace_remaining_days).toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('renewal-status: never-renewed (no receipt) → all figures null/false', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee');
      const res = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/renewal-status', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        paid_through: null,
        days_until_lapse: null,
        in_renewal_grace: false,
        grace_remaining_days: null,
      });
    } finally {
      await teardown(t);
    }
  });

  it('renewal-status: 401 without a session', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const res = await inject(t, 'GET', '/api/v1/member/vyawastha-shulk/renewal-status', {});
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  // ── renew intent + confirm (AC2/AC3) ────────────────────────────────────────────────────────────
  it('renew from active-in-grace → state returns to active, new receipt, NO lock_in_entered', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const validThrough = new Date(Date.now() - 30 * DAY_MS);
      const { memberId, pariwarId } = await seedMember(t, 'active-in-grace', validThrough);
      const tok = token(t, memberId, pariwarId);

      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/intent', { token: tok });
      expect(intent.status).toBe(200);
      expect(String(intent.body.upiUrl)).toContain(`tn=renewal-shulk-${memberId}-`);
      const tr = String(intent.body.tr);

      const lockInBefore = (await eventTypes(t, memberId)).filter((e) => e === 'member.lock_in_entered').length;
      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(confirm.status).toBe(200);
      expect(confirm.body.renewed).toBe(true);
      expect((confirm.body.receipt as Json).utr).toBe(goodUtr);

      // State back to active; exactly ONE new vyawastha_shulk_paid (renewal); NO new lock_in_entered.
      expect(await memberState(t, memberId)).toBe('active');
      const types = await eventTypes(t, memberId);
      expect(types.filter((e) => e === 'member.lock_in_entered').length).toBe(lockInBefore);
      // renewal valid_through ≈ +365d.
      const rc = await t.pool.query<{ valid_through: Date }>(
        `SELECT valid_through FROM vyawastha_shulk_receipts WHERE tr = $1`, [tr],
      );
      const deltaDays = (rc.rows[0]!.valid_through.getTime() - Date.now()) / DAY_MS;
      expect(deltaDays).toBeGreaterThan(360);
      expect(deltaDays).toBeLessThan(370);

      // Idempotent re-confirm: same tr → renewed:false, no 2nd receipt, no 2nd event.
      const paidBefore = (await eventTypes(t, memberId)).filter((e) => e === 'member.vyawastha_shulk_paid').length;
      const receiptsBefore = await receiptCount(t, memberId);
      const again = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(again.status).toBe(200);
      expect(again.body.renewed).toBe(false);
      expect(await receiptCount(t, memberId)).toBe(receiptsBefore);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.vyawastha_shulk_paid').length).toBe(paidBefore);
    } finally {
      await teardown(t);
    }
  });

  it('renew from lapsed-unpaid → state returns to active', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMember(t, 'lapsed-unpaid', new Date(Date.now() - 100 * DAY_MS));
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/intent', { token: tok });
      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr: String(intent.body.tr), utr: goodUtr }, token: tok,
      });
      expect(confirm.status).toBe(200);
      expect(confirm.body.renewed).toBe(true);
      expect(await memberState(t, memberId)).toBe('active');
    } finally {
      await teardown(t);
    }
  });

  it('renew early from active → stays active, valid_through extended', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active', new Date(Date.now() + 10 * DAY_MS));
      const tok = token(t, memberId, pariwarId);
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/intent', { token: tok });
      const tr = String(intent.body.tr);
      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr, utr: goodUtr }, token: tok,
      });
      expect(confirm.status).toBe(200);
      expect(await memberState(t, memberId)).toBe('active');
      const rc = await t.pool.query<{ valid_through: Date }>(
        `SELECT valid_through FROM vyawastha_shulk_receipts WHERE tr = $1`, [tr],
      );
      const deltaDays = (rc.rows[0]!.valid_through.getTime() - Date.now()) / DAY_MS;
      expect(deltaDays).toBeGreaterThan(360);
    } finally {
      await teardown(t);
    }
  });

  it('renew confirm on a non-renewable (pending-fee) member → 409', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee');
      const tok = token(t, memberId, pariwarId);
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr: `renewal-${memberId}-x`, utr: goodUtr }, token: tok,
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('vyawastha_shulk.not_renewable');
      expect(await receiptCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('renew intent 503s when the trust VPA is unconfigured', async () => {
    const t = await createTestApp(); // no VPA env
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active', new Date(Date.now() + 10 * DAY_MS));
      const res = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/intent', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(503);
      expect(String((res.body.error as Json)?.code)).toBe('vyawastha_shulk.unconfigured');
    } finally {
      await teardown(t);
    }
  });

  it('renew requires a member session (401 without a token)', async () => {
    const t = await createTestApp({ env: VPA_ENV });
    try {
      const intent = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/intent', {});
      expect(intent.status).toBe(401);
      const confirm = await inject(t, 'POST', '/api/v1/member/vyawastha-shulk/renew/confirm', {
        payload: { tr: 'x', utr: goodUtr },
      });
      expect(confirm.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
