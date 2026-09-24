// The nominee declaration's HISTORY, the LOCK at the first claim, and the step-up on a RE-declaration —
// E2E (live DB :5433). Story 6.20 (Task 2 / Task 9; AC1, AC2, AC10, D2, D3, D9).
//
// Drives the two member routes that reach the SAME `declare` handler — `POST /api/v1/member/nominees`
// (signup) and `POST /api/v1/member/life-events/nominees` (step-up preHandler) — through `app.inject`:
//   · AC1 — every declare appends one version per submitted rank + a `vacated` tombstone on a 2 → 1, in
//     the same transaction as the projection; the event carries the non-PII `source` + `versions`.
//   · AC2 — once ANY claim exists for the member as the deceased, BOTH routes refuse with 409
//     `nominee.locked_claim_filed`, in EVERY state (after a denial, after settlement — the lock is ⛔ not
//     windowed, `-242` c.2), tenant-scoped (another Pariwar's claim is a miss), and the status read says
//     `locked: true`. ⭐ The RELEASE route (`-238` cl.1): an innocence finding unlocks, and a declare
//     then succeeds. ⚠ The finding is TEST-SEEDED — its producer is row 6-22, unbuilt.
//   · ⭐ "the lock survives a denial and waits for the finding" — designed behaviour (`-238`), ⛔ never a
//     defect: a denial ALONE never releases it.
//   · D9 — a RE-declaration outside the signup wizard needs a fresh `nominee_change` step-up on BOTH
//     routes (AR-24); the INITIAL declaration and the wizard's pre-lock-in re-declares do not.

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const SIGNUP_ROUTE = '/api/v1/member/nominees';
const LIFE_EVENTS_ROUTE = '/api/v1/member/life-events/nominees';

async function inScope<T>(t: TestApp, pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const out = await fn(scopeTx);
    await closeScopeTx(scopeTx, true);
    return out;
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** Seed a member and walk them to a WIZARD state (`pending-kyc` / `pending-fee` / `pending-valid`) or on to `active`. Committed. */
async function seedMember(
  t: TestApp,
  to: 'pending-kyc' | 'pending-fee' | 'pending-valid' | 'active',
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  await inScope(t, pariwarId, async (s) => {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    const step = (eventType: string, payload: Json, actorId: string | null = memberId) =>
      memberDomain.projectMemberState(s.client, { memberId: mid, pariwarId: pid, eventType: eventType as never, payload: payload as never, actorId });
    await step('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
    if (to === 'pending-kyc') return;
    await step('member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' });
    if (to === 'active' || to === 'pending-valid') {
      await step('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'TEST-UTR-6200', amount_inr: 1000 });
      // `kyc_verified: false` lands in `pending-valid` (still a wizard state); `true` goes on to `active`.
      await step(
        'member.lock_in_expired',
        { from_state: 'lock-in', to_state: to, trigger: 'lock_in_expiry', actor: 'system', kyc_verified: to === 'active' },
        null,
      );
    }
  });
  return { memberId, pariwarId };
}

/** File a claim for `deceasedMemberId` in `pariwarId` (the claim row + `claim.intake_initiated`). */
async function fileClaim(t: TestApp, pariwarId: string, deceasedMemberId: string): Promise<string> {
  const claimCaseId = randomUUID();
  await inScope(t, pariwarId, async (s) => {
    await claim.projectClaimState(s.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      deceasedMemberId: ids.memberId(deceasedMemberId),
      intakeChannels: ['helpline'],
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null,
        to_state: 'intake_pending',
        trigger: 'seed',
        actor: 'system',
        deceased_member_id: deceasedMemberId,
        intake_channel: 'helpline',
        claimant_actor_id: null,
      },
      actorId: null,
    });
  });
  return claimCaseId;
}

/**
 * Append a claim-stream event directly (superuser) — the overlay-releasing terminal event, for a claim whose
 * row was FORCED to the matching state. Its payload names the deceased (the overlay's join key).
 */
async function appendClaimEvent(t: TestApp, pariwarId: string, claimCaseId: string, deceasedMemberId: string, eventType: string) {
  await t.pool.query(
    `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id)
     SELECT $1, $2, $3::jsonb, COALESCE(max(event_version), 0) + 1, $4 FROM events_log WHERE stream_id = $1`,
    [claimCaseId, eventType, JSON.stringify({ deceased_member_id: deceasedMemberId, actor: 'system', trigger: 'test' }), pariwarId],
  );
}

