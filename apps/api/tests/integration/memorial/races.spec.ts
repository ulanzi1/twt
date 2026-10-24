// Story 11b.4 — TRUE two-connection races on the family memorial, proven live (review R15, checklist family 2; MA9, Trap 12).
//
// EVERY memorial write — Send, the family's Withdraw, the Trust's decision, the Trust's withdraw-approval — takes the pool-keyed
// advisory lock FIRST and re-checks the chain AFTER it, so a race is SERIAL: exactly one of two conflicting writers wins, the
// other lands on its documented refusal, exactly one row is written and the chain is never torn ("decided AND superseded",
// "decided AND withdrawn"). Until now only Send × Send was proven (member-memorial.spec.ts, Trap 12).
//
// ⭐ How the race is made REAL, not left to the scheduler: a third connection holds the pool's advisory lock (`holdPoolLock`),
// the first writer is started and waited for until it is parked on the lock, then the second, then both are released together.
// Both requests are in flight at once (`Promise.all`), both have passed their PRE-lock checks (which is exactly what the
// under-lock re-check exists for), and the order the lock serialises them in is the order they queued — so BOTH orders of every
// pair are asserted, each with the one outcome the lock guarantees.
//
// The last tests drive the `23505 → 409 memorial.try_again` mapping through the REAL handler: an UNLOCKED writer (a second
// connection inserting without the advisory lock) holds an open transaction; the Send, which cannot see the uncommitted row,
// parks on the unique index and loses with a 23505 when the writer commits (Trap 12: the unique indexes are the BACKSTOP an
// unlocked insert can reach). Since 0183 the Send's Idempotency-Key rides the row: when the unlocked writer's row carries the
// SAME key, the 23505 is re-read under a SAVEPOINT and becomes the 200 replay of that row instead of the 409.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import {
  beginUnlockedSubmission,
  createReviewHarness,
  holdPoolLock,
  jpegWithGps,
  memberInject,
  rows,
  send,
  sendFields,
  sentMemorialWorld,
  waitForParkedSubmissionInsert,
  type Json,
  type MemorialWorld,
  type ReviewHarness,
  type StaffClient,
} from './_fixture.js';

type Reply = { status: number; body: Json };

