// Story 11b.4a — the family memorial's PUBLIC PHOTO route (Task 5.4; AC4, AC5; MP4 / MP5; Traps 2, 9, 19).
// The fixtures are stored THROUGH THE SEND INGEST PATH (handover code + multipart Send — the 11b.4 metadata stripper runs), ⛔
// never seeded around it: a PNG and a JPEG carrying an ICC profile (`-400` item 3 KEPT it at ingest). The output is walked
// marker by marker — ⛔ no EXIF / XMP / IPTC / ICC may survive.
// Live DB only — skips when DATABASE_URL is unset.

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import { createReviewHarness, handover, rows, seedMemorialWorld, send, sendFields, type MemorialWorld, type ReviewHarness } from '../memorial/_fixture.js';

const PAGE = (w: MemorialWorld, token: string) => `/api/v1/p/${w.pariwarId}/public-pages/sahyog-vivran/${encodeURIComponent(token)}`;
const PHOTO = (w: MemorialWorld, token: string) => `${PAGE(w, token)}/memorial-photo`;
const VOLATILE = /^(date|x-request-id|x-ratelimit-.*|connection|keep-alive)$/i;
const stableHeaders = (h: Record<string, unknown>) => Object.fromEntries(Object.entries(h).filter(([k]) => !VOLATILE.test(k)).sort());

/** Every marker of a JPEG, in order (SOS skips its entropy-coded data; RSTn / stuffed bytes are part of it). */
function jpegMarkers(buf: Buffer): number[] {
  expect(buf[0]).toBe(0xff);
  expect(buf[1]).toBe(0xd8);
  const out = [0xd8];
  let i = 2;
  while (i < buf.length) {
    expect(buf[i], `marker prefix at ${i}`).toBe(0xff);
    const m = buf[i + 1]!;
    out.push(m);
    if (m === 0xd9) break;
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
    if (m === 0xda) {
      while (i < buf.length - 1 && !(buf[i] === 0xff && buf[i + 1] !== 0x00 && !(buf[i + 1]! >= 0xd0 && buf[i + 1]! <= 0xd7))) i += 1;
    }
  }
  return out;
}

/** AC4 — only SOI, APP0 (JFIF), DQT, SOF0/SOF2, DHT, SOS, EOI. ⛔ Never APP1 (EXIF / XMP), APP2 (ICC), APP13 (IPTC) or COM. */
const ALLOWED = new Set([0xd8, 0xe0, 0xdb, 0xc0, 0xc2, 0xc4, 0xda, 0xd9]);

