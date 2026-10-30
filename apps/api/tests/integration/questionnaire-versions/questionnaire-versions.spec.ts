// Story 6.33 (Task 6; AC8, AC12) — the questionnaire chain through HTTP: 403 by key (⛔ `state_trustee`, ⛔ a Pariwar Admin
// on the global acts); propose → approve (both ticks, the author may approve) → the Super Admin's step-up → make live for ONE
// Pariwar ⇒ the neighbours' questionnaire for a NEW request is the new version (I4 — ⛔ before); the validator's 422 with
// its problems; return / withdraw (`not_author`); the 404 rule (another Pariwar's open proposal ⇒ 404 — and a separate
// schema-shape assertion, ⛔ `not.toHaveProperty` on a 404); the global list / detail / pariwars-keeping-own; direct and
// revert; an idempotent REPLAY returns the RECORDED response; every step audited (`audit_log_entries`) with ⛔ question
// text. Every target is a fresh Pariwar (⛔ an all-Pariwar version is committed); the chain rows are removed after.

import { randomUUID } from 'node:crypto';

import { QuestionnaireStepResponse, QuestionnaireVersionDetailResponse, QuestionnaireVersionListResponse } from '@twt/contracts';
import { questionnaires, questionnaireVersions } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type CapturingStepUpDelivery, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const W = (en: string, hi: string) => ({ en, hi });
/** A staff question (the draft wire) — about the deceased member, ⛔ health. */
const staffQuestion = (key = 'water_source', over: Json = {}) => ({
  key,
  kind: 'single',
  text: W('Where did {member} get water?', '{member} पानी कहाँ से लाते थे?'),
  options: [
    { code: 'well', text: W('A well', 'कुआँ') },
    { code: 'tap', text: W('A tap', 'नल') },
  ],
  showIf: null,
  health: false,
  ...over,
});
/** v4's seven ruled questions by key, in v4's pages, + one staff page. */
const draftPages = (extra: Json = staffQuestion()) => [
  { questions: [{ ruled: true, key: 'has_died' }, { ruled: true, key: 'death_date' }] },
  { questions: [{ ruled: true, key: 'how_known' }, { ruled: true, key: 'relationship' }] },
  { questions: [{ ruled: true, key: 'death_cause' }, { ruled: true, key: 'death_illness' }] },
  { questions: [{ ruled: true, key: 'callback_consent' }] },
  { questions: [extra] },
];

