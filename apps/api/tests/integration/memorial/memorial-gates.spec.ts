// Story 11b.4 — the gates and the edges (AC19 the switch; AC20 / MA19 the generic step-up route; MA15 erasure under the
// real grants + RLS; MA8 keepPreviousPhoto and its cleanup; MA14 a failed name decrypt). Live DB (`:5434`).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { deleteMemorialPhotosAfterErasure } from '../../../src/modules/memorial/erasure.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import { handover, jpegWithGps, memberInject, rows, seedMemorialWorld, send, sendFields } from './_fixture.js';

describe.skipIf(!hasDatabase)('memorial — AC19: dark until Row 41 closes (the switch OFF)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ env: { MEMORIAL_AUTHORSHIP_ENABLED: '0' } });
  });
  afterAll(async () => {
    await teardown(t);
  });

  it('entry → false, the GET → null, each write → the neutral 404 WITHOUT an elevation (the switch answers before the gate)', async () => {
    expect(t.deps.config.memorialAuthorshipEnabled).toBe(false);
    const w = await seedMemorialWorld(t);
    expect((await memberInject(t, 'GET', '/api/v1/member/memorial/entry', { token: w.token })).body).toEqual({ memorialEntry: false });
    expect((await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body).toEqual({ memorial: null });
    const s = await send(t, w, sendFields());
    expect(s.status).toBe(404);
    expect(s.body).toMatchObject({ error: { code: 'memorial.not_found' } });
    const wd = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${randomUUID()}/withdraw`, { payload: {}, token: w.token });
    expect(wd.status).toBe(404);
    expect(wd.body).toMatchObject({ error: { code: 'memorial.not_found' } });
    // ⛔ No code was texted to the nominee.
    expect(t.stepUpDelivery.deliveries).toHaveLength(0);
  });
});

describe.skipIf(!hasDatabase)('memorial — the edges (switch ON)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await teardown(t);
  });

  it('⭐ AC20 / MA19: the generic step-up route refuses claim_handover — ⛔ OTP row, ⛔ SMS, one failure line; Send stays 403', async () => {
    const w = await seedMemorialWorld(t);
    const otpRowsBefore = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM member_auth_otps WHERE member_id = $1`, [w.memberId]);
    const deliveriesBefore = t.stepUpDelivery.deliveries.length;
    const auditBefore = t.auditSink.events.length;
    const r = await memberInject(t, 'POST', '/api/v1/member/auth/step-up/request', { payload: { actionContext: 'claim_handover' }, token: w.token });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ error: { code: 'auth.step_up_context_not_allowed' } });
    expect(t.stepUpDelivery.deliveries.length).toBe(deliveriesBefore);
    const otpRowsAfter = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM member_auth_otps WHERE member_id = $1`, [w.memberId]);
    expect(otpRowsAfter[0]!.n).toBe(otpRowsBefore[0]!.n);
    const failures = t.auditSink.events.slice(auditBefore).filter((e) => e.type === 'member_step_up.failure');
    expect(failures).toHaveLength(1);
    expect(failures[0]!.context).toMatchObject({ action_context: 'claim_handover', reason: 'context_not_allowed' });
    expect((await send(t, w, sendFields())).status).toBe(403);
  });

  it('AC20: another context still works on the generic route; the NOMINEE route still unlocks Send', async () => {
    const w = await seedMemorialWorld(t);
    // The generic route texts the SESSION member's own phone — give the deceased's account its login identity.
    const mobile = `+91 9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
    await rows(t, `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
      w.memberId,
      w.pariwarId,
      await encryptMobile(normalizeMobile(mobile) as string, t.deps.encryption),
      await mobileBlindIndex(mobile, t.deps.encryption),
    ]);
    const r = await memberInject(t, 'POST', '/api/v1/member/auth/step-up/request', { payload: { actionContext: 'nominee_update' }, token: w.token });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    await handover(t, w);
    expect((await send(t, w, sendFields())).status).toBe(201);
  });

  it('⭐ MA15: anonymizeMember scrubs the words, the alt text and the reviewer\'s notes under the real grants; the photo is deleted after COMMIT', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect(
      (await send(t, w, [...sendFields({ body: 'मिटाए जाने वाले शब्द', altText: 'फ़ोटो' }), { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }])).status,
    ).toBe(201);
    const [sub] = await rows<{ submission_id: string; photo_object_key: string }>(t, `SELECT submission_id, photo_object_key FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]);
    expect(t.memorialPhotoStorage.store.has(sub!.photo_object_key)).toBe(true);

    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    let keys: readonly string[] = [];
    try {
      ({ memorialPhotoKeys: keys } = await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, {
        memberId: ids.memberId(w.memberId),
        pariwarId: ids.pariwarId(w.pariwarId),
      }));
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    expect(keys).toEqual([sub!.photo_object_key]);
    const [after] = await rows<{ body_ciphertext: string; alt_text_ciphertext: string; photo_object_key: string }>(
      t,
      `SELECT body_ciphertext, alt_text_ciphertext, photo_object_key FROM memorial_submissions WHERE submission_id = $1`,
      [sub!.submission_id],
    );
    expect(await decryptMemorialField(after!.body_ciphertext, w.pariwarId, t.deps.encryption)).toBe(memberDomain.ANONYMIZED_SENTINEL);
    expect(await decryptMemorialField(after!.alt_text_ciphertext, w.pariwarId, t.deps.encryption)).toBe(memberDomain.ANONYMIZED_SENTINEL);
    await deleteMemorialPhotosAfterErasure(t.deps, t.app.log, keys);
    expect(t.memorialPhotoStorage.store.has(sub!.photo_object_key)).toBe(false);
  });

  it('MA15: every OTHER column stays immutable for the app role (the column grant)', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, sendFields());
    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    try {
      await expect(scopeTx.client.query(`UPDATE memorial_submissions SET authorisation_locale = 'en'`)).rejects.toMatchObject({ code: '42501' });
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('MA8: keepPreviousPhoto reuses the head\'s object; a FAILED Send with it leaves the earlier object in storage', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, [...sendFields({ body: 'एक', altText: 'फ़ोटो' }), { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }]);
    // The family withdraws, then writes again keeping the photo.
    const [first] = await rows<{ submission_id: string; photo_object_key: string }>(t, `SELECT submission_id, photo_object_key FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]);
    await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${first!.submission_id}/withdraw`, { payload: {}, token: w.token });
    // A failure (a stale permission version) after the parse — the earlier object must SURVIVE.
    const failed = await send(t, w, sendFields({ body: 'दो', altText: 'फ़ोटो', keepPreviousPhoto: 'true', authorisationCopyVersion: 'old' }));
    expect(failed.status).toBe(409);
    expect(t.memorialPhotoStorage.store.has(first!.photo_object_key)).toBe(true);
    const ok = await send(t, w, sendFields({ body: 'दो', altText: 'फ़ोटो', keepPreviousPhoto: 'true' }));
    expect(ok.status).toBe(201);
    const subs = await rows<{ photo_object_key: string }>(t, `SELECT photo_object_key FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    expect(subs.map((s) => s.photo_object_key)).toEqual([first!.photo_object_key, first!.photo_object_key]);
  });

  it('MA14: a failed name decrypt → the no-name intro, a 200', async () => {
    const w = await seedMemorialWorld(t);
    await rows(t, `UPDATE member_kyc_profiles SET name_ciphertext = 'enc:v1:garbage' WHERE member_id = $1`, [w.memberId]);
    const r = await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token });
    expect(r.status).toBe(200);
    expect((r.body.memorial as Record<string, unknown>).deceasedName).toBeNull();
  });
});
