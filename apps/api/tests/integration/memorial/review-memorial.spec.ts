// Story 11b.4 — the Trust's review, end to end (AC9 / AC6 / AC10; MA6 / MA7 / MA13 / MA16; Trap 8), and the family-side
// effects of a decision. Live DB (`:5434`), explicit values, one Pariwar per world.

import { randomUUID } from 'node:crypto';

import { validateMemorialDecision, type MemorialDecisionProblem } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  errorWithoutRequestId,
  handover,
  jpegWithGps,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
  type ReviewHarness,
  type StaffClient,
} from './_fixture.js';

type Client = StaffClient;

describe.skipIf(!hasDatabase)('memorial — the Trust\'s review (live DB)', () => {
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

  async function sentWorld(body = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं।', photo = false) {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const parts = photo
      ? [...sendFields({ body, altText: 'माँ' }), { kind: 'file' as const, name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }]
      : sendFields({ body });
    expect((await send(t, w, parts)).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    return { w, id: subs.at(-1)!.submission_id, body };
  }

  const base = (w: MemorialWorld) => `/api/v1/p/${w.pariwarId}/memorial-reviews`;
  const post = (c: Client, url: string, payload: object) => c.inject({ method: 'POST', url, payload });
  const memberView = async (w: MemorialWorld) =>
    (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Record<string, unknown>;

  it('AC9: the queue lists a version with the Trust — the name and the date, ⛔ body; one read line per page', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const before = t.auditSink.events.length;
    const r = await panel.inject({ method: 'GET', url: base(w) });
    expect(r.statusCode).toBe(200);
    const items = r.json<{ items: Array<Record<string, unknown>> }>().items;
    // `decidedAt` is `null` in the pending view (review V12 — nothing is decided yet).
    expect(items).toEqual([{ submissionId: id, deceasedName: 'Shanti Devi', sentAt: expect.any(String), decidedAt: null, memorialState: 'with_the_trust' }]);
    expect(r.body).not.toContain(body.slice(0, 5));
    expect(t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.review.read')).toHaveLength(1);
    // ?view=decided is empty until a decision.
    expect((await panel.inject({ method: 'GET', url: `${base(w)}?view=decided` })).json<{ items: unknown[] }>().items).toEqual([]);
  });

  it('MA7: ⛔ memorial.review → 403; a Pariwar with ⛔ grant → the scope middleware\'s 404 first', async () => {
    const { w } = await sentWorld();
    const admin = await staff(w.pariwarId, 'pariwar_admin');
    expect((await admin.inject({ method: 'GET', url: base(w) })).statusCode).toBe(403);
    const other = await seedMemorialWorld(t);
    const panelElsewhere = await staff(other.pariwarId, 'trustee_panel');
    const r = await panelElsewhere.inject({ method: 'GET', url: base(w) });
    expect(r.statusCode).toBe(404);
  });

  it('AC9 / AC6: approve with a part left out — the verbatim body is ⛔ rewritten; the family sees the span and its reason', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const start = body.indexOf('रमेश');
    const end = body.indexOf('\n');
    const r = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'body', start, end, reason: 'accuses_someone_of_wrongdoing' }],
      internalNote: 'नाम लेकर आरोप',
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ submissionId: id, memorialState: 'approved_with_omissions' });
    const [d] = await rows<{ action: string; omissions: unknown; actor_display: string }>(t, `SELECT action, omissions, actor_display FROM memorial_review_decisions WHERE submission_id = $1`, [id]);
    expect(d).toMatchObject({ action: 'approved_with_omissions', actor_display: 'Panel Member' });
    const v = await memberView(w);
    expect(v).toMatchObject({
      memorialState: 'approved_with_omissions',
      body,
      omissions: [{ field: 'body', start, end, reason: 'accuses_someone_of_wrongdoing' }],
      canSend: true,
    });
    // AC10 — the internal note ⛔ never reaches the family's wire.
    expect(JSON.stringify(v)).not.toContain('नाम लेकर आरोप');
    // The history view reads the note back (⛔ write-only field).
    const detail = (await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })).json<{ chain: Array<{ decision: { internalNote: string } }> }>();
    expect(detail.chain[0]!.decision.internalNote).toBe('नाम लेकर आरोप');
    // The write line.
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.review.%'`, [w.pariwarId]);
    expect(audit.map((a) => a.action)).toEqual(['memorial.review.decide']);
  });

  it.each(['body', 'text', 'narrative'])('AC6: a decision posting `%s` → 400 (the strict schema)', async (field) => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved', [field]: 'new words' });
    expect(r.statusCode).toBe(400);
  });

  it('MA6: invalid spans → 400 memorial_review.invalid_omissions (only for a visible version)', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'body', start: 0, end: body.length, reason: 'against_the_law' }],
    });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions' } });
    const photoless = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } });
    expect(photoless.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions' } });
  });

  // Review T10 (e): the admin's refusal sentence (R19) reads `error.details.problem`, so the refusal must carry the
  // VALIDATOR's own problem code — pinned literally per case, and cross-checked against `validateMemorialDecision` on the
  // same input so the API and the validator cannot drift apart.
  it('MA6 / R19: each invalid_omissions refusal carries details.problem = the validator\'s problem code', async () => {
    const { w, id, body } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const second = body.indexOf('हम');
    const cases: Array<[MemorialDecisionProblem, Record<string, unknown>]> = [
      ['span_crosses_paragraph', { action: 'approved_with_omissions', omissions: [{ field: 'body', start: 0, end: body.length, reason: 'against_the_law' }] }],
      ['photo_left_out_without_photo', { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } }],
      ['span_out_of_range', { action: 'approved_with_omissions', omissions: [{ field: 'body', start: 0, end: body.length + 3, reason: 'against_the_law' }] }],
      ['span_empty', { action: 'approved_with_omissions', omissions: [{ field: 'body', start: 4, end: 4, reason: 'against_the_law' }] }],
      [
        'span_order',
        {
          action: 'approved_with_omissions',
          omissions: [
            { field: 'body', start: second, end: second + 2, reason: 'against_the_law' },
            { field: 'body', start: 0, end: 3, reason: 'against_the_law' },
          ],
        },
      ],
      ['alt_text_span_without_alt_text', { action: 'approved_with_omissions', omissions: [{ field: 'altText', start: 0, end: 1, reason: 'identifies_a_child' }] }],
    ];
    for (const [problem, payload] of cases) {
      const r = await post(panel, `${base(w)}/${id}/decision`, payload);
      expect(r.statusCode, problem).toBe(400);
      expect(r.json(), problem).toMatchObject({ error: { code: 'memorial_review.invalid_omissions', details: { problem } } });
      expect(validateMemorialDecision(payload as unknown as Parameters<typeof validateMemorialDecision>[0], { body, altText: null, hasPhoto: false, kinshipLength: null }), problem).toEqual({
        ok: false,
        problem,
      });
    }
    // Nothing was decided by any of them.
    expect(await rows(t, `SELECT 1 FROM memorial_review_decisions WHERE submission_id = $1`, [id])).toEqual([]);
  });

  it('MA6: leave out the photo (and its alt text) on a version with one', async () => {
    const { w, id } = await sentWorld('शब्द।', true);
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const r = await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } });
    expect(r.statusCode).toBe(200);
    expect(await memberView(w)).toMatchObject({ photoLeftOut: { reason: 'identifies_a_child' } });
    // The reviewer's detail carries a signed URL for the photo (each a memorial.photo.url line).
    const before = t.auditSink.events.length;
    const d = (await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })).json<{ chain: Array<{ photoUrl: string | null }> }>();
    expect(typeof d.chain[0]!.photoUrl).toBe('string');
    expect(t.auditSink.events.slice(before).map((e) => e.type)).toContain('memorial.photo.url');
  });

  it('⭐ Trap 8: decision refusals — superseded, withdrawn, already decided, another Pariwar\'s id — ONE byte-identical 404 body', async () => {
    const panelWorld = await sentWorld();
    const panel = await staff(panelWorld.w.pariwarId, 'trustee_panel');
    const { w } = panelWorld;
    // superseded: a second Send.
    expect((await send(t, w, sendFields({ body: 'दूसरा' }))).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    const superseded = subs[0]!.submission_id;
    const head = subs[1]!.submission_id;
    // decided: decide the head; then try again.
    expect((await post(panel, `${base(w)}/${head}/decision`, { action: 'not_approved', reasonCode: 'against_the_law' })).statusCode).toBe(200);
    // withdrawn: a family-withdrawn head in a second world of the SAME Pariwar is not reachable (one Pariwar per world) — use a
    // withdrawn version in its own world, decided by its own panel below.
    const other = await sentWorld();
    const strangerId = other.id;
    const bodies: string[] = [];
    for (const target of [superseded, head, strangerId, randomUUID()]) {
      const r = await post(panel, `${base(w)}/${target}/decision`, { action: 'approved' });
      expect(r.statusCode).toBe(404);
      expect(r.json<{ error: { code: string } }>().error.code).toBe('memorial_review.not_found');
      bodies.push(neutralBody(r)); // the WHOLE body (minus the request id), not just { code, message }
    }
    expect(new Set(bodies).size).toBe(1);
    // A family-withdrawn version is refused the same way.
    const wd = await sentWorld();
    const wdPanel = await staff(wd.w.pariwarId, 'trustee_panel');
    await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${wd.id}/withdraw`, { payload: {}, token: wd.w.token });
    const r = await post(wdPanel, `${base(wd.w)}/${wd.id}/decision`, { action: 'approved' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ error: { code: 'memorial_review.not_found', message: 'Not found' } });
    // The history view still READS a superseded and a decided version.
    expect((await panel.inject({ method: 'GET', url: `${base(w)}/${superseded}` })).statusCode).toBe(200);
  });

  it('MA13: a Send after a clean approval → 409 memorial.already_reviewed; canSend false', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    expect((await post(panel, `${base(w)}/${id}/decision`, { action: 'approved' })).statusCode).toBe(200);
    expect(await memberView(w)).toMatchObject({ memorialState: 'approved', canSend: false, canWithdraw: false });
    const r = await send(t, w, sendFields({ body: 'नया' }));
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: { code: 'memorial.already_reviewed' } });
    // The family's withdraw of a decided version → 409.
    const wr = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${id}/withdraw`, { payload: {}, token: w.token });
    expect(wr.status).toBe(409);
  });

  it('MA16: the Trust withdraws its approval → approval_withdrawn with the reason; the family may send again', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'approved' });
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, {})).statusCode).toBe(400); // a missing reason
    const r = await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'identifies_a_child' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ submissionId: id, memorialState: 'approval_withdrawn' });
    expect(await memberView(w)).toMatchObject({ memorialState: 'approval_withdrawn', reasonCode: 'identifies_a_child', canSend: true });
    // Already withdrawn → the neutral 404.
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'identifies_a_child' })).statusCode).toBe(404);
    // A new version: the earlier withdrawal is told beside it.
    expect((await send(t, w, sendFields({ body: 'बिना नाम के' }))).status).toBe(201);
    expect(await memberView(w)).toMatchObject({ memorialState: 'with_the_trust', earlierApprovalWithdrawn: { reasonCode: 'identifies_a_child' } });
  });

  it('MA16: a SUPERSEDED approved version may be withdrawn; a non-approved one → 404', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'approved_with_omissions', photoLeftOut: undefined, omissions: [{ field: 'body', start: 0, end: 3, reason: 'against_the_law' }] });
    expect((await send(t, w, sendFields({ body: 'नया संस्करण' }))).status).toBe(201);
    const subs = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    const newest = subs[1]!.submission_id;
    expect((await post(panel, `${base(w)}/${newest}/withdraw-approval`, { reasonCode: 'against_the_law' })).statusCode).toBe(404);
    expect((await post(panel, `${base(w)}/${id}/withdraw-approval`, { reasonCode: 'against_the_law' })).statusCode).toBe(200);
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'memorial.review.withdraw_approval'`, [w.pariwarId]);
    expect(audit).toHaveLength(1);
  });

  it('AC9: ?view=decided lists the latest of each decided chain', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    await post(panel, `${base(w)}/${id}/decision`, { action: 'not_approved', reasonCode: 'attacks_someone_named' });
    const items = (await panel.inject({ method: 'GET', url: `${base(w)}?view=decided` })).json<{ items: Array<{ submissionId: string; memorialState: string }> }>().items;
    expect(items).toEqual([expect.objectContaining({ submissionId: id, memorialState: 'not_approved' })]);
    expect(await memberView(w)).toMatchObject({ memorialState: 'not_approved', reasonCode: 'attacks_someone_named', canSend: true });
  });

  it('AC9: a SUPERSEDED version is excluded from the pending queue — a chain of two versions lists only the head', async () => {
    const { w, id } = await sentWorld();
    const panel = await staff(w.pariwarId, 'trustee_panel');
    expect((await send(t, w, sendFields({ body: 'दूसरा संस्करण' }))).status).toBe(201);
    const head = (await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at DESC LIMIT 1`, [w.pariwarId]))[0]!.submission_id;
    expect(head).not.toBe(id);
    const pending = (await panel.inject({ method: 'GET', url: base(w) })).json<{ items: Array<{ submissionId: string }> }>().items;
    expect(pending.map((i) => i.submissionId)).toEqual([head]);
    // The superseded one is not "decided" either (it carries no decision and no withdrawal) — and is still reachable through its chain.
    expect((await panel.inject({ method: 'GET', url: `${base(w)}?view=decided` })).json<{ items: unknown[] }>().items).toEqual([]);
    const detail = (await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })).json<{ chain: Array<{ submissionId: string }> }>();
    expect(detail.chain.map((v) => v.submissionId)).toEqual([id, head]);
  });

  // ── Trap 8 — the oracle sets, PER ROUTE (Task 5.4) ───────────────────────────────────────────────────────────────────

  /** The ENTIRE response body of a refusal, minus the per-request id — what a prober can see. */
  const neutralBody = (res: { statusCode: number; json: <T>() => T }): string => {
    return JSON.stringify({ status: res.statusCode, error: errorWithoutRequestId(res.json<{ error?: unknown }>().error) });
  };

  it('⭐ Trap 8: detail, decision and withdraw-approval — an unknown id, an out-of-scope id and every other refusal answer ONE byte-identical 404 body', async () => {
    const { w, id: v1 } = await sentWorld();
    const stranger = await sentWorld(); // another Pariwar's version
    const panel = await staff(w.pariwarId, 'trustee_panel');
    const bodies: Array<[string, string]> = [];
    const refuse = async (label: string, leaf: 'decision' | 'withdraw-approval' | 'detail', id: string) => {
      const res =
        leaf === 'detail'
          ? await panel.inject({ method: 'GET', url: `${base(w)}/${id}` })
          : await post(panel, `${base(w)}/${id}/${leaf}`, leaf === 'decision' ? { action: 'approved' } : { reasonCode: 'against_the_law' });
      expect(res.statusCode, `${leaf} ${label}`).toBe(404);
      expect(res.json<{ error: { code: string } }>().error.code, `${leaf} ${label}`).toBe('memorial_review.not_found');
      bodies.push([`${leaf} ${label}`, neutralBody(res)]);
    };

    // unknown / out-of-scope — on all three routes.
    for (const leaf of ['detail', 'decision', 'withdraw-approval'] as const) {
      await refuse('unknown id', leaf, randomUUID());
      await refuse('another Pariwar\'s id', leaf, stranger.id);
    }
    // withdraw-approval on a version that is NOT the chain's latest approved (it is still pending).
    await refuse('not approved (pending)', 'withdraw-approval', v1);
    // decided: approve v1, then a second decision is refused; withdraw its approval, then a second withdrawal is refused.
    expect((await post(panel, `${base(w)}/${v1}/decision`, { action: 'approved' })).statusCode).toBe(200);
    await refuse('already decided', 'decision', v1);
    expect((await post(panel, `${base(w)}/${v1}/withdraw-approval`, { reasonCode: 'identifies_a_child' })).statusCode).toBe(200);
    await refuse('already withdrawn', 'decision', v1);
    await refuse('already withdrawn', 'withdraw-approval', v1);
    // superseded: a new version; the old one can no longer be decided.
    expect((await send(t, w, sendFields({ body: 'नया संस्करण' }))).status).toBe(201);
    await refuse('superseded', 'decision', v1);

    // ONE body for every refusal on every route — not "one code": the whole thing a prober can read.
    const distinct = new Set(bodies.map(([, body]) => body));
    expect([...distinct], JSON.stringify(bodies, null, 1)).toHaveLength(1);
    expect(JSON.parse([...distinct][0]!)).toEqual({ status: 404, error: { code: 'memorial_review.not_found', message: 'Not found' } });
  });

  // ── MA6 — a span in the ALT TEXT (Task 5.4) ──────────────────────────────────────────────────────────────────────────

  it('MA6: a span in the ALT TEXT — validated against the alt text (not the body), stored, and told to the family; the photo stays', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const altText = 'A photo of Maa at the village home';
    const body = 'माँ बहुत अच्छी थीं और हमें बहुत याद आती हैं। उनकी हर बात हमारे साथ है।';
    expect(
      (await send(t, w, [...sendFields({ body, altText }), { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }])).status,
    ).toBe(201);
    const id = (await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]))[0]!.submission_id;
    const panel = await staff(w.pariwarId, 'trustee_panel');
    expect(body.length).toBeGreaterThan(altText.length);
    // The offsets are checked against the field they name: an alt-text span that would fit the (longer) BODY is refused.
    const beyond = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'altText', start: 0, end: altText.length + 5, reason: 'identifies_a_child' }],
    });
    expect(beyond.statusCode).toBe(400);
    expect(beyond.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions' } });
    expect(await rows(t, `SELECT 1 FROM memorial_review_decisions WHERE submission_id = $1`, [id])).toEqual([]);
    // A valid alt-text span (leaving the rest of the description and the photo in place).
    const start = altText.indexOf('at the village home');
    const ok = await post(panel, `${base(w)}/${id}/decision`, {
      action: 'approved_with_omissions',
      omissions: [{ field: 'altText', start, end: altText.length, reason: 'identifies_a_child' }],
    });
    expect(ok.statusCode, ok.body).toBe(200);
    const [stored] = await rows<{ omissions: unknown; photo_left_out_reason: string | null }>(t, `SELECT omissions, photo_left_out_reason FROM memorial_review_decisions WHERE submission_id = $1`, [id]);
    expect(stored).toEqual({ omissions: [{ field: 'altText', start, end: altText.length, reason: 'identifies_a_child' }], photo_left_out_reason: null });
    // The family is told, in its own words' coordinates; the photo is still there and the description it was sent with is verbatim.
    expect(await memberView(w)).toMatchObject({
      memorialState: 'approved_with_omissions',
      altText,
      hasPhoto: true,
      photoLeftOut: null,
      omissions: [{ field: 'altText', start, end: altText.length, reason: 'identifies_a_child' }],
    });
  });
});
