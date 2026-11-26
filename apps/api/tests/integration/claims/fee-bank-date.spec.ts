// Story 6.39a — the finance officer's BANK DATE over HTTP (Task 3.6; AC3, AC4, AC8, AC9; DL3, DL5, DL8, DL9, DL10, DL12).
//
// Real routes, real sessions, real Postgres (the story's own container), each test minting its own Pariwar. The membership
// check the finance officer acts on is seeded RAW here (this spec tests the record, ⛔ the check — AC5 drives the check).
//   · AC3 — the record (201, one live row, the event, the state unchanged), every refusal the handler raises with ⛔ row,
//     the step-up refusal, the supersession, a correction while the claim passes on an earlier bank date, the two list
//     sections and their caps; ONE test names PQ4 (one finance officer's record is enough);
//   · AC4 — ONE test names PQ2 (a reference one digit off ⇒ `reference_mismatch`; the typed value in ⛔ audit, log or body
//     — the log half on a CAPTURED stream with a positive control); the same reference in another case / with a space passes;
//   · AC8 — positive legs for a finance officer and a Super Admin on both routes; 403 for four other roles; another Pariwar;
//   · AC9 — the event and every audit line carry ⛔ date, ⛔ note, ⛔ reference (planted); a 400 / 403 / step-up writes ⛔ line.
// ⚠ Every 401 / 403 / step-up leg sends a VALID body (TR9 — Zod validation answers 400 first otherwise).

import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';

import { FEE_BANK_DATE_STEP_UP_CONTEXT } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';
import { DEATH, NOTE, errCode, feeBankDateWorld, j, type FeeBankDateWorld, type Json, type World } from './_fee-bank-date-world.js';

