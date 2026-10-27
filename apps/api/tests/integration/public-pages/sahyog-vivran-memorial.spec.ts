// Story 11b.4a — the family memorial on the PUBLIC Sahyog Vivran page, through the real HTTP stack (Task 5.4; AC1, AC2, AC3,
// AC5, AC13; Traps 3, 4, 9; `2026-10-23-391` item 2, `2026-10-27-411` items 2, 3, 6, `-393` M1).
// Every memorial here goes in through the REAL Send (handover code + multipart) and the REAL review (`trustee_panel`), and the
// take-down through the REAL domain writer — ⛔ never seeded around them.
// Live DB only — skips when DATABASE_URL is unset. Fresh Pariwar per world (⛔ never PARIWAR_A).

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import type { MemorialOmission } from '@twt/contracts';
import { encryption, ids, member as memberDomain, memorial } from '@twt/domain';
import { reconstructMemorial } from '@twt/ui';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { joinKeptSegments, memorialCutTexts } from '../../../src/modules/public-pages/memorial-public-text.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
  jpegWithGps,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
  type ReviewHarness,
} from '../memorial/_fixture.js';

const NOW = new Date();
const PAGE = (w: MemorialWorld, token: string) => `/api/v1/p/${w.pariwarId}/public-pages/sahyog-vivran/${encodeURIComponent(token)}`;
const PHOTO = (w: MemorialWorld, token: string) => `${PAGE(w, token)}/memorial-photo`;

/** Trap 9 — the headers that may differ between two otherwise identical responses. */
const VOLATILE = /^(date|x-request-id|x-ratelimit-.*|connection|keep-alive)$/i;
const stableHeaders = (h: Record<string, unknown>) => Object.fromEntries(Object.entries(h).filter(([k]) => !VOLATILE.test(k)).sort());

interface Answer {
  readonly statusCode: number;
  readonly rawPayload: Buffer;
  readonly headers: Record<string, unknown>;
}

/** Trap 9 — a refusal IS an unknown token's answer: status, BODY BYTES (empty, and equal) and headers minus the volatile ones. */
function expectUnknownTokenAnswer(r: Answer, unknown: Answer): void {
  expect(unknown.statusCode).toBe(404);
  expect(unknown.rawPayload.length).toBe(0);
  expect(r.statusCode).toBe(404);
  expect(r.rawPayload.equals(unknown.rawPayload)).toBe(true);
  expect(stableHeaders(r.headers)).toEqual(stableHeaders(unknown.headers));
}

/** A `logStream` that keeps every line pino writes, parsed — for the "exactly one `error` log" leg. */
function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      for (const line of chunk.toString('utf-8').split('\n')) if (line.trim() !== '') lines.push(JSON.parse(line) as Record<string, unknown>);
      done();
    },
  });
  return { stream, errors: () => lines.filter((l) => typeof l['level'] === 'number' && l['level'] >= 50) };
}

const BODY = 'माँ हमेशा मुस्कुराती थीं। रमेश ने उन्हें धोखा दिया। वे सबकी मदद करती थीं।\n\nहम उन्हें रोज़ याद करते हैं।';
const LEFT_OUT = 'रमेश ने उन्हें धोखा दिया।';
const ALT = 'माँ बगीचे में, पड़ोसी सुरेश के साथ';
const ALT_LEFT_OUT = 'पड़ोसी सुरेश के साथ';

