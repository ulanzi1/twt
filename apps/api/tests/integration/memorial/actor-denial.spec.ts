// Story 11b.4 — actor denial on the FOUR mutation routes (review R15, checklist family 3: "tampered / non-human /
// wrong-principal runtime denial tested per new mutation route"). Live DB (`:5434`), explicit values.
//
//   member routes  POST /api/v1/member/memorial/submissions                        (Send)
//                  POST /api/v1/member/memorial/submissions/:id/withdraw           (Withdraw)
//   review routes  POST /api/v1/p/:pariwarId/memorial-reviews/:submissionId/decision
//                  POST /api/v1/p/:pariwarId/memorial-reviews/:submissionId/withdraw-approval
//
// Each denial is asserted with a VALID body (a schema failure answers 400 before any guard runs, which would pass for the
// wrong reason), names the guard that answers, and proves NOTHING was written (the tables and the memorial audit lines are
// unchanged). The last test is the control: the legitimate principal succeeds on all four.
//
//   · requireMemberSession (MEMBER_SESSION_GUARD) — an access-token bearer; no / tampered / wrong-typed token, or a staff
//     cookie session, is `401 auth.session_required`;
//   · requireMemberStepUp(claim_handover) — the nominee's elevation for THIS member, fresh, for EXACTLY this context:
//     missing / expired / another context is `403 auth.step_up_required`;
//   · requireAdminSession (ADMIN_SESSION_GUARD) — a cookie session; a member bearer (even one holding the handover
//     elevation) is `401 auth.session_required`;
//   · scopeResolutionHook — a staff user with no grant in :pariwarId is `404 pariwar.not_found`;
//   · requirePermissionHook(memorial.review) — a staff user without the key is the standard `403`.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signSignupContinuation, signPariwarSelect } from '../../../src/modules/auth/member/tokens.js';
import { TEST_ORIGIN, hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  memberInject,
  memberToken,
  multipart,
  rows,
  seedMemorialWorld,
  sendFields,
  sentMemorialWorld,
  type Json,
  type MemorialWorld,
  type ReviewHarness,
  type StaffClient,
} from './_fixture.js';

