// Story 6.32 (Task 5 / 8.2; AC3, AC4, AC6 display, AC8, AC10) — the inspector's questionnaire for the family through HTTP, on
// a live DB. One HTTP request per step (each its own scope transaction); the completion through the REAL route.
//   · AC3 — GET / PUT: the guard order and typed refusals (401 ⛔ session; 403 a non-assigned Block Admin, the denial audited;
//     404 a certificate check; 409 a completed visit / a certificate-check save; 422 invalid, incl. the shipped v1's pending
//     cause; 400 a malformed body); the audit lines carry ⛔ value; an unchanged save writes ⛔ audit line;
//   · AC10 — the head's letter is served on EVERY full visit, the served definition byte-identical with 0 / 3 / 5 neighbours;
//   · AC4 — `complete` succeeds with ZERO answers, and with the letter `not_collected`;
//   · AC6 — ③ shown with the family's answer in English words (`familyAnswers`) on the completion AND the re-read (the family's
//     cause saved through the domain writer with an INJECTED registry — the shipped v1 keeps it `'pending'`, TR7);
//   · AC8 — the family account rides the neighbours' section: present for the District Admin (labels in English, the cause
//     decrypted), on an `empty` section (⛔ selection — the no-one-asked claim), ABSENT for a hidden reader; ⛔ on the
//     claim-wide list read;
//   · the code review's R2 (an erased cause ⛔ blocks the letter), R3 (a zero-answer visit is in the account), R4 (the path's
//     claim is BOUND to the assignment) and R6 (a tampered session naming a non-human actor is refused, ⛔ a row written).

import { randomUUID } from 'node:crypto';

import { PeerMeshSection } from '@twt/contracts';
import { claim, ids, questionnaires } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { assemblePeerMesh } from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { answerCodeIndexes, encryptGroundInspectionField } from '../../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import * as fx from '../_peer-reply-fixture.js';
import { insertDeathCertificate } from '../_nominee-name-check-fixture.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Res = Awaited<ReturnType<Client['inject']>>;
type Json = Record<string, unknown>;

const DISTRICT = 'Patna';
const FAMILY_DATE = '2026-06-15';
const errOf = (res: Res) => res.json<{ error: { code: string; details?: Json } }>().error;

/** v1 with counsel's basis RECORDED — an injected copy (TR7: the shipped v1 stays `'pending'`). */
const RECORDED: questionnaires.QuestionnaireDefinition = {
  ...questionnaires.GROUND_INSPECTION_QUESTIONNAIRE_V1,
  pages: questionnaires.GROUND_INSPECTION_QUESTIONNAIRE_V1.pages.map((p) => ({
    questions: p.questions.map((q) => (q.health ? { ...q, counselBasis: '2026-11-01-400' } : q)),
  })),
};