describe.skipIf(!hasDatabase)('Story 11b.4a — the family memorial on the public page (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;

  beforeAll(async () => {
    h = await createReviewHarness({ clock: () => NOW });
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  async function tokenOf(w: MemorialWorld): Promise<string> {
    const [r] = await rows<{ public_token: string }>(t, `SELECT public_token FROM pools WHERE pool_id = $1`, [w.poolId]);
    return r!.public_token;
  }

  /** Send a version with a photo (through the real ingest), as the nominee. Returns its id. */
  async function sendVersion(w: MemorialWorld, body = BODY, withPhoto = true): Promise<string> {
    const parts = withPhoto
      ? [...sendFields({ body, altText: ALT }), { kind: 'file' as const, name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }]
      : sendFields({ body });
    const r = await send(t, w, parts);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    return r.body.submissionId as string;
  }

  const span = (text: string, needle: string, field: 'body' | 'altText') => {
    const start = text.indexOf(needle);
    expect(start).toBeGreaterThanOrEqual(0);
    return { field, start, end: start + needle.length, reason: 'attacks_someone_named' as const };
  };

  async function decide(w: MemorialWorld, id: string, payload: object): Promise<void> {
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const r = await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload });
    expect(r.statusCode, r.body).toBe(200);
  }

  const approveWithOmissions = (w: MemorialWorld, id: string) =>
    decide(w, id, { action: 'approved_with_omissions', omissions: [span(BODY, LEFT_OUT, 'body'), span(ALT, ALT_LEFT_OUT, 'altText')] });

  /** The helpline's take-down, through the real domain writers: `shownSubmissionId` is the version the operator was looking at (R1). */
  async function takeDown(w: MemorialWorld, shownSubmissionId: string): Promise<void> {
    const operator = randomUUID();
    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    let ok = false;
    try {
      const pariwarId = ids.pariwarId(w.pariwarId);
      const req = await memorial.recordMemorialTakedownRequest(scopeTx.tx, {
        pariwarId,
        poolId: ids.poolId(w.poolId),
        shownSubmissionId,
        firstContactAt: new Date(Date.now() - 3600_000),
        actorId: ids.userId(operator),
        actorDisplay: 'Helpline Operator',
      });
      if (!req.ok) throw new Error(`record: ${req.refusal}`);
      const out = await memorial.decideMemorialTakedown(scopeTx.tx, {
        pariwarId,
        requestId: req.request.requestId,
        outcome: 'taken_down',
        actorId: ids.userId(operator),
        actorDisplay: 'Helpline Operator',
      });
      if (!out.ok) throw new Error(`decide: ${out.refusal}`);
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  const page = async (w: MemorialWorld, token: string) => t.app.inject({ method: 'GET', url: PAGE(w, token) });
  const memorialOf = (res: { json: () => unknown }) => (res.json() as { drive: { familyMemorial: unknown } }).drive.familyMemorial;

  it('⭐⭐ AC5 / AC1 / AC3 / Trap 3 — render, write, approve (with parts left out), take down, render again: the two outer renders are BYTE-IDENTICAL, and the middle one carries the joined words', async () => {
    const w = await seedMemorialWorld(t);
    const token = await tokenOf(w);

    const before = await page(w, token);
    expect(before.statusCode).toBe(200);
    expect(memorialOf(before)).toBeNull();
    const photoBefore = await t.app.inject({ method: 'GET', url: PHOTO(w, token) });
    expect(photoBefore.statusCode).toBe(404);

    await handover(t, w);
    const id = await sendVersion(w);
    // Sent, ⛔ not yet approved ⇒ still nothing public.
    expect(memorialOf(await page(w, token))).toBeNull();
    await approveWithOmissions(w, id);

    // ⭐ THE MIDDLE RENDER — non-vacuity: the section is THERE (else two empty renders diff equal and prove nothing).
    const middle = await page(w, token);
    expect(middle.statusCode).toBe(200);
    const fm = memorialOf(middle) as { words: string[]; photo: { altText: string } | null };
    expect(fm).not.toBeNull();
    expect(fm.words.join('\n')).toContain('माँ हमेशा मुस्कुराती थीं।');
    expect(fm.words.join('\n')).toContain('वे सबकी मदद करती थीं।');
    expect(fm.words).toEqual(['माँ हमेशा मुस्कुराती थीं। वे सबकी मदद करती थीं।', 'हम उन्हें रोज़ याद करते हैं।']);
    expect(fm.photo).toEqual({ altText: 'माँ बगीचे में,' });
    // ⭐ AC3 — the page's strings ARE the presenter's `asApproved`, joined (the same input).
    const omissions: MemorialOmission[] = [span(BODY, LEFT_OUT, 'body'), span(ALT, ALT_LEFT_OUT, 'altText')];
    const rec = reconstructMemorial({ body: BODY, altText: ALT }, { omissions, photoLeftOut: false });
    expect(fm.words).toEqual(joinKeptSegments(rec.asApproved, memorialCutTexts(BODY, omissions.filter((o) => o.field === 'body'))));
    // ⭐ Trap 3 — ⛔ no left-out text, ⛔ no reason, ⛔ no marker key ANYWHERE in the raw bytes (the kept text was asserted first).
    for (const forbidden of [LEFT_OUT, 'धोखा', ALT_LEFT_OUT, 'सुरेश', 'attacks_someone_named', 'render.omitted', '"omitted"', '"reason"', '"segments"', 'objectKey', id]) {
      expect(middle.body, forbidden).not.toContain(forbidden);
    }
    const photoMiddle = await t.app.inject({ method: 'GET', url: PHOTO(w, token) });
    expect(photoMiddle.statusCode).toBe(200);
    expect(photoMiddle.headers['content-type']).toBe('image/jpeg');

    await takeDown(w, id);

    // ⭐ AC5 — ⛔ no trace: status, body bytes and headers (Trap 9's exclusions) equal the render BEFORE anything was written.
    const after = await page(w, token);
    expect(after.statusCode).toBe(before.statusCode);
    expect(after.body).toBe(before.body);
    expect(stableHeaders(after.headers)).toEqual(stableHeaders(before.headers));
    const photoAfter = await t.app.inject({ method: 'GET', url: PHOTO(w, token) });
    expect(photoAfter.statusCode).toBe(404);
    expect(photoAfter.body).toBe(photoBefore.body);
    expect(stableHeaders(photoAfter.headers)).toEqual(stableHeaders(photoBefore.headers));
  });

  it('AC1 — `[A-omit, pending]`: the head is with the Trust, yet v1 is still the page\'s (⛔ never keyed on the head)', async () => {
    const w = await seedMemorialWorld(t);
    const token = await tokenOf(w);
    await handover(t, w);
    const v1 = await sendVersion(w);
    await approveWithOmissions(w, v1);
    await handover(t, w);
    await sendVersion(w, 'एक नया संस्करण।', false);
    const fm = memorialOf(await page(w, token)) as { words: string[] };
    expect(fm.words[0]).toBe('माँ हमेशा मुस्कुराती थीं। वे सबकी मदद करती थीं।');
  });

  it('AC1 / MP13 — the switch OFF ⇒ `familyMemorial: null` on an approved memorial (and the photo 404s)', async () => {
    const w = await seedMemorialWorld(t);
    const token = await tokenOf(w);
    await handover(t, w);
    await decide(w, await sendVersion(w), { action: 'approved' });
    expect(memorialOf(await page(w, token))).not.toBeNull();
    const unknownPhoto = await t.app.inject({ method: 'GET', url: PHOTO(w, 'no-such-token-at-all') });
    expect((await t.app.inject({ method: 'GET', url: PHOTO(w, token) })).statusCode).toBe(200); // non-vacuity: it serves while the switch is on
    const off = await createTestApp({ env: { MEMORIAL_AUTHORSHIP_ENABLED: '0' } });
    try {
      const r = await off.app.inject({ method: 'GET', url: PAGE(w, token) });
      expect(r.statusCode).toBe(200);
      expect((r.json() as { drive: { familyMemorial: unknown } }).drive.familyMemorial).toBeNull();
      // ⭐ Trap 9 — the photo's refusal is an unknown token's answer on status, BODY BYTES and headers, ⛔ not on status alone.
      expectUnknownTokenAnswer(await off.app.inject({ method: 'GET', url: PHOTO(w, token) }), unknownPhoto);
    } finally {
      await teardown(off);
    }
  });

  it('AC1 — a KMS OUTAGE refuses the page (the API answers 500; `apps/public` renders its 503 outage view); a BAD ENVELOPE omits the memorial, keeps the page (200) and logs ONE `error`', async () => {
    const w = await seedMemorialWorld(t);
    const token = await tokenOf(w);
    await handover(t, w);
    const id = await sendVersion(w);
    await decide(w, id, { action: 'approved' });
    // Non-vacuity: with KMS working the page carries the memorial (else a 500 or a null below proves nothing).
    expect(memorialOf(await page(w, token))).not.toBeNull();

    // ⚠ The API's status is 500 (`internal.error` — an unclassified throw, the same as the deceased-name and contributor outage legs
    // in `sahyog-vivran.spec.ts`); the "503" is the PUBLIC APP's view for any non-2xx. The seeded world has no authorised name and no
    // contributor, so the first `decryptDek` of the request is the MEMORIAL's body — asserted below by its AAD, ⛔ not assumed.
    const outage = vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(Object.assign(new Error('14 UNAVAILABLE: kms'), { code: 14 }));
    try {
      const refused = await page(w, token);
      expect(refused.statusCode).toBe(500);
      expect(refused.json()).toMatchObject({ error: { code: 'internal.error' } });
      expect(outage).toHaveBeenCalledTimes(1);
      expect(Buffer.from(outage.mock.calls[0]![2]).toString('utf-8')).toContain(`"fieldClass":"${encryption.MEMORIAL_FIELD_CLASS}"`);
    } finally {
      outage.mockRestore();
    }

    await rows(t, `UPDATE memorial_submissions SET body_ciphertext = 'enc:v1:not-an-envelope' WHERE submission_id = $1`, [id]);
    const r = await page(w, token);
    expect(r.statusCode).toBe(200);
    expect(memorialOf(r)).toBeNull();

    // ⭐ AC1 — "ONE `error` log": the harness app keeps no log, so the same request goes through an app that does.
    const logs = captureLogs();
    const logged = await createTestApp({ logStream: logs.stream });
    try {
      const again = await logged.app.inject({ method: 'GET', url: PAGE(w, token) });
      expect(again.statusCode).toBe(200);
      expect(memorialOf(again)).toBeNull();
      const errors = logs.errors();
      expect(errors).toHaveLength(1);
      expect(String(errors[0]!['msg'])).toContain('family memorial decrypt failed');
    } finally {
      await teardown(logged);
    }
  });

  it('⭐ AC13 / Trap 4 — after ERASURE the page carries ⛔ no memorial (the sentinel decrypts SUCCESSFULLY) and the photo 404s', async () => {
    const w = await seedMemorialWorld(t);
    const token = await tokenOf(w);
    await handover(t, w);
    await decide(w, await sendVersion(w), { action: 'approved' });
    expect(memorialOf(await page(w, token))).not.toBeNull();
    expect((await t.app.inject({ method: 'GET', url: PHOTO(w, token) })).statusCode).toBe(200);
    const unknownPhoto = await t.app.inject({ method: 'GET', url: PHOTO(w, 'no-such-token-at-all') });

    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    let ok = false;
    try {
      await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, { memberId: ids.memberId(w.memberId), pariwarId: ids.pariwarId(w.pariwarId) });
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: ids.memberId(w.memberId),
        pariwarId: ids.pariwarId(w.pariwarId),
        eventType: 'member.rtbf_anonymized',
        actorId: w.memberId,
        payload: { from_state: 'pending-fee', to_state: 'anonymized', trigger: 'rtbf_request', actor: 'member' },
      });
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
    const r = await page(w, token);
    expect(r.statusCode).toBe(200);
    expect(memorialOf(r)).toBeNull();
    expect(r.body).not.toContain(memberDomain.ANONYMIZED_SENTINEL);
    // The stored OBJECT is still there (this leg erases through the domain, ⛔ not the API's best-effort delete) — so the 404 is the
    // erasure PREDICATE, and it is an unknown token's answer on status, BODY BYTES and headers.
    expectUnknownTokenAnswer(await t.app.inject({ method: 'GET', url: PHOTO(w, token) }), unknownPhoto);
  });
});
