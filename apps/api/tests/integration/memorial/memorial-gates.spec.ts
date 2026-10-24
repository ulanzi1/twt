// Story 11b.4 — the gates and the edges (AC19 the switch; AC20 / MA19 the generic step-up route; MA15 erasure under the
// real grants + RLS, reviewer notes included; MA8 keepPreviousPhoto and its cleanup; Task 4.3 the permission and the row
// commit or roll back together — incl. a failure AFTER the row and its permission were written in the transaction (review
// T10 (c)); MA14 a failed name decrypt). Live DB (`:5434`).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain, memorial } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { decryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { deleteMemorialPhotosAfterErasure } from '../../../src/modules/memorial/erasure.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
  jpegWithGps,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type ReviewHarness,
} from './_fixture.js';

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
  let h: ReviewHarness;
  let t: TestApp;
  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
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

  it('⭐ MA15: anonymizeMember scrubs the words, the alt text AND the reviewer\'s notes (the decision\'s and the Trust withdrawal\'s) under the real grants; the photo is deleted after COMMIT', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    expect(
      (await send(t, w, [...sendFields({ body: 'मिटाए जाने वाले शब्द', altText: 'फ़ोटो' }), { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }])).status,
    ).toBe(201);
    const [sub] = await rows<{ submission_id: string; photo_object_key: string }>(t, `SELECT submission_id, photo_object_key FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]);
    expect(t.memorialPhotoStorage.store.has(sub!.photo_object_key)).toBe(true);

    // The Trust's two Tier-1 notes about that version, through the REAL handlers: a decision with an internal note, then the
    // Trust's withdrawal of its own approval (MA16) with another. Without them the scrub of 0181's other two columns was never run.
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const decisionNote = 'reviewer\'s note on the decision — पहला';
    const withdrawalNote = 'reviewer\'s note on the withdrawal — दूसरा';
    const base = `/api/v1/p/${w.pariwarId}/memorial-reviews/${sub!.submission_id}`;
    const decided = await panel.inject({ method: 'POST', url: `${base}/decision`, payload: { action: 'approved', internalNote: decisionNote } });
    expect(decided.statusCode, decided.body).toBe(200);
    const withdrawn = await panel.inject({ method: 'POST', url: `${base}/withdraw-approval`, payload: { reasonCode: 'identifies_a_child', internalNote: withdrawalNote } });
    expect(withdrawn.statusCode, withdrawn.body).toBe(200);
    const noteOf = async (table: 'memorial_review_decisions' | 'memorial_withdrawals') =>
      (await rows<{ internal_note_ciphertext: string }>(t, `SELECT internal_note_ciphertext FROM ${table} WHERE submission_id = $1`, [sub!.submission_id]))[0]!.internal_note_ciphertext;
    const decisionCipherBefore = await noteOf('memorial_review_decisions');
    const withdrawalCipherBefore = await noteOf('memorial_withdrawals');
    // Both notes are really stored, encrypted, and decrypt to what was written — so the sentinel below is a CHANGE, not a no-op.
    expect(await decryptMemorialField(decisionCipherBefore, w.pariwarId, t.deps.encryption)).toBe(decisionNote);
    expect(await decryptMemorialField(withdrawalCipherBefore, w.pariwarId, t.deps.encryption)).toBe(withdrawalNote);

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
    // The reviewer's notes: BOTH are the sentinel now (the real UPDATE policies + column grants let the scrub reach the rows).
    const decisionCipherAfter = await noteOf('memorial_review_decisions');
    const withdrawalCipherAfter = await noteOf('memorial_withdrawals');
    expect(decisionCipherAfter).not.toBe(decisionCipherBefore);
    expect(withdrawalCipherAfter).not.toBe(withdrawalCipherBefore);
    expect(await decryptMemorialField(decisionCipherAfter, w.pariwarId, t.deps.encryption)).toBe(memberDomain.ANONYMIZED_SENTINEL);
    expect(await decryptMemorialField(withdrawalCipherAfter, w.pariwarId, t.deps.encryption)).toBe(memberDomain.ANONYMIZED_SENTINEL);
    // …and only the Tier-1 text: the governance record (the act, the reason, who decided) is kept.
    const [kept] = await rows<{ action: string; actor_display: string; reason_code: string }>(
      t,
      `SELECT d.action, d.actor_display, wd.reason_code FROM memorial_review_decisions d JOIN memorial_withdrawals wd USING (submission_id) WHERE d.submission_id = $1`,
      [sub!.submission_id],
    );
    expect(kept).toEqual({ action: 'approved', actor_display: 'Panel Member', reason_code: 'identifies_a_child' });
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

  it('MA8: a Send that carries a NEW photo and is refused INSIDE the transaction (a stale-but-non-empty permission version) deletes ONLY the object it put; the earlier version\'s object survives', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    await send(t, w, [...sendFields({ body: 'एक', altText: 'फ़ोटो' }), { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() }]);
    const [first] = await rows<{ submission_id: string; photo_object_key: string }>(t, `SELECT submission_id, photo_object_key FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]);
    // The family withdraws, then writes again WITH A NEW PHOTO — but echoes a permission version that is no longer current. The
    // version is only checked inside `mutate`, i.e. AFTER the `put`: the failure this test is about. (A stale version with
    // `keepPreviousPhoto` and no file fails before any `put` and proves nothing about the cleanup.)
    await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${first!.submission_id}/withdraw`, { payload: {}, token: w.token });
    const objectsBefore = t.memorialPhotoStorage.store.size;
    const put = vi.spyOn(t.memorialPhotoStorage, 'put');
    const del = vi.spyOn(t.memorialPhotoStorage, 'delete');
    try {
      const failed = await send(t, w, [
        ...sendFields({ body: 'दो', altText: 'नई फ़ोटो', authorisationCopyVersion: 'an-older-version-id' }),
        { kind: 'file', name: 'photo', filename: 'new.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
      ]);
      expect(failed.status).toBe(409);
      expect(failed.body).toMatchObject({ error: { code: 'memorial.authorisation_outdated' } });
      // The `put` DID happen, and the cleanup removed exactly that object — never the earlier version's.
      expect(put).toHaveBeenCalledTimes(1);
      const putKey = put.mock.calls[0]![0];
      expect(putKey).not.toBe(first!.photo_object_key);
      expect(del.mock.calls.map((c) => c[0])).toEqual([putKey]);
      expect(t.memorialPhotoStorage.store.has(putKey)).toBe(false);
    } finally {
      put.mockRestore();
      del.mockRestore();
    }
    expect(t.memorialPhotoStorage.store.has(first!.photo_object_key)).toBe(true);
    expect(t.memorialPhotoStorage.store.size).toBe(objectsBefore);
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId])).toHaveLength(1);
    // keepPreviousPhoto still reuses the head's object (a fresh, current Send).
    const ok = await send(t, w, sendFields({ body: 'दो', altText: 'फ़ोटो', keepPreviousPhoto: 'true' }));
    expect(ok.status).toBe(201);
    const subs = await rows<{ photo_object_key: string }>(t, `SELECT photo_object_key FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at`, [w.pariwarId]);
    expect(subs.map((s) => s.photo_object_key)).toEqual([first!.photo_object_key, first!.photo_object_key]);
  });

  it('Task 4.3 / AC4: the permission and the row commit or roll back TOGETHER — a failure AFTER both were written in the transaction leaves nothing; a refused Send leaves no row; a row cannot exist without its permission', async () => {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const objectsBefore = t.memorialPhotoStorage.store.size;

    // (0) T10 (c) — the leg with teeth: the row AND its four permission columns ARE written inside the Send's transaction
    // (the real insert runs and returns them), then the transaction fails before COMMIT. Nothing may be left: no row, no
    // permission, the photo this request put removed, and — since 0182 the key rides the row — the key rolled back with it
    // (the same key then sends a NEW version, 201, ⛔ a replay of a row that never committed).
    const realInsert = memorial.insertMemorialSubmission;
    let writtenInTx: Awaited<ReturnType<typeof realInsert>>['row'] | null = null;
    const insert = vi.spyOn(memorial, 'insertMemorialSubmission').mockImplementation(async (db, values) => {
      const write = await realInsert(db, values);
      expect(write.kind).toBe('inserted');
      writtenInTx = write.row;
      throw new Error('injected failure after the insert, before COMMIT');
    });
    const key = randomUUID();
    const photoSend = () => [
      ...sendFields({ altText: 'फ़ोटो' }),
      { kind: 'file' as const, name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
    ];
    try {
      expect((await send(t, w, photoSend(), { key })).status).toBe(500);
    } finally {
      insert.mockRestore();
    }
    // The insert DID run in the transaction, with the permission on the same row …
    expect(writtenInTx).not.toBeNull();
    const written = writtenInTx! as { submissionId: string; authorisationCopyVersion: string; authorisationLocale: string; handoverRecipient: string; handoverNomineeRef: string; idempotencyKey: string | null };
    expect(written.idempotencyKey).toBe(key); // the key was written IN the row, inside the same transaction
    expect(written.authorisationCopyVersion.length).toBeGreaterThan(0);
    expect(['hi', 'en']).toContain(written.authorisationLocale);
    expect(['latest', 'at_death']).toContain(written.handoverRecipient);
    expect(written.handoverNomineeRef.length).toBeGreaterThan(0);
    // … and the rollback took ALL of it: neither that row nor any other is there, and the object it would reference is gone.
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE submission_id = $1`, [written.submissionId])).toEqual([]);
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId])).toEqual([]);
    expect(t.memorialPhotoStorage.store.size).toBe(objectsBefore);
    // Nothing committed, so the key went with the row: the same key sends now (201, ⛔ 200) — and that version is the only one.
    expect((await send(t, w, photoSend(), { key })).status).toBe(201);
    const after = await rows<{ submission_id: string; photo_object_key: string }>(t, `SELECT submission_id, photo_object_key FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId]);
    expect(after).toHaveLength(1);
    expect(after[0]!.submission_id).not.toBe(written.submissionId);
    // Withdraw it (the family may, before review) so the legs below start from a chain the family can send to again.
    expect((await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${after[0]!.submission_id}/withdraw`, { payload: {}, token: w.token })).status).toBe(200);
    const objectsBeforeRefusal = t.memorialPhotoStorage.store.size;

    // (1) Refused inside the transaction (BEFORE the insert), after the photo was put: no new row, the object removed.
    const refused = await send(t, w, [
      ...sendFields({ authorisationCopyVersion: 'an-older-version-id', altText: 'फ़ोटो' }),
      { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
    ]);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ error: { code: 'memorial.authorisation_outdated' } });
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId])).toHaveLength(1);
    expect(t.memorialPhotoStorage.store.size).toBe(objectsBeforeRefusal);
    // (2) The permission is columns of the SAME row, and every one is NOT NULL: no row can be written without it, so there is no
    // state in which "the words are stored but the permission is not".
    const nominee = randomUUID();
    const insertWithout = (column: string) => {
      const cols: Record<string, unknown> = {
        pariwar_id: w.pariwarId,
        pool_id: w.poolId,
        claim_case_id: w.claimCaseId,
        deceased_member_id: w.memberId,
        body_ciphertext: 'enc:v1:x',
        authorisation_copy_version: 'v',
        authorisation_locale: 'hi',
        handover_recipient: 'latest',
        handover_nominee_ref: nominee,
      };
      delete cols[column];
      const names = Object.keys(cols);
      return rows(t, `INSERT INTO memorial_submissions (${names.join(', ')}) VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`, names.map((n) => cols[n]));
    };
    for (const column of ['authorisation_copy_version', 'authorisation_locale', 'handover_recipient', 'handover_nominee_ref']) {
      await expect(insertWithout(column), column).rejects.toMatchObject({ code: '23502' });
    }
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pariwar_id = $1`, [w.pariwarId])).toHaveLength(1);
    // (3) The success path writes all four together (every version so far).
    expect((await send(t, w, sendFields())).status).toBe(201);
    const all = await rows<{ authorisation_copy_version: string; authorisation_locale: string; handover_recipient: string; handover_nominee_ref: string }>(
      t,
      `SELECT authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref FROM memorial_submissions WHERE pariwar_id = $1`,
      [w.pariwarId],
    );
    expect(all).toHaveLength(2);
    for (const row of all) expect(Object.values(row).every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
  });

  it('MA14: a failed name decrypt → the no-name intro, a 200', async () => {
    const w = await seedMemorialWorld(t);
    await rows(t, `UPDATE member_kyc_profiles SET name_ciphertext = 'enc:v1:garbage' WHERE member_id = $1`, [w.memberId]);
    const r = await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token });
    expect(r.status).toBe(200);
    expect((r.body.memorial as Record<string, unknown>).deceasedName).toBeNull();
  });
});