describe.skipIf(!hasDatabase)('Story 6.33 — the questionnaire chain through HTTP', { timeout: 60000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const versionIds = new Set<string>();

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(`DELETE FROM questionnaire_version_steps WHERE version_id = ANY($1)`, [[...versionIds]]);
      await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [[...versionIds]]);
      await c.query('COMMIT');
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

  async function actor(pariwarId: string, role: string, dim: string, value: string | null, displayName: string): Promise<Client> {
    return (await actorWithId(pariwarId, role, dim, value, displayName)).client;
  }
  async function actorWithId(pariwarId: string, role: string, dim: string, value: string | null, displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `qv-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [userId, pariwarId, role, dim, value]);
    return { client, userId };
  }
  const pariwarAdmin = (p: string, name = 'Asha (Pariwar Admin)') => actor(p, 'pariwar_admin', 'pariwar', p, name);
  const superAdmin = (p: string) => actor(p, 'super_admin', 'global', null, 'Sunita (Super Admin)');

  async function elevate(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'questionnaire_publish' } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  const T = (p: string) => `/api/v1/p/${p}/questionnaire-versions`;
  const G = '/api/v1/global/questionnaire-versions';
  const post = (c: Client, url: string, payload: Json, key = randomUUID()) => c.inject({ method: 'POST', url, payload, headers: { 'idempotency-key': key } });
  const errOf = (r: { body: string }) => (JSON.parse(r.body) as { error: { code: string; details?: Json } }).error;
  const TICKS = { hindiReviewed: true, classificationAttested: true };

  async function propose(c: Client, p: string, extra?: Json): Promise<string> {
    const r = await post(c, T(p), { kind: 'peer_mesh', pages: draftPages(extra) });
    expect(r.statusCode, r.body).toBe(200);
    const out = QuestionnaireStepResponse.parse(r.json());
    versionIds.add(out.versionId);
    return out.versionId;
  }

  it('403 by key: ⛔ `state_trustee` on any route (an inert ceiling); ⛔ a Pariwar Admin on the GLOBAL acts', async () => {
    const p = randomUUID();
    const st = await actor(p, 'state_trustee', 'state', 'Bihar', 'ST');
    expect((await st.inject({ method: 'GET', url: T(p) })).statusCode).toBe(403);
    expect((await post(st, T(p), { kind: 'peer_mesh', pages: draftPages() })).statusCode).toBe(403);
    const pa = await pariwarAdmin(p);
    expect((await pa.inject({ method: 'GET', url: G })).statusCode).toBe(403);
    expect((await post(pa, `${G}/peer_mesh.v4/make-live`, { targetPariwarId: p })).statusCode).toBe(403);
    expect((await post(pa, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p })).statusCode).toBe(403);
  });

  it('⭐ the chain end to end: propose → approve (the author) → step-up → make live for ONE Pariwar ⇒ in force there (⛔ before); audited, ⛔ question text', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const v = await propose(pa, p);
    let list = QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json());
    expect(list.inForce.find((x) => x.kind === 'peer_mesh')).toMatchObject({ versionId: 'peer_mesh.v4', source: 'code' });
    expect(list.versions.find((x) => x.versionId === v)).toMatchObject({ stage: 'proposed', authoredByMe: true, authoredByDisplay: 'Asha (Pariwar Admin)', historyElsewhere: false });
    const approved = await post(pa, `${T(p)}/${v}/approve`, TICKS);
    expect(approved.statusCode, approved.body).toBe(200);
    const sa = await superAdmin(p);
    const noStepUp = await post(sa, `${G}/${v}/make-live`, { targetPariwarId: p });
    expect(noStepUp.statusCode).toBe(403);
    expect(errOf(noStepUp).code).toBe('auth.step_up_required');
    await elevate(sa);
    const live = await post(sa, `${G}/${v}/make-live`, { targetPariwarId: p });
    expect(live.statusCode, live.body).toBe(200);
    list = QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json());
    expect(list.inForce.find((x) => x.kind === 'peer_mesh')).toMatchObject({ versionId: v, source: 'own' });
    const detail = QuestionnaireVersionDetailResponse.parse((await pa.inject({ method: 'GET', url: `${T(p)}/${v}` })).json());
    expect(detail.stage).toBe('published');
    const staff = detail.questions!.find((q) => q.key === 'water_source')!;
    expect(staff).toMatchObject({ ruled: false, sensitive: true, health: false, counselPending: false, change: 'new', words: W('Where did {member} get water?', '{member} पानी कहाँ से लाते थे?') });
    expect(detail.questions!.find((q) => q.key === 'has_died')).toMatchObject({ ruled: true, change: 'unchanged' });
    expect(detail.steps.map((s) => s.step)).toEqual(['proposed', 'approved', 'made_live']);
    const audits = await td.pool.query<{ action: string; pariwar_id: string }>(
      `SELECT action, pariwar_id FROM audit_log_entries WHERE resource_locator = $1 ORDER BY recorded_at`,
      [`questionnaire:${v}`],
    );
    expect(audits.rows.map((a) => a.action)).toEqual(expect.arrayContaining(['admin_questionnaire.approved', 'admin_questionnaire.made_live']));
    const all = await td.pool.query(`SELECT * FROM audit_log_entries WHERE resource_locator LIKE 'questionnaire:%' AND actor_id IS NOT NULL ORDER BY recorded_at DESC LIMIT 20`);
    expect(JSON.stringify(all.rows)).not.toMatch(/water|पानी/);
  });

  it('the validator refuses 422 with its PROBLEMS (a staff question about alcohol; a reserved key; a date question at the wire ⇒ 400)', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const alcohol = await post(pa, T(p), { kind: 'peer_mesh', pages: draftPages(staffQuestion('habits', { text: W('Did {member} drink alcohol?', 'क') })) });
    expect(alcohol.statusCode).toBe(422);
    expect(errOf(alcohol).code).toBe('questionnaire.definition_invalid');
    expect(JSON.stringify(errOf(alcohol).details)).toMatch(/alcohol/);
    const reserved = await post(pa, T(p), { kind: 'peer_mesh', pages: draftPages(staffQuestion('head_letter')) });
    expect(errOf(reserved).code).toBe('questionnaire.definition_invalid');
    expect((await post(pa, T(p), { kind: 'peer_mesh', pages: draftPages(staffQuestion('when_q', { kind: 'date' })) })).statusCode).toBe(400);
    const unknownRuled = await post(pa, T(p), { kind: 'peer_mesh', pages: [...draftPages().slice(0, 4), { questions: [{ ruled: true, key: 'not_ruled' }] }] });
    expect(errOf(unknownRuled).code).toBe('questionnaire.definition_invalid');
  });

  it('approve without the ticks ⇒ 422 each; return (a note) ⇒ terminal; withdraw by another admin ⇒ 403 not_author', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const other = await pariwarAdmin(p, 'Ravi (Pariwar Admin)');
    const v = await propose(pa, p);
    expect(errOf(await post(pa, `${T(p)}/${v}/approve`, { hindiReviewed: false, classificationAttested: true })).code).toBe('questionnaire.hindi_review_required');
    expect(errOf(await post(pa, `${T(p)}/${v}/approve`, { hindiReviewed: true, classificationAttested: false })).code).toBe('questionnaire.classification_attestation_required');
    const notAuthor = await post(other, `${T(p)}/${v}/withdraw`, {});
    expect(notAuthor.statusCode).toBe(403);
    expect(errOf(notAuthor).code).toBe('questionnaire.not_author');
    expect((await post(other, `${T(p)}/${v}/return`, { note: 'Please reword' })).statusCode).toBe(200);
    const again = await post(pa, `${T(p)}/${v}/approve`, TICKS);
    expect(again.statusCode).toBe(409);
    expect(errOf(again).code).toBe('questionnaire.not_approvable');
    expect((await post(pa, `${T(p)}/${v}/return`, { note: '   ' })).statusCode).toBe(400);
  });

  it('⭐ the 404 rule: another Pariwar\'s OPEN proposal ⇒ 404 (and ⛔ listed); a version made live HERE from elsewhere ⇒ 200 with its history elsewhere', async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const pa = await pariwarAdmin(p);
    const qa = await pariwarAdmin(q);
    const v = await propose(pa, p);
    const hidden = await qa.inject({ method: 'GET', url: `${T(q)}/${v}` });
    expect(hidden.statusCode).toBe(404);
    expect(errOf(hidden).code).toBe('questionnaire.not_found');
    expect(QuestionnaireVersionListResponse.parse((await qa.inject({ method: 'GET', url: T(q) })).json()).versions.map((x) => x.versionId)).not.toContain(v);
    await post(pa, `${T(p)}/${v}/approve`, TICKS);
    const sa = await superAdmin(p);
    await elevate(sa);
    expect((await post(sa, `${G}/${v}/make-live`, { targetPariwarId: q })).statusCode).toBe(200);
    const shown = await qa.inject({ method: 'GET', url: `${T(q)}/${v}` });
    expect(shown.statusCode).toBe(200);
    const body = QuestionnaireVersionDetailResponse.parse(shown.json());
    expect(body.historyElsewhere).toBe(true);
    expect(body.steps.map((s) => s.step)).toEqual(['made_live']);
    // ⛔ a Pariwar Admin can act on another Pariwar's version
    expect(errOf(await post(qa, `${T(q)}/${v}/withdraw`, {})).code).toBe('questionnaire.not_found');
  });

  it('the Super Admin\'s GLOBAL reads: every version (with its whole history), the detail, the Pariwars keeping their own version', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const v = await propose(pa, p);
    await post(pa, `${T(p)}/${v}/approve`, TICKS);
    const sa = await superAdmin(p);
    const list = QuestionnaireVersionListResponse.parse((await sa.inject({ method: 'GET', url: `${G}?pariwarId=${p}` })).json());
    expect(list.versions.find((x) => x.versionId === v)).toMatchObject({ stage: 'approved', historyElsewhere: false });
    expect(list.versions.some((x) => x.versionId === 'peer_mesh.v4' && x.stage === 'code')).toBe(true);
    expect(QuestionnaireVersionDetailResponse.parse((await sa.inject({ method: 'GET', url: `${G}/${v}` })).json()).steps).toHaveLength(2);
    await elevate(sa);
    await post(sa, `${G}/${v}/make-live`, { targetPariwarId: p });
    const keeping = (await sa.inject({ method: 'GET', url: `${G}/pariwars-keeping-own?kind=peer_mesh` })).json() as { pariwars: Json[] };
    expect(keeping.pariwars).toContainEqual({ pariwarId: p, name: null, versionId: v });
  });

  it('direct (QE7 (c)) for ONE Pariwar: the reason, both ticks, served at once; revert ⇒ back to v4; nothing to revert ⇒ 409; an idempotent REPLAY returns the RECORDED response', async () => {
    const p = randomUUID();
    const sa = await superAdmin(p);
    await elevate(sa);
    const key = randomUUID();
    const body = { kind: 'peer_mesh', targetPariwarId: p, pages: draftPages(), reason: 'Adding a question for this Pariwar', ...TICKS };
    const first = await post(sa, `${G}/direct`, body, key);
    expect(first.statusCode, first.body).toBe(200);
    const v = QuestionnaireStepResponse.parse(first.json()).versionId;
    versionIds.add(v);
    const replay = await post(sa, `${G}/direct`, body, key);
    expect(replay.json()).toEqual(first.json());
    const count = await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_versions WHERE origin_pariwar_id = $1`, [p]);
    expect(count.rows[0].n).toBe(1);
    const pa = await pariwarAdmin(p);
    expect(QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json()).inForce.find((x) => x.kind === 'peer_mesh')).toMatchObject({ versionId: v });
    expect(QuestionnaireVersionDetailResponse.parse((await sa.inject({ method: 'GET', url: `${G}/${v}` })).json())).toMatchObject({ direct: true, reason: 'Adding a question for this Pariwar' });
    expect((await post(sa, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p })).statusCode).toBe(200);
    expect(QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json()).inForce.find((x) => x.kind === 'peer_mesh')).toMatchObject({ versionId: 'peer_mesh.v4' });
    const nothing = await post(sa, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p });
    expect(nothing.statusCode).toBe(409);
    expect(errOf(nothing).code).toBe('questionnaire.nothing_to_revert');
    expect((await post(sa, `${G}/direct`, { ...body, hindiReviewed: false })).statusCode).toBe(422);
  });

  it('every write needs an Idempotency-Key', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const r = await pa.inject({ method: 'POST', url: T(p), payload: { kind: 'peer_mesh', pages: draftPages() } });
    expect(r.statusCode).toBe(400);
    expect(errOf(r).code).toBe('questionnaire.idempotency_key_required');
  });
  // ── Code review (2026-10-30) — the patches' HTTP legs ───────────────────────────────────────────────────────────────

  it('review RV2 — a version made live for ANOTHER Pariwar: the origin\'s stage is `published` (its withdraw ⇒ 409 not_withdrawable), and the target\'s step is ⛔ DISPLAYED to the origin', async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const pa = await pariwarAdmin(p);
    const v = await propose(pa, p);
    expect((await post(pa, `${T(p)}/${v}/approve`, TICKS)).statusCode).toBe(200);
    const sa = await superAdmin(p);
    await elevate(sa);
    expect((await post(sa, `${G}/${v}/make-live`, { targetPariwarId: q })).statusCode).toBe(200);
    const detail = QuestionnaireVersionDetailResponse.parse((await pa.inject({ method: 'GET', url: `${T(p)}/${v}` })).json());
    expect(detail.stage).toBe('published');
    expect(detail.steps.map((x) => x.step)).toEqual(['proposed', 'approved']); // the made_live for Q is ⛔ shown to P
    const row = QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json()).versions.find((x) => x.versionId === v)!;
    expect(row.stage).toBe('published');
    expect(row.steps.map((x) => x.step)).toEqual(['proposed', 'approved']);
    const withdraw = await post(pa, `${T(p)}/${v}/withdraw`, {});
    expect(withdraw.statusCode).toBe(409);
    expect(errOf(withdraw).code).toBe('questionnaire.not_withdrawable');
    // still in force in Q
    const qa = await pariwarAdmin(q);
    expect(QuestionnaireVersionListResponse.parse((await qa.inject({ method: 'GET', url: T(q) })).json()).inForce.find((x) => x.kind === 'peer_mesh')).toMatchObject({ versionId: v, source: 'own' });
  });

  it("review RV3 — a Pariwar Admin ⛔ bases a proposal on ANOTHER Pariwar's open proposal (422 base_invalid); and a version whose BASE is another Pariwar's open proposal shows the viewer ⛔ change markers or removed keys against it", async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const pa = await pariwarAdmin(p);
    const qa = await pariwarAdmin(q);
    const open = await propose(pa, p);
    const refused = await post(qa, T(q), { kind: 'peer_mesh', baseVersionId: open, pages: draftPages() });
    expect(refused.statusCode).toBe(422);
    expect(errOf(refused).code).toBe('questionnaire.base_invalid');
    // unknown ids are indistinguishable
    const unknown = await post(qa, T(q), { kind: 'peer_mesh', baseVersionId: 'peer_mesh.v9999999', pages: draftPages() });
    expect(errOf(unknown).code).toBe('questionnaire.base_invalid');
    // P bases v2 on ITS OWN open proposal (allowed), approves it, and the Super Admin makes v2 live for Q
    const second = await post(pa, T(p), { kind: 'peer_mesh', baseVersionId: open, pages: draftPages(staffQuestion('other_q')) });
    expect(second.statusCode, second.body).toBe(200);
    const v2 = QuestionnaireStepResponse.parse(second.json()).versionId;
    versionIds.add(v2);
    await post(pa, `${T(p)}/${v2}/approve`, TICKS);
    const sa = await superAdmin(p);
    await elevate(sa);
    expect((await post(sa, `${G}/${v2}/make-live`, { targetPariwarId: q, acknowledgeBaseMoved: true })).statusCode).toBe(200);
    // the ORIGIN compares v2 with its base (the draft it wrote); Q ⛔ may see that draft, so Q's detail carries ⛔ markers
    const forP = QuestionnaireVersionDetailResponse.parse((await pa.inject({ method: 'GET', url: `${T(p)}/${v2}` })).json());
    expect(forP.questions!.some((x) => x.change !== null)).toBe(true);
    expect(forP.removedKeys).toEqual(['water_source']);
    const forQ = QuestionnaireVersionDetailResponse.parse((await qa.inject({ method: 'GET', url: `${T(q)}/${v2}` })).json());
    expect(forQ.questions!.every((x) => x.change === null)).toBe(true);
    expect(forQ.removedKeys).toEqual([]);
  });

  it("review RT6 — withholding is UNIFORM: to Q's admin a version from P carries ⛔ P's uuid, ⛔ its author's name, and its base only once Q may see it; P and the Super Admin see all", async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const pa = await pariwarAdmin(p, 'Meera (Pariwar Admin)');
    const qa = await pariwarAdmin(q);
    const open = await propose(pa, p);
    const second = await post(pa, T(p), { kind: 'peer_mesh', baseVersionId: open, pages: draftPages(staffQuestion('rt6_q')) });
    expect(second.statusCode, second.body).toBe(200);
    const v2 = QuestionnaireStepResponse.parse(second.json()).versionId;
    versionIds.add(v2);
    expect((await post(pa, `${T(p)}/${v2}/approve`, TICKS)).statusCode).toBe(200);
    const sa = await superAdmin(p);
    await elevate(sa);
    expect((await post(sa, `${G}/${v2}/make-live`, { targetPariwarId: q, acknowledgeBaseMoved: true })).statusCode).toBe(200);
    const withheld = { originPariwarId: null, authoredByDisplay: null, baseVersionId: null, historyElsewhere: true };
    expect(QuestionnaireVersionDetailResponse.parse((await qa.inject({ method: 'GET', url: `${T(q)}/${v2}` })).json())).toMatchObject(withheld);
    const qList = QuestionnaireVersionListResponse.parse((await qa.inject({ method: 'GET', url: T(q) })).json());
    expect(qList.versions.find((x) => x.versionId === v2)).toMatchObject(withheld);
    // the origin and the Super Admin: everything
    const named = { originPariwarId: p, authoredByDisplay: 'Meera (Pariwar Admin)', baseVersionId: open };
    expect(QuestionnaireVersionDetailResponse.parse((await pa.inject({ method: 'GET', url: `${T(p)}/${v2}` })).json())).toMatchObject(named);
    expect(QuestionnaireVersionDetailResponse.parse((await sa.inject({ method: 'GET', url: `${G}/${v2}` })).json())).toMatchObject(named);
    // once the base is one Q may SEE (made live for Q — ⛔ for ALL, which would move every later leg's default), it is named to
    // Q — the origin and the author stay withheld
    expect((await post(pa, `${T(p)}/${open}/approve`, TICKS)).statusCode).toBe(200);
    expect((await post(sa, `${G}/${open}/make-live`, { targetPariwarId: q, acknowledgeBaseMoved: true })).statusCode).toBe(200);
    expect(QuestionnaireVersionDetailResponse.parse((await qa.inject({ method: 'GET', url: `${T(q)}/${v2}` })).json())).toMatchObject({ ...withheld, baseVersionId: open });
    const qList2 = QuestionnaireVersionListResponse.parse((await qa.inject({ method: 'GET', url: T(q) })).json());
    expect(qList2.versions.find((x) => x.versionId === v2)).toMatchObject({ ...withheld, baseVersionId: open });
    // review round 4 (RF2) — a version built on a CODE version keeps naming it in the LIST (the code base is ⛔ a listed row: the
    // fallback names it), to its own Pariwar and to the Super Admin
    const codeBased = QuestionnaireVersionListResponse.parse((await pa.inject({ method: 'GET', url: T(p) })).json()).versions.find((x) => x.versionId === open);
    expect(codeBased?.baseVersionId).toMatch(/^peer_mesh\.v\d+$/);
    expect(Number(codeBased!.baseVersionId!.split('.v')[1])).toBeLessThan(1000);
    const saList = QuestionnaireVersionListResponse.parse((await sa.inject({ method: 'GET', url: `${G}?pariwarId=${p}` })).json());
    expect(saList.versions.find((x) => x.versionId === open)?.baseVersionId).toBe(codeBased!.baseVersionId);
    // review round 4 (RF6) — a DIRECT version for P, made live for Q too: its reason (the Super Admin's words, which may name P)
    // is withheld from Q with the rest; P still reads it
    const d = await post(sa, `${G}/direct`, { kind: 'peer_mesh', targetPariwarId: p, pages: draftPages(staffQuestion('rf6_q')), reason: 'For Jaipur only', ...TICKS, acknowledgeBaseMoved: true });
    expect(d.statusCode, d.body).toBe(200);
    const dv = QuestionnaireStepResponse.parse(d.json()).versionId;
    versionIds.add(dv);
    expect((await post(sa, `${G}/${dv}/make-live`, { targetPariwarId: q, acknowledgeBaseMoved: true })).statusCode).toBe(200);
    expect(QuestionnaireVersionDetailResponse.parse((await qa.inject({ method: 'GET', url: `${T(q)}/${dv}` })).json())).toMatchObject({
      direct: true,
      reason: null,
      authoredByDisplay: null,
      originPariwarId: null,
    });
    expect(QuestionnaireVersionDetailResponse.parse((await pa.inject({ method: 'GET', url: `${T(p)}/${dv}` })).json())).toMatchObject({ direct: true, reason: 'For Jaipur only', originPariwarId: p });
  });

  it('review RV4 — an idempotent REPLAY returns the RECORDED response on EVERY write (return / withdraw record `{ done: true }` — ⛔ a 409 "in progress" for the TTL)', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const sa = await superAdmin(p);
    await elevate(sa);
    // propose — the SAME version, one row
    const kPropose = randomUUID();
    const body = { kind: 'peer_mesh', pages: draftPages() };
    const first = await post(pa, T(p), body, kPropose);
    expect(first.statusCode, first.body).toBe(200);
    const v = QuestionnaireStepResponse.parse(first.json()).versionId;
    versionIds.add(v);
    const again = await post(pa, T(p), body, kPropose);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toEqual(first.json());
    expect((await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_versions WHERE origin_pariwar_id = $1`, [p])).rows[0].n).toBe(1);
    // approve
    const kApprove = randomUUID();
    const a1 = await post(pa, `${T(p)}/${v}/approve`, TICKS, kApprove);
    const a2 = await post(pa, `${T(p)}/${v}/approve`, TICKS, kApprove);
    expect([a1.statusCode, a2.statusCode]).toEqual([200, 200]);
    expect(a2.json()).toEqual(a1.json());
    // return — a void write (the case that answered 409 in progress)
    const vr = await propose(pa, p);
    const kReturn = randomUUID();
    const r1 = await post(pa, `${T(p)}/${vr}/return`, { note: 'Please reword' }, kReturn);
    const r2 = await post(pa, `${T(p)}/${vr}/return`, { note: 'Please reword' }, kReturn);
    expect([r1.statusCode, r2.statusCode], r2.body).toEqual([200, 200]);
    expect(r2.json()).toEqual(r1.json());
    // withdraw — a void write
    const vw = await propose(pa, p);
    const kWithdraw = randomUUID();
    const w1 = await post(pa, `${T(p)}/${vw}/withdraw`, {}, kWithdraw);
    const w2 = await post(pa, `${T(p)}/${vw}/withdraw`, {}, kWithdraw);
    expect([w1.statusCode, w2.statusCode], w2.body).toEqual([200, 200]);
    expect(w2.json()).toEqual(w1.json());
    expect((await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_version_steps WHERE version_id = $1 AND step = 'withdrawn'`, [vw])).rows[0].n).toBe(1);
    // make-live and revert (global)
    const kLive = randomUUID();
    const m1 = await post(sa, `${G}/${v}/make-live`, { targetPariwarId: p }, kLive);
    const m2 = await post(sa, `${G}/${v}/make-live`, { targetPariwarId: p }, kLive);
    expect([m1.statusCode, m2.statusCode], m2.body).toEqual([200, 200]);
    expect(m2.json()).toEqual(m1.json());
    expect((await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_version_steps WHERE version_id = $1 AND step = 'made_live'`, [v])).rows[0].n).toBe(1);
    const kRevert = randomUUID();
    const v1 = await post(sa, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p }, kRevert);
    const v2 = await post(sa, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p }, kRevert);
    expect([v1.statusCode, v2.statusCode], v2.body).toEqual([200, 200]);
    expect(v2.json()).toEqual(v1.json());
  });

  it('review RV31 — the refusal codes over HTTP: not_publishable (unapproved), not_withdrawable (returned), base_moved (acknowledgeable), ruled_base_moved (⛔ acknowledgeable; approve AND make-live)', async () => {
    const p = randomUUID();
    const pa = await pariwarAdmin(p);
    const sa = await superAdmin(p);
    await elevate(sa);
    // not_publishable — an UNAPPROVED proposal
    const open = await propose(pa, p);
    const early = await post(sa, `${G}/${open}/make-live`, { targetPariwarId: p });
    expect(early.statusCode).toBe(409);
    expect(errOf(early).code).toBe('questionnaire.not_publishable');
    // not_withdrawable — a RETURNED proposal
    expect((await post(pa, `${T(p)}/${open}/return`, { note: 'reword' })).statusCode).toBe(200);
    const w = await post(pa, `${T(p)}/${open}/withdraw`, {});
    expect(w.statusCode).toBe(409);
    expect(errOf(w).code).toBe('questionnaire.not_withdrawable');
    // base_moved — a SECOND approved proposal (based on v4) when the first is now in force
    const first = await propose(pa, p);
    const second = await propose(pa, p, staffQuestion('another_q'));
    for (const v of [first, second]) expect((await post(pa, `${T(p)}/${v}/approve`, TICKS)).statusCode).toBe(200);
    expect((await post(sa, `${G}/${first}/make-live`, { targetPariwarId: p })).statusCode).toBe(200);
    const moved = await post(sa, `${G}/${second}/make-live`, { targetPariwarId: p });
    expect(moved.statusCode).toBe(409);
    expect(errOf(moved).code).toBe('questionnaire.base_moved');
    expect(errOf(moved).details).toMatchObject({ baseVersionId: 'peer_mesh.v4', inForce: first });
    expect((await post(sa, `${G}/${second}/make-live`, { targetPariwarId: p, acknowledgeBaseMoved: true })).statusCode).toBe(200);
    // ruled_base_moved — a version recorded on the OLDER ruled base (v3): refused on approve AND on make-live, acknowledgement or not
    const v3 = questionnaires.PEER_MESH_QUESTIONNAIRE_V3;
    const id = randomUUID();
    const n = 1_700_000 + Math.floor(Math.random() * 99_999);
    const stale = questionnaireVersions.toStoredDefinition({
      ...v3,
      versionId: `peer_mesh.v${n}`,
      version: n,
      scope: { kind: 'all' },
      status: 'live',
      approvedBy: [...v3.approvedBy, `chain:${id}`],
      pages: [
        ...v3.pages,
        { questions: [{ ...questionnaires.questionsOf(questionnaires.PEER_MESH_QUESTIONNAIRE_V4)[0]!, key: 'water_source', kind: 'single', text: W('Where did {member} get water?', '{member} पानी कहाँ से लाते थे?'), options: [{ code: 'well', text: W('A well', 'कुआँ') }, { code: 'tap', text: W('A tap', 'नल') }], optional: true, showIf: null, sensitive: true, warning: false, approvedBy: [`chain:${id}`], health: false, counselBasis: null, copyKey: undefined }] },
      ],
    } as never);
    await td.pool.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v3', 'peer_mesh.v3', $4, $5, 'pa', 'PA', false, NULL)`,
      [id, n, `peer_mesh.v${n}`, p, JSON.stringify(stale)],
    );
    versionIds.add(`peer_mesh.v${n}`);
    await td.pool.query(`INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display) VALUES ($1, 'proposed', $2, 'pa', 'PA')`, [`peer_mesh.v${n}`, p]);
    const approveStale = await post(pa, `${T(p)}/peer_mesh.v${n}/approve`, TICKS);
    expect(approveStale.statusCode).toBe(409);
    expect(errOf(approveStale).code).toBe('questionnaire.ruled_base_moved');
    await td.pool.query(
      `INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display, hindi_reviewed, classification_attested) VALUES ($1, 'approved', $2, 'pa', 'PA', true, true)`,
      [`peer_mesh.v${n}`, p],
    );
    const liveStale = await post(sa, `${G}/peer_mesh.v${n}/make-live`, { targetPariwarId: p, acknowledgeBaseMoved: true });
    expect(liveStale.statusCode).toBe(409);
    expect(errOf(liveStale).code).toBe('questionnaire.ruled_base_moved');
  });

  it('⭐ review RV11 / family 3 — a TAMPERED session (a stranger\'s user id) is DENIED on every one of the 7 mutation routes, ⛔ nothing written; approve and return across Pariwars are 404', async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const A = await actorWithId(p, 'pariwar_admin', 'pariwar', p, 'Asha (Pariwar Admin)');
    const S = await actorWithId(p, 'super_admin', 'global', null, 'Sunita (Super Admin)');
    await elevate(S.client);
    // ⭐ POSITIVE CONTROLS — the SAME clients DO write on every route, so the refusals below are the actor boundary, ⛔ a session that never took
    const cApprove = await propose(A.client, p);
    expect((await post(A.client, `${T(p)}/${cApprove}/approve`, TICKS)).statusCode).toBe(200);
    const cReturn = await propose(A.client, p);
    expect((await post(A.client, `${T(p)}/${cReturn}/return`, { note: 'control' })).statusCode).toBe(200);
    const cWithdraw = await propose(A.client, p);
    expect((await post(A.client, `${T(p)}/${cWithdraw}/withdraw`, {})).statusCode).toBe(200);
    expect((await post(S.client, `${G}/${cApprove}/make-live`, { targetPariwarId: p })).statusCode).toBe(200);
    const cDirect = await post(S.client, `${G}/direct`, { kind: 'peer_mesh', targetPariwarId: p, pages: draftPages(staffQuestion('direct_q')), reason: 'control', ...TICKS });
    expect(cDirect.statusCode, cDirect.body).toBe(200);
    versionIds.add(QuestionnaireStepResponse.parse(cDirect.json()).versionId);
    expect((await post(S.client, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p })).statusCode).toBe(200);
    // the open objects the tampered session will try to act on
    const open = await propose(A.client, p, staffQuestion('open_q'));
    const approved = await propose(A.client, p, staffQuestion('approved_q'));
    expect((await post(A.client, `${T(p)}/${approved}/approve`, TICKS)).statusCode).toBe(200);
    const live = await post(S.client, `${G}/direct`, { kind: 'peer_mesh', targetPariwarId: p, pages: draftPages(staffQuestion('live_q')), reason: 'live', ...TICKS, acknowledgeBaseMoved: true });
    expect(live.statusCode, live.body).toBe(200);
    const liveId = QuestionnaireStepResponse.parse(live.json()).versionId;
    versionIds.add(liveId);
    const counts = async () => ({
      versions: (await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_versions WHERE origin_pariwar_id = $1`, [p])).rows[0].n as number,
      steps: (await td.pool.query(`SELECT count(*)::int AS n FROM questionnaire_version_steps s JOIN questionnaire_versions v ON v.version_id = s.version_id WHERE v.origin_pariwar_id = $1`, [p])).rows[0].n as number,
    });
    const before = await counts();
    // ⛔ ANOTHER Pariwar's admin: approve and return are 404 (indistinguishable from unknown)
    const Q = await pariwarAdmin(q, 'Quinn (Pariwar Admin)');
    expect((await post(Q, `${T(q)}/${open}/approve`, TICKS)).statusCode).toBe(404);
    expect((await post(Q, `${T(q)}/${open}/return`, { note: 'not yours' })).statusCode).toBe(404);
    // TAMPER both sessions
    for (const who of [A, S]) {
      await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), who.userId]);
    }
    const tenant = [
      post(A.client, T(p), { kind: 'peer_mesh', pages: draftPages(staffQuestion('tamper_q')) }),
      post(A.client, `${T(p)}/${open}/approve`, TICKS),
      post(A.client, `${T(p)}/${open}/return`, { note: 'tampered' }),
      post(A.client, `${T(p)}/${open}/withdraw`, {}),
    ];
    for (const r of await Promise.all(tenant)) expect(r.statusCode, r.body).toBe(404); // EXACTLY 404 — a 401 would pass without ever reaching scope resolution
    const global = [
      post(S.client, `${G}/${approved}/make-live`, { targetPariwarId: p }),
      post(S.client, `${G}/direct`, { kind: 'peer_mesh', targetPariwarId: p, pages: draftPages(staffQuestion('tamper_d')), reason: 'tampered', ...TICKS }),
      post(S.client, `${G}/revert`, { kind: 'peer_mesh', targetPariwarId: p }),
    ];
    for (const r of await Promise.all(global)) {
      expect(r.statusCode, r.body).toBe(403);
      expect(errOf(r).code).not.toBe('auth.step_up_required'); // the ACTOR boundary, ⛔ a missing elevation
    }
    expect(await counts()).toEqual(before);
    // ⛔ nothing moved: the open proposal is still only `proposed`, the approved one not live, the live direct version still live
    const stepsOf = async (v: string) => (await td.pool.query(`SELECT step FROM questionnaire_version_steps WHERE version_id = $1 ORDER BY seq`, [v])).rows.map((x) => x.step);
    expect(await stepsOf(open)).toEqual(['proposed']);
    expect(await stepsOf(approved)).toEqual(['proposed', 'approved']);
    expect(await stepsOf(liveId)).toEqual(['proposed', 'approved', 'made_live']);
  });
});
