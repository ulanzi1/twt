// Story 11b.4, review R9 + R14 — the Trust's review detail names the chain's withdraw target from ANY version (MA16: "whatever
// newer versions follow it"), and the queue pages (`offset` + `hasMore`) with the decided view NEWEST DECISION first (review
// T7: by the head's decision / withdrawal time, ⛔ not its sent time). Live DB (`:5434`), explicit values, one Pariwar per world.

import { randomUUID } from 'node:crypto';

import { MemorialReviewListResponse } from '@twt/contracts';
import { memorial } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import { createReviewHarness, handover, rows, seedMemorialWorld, send, sendFields, type MemorialWorld, type ReviewHarness, type StaffClient } from './_fixture.js';

type Client = StaffClient;

describe.skipIf(!hasDatabase)('memorial review — the withdraw target and the paged queue (R9 / R14, live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;

  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });

  afterAll(async () => {
    await h.close();
  });

  const staff = (pariwarId: string, role: string | null, displayName = 'Panel Member'): Promise<Client> => h.staff(pariwarId, role, displayName);

  /** The permission text the Send must echo — read from the domain, not from a pinned literal. */
  const fields = (over: Parameters<typeof sendFields>[0] = {}) =>
    sendFields({ authorisationCopyVersion: memorial.MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION, ...over });

  const BODY = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं।';
  const base = (w: MemorialWorld) => `/api/v1/p/${w.pariwarId}/memorial-reviews`;
  const post = (c: Client, url: string, payload: object) => c.inject({ method: 'POST', url, payload });

  /** One Pariwar with a deceased member who has sent version 1. */
  async function sentWorld(): Promise<{ w: MemorialWorld; panel: Client; v1: string }> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect((await send(t, w, fields({ body: BODY }))).status).toBe(201);
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const [first] = await versions(w);
    return { w, panel, v1: first! };
  }

  const versions = async (w: MemorialWorld): Promise<string[]> =>
    (await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId])).map(
      (r) => r.submission_id,
    );

  /** Approve with a part left out (the one decision after which the family can send again — MA13). */
  const approveWithOmission = (panel: Client, w: MemorialWorld, id: string) =>
    post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'body', start: BODY.indexOf('रमेश'), end: BODY.indexOf('\n'), reason: 'accuses_someone_of_wrongdoing' }],
    });

  interface Detail {
    submissionId: string;
    canDecide: boolean;
    canWithdrawApproval: boolean;
    withdrawApprovalTargetId: string | null;
    memorialState: string;
  }
  const detail = async (panel: Client, w: MemorialWorld, id: string): Promise<Detail> => {
    const r = await panel.inject({ method: 'GET', url: `${base(w)}/${id}` });
    expect(r.statusCode).toBe(200);
    return r.json<Detail>();
  };

  it('Z2: the family\'s Send key is ⛔ on the review detail or the queue (member view only)', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const key = `z2-${randomUUID()}`;
    expect((await send(t, w, fields({ body: BODY }), { key })).status).toBe(201);
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const [id] = await versions(w);
    const d = await panel.inject({ method: 'GET', url: `${base(w)}/${id}` });
    const q = await panel.inject({ method: 'GET', url: `${base(w)}?view=pending` });
    for (const r of [d, q]) {
      expect(r.statusCode).toBe(200);
      expect(r.body).not.toContain(key);
      expect(r.body).not.toContain('idempotencyKey');
    }
  });

  // ── R9 — the withdraw target ─────────────────────────────────────────────────────────────────────────────────────────

  it('R9: v1 approved, v2 pending — the detail of the HEAD names v1 as the withdraw target, and POSTing to it works', async () => {
    const { w, panel, v1 } = await sentWorld();
    expect((await approveWithOmission(panel, w, v1)).statusCode).toBe(200);
    expect((await send(t, w, fields({ body: 'दूसरा संस्करण।' }))).status).toBe(201);
    const v2 = (await versions(w))[1]!;

    const head = await detail(panel, w, v2);
    expect(head).toMatchObject({ submissionId: v2, canDecide: true, canWithdrawApproval: true, withdrawApprovalTargetId: v1 });
    // The same chain opened from the OLDER version says the same (the flag is "this chain has an approval to withdraw").
    const older = await detail(panel, w, v1);
    expect(older).toMatchObject({ submissionId: v1, canDecide: false, canWithdrawApproval: true, withdrawApprovalTargetId: v1 });

    // The route still validates its target: the head is NOT an approved version, so posting to it is the neutral 404.
    const wrong = await post(panel, `${base(w)}/${v2}/withdraw-approval`, { reasonCode: 'identifies_a_child' });
    expect(wrong.statusCode).toBe(404);
    expect(wrong.json()).toMatchObject({ error: { code: 'memorial_review.not_found' } });

    // The admin posts to the id the detail named — and it works.
    const done = await post(panel, `${base(w)}/${head.withdrawApprovalTargetId}/withdraw-approval`, { reasonCode: 'identifies_a_child' });
    expect(done.statusCode).toBe(200);
    expect(done.json()).toEqual({ submissionId: v1, memorialState: 'approval_withdrawn' });

    // Nothing is left to withdraw: the target is gone from the head's detail too, and the head can still be decided.
    expect(await detail(panel, w, v2)).toMatchObject({ canDecide: true, canWithdrawApproval: false, withdrawApprovalTargetId: null });
    expect(await detail(panel, w, v1)).toMatchObject({ canWithdrawApproval: false, withdrawApprovalTargetId: null });
  });

  it('R9: v1 approved, v2 declined — the target is still v1 from either version', async () => {
    const { w, panel, v1 } = await sentWorld();
    expect((await approveWithOmission(panel, w, v1)).statusCode).toBe(200);
    expect((await send(t, w, fields({ body: 'दूसरा संस्करण।' }))).status).toBe(201);
    const v2 = (await versions(w))[1]!;
    expect((await post(panel, `${base(w)}/${v2}/decision`, { action: 'not_approved', reasonCode: 'against_the_law' })).statusCode).toBe(200);
    expect(await detail(panel, w, v2)).toMatchObject({ memorialState: 'not_approved', canDecide: false, canWithdrawApproval: true, withdrawApprovalTargetId: v1 });
  });

  it('R9: with several approvals the target is the NEWEST un-withdrawn one; after it is withdrawn the earlier one is next', async () => {
    const { w, panel, v1 } = await sentWorld();
    expect((await approveWithOmission(panel, w, v1)).statusCode).toBe(200);
    expect((await send(t, w, fields({ body: 'दूसरा संस्करण। रमेश ने धोखा दिया।' }))).status).toBe(201);
    const v2 = (await versions(w))[1]!;
    const body2 = 'दूसरा संस्करण। रमेश ने धोखा दिया।';
    expect(
      (
        await post(panel, `${base(w)}/${v2}/decision`, {
          action: 'approved_with_omissions',
          omissions: [{ field: 'body', start: body2.indexOf('रमेश'), end: body2.length, reason: 'accuses_someone_of_wrongdoing' }],
        })
      ).statusCode,
    ).toBe(200);
    expect((await send(t, w, fields({ body: 'तीसरा संस्करण।' }))).status).toBe(201);
    const v3 = (await versions(w))[2]!;

    expect((await detail(panel, w, v3)).withdrawApprovalTargetId).toBe(v2);
    // The older approval is not the target while a newer one stands (the route refuses it: the neutral 404).
    expect((await post(panel, `${base(w)}/${v1}/withdraw-approval`, { reasonCode: 'identifies_a_child' })).statusCode).toBe(404);
    expect((await post(panel, `${base(w)}/${v2}/withdraw-approval`, { reasonCode: 'identifies_a_child' })).statusCode).toBe(200);
    expect(await detail(panel, w, v3)).toMatchObject({ canWithdrawApproval: true, withdrawApprovalTargetId: v1 });
  });

  it('R9: no approval anywhere ⇒ null / false (pending, declined); a clean approval names itself', async () => {
    const { w, panel, v1 } = await sentWorld();
    expect(await detail(panel, w, v1)).toMatchObject({ canDecide: true, canWithdrawApproval: false, withdrawApprovalTargetId: null });
    expect((await post(panel, `${base(w)}/${v1}/decision`, { action: 'not_approved', reasonCode: 'attacks_someone_named' })).statusCode).toBe(200);
    expect(await detail(panel, w, v1)).toMatchObject({ canDecide: false, canWithdrawApproval: false, withdrawApprovalTargetId: null });

    const other = await sentWorld();
    expect((await post(other.panel, `${base(other.w)}/${other.v1}/decision`, { action: 'approved' })).statusCode).toBe(200);
    expect(await detail(other.panel, other.w, other.v1)).toMatchObject({
      memorialState: 'approved',
      canWithdrawApproval: true,
      withdrawApprovalTargetId: other.v1,
    });
  });

  // ── R14 / T7 — the queue pages; decided is newest DECISION first ────────────────────────────────────────────────────

  interface HeadState {
    /** An `approved` decision at this time (`'now'` = the column default, `clock_timestamp()`). */
    readonly decidedAt?: Date | 'now';
    /** A withdrawal: `family` (before review) or `trust` (of the approval above, MA16), at this time. */
    readonly withdrawn?: { readonly by: 'family' | 'trust'; readonly at: Date | 'now' };
  }

  /**
   * Add one more chain HEAD to the world's Pariwar: a sibling pool of the same claim (pool_index `n`), one version created
   * at `createdAt`, optionally decided and / or withdrawn at explicit times. Written with the service pool (BYPASSRLS) — the
   * list reads only the head's state and the deceased's name, so the ciphertext is a placeholder.
   */
  async function addChainHead(w: MemorialWorld, n: number, createdAt: Date, state: HeadState = {}): Promise<string> {
    const poolId = randomUUID();
    const submissionId = randomUUID();
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.pool_state_writer = 'on'");
      await c.query(
        `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier, support_category,
                            benefit_mechanism, fixed_amount, current_state, state_event_version, public_token)
         SELECT $1, pariwar_id, cycle_id, claim_case_id, $2, $3, support_category, benefit_mechanism, fixed_amount, current_state,
                state_event_version, $4
           FROM pools WHERE pool_id = $5`,
        [poolId, n, `P-R14-${poolId.slice(0, 8)}`, `r14-${poolId}`, w.poolId],
      );
      await c.query("SET LOCAL app.pool_state_writer = 'off'");
      await c.query(
        `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, supersedes_submission_id,
                                           body_ciphertext, authorisation_copy_version, authorisation_locale, handover_recipient,
                                           handover_nominee_ref, created_at)
         SELECT $1, pariwar_id, $2, claim_case_id, deceased_member_id, NULL, 'placeholder', authorisation_copy_version,
                authorisation_locale, handover_recipient, handover_nominee_ref, $3
           FROM memorial_submissions WHERE pariwar_id = $4 ORDER BY created_at LIMIT 1`,
        [submissionId, poolId, createdAt.toISOString(), w.pariwarId],
      );
      const at = (v: Date | 'now') => (v === 'now' ? null : v.toISOString());
      if (state.decidedAt !== undefined) {
        await c.query(
          `INSERT INTO memorial_review_decisions (submission_id, pariwar_id, action, actor_id, actor_display, decided_at)
           VALUES ($1, $2, 'approved', $3, 'Panel Member', COALESCE($4::timestamptz, clock_timestamp()))`,
          [submissionId, w.pariwarId, randomUUID(), at(state.decidedAt)],
        );
      }
      if (state.withdrawn !== undefined) {
        const trust = state.withdrawn.by === 'trust';
        await c.query(
          `INSERT INTO memorial_withdrawals (submission_id, pariwar_id, withdrawn_by, reason_code, actor_id, actor_display, withdrawn_at)
           VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, clock_timestamp()))`,
          [
            submissionId,
            w.pariwarId,
            state.withdrawn.by,
            trust ? 'identifies_a_child' : null,
            randomUUID(),
            trust ? 'Panel Member' : null,
            at(state.withdrawn.at),
          ],
        );
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
    return submissionId;
  }

  interface Page {
    items: Array<{ submissionId: string; memorialState: string; sentAt: string; decidedAt: string | null }>;
    hasMore: boolean;
  }
  const page = async (panel: Client, w: MemorialWorld, query: string): Promise<Page> => {
    const r = await panel.inject({ method: 'GET', url: `${base(w)}?${query}` });
    expect(r.statusCode, r.body).toBe(200);
    // Every page answers the contract exactly (strict; `decidedAt` an ISO date-time or `null` — review V12).
    const parsed = MemorialReviewListResponse.safeParse(r.json());
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
    return r.json<Page>();
  };

  it('R14 / T7: decided is NEWEST DECISION first (⛔ not sent order) and pages by offset with hasMore; pending stays OLDEST SENT first', async () => {
    const { w, panel, v1 } = await sentWorld();
    // The world's own chain: sent and decided NOW (not_approved) — the newest send of all, decided just now.
    expect((await post(panel, `${base(w)}/${v1}/decision`, { action: 'not_approved', reasonCode: 'against_the_law' })).statusCode).toBe(200);
    const base3h = Date.now() - 3 * 60 * 60 * 1000;
    const at = (minutes: number) => new Date(base3h + minutes * 60 * 1000);

    // Five decided heads whose DECISION order is the REVERSE of their SENT order: d[0] sent first (at(1)) and decided last
    // (at(49)) … d[4] sent last (at(5)) and decided first (at(45)). Sorting by sent date (the pre-T7 query) puts them
    // d[4] … d[0]; by decision date, d[0] … d[4].
    const d: string[] = [];
    for (let i = 0; i < 5; i += 1) d.push(await addChainHead(w, i + 1, at(1 + i), { decidedAt: at(49 - i) }));
    // A version sent EARLY (thirty days ago) but decided LATE (the column default, after v1's decision): it must come FIRST.
    const sentEarlyDecidedLate = await addChainHead(w, 6, new Date(base3h - 30 * 24 * 60 * 60 * 1000), { decidedAt: 'now' });
    // The Trust withdrew an OLD approval (decided at(10)) at at(48): ordered by the withdrawal, between d[0] and d[1].
    const trustWithdrawn = await addChainHead(w, 7, at(0), { decidedAt: at(10), withdrawn: { by: 'trust', at: at(48.5) } });
    // A family withdrawal before review (no decision) at at(44): after d[4].
    const familyWithdrawn = await addChainHead(w, 8, at(30), { withdrawn: { by: 'family', at: at(44) } });
    // Tie on the decision time ⇒ submission_id DESC.
    const tieA = await addChainHead(w, 9, at(2), { decidedAt: at(20) });
    const tieB = await addChainHead(w, 10, at(3), { decidedAt: at(20) });
    const ties = [tieA, tieB].sort().reverse();
    // Three pending heads, sent in this order.
    const pending: string[] = [];
    for (let i = 1; i <= 3; i += 1) pending.push(await addChainHead(w, 20 + i, at(20 + i)));

    const newestFirst = [sentEarlyDecidedLate, v1, d[0]!, trustWithdrawn, d[1]!, d[2]!, d[3]!, d[4]!, familyWithdrawn, ...ties]; // 11
    const ids = (p: Page) => p.items.map((i) => i.submissionId);

    // limit < rows: the first page, then the rest (the +1 row answers hasMore and is not returned).
    const p1 = await page(panel, w, 'view=decided&limit=4');
    expect(ids(p1)).toEqual(newestFirst.slice(0, 4));
    expect(p1.hasMore).toBe(true);
    const p2 = await page(panel, w, 'view=decided&limit=4&offset=4');
    expect(ids(p2)).toEqual(newestFirst.slice(4, 8));
    expect(p2.hasMore).toBe(true);
    const p3 = await page(panel, w, 'view=decided&limit=4&offset=8');
    expect(ids(p3)).toEqual(newestFirst.slice(8));
    expect(p3.hasMore).toBe(false);
    const all = [...p1.items, ...p2.items, ...p3.items];
    // The teeth against the pre-T7 query: the list is NOT in sent order (the version sent thirty days ago is on top).
    expect(all.map((i) => i.sentAt)).not.toEqual([...all.map((i) => i.sentAt)].sort().reverse());
    expect(all[0]!.sentAt < all[1]!.sentAt).toBe(true);
    expect(new Map(all.map((i) => [i.submissionId, i.memorialState]))).toEqual(
      new Map(newestFirst.map((id) => [id, id === v1 ? 'not_approved' : id === trustWithdrawn ? 'approval_withdrawn' : id === familyWithdrawn ? 'withdrawn' : 'approved'])),
    );

    // V12 — each decided item carries the time it is ORDERED by: the decision time, or the withdrawal time when that is
    // later (`GREATEST`) — explicit values where the fixture set them.
    const decidedAt = new Map(all.map((i) => [i.submissionId, i.decidedAt]));
    for (let i = 0; i < 5; i += 1) expect(decidedAt.get(d[i]!)).toBe(at(49 - i).toISOString());
    expect(decidedAt.get(trustWithdrawn)).toBe(at(48.5).toISOString()); // the withdrawal, ⛔ not the decision at(10)
    expect(decidedAt.get(familyWithdrawn)).toBe(at(44).toISOString()); // a withdrawal with no decision
    expect(decidedAt.get(tieA)).toBe(at(20).toISOString());
    expect(decidedAt.get(tieB)).toBe(at(20).toISOString());
    // The two decided "now" (v1 through the real route, the other by the column default): the DB clock's times — after
    // every explicit one (at(49) is ~2 h ago), and the later decision is the later time. (⛔ No bound against the JS clock:
    // the DB's may drift a little from it.)
    for (const id of [v1, sentEarlyDecidedLate]) {
      expect(decidedAt.get(id)).not.toBeNull();
      expect(decidedAt.get(id)! > at(49).toISOString()).toBe(true);
    }
    expect(decidedAt.get(sentEarlyDecidedLate)! >= decidedAt.get(v1)!).toBe(true);
    // The decided list IS sorted by the `decidedAt` it shows — newest first (ISO-8601 UTC strings sort as times).
    const shown = all.map((i) => i.decidedAt!);
    expect(shown).toEqual([...shown].sort().reverse());

    // The exact-fit edges: limit == rows ⇒ no more; limit == rows - 1 ⇒ more; past the end ⇒ empty, no more.
    expect(await page(panel, w, 'view=decided&limit=11')).toMatchObject({ hasMore: false });
    expect(ids(await page(panel, w, 'view=decided&limit=11'))).toEqual(newestFirst);
    expect((await page(panel, w, 'view=decided&limit=10')).hasMore).toBe(true);
    expect(await page(panel, w, 'view=decided&limit=4&offset=11')).toMatchObject({ items: [], hasMore: false });
    expect(await page(panel, w, 'view=decided&limit=1&offset=10')).toMatchObject({ items: [{ submissionId: ties[1] }], hasMore: false });
    // No limit and no offset: the defaults return the lot.
    expect(ids(await page(panel, w, 'view=decided'))).toEqual(newestFirst);

    // Pending: OLDEST SENT first (the longest wait on top), same paging — unchanged by T7.
    const q1 = await page(panel, w, 'limit=2');
    expect(ids(q1)).toEqual([pending[0], pending[1]]);
    expect(q1.hasMore).toBe(true);
    const q2 = await page(panel, w, 'view=pending&limit=2&offset=2');
    expect(ids(q2)).toEqual([pending[2]]);
    expect(q2.hasMore).toBe(false);
    expect(q1.items.every((i) => i.memorialState === 'with_the_trust')).toBe(true);
    // V12 — nothing is decided in the pending view: `decidedAt` is `null` on every item.
    expect([...q1.items, ...q2.items].map((i) => i.decidedAt)).toEqual([null, null, null]);
  });

  it('R14: offset is bounded (0 – 10000) and an unknown query key is refused', async () => {
    const { w, panel } = await sentWorld();
    for (const bad of ['offset=-1', 'offset=10001', 'offset=1.5', 'offset=abc', 'cursor=x']) {
      expect((await panel.inject({ method: 'GET', url: `${base(w)}?${bad}` })).statusCode, bad).toBe(400);
    }
    expect((await panel.inject({ method: 'GET', url: `${base(w)}?offset=10000` })).statusCode).toBe(200);
    expect(await page(panel, w, 'offset=0')).toMatchObject({ hasMore: false });
  });
});
