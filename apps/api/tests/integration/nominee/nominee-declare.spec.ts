// Nominee declaration E2E (live DB :5433) — Story 3.4 (Task 9; AC1/AC4/AC5).
//
// Drives the full surface through `app.inject`:
//   · declare 1 → re-declare 2 (latest-wins) → TWO member.nominees_declared events on the
//     stream (immutable timeline, AC5), the projection replaced (delete-then-insert), the
//     lifecycle state UNCHANGED (non-transition marker, R5), and NO PII in the event payloads
//     OR the audit context OR the at-rest ciphertext (R1 — count + split only).
//   · server-derived 75/25 split (R4) — the client sends no percentage; rank-1 = 75, rank-2 = 25.
//   · terminal-state rejection (R2 — withdrawn member ⇒ 409).
//   · validation (0 or >2 nominees ⇒ 400) + the member-session guard (no token ⇒ 401).
//
// Member creation is Story 3.6 (R2) — the harness SEEDS a member (events_log + members row)
// + a member session token.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

/** Seed a member in `pending-fee` (signup_initiated → kyc_manual_fallback), committed so the
 * request handlers (separate scope tx) + the member_nominees FK → members both see the row. */
async function seedMemberPendingFee(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.signup_initiated',
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      actorId: memberId,
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.kyc_manual_fallback',
      payload: {
        from_state: 'pending-kyc',
        to_state: 'pending-fee',
        trigger: 'kyc_manual',
        actor: 'member',
        reason: 'manual_fallback',
      },
      actorId: memberId,
    });
    await closeScopeTx(scopeTx, true); // COMMIT
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed a WITHDRAWN (terminal) member via projectMemberState (schema-validated path).
 * Chain: pending-kyc → pending-fee → lock-in → active → withdrawn. */
async function seedWithdrawnMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.vyawastha_shulk_paid', actorId: memberId,
      payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 1000 },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.lock_in_expired', actorId: 'system',
      payload: { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expiry', actor: 'system', kyc_verified: true },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.withdrawal_completed', actorId: memberId,
      payload: { from_state: 'active', to_state: 'withdrawn', trigger: 'withdrawal', actor: 'member' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
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

describe.skipIf(!hasDatabase)('Nominee declaration — E2E (:5433)', () => {
  it('AC1/AC4/AC5: declare 1 then re-declare 2 — two events, projection replaced, lifecycle unchanged, no PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);

      // Declare 1 nominee (sole / 100%).
      const d1 = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
        token: token(t, memberId, pariwarId),
      });
      expect(d1.status).toBe(200);
      expect(d1.body.nominees).toHaveLength(1);
      expect((d1.body.nominees as Json[])[0]).toMatchObject({
        rank: 1,
        relationship: 'spouse',
        splitPct: 100,
        mobilePresent: true,
        addressPresent: false,
      });

      // Lifecycle UNCHANGED (non-transition marker).
      let st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
      expect(st.rows[0]?.state).toBe('pending-fee');

      // Re-declare 2 nominees → server-derived 75/25 (R4), latest-wins.
      const d2 = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: {
          nominees: [
            { name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210', address: '12 MG Road' },
            { name: 'Ravi Kumar', relationship: 'child', mobile: '9988776655' },
          ],
        },
        token: token(t, memberId, pariwarId),
      });
      expect(d2.status).toBe(200);
      expect(d2.body.nominees).toHaveLength(2);
      expect((d2.body.nominees as Json[]).map((n) => n.splitPct)).toEqual([75, 25]);
      expect((d2.body.nominees as Json[])[0]).toMatchObject({ rank: 1, addressPresent: true });
      expect((d2.body.nominees as Json[])[1]).toMatchObject({ rank: 2, addressPresent: false });

      // TWO member.nominees_declared events on the stream (immutable timeline, AC5).
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.nominees_declared').length).toBe(2);

      // Projection REPLACED: exactly the 2 new rows (the single rank-1 row was deleted).
      const proj = await t.pool.query<{ rank: number; split_pct: number }>(
        `SELECT rank, split_pct FROM member_nominees WHERE member_id = $1 ORDER BY rank`,
        [memberId],
      );
      expect(proj.rows.map((r) => r.rank)).toEqual([1, 2]);
      expect(proj.rows.map((r) => Number(r.split_pct))).toEqual([75, 25]);

      // Lifecycle STILL unchanged after re-declare.
      st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
      expect(st.rows[0]?.state).toBe('pending-fee');

      // NO PII in the event payloads (count + split only — R1).
      const payloads = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.nominees_declared' ORDER BY event_version`,
        [memberId],
      );
      const payloadStr = JSON.stringify(payloads.rows);
      expect(payloadStr).not.toContain('Asha');
      expect(payloadStr).not.toContain('9876543210');
      expect(payloadStr).not.toContain('MG Road');
      expect(payloads.rows[0]?.payload).toMatchObject({ nominee_count: 1, split: 'sole' });
      expect(payloads.rows[1]?.payload).toMatchObject({ nominee_count: 2, split: '75-25' });

      // Audit emitted, NO PII in context.
      expect(t.auditSink.ofType('member_nominees.declared').length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(t.auditSink.events)).not.toContain('Asha');
      expect(JSON.stringify(t.auditSink.events)).not.toContain('9876543210');

      // member_nominees rows are Tier-1 ENCRYPTED at rest (plaintext never present).
      const enc = await t.pool.query<{ name_ciphertext: string; mobile_ciphertext: string }>(
        `SELECT name_ciphertext, mobile_ciphertext FROM member_nominees WHERE member_id = $1`,
        [memberId],
      );
      for (const r of enc.rows) {
        expect(r.name_ciphertext).not.toContain('Asha');
        expect(r.name_ciphertext).not.toContain('Ravi');
        expect(r.mobile_ciphertext).not.toContain('9876543210');
      }
    } finally {
      await teardown(t);
    }
  });

  it('GET /member/nominees returns the current declaration as NON-PII summaries', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'parent', mobile: '9876543210' }] },
        token: token(t, memberId, pariwarId),
      });

      const get = await inject(t, 'GET', '/api/v1/member/nominees', { token: token(t, memberId, pariwarId) });
      expect(get.status).toBe(200);
      expect(get.body.nominees).toHaveLength(1);
      expect((get.body.nominees as Json[])[0]).toMatchObject({ rank: 1, relationship: 'parent', splitPct: 100 });
      // No raw PII echoed back.
      expect(JSON.stringify(get.body)).not.toContain('Asha');
      expect(JSON.stringify(get.body)).not.toContain('9876543210');
    } finally {
      await teardown(t);
    }
  });

  it('rejects declaration for a member in a terminal state (409)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedWithdrawnMember(t);
      const res = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }] },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toContain('nominee');

      // No nominee rows written, no new nominees_declared event.
      const proj = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM member_nominees WHERE member_id = $1`,
        [memberId],
      );
      expect(proj.rows[0]?.n).toBe(0);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.nominees_declared').length).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects 0 or more-than-2 nominees (400)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const tok = token(t, memberId, pariwarId);

      const zero = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: { nominees: [] },
        token: tok,
      });
      expect(zero.status).toBe(400);

      const three = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: {
          nominees: [
            { name: 'A', relationship: 'spouse', mobile: '9876543210' },
            { name: 'B', relationship: 'child', mobile: '9876543211' },
            { name: 'C', relationship: 'other', mobile: '9876543212' },
          ],
        },
        token: tok,
      });
      expect(three.status).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', '/api/v1/member/nominees', {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }] },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
