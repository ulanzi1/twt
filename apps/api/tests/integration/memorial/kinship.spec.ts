// Story 11b.5a — the family list through the REAL routes (`-428` PQ1 A; `-426`; build decisions `-431` KL4–KL11, KL15, KL16).
// Every list goes in through the real Send (multipart part `kinship`), the real review, and comes out through the real member view,
// review detail, public page and helpline drive view. Names here are obviously synthetic (Trap 2).
//   · AC2 — the Send refuses a malformed list with `memorial.kinship_invalid` BEFORE anything is written; a tick with ⛔ no photo is
//     refused; 20 entries at the 200-code-point cap are accepted; a name round-trips byte for byte; `[]` is refused.
//   · AC6 / KL9 / KL16 — the member view returns the list as SENT, the left-out indexes, and `guardianDeclaration`; an unreadable
//     list is `unavailable` on the member view and the review detail.
//   · AC5 — a kinship-only `approved_with_omissions`; the validator's problems; the decide audit carries the indexes, ⛔ a name.
//   · AC7 / AC15 — the public wire carries grouped surviving rows only: ⛔ index, ⛔ reason, ⛔ `inPhoto`, ⛔ a count; a list whose
//     every entry was left out is `[]`; a sentinel / unparsable list drops the WHOLE memorial.
//   · AC8 — the helpline's `shown.kinship` equals the page's rows; a sentinel list makes the drive view `not_found`; a list that
//     cannot be read (bad envelope, bad JSON, schema failure) reads the memorial as unreadable, as the page drops it.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { encryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { hasDatabase, type TestApp } from '../_setup.js';
import {
  CURRENT_VERSION,
  createReviewHarness,
  handover,
  jpegWithGps,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
  type Part,
  type ReviewHarness,
} from './_fixture.js';