describe.skipIf(!hasDatabase)('memorial — actor denial on the four mutation routes (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;
  /** `pending` is with the Trust (the target of `decision`); `approved` was approved cleanly (the target of `withdraw-approval`). */
  let pending: { w: MemorialWorld; id: string };
  let approved: { w: MemorialWorld; id: string };
  let panelPending: StaffClient;
  let panelApproved: StaffClient;
  let adminPending: StaffClient;
  let adminApproved: StaffClient;
  let outsider: StaffClient;

  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
    pending = await sentMemorialWorld(t);
    approved = await sentMemorialWorld(t);
    panelPending = await h.staff(pending.w.pariwarId, 'trustee_panel');
    panelApproved = await h.staff(approved.w.pariwarId, 'trustee_panel');
    // `pariwar_admin` holds a grant in the Pariwar but NOT `memorial.review` (MA7); `outsider` holds the key in another Pariwar.
    adminPending = await h.staff(pending.w.pariwarId, 'pariwar_admin');
    adminApproved = await h.staff(approved.w.pariwarId, 'pariwar_admin');
    outsider = await h.staff(randomUUID(), 'trustee_panel');
    const r = await panelApproved.inject({ method: 'POST', url: reviewUrl(approved, 'decision'), payload: { action: 'approved' } });
    expect(r.statusCode, r.body).toBe(200);
  });
  afterAll(async () => {
    await h.close();
  });

  const reviewUrl = (world: { w: MemorialWorld; id: string }, leaf: 'decision' | 'withdraw-approval'): string =>
    `/api/v1/p/${world.w.pariwarId}/memorial-reviews/${world.id}/${leaf}`;
  const DECISION_BODY = { action: 'approved' } as const;
  const WITHDRAW_APPROVAL_BODY = { reasonCode: 'against_the_law' } as const;

  /** Everything a denied request must leave untouched: the three tables and the memorial audit lines of one Pariwar. */
  async function snapshot(pariwarId: string, opts: { audit?: boolean } = {}) {
    const one = async (text: string) => Number((await rows<{ n: string }>(t, text, [pariwarId]))[0]!.n);
    return {
      submissions: await one(`SELECT count(*)::text AS n FROM memorial_submissions WHERE pariwar_id = $1`),
      decisions: await one(`SELECT count(*)::text AS n FROM memorial_review_decisions WHERE pariwar_id = $1`),
      withdrawals: await one(`SELECT count(*)::text AS n FROM memorial_withdrawals WHERE pariwar_id = $1`),
      // ⚠ Left out (`audit: false`) where the Withdraw handler is REACHED: it writes its audit INTENT for any id before the
      // ownership check (recorded, deferred R29) — the refusal is then compensated, so the lines move though no row does.
      ...(opts.audit === false
        ? {}
        : { auditLines: await one(`SELECT count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.%'`) }),
    };
  }

  type Call = (token: string | null) => Promise<{ status: number; body: Json }>;

  /** The two member routes as callable with ANY bearer (or none): Send with a valid multipart body, Withdraw with `{}`. */
  const memberCalls = (w: MemorialWorld, withdrawId: string): Record<'Send' | 'Withdraw', Call> => ({
    Send: async (token) => {
      const { body, ct } = multipart(sendFields());
      const r = await memberInject(t, 'POST', '/api/v1/member/memorial/submissions', {
        payload: body,
        ...(token ? { token } : {}),
        headers: { 'content-type': ct, 'idempotency-key': randomUUID() },
      });
      return { status: r.status, body: r.body };
    },
    Withdraw: async (token) => {
      const r = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${withdrawId}/withdraw`, {
        payload: {},
        ...(token ? { token } : {}),
      });
      return { status: r.status, body: r.body };
    },
  });

  const reviewCalls = (target: { w: MemorialWorld; id: string }): Record<'decision' | 'withdraw-approval', (token: string | null) => Promise<{ status: number; body: Json }>> => {
    const call = (leaf: 'decision' | 'withdraw-approval', payload: object) => async (token: string | null) => {
      const res = await t.app.inject({
        method: 'POST',
        url: reviewUrl(target, leaf),
        payload,
        headers: { origin: TEST_ORIGIN, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      });
      return { status: res.statusCode, body: res.json() as Json };
    };
    return { decision: call('decision', DECISION_BODY), 'withdraw-approval': call('withdraw-approval', WITHDRAW_APPROVAL_BODY) };
  };

  const code = (body: Json): unknown => (body.error as { code?: unknown } | undefined)?.code;

  // ── unauthenticated ──────────────────────────────────────────────────────────────────────────────────────────────────

  it('unauthenticated → 401 auth.session_required on ALL FOUR routes (requireMemberSession / requireAdminSession); nothing written', async () => {
    const before = await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)]);
    const member = memberCalls(pending.w, pending.id);
    const decisions = reviewCalls(pending);
    const withdrawApproval = reviewCalls(approved);
    for (const [name, call] of [
      ['member Send', member.Send],
      ['member Withdraw', member.Withdraw],
      ['review decision', decisions.decision],
      ['review withdraw-approval', withdrawApproval['withdraw-approval']],
    ] as const) {
      const r = await call(null);
      expect(r.status, name).toBe(401);
      expect(code(r.body), name).toBe('auth.session_required');
    }
    expect(await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)])).toEqual(before);
  });

  // ── tampered / wrong-typed bearer ────────────────────────────────────────────────────────────────────────────────────

  it('a TAMPERED access token, and a signup-continuation / pariwar-select token, are 401 on both member routes — not a session bearer', async () => {
    const before = await snapshot(pending.w.pariwarId);
    const valid = memberToken(t, pending.w.memberId, pending.w.pariwarId);
    const tampered = `${valid.slice(0, -8)}AAAAAAAA`;
    expect(tampered).not.toBe(valid);
    const continuation = signSignupContinuation(t.app, { mobileBlindIndex: 'blind', jti: randomUUID() }, 60_000);
    const select = signPariwarSelect(t.app, { mobileBlindIndex: 'blind', deviceId: 'test-device', jti: randomUUID() }, 60_000);
    const member = memberCalls(pending.w, pending.id);
    for (const [kind, token] of [['tampered signature', tampered], ['signup-continuation token', continuation], ['pariwar-select token', select]] as const) {
      for (const [route, call] of [['Send', member.Send], ['Withdraw', member.Withdraw]] as const) {
        const r = await call(token);
        expect(r.status, `${route} with a ${kind}`).toBe(401);
        expect(code(r.body), `${route} with a ${kind}`).toBe('auth.session_required');
      }
    }
    expect(await snapshot(pending.w.pariwarId)).toEqual(before);
  });

  // ── wrong principal: staff on member routes, a member on review routes ───────────────────────────────────────────────

  it('a STAFF cookie session on a member route → 401 auth.session_required (requireMemberSession wants a bearer); nothing written', async () => {
    const before = await snapshot(pending.w.pariwarId);
    const { body, ct } = multipart(sendFields());
    for (const [who, staff] of [['trustee_panel', panelPending], ['pariwar_admin', adminPending]] as const) {
      const send = await staff.inject({ method: 'POST', url: '/api/v1/member/memorial/submissions', payload: body, headers: { 'content-type': ct, 'idempotency-key': randomUUID() } });
      expect(send.statusCode, `${who} Send`).toBe(401);
      expect(send.json<Json>()).toMatchObject({ error: { code: 'auth.session_required' } });
      const withdraw = await staff.inject({ method: 'POST', url: `/api/v1/member/memorial/submissions/${pending.id}/withdraw`, payload: {} });
      expect(withdraw.statusCode, `${who} Withdraw`).toBe(401);
      expect(withdraw.json<Json>()).toMatchObject({ error: { code: 'auth.session_required' } });
    }
    expect(await snapshot(pending.w.pariwarId)).toEqual(before);
  });

  it('a MEMBER bearer — even the family\'s own, holding a fresh handover elevation — on a review route → 401 (requireAdminSession wants a cookie session)', async () => {
    // `sentMemorialWorld` left both families with a fresh `claim_handover` elevation: the member can write, and still cannot review.
    const before = await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)]);
    const calls = [
      ['decision', reviewCalls(pending).decision, pending.w.token],
      ['withdraw-approval', reviewCalls(approved)['withdraw-approval'], approved.w.token],
      // …and another family's token on this family's review route.
      ['decision (another family\'s token)', reviewCalls(pending).decision, approved.w.token],
    ] as const;
    for (const [name, call, token] of calls) {
      const r = await call(token);
      expect(r.status, name).toBe(401);
      expect(code(r.body), name).toBe('auth.session_required');
    }
    expect(await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)])).toEqual(before);
  });

  // ── staff: no grant, no key ──────────────────────────────────────────────────────────────────────────────────────────

  it('staff WITHOUT memorial.review → 403 on decision AND withdraw-approval (requirePermissionHook); nothing written', async () => {
    const before = await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)]);
    const d = await adminPending.inject({ method: 'POST', url: reviewUrl(pending, 'decision'), payload: DECISION_BODY });
    expect(d.statusCode).toBe(403);
    const w = await adminApproved.inject({ method: 'POST', url: reviewUrl(approved, 'withdraw-approval'), payload: WITHDRAW_APPROVAL_BODY });
    expect(w.statusCode).toBe(403);
    // The standard RBAC 403 (`AuthorizationDeniedError`, code `authz.forbidden`) — not the neutral review 404: the key is checked
    // before the version is looked up, so a reviewer without it learns nothing about the id.
    for (const res of [d, w]) expect(res.json<Json>()).toMatchObject({ error: { code: 'authz.forbidden' } });
    expect(await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)])).toEqual(before);
  });

  it('staff with the key in ANOTHER Pariwar → the scope middleware\'s 404 pariwar.not_found on decision and withdraw-approval; nothing written', async () => {
    const before = await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)]);
    const d = await outsider.inject({ method: 'POST', url: reviewUrl(pending, 'decision'), payload: DECISION_BODY });
    const w = await outsider.inject({ method: 'POST', url: reviewUrl(approved, 'withdraw-approval'), payload: WITHDRAW_APPROVAL_BODY });
    for (const res of [d, w]) {
      expect(res.statusCode).toBe(404);
      expect(res.json<Json>()).toMatchObject({ error: { code: 'pariwar.not_found' } });
    }
    expect(await Promise.all([snapshot(pending.w.pariwarId), snapshot(approved.w.pariwarId)])).toEqual(before);
  });

  // ── the step-up gate with the switch ON ──────────────────────────────────────────────────────────────────────────────

  it('⭐ Send AND Withdraw with the switch ON and no fresh claim_handover elevation (none / expired / another context) → 403 auth.step_up_required; nothing written', async () => {
    const { w, id } = await sentMemorialWorld(t); // leaves a fresh elevation; the legs below take it away
    const member = memberCalls(w, id);
    const before = await snapshot(w.pariwarId);
    const expectDenied = async (label: string): Promise<void> => {
      for (const [route, call] of [['Send', member.Send], ['Withdraw', member.Withdraw]] as const) {
        const r = await call(w.token);
        expect(r.status, `${label}: ${route}`).toBe(403);
        expect(code(r.body), `${label}: ${route}`).toBe('auth.step_up_required');
      }
      expect(await snapshot(w.pariwarId), label).toEqual(before);
    };
    // (1) the elevation has EXPIRED.
    await rows(t, `UPDATE member_step_up_elevations SET elevated_until = now() - interval '1 minute' WHERE member_id = $1`, [w.memberId]);
    await expectDenied('expired claim_handover');
    // (2) no elevation row at all.
    await rows(t, `DELETE FROM member_step_up_elevations WHERE member_id = $1`, [w.memberId]);
    await expectDenied('no elevation');
    // (3) a FRESH elevation for ANOTHER context never satisfies this gate ("an elevation for action A never satisfies action B").
    await rows(t, `INSERT INTO member_step_up_elevations (member_id, action_context, elevated_until) VALUES ($1, 'nominee_update', now() + interval '5 minutes')`, [w.memberId]);
    await expectDenied('a fresh nominee_update elevation');
  });

  // What the neutral 404 proves HERE: the session member's OWN drive is not a closed / settled one (its pool is `live`), so
  // `resolveMemorialDrive` answers null and the writes answer `memorial.not_found` — even with a valid handover elevation, and even
  // though the SAME Pariwar holds another family's closed drive with a version with the Trust (`pending`). It is the STATE gate
  // (MEMORIAL_DRIVE_POOL_STATES) that answers; the other half — a member with a closed drive of their own who names ANOTHER family's
  // id in the same Pariwar — is the chain-membership check, proved in member-memorial.spec.ts ("ANOTHER FAMILY'S id in the SAME
  // Pariwar"). The two cannot be told apart by this test, so it does not claim to.
  it('a member whose OWN drive is not closed (a live pool), holding a valid handover elevation, is the neutral 404 memorial.not_found on Send and Withdraw — in the same Pariwar as another family\'s closed drive, which stays untouched', async () => {
    const live = await seedMemorialWorld(t, { poolState: 'live', intoPariwar: pending.w.pariwarId });
    expect(live.pariwarId).toBe(pending.w.pariwarId);
    expect(live.memberId).not.toBe(pending.w.memberId);
    await rows(t, `INSERT INTO member_step_up_elevations (member_id, action_context, elevated_until) VALUES ($1, 'claim_handover', now() + interval '5 minutes')`, [live.memberId]);
    const tables = { audit: false };
    const before = await snapshot(pending.w.pariwarId, tables);
    const own = memberCalls(live, randomUUID());
    for (const [name, call] of [['Send', own.Send], ['Withdraw (an unknown id)', own.Withdraw], ['Withdraw (another family\'s id)', memberCalls(live, pending.id).Withdraw]] as const) {
      const r = await call(live.token);
      expect(r.status, name).toBe(404);
      expect(code(r.body), name).toBe('memorial.not_found');
    }
    expect(await snapshot(pending.w.pariwarId, tables)).toEqual(before);
  });

  // ── the control ──────────────────────────────────────────────────────────────────────────────────────────────────────

  // ⚠ The control runs on its OWN worlds: the shared `pending` / `approved` worlds above are only ever read or refused (never changed
  // by a test), so every test in this file is independent of the order the others run in.
  it('CONTROL: the legitimate principal succeeds on all four routes (so every denial above is the guard, not the request)', async () => {
    // Send and Withdraw (the family, fresh elevation from `sentMemorialWorld`), then the Trust decides the new version.
    const own = await sentMemorialWorld(t);
    const member = memberCalls(own.w, own.id);
    expect((await member.Withdraw(own.w.token)).status).toBe(200);
    const sent = await member.Send(own.w.token);
    expect(sent.status, JSON.stringify(sent.body)).toBe(201);
    const panelOwn = await h.staff(own.w.pariwarId, 'trustee_panel');
    const d = await panelOwn.inject({ method: 'POST', url: reviewUrl({ w: own.w, id: sent.body.submissionId as string }, 'decision'), payload: DECISION_BODY });
    expect(d.statusCode, d.body).toBe(200);
    // withdraw-approval, on a version approved cleanly.
    const decided = await sentMemorialWorld(t);
    const panelDecided = await h.staff(decided.w.pariwarId, 'trustee_panel');
    expect((await panelDecided.inject({ method: 'POST', url: reviewUrl(decided, 'decision'), payload: DECISION_BODY })).statusCode).toBe(200);
    const wa = await panelDecided.inject({ method: 'POST', url: reviewUrl(decided, 'withdraw-approval'), payload: WITHDRAW_APPROVAL_BODY });
    expect(wa.statusCode, wa.body).toBe(200);
    expect(wa.json<Json>()).toEqual({ submissionId: decided.id, memorialState: 'approval_withdrawn' });
  });
});