describe.skipIf(!hasDatabase)('memorial — races, proven live (two connections, the advisory lock)', () => {
  let h: ReviewHarness;
  let t: TestApp;

  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  const url = (w: MemorialWorld, id: string, leaf: 'decision' | 'withdraw-approval') => `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/${leaf}`;
  const decide = (c: StaffClient, w: MemorialWorld, id: string, payload: object): (() => Promise<Reply>) => async () => {
    const r = await c.inject({ method: 'POST', url: url(w, id, 'decision'), payload });
    return { status: r.statusCode, body: r.json<Json>() };
  };
  const withdrawApproval = (c: StaffClient, w: MemorialWorld, id: string, reasonCode: string): (() => Promise<Reply>) => async () => {
    const r = await c.inject({ method: 'POST', url: url(w, id, 'withdraw-approval'), payload: { reasonCode } });
    return { status: r.statusCode, body: r.json<Json>() };
  };
  const familyWithdraw = (w: MemorialWorld, id: string): (() => Promise<Reply>) => async () => {
    const r = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${id}/withdraw`, { payload: {}, token: w.token });
    return { status: r.status, body: r.body };
  };
  const familySend = (w: MemorialWorld, body: string): (() => Promise<Reply>) => async () => send(t, w, sendFields({ body }));
  const code = (r: Reply): unknown => (r.body.error as { code?: unknown } | undefined)?.code;

  /**
   * Run two writers as a real race at the pool lock: `first` queues first, `second` second, then the lock is released and both
   * run to completion concurrently (`Promise.all`). The lock holder is always cleaned up.
   */
  async function race(w: MemorialWorld, first: () => Promise<Reply>, second: () => Promise<Reply>): Promise<{ first: Reply; second: Reply }> {
    const lock = await holdPoolLock(t, w.poolId);
    try {
      const a = first();
      await lock.waitForWaiters(1);
      const b = second();
      await lock.waitForWaiters(2);
      await lock.release();
      const [ra, rb] = await Promise.all([a, b]);
      return { first: ra, second: rb };
    } finally {
      await lock.abort();
    }
  }

  /** The whole chain in the database: versions oldest-first, with the decision / withdrawal each carries. */
  async function chain(w: MemorialWorld) {
    return rows<{ submission_id: string; supersedes_submission_id: string | null; action: string | null; withdrawn_by: string | null; actor_display: string | null }>(
      t,
      `SELECT s.submission_id, s.supersedes_submission_id, d.action, wd.withdrawn_by, d.actor_display
         FROM memorial_submissions s
         LEFT JOIN memorial_review_decisions d ON d.submission_id = s.submission_id
         LEFT JOIN memorial_withdrawals wd ON wd.submission_id = s.submission_id
        WHERE s.pariwar_id = $1 ORDER BY s.created_at, s.submission_id`,
      [w.pariwarId],
    );
  }
  const decisionCount = async (w: MemorialWorld) =>
    Number((await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_review_decisions WHERE pariwar_id = $1`, [w.pariwarId]))[0]!.n);
  const withdrawalCount = async (w: MemorialWorld) =>
    Number((await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_withdrawals WHERE pariwar_id = $1`, [w.pariwarId]))[0]!.n);

  // ── decide × Send ────────────────────────────────────────────────────────────────────────────────────────────────────

  it('decide × Send — the DECISION queued first wins: 200, then the Send is refused 409 already_reviewed; one decision, no second version', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const r = await race(w, decide(panel, w, id, { action: 'approved' }), familySend(w, 'a late second version'));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(409);
    expect(code(r.second)).toBe('memorial.already_reviewed');
    const links = await chain(w);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ submission_id: id, action: 'approved', withdrawn_by: null });
  });

  it('decide × Send — the SEND queued first wins: 201, then the decision (its pre-lock check passed) lands on the neutral 404; no decision on a superseded version', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const r = await race(w, familySend(w, 'the second version'), decide(panel, w, id, { action: 'approved' }));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(201);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(404);
    expect(r.second.body).toMatchObject({ error: { code: 'memorial_review.not_found', message: 'Not found' } });
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ submission_id: id, action: null, withdrawn_by: null });
    expect(links[1]).toMatchObject({ supersedes_submission_id: id, action: null, withdrawn_by: null });
    expect(await decisionCount(w)).toBe(0);
  });

  // ── decide × the family's withdraw ───────────────────────────────────────────────────────────────────────────────────

  it('decide × family Withdraw — the DECISION first wins: 200, then the Withdraw is 409 not_withdrawable; never "decided AND withdrawn"', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const r = await race(w, decide(panel, w, id, { action: 'approved' }), familyWithdraw(w, id));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(409);
    expect(code(r.second)).toBe('memorial.not_withdrawable');
    expect(await decisionCount(w)).toBe(1);
    expect(await withdrawalCount(w)).toBe(0);
  });

  it('decide × family Withdraw — the WITHDRAW first wins: 200, then the decision is the neutral 404; never "decided AND withdrawn"', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const r = await race(w, familyWithdraw(w, id), decide(panel, w, id, { action: 'approved' }));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.first.body).toEqual({ memorialState: 'withdrawn' });
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(404);
    expect(code(r.second)).toBe('memorial_review.not_found');
    expect(await decisionCount(w)).toBe(0);
    expect(await withdrawalCount(w)).toBe(1);
    expect((await chain(w))[0]).toMatchObject({ withdrawn_by: 'family', action: null });
  });

  // ── withdraw-approval × Send ─────────────────────────────────────────────────────────────────────────────────────────

  // The family may send again after an approval WITH OMISSIONS (MA13), and the Trust may withdraw an approval that a newer
  // version has superseded (MA16) — so here BOTH writers win in EITHER order; what the lock guarantees is the end state: one
  // Trust withdrawal on the approved version, exactly one new version superseding it, a linear chain.
  it.each([
    ['withdraw-approval queued first', true],
    ['Send queued first', false],
  ] as const)('withdraw-approval × Send — %s: both succeed, the chain ends the same way (one Trust withdrawal, one new version, linear)', async (_label, approvalFirst) => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const approve = await decide(panel, w, id, { action: 'approved_with_omissions', omissions: [{ field: 'body', start: 0, end: 3, reason: 'against_the_law' }] })();
    expect(approve.status, JSON.stringify(approve.body)).toBe(200);
    const wa = withdrawApproval(panel, w, id, 'identifies_a_child');
    const sendNew = familySend(w, 'a corrected version');
    const r = approvalFirst ? await race(w, wa, sendNew) : await race(w, sendNew, wa);
    const approvalReply = approvalFirst ? r.first : r.second;
    const sendReply = approvalFirst ? r.second : r.first;
    expect(approvalReply.status, JSON.stringify(approvalReply.body)).toBe(200);
    expect(sendReply.status, JSON.stringify(sendReply.body)).toBe(201);
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ submission_id: id, action: 'approved_with_omissions', withdrawn_by: 'trust' });
    expect(links[1]).toMatchObject({ supersedes_submission_id: id, action: null, withdrawn_by: null });
    expect(await withdrawalCount(w)).toBe(1);
    const view = (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Record<string, unknown>;
    expect(view.memorialState).toBe('with_the_trust');
  });

  // ── two writers of the SAME kind ─────────────────────────────────────────────────────────────────────────────────────

  it('decide × decide (two reviewers) — the first queued wins: 200, the second is the neutral 404; ONE decision row, written by the first', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const one = await h.staff(w.pariwarId, 'trustee_panel', 'Reviewer One');
    const two = await h.staff(w.pariwarId, 'trustee_panel', 'Reviewer Two');
    const r = await race(w, decide(one, w, id, { action: 'approved' }), decide(two, w, id, { action: 'not_approved', reasonCode: 'against_the_law' }));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(404);
    expect(code(r.second)).toBe('memorial_review.not_found');
    expect(await decisionCount(w)).toBe(1);
    expect((await chain(w))[0]).toMatchObject({ action: 'approved', actor_display: 'Reviewer One' });
  });

  it('family Withdraw × family Withdraw (a double tap) — 200 then 409 not_withdrawable; ONE withdrawal row', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const r = await race(w, familyWithdraw(w, id), familyWithdraw(w, id));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(409);
    expect(code(r.second)).toBe('memorial.not_withdrawable');
    expect(await withdrawalCount(w)).toBe(1);
  });

  it('withdraw-approval × withdraw-approval — 200 then the neutral 404 (already withdrawn); ONE Trust withdrawal, with the first reviewer\'s reason', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    expect((await decide(panel, w, id, { action: 'approved' })()).status).toBe(200);
    const r = await race(w, withdrawApproval(panel, w, id, 'identifies_a_child'), withdrawApproval(panel, w, id, 'against_the_law'));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(404);
    expect(code(r.second)).toBe('memorial_review.not_found');
    const [withdrawal] = await rows<{ reason_code: string; withdrawn_by: string }>(t, `SELECT reason_code, withdrawn_by FROM memorial_withdrawals WHERE submission_id = $1`, [id]);
    expect(withdrawal).toEqual({ reason_code: 'identifies_a_child', withdrawn_by: 'trust' });
    expect(await withdrawalCount(w)).toBe(1);
  });

  it('Send × Send queued behind the lock — both 201, the second SUPERSEDES the first; the chain is linear (the deterministic form of Trap 12)', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    // A not-approved first version lets the family send again; the race is then two Sends on the same head.
    expect((await decide(panel, w, id, { action: 'not_approved', reasonCode: 'attacks_someone_named' })()).status).toBe(200);
    const r = await race(w, familySend(w, 'first of two'), familySend(w, 'second of two'));
    expect([r.first.status, r.second.status]).toEqual([201, 201]);
    const links = await chain(w);
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.supersedes_submission_id)).toEqual([null, id, links[1]!.submission_id]);
  });

  it('AC3 (0183): a REPLAY of a Send whose first attempt is still in flight (parked on the lock) WAITS behind it on the lock, then replays it — 201 then 200 with the FIRST result; ⛔ 409, ⛔ a second version', async () => {
    const { w, id } = await sentMemorialWorld(t);
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    // A not-approved first version lets the family send again.
    expect((await decide(panel, w, id, { action: 'not_approved', reasonCode: 'against_the_law' })()).status).toBe(200);
    const key = randomUUID();
    const r = await race(
      w,
      () => send(t, w, sendFields({ body: 'in flight' }), { key }),
      () => send(t, w, sendFields({ body: 'in flight' }), { key }),
    );
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(201);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(200);
    expect(r.second.body).toEqual(r.first.body);
    expect(await chain(w)).toHaveLength(2);
    // Later, at any age, the key still replays the same version.
    const later = await send(t, w, sendFields({ body: 'in flight' }), { key });
    expect(later.status).toBe(200);
    expect(later.body).toEqual(r.first.body);
    expect(await chain(w)).toHaveLength(2);
  });

  // ── the 23505 backstop through the real handler ──────────────────────────────────────────────────────────────────────

  it('⭐ Trap 12: an UNLOCKED writer\'s uncommitted version + a Send that cannot see it → the Send loses with 23505, mapped to 409 memorial.try_again; the retry (same key) succeeds', async () => {
    const { w, id } = await sentMemorialWorld(t);
    // Withdraw v1 so the chain head is withdrawn and the family may send again.
    expect((await familyWithdraw(w, id)()).status).toBe(200);
    const unlocked = await beginUnlockedSubmission(t, w, { supersedes: id });
    const key = randomUUID();
    let outcome: Reply;
    try {
      const pending = send(t, w, sendFields({ body: 'will lose the race' }), { key });
      await waitForParkedSubmissionInsert(t, unlocked);
      await unlocked.commit();
      outcome = await pending;
    } finally {
      await unlocked.rollback();
    }
    expect(outcome.status, JSON.stringify(outcome.body)).toBe(409);
    expect(outcome.body).toMatchObject({ error: { code: 'memorial.try_again' } });
    // Exactly the unlocked writer's version was added; the refused Send wrote nothing.
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[1]!.submission_id).toBe(unlocked.submissionId);
    // The refused Send wrote nothing — its key is on no row — so the family's retry with it is a fresh attempt on the new head.
    const retry = await send(t, w, sendFields({ body: 'will lose the race' }), { key });
    expect(retry.status, JSON.stringify(retry.body)).toBe(201);
    const after = await chain(w);
    expect(after).toHaveLength(3);
    expect(after[2]!.supersedes_submission_id).toBe(unlocked.submissionId);
  });

  it('Trap 12 (control): when the unlocked writer ROLLS BACK instead, the parked Send simply succeeds — it really was waiting on the index', async () => {
    const { w, id } = await sentMemorialWorld(t);
    expect((await familyWithdraw(w, id)()).status).toBe(200);
    const unlocked = await beginUnlockedSubmission(t, w, { supersedes: id });
    let outcome: Reply;
    try {
      const pending = send(t, w, sendFields({ body: 'wins after the rollback' }));
      await waitForParkedSubmissionInsert(t, unlocked);
      await unlocked.rollback();
      outcome = await pending;
    } finally {
      await unlocked.rollback();
    }
    expect(outcome.status, JSON.stringify(outcome.body)).toBe(201);
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[1]!.supersedes_submission_id).toBe(id);
  });

  it('⭐ Trap 12 × 0183: an UNLOCKED writer\'s uncommitted version carrying the SAME Idempotency-Key → the parked Send\'s 23505 finds the key on the now-committed row and REPLAYS it (200, the writer\'s id); this request\'s photo is deleted; ⛔ a second version', async () => {
    const { w, id } = await sentMemorialWorld(t);
    expect((await familyWithdraw(w, id)()).status).toBe(200);
    const key = randomUUID();
    const unlocked = await beginUnlockedSubmission(t, w, { supersedes: id, idempotencyKey: key });
    const objectsBefore = t.memorialPhotoStorage.store.size;
    let outcome: Reply;
    try {
      const pending = send(t, w, [
        ...sendFields({ body: 'the same Send, retried', altText: 'फ़ोटो' }),
        { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
      ], { key });
      await waitForParkedSubmissionInsert(t, unlocked);
      await unlocked.commit();
      outcome = await pending;
    } finally {
      await unlocked.rollback();
    }
    expect(outcome.status, JSON.stringify(outcome.body)).toBe(200);
    expect(outcome.body).toEqual({ submissionId: unlocked.submissionId, memorialState: 'with_the_trust' });
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[1]!.submission_id).toBe(unlocked.submissionId);
    // The photo this request put is unreferenced (the replayed row has none) — deleted.
    expect(t.memorialPhotoStorage.store.size).toBe(objectsBefore);
  });

  it('Trap 12 × 0183 (control): when that same-key unlocked writer ROLLS BACK, the parked Send inserts its own version (201) — the key is its own again', async () => {
    const { w, id } = await sentMemorialWorld(t);
    expect((await familyWithdraw(w, id)()).status).toBe(200);
    const key = randomUUID();
    const unlocked = await beginUnlockedSubmission(t, w, { supersedes: id, idempotencyKey: key });
    let outcome: Reply;
    try {
      const pending = send(t, w, sendFields({ body: 'wins after the rollback' }), { key });
      await waitForParkedSubmissionInsert(t, unlocked);
      await unlocked.rollback();
      outcome = await pending;
    } finally {
      await unlocked.rollback();
    }
    expect(outcome.status, JSON.stringify(outcome.body)).toBe(201);
    const links = await chain(w);
    expect(links).toHaveLength(2);
    expect(links[1]!.supersedes_submission_id).toBe(id);
    expect(await rows(t, `SELECT submission_id FROM memorial_submissions WHERE pool_id = $1 AND idempotency_key = $2`, [w.poolId, key])).toEqual([
      { submission_id: outcome.body.submissionId },
    ]);
  });

  it('MA8 + Trap 12: a Send that KEEPS the earlier photo and then loses with 23505 → 409, and the earlier version\'s object is STILL in storage (a reused object is never deleted)', async () => {
    const { w, id } = await sentMemorialWorld(t, {
      parts: [
        ...sendFields({ body: 'with a photo', altText: 'फ़ोटो' }),
        { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
      ],
    });
    const [first] = await rows<{ photo_object_key: string }>(t, `SELECT photo_object_key FROM memorial_submissions WHERE submission_id = $1`, [id]);
    expect(t.memorialPhotoStorage.store.has(first!.photo_object_key)).toBe(true);
    expect((await familyWithdraw(w, id)()).status).toBe(200);
    const objectsBefore = t.memorialPhotoStorage.store.size;
    // The unlocked writer takes the slot "superseding v1" first; the keepPreviousPhoto Send reads v1 (withdrawn) as the head and
    // decides to keep ITS photo, then collides on `supersedes_uq` AFTER that decision — the failure the old test never reached.
    const unlocked = await beginUnlockedSubmission(t, w, { supersedes: id });
    let outcome: Reply;
    try {
      const pending = send(t, w, sendFields({ body: 'keeps the photo', altText: 'फ़ोटो', keepPreviousPhoto: 'true' }));
      await waitForParkedSubmissionInsert(t, unlocked);
      await unlocked.commit();
      outcome = await pending;
    } finally {
      await unlocked.rollback();
    }
    expect(outcome.status, JSON.stringify(outcome.body)).toBe(409);
    expect(outcome.body).toMatchObject({ error: { code: 'memorial.try_again' } });
    expect(t.memorialPhotoStorage.store.has(first!.photo_object_key), 'the earlier version\'s photo must survive').toBe(true);
    expect(t.memorialPhotoStorage.store.size).toBe(objectsBefore);
  });
});
