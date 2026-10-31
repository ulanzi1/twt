// Life Events panel E2E (live DB :5433) — Story 3.9 (Task 9; AC1/AC4/AC5).
//
// Drives the full surface through `app.inject`:
//   · ADDRESS update (NO step-up): appends an append-only Tier-1 row + emits member.address_updated
//     (a NON-TRANSITION marker; state unchanged), audits it, and NEVER leaks the raw address bytes
//     into the event payload, the audit context, the summary response, or (obviously) it stays
//     encrypted at rest. Two updates ⇒ two rows + two events (prior value preserved — AC1).
//   · POSTING update (NO step-up): appends a row (district plaintext + is_retirement) + emits
//     member.posting_updated; summary reflects recorded + is_retirement. ⭐ Story 6.36a: the body is a choice and needs an
//     Idempotency-Key — these legs send the no-list Pariwar's `district_only` arm (the rest: `workplace.spec.ts`).
//   · NOMINEE + MEDICAL updates (step-up gated): 403 auth.step_up_required WITHOUT a fresh elevation;
//     WITH an elevation for the matching action_context the gate passes (nominee → 200, the declare
//     service re-runs; medical → past the gate). An elevation for one context does NOT satisfy the other.
//   · GET summary reflects the recorded sub-types.
//   · the member-session guard (no token ⇒ 401).
//
// Member creation is Story 3.6 (R2) — the harness SEEDS a member (events_log + members row) committed
// so the request handlers (separate scope tx) + the FK → members both see the row.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { fileClaim, findInnocent, raceFirstIntake, seedMemberAt } from '../_death-report-fixture.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

/** Seed a member in `pending-fee` (signup_initiated → kyc_manual_fallback), committed. Non-terminal
 * so Life Events updates are permitted. */
async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
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