describe.skipIf(!hasDatabase)('Story 6.39a — the finance officer’s bank date — E2E', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  let W: FeeBankDateWorld;
  const createdUserIds: string[] = [];
  /** Every log line the server writes (AC4 / AC9's "no log line" half — test servers otherwise run `logger: false`). */
  const logChunks: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    const logStream = new Writable({
      write(chunk, _enc, cb) {
        logChunks.push(String(chunk));
        cb();
      },
    });
    app = await buildServer(deps, { logStream });
    await app.ready();
    W = feeBankDateWorld({ td, deps, app, fakeWebauthn, createdUserIds });
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  /** A finance officer, stepped up for the bank-date act. */
  async function fo(w: World, displayName?: string | null) {
    const a = await W.staff(w, ['finance_officer'], displayName);
    await W.stepUp(a, FEE_BANK_DATE_STEP_UP_CONTEXT);
    return a;
  }
  const post = async (a: { client: ReturnType<typeof makeClient> }, w: World, over: Json = {}) =>
    a.client.inject({ method: 'POST', url: W.postUrl(w), payload: await W.body(w, over) });
  const rejected = (w: World) => W.auditsFor('admin_claim.fee_bank_date_rejected', w.claimCaseId);
  const recordedAudits = (w: World) => W.auditsFor('admin_claim.fee_bank_date_recorded', w.claimCaseId);

  // ── AC3 — the record ──────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC3 / PQ4 — one finance officer’s record is accepted with ⛔ second confirmation: 201, ONE live record, the event, the state unchanged', async () => {
    const w = await W.world();
    await W.seedCheck(w, { feeOutcome: 'after_death' });
    const a = await fo(w, 'Meera (Finance Officer)');
    const res = await post(a, w);
    expect(res.statusCode, res.body).toBe(201);
    const recs = await W.records(w);
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      superseded_at: null,
      bank_credit_date: '2026-04-25',
      reason_code: 'recorded_by_family_after_death',
      fee_receipt_id: w.receiptId,
      decided_by_actor_id: a.userId,
      decided_by_display: 'Meera (Finance Officer)',
    });
    // The note is ciphertext at rest — ⛔ the plaintext.
    expect(recs[0]!.note_ciphertext).not.toContain('ZZ-BANK-NOTE');
    expect(j(res)).toEqual({ claim_case_id: w.claimCaseId, record_id: recs[0]!.record_id, superseded_record_id: null, event_version: expect.any(Number) });
    expect(await W.claimState(w)).toBe('verifier_review');
    const evs = await W.events(w, 'claim.fee_bank_date_recorded');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ from_state: 'verifier_review', to_state: 'verifier_review', record_id: recs[0]!.record_id, fee_receipt_id: w.receiptId, reason_code: 'recorded_by_family_after_death', superseded_record_id: null });
    // ⭐ PQ4 A — nothing else is asked for: ⛔ second finance officer, ⛔ pending state on the record.
    expect(recordedAudits(w)).toHaveLength(1);
    expect(recordedAudits(w)[0]!.context).toEqual({
      claim_case_id: w.claimCaseId,
      record_id: recs[0]!.record_id,
      fee_receipt_id: w.receiptId,
      reason_code: 'recorded_by_family_after_death',
      superseded_record_id: null,
    });
  });

  it('⭐ AC9 — the event and both audit lines carry ⛔ date, ⛔ note, ⛔ reference, ⛔ name (planted values in the serialized lines)', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w, 'ZZ-PLANTED-FO-NAME');
    expect((await post(a, w, { reason_code: 'other' })).statusCode).toBe(201);
    // A refusal too (a second record with a wrong reference).
    expect((await post(a, w, { statement_reference: '999999999999' })).statusCode).toBe(409);
    const lines = JSON.stringify([...(await W.events(w, 'claim.fee_bank_date_recorded')), ...recordedAudits(w), ...rejected(w)]);
    for (const planted of ['2026-04-25', w.utr, '999999999999', 'ZZ-BANK-NOTE', 'ZZ-PLANTED-FO-NAME', DEATH]) {
      expect(lines.includes(planted), planted).toBe(false);
    }
  });

  it('⭐ AC3 — a second record SUPERSEDES the first (`re_recorded`), ONE live after; the event names the superseded one', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w);
    expect((await post(a, w)).statusCode).toBe(201);
    const first = await W.liveRecordId(w);
    const res = await post(a, w, { bank_credit_date: '2026-04-20' });
    expect(res.statusCode, res.body).toBe(201);
    const recs = await W.records(w);
    expect(recs).toHaveLength(2);
    expect(recs.filter((r) => r.superseded_at === null)).toHaveLength(1);
    expect(recs.find((r) => r.record_id === first)).toMatchObject({ superseded_reason: 're_recorded' });
    expect(j(res).superseded_record_id).toBe(first);
    expect((await W.events(w, 'claim.fee_bank_date_recorded'))[1]).toMatchObject({ superseded_record_id: first });
  });

  it('⭐ AC3 / DL5 (b) — a CORRECTION is accepted while the claim PASSES on an earlier bank date (a live record holds it in the list)', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w);
    expect((await post(a, w)).statusCode).toBe(201);
    // The District Admin re-checked: the bank date was earlier ⇒ `before_death`, `bank`, the record named.
    await W.seedCheck(w, { feeOutcome: 'before_death', feeDateSource: 'bank', feeBankDateId: (await W.liveRecordId(w))! });
    const res = await post(a, w, { bank_credit_date: '2026-04-24' });
    expect(res.statusCode, res.body).toBe(201);
    expect((await W.records(w)).filter((r) => r.superseded_at === null)[0]).toMatchObject({ bank_credit_date: '2026-04-24' });
  });

  it('⭐ AC3 / DL5 — ⛔ live check (the District Admin has not RECORDED the check — the preview alone blocks) ⇒ `not_held`, ⛔ row, and the claim is ⛔ on the list', async () => {
    const w = await W.world();
    const a = await fo(w);
    const res = await post(a, w, { expected_live_check_id: null });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('fee_bank_date.not_held');
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w).map((e) => (e.context as Json).reason)).toEqual(['not_held']);
    const list = await a.client.inject({ method: 'GET', url: W.listUrl(w.pariwarId) });
    expect(list.statusCode, list.body).toBe(200);
    expect(j(list)).toEqual({ held: [], recorded: [], held_truncated: false, recorded_truncated: false });
  });

  it('AC3 — a live check whose fee half PASSES with ⛔ live record ⇒ `not_held`, ⛔ row', async () => {
    const w = await W.world({ fee: 'before_death' });
    await W.seedCheck(w, { feeOutcome: 'before_death' });
    const res = await post(await fo(w), w);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('fee_bank_date.not_held');
    expect(await W.records(w)).toEqual([]);
  });

  it('⭐ AC3 — a claim DENIED `fee_paid_after_death` (the District Admin\'s real decision route) ⇒ `window_closed`, ⛔ row', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const da = await W.staff(w, ['district_admin']);
    const deny = await da.client.inject({
      method: 'POST',
      url: `/api/v1/p/${w.pariwarId}/admin/claims/${w.claimCaseId}/verifier-decision`,
      payload: { outcome: 'denied', reason_code: 'fee_paid_after_death', rationale: 'The fee was paid after the death.' },
    });
    expect(deny.statusCode, deny.body).toBe(201);
    expect(await W.claimState(w)).toBe('denied');
    const res = await post(await fo(w), w);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('fee_bank_date.window_closed');
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w).map((e) => (e.context as Json).reason)).toEqual(['window_closed']);
  });

  it('AC3 — the bounds: a date after today ⇒ `in_future`; before the member joined ⇒ `before_joining`; each ⛔ row', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w);
    for (const [date, code] of [['2099-01-01', 'in_future'], ['2025-12-31', 'before_joining']] as const) {
      const res = await post(a, w, { bank_credit_date: date });
      expect(res.statusCode, `${date}: ${res.body}`).toBe(409);
      expect(errCode(j(res))).toBe(`fee_bank_date.${code}`);
    }
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w).map((e) => (e.context as Json).reason)).toEqual(['in_future', 'before_joining']);
  });

  it('AC3 — `stale`: either expected id ⛔ the live one ⇒ 409, ⛔ row', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w);
    const r1 = await post(a, w, { expected_live_check_id: randomUUID() });
    expect(errCode(j(r1))).toBe('fee_bank_date.stale');
    const r2 = await post(a, w, { expected_live_record_id: randomUUID() });
    expect(errCode(j(r2))).toBe('fee_bank_date.stale');
    expect(await W.records(w)).toEqual([]);
    // …and after a record, a body that says "none" is stale too (the record is live now).
    expect((await post(a, w)).statusCode).toBe(201);
    const r3 = await post(a, w, { expected_live_record_id: null });
    expect(r3.statusCode).toBe(409);
    expect(errCode(j(r3))).toBe('fee_bank_date.stale');
    expect(await W.records(w)).toHaveLength(1);
  });

  it('AC3 — a missing note or an unknown reason ⇒ 400 (Zod, before the handler), ⛔ row, ⛔ `_rejected` line (DL12)', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await fo(w);
    for (const over of [{ note: '   ' }, { reason_code: 'because' }, { bank_credit_date: '2026-02-30' }]) {
      const res = await post(a, w, over);
      expect(res.statusCode, `${JSON.stringify(over)}: ${res.body}`).toBe(400);
    }
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w)).toEqual([]);
  });

  it('⭐ AC3 / DL9 — ⛔ step-up ⇒ the step-up refusal (403, a VALID body), ⛔ row, ⛔ `_rejected` line', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const a = await W.staff(w, ['finance_officer']);
    const res = await post(a, w);
    expect(res.statusCode, res.body).toBe(403);
    expect(errCode(j(res))).toBe('auth.step_up_required');
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w)).toEqual([]);
    // A step-up for ANOTHER act does ⛔ satisfy this one.
    await W.stepUp(a, 'fraud_finding');
    expect(errCode(j(await post(a, w)))).toBe('auth.step_up_required');
  });

  it('AC3 — a finance officer with ⛔ display name ⇒ `missing_display`, ⛔ row', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const res = await post(await fo(w, null), w);
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('fee_bank_date.missing_display');
    expect(await W.records(w)).toEqual([]);
  });

  // ── AC4 — the match (N3, PQ2) ─────────────────────────────────────────────────────────────────────────────────

  it('⭐⭐ AC4 / PQ2 — a reference ONE DIGIT off ⇒ `reference_mismatch`, ⛔ row; the typed value is in ⛔ audit, ⛔ log line, ⛔ response body (with a positive log control)', async () => {
    const w = await W.world({ utr: '123456789012' });
    await W.seedCheck(w);
    const a = await fo(w);
    const planted = '123456789013';
    const before = logChunks.length;
    const res = await post(a, w, { statement_reference: planted });
    expect(res.statusCode, res.body).toBe(409);
    expect(errCode(j(res))).toBe('fee_bank_date.reference_mismatch');
    expect(res.body.includes(planted)).toBe(false);
    expect(await W.records(w)).toEqual([]);
    expect(rejected(w).map((e) => (e.context as Json).reason)).toEqual(['reference_mismatch']);
    expect(JSON.stringify(rejected(w)).includes(planted)).toBe(false);
    // ⭐ The POSITIVE control: a value this test causes to be logged (the request URL) IS in the captured stream — so the
    // stream is live and the negative assertion below can fail.
    const control = `ZZLOGCONTROL${randomUUID().slice(0, 8)}`;
    await a.client.inject({ method: 'GET', url: W.listUrl(w.pariwarId, `?zz=${control}`) });
    const logged = logChunks.slice(before).join('');
    expect(logged.includes(control), 'the captured log stream is live').toBe(true);
    expect(logged.includes(planted), 'the typed reference reached a log line').toBe(false);
    expect(logged.includes('ZZ-BANK-NOTE'), 'the note reached a log line').toBe(false);
  });

  it('⭐ AC4 / DL3 — the SAME reference: a 22-character one stored in lower case and typed in capitals, and one typed with a trailing space, are ACCEPTED', async () => {
    const lower = 'abcd1234efgh5678ijkl90';
    const w1 = await W.world({ utr: lower });
    await W.seedCheck(w1);
    const r1 = await post(await fo(w1), w1, { statement_reference: lower.toUpperCase() });
    expect(r1.statusCode, r1.body).toBe(201);
    const w2 = await W.world({ utr: '555566667777' });
    await W.seedCheck(w2);
    const r2 = await post(await fo(w2), w2, { statement_reference: '555566667777 ' });
    expect(r2.statusCode, r2.body).toBe(201);
    // ⛔ The stored reference is rewritten.
    const { rows } = await td.pool.query<{ utr: string }>(`SELECT utr FROM vyawastha_shulk_receipts WHERE receipt_id = $1`, [w1.receiptId]);
    expect(rows[0]!.utr).toBe(lower);
  });

  // ── AC3 / DL10 — the list ─────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC3 / DL10 — the list: TWO sections; longest-held first; ⛔ fee outcome, ⛔ date of death, ⛔ name on the wire', async () => {
    const pariwarId = randomUUID();
    const older = await W.world({ pariwarId });
    await W.seedCheck(older, { decidedAt: '2026-06-01T06:00:00Z' });
    const newer = await W.world({ pariwarId });
    await W.seedCheck(newer, { decidedAt: '2026-06-05T06:00:00Z' });
    const helped = await W.world({ pariwarId });
    await W.seedCheck(helped, { decidedAt: '2026-06-03T06:00:00Z' });
    const a = await fo(helped, 'Meera (Finance Officer)');
    expect((await post(a, helped)).statusCode).toBe(201);
    await W.seedCheck(helped, { feeOutcome: 'before_death', feeDateSource: 'bank', feeBankDateId: (await W.liveRecordId(helped))!, decidedAt: '2026-06-04T06:00:00Z' });
    // A claim whose check passes with ⛔ record — on ⛔ section.
    const passing = await W.world({ pariwarId, fee: 'before_death' });
    await W.seedCheck(passing, { feeOutcome: 'before_death' });

    const res = await a.client.inject({ method: 'GET', url: W.listUrl(pariwarId) });
    expect(res.statusCode, res.body).toBe(200);
    const body = j(res) as { held: Json[]; recorded: Json[]; held_truncated: boolean; recorded_truncated: boolean };
    expect(body.held.map((r) => r.claim_case_id)).toEqual([older.claimCaseId, newer.claimCaseId]);
    expect(body.recorded.map((r) => r.claim_case_id)).toEqual([helped.claimCaseId]);
    expect([body.held_truncated, body.recorded_truncated]).toEqual([false, false]);
    expect(body.held[0]).toEqual({
      claim_case_id: older.claimCaseId,
      latest_posting_district: older.district,
      recorded_fee_date: '2026-05-10',
      amount_inr: 110,
      reference_last4: older.utr.slice(-4),
      fee_date_source: 'recorded',
      expected_live_check_id: await W.liveCheckId(older),
      expected_live_record_id: null,
      live_record: null,
    });
    expect(body.recorded[0]).toMatchObject({
      fee_date_source: 'bank',
      expected_live_record_id: await W.liveRecordId(helped),
      live_record: { bank_credit_date: '2026-04-25', reason_code: 'recorded_by_family_after_death', recorded_by_display: 'Meera (Finance Officer)' },
    });
    const wire = res.body;
    expect(wire.includes('fee_outcome')).toBe(false);
    expect(wire.includes(DEATH)).toBe(false);
    expect(wire.includes(older.utr)).toBe(false); // the last four only
  });

  it('⭐ AC3 / DL10 — the caps are PER SECTION: N held + recorded ones seeded OLDER ⇒ every held claim listed, `held_truncated` false; past its own cap a section says so', async () => {
    const pariwarId = randomUUID();
    const a = { w: [] as World[] };
    // Two RECORDED claims, held OLDER than every held one.
    for (let i = 0; i < 2; i++) {
      const w = await W.world({ pariwarId });
      await W.seedCheck(w, { decidedAt: `2026-06-0${1 + i}T06:00:00Z` });
      const f = await fo(w);
      expect((await post(f, w)).statusCode).toBe(201);
      await W.seedCheck(w, { feeOutcome: 'before_death', feeDateSource: 'bank', feeBankDateId: (await W.liveRecordId(w))!, decidedAt: `2026-06-0${1 + i}T07:00:00Z` });
    }
    for (let i = 0; i < 2; i++) {
      const w = await W.world({ pariwarId });
      await W.seedCheck(w, { decidedAt: `2026-07-0${1 + i}T06:00:00Z` });
      a.w.push(w);
    }
    const viewer = await W.staff(a.w[0]!, ['finance_officer']);
    const capped = await viewer.client.inject({ method: 'GET', url: W.listUrl(pariwarId, '?limit=2') });
    const b = j(capped) as { held: Json[]; recorded: Json[]; held_truncated: boolean; recorded_truncated: boolean };
    expect(b.held.map((r) => r.claim_case_id)).toEqual(a.w.map((w) => w.claimCaseId));
    expect(b.held_truncated).toBe(false);
    expect(b.recorded).toHaveLength(2);
    expect(b.recorded_truncated).toBe(false);
    const cut = j(await viewer.client.inject({ method: 'GET', url: W.listUrl(pariwarId, '?limit=1') })) as typeof b;
    expect(cut.held.map((r) => r.claim_case_id)).toEqual([a.w[0]!.claimCaseId]);
    expect([cut.held_truncated, cut.recorded_truncated]).toEqual([true, true]);
  });

  // ── AC8 — who ─────────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC8 — a Super Admin is accepted on BOTH routes', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const sa = await W.staff(w, ['super_admin']);
    expect((await sa.client.inject({ method: 'GET', url: W.listUrl(w.pariwarId) })).statusCode).toBe(200);
    await W.stepUp(sa, FEE_BANK_DATE_STEP_UP_CONTEXT);
    const res = await post(sa, w);
    expect(res.statusCode, res.body).toBe(201);
  });

  it('⭐ AC8 — 403 for district_admin, pariwar_admin, verifier and helpline_operator on BOTH routes (a VALID body, stepped up); ⛔ row', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    for (const role of ['district_admin', 'pariwar_admin', 'verifier', 'helpline_operator'] as const) {
      const a = await W.staff(w, [role]);
      const list = await a.client.inject({ method: 'GET', url: W.listUrl(w.pariwarId) });
      expect(list.statusCode, `${role} list`).toBe(403);
      const res = await post(a, w);
      expect(res.statusCode, `${role} post: ${res.body}`).toBe(403);
      expect(errCode(j(res)), role).not.toBe('auth.step_up_required'); // the permission hook answers first
    }
    expect(await W.records(w)).toEqual([]);
  });

  it('AC8 — a finance officer of ANOTHER Pariwar is refused on both routes', async () => {
    const w = await W.world();
    await W.seedCheck(w);
    const other = await W.world();
    const a = await W.staff(other, ['finance_officer']);
    // Scoped to its own Pariwar, it asks for this one.
    expect((await a.client.inject({ method: 'GET', url: W.listUrl(w.pariwarId) })).statusCode).toBeGreaterThanOrEqual(400);
    await W.stepUp(a, FEE_BANK_DATE_STEP_UP_CONTEXT);
    const res = await post(a, w);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).not.toBe(201);
    expect(await W.records(w)).toEqual([]);
  });
});