describe.skipIf(!hasDatabase)('Story 11b.4a — the memorial photo route (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;
  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  async function tokenOf(w: MemorialWorld): Promise<string> {
    const [r] = await rows<{ public_token: string }>(t, `SELECT public_token FROM pools WHERE pool_id = $1`, [w.poolId]);
    return r!.public_token;
  }

  /** A world whose memorial (with `photo`) went in through the REAL Send and was approved (`photoLeftOut` optional). */
  async function approvedWith(photo: { bytes: Buffer; contentType: string; filename: string }, photoLeftOut = false) {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, [...sendFields({ body: 'माँ', altText: 'माँ की तस्वीर' }), { kind: 'file', name: 'photo', ...photo }]);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const id = r.body.submissionId as string;
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const payload = photoLeftOut ? { action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } } : { action: 'approved' };
    const d = await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload });
    expect(d.statusCode, d.body).toBe(200);
    const [key] = await rows<{ photo_object_key: string }>(t, `SELECT photo_object_key FROM memorial_submissions WHERE submission_id = $1`, [id]);
    return { w, token: await tokenOf(w), id, objectKey: key!.photo_object_key };
  }

  it('⭐ AC4 — a PNG stored through the ingest: `200 image/jpeg`, longest edge ≤ 1200, fitted inside 960 × 1200 (the stored dimensions SCALED), ⛔ no metadata segment; the cache posture, nosniff, ⛔ no Set-Cookie', async () => {
    const png = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 200, g: 120, b: 40 } } })
      .png()
      .withMetadata({ exif: { IFD0: { ImageDescription: 'secret-exif-description' } } })
      .toBuffer();
    const { w, token } = await approvedWith({ bytes: png, contentType: 'image/png', filename: 'm.png' });
    const r = await t.app.inject({ method: 'GET', url: PHOTO(w, token) });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('image/jpeg');
    expect(r.headers['cache-control']).toBe('public, max-age=60, s-maxage=300');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['set-cookie']).toBeUndefined();
    const out = r.rawPayload;
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect([meta.width, meta.height]).toEqual([960, 720]);
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1200);
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    const markers = jpegMarkers(out);
    for (const m of markers) expect(ALLOWED.has(m), `marker 0x${m.toString(16)}`).toBe(true);
    expect(out.includes(Buffer.from('secret-exif-description'))).toBe(false);
  });

  it('⭐ AC4 — a JPEG whose ICC profile the INGEST KEPT (`-400` item 3) loses it on the public variant; ⛔ not enlarged; ⛔ not rotated', async () => {
    const jpeg = await sharp({ create: { width: 600, height: 800, channels: 3, background: { r: 10, g: 140, b: 90 } } })
      .jpeg()
      .withIccProfile('p3')
      .toBuffer();
    const { w, token, objectKey } = await approvedWith({ bytes: jpeg, contentType: 'image/jpeg', filename: 'm.jpg' });
    // Non-vacuity: the STORED object still carries the profile (else stripping it proves nothing).
    const stored = await t.deps.memorialPhotoStorage.getBytes(objectKey);
    expect((await sharp(Buffer.from(stored!)).metadata()).icc).toBeDefined();
    const r = await t.app.inject({ method: 'GET', url: PHOTO(w, token) });
    expect(r.statusCode).toBe(200);
    const meta = await sharp(r.rawPayload).metadata();
    expect(meta.icc).toBeUndefined();
    // 600 × 800 already fits ⇒ ⛔ no enlargement, ⛔ no rotation: the stored dimensions exactly.
    expect([meta.width, meta.height]).toEqual([600, 800]);
    for (const m of jpegMarkers(r.rawPayload)) expect(ALLOWED.has(m), `marker 0x${m.toString(16)}`).toBe(true);
  });

  it('⭐ Trap 9 — every refusal is the SAME empty 404 as an unknown token: a photo the Trust left out, a missing object, an unknown token', async () => {
    const png = await sharp({ create: { width: 40, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    const unknown = await (async () => {
      const w = await seedMemorialWorld(t);
      return t.app.inject({ method: 'GET', url: PHOTO(w, 'no-such-token-at-all') });
    })();
    expect(unknown.statusCode).toBe(404);
    expect(unknown.body).toBe('');

    const leftOut = await approvedWith({ bytes: png, contentType: 'image/png', filename: 'a.png' }, true);
    const r1 = await t.app.inject({ method: 'GET', url: PHOTO(leftOut.w, leftOut.token) });
    // The page itself still carries the words, ⛔ not the photo.
    const page = (await t.app.inject({ method: 'GET', url: PAGE(leftOut.w, leftOut.token) })).json() as { drive: { familyMemorial: { photo: unknown } } };
    expect(page.drive.familyMemorial.photo).toBeNull();

    const missing = await approvedWith({ bytes: png, contentType: 'image/png', filename: 'b.png' });
    await t.deps.memorialPhotoStorage.delete(missing.objectKey);
    const r2 = await t.app.inject({ method: 'GET', url: PHOTO(missing.w, missing.token) });

    for (const r of [r1, r2]) {
      expect(r.statusCode).toBe(404);
      expect(r.body).toBe(unknown.body);
      expect(stableHeaders(r.headers)).toEqual(stableHeaders(unknown.headers));
    }
  });

  it('a query string is a 400 (⛔ no cache-buster — one would mint shared-cache keys)', async () => {
    const png = await sharp({ create: { width: 40, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    const { w, token } = await approvedWith({ bytes: png, contentType: 'image/png', filename: 'q.png' });
    expect((await t.app.inject({ method: 'GET', url: `${PHOTO(w, token)}?v=2` })).statusCode).toBe(400);
  });

  it('⭐ Trap 19 — the photo route writes ⛔ no appeal-reversal audit line even on a drive with an appeal reversal (the PAGE does)', async () => {
    const png = await sharp({ create: { width: 40, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    const { w, token } = await approvedWith({ bytes: png, contentType: 'image/png', filename: 'r.png' });
    await rows(
      t,
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
       VALUES ($1, 'claim.reversed', $2::jsonb, 7, $3, now() - interval '5 days')`,
      [w.claimCaseId, JSON.stringify({ reversed_at_stage: 2, disposition_category: 'procedural_correction' }), w.pariwarId],
    );
    const count = async () =>
      Number(
        (await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'public_pages.sahyog_vivran.appeal_reversal_disclosed'`, [w.pariwarId]))[0]!.n,
      );
    // Non-vacuity: the PAGE request on this drive DOES write one.
    const before = await count();
    expect((await t.app.inject({ method: 'GET', url: PAGE(w, token) })).statusCode).toBe(200);
    expect(await count()).toBe(before + 1);
    const mid = await count();
    expect((await t.app.inject({ method: 'GET', url: PHOTO(w, token) })).statusCode).toBe(200);
    expect(await count()).toBe(mid);
  });
});