/** Grant a fresh step-up elevation for (member, action_context) so the gate passes. */
async function elevate(t: TestApp, memberId: string, actionContext: string): Promise<void> {
  await memberAuthRepo.insertElevation(t.deps.pool, {
    memberId,
    actionContext,
    elevatedUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
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

async function eventRows(t: TestApp, memberId: string, type: string): Promise<{ payload: Json }[]> {
  const res = await t.pool.query<{ payload: Json }>(
    `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = $2 ORDER BY event_version`,
    [memberId, type],
  );
  return res.rows;
}

async function memberState(t: TestApp, memberId: string): Promise<string | undefined> {
  const st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
  return st.rows[0]?.state;
}

describe.skipIf(!hasDatabase)('Life Events panel — E2E (:5433)', () => {
  it('AC1/AC5: address update (no step-up) — append-only rows, marker event, no PII leak, prior value preserved', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const SECRET = '12 Gandhi Marg, Pune 411001';

      const r1 = await inject(t, 'POST', '/api/v1/member/life-events/address', {
        payload: { addressLine: SECRET, locale: 'en' },
        token: tok,
      });
      expect(r1.status).toBe(200);
      expect((r1.body.address as Json).recorded).toBe(true);

      // Lifecycle UNCHANGED (non-transition marker).
      expect(await memberState(t, memberId)).toBe('pending-fee');

      // Second update ⇒ prior value preserved (append-only): TWO rows + TWO events.
      const r2 = await inject(t, 'POST', '/api/v1/member/life-events/address', {
        payload: { addressLine: '99 New Colony, Nagpur 440001', locale: 'hi' },
        token: tok,
      });
      expect(r2.status).toBe(200);

      const rows = await t.pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM member_addresses WHERE member_id = $1`,
        [memberId],
      );
      expect(rows.rows[0]?.n).toBe(2);

      const events = await eventRows(t, memberId, 'member.address_updated');
      expect(events).toHaveLength(2);
      // NON-PII marker payload only (presence flag; NEVER the raw bytes — R1).
      const payloadStr = JSON.stringify(events);
      expect(payloadStr).not.toContain('Gandhi Marg');
      expect(payloadStr).not.toContain('New Colony');
      expect(events[0]?.payload).toMatchObject({ address_present: true, from_state: 'pending-fee', to_state: 'pending-fee' });

      // NO PII in the summary response OR the audit context.
      expect(JSON.stringify(r1.body)).not.toContain('Gandhi Marg');
      expect(JSON.stringify(t.auditSink.events)).not.toContain('Gandhi Marg');
      expect(t.auditSink.ofType('member_life_events.address_updated').length).toBeGreaterThanOrEqual(2);

      // Address bytes are Tier-1 ENCRYPTED at rest (plaintext never present).
      const enc = await t.pool.query<{ address_line_ciphertext: string }>(
        `SELECT address_line_ciphertext FROM member_addresses WHERE member_id = $1`,
        [memberId],
      );
      for (const row of enc.rows) {
        expect(row.address_line_ciphertext).not.toContain('Gandhi Marg');
        expect(row.address_line_ciphertext).not.toContain('New Colony');
      }
    } finally {
      await teardown(t);
    }
  });

  it('AC1: posting update (no step-up) — row + marker event with district + is_retirement; summary reflects it', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);

      // Story 6.36a — a Pariwar with ⛔ imported list keeps the free-text district box: the `district_only` arm, with a
      // REQUIRED Idempotency-Key (the choice arms are `workplace.spec.ts`'s).
      // ⚠ [Review] 2026-10-15 — this leg (and the summary read below) sends `district_only` for the FIXED `PARIWAR_A`: ONE
      // `pnpm --filter @twt/domain workplaces:seed-fixture --pariwar <PARIWAR_A>` against the shared :5433 would flip both
      // to 422 `workplace.choice_unavailable` (the known shared-container accumulation class, ⛔ a code regression). Seed
      // the fixture into a Pariwar of its own, ⛔ `PARIWAR_A`.
      const res = await inject(t, 'POST', '/api/v1/member/life-events/posting', {
        payload: { choice: 'district_only', district: 'Nagpur', isRetirement: true },
        token: tok,
        headers: { 'idempotency-key': randomUUID() },
      });
      expect(res.status).toBe(200);
      expect(res.body.posting).toMatchObject({ recorded: true, is_retirement: true });
      expect(await memberState(t, memberId)).toBe('pending-fee');

      const events = await eventRows(t, memberId, 'member.posting_updated');
      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toMatchObject({ district: 'Nagpur', is_retirement: true });

      const row = await t.pool.query<{ district: string; is_retirement: boolean }>(
        `SELECT district, is_retirement FROM member_postings WHERE member_id = $1`,
        [memberId],
      );
      expect(row.rows[0]?.district).toBe('Nagpur');
      expect(row.rows[0]?.is_retirement).toBe(true);
    } finally {
      await teardown(t);
    }
  });

  it('AC4: nominee update requires step-up — 403 without elevation, 200 with a nominee_change elevation', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const payload = { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }] };

      // Without a fresh elevation → 403 auth.step_up_required.
      const blocked = await inject(t, 'POST', '/api/v1/member/life-events/nominees', { payload, token: tok });
      expect(blocked.status).toBe(403);
      expect(String((blocked.body.error as Json)?.code)).toBe('auth.step_up_required');

      // An elevation for a DIFFERENT context does NOT satisfy the nominee gate.
      await elevate(t, memberId, 'medical_change');
      const stillBlocked = await inject(t, 'POST', '/api/v1/member/life-events/nominees', { payload, token: tok });
      expect(stillBlocked.status).toBe(403);

      // With the matching elevation → the declare service re-runs (200; emits member.nominees_declared).
      await elevate(t, memberId, 'nominee_change');
      const ok = await inject(t, 'POST', '/api/v1/member/life-events/nominees', { payload, token: tok });
      expect(ok.status).toBe(200);
      expect((await eventRows(t, memberId, 'member.nominees_declared'))).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });

  it('AC4: medical update requires step-up — 403 without elevation; the gate clears with a medical_change elevation; nominee_change elevation does NOT satisfy', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const payload = { conditionCodes: [], imaListVersion: 'x', acknowledged: true, ackLocale: 'en' };

      const blocked = await inject(t, 'POST', '/api/v1/member/life-events/medical', { payload, token: tok });
      expect(blocked.status).toBe(403);
      expect(String((blocked.body.error as Json)?.code)).toBe('auth.step_up_required');

      // An elevation for a DIFFERENT context does NOT satisfy the medical gate (reverse of the
      // nominee test at line ~206 — verifies cross-context isolation in both directions).
      await elevate(t, memberId, 'nominee_change');
      const stillBlocked = await inject(t, 'POST', '/api/v1/member/life-events/medical', { payload, token: tok });
      expect(stillBlocked.status).toBe(403);

      // With the matching elevation the step-up gate is PAST (the handler then runs; without the IMA
      // clauses provisioned it returns 409, NOT 403 — proving the gate cleared).
      await elevate(t, memberId, 'medical_change');
      const past = await inject(t, 'POST', '/api/v1/member/life-events/medical', { payload, token: tok });
      expect(past.status).not.toBe(403);
    } finally {
      await teardown(t);
    }
  });

  it('GET /member/life-events summarizes the recorded sub-types', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);

      await inject(t, 'POST', '/api/v1/member/life-events/address', {
        payload: { addressLine: '5 Main Rd', locale: 'en' }, token: tok,
      });
      await inject(t, 'POST', '/api/v1/member/life-events/posting', {
        payload: { choice: 'district_only', district: 'Pune' }, token: tok, headers: { 'idempotency-key': randomUUID() },
      });

      const summary = await inject(t, 'GET', '/api/v1/member/life-events', { token: tok });
      expect(summary.status).toBe(200);
      expect(summary.body.address).toMatchObject({ recorded: true });
      expect(summary.body.posting).toMatchObject({ recorded: true, is_retirement: false });
      expect(summary.body.nominees).toMatchObject({ declared: false, count: 0 });
      expect(summary.body.medical).toMatchObject({ disclosed: false, disclosure_count: 0 });
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', '/api/v1/member/life-events/address', {
        payload: { addressLine: '5 Main Rd', locale: 'en' },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});

// ── Story 6.38 — the record is ⛔ changed from the account once a death is reported (AC15; `-424` Q2 (b) A, DL19) ────

// ⚠ These legs seed an ACTIVE member (`seedMemberAt`), ⛔ the `pending-fee` member the rest of this file uses: the claim door
// refuses a `pending-fee` member (`not_paid`), so a standing claim for one is a combination the system cannot reach.
describe.skipIf(!hasDatabase)('Story 6.38 — Life Events after a death is reported (:5433)', () => {
  it('⭐ AC15 — address and posting ⇒ 409 life_events.death_reported; ⛔ new history row, ⛔ marker; the prior rows unchanged', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberAt(t, 'active');
      const tok = token(t, memberId, pariwarId);
      expect((await inject(t, 'POST', '/api/v1/member/life-events/address', { payload: { addressLine: '12 Gandhi Marg', locale: 'en' }, token: tok })).status).toBe(200);
      const before = await t.pool.query('SELECT * FROM member_addresses WHERE member_id = $1', [memberId]);
      await fileClaim(t, pariwarId, memberId);

      const address = await inject(t, 'POST', '/api/v1/member/life-events/address', { payload: { addressLine: '99 New Colony', locale: 'en' }, token: tok });
      expect(address.status).toBe(409);
      expect(String((address.body.error as Json)?.code)).toBe('life_events.death_reported');
      const posting = await inject(t, 'POST', '/api/v1/member/life-events/posting', {
        payload: { choice: 'district_only', district: 'Nagpur', isRetirement: false },
        token: tok,
        headers: { 'idempotency-key': randomUUID() },
      });
      expect(posting.status).toBe(409);
      expect(String((posting.body.error as Json)?.code)).toBe('life_events.death_reported');

      const after = await t.pool.query('SELECT * FROM member_addresses WHERE member_id = $1', [memberId]);
      expect(after.rows).toEqual(before.rows);
      const postings = await t.pool.query('SELECT 1 FROM member_postings WHERE member_id = $1', [memberId]);
      expect(postings.rowCount).toBe(0);
      expect(await eventRows(t, memberId, 'member.address_updated')).toHaveLength(1);
      expect(await eventRows(t, memberId, 'member.posting_updated')).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ AC15 — the innocence finding lifts the lock: the address is accepted as today', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberAt(t, 'active');
      const cid = await fileClaim(t, pariwarId, memberId);
      await findInnocent(t, pariwarId, cid);
      const res = await inject(t, 'POST', '/api/v1/member/life-events/address', {
        payload: { addressLine: '99 New Colony', locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ DL19 precedence — the death check BEATS the state check: a WITHDRAWN member with a standing claim gets life_events.death_reported, ⛔ member_terminal', async () => {
    // ⚠ AN ORDER GUARD, ⛔ a reachable scenario: the door refuses a WITHDRAWN member at filing (`left`) and DL18 refuses a withdrawal
    // once a report stands, so a withdrawn member with a standing claim exists only for a claim filed before DL18 / DL19 existed, or
    // a race the locks now prevent. It pins the ORDER of two checks in `assertMemberExistsAndNotTerminal` — the death check first.
    const t = await createTestApp();
    try {
      const address = { addressLine: '99 New Colony', locale: 'en' };
      // Control: with NO claim the state alone refuses — so the next assertion can only be the death check winning.
      const bare = await seedMemberAt(t, 'withdrawn');
      const noClaim = await inject(t, 'POST', '/api/v1/member/life-events/address', { payload: address, token: token(t, bare.memberId, bare.pariwarId) });
      expect(noClaim.status).toBe(409);
      expect(String((noClaim.body.error as Json)?.code)).toBe('life_events.member_terminal');

      const { memberId, pariwarId } = await seedMemberAt(t, 'withdrawn');
      await fileClaim(t, pariwarId, memberId);
      const res = await inject(t, 'POST', '/api/v1/member/life-events/address', { payload: address, token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('life_events.death_reported');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ N9 FORCED race — an address change WAITS on the claim-intake key, then sees the claim a first intake committed and is refused', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberAt(t, 'active');
      const tok = token(t, memberId, pariwarId);

      const race = await raceFirstIntake(t, pariwarId, memberId, () =>
        inject(t, 'POST', '/api/v1/member/life-events/address', { payload: { addressLine: '99 New Colony', locale: 'en' }, token: tok }),
      );
      // The proof the lock is TAKEN: remove the intake-key line from `lockAndReadDeathReport` and this assertion fails.
      expect(race.waited, 'the address change did not wait on the claim-intake key — its guard does not take it' + ' — ' + race.answeredWithoutWaiting).toBe(true);
      expect(race.response.status).toBe(409);
      expect(String((race.response.body.error as Json)?.code)).toBe('life_events.death_reported');
      expect((await t.pool.query('SELECT 1 FROM member_addresses WHERE member_id = $1', [memberId])).rowCount).toBe(0);
      expect(await eventRows(t, memberId, 'member.address_updated')).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });
});