/** Force the claim row's state (superuser + the projector's own session guard) — the lock must hold in ANY. */
async function forceClaimState(t: TestApp, claimCaseId: string, state: string): Promise<void> {
  const c = await t.pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL app.claim_state_writer = 'on'");
    await c.query('UPDATE claims SET current_state = $1 WHERE claim_case_id = $2', [state, claimCaseId]);
    await c.query('COMMIT');
  } catch (err) {
    // ⛔ Never hand an ABORTED transaction back to the pool.
    await c.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    c.release();
  }
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function elevate(t: TestApp, memberId: string): Promise<void> {
  await memberAuthRepo.insertElevation(t.deps.pool, {
    memberId,
    actionContext: 'nominee_change',
    elevatedUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
}

async function inject(t: TestApp, method: 'GET' | 'POST', url: string, opts: { payload?: Json; token?: string } = {}) {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json() as Json;
  } catch {
    /* empty */
  }
  return { status: res.statusCode, body };
}

/** The API's error envelope carries the code at `error.code`. */
function errCode(body: Json): string {
  return String((body.error as Json | undefined)?.code);
}

const ONE = { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }] };
const TWO = {
  nominees: [
    { name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' },
    { name: 'Ravi Kumar', relationship: 'son', mobile: '9988776655' },
  ],
};

async function versions(t: TestApp, memberId: string) {
  const r = await t.pool.query<{ rank: number; version_no: number; kind: string; source: string; recorded_at: Date; effective_at: Date; event_version: string | null }>(
    `SELECT rank, version_no, kind, source, recorded_at, effective_at, event_version
       FROM member_nominee_versions WHERE member_id = $1 ORDER BY rank, version_no`,
    [memberId],
  );
  return r.rows;
}

describe.skipIf(!hasDatabase)('Story 6.20 — nominee history, the lock at the first claim, D9 (:5433)', { timeout: 30000 }, () => {
  // ── AC1 — the history ────────────────────────────────────────────────────────────────────────
  it('⭐ AC1 — 1 → 2 → 1 keeps EVERY version, with a TOMBSTONE for the dropped rank, and ⛔ deletes nothing', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee'); // wizard: no step-up needed
      const tok = token(t, memberId, pariwarId);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status).toBe(200);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok })).status).toBe(200);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status).toBe(200);

      const rows = await versions(t, memberId);
      expect(rows.map((r) => [r.rank, r.version_no, r.kind])).toEqual([
        [1, 1, 'declared'],
        [1, 2, 'declared'],
        [1, 3, 'declared'],
        [2, 1, 'declared'],
        [2, 2, 'vacated'],
      ]);
      for (const r of rows) {
        expect(r.source).toBe('member');
        // D2 — one database instant for both; a member's own change sits where it was recorded.
        expect(new Date(r.effective_at).toISOString()).toBe(new Date(r.recorded_at).toISOString());
        expect(r.event_version).not.toBeNull();
      }
      // The projection is still the LATEST (D16): rank 1 only after the 2 → 1.
      const proj = await t.pool.query('SELECT rank FROM member_nominees WHERE member_id = $1 ORDER BY rank', [memberId]);
      expect(proj.rows.map((r) => r.rank)).toEqual([1]);
    } finally {
      await teardown(t);
    }
  });

  it('AC1 — the event carries ONLY the non-PII `source` + `versions`; ⛔ no name, mobile or address anywhere', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee');
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok });
      await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok });
      const ev = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.nominees_declared' ORDER BY event_version`,
        [memberId],
      );
      expect(ev.rows).toHaveLength(2);
      expect(ev.rows[1]!.payload).toMatchObject({
        source: 'member',
        nominee_count: 1,
        versions: [
          { rank: 1, version_no: 2, kind: 'declared' },
          { rank: 2, version_no: 2, kind: 'vacated' },
        ],
      });
      const blob = JSON.stringify(ev.rows);
      for (const pii of ['Asha', 'Ravi', '9876543210', '9988776655']) expect(blob).not.toContain(pii);
      // …and the version rows hold CIPHERTEXT, ⛔ never the plaintext.
      const raw = await t.pool.query('SELECT name_ciphertext, mobile_ciphertext FROM member_nominee_versions WHERE member_id = $1', [memberId]);
      expect(JSON.stringify(raw.rows)).not.toContain('Asha');
      expect(JSON.stringify(raw.rows)).not.toContain('9876543210');
    } finally {
      await teardown(t);
    }
  });

  // ── AC2 — the lock ───────────────────────────────────────────────────────────────────────────
  it('⭐⭐ AC2 — once a claim is filed, BOTH routes refuse (409 nominee.locked_claim_filed), and the status says locked', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status).toBe(200);
      expect((await inject(t, 'GET', SIGNUP_ROUTE, { token: tok })).body).toMatchObject({ locked: false });

      await fileClaim(t, pariwarId, memberId);
      await elevate(t, memberId); // ⭐ the step-up is NOT what refuses — the lock is, even with one

      for (const url of [SIGNUP_ROUTE, LIFE_EVENTS_ROUTE]) {
        const res = await inject(t, 'POST', url, { payload: TWO, token: tok });
        expect(res.status, url).toBe(409);
        expect(errCode(res.body), url).toBe('nominee.locked_claim_filed');
      }
      expect((await inject(t, 'GET', SIGNUP_ROUTE, { token: tok })).body).toMatchObject({ locked: true });
      // ⛔ Nothing was written: still the one version from before the claim.
      expect(await versions(t, memberId)).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ AC2 — the lock holds AFTER A DENIAL and AFTER SETTLEMENT (the overlay is gone; the claim row is not)', async () => {
    // ⚠ Code review 2026-09-24: forcing only `claims.current_state` left the `account-frozen` OVERLAY
    // frozen (it is derived from `events_log`), so a lock keyed to the overlay passed this test. The
    // releasing terminal event is now APPENDED, and the overlay's release is ASSERTED — so the only thing
    // that can still hold the lock is the claim row itself (invariant 3).
    const t = await createTestApp();
    try {
      for (const [terminal, releasingEvent] of [
        ['denied', 'claim.denied_no_appeal'],
        ['settled', 'claim.settled'],
      ] as const) {
        const { memberId, pariwarId } = await seedMember(t, 'active');
        const tok = token(t, memberId, pariwarId);
        await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok });
        const cid = await fileClaim(t, pariwarId, memberId);
        await forceClaimState(t, cid, terminal);
        await appendClaimEvent(t, pariwarId, cid, memberId, releasingEvent);
        // Non-vacuity: the overlay IS released …
        const overlay = await inScope(t, pariwarId, (s) =>
          memberDomain.getMemberAccountOverlay(s.tx, ids.memberId(memberId), new Date(Date.now() + 60_000)),
        );
        expect(overlay.accountFrozen, terminal).toBe(false);
        // … and the lock still holds, because a claim EXISTS — on BOTH routes, and nothing is written.
        await elevate(t, memberId);
        for (const url of [SIGNUP_ROUTE, LIFE_EVENTS_ROUTE]) {
          const res = await inject(t, 'POST', url, { payload: TWO, token: tok });
          expect(res.status, `${terminal} ${url}`).toBe(409);
          expect(errCode(res.body), `${terminal} ${url}`).toBe('nominee.locked_claim_filed');
        }
        expect(await versions(t, memberId), terminal).toHaveLength(1);
      }
    } finally {
      await teardown(t);
    }
  });

  it('AC2 — TENANT-SCOPED: a claim for the same member id in ANOTHER Pariwar is a miss', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee');
      await fileClaim(t, randomUUID(), memberId); // another tenant
      const res = await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('⭐⭐ AC2 / AC11(ii) — the RELEASE route: an INNOCENCE finding unlocks, and a declare then succeeds', async () => {
    // `2026-09-21-238` cl.1 (option B) — a claim filed against a member who is ALIVE ⛔ must not lock
    // them for life. ⚠ The finding is TEST-SEEDED: its producer is row 6-22 (the fraud register).
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok });
      const cid = await fileClaim(t, pariwarId, memberId);
      await elevate(t, memberId);
      // (The lock surviving a DENIAL is pinned in the test above; here the claim stays where its own
      // event stream put it, because the release APPENDS to that stream and the projector replays it.)
      expect((await inject(t, 'POST', LIFE_EVENTS_ROUTE, { payload: TWO, token: tok })).status).toBe(409);

      const findingId = randomUUID();
      await inScope(t, pariwarId, (s) =>
        claim.recordMemberInnocenceFinding(s.client, {
          claimCaseId: ids.claimId(cid),
          pariwarId: ids.pariwarId(pariwarId),
          findingId: ids.claimNomineeFindingId(findingId),
          actorId: randomUUID(),
          actorDisplay: 'Investigating Trustee',
          actor: 'trustee',
        }),
      );
      expect((await inject(t, 'GET', SIGNUP_ROUTE, { token: tok })).body).toMatchObject({ locked: false });
      const res = await inject(t, 'POST', LIFE_EVENTS_ROUTE, { payload: TWO, token: tok });
      expect(res.status).toBe(200);
      expect(await versions(t, memberId)).toHaveLength(2 + 1); // rank-1 v1, v2 + rank-2 v1

      // The outcome is an IDENTITY annotation on the claim stream, carrying the finding id only.
      const ev = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_lock_released'`,
        [cid],
      );
      expect(ev.rows).toHaveLength(1);
      expect(ev.rows[0]!.payload).toMatchObject({ finding_id: findingId, from_state: 'intake_pending', to_state: 'intake_pending' });
      // ⛔ No lifecycle state moved (AC10) — an OUTCOME, never a state.
      const st = await t.pool.query('SELECT current_state FROM claims WHERE claim_case_id = $1', [cid]);
      expect(st.rows[0]!.current_state).toBe('intake_pending');
    } finally {
      await teardown(t);
    }
  });

  it('AC2 — ONE released claim does not release ANOTHER: a second, unreleased claim still locks', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok });
      const first = await fileClaim(t, pariwarId, memberId);
      await fileClaim(t, pariwarId, memberId);
      await inScope(t, pariwarId, (s) =>
        claim.recordMemberInnocenceFinding(s.client, {
          claimCaseId: ids.claimId(first),
          pariwarId: ids.pariwarId(pariwarId),
          findingId: ids.claimNomineeFindingId(randomUUID()),
          actorId: randomUUID(),
          actorDisplay: 'Investigating Trustee',
          actor: 'trustee',
        }),
      );
      await elevate(t, memberId);
      expect((await inject(t, 'POST', LIFE_EVENTS_ROUTE, { payload: TWO, token: tok })).status).toBe(409);
    } finally {
      await teardown(t);
    }
  });

  // ── D9 — the step-up on a RE-declaration ─────────────────────────────────────────────────────
  it('D9 — the INITIAL declaration of an ACTIVE member needs ⛔ no step-up (it is not a "change")', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: token(t, memberId, pariwarId) })).status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('⭐⭐ D9 — an ACTIVE member RE-declaring on the SIGNUP route without a step-up is refused (403 auth.step_up_required)', async () => {
    // ⚠ This is the AR-24 breach the story found LIVE: the signup route used to accept a re-declaration
    // on `memberSession` alone, so any active member could skip the Life Events step-up.
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status).toBe(200);
      const res = await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok });
      expect(res.status).toBe(403);
      expect(errCode(res.body)).toBe('auth.step_up_required');
      expect(await versions(t, memberId)).toHaveLength(1); // ⛔ nothing written

      await elevate(t, memberId);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok })).status).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('D9 — the LIFE EVENTS route still refuses a re-declaration without a step-up (the preHandler)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok });
      const res = await inject(t, 'POST', LIFE_EVENTS_ROUTE, { payload: TWO, token: tok });
      expect(res.status).toBe(403);
      expect(errCode(res.body)).toBe('auth.step_up_required');
    } finally {
      await teardown(t);
    }
  });

  it('D9 — the signup WIZARD\'s own back-navigation re-declare stays exempt in EVERY pre-lock-in state (pending-kyc / pending-fee / pending-valid)', async () => {
    const t = await createTestApp();
    try {
      for (const state of ['pending-kyc', 'pending-fee', 'pending-valid'] as const) {
        const { memberId, pariwarId } = await seedMember(t, state);
        const tok = token(t, memberId, pariwarId);
        expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status, state).toBe(200);
        // A RE-declare with ⛔ no elevation at all — the wizard exemption is the only reason it passes.
        expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok })).status, state).toBe(200);
      }
      // ⭐ Non-vacuity: the same re-declare by an ACTIVE member without a step-up is refused.
      const { memberId, pariwarId } = await seedMember(t, 'active');
      const tok = token(t, memberId, pariwarId);
      expect((await inject(t, 'POST', SIGNUP_ROUTE, { payload: ONE, token: tok })).status).toBe(200);
      const refused = await inject(t, 'POST', SIGNUP_ROUTE, { payload: TWO, token: tok });
      expect(refused.status).toBe(403);
      expect(errCode(refused.body)).toBe('auth.step_up_required');
    } finally {
      await teardown(t);
    }
  });

  it('AC12 — a retired five-value code (`child`) is refused; a ratified fifteen-value code (`niece_nephew`) is accepted', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t, 'pending-fee');
      const tok = token(t, memberId, pariwarId);
      const bad = await inject(t, 'POST', SIGNUP_ROUTE, {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'child', mobile: '9876543210' }] },
        token: tok,
      });
      expect(bad.status).toBe(400);
      // ⭐ Refused FOR the relationship — ⛔ not any 400 (a missing field would pass a bare status check).
      expect(JSON.stringify(bad.body)).toContain('relationship');
      const good = await inject(t, 'POST', SIGNUP_ROUTE, {
        payload: { nominees: [{ name: 'Asha Devi', relationship: 'niece_nephew', mobile: '9876543210' }] },
        token: tok,
      });
      expect(good.status).toBe(200);
      expect((good.body.nominees as Json[])[0]).toMatchObject({ relationship: 'niece_nephew' });
    } finally {
      await teardown(t);
    }
  });
});