const kinshipPart = (value: unknown): Part => ({ kind: 'field', name: 'kinship', value: typeof value === 'string' ? value : JSON.stringify(value) });
const photoParts = (): Part[] => [
  { kind: 'field', name: 'altText', value: 'परिवार की फ़ोटो' },
  { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
];

// Interleaved on purpose (AC7): the grouping, not the input order, decides the page.
const LIST = [
  { relation: 'son', name: 'परीक्षा-पुत्र एक' },
  { relation: 'wife', name: 'परीक्षा-पत्नी', inPhoto: true },
  { relation: 'son', name: 'परीक्षा-पुत्र दो' },
  { relation: 'daughters_daughter', name: 'परीक्षा-नातिन' },
];

// A PRESENT `kinship_ciphertext` the routes cannot read (KL10), each as the ciphertext the column would hold. The erasure
// sentinel is not among them: it has its own `not_found` branch on the helpline view.
const UNREADABLE_LISTS: [string, (t: TestApp, w: MemorialWorld) => Promise<string>][] = [
  ['a bad envelope', async () => 'enc:v1:not-an-envelope'],
  ['unparsable JSON', async (t, w) => encryptMemorialField('[{"relation":', w.pariwarId, t.deps.encryption)],
  ['a schema failure', async (t, w) => encryptMemorialField('[{"relation":"uncle","name":"x"}]', w.pariwarId, t.deps.encryption)],
];

describe.skipIf(!hasDatabase)('Story 11b.5a — the family list through the real routes (live DB)', { timeout: 60000 }, () => {
  let h: ReviewHarness;
  let t: TestApp;

  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  async function world(): Promise<MemorialWorld> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    return w;
  }
  const submissionCount = async (w: MemorialWorld) =>
    Number((await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_submissions WHERE pool_id = $1`, [w.poolId]))[0]!.n);
  const view = async (w: MemorialWorld) =>
    (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Record<string, unknown>;
  const decide = async (w: MemorialWorld, id: string, payload: object) => {
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    return panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload });
  };
  const pageMemorial = async (w: MemorialWorld) => {
    const [p] = await rows<{ public_token: string }>(t, `SELECT public_token FROM pools WHERE pool_id = $1`, [w.poolId]);
    const r = await t.app.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/public-pages/sahyog-vivran/${p!.public_token}` });
    expect(r.statusCode, r.body).toBe(200);
    return { raw: r.body, memorial: (r.json() as { drive: { familyMemorial: Record<string, unknown> | null } }).drive.familyMemorial };
  };

  it.each([
    ['an empty array', []],
    ['malformed JSON', '[{"relation":"son"'],
    ['a non-array', { relation: 'son', name: 'x' }],
    ['an unknown relation', [{ relation: 'uncle', name: 'x' }]],
    ['21 entries', Array.from({ length: 21 }, () => ({ relation: 'son', name: 'x' }))],
    ['a blank name', [{ relation: 'son', name: ' \u200b ' }]],
    ['a 201-code-point name', [{ relation: 'son', name: 'न'.repeat(201) }]],
    ['an extra key', [{ relation: 'son', name: 'x', age: 4 }]],
    ['inPhoto: false', [{ relation: 'son', name: 'x', inPhoto: false }]],
    ['a tick with ⛔ photo in the Send', [{ relation: 'son', name: 'x', inPhoto: true }]],
  ])('AC2 — refuses %s with memorial.kinship_invalid, writing ⛔ row', async (_why, value) => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), kinshipPart(value)]);
    expect(r.status, JSON.stringify(r.body)).toBe(400);
    expect((r.body.error as { code: string }).code).toBe('memorial.kinship_invalid');
    expect(await submissionCount(w)).toBe(0);
  });

  it('AC2 — 20 entries at the 200-code-point cap are accepted (the part fits the 32 KiB fieldSize)', async () => {
    const w = await world();
    const list = Array.from({ length: 20 }, () => ({ relation: 'son', name: 'न'.repeat(200) }));
    const r = await send(t, w, [...sendFields(), kinshipPart(list)]);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect((await view(w)).kinship).toEqual(list);
  });

  it('⭐ AC2 / Trap 12 — a name with a combining mark and a bidi control round-trips BYTE FOR BYTE; no list ⇒ NULL; the audit says has_kinship only', async () => {
    const w = await world();
    const typed = '  अमि\u0301त \u202eऋषि  ';
    const before = t.auditSink.events.length;
    const r = await send(t, w, [...sendFields(), kinshipPart([{ relation: 'son', name: typed }])]);
    expect(r.status).toBe(201);
    const v = await view(w);
    expect((v.kinship as { name: string }[])[0]!.name).toBe(typed);
    const [row] = await rows<{ kinship_ciphertext: string | null }>(t, `SELECT kinship_ciphertext FROM memorial_submissions WHERE submission_id = $1`, [r.body.submissionId]);
    expect(row!.kinship_ciphertext).toMatch(/^enc:v1:/); // Tier-1, ⛔ plaintext
    expect(row!.kinship_ciphertext).not.toContain('अमि');
    // ⛔ No list ⇒ the column stays NULL.
    const w2 = await world();
    const r2 = await send(t, w2, sendFields());
    const [row2] = await rows<{ kinship_ciphertext: string | null }>(t, `SELECT kinship_ciphertext FROM memorial_submissions WHERE submission_id = $1`, [r2.body.submissionId]);
    expect(row2!.kinship_ciphertext).toBeNull();
    expect((await view(w2)).kinship).toBeNull();
    // The audit lines carry ⛔ name and ⛔ digest of the list.
    expect(JSON.stringify(t.auditSink.events.slice(before))).not.toContain('अमि');
    // RP32 — "has_kinship only", PROVEN: each Send's intent hash equals the one recomputed from the handler's canonical shape with
    // `has_kinship` as it should be — dropping the key fails both, and the TWO Sends (true, then false) catch a hard-coded value.
    // ⚠ The shape is copied from the handler (as the decide leg's is): a new key there fails this leg too, on purpose.
    const sendHash = (sw: MemorialWorld, recipient: string, hasKinship: boolean): string =>
      createHash('sha256')
        .update(
          canonicalJsonStringify({
            pool_id: sw.poolId,
            has_photo: false,
            has_kinship: hasKinship,
            keep_previous_photo: false,
            authorisation_copy_version: CURRENT_VERSION,
            authorisation_locale: 'hi',
            handover_recipient: recipient,
          }),
        )
        .digest('hex');
    for (const [sw, id, hasKinship] of [[w, r.body.submissionId, true], [w2, r2.body.submissionId, false]] as const) {
      const [sub] = await rows<{ handover_recipient: string }>(t, `SELECT handover_recipient FROM memorial_submissions WHERE submission_id = $1`, [id]);
      const intents = await rows<{ request_payload_hash: string }>(
        t,
        `SELECT request_payload_hash FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'memorial.submission.create' AND resource_locator = $2`,
        [sw.pariwarId, `memorial-pool:${sw.poolId}`],
      );
      expect(intents).toHaveLength(1);
      expect(intents[0]!.request_payload_hash).toBe(sendHash(sw, sub!.handover_recipient, hasKinship));
    }
  });

  it('AC6 / KL16 — the member view: the list as SENT (ticks included), kinshipLeftOut, guardianDeclaration true under v4', async () => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const v = await view(w);
    expect(v.kinship).toEqual(LIST);
    expect(v.kinshipLeftOut).toEqual([]);
    expect(v.guardianDeclaration).toBe(true);
    const d = await decide(w, r.body.submissionId as string, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 2, reason: 'identifies_a_child' }] });
    expect(d.statusCode, d.body).toBe(200);
    const after = await view(w);
    expect(after.kinship).toEqual(LIST); // as sent, ⛔ as approved
    expect(after.kinshipLeftOut).toEqual([{ index: 2, reason: 'identifies_a_child' }]);
  });

  it('AC5 — the decide route: the validator problems; a kinship-only approved_with_omissions lands; the audit carries indexes, ⛔ a name', async () => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const id = r.body.submissionId as string;
    for (const [payload, problem] of [
      [{ action: 'approved', kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }] }, 'action_shape'],
      [{ action: 'not_approved', reasonCode: 'against_the_law', kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }] }, 'action_shape'],
      [{ action: 'approved_with_omissions', kinshipLeftOut: [{ index: 4, reason: 'against_the_law' }] }, 'kinship_index_out_of_range'],
      [{ action: 'approved_with_omissions', kinshipLeftOut: [{ index: 1, reason: 'against_the_law' }, { index: 1, reason: 'against_the_law' }] }, 'kinship_order'],
      [{ action: 'approved_with_omissions', kinshipLeftOut: [{ index: 2, reason: 'against_the_law' }, { index: 0, reason: 'against_the_law' }] }, 'kinship_order'],
    ] as const) {
      const res = await decide(w, id, payload);
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: 'memorial_review.invalid_omissions', details: { problem } } });
    }
    // ⛔ A name ever rides the input (`.strict()`).
    const named = await decide(w, id, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 0, reason: 'against_the_law', name: 'नया' }] });
    expect(named.statusCode).toBe(400);
    const before = t.auditSink.events.length;
    const ok = await decide(w, id, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }, { index: 3, reason: 'identifies_a_child' }] });
    expect(ok.statusCode, ok.body).toBe(200);
    const [dec] = await rows<{ kinship_omissions: unknown }>(t, `SELECT kinship_omissions FROM memorial_review_decisions WHERE submission_id = $1`, [id]);
    expect(dec!.kinship_omissions).toEqual([{ index: 0, reason: 'against_the_law' }, { index: 3, reason: 'identifies_a_child' }]);
    expect(JSON.stringify(t.auditSink.events.slice(before))).not.toContain('परीक्षा');
    // The audit intent's payload hash carries `kinship_left_out` (indexes + reasons): recomputed here from the same canonical
    // shape, and ≠ the hash of the SAME decision with an empty list — so dropping the key, or its content, is caught.
    const intentHash = (kinshipLeftOut: unknown): string =>
      createHash('sha256')
        .update(
          canonicalJsonStringify({
            submission_id: id,
            action: 'approved_with_omissions',
            omissions: [],
            photo_left_out_reason: null,
            kinship_left_out: kinshipLeftOut,
            reason_code: null,
            has_internal_note: false,
          }),
        )
        .digest('hex');
    const intents = await rows<{ request_payload_hash: string }>(
      t,
      `SELECT request_payload_hash FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'memorial.review.decide' AND resource_locator = $2`,
      [w.pariwarId, `memorial:${id}`],
    );
    expect(intents).toHaveLength(1);
    expect(intents[0]!.request_payload_hash).toBe(intentHash([{ index: 0, reason: 'against_the_law' }, { index: 3, reason: 'identifies_a_child' }]));
    expect(intents[0]!.request_payload_hash).not.toBe(intentHash([]));
    // Kinship omissions on a version with ⛔ list.
    const w2 = await world();
    const r2 = await send(t, w2, sendFields());
    const none = await decide(w2, r2.body.submissionId as string, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }] });
    expect(none.json()).toMatchObject({ error: { details: { problem: 'kinship_without_list' } } });
  });

  it('AC5 / AC14 — the review detail returns the list (ticks shown to the reviewer), decision.kinshipLeftOut and guardianDeclaration', async () => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
    const id = r.body.submissionId as string;
    await decide(w, id, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 1, reason: 'identifies_a_child' }] });
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const detail = await panel.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}` });
    expect(detail.statusCode, detail.body).toBe(200);
    const v = detail.json<{ chain: Record<string, unknown>[] }>().chain[0]!;
    expect(v.kinship).toEqual(LIST);
    expect(v.guardianDeclaration).toBe(true);
    expect((v.decision as { kinshipLeftOut: unknown }).kinshipLeftOut).toEqual([{ index: 1, reason: 'identifies_a_child' }]);
    // A historical v3 row: ⛔ declaration.
    await rows(t, `UPDATE memorial_submissions SET authorisation_copy_version = '2026-10-25.v3-pending-hi-review' WHERE submission_id = $1`, [id]);
    const v3 = (await panel.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}` })).json<{ chain: Record<string, unknown>[] }>().chain[0]!;
    expect(v3.guardianDeclaration).toBe(false);
  });

  it('⭐ AC7 / AC15 — the public wire: grouped surviving rows, a name with a direction control isolated; ⛔ index, ⛔ reason, ⛔ inPhoto, ⛔ count; the wire’s `kinship` with a left-out entry equals the wire’s `kinship` of a list that never held it', async () => {
    // A: interleaved list, the second son left out.
    const a = await world();
    const ra = await send(t, a, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
    await decide(a, ra.body.submissionId as string, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 2, reason: 'identifies_a_child' }] });
    // B: a list that never held that son, in another order.
    const b = await world();
    const never = [LIST[1], LIST[3], LIST[0]];
    const rb = await send(t, b, [...sendFields(), ...photoParts(), kinshipPart(never)]);
    expect((await decide(b, rb.body.submissionId as string, { action: 'approved' })).statusCode).toBe(200);
    const pa = await pageMemorial(a);
    const pb = await pageMemorial(b);
    const expected = [
      { relation: 'wife', names: ['परीक्षा-पत्नी'] },
      { relation: 'son', names: ['परीक्षा-पुत्र एक'] },
      { relation: 'daughters_daughter', names: ['परीक्षा-नातिन'] },
    ];
    expect(pa.memorial?.kinship).toEqual(expected);
    expect(pb.memorial?.kinship).toEqual(pa.memorial?.kinship);
    // The field NAMES a leak would take are camelCase (`inPhoto`, `kinshipLeftOut`, `kinshipOmissions`), so the match is
    // case-insensitive — and over the MEMORIAL object only: the page's other keys carry legitimate `…Count` / `…Account…` names.
    const LEAK_TOKENS = ['inphoto', 'index', 'leftout', 'omission', 'reason', 'count'];
    const leaks = (wire: string): string[] => LEAK_TOKENS.filter((token) => wire.toLowerCase().includes(token));
    expect(leaks(JSON.stringify(pa.memorial))).toEqual([]);
    // Not vacuous: the same match DOES fire on each shape a leak would take.
    expect(leaks(JSON.stringify({ ...pa.memorial, inPhoto: true, kinshipLeftOut: [{ index: 2, reason: 'x' }], kinshipOmissions: [], leftOutCount: 1 }))).toEqual(LEAK_TOKENS);
    // The VALUES that must not cross: the reason code, and the left-out entry's name.
    for (const forbidden of ['identifies_a_child', 'परीक्षा-पुत्र दो']) expect(pa.raw).not.toContain(forbidden);
  });

  it('AC7 — every entry left out ⇒ kinship []; an unclosed RLO in one name is closed inside that name', async () => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), kinshipPart([{ relation: 'son', name: 'क' }, { relation: 'son', name: 'ख' }])]);
    await decide(w, r.body.submissionId as string, {
      action: 'approved_with_omissions',
      kinshipLeftOut: [{ index: 0, reason: 'against_the_law' }, { index: 1, reason: 'against_the_law' }],
    });
    expect((await pageMemorial(w)).memorial?.kinship).toEqual([]);

    const w2 = await world();
    const r2 = await send(t, w2, [...sendFields(), kinshipPart([{ relation: 'son', name: 'abc\u202edef' }, { relation: 'son', name: 'ghi' }])]);
    await decide(w2, r2.body.submissionId as string, { action: 'approved' });
    const names = ((await pageMemorial(w2)).memorial?.kinship as { names: string[] }[])[0]!.names;
    expect(names[0]).toBe('\u2068abc\u202edef\u202c\u2069'); // isolated, the override closed INSIDE the first name
    expect(names[1]).toBe('ghi');
  });

  it.each([
    ['the erasure sentinel', async (w: MemorialWorld) => encryptMemorialField(memberDomain.ANONYMIZED_SENTINEL, w.pariwarId, t.deps.encryption)],
    ['unparsable JSON', async (w: MemorialWorld) => encryptMemorialField('[{"relation":', w.pariwarId, t.deps.encryption)],
    ['a schema failure', async (w: MemorialWorld) => encryptMemorialField('[{"relation":"uncle","name":"x"}]', w.pariwarId, t.deps.encryption)],
    ['a bad envelope', async () => 'enc:v1:not-an-envelope'],
  ])('⭐ KL10 — %s in kinship_ciphertext drops the WHOLE memorial (the page stays)', async (_why, cipher) => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), kinshipPart(LIST.slice(0, 1))]);
    await decide(w, r.body.submissionId as string, { action: 'approved' });
    expect((await pageMemorial(w)).memorial).not.toBeNull();
    await rows(t, `UPDATE memorial_submissions SET kinship_ciphertext = $2 WHERE submission_id = $1`, [r.body.submissionId, await cipher(w)]);
    expect((await pageMemorial(w)).memorial).toBeNull();
  });

  it.each(UNREADABLE_LISTS)(
    '⭐ AC6 / KL9 — %s in kinship_ciphertext: the member view and the review detail say unavailable (the detail still decrypts the words); canSend and canWithdraw false',
    async (_why, cipher) => {
      const w = await world();
      const r = await send(t, w, [...sendFields(), kinshipPart(LIST.slice(0, 1))]);
      const id = r.body.submissionId as string;
      // Not approved, so a re-send is open — the control proves `canSend` is true while the list reads, and the failure turns it off.
      expect((await decide(w, id, { action: 'not_approved', reasonCode: 'against_the_law' })).statusCode).toBe(200);
      expect(await view(w)).toMatchObject({ kinship: LIST.slice(0, 1), unavailable: null, canSend: true });
      await rows(t, `UPDATE memorial_submissions SET kinship_ciphertext = $2 WHERE submission_id = $1`, [id, await cipher(t, w)]);
      // The member view: the words' failure — everything `null`, nothing the app can send over or withdraw.
      expect(await view(w)).toMatchObject({ body: null, altText: null, kinship: null, unavailable: 'memorial.unavailable_now', canSend: false, canWithdraw: false });
      // The review detail: the words decrypt, the list does not — `unavailable` is how the screen learns it (it then hides the form).
      const panel = await h.staff(w.pariwarId, 'trustee_panel');
      const detail = await panel.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}` });
      expect(detail.statusCode, detail.body).toBe(200);
      expect(detail.json<{ chain: Record<string, unknown>[] }>().chain[0]).toMatchObject({
        body: expect.any(String),
        kinship: null,
        unavailable: 'memorial.unavailable_now',
      });
    },
  );

  it('AC8 — the helpline drive view shows the SAME rows as the page (⛔ tick); a sentinel list makes it not_found', async () => {
    const w = await world();
    const r = await send(t, w, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
    const id = r.body.submissionId as string;
    await decide(w, id, { action: 'approved_with_omissions', kinshipLeftOut: [{ index: 0, reason: 'attacks_someone_named' }] });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const url = `/api/v1/p/${w.pariwarId}/memorial-takedowns/drives/${w.poolId}`;
    const dv = await op.inject({ method: 'GET', url });
    expect(dv.statusCode, dv.body).toBe(200);
    const shown = dv.json<{ shown: { kinship: unknown } }>().shown;
    expect(shown.kinship).toEqual((await pageMemorial(w)).memorial?.kinship);
    expect(dv.body).not.toContain('inPhoto');
    await rows(t, `UPDATE memorial_submissions SET kinship_ciphertext = $2 WHERE submission_id = $1`, [
      id,
      await encryptMemorialField(memberDomain.ANONYMIZED_SENTINEL, w.pariwarId, t.deps.encryption),
    ]);
    const gone = await op.inject({ method: 'GET', url });
    expect(gone.statusCode).toBe(404);
  });

  it.each(UNREADABLE_LISTS)(
    '⭐ AC8 / KL10 — %s in kinship_ciphertext: the helpline view reads the memorial as unreadable (no words, no photo, no list) — the page drops it whole; the submissionId stays for the take-down',
    async (_why, cipher) => {
      const w = await world();
      const r = await send(t, w, [...sendFields(), ...photoParts(), kinshipPart(LIST)]);
      const id = r.body.submissionId as string;
      expect((await decide(w, id, { action: 'approved' })).statusCode).toBe(200);
      const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
      const url = `/api/v1/p/${w.pariwarId}/memorial-takedowns/drives/${w.poolId}`;
      // Control: while the list reads, the words, the photo and the list are all "on the page now".
      const ok = (await op.inject({ method: 'GET', url })).json<{ shown: Record<string, unknown> }>().shown;
      expect(ok).toMatchObject({ submissionId: id, hasPhoto: true, photoUrl: expect.any(String), words: expect.any(Array) });
      expect(ok['kinship']).not.toBeNull();
      expect((await pageMemorial(w)).memorial).not.toBeNull();

      await rows(t, `UPDATE memorial_submissions SET kinship_ciphertext = $2 WHERE submission_id = $1`, [id, await cipher(t, w)]);
      const before = t.auditSink.events.length;
      const dv = await op.inject({ method: 'GET', url });
      expect(dv.statusCode, dv.body).toBe(200);
      expect(dv.json<{ shown: unknown }>().shown).toEqual({
        submissionId: id,
        sentAt: expect.any(String),
        words: null,
        hasPhoto: false,
        photoUrl: null,
        altText: null,
        kinship: null,
      });
      // ⛔ No signed URL minted for a photo the page does not show, and ⛔ no photo line for it.
      expect(t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.photo.url')).toEqual([]);
      // The page's side of the same fact: it carries no memorial.
      expect((await pageMemorial(w)).memorial).toBeNull();
    },
  );
});