describe.skipIf(!hasDatabase)('Story 6.32 — the inspector\'s questionnaire through HTTP', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let env: fx.PeerFixtureEnv;
  const createdUserIds: string[] = [];
  /** Chain (database) versions the review legs insert — removed after (append-only ⇒ superuser, replica role). */
  const chainVersionIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    env = { pool: td.pool, deps, app };
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (chainVersionIds.length > 0) {
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query(`DELETE FROM claim_ground_inspection_questionnaires WHERE questionnaire_version_id = ANY($1)`, [chainVersionIds]);
          await c.query(`DELETE FROM questionnaire_version_steps WHERE version_id = ANY($1)`, [chainVersionIds]);
          await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [chainVersionIds]);
          await c.query('COMMIT');
        } catch (e) {
          // Review RP16 — a failing DELETE must ⛔ leave an aborted transaction on a pooled client or skip the user cleanup below.
          await c.query('ROLLBACK').catch(() => undefined);
          console.error('[ground-inspection-questionnaire.spec] chain cleanup:', (e as Error).message);
        }
      }
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

  async function authenticate(display = 'Inspector One'): Promise<{ client: Client; userId: string }> {
    const email = `giq-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    await td.pool.query('UPDATE users SET display_name = $2 WHERE id = $1', [userId, display]);
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
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`, [
      userId,
      pariwarId,
      role,
      dim,
      value,
    ]);
  }

  async function inScope<T>(pariwarId: string, fn: (tx: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(scopeTx);
      await closeScopeTx(scopeTx, true);
      return out;
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  interface World {
    readonly p: string;
    readonly cid: string;
    readonly uploadId: string;
    readonly neighbours: readonly string[];
    readonly pingIds: readonly string[];
    readonly inspector: { client: Client; userId: string };
  }

  /** A Pariwar, a District Admin who is ALSO the inspector, a claim in the window with `n` texted neighbours and a current
   *  certificate. `n = 0` ⇒ NOBODY to ask: the fixture needs ≥ 1 neighbour to reach the window, so the selection (and its
   *  pings, by cascade) is deleted — ⛔ selection at all, as a no-one-asked claim has. */
  async function world(n = 0): Promise<World> {
    const p = randomUUID();
    const inspector = await authenticate();
    await grant(inspector.userId, p, 'district_admin', 'district', DISTRICT);
    const neighbours: string[] = [];
    for (let i = 0; i < Math.max(n, 1); i += 1) neighbours.push(await fx.seedNeighbour(env, p, `Neighbour ${i}`, `+9198765433${String(10 + i)}`));
    const { cid, pingIds } = await fx.seedClaimWithPings(env, p, neighbours, neighbours.map(() => true));
    if (n === 0) await td.pool.query(`DELETE FROM claim_peer_mesh_selections WHERE pariwar_id = $1 AND claim_case_id = $2`, [p, String(cid)]);
    const uploadId = await inScope(p, async (tx) => (await insertDeathCertificate(tx, p, String(cid))).uploadId);
    return { p, cid: String(cid), uploadId, neighbours: n === 0 ? [] : neighbours, pingIds: n === 0 ? [] : pingIds, inspector };
  }

  /** A SECOND claim in `w`'s Pariwar (same inspector, same district) — for the path-binding refusal (R4). */
  async function secondClaim(w: World): Promise<World> {
    const neighbour = await fx.seedNeighbour(env, w.p, 'Neighbour Second', '+919876543399');
    const { cid } = await fx.seedClaimWithPings(env, w.p, [neighbour], [true]);
    const uploadId = await inScope(w.p, async (tx) => (await insertDeathCertificate(tx, w.p, String(cid))).uploadId);
    return { ...w, cid: String(cid), uploadId, neighbours: [neighbour], pingIds: [] };
  }

  async function assign(w: World, opts: { inspector?: string; stage?: 'initial' | 'certificate_check' } = {}): Promise<string> {
    return inScope(w.p, async (tx) => {
      const { groundInspection } = await claim.scheduleGroundInspection(tx.client, {
        claimCaseId: ids.claimId(w.cid),
        pariwarId: ids.pariwarId(w.p),
        district: DISTRICT,
        block: null,
        inspectionStage: opts.stage ?? 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: opts.inspector ?? w.inspector.userId,
        scheduledAt: new Date('2026-07-10T12:00:00.000Z'),
        scheduledByActor: w.inspector.userId,
        idempotencyKey: randomUUID(),
      });
      const gid = groundInspection.groundInspectionId;
      await claim.addGroundInspectionPhoto(tx.client, {
        pariwarId: ids.pariwarId(w.p),
        groundInspectionId: gid,
        actingActorId: opts.inspector ?? w.inspector.userId,
        storageObjectKey: `fixture/${gid}.jpg`,
        contentType: 'image/jpeg',
        byteSize: 4,
        photoKind: 'original_certificate',
        comparedCertificateUploadId: w.uploadId,
      });
      return String(gid);
    });
  }

  const url = (w: World, gid: string, tail = '') => `/api/v1/p/${w.p}/admin/claims/${w.cid}/ground-inspection/${gid}${tail}`;
  const getQ = (who: Client, w: World, gid: string) => who.inject({ method: 'GET', url: url(w, gid, '/questionnaire') });
  const putA = (who: Client, w: World, gid: string, key: string, payload: unknown) =>
    who.inject({ method: 'PUT', url: url(w, gid, `/questionnaire/answers/${key}`), payload: payload as Json });
  const complete = (who: Client, w: World, gid: string) =>
    who.inject({
      method: 'POST',
      url: url(w, gid, '/complete'),
      payload: { originalCertificateVerdict: 'matches', comparedCertificateToken: w.uploadId, deathDate: FAMILY_DATE },
    });

  /** The family's answer saved through the DOMAIN writer with an injected registry — REAL encryption and REAL code indexes. */
  async function familySaid(w: World, gid: string, key: 'death_cause' | 'death_illness', codes: string[]): Promise<void> {
    const ciphertext = await encryptGroundInspectionField(JSON.stringify(codes), w.p, deps.encryption);
    const codeIndexes = await answerCodeIndexes(w.cid, key, codes, w.p, deps.encryption);
    await inScope(w.p, (tx) =>
      claim.saveGroundInspectionAnswer(tx.client, { preReadVersionId: 'ground_inspection.v1',
        pariwarId: ids.pariwarId(w.p),
        groundInspectionId: ids.groundInspectionId(gid),
        actingActorId: w.inspector.userId,
        questionKey: key,
        codes,
        prepared: { form: 'encrypted', ciphertext, codeIndexes },
        decryptedLive: new Map(),
        unreadableLive: new Map(),
        todayIst: '2026-10-28',
        registry: [RECORDED],
      }),
    );
  }

  /** A neighbour's cause (v4 serves ⛔ health question until counsel) — REAL ciphertext + REAL code indexes, as the superuser. */
  async function neighbourSaid(w: World, i: number, key: 'death_cause' | 'death_illness', codes: string[]): Promise<void> {
    await fx.put(env, w.p, w.neighbours[i]!, w.pingIds[i]!, 'has_died', { codes: ['died'] });
    const indexes = await answerCodeIndexes(w.cid, key, codes, w.p, deps.encryption);
    await td.pool.query(
      `INSERT INTO claim_peer_mesh_reply_answers (pariwar_id, claim_case_id, reply_id, question_key, value_ciphertext, value_code_indexes, saved_via, saved_by_actor_id)
       SELECT r.pariwar_id, r.claim_case_id, r.reply_id, $3, 'enc:v1:unused', $4, 'member_app', 'm' FROM claim_peer_mesh_replies r WHERE r.pariwar_id = $1 AND r.ping_id = $2`,
      [w.p, w.pingIds[i]!, key, indexes],
    );
  }

  async function consoleSection(w: World, actorId: string) {
    return inScope(w.p, (tx) =>
      assemblePeerMesh(
        deps,
        {
          db: tx.tx,
          client: tx.client,
          pariwarId: w.p,
          claimCaseId: w.cid,
          district: DISTRICT,
          actorId,
          grants: [],
          traceId: null,
          onCallbackMobileShown: () => {},
          callbackViewer: 'district',
        },
        ids.claimId(w.cid),
        { bump: () => {} },
        'Ram K.',
      ),
    );
  }

  const audits = (type: string, gid: string) => td.auditSink.ofType(type).filter((e) => e.context?.['ground_inspection_id'] === gid);

  // ── AC3 / AC10 — the read ───────────────────────────────────────────────────────────────────────────────────────────────

  it('GET serves the LETTER alone (cause / illness pending — TR7), in en AND hi, open, ⛔ answers; audited with counts only', async () => {
    const w = await world();
    const gid = await assign(w);
    const res = await getQ(w.inspector.client, w, gid);
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json<{ groundInspectionId: string; questionnaire: { versionId: string; pages: { questions: { key: string; words: { en: string; hi: string }; options: { code: string }[] }[] }[] }; open: boolean; answers: unknown[] }>();
    expect(body.groundInspectionId).toBe(gid);
    expect(body.open).toBe(true);
    expect(body.answers).toEqual([]);
    expect(body.questionnaire.versionId).toBe('ground_inspection.v1');
    const qs = body.questionnaire.pages.flatMap((p) => p.questions);
    expect(qs.map((q) => q.key)).toEqual(['head_letter']);
    expect(qs[0]!.words.en).toMatch(/letter from the head of the school or office/);
    expect(qs[0]!.words.hi).toMatch(/पत्र/);
    expect(qs[0]!.options.map((o) => o.code)).toEqual(['collected', 'not_collected']);
    const [line] = audits('admin_ground_inspection.questionnaire_read', gid);
    expect(line?.context).toMatchObject({ claim_case_id: w.cid, questionnaire_version_id: 'ground_inspection.v1', answer_count: 0, sensitive_answer_count: 0 });
  });

  it('⭐ AC10 — the served definition is BYTE-IDENTICAL with 0, 3 and 5 neighbours selected (the letter on EVERY full visit)', async () => {
    const served: string[] = [];
    for (const n of [0, 3, 5]) {
      const w = await world(n);
      const gid = await assign(w);
      const res = await getQ(w.inspector.client, w, gid);
      expect(res.statusCode, res.body).toBe(200);
      served.push(JSON.stringify(res.json<{ questionnaire: unknown }>().questionnaire));
    }
    expect(served[1]).toBe(served[0]);
    expect(served[2]).toBe(served[0]);
  });

  it('a certificate check ⇒ 404 `questionnaire_unavailable` (⛔ panel) on GET, 409 on PUT', async () => {
    const w = await world();
    const gid = await assign(w, { stage: 'certificate_check' });
    const g = await getQ(w.inspector.client, w, gid);
    expect(g.statusCode).toBe(404);
    expect(errOf(g).code).toBe('ground_inspection.questionnaire_unavailable');
    const p = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'] });
    expect(p.statusCode).toBe(409);
    expect(errOf(p).code).toBe('ground_inspection.questionnaire_not_for_certificate_check');
  });

  // ── AC3 — the save ──────────────────────────────────────────────────────────────────────────────────────────────────────

  it('PUT saves the letter; the SAME value again writes ⛔ nothing and ⛔ audit line; GET reads it back; the audit carries ⛔ value', async () => {
    const w = await world();
    const gid = await assign(w);
    const r1 = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['not_collected'] });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json()).toEqual({ questionKey: 'head_letter', written: true, supersededDependants: [], questionnaireVersionId: 'ground_inspection.v1' });
    const r2 = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['not_collected'] });
    expect(r2.json<Json>()['written']).toBe(false);
    const lines = audits('admin_ground_inspection.questionnaire_answer_saved', gid);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.context).toMatchObject({ claim_case_id: w.cid, question_key: 'head_letter', code_count: 1, superseded_dependant_count: 0 });
    expect(JSON.stringify(lines[0])).not.toContain('not_collected');
    const back = await getQ(w.inspector.client, w, gid);
    expect(back.json<Json>()['answers']).toEqual([{ questionKey: 'head_letter', value: { kind: 'codes', codes: ['not_collected'] } }]);
  });

  it('⭐ Story 6.33 (R7) — the save carries the RENDERED version: matching ⇒ 200; another ⇒ 409 questionnaire_version_stale (RELOAD); a peer_mesh id ⇒ 400', async () => {
    const w = await world();
    const gid = await assign(w);
    const stale = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'], questionnaireVersionId: 'ground_inspection.v2' });
    expect(stale.statusCode).toBe(409);
    expect(errOf(stale).code).toBe('ground_inspection.questionnaire_version_stale');
    expect((await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'], questionnaireVersionId: 'peer_mesh.v4' })).statusCode).toBe(400);
    const ok = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'], questionnaireVersionId: 'ground_inspection.v1' });
    expect(ok.statusCode, ok.body).toBe(200);
  });

  it('the typed refusals: 422 an invalid code / the shipped v1\'s pending cause (`unknown_question`); 400 a malformed body; 401 ⛔ session', async () => {
    const w = await world();
    const gid = await assign(w);
    const bad = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['maybe'] });
    expect(bad.statusCode).toBe(422);
    expect(errOf(bad)).toMatchObject({ code: 'questionnaire.answer_invalid', details: { reason: 'invalid_value' } });
    const pending = await putA(w.inspector.client, w, gid, 'death_cause', { codes: ['accident'] });
    expect(pending.statusCode).toBe(422);
    expect(errOf(pending).details).toEqual({ reason: 'unknown_question' });
    expect((await putA(w.inspector.client, w, gid, 'head_letter', { codes: [] })).statusCode).toBe(400);
    expect((await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'], extra: 1 })).statusCode).toBe(400);
    const anon = makeClient(app);
    expect((await getQ(anon, w, gid)).statusCode).toBe(401);
    expect((await putA(anon, w, gid, 'head_letter', { codes: ['collected'] })).statusCode).toBe(401);
  });

  it('a Block Admin who is ⛔ the assigned inspector and holds ⛔ override ⇒ 403 on GET and PUT, the denial audited; ⛔ a row written', async () => {
    const w = await world();
    const gid = await assign(w);
    const other = await authenticate('Other');
    await grant(other.userId, w.p, 'district_admin', 'district', DISTRICT);
    const before = td.auditSink.ofType('authz.denied').length;
    expect((await getQ(other.client, w, gid)).statusCode).toBe(403);
    expect((await putA(other.client, w, gid, 'head_letter', { codes: ['collected'] })).statusCode).toBe(403);
    expect(td.auditSink.ofType('authz.denied').length).toBeGreaterThanOrEqual(before + 2);
    const rows = await td.pool.query(`SELECT 1 FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gid]);
    expect(rows.rowCount).toBe(0);
    // a Pariwar Admin holds the OVERRIDE key but ⛔ the conduct key (G11) ⇒ the route's gate (403) before the handler
    const pa = await authenticate('Pariwar Admin');
    await grant(pa.userId, w.p, 'pariwar_admin', 'pariwar', w.p);
    expect((await getQ(pa.client, w, gid)).statusCode).toBe(403);
    expect((await putA(pa.client, w, gid, 'head_letter', { codes: ['collected'] })).statusCode).toBe(403);
    // ⛔ grant in the Pariwar at all ⇒ scope resolution's fail-closed 404 (every GI route's existing answer)
    const stranger = await authenticate('Stranger');
    expect((await getQ(stranger.client, w, gid)).statusCode).toBe(404);
    expect((await td.pool.query(`SELECT 1 FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gid])).rowCount).toBe(0);
  });

  it('⭐ review R4 — a path naming ANOTHER claim than the assignment\'s ⇒ 404 on GET and PUT, before any read or write', async () => {
    const a = await world();
    const b = await secondClaim(a);
    const gidB = await assign(b);
    // the positive control: B's own path works
    expect((await getQ(a.inspector.client, b, gidB)).statusCode).toBe(200);
    // claim A in the path, B's assignment id ⇒ the SAME 404 as a missing assignment
    const g = await getQ(a.inspector.client, a, gidB);
    expect(g.statusCode).toBe(404);
    expect(errOf(g).code).toBe('ground_inspection.not_found');
    const p = await putA(a.inspector.client, a, gidB, 'head_letter', { codes: ['collected'] });
    expect(p.statusCode).toBe(404);
    expect(errOf(p).code).toBe('ground_inspection.not_found');
    expect((await td.pool.query(`SELECT 1 FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gidB])).rowCount).toBe(0);
    expect(audits('admin_ground_inspection.questionnaire_read', gidB)).toHaveLength(1);
  });

  it('⭐ second review S2 — the discrepancy re-read and the completion BIND the path\'s claim too (they carry the family\'s cause) ⇒ 404, ⛔ a mutation', async () => {
    const a = await world();
    const b = await secondClaim(a);
    const gidB = await assign(b);
    const done = await assign(b);
    expect((await complete(a.inspector.client, b, done)).statusCode).toBe(200);
    // claim A in the path, B's assignment ⇒ the SAME 404 as a missing assignment — on BOTH routes
    const c = await complete(a.inspector.client, a, gidB);
    expect(c.statusCode).toBe(404);
    expect(errOf(c).code).toBe('ground_inspection.not_found');
    const d = await a.inspector.client.inject({ method: 'GET', url: url(a, done, '/discrepancy') });
    expect(d.statusCode).toBe(404);
    expect(errOf(d).code).toBe('ground_inspection.not_found');
    // patch review — the note route too (since 0189 a note may carry the family's re-told cause)
    const n = await a.inspector.client.inject({ method: 'POST', url: url(a, done, '/discrepancy-notes'), payload: { questionKey: 'death_cause', note: 'x' } });
    expect(n.statusCode).toBe(404);
    expect(errOf(n).code).toBe('ground_inspection.not_found');
    expect((await td.pool.query(`SELECT 1 FROM claim_ground_inspection_discrepancy_notes WHERE ground_inspection_id = $1`, [done])).rowCount).toBe(0);
    // ⛔ mutation: B's visit is still scheduled
    const { rows } = await td.pool.query<{ status: string }>(`SELECT status FROM claim_ground_inspections WHERE ground_inspection_id = $1`, [gidB]);
    expect(rows).toEqual([{ status: 'scheduled' }]);
    // the positive control: B's own path re-reads
    expect((await a.inspector.client.inject({ method: 'GET', url: url(b, done, '/discrepancy') })).statusCode).toBe(200);
  });

  it('⭐ second review S16 — a conduct-key holder of ANOTHER district, or of a block in another district, is refused on GET and PUT; ⛔ a row', async () => {
    const w = await world();
    const elsewhere = await authenticate('Elsewhere District');
    await grant(elsewhere.userId, w.p, 'district_admin', 'district', 'Vaishali');
    const block = await authenticate('Elsewhere Block');
    await grant(block.userId, w.p, 'block_admin', 'block', 'Hajipur');
    for (const who of [elsewhere, block]) {
      // patch review — the out-of-scope holder IS the visit's assigned inspector, so ONLY the conduct gate (the row's
      // district) can refuse — ⛔ the inspector guard standing in for it
      const gid = await assign(w, { inspector: who.userId });
      const g = await getQ(who.client, w, gid);
      expect(g.statusCode, g.body).toBe(403);
      const p = await putA(who.client, w, gid, 'head_letter', { codes: ['collected'] });
      expect(p.statusCode, p.body).toBe(403);
      expect((await td.pool.query(`SELECT 1 FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gid])).rowCount).toBe(0);
      expect(audits('admin_ground_inspection.questionnaire_read', gid)).toEqual([]);
    }
  });

  it('⭐ review R6 (AC3) — a tampered session naming a nonexistent system/service actor is refused on GET and PUT; ⛔ an answer written', async () => {
    const w = await world();
    const gid = await assign(w);
    // the positive control: the human inspector reads and saves
    expect((await getQ(w.inspector.client, w, gid)).statusCode).toBe(200);
    expect((await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'] })).statusCode).toBe(200);
    // House runtime adversary (6.27d CR5): the cookie stays valid, its persisted principal has ⛔ human account / grants.
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [randomUUID(), w.inspector.userId]);
    try {
      expect((await getQ(w.inspector.client, w, gid)).statusCode).toBe(404);
      expect((await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['not_collected'] })).statusCode).toBe(404);
      const rows = await td.pool.query(`SELECT question_key, value_codes, saved_by_actor_id FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gid]);
      expect(rows.rows).toEqual([{ question_key: 'head_letter', value_codes: ['collected'], saved_by_actor_id: w.inspector.userId }]);
    } finally {
      await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [w.inspector.userId, w.inspector.userId]);
    }
  });

  it('⭐ review R2 — an ERASED cause (the RTBF sentinel) ⛔ blocks the letter: the save succeeds and the inspector reads the cause back as unavailable', async () => {
    const w = await world();
    const gid = await assign(w);
    await familySaid(w, gid, 'death_cause', ['accident']);
    await td.pool.query(
      `UPDATE claim_ground_inspection_answers SET value_ciphertext = '[anonymized]', value_code_indexes = NULL WHERE ground_inspection_id = $1 AND question_key = 'death_cause'`,
      [gid],
    );
    const r = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'] });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json<Json>()).toMatchObject({ written: true, supersededDependants: [] });
    const back = await getQ(w.inspector.client, w, gid);
    expect(back.json<Json>()['answers']).toEqual([
      { questionKey: 'death_cause', value: { kind: 'unavailable' } },
      { questionKey: 'head_letter', value: { kind: 'codes', codes: ['collected'] } },
    ]);
  });

  // ── AC4 — completion is unchanged ───────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC4 / AC10 — `complete` succeeds with ZERO answers, and with the letter NOT collected; then the visit is read-only (409 `not_active`)', async () => {
    const w = await world();
    const zero = await assign(w);
    expect((await complete(w.inspector.client, w, zero)).statusCode).toBe(200);
    const notCollected = await assign(w);
    await putA(w.inspector.client, w, notCollected, 'head_letter', { codes: ['not_collected'] });
    const done = await complete(w.inspector.client, w, notCollected);
    expect(done.statusCode, done.body).toBe(200);
    const late = await putA(w.inspector.client, w, notCollected, 'head_letter', { codes: ['collected'] });
    expect(late.statusCode).toBe(409);
    expect(errOf(late).code).toBe('ground_inspection.not_active');
    // ⭐ second review S13 — IQ10's order: a closed visit is 409 BEFORE the 422 pre-check (an INVALID code, a pending cause)
    for (const [key, codes] of [['head_letter', ['maybe']], ['death_cause', ['accident']]] as const) {
      const r = await putA(w.inspector.client, w, notCollected, key, { codes: [...codes] });
      expect(r.statusCode, `${key} ${r.body}`).toBe(409);
      expect(errOf(r).code).toBe('ground_inspection.not_active');
    }
    const back = await getQ(w.inspector.client, w, notCollected);
    expect(back.json<Json>()).toMatchObject({ open: false, answers: [{ questionKey: 'head_letter', value: { kind: 'codes', codes: ['not_collected'] } }] });
    // a completed visit with ⛔ answers has ⛔ questionnaire to show
    expect((await getQ(w.inspector.client, w, zero)).statusCode).toBe(404);
  });

  // ── AC6 — ③ on the inspector's result ───────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC6 — a different cause ⇒ `death_cause` with the FAMILY\'s answer in English words, on the completion AND the re-read; ⛔ the neighbour\'s', async () => {
    const w = await world(1);
    await neighbourSaid(w, 0, 'death_cause', ['suicide']);
    const gid = await assign(w);
    await familySaid(w, gid, 'death_cause', ['accident']);
    const res = await complete(w.inspector.client, w, gid);
    expect(res.statusCode, res.body).toBe(200);
    const want = {
      state: 'shown',
      questionKeys: ['death_cause'],
      familyDeathDate: null,
      familyAnswers: { death_cause: { status: 'shown', codes: ['accident'], labels: ['Accident (road, drowning, electric shock, snake bite, fire, other)'] } },
    };
    expect(res.json<Json>()['discrepancy']).toEqual(want);
    expect(JSON.stringify(res.json())).not.toMatch(/suicide/i);
    const rr = await w.inspector.client.inject({ method: 'GET', url: url(w, gid, '/discrepancy') });
    expect(rr.json<{ discrepancy: Json }>().discrepancy).toEqual(want);
    // ⭐ second review S3 (AC8) — each decrypt of the family's health answer is AUDITED: ONE line per showing, keys and counts only
    const shown = audits('admin_ground_inspection.family_answers_shown', gid);
    expect(shown.map((l) => l.context)).toEqual([
      { ground_inspection_id: gid, claim_case_id: w.cid, path: 'completion', question_keys: ['death_cause'], shown_count: 1, unavailable_count: 0 },
      { ground_inspection_id: gid, claim_case_id: w.cid, path: 're_read', question_keys: ['death_cause'], shown_count: 1, unavailable_count: 0 },
    ]);
    expect(JSON.stringify(shown)).not.toMatch(/accident|Accident/);
    // patch review — the STORED row keeps only the locator (its context is a hash): every line names the claim there
    expect(shown.map((l) => l.resourceLocator)).toEqual([`claim:${w.cid.toLowerCase()}`, `claim:${w.cid.toLowerCase()}`]);
    for (const type of ['admin_ground_inspection.questionnaire_read', 'admin_ground_inspection.questionnaire_answer_saved']) {
      expect(audits(type, gid).map((l) => l.resourceLocator), type).toEqual(audits(type, gid).map(() => `claim:${w.cid.toLowerCase()}`));
    }
  });

  it('⭐ second review S3 — ⛔ family answer shown (the SAME cause) ⇒ ⛔ `family_answers_shown` line', async () => {
    const w = await world(1);
    await neighbourSaid(w, 0, 'death_cause', ['accident']);
    const gid = await assign(w);
    await familySaid(w, gid, 'death_cause', ['accident']);
    expect((await complete(w.inspector.client, w, gid)).statusCode).toBe(200);
    expect((await w.inspector.client.inject({ method: 'GET', url: url(w, gid, '/discrepancy') })).statusCode).toBe(200);
    expect(audits('admin_ground_inspection.family_answers_shown', gid)).toEqual([]);
  });

  it('the SAME cause on both sides ⇒ ⛔ difference (the ONE index helper on both writers — TR3)', async () => {
    const w = await world(1);
    await neighbourSaid(w, 0, 'death_cause', ['accident']);
    const gid = await assign(w);
    await familySaid(w, gid, 'death_cause', ['accident']);
    const res = await complete(w.inspector.client, w, gid);
    expect(res.json<Json>()['discrepancy']).toEqual({ state: 'shown', questionKeys: [], familyDeathDate: null, familyAnswers: null });
  });

  // ── AC8 — who reads the family's account ────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC8 — the family account rides the neighbours\' section for the District Admin (the cause DECRYPTED, labels in English), and parses STRICTLY', async () => {
    const w = await world(1);
    const gid = await assign(w);
    await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'] });
    await familySaid(w, gid, 'death_cause', ['old_age']);
    expect((await complete(w.inspector.client, w, gid)).statusCode).toBe(200);
    const reader = await authenticate('District Admin');
    const section = await consoleSection(w, reader.userId);
    expect(section?.status).toBe('present');
    const family = section!.status === 'present' ? section!.familyAccount : [];
    expect(family).toHaveLength(1);
    expect(family[0]!.groundInspectionId).toBe(gid);
    expect(family[0]!.answers.map((a) => [a.questionKey, a.value])).toEqual([
      ['head_letter', { kind: 'codes', codes: ['collected'], labels: ['Yes — I collected the letter'] }],
      ['death_cause', { kind: 'codes', codes: ['old_age'], labels: ['Old age'] }],
    ]);
    expect(family[0]!.answers[1]!.question).toBe('How did Ram K. die?');
    // the strict wire contract (the stitch adds the warning flags; ⛔ a familyAccount field is stitched)
    expect(() => PeerMeshSection.parse({ ...section, transcript: { ...(section as { transcript: Json }).transcript, pings: [] } })).not.toThrow();
  });

  it('⭐ AC10 — a claim with ⛔ selection (nobody to ask) is `empty` WITH the family account — the letter is there for the approver', async () => {
    const w = await world(0);
    const gid = await assign(w);
    await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['not_collected'] });
    expect((await complete(w.inspector.client, w, gid)).statusCode).toBe(200);
    const reader = await authenticate('District Admin');
    const section = await consoleSection(w, reader.userId);
    expect(section).toMatchObject({ status: 'empty', familyAccount: [{ groundInspectionId: gid, answers: [{ questionKey: 'head_letter', value: { codes: ['not_collected'], labels: ['No — no letter was collected'] } }] }] });
    expect(() => PeerMeshSection.parse(section)).not.toThrow();
  });

  it('⭐ review R3 (AC10) — a no-one-asked claim whose full visit saved ⛔ answer still carries the visit (empty answers ⇒ "Letter: not recorded")', async () => {
    const w = await world(0);
    const gid = await assign(w);
    expect((await complete(w.inspector.client, w, gid)).statusCode).toBe(200);
    const reader = await authenticate('District Admin');
    const section = await consoleSection(w, reader.userId);
    expect(section).toMatchObject({ status: 'empty', familyAccount: [{ groundInspectionId: gid, answers: [] }] });
    expect(() => PeerMeshSection.parse(section)).not.toThrow();
  });

  it('⛔ a HIDDEN reader (their own visit pending) gets the WHOLE section absent — the family account included (uniform)', async () => {
    const w = await world(1);
    const done = await assign(w);
    await putA(w.inspector.client, w, done, 'head_letter', { codes: ['collected'] });
    expect((await complete(w.inspector.client, w, done)).statusCode).toBe(200);
    const hidden = await authenticate('Second Inspector');
    await assign(w, { inspector: hidden.userId });
    expect(await consoleSection(w, hidden.userId)).toBeUndefined();
  });

  it('⛔ the claim-wide list read (every conduct-key holder at the locator) carries ⛔ family answer', async () => {
    const w = await world();
    const gid = await assign(w);
    await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'] });
    expect((await complete(w.inspector.client, w, gid)).statusCode).toBe(200);
    const list = await w.inspector.client.inject({ method: 'GET', url: `/api/v1/p/${w.p}/admin/claims/${w.cid}/ground-inspection?district=${DISTRICT}` });
    expect(list.statusCode).toBe(200);
    expect(list.body).not.toMatch(/head_letter|familyAccount|collected the letter/);
  });
  // ── Code review (2026-10-30) — a CHAIN version served through the real routes; an unreadable pin ──────────────────────

  /** A database version of `ground_inspection` (the shipped v1 + one staff question) — optionally made live for `p`. */
  async function chainVersion(p: string, opts: { live: boolean; definition?: (versionId: string, version: number) => unknown }): Promise<string> {
    const base = questionnaires.GROUND_INSPECTION_QUESTIONNAIRE_V1;
    const id = randomUUID();
    const n = 1_800_000 + Math.floor(Math.random() * 99_999);
    const versionId = `ground_inspection.v${n}`;
    const staff = {
      key: 'water_source',
      kind: 'single',
      text: { en: 'Where does the family of {member} get water?', hi: '{member} का परिवार पानी कहाँ से लाता है?' },
      options: [
        { code: 'well', text: { en: 'A well', hi: 'कुआँ' } },
        { code: 'tap', text: { en: 'A tap', hi: 'नल' } },
      ],
      optional: true,
      showIf: null,
      sensitive: true,
      warning: false,
      approvedBy: [`chain:${id}`],
      health: false,
      counselBasis: null,
    };
    const def = { ...base, versionId, version: n, scope: { kind: 'all' }, status: 'live', approvedBy: [...base.approvedBy, `chain:${id}`], pages: [...base.pages, { questions: [staff] }] };
    const stored = opts.definition?.(versionId, n) ?? { kind: 'ground_inspection', versionId, version: n, approvedBy: def.approvedBy, pages: def.pages, closingNoteCopyKey: base.closingNoteCopyKey, thankYouCopyKey: base.thankYouCopyKey };
    await td.pool.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'ground_inspection', $2, $3, 'ground_inspection.v1', 'ground_inspection.v1', $4, $5, 'pa', 'Pariwar Admin', false, NULL)`,
      [id, n, versionId, p, JSON.stringify(stored)],
    );
    chainVersionIds.push(versionId);
    if (opts.live) {
      await td.pool.query(`INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display) VALUES ($1, 'proposed', $2, 'pa', 'PA')`, [versionId, p]);
      await td.pool.query(
        `INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display, hindi_reviewed, classification_attested) VALUES ($1, 'approved', $2, 'pa', 'PA', true, true)`,
        [versionId, p],
      );
      await td.pool.query(
        `INSERT INTO questionnaire_version_steps (version_id, step, target_pariwar_id, scope_pariwar_id, actor, actor_display) VALUES ($1, 'made_live', $2, $2, 'sa', 'Super Admin')`,
        [versionId, p],
      );
    }
    return versionId;
  }

  it('⭐ review RV31 / AC4 — a CHAIN version made live for the Pariwar is SERVED through the real routes: the staff question\'s stored words (the member\'s name in place of {member}), the first save PINS it, and its answer is stored ENCRYPTED', async () => {
    const w = await world();
    const v = await chainVersion(w.p, { live: true });
    const gid = await assign(w);
    const got = await getQ(w.inspector.client, w, gid);
    expect(got.statusCode, got.body).toBe(200);
    const q = got.json<{ questionnaire: { versionId: string; pages: { questions: { key: string; words: { en: string; hi: string } }[] }[] } }>().questionnaire;
    expect(q.versionId).toBe(v);
    const staff = q.pages.flatMap((pg) => pg.questions).find((x) => x.key === 'water_source')!;
    expect(staff.words.en).toMatch(/^Where does the family of .+ get water\?$/);
    expect(staff.words.en).not.toContain('{member}'); // the placeholder is filled by THE ONE word function
    expect(staff.words.hi).toContain('पानी');
    const saved = await putA(w.inspector.client, w, gid, 'water_source', { codes: ['well'], questionnaireVersionId: v });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json<Json>()['questionnaireVersionId']).toBe(v);
    const pin = await td.pool.query(`SELECT questionnaire_version_id FROM claim_ground_inspection_questionnaires WHERE ground_inspection_id = $1`, [gid]);
    expect(pin.rows[0].questionnaire_version_id).toBe(v);
    const row = await td.pool.query(`SELECT value_codes, value_ciphertext FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1 AND question_key = 'water_source'`, [gid]);
    expect(row.rows[0].value_codes).toBeNull(); // a chain answer is ALWAYS stored as ciphertext (C5)
    expect(row.rows[0].value_ciphertext).toEqual(expect.any(String));
    // ⭐ an OLD visit keeps its pin (review RP16): a NEWER chain version is made live for the Pariwar AFTER the pin — the version now in
    // force is the new one, yet the visit still answers its PINNED version (the assertion fails if the pin were ignored)
    const newer = await chainVersion(w.p, { live: true });
    expect(newer).not.toBe(v);
    const again = await getQ(w.inspector.client, w, gid);
    expect(again.statusCode, again.body).toBe(200);
    expect(again.json<{ questionnaire: { versionId: string } }>().questionnaire.versionId).toBe(v);
  });

  it('⭐ review RV6 / R7 (v) — a visit PINNED to a version that cannot be PARSED: GET ⇒ 409 `…version_unreadable` and PUT ⇒ 409 the same (⛔ the 404 "no panel", on which the panel renders nothing)', async () => {
    const w = await world();
    const gid = await assign(w);
    const junk = await chainVersion(w.p, { live: false, definition: (versionId, version) => ({ kind: 'ground_inspection', versionId, version, junk: true }) });
    await td.pool.query(
      `INSERT INTO claim_ground_inspection_questionnaires (ground_inspection_id, pariwar_id, claim_case_id, questionnaire_version_id) VALUES ($1, $2, $3, $4)`,
      [gid, w.p, w.cid, junk],
    );
    const got = await getQ(w.inspector.client, w, gid);
    expect(got.statusCode, got.body).toBe(409);
    expect(errOf(got).code).toBe('ground_inspection.questionnaire_version_unreadable');
    const put = await putA(w.inspector.client, w, gid, 'head_letter', { codes: ['collected'], questionnaireVersionId: junk });
    expect(put.statusCode, put.body).toBe(409);
    expect(errOf(put).code).toBe('ground_inspection.questionnaire_version_unreadable');
    // the 404 stays for the case it MEANS: no panel (a certificate check)
    const w2 = await world();
    const check = await assign(w2, { stage: 'certificate_check' });
    expect(errOf(await getQ(w2.inspector.client, w2, check)).code).toBe('ground_inspection.questionnaire_unavailable');
  });
});
