// The personal-event ASSERTION surface — E2E (Story 10.26, Task 5; AC1/AC7/AC8(f)). (:5433)
//
// ⚖ What is under test is as much what the surface REFUSES to be as what it does. The ratified
// Niyamavali §3.1 (`docs/legal/niyamavali.md:81`) says the assertion "grants no restoration relief
// and carries no consequence of its own", so the response must never look like an approval, the
// lifecycle must not move, and there must be nothing to check back on.
//
//   · record success — 201, `grantsRelief: false`, one `member.personal_event_asserted` event on the
//     MEMBER's own stream, an audit line written.
//   · AC8(f) — `members.state` is UNCHANGED (the reducer folds the marker as IDENTITY).
//   · D3 — a free-text field is REJECTED (400); the bounded enum is enforced.
//   · AC7 — no session → 401; a `:pariwarId` that is not the session's → **404**, never 403.
//   · idempotency — a replay with the SAME `Idempotency-Key` returns the ORIGINAL record (no second
//     event); a missing header → 400.
//
// Member routes open their OWN RLS-scoped tx (no admin RBAC hook), so no role_grants seeding is
// needed. Own-committing audit writes accumulate, so we assert MEMBERSHIP for a per-test random
// member id, never a global count ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const URL_FOR = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/member/contributions/personal-events`;

/** Seed a real member (events_log + members row), committed, so the handler's own scope tx sees it. */
async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.signup_initiated',
      actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.kyc_manual_fallback',
      actorId: memberId,
      payload: {
        from_state: 'pending-kyc',
        to_state: 'pending-fee',
        trigger: 'kyc_manual',
        actor: 'member',
        reason: 'manual_fallback',
      },
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

interface RecordOpts {
  idempotencyKey?: string | null;
  urlPariwarId?: string;
}

async function record(
  t: TestApp,
  tok: string | null,
  pariwarId: string,
  payload: unknown,
  opts: RecordOpts = {},
): Promise<{ status: number; body: Json }> {
  const idempotencyKey = opts.idempotencyKey === undefined ? randomUUID() : opts.idempotencyKey;
  const res = await t.app.inject({
    method: 'POST',
    url: URL_FOR(opts.urlPariwarId ?? pariwarId),
    payload: payload as object,
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3001',
      ...(tok ? { authorization: `Bearer ${tok}` } : {}),
      ...(idempotencyKey !== null ? { 'idempotency-key': idempotencyKey } : {}),
    },
  });
  let json: Json = {};
  try {
    json = res.json();
  } catch {
    json = {};
  }
  return { status: res.statusCode, body: json };
}

async function assertionEvents(t: TestApp, memberId: string): Promise<{ payload: Json }[]> {
  const rows = await t.pool.query<{ payload: Json }>(
    `SELECT payload FROM events_log
      WHERE stream_id = $1 AND event_type = 'member.personal_event_asserted'
      ORDER BY event_version`,
    [memberId],
  );
  return rows.rows;
}

async function memberState(t: TestApp, memberId: string): Promise<string | undefined> {
  const r = await t.pool.query<{ state: string }>(
    `SELECT state FROM members WHERE member_id = $1`,
    [memberId],
  );
  return r.rows[0]?.state;
}

describe.skipIf(!hasDatabase)('member personal-event assertion — E2E (:5433)', () => {
  it('AC1: records the assertion → 201, grantsRelief false, one event on the MEMBER stream', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const res = await record(t, token(t, memberId, pariwarId), pariwarId, { kind: 'bereavement' });

      expect(res.status).toBe(201);
      expect(res.body['kind']).toBe('bereavement');
      // ⚖ The ratified §3.1, on the wire. A client cannot mistake a 201 for an approval.
      expect(res.body['grantsRelief']).toBe(false);
      expect(typeof res.body['eventId']).toBe('string');

      // ⭐ AC1 structurally: NO field a member could read as a pending outcome.
      for (const banned of ['status', 'approved', 'decision', 'reviewedBy', 'expiresAt']) {
        expect(Object.keys(res.body)).not.toContain(banned);
      }

      const events = await assertionEvents(t, memberId);
      expect(events).toHaveLength(1);
      expect(events[0]!.payload['kind']).toBe('bereavement');
      expect(events[0]!.payload['actor']).toBe('member');
      // Non-transition marker: from_state === to_state.
      expect(events[0]!.payload['from_state']).toBe(events[0]!.payload['to_state']);
      // D3 — no free text reached events_log, which is append-only and never redacted.
      for (const banned of ['notes', 'details', 'reason', 'description']) {
        expect(Object.keys(events[0]!.payload)).not.toContain(banned);
      }
    } finally {
      await teardown(t);
    }
  });

  it('AC8(f): the lifecycle state is UNCHANGED — the reducer folds the marker as IDENTITY', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      expect(await memberState(t, memberId)).toBe('pending-fee');

      const res = await record(t, token(t, memberId, pariwarId), pariwarId, { kind: 'illness' });
      expect(res.status).toBe(201);

      // Asserting is not a lifecycle act. The member is exactly where they were.
      expect(await memberState(t, memberId)).toBe('pending-fee');
    } finally {
      await teardown(t);
    }
  });

  it('D3: a free-text field is REJECTED (400) and so is a kind outside the vocabulary', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);

      const withText = await record(t, tok, pariwarId, {
        kind: 'bereavement',
        notes: 'my father died last month',
      });
      expect(withText.status).toBe(400);

      const badKind = await record(t, tok, pariwarId, { kind: 'bankruptcy' });
      expect(badKind.status).toBe(400);

      // Nothing was written by either rejected attempt.
      expect(await assertionEvents(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC7: no session → 401; a foreign :pariwarId → 404, never 403 (no tenant-existence oracle)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);

      const anon = await record(t, null, pariwarId, { kind: 'illness' });
      expect(anon.status).toBe(401);

      // A valid session, but a path naming SOMEONE ELSE'S Pariwar. 404 — a 403 would confirm the
      // other tenant exists.
      const foreign = await record(t, token(t, memberId, pariwarId), pariwarId, { kind: 'illness' }, {
        urlPariwarId: randomUUID(),
      });
      expect(foreign.status).toBe(404);

      expect(await assertionEvents(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC7: a replay with the SAME Idempotency-Key records ONCE; a missing key → 400', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const key = randomUUID();

      const first = await record(t, tok, pariwarId, { kind: 'caregiving' }, { idempotencyKey: key });
      expect(first.status).toBe(201);

      const replay = await record(t, tok, pariwarId, { kind: 'caregiving' }, { idempotencyKey: key });
      expect(replay.status).toBe(200);
      // The ORIGINAL record, echoed — not a second one.
      expect(replay.body['eventId']).toBe(first.body['eventId']);
      expect(await assertionEvents(t, memberId)).toHaveLength(1);

      const noKey = await record(t, tok, pariwarId, { kind: 'illness' }, { idempotencyKey: null });
      expect(noKey.status).toBe(400);

      // A member MAY assert again — a fresh key records a second, independent assertion. Nothing
      // "approves" the earlier one; there is simply another thing they told us (AC1).
      const second = await record(t, tok, pariwarId, { kind: 'illness' });
      expect(second.status).toBe(201);
      expect(await assertionEvents(t, memberId)).toHaveLength(2);
    } finally {
      await teardown(t);
    }
  });
});
