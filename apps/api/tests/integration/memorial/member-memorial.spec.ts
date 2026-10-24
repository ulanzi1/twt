// Story 11b.4 — the family memorial's MEMBER routes, end to end (AC1 / AC3 / AC4 / AC5 / AC7 / AC8 / AC10; MA5 / MA8 /
// MA9 / MA11 / MA13; Traps 6 / 11 / 12). Live DB (`:5434` — BigDev), explicit values, one Pariwar per world.

import { randomUUID } from 'node:crypto';

import { MEMORIAL_PHOTO_MAX_BYTES } from '@twt/contracts';
import { idempotency, memorial } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import {
  CURRENT_VERSION,
  beginUnlockedSubmission,
  errorWithoutRequestId,
  handover,
  jpegWithGps,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
} from './_fixture.js';

describe.skipIf(!hasDatabase)('memorial — member routes (live DB)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await teardown(t);
  });

  async function view(w: MemorialWorld) {
    const r = await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token });
    expect(r.status).toBe(200);
    return r.body.memorial as Record<string, unknown> | null;
  }

  async function submissions(w: MemorialWorld) {
    return rows<{ submission_id: string; supersedes_submission_id: string | null; body_ciphertext: string; photo_object_key: string | null; authorisation_copy_version: string; authorisation_locale: string; handover_recipient: string; handover_nominee_ref: string }>(
      t,
      `SELECT * FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`,
      [w.pariwarId],
    );
  }

  // ── AC1 — the entry and the view ─────────────────────────────────────────────────────────────────────────────────────

  it('AC1: entry is true only for a closed/settled drive, decrypts nothing and writes ⛔ audit line', async () => {
    for (const [state, expected] of [['closed', true], ['settled', true], ['live', false], ['spawned', false]] as const) {
      const w = await seedMemorialWorld(t, { poolState: state });
      const before = t.auditSink.events.length;
      const r = await memberInject(t, 'GET', '/api/v1/member/memorial/entry', { token: w.token });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ memorialEntry: expected });
      expect(t.auditSink.events.slice(before).filter((e) => e.type.startsWith('memorial.'))).toEqual([]);
    }
  });

  it('AC1: ⛔ drive ⇒ { memorial: null }', async () => {
    const w = await seedMemorialWorld(t, { poolState: 'live' });
    expect(await view(w)).toBeNull();
  });

  it('AC1: the view before any Send — the name, state none, both locales of the permission, canSend; one read line', async () => {
    const w = await seedMemorialWorld(t, { legalName: 'Shanti Devi' });
    const before = t.auditSink.events.length;
    const v = await view(w);
    expect(v).toMatchObject({
      deceasedName: 'Shanti Devi',
      memorialState: 'none',
      submissionId: null,
      idempotencyKey: null, // Z2 — nothing sent
      body: null,
      canSend: true,
      canWithdraw: false,
      earlierApprovalWithdrawn: null,
      authorisation: { copyVersion: CURRENT_VERSION },
    });
    const auth = v!.authorisation as { text: { hi: string; en: string } };
    expect(auth.text.hi.length).toBeGreaterThan(0);
    expect(auth.text.en.length).toBeGreaterThan(0);
    const reads = t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.member.read');
    expect(reads).toHaveLength(1);
  });

  it('AC1: ⛔ name ⇒ deceasedName null (the no-name intro), a 200', async () => {
    const w = await seedMemorialWorld(t, { legalName: null });
    expect((await view(w))!.deceasedName).toBeNull();
  });

  // ── AC7a / AC20 — the step-up gate ───────────────────────────────────────────────────────────────────────────────────

  it('AC7: a Send ⛔ the handover elevation → 403 auth.step_up_required (⛔ row)', async () => {
    const w = await seedMemorialWorld(t);
    const r = await send(t, w, sendFields());
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ error: { code: 'auth.step_up_required' } });
    expect(await submissions(w)).toEqual([]);
  });

  // ── AC4 / AC5 / AC7 — the happy path, verbatim ───────────────────────────────────────────────────────────────────────

  it('⭐ Trap 6 / AC5: the words round-trip BYTE FOR BYTE through the multipart route; the permission rides the row (AC4)', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const verbatim = '  पहली पंक्ति\r\n\r\n*दूसरी*  ';
    const r = await send(t, w, sendFields({ body: verbatim, authorisationLocale: 'en' }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ memorialState: 'with_the_trust' });
    const [row] = await submissions(w);
    expect(row).toBeDefined();
    expect(await decryptMemorialField(row!.body_ciphertext, w.pariwarId, t.deps.encryption)).toBe(verbatim);
    expect(row!.authorisation_copy_version).toBe(CURRENT_VERSION);
    expect(row!.authorisation_locale).toBe('en');
    expect(row!.handover_recipient).toBe('latest');
    // MA5 — the rank-1 head of the nominee declaration history.
    const [head] = await rows<{ version_id: string }>(
      t,
      `SELECT version_id FROM member_nominee_versions WHERE pariwar_id = $1 AND member_id = $2 AND rank = 1 ORDER BY version_no DESC LIMIT 1`,
      [w.pariwarId, w.memberId],
    );
    expect(row!.handover_nominee_ref).toBe(head!.version_id);
    // The view echoes the exact words.
    const v = await view(w);
    expect(v).toMatchObject({ memorialState: 'with_the_trust', body: verbatim, canSend: true, canWithdraw: true });
    // The write line — through the compensating sink (MA11).
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.%'`, [w.pariwarId]);
    expect(audit.map((a) => a.action)).toEqual(['memorial.submission.create']);
  });

  it('AC4 (Task 4.3): Send writes ⛔ consent_records row', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const count = async () =>
      Number((await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id = $1`, [w.pariwarId]))[0]!.n);
    const before = await count();
    expect((await send(t, w, sendFields())).status).toBe(201);
    expect(await count()).toBe(before);
  });

  it('AC4: a stale permission version → 409 memorial.authorisation_outdated, ⛔ row', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, sendFields({ authorisationCopyVersion: '2026-01-01.v0' }));
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: { code: 'memorial.authorisation_outdated' } });
    expect(await submissions(w)).toEqual([]);
  });

  it('MA8: the stored photo carries ⛔ EXIF/GPS; the view returns a signed URL (audited)', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, [
      ...sendFields({ altText: 'माँ की तस्वीर' }),
      { kind: 'file', name: 'photo', filename: 'maa.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
    ]);
    expect(r.status).toBe(201);
    const [row] = await submissions(w);
    const stored = t.memorialPhotoStorage.store.get(row!.photo_object_key!);
    expect(stored?.contentType).toBe('image/jpeg');
    expect(Buffer.from(stored!.bytes).toString('latin1')).not.toContain('GPS');
    const before = t.auditSink.events.length;
    const v = await view(w);
    expect(v).toMatchObject({ hasPhoto: true, altText: 'माँ की तस्वीर' });
    expect(typeof v!.photoUrl).toBe('string');
    expect(t.auditSink.events.slice(before).map((e) => e.type)).toContain('memorial.photo.url');
    // ⛔ The object key never reaches the wire.
    expect(JSON.stringify(v)).not.toContain(row!.photo_object_key!);
  });

  // ── AC7 — refusals that never punish ─────────────────────────────────────────────────────────────────────────────────

  it.each([
    ['blank body (U+3164 only)', sendFields({ body: '\u3164' }), 400, 'memorial.body_blank'],
    ['too long', sendFields({ body: 'क'.repeat(6001) }), 400, 'memorial.body_too_long'],
    ['unknown field', [...sendFields(), { kind: 'field', name: 'narrative', value: 'x' }], 400, 'memorial.field_not_allowed'],
    ['duplicate field', [...sendFields(), { kind: 'field', name: 'body', value: 'again' }], 400, 'memorial.duplicate_field'],
    ['a field over fieldSize (valueTruncated)', sendFields({ body: 'a'.repeat(40 * 1024) }), 400, 'memorial.field_too_long'],
    ['photo ⛔ alt text', [...sendFields(), { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }], 400, 'memorial.alt_text_required'],
    ['a PDF claiming image/jpeg', [...sendFields({ altText: 'x' }), { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: Buffer.from('%PDF-1.7') }], 400, 'memorial.photo_type'],
    ['keepPreviousPhoto WITH a photo', [...sendFields({ altText: 'x', keepPreviousPhoto: 'true' }), { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }], 400, 'memorial.photo_conflict'],
    ['keepPreviousPhoto with ⛔ previous photo', sendFields({ altText: 'x', keepPreviousPhoto: 'true' }), 400, 'memorial.no_previous_photo'],
    // 300 code points is the limit (MEMORIAL_ALT_TEXT_MAX_CODE_POINTS); a Devanagari letter is ONE code point, 301 is over.
    ['alt text over the limit', [...sendFields({ altText: 'क'.repeat(301) }), { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }], 400, 'memorial.alt_text_too_long'],
    ['a photo over the size limit', [...sendFields({ altText: 'x' }), { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: Buffer.alloc(MEMORIAL_PHOTO_MAX_BYTES + 1024, 0xff) }], 400, 'memorial.photo_too_large'],
  ] as const)('refuses %s', async (_name, parts, status, code) => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, parts);
    expect(r.status).toBe(status);
    expect(r.body).toMatchObject({ error: { code } });
    expect(await submissions(w)).toEqual([]);
  });

  it('refuses a second file as a duplicate', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const photo = { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() } as const;
    const r = await send(t, w, [...sendFields({ altText: 'x' }), photo, photo]);
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ error: { code: 'memorial.duplicate_field' } });
  });

  it('AC7: a missing Idempotency-Key → 400; a replay with the SAME key → 200 with the FIRST result, ⛔ second version', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect((await send(t, w, sendFields(), { key: null })).body).toMatchObject({ error: { code: 'memorial.idempotency_key_required' } });
    const key = randomUUID();
    const first = await send(t, w, sendFields(), { key });
    expect(first.status).toBe(201);
    const replay = await send(t, w, sendFields({ body: 'something else' }), { key });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(await submissions(w)).toHaveLength(1);
  });

  it('Z2: the member GET carries the LATEST version\'s Send key — the first key, then the superseding Send\'s; null for a pre-0182 latest row', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const first = randomUUID();
    const a = await send(t, w, sendFields({ body: 'पहला' }), { key: first });
    expect(a.status).toBe(201);
    expect(await view(w)).toMatchObject({ submissionId: a.body.submissionId, idempotencyKey: first });
    // The same key again is the replay — the view still names that key.
    expect((await send(t, w, sendFields({ body: 'पहला' }), { key: first })).status).toBe(200);
    expect((await view(w))!.idempotencyKey).toBe(first);
    const second = randomUUID();
    const b = await send(t, w, sendFields({ body: 'दूसरा' }), { key: second });
    expect(b.status).toBe(201);
    expect(await view(w)).toMatchObject({ submissionId: b.body.submissionId, idempotencyKey: second });
    // A latest row with ⛔ key (the pre-0182 shape) ⇒ null, ⛔ the earlier version's key.
    const legacy = await beginUnlockedSubmission(t, w, { supersedes: b.body.submissionId as string, idempotencyKey: null });
    await legacy.commit();
    expect(await view(w)).toMatchObject({ submissionId: legacy.submissionId, idempotencyKey: null });
  });

  it('0182: the shared keyed store is no longer consulted — a key left CLAIMED there (the old in-flight shape) does not block the Send (201, ⛔ 409 idempotency_in_progress); the key rides the row instead', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const key = randomUUID();
    // The old mechanism's claim with no result recorded (its key shape was `memorial.send:<pariwar>:<member>:<key>`).
    const store = idempotency.createKeyedStore(t.pool);
    expect(await store.claim(`memorial.send:${w.pariwarId}:${w.memberId}:${key}`, 300)).toBe('acquired');
    const r = await send(t, w, sendFields(), { key });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pool_id = $1 AND idempotency_key = $2`, [w.poolId, key])).toHaveLength(1);
    // And the handler never touched the keyed store: the claim above is still the bare pending one (⛔ recorded, ⛔ released).
    expect(await rows(t, `SELECT status FROM idempotency_keys WHERE key = $1`, [`memorial.send:${w.pariwarId}:${w.memberId}:${key}`])).toEqual([{ status: 'pending' }]);
  });

  it('MA5: ⛔ resolvable nominee → 409 memorial.nominee_unresolved, before any put', async () => {
    const w = await seedMemorialWorld(t, { nominee: false });
    // Elevate directly (⛔ nominee to receive a code) so the gate passes and the resolution leg is reached.
    await rows(t, `INSERT INTO member_step_up_elevations (member_id, action_context, elevated_until) VALUES ($1, 'claim_handover', now() + interval '5 minutes')`, [w.memberId]);
    const before = t.memorialPhotoStorage.store.size;
    const r = await send(t, w, [
      ...sendFields({ altText: 'x' }),
      { kind: 'file', name: 'photo', filename: 'a.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
    ]);
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ error: { code: 'memorial.nominee_unresolved' } });
    expect(t.memorialPhotoStorage.store.size).toBe(before);
  });

  // ── MA9 / Trap 12 — versions ─────────────────────────────────────────────────────────────────────────────────────────

  it('MA9: a second Send while one is with the Trust SUPERSEDES it', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect((await send(t, w, sendFields({ body: 'पहला' }))).status).toBe(201);
    expect((await send(t, w, sendFields({ body: 'दूसरा' }))).status).toBe(201);
    const [a, b] = await submissions(w);
    expect(a!.supersedes_submission_id).toBeNull();
    expect(b!.supersedes_submission_id).toBe(a!.submission_id);
    expect((await view(w))!.body).toBe('दूसरा');
  });

  it('⭐ Trap 12: two CONCURRENT Sends both return 201 and the chain stays linear', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const [r1, r2] = await Promise.all([send(t, w, sendFields({ body: 'एक' })), send(t, w, sendFields({ body: 'दो' }))]);
    expect([r1.status, r2.status]).toEqual([201, 201]);
    const subs = await submissions(w);
    expect(subs).toHaveLength(2);
    expect(subs.filter((s) => s.supersedes_submission_id === null)).toHaveLength(1);
    const root = subs.find((s) => s.supersedes_submission_id === null)!;
    expect(subs.find((s) => s.supersedes_submission_id === root.submission_id)).toBeDefined();
  });

  it('⭐ Trap 12: the 23505 backstop — a direct UNLOCKED second root insert is refused by the unique index', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect((await send(t, w, sendFields())).status).toBe(201);
    const [row] = await submissions(w);
    await expect(
      rows(
        t,
        `INSERT INTO memorial_submissions (pariwar_id, pool_id, claim_case_id, deceased_member_id, body_ciphertext,
           authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref)
         VALUES ($1, $2, $3, $4, $5, $6, 'hi', 'latest', $7)`,
        [w.pariwarId, w.poolId, w.claimCaseId, w.memberId, row!.body_ciphertext, CURRENT_VERSION, row!.handover_nominee_ref],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  // ── AC8 — withdraw before review ─────────────────────────────────────────────────────────────────────────────────────

  it('AC8: withdraw the latest while with the Trust → withdrawn; then Write again → 201', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, sendFields());
    const [row] = await submissions(w);
    const r = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${row!.submission_id}/withdraw`, { payload: {}, token: w.token });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ memorialState: 'withdrawn' });
    expect(await view(w)).toMatchObject({ memorialState: 'withdrawn', canSend: true, canWithdraw: false });
    expect((await send(t, w, sendFields({ body: 'फिर से' }))).status).toBe(201);
    const audit = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.%' ORDER BY seq`, [w.pariwarId]);
    expect(audit.map((a) => a.action)).toContain('memorial.submission.withdraw');
  });

  // ⚠ Each `seedMemorialWorld` is its OWN Pariwar, so this "another family's id" leg is separated by RLS alone — the same-Pariwar
  // leg (where only the chain-membership check can stop it) is the next test.
  it('AC8: an earlier (superseded) version → 409 not_withdrawable; an id in ANOTHER PARIWAR (RLS) → the neutral 404', async () => {
    const w = await seedMemorialWorld(t);
    const other = await seedMemorialWorld(t);
    await handover(t, w);
    await handover(t, other);
    await send(t, w, sendFields({ body: 'a' }));
    await send(t, w, sendFields({ body: 'b' }));
    await send(t, other, sendFields({ body: 'c' }));
    const [first] = await submissions(w);
    const [theirs] = await submissions(other);
    const r1 = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${first!.submission_id}/withdraw`, { payload: {}, token: w.token });
    expect(r1.status).toBe(409);
    expect(r1.body).toMatchObject({ error: { code: 'memorial.not_withdrawable' } });
    const r2 = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${theirs!.submission_id}/withdraw`, { payload: {}, token: w.token });
    expect(r2.status).toBe(404);
    expect(r2.body).toMatchObject({ error: { code: 'memorial.not_found' } });
  });

  it('⭐ AC8 / family 12 (a): ANOTHER FAMILY\'S id in the SAME Pariwar → the neutral 404 — the chain-membership check stops it, not RLS', async () => {
    const w = await seedMemorialWorld(t);
    // A second deceased member, claim and drive INSIDE THE SAME PARIWAR: RLS (keyed on pariwar_id) cannot tell the two families apart.
    const other = await seedMemorialWorld(t, { intoPariwar: w.pariwarId });
    expect(other.pariwarId).toBe(w.pariwarId);
    expect(other.memberId).not.toBe(w.memberId);
    expect(other.poolId).not.toBe(w.poolId);
    await handover(t, w);
    await handover(t, other);
    expect((await send(t, w, sendFields({ body: 'ours' }))).status).toBe(201);
    expect((await send(t, other, sendFields({ body: 'theirs' }))).status).toBe(201);
    const [theirs] = await rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_submissions WHERE deceased_member_id = $1`, [other.memberId]);
    const withdrawUrl = `/api/v1/member/memorial/submissions/${theirs!.submission_id}/withdraw`;

    // The premise: from inside THIS family's Pariwar scope — the scope the Withdraw handler itself runs in — the other family's
    // version IS visible. So a 404 below is not RLS hiding the row.
    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    try {
      const seen = await scopeTx.client.query(`SELECT submission_id FROM memorial_submissions WHERE submission_id = $1`, [theirs!.submission_id]);
      expect(seen.rowCount).toBe(1);
    } finally {
      await closeScopeTx(scopeTx, false);
    }

    // ⚠ A regression to catch: `decideFamilyWithdraw`'s `index < 0 → 'not_found'` (packages/domain/src/memorial/withdrawal.ts), or
    // any change that looks the id up on the Pariwar instead of the SESSION drive's chain, turns this into a withdrawal of the
    // other family's version (200) or a different code. RLS cannot save it: both families share the Pariwar.
    const r = await memberInject(t, 'POST', withdrawUrl, { payload: {}, token: w.token });
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ error: { code: 'memorial.not_found', message: 'Not found' } });
    // Indistinguishable from an id that does not exist (the byte-identical neutral body, minus the per-request id).
    const unknown = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${randomUUID()}/withdraw`, { payload: {}, token: w.token });
    expect(errorWithoutRequestId(r.body.error)).toEqual(errorWithoutRequestId(unknown.body.error));

    // Nothing happened to the other family's version: no withdrawal row, still with the Trust and withdrawable by THEM.
    expect(await rows(t, `SELECT 1 FROM memorial_withdrawals WHERE submission_id = $1`, [theirs!.submission_id])).toEqual([]);
    expect(await view(other)).toMatchObject({ memorialState: 'with_the_trust', canWithdraw: true });
    // And ours is untouched too.
    expect(await view(w)).toMatchObject({ memorialState: 'with_the_trust', body: 'ours' });
    // Control: the OWNING family can withdraw it (so the 404 above is the ownership check, not a dead route).
    expect((await memberInject(t, 'POST', withdrawUrl, { payload: {}, token: other.token })).status).toBe(200);
  });

  it('AC1: a words decrypt failure → the fail-soft 200 (unavailable), canSend and canWithdraw false', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, sendFields());
    await rows(t, `UPDATE memorial_submissions SET body_ciphertext = 'enc:v1:garbage' WHERE pariwar_id = $1`, [w.pariwarId]);
    expect(await view(w)).toMatchObject({ body: null, unavailable: 'memorial.unavailable_now', canSend: false, canWithdraw: false });
  });

  it('domain lockstep: the chain read sees the version the route wrote', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, sendFields());
    expect(memorial.MEMORIAL_DRIVE_POOL_STATES).toContain('closed');
    expect(await submissions(w)).toHaveLength(1);
  });
});
