// Story 6.33 (Task 6; AC8, AC12) — the chain's writer on a live DB: propose as `twt_app` (the server REPLACES the ruled
// questions and STAMPS `chain:<id>` — a client's Panel id on a chain question is ⛔ kept; numbered from the floor, +1 each);
// an invalid proposal writes ⛔ thing; approve (both ticks; the author MAY approve); return (a note); withdraw (the author
// only); the state machine; make live for ONE Pariwar (I4 — only then served), already live ⇒ not publishable; base moved
// (acknowledgeable) vs ruled base moved (⛔); direct (three steps in ONE transaction, `direct`, the reason); revert (raw own;
// nothing to revert; made live again after); the Pariwars keeping their own version. Per-test ROLLBACK (setupLiveDb); the
// global acts on the superuser connection (as `deps.serviceDb` — RLS bypassed).

import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { bindScopedDb, type Db } from '../../../src/db.js';
import {
  approveVersion,
  directVersion,
  isNumberingCollision,
  isUniqueViolation,
  listVersionRows,
  makeVersionLive,
  pariwarsKeepingOwn,
  proposeVersion,
  QuestionnaireChainError,
  readVersionRow,
  readVersionSteps,
  resolveLiveQuestionnaire,
  returnVersion,
  revertPariwar,
  toStoredDefinition,
  versionVisibleTo,
  withdrawVersion,
} from '../../../src/questionnaire-versions/index.js';
import {
  GROUND_INSPECTION_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V3,
  PEER_MESH_QUESTIONNAIRE_V4,
  QuestionnaireDefinitionInvalidError,
  questionsOf,
  type QuestionnaireDefinition,
  type QuestionnairePage,
} from '../../../src/questionnaires/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { chainDefinition, chainQuestion } from '../../questionnaires/_chain-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const PA = { actor: 'pa-actor', actorDisplay: 'Pariwar Admin' };
const PA2 = { actor: 'pa-actor-2', actorDisplay: 'Another Admin' };
const SA = { actor: 'sa-actor', actorDisplay: 'Super Admin' };
const TICKS = { hindiReviewed: true, classificationAttested: true };

/** v4's pages + one chain question (its `approvedBy` is whatever the client sent — the server restamps it). */
const draft = (extra = chainQuestion(randomUUID())): QuestionnairePage[] => [...PEER_MESH_QUESTIONNAIRE_V4.pages, { questions: [extra] }];

async function code<T>(client: Client, run: () => Promise<T>): Promise<string> {
  await client.query('SAVEPOINT chain_probe');
  try {
    await run();
    await client.query('RELEASE SAVEPOINT chain_probe');
    return 'ok';
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT chain_probe');
    if (err instanceof QuestionnaireChainError) return err.code;
    if (err instanceof QuestionnaireDefinitionInvalidError) return err.code;
    throw err;
  }
}

/** As `twt_app` in `pid` (the tenant path) — the handle the tenant steps run on. */
async function asTenant(client: Client, pid: string): Promise<Db> {
  await enterAppScope(client, pid);
  return bindScopedDb(client);
}
/** As the superuser (RLS bypassed — the global path's `deps.serviceDb`). */
async function asGlobal(client: Client): Promise<Db> {
  await client.query('RESET ROLE');
  return bindScopedDb(client);
}

describe.skipIf(!hasDatabase)('Story 6.33 — the chain writer (live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('propose (twt_app): numbered from the floor, +1; the ruled questions REPLACED; every chain question STAMPED chain:<id>; the proposed step scoped to P', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const tampered = draft(chainQuestion(randomUUID(), { approvedBy: ['2026-10-10-304'] }));
    tampered[1] = { questions: tampered[1]!.questions.map((q) => (q.key === 'how_known' ? { ...q, copyKey: 'peer_request_questions.has_died.died' } : q)) };
    const db = await asTenant(client, p);
    const a = await proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: tampered });
    const b = await proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    expect(Number(a.versionId.split('.v')[1])).toBeGreaterThanOrEqual(1000);
    expect(Number(b.versionId.split('.v')[1])).toBe(Number(a.versionId.split('.v')[1]) + 1);
    const row = (await readVersionRow(db, a.versionId))!;
    expect(row).toMatchObject({ originPariwarId: p, direct: false, baseVersionId: 'peer_mesh.v4', ruledBaseCodeVersionId: 'peer_mesh.v4', authoredByDisplay: 'Pariwar Admin' });
    const stored = row.definition as QuestionnaireDefinition;
    const qs = stored.pages.flatMap((pg) => pg.questions);
    expect(qs.find((q) => q.key === 'how_known')).toEqual(questionsOf(PEER_MESH_QUESTIONNAIRE_V4).find((q) => q.key === 'how_known'));
    expect(qs.find((q) => q.key === 'water_source')?.approvedBy).toEqual([`chain:${a.id}`]);
    expect(stored.approvedBy).toEqual([...PEER_MESH_QUESTIONNAIRE_V4.approvedBy, `chain:${a.id}`]);
    expect((await readVersionSteps(db, a.versionId)).map((s) => [s.step, s.scopePariwarId, s.targetPariwarId])).toEqual([['proposed', p, null]]);
    // I4 — a proposal is ⛔ served
    expect((await resolveLiveQuestionnaire(db, 'peer_mesh', p)).source).toBe('code');
  });

  it('an INVALID proposal (a warning chain question) is refused 422 with its problems — ⛔ row written', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const db = await asTenant(client, p);
    const before = await client.query(`SELECT count(*)::int AS n FROM questionnaire_versions WHERE origin_pariwar_id = $1`, [p]);
    expect(await code(client, () => proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft(chainQuestion(randomUUID(), { warning: true })) }))).toBe(
      'questionnaire.definition_invalid',
    );
    expect(await code(client, () => proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', baseVersionId: 'ground_inspection.v1', pages: draft() }))).toBe(
      'questionnaire.base_invalid',
    );
    const after = await client.query(`SELECT count(*)::int AS n FROM questionnaire_versions WHERE origin_pariwar_id = $1`, [p]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('approve: both ticks required (422 each); the AUTHOR may approve (⛔ distinct-approver rule — QE6); then the state machine', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const db = await asTenant(client, p);
    const v = await proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    expect(await code(client, () => approveVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, hindiReviewed: false, classificationAttested: true }))).toBe(
      'questionnaire.hindi_review_required',
    );
    expect(await code(client, () => approveVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, hindiReviewed: true, classificationAttested: false }))).toBe(
      'questionnaire.classification_attestation_required',
    );
    expect(await code(client, () => approveVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS }))).toBe('ok');
    expect(await code(client, () => approveVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS }))).toBe('questionnaire.not_approvable');
    expect(await code(client, () => returnVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, note: 'reword' }))).toBe('questionnaire.not_approvable');
    const steps = await readVersionSteps(db, v.versionId);
    expect(steps.map((s) => [s.step, s.hindiReviewed, s.classificationAttested, s.actorDisplay])).toEqual([
      ['proposed', null, null, 'Pariwar Admin'],
      ['approved', true, true, 'Pariwar Admin'],
    ]);
    // ⛔ another Pariwar's version (indistinguishable from unknown)
    const q = randomUUID();
    const dbq = await asTenant(client, q);
    expect(await code(client, () => approveVersion(dbq, { ...PA, pariwarId: q, versionId: v.versionId, ...TICKS }))).toBe('questionnaire.not_found');
  });

  it('return (terminal); withdraw — the AUTHOR only, ⛔ once returned', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const db = await asTenant(client, p);
    const v = await proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    expect(await code(client, () => withdrawVersion(db, { ...PA2, pariwarId: p, versionId: v.versionId }))).toBe('questionnaire.not_author');
    expect(await code(client, () => returnVersion(db, { ...PA2, pariwarId: p, versionId: v.versionId, note: 'Please reword the question' }))).toBe('ok');
    expect(await code(client, () => approveVersion(db, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS }))).toBe('questionnaire.not_approvable');
    expect(await code(client, () => withdrawVersion(db, { ...PA, pariwarId: p, versionId: v.versionId }))).toBe('questionnaire.not_withdrawable');
    const w = await proposeVersion(db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    await approveVersion(db, { ...PA, pariwarId: p, versionId: w.versionId, ...TICKS });
    expect(await code(client, () => withdrawVersion(db, { ...PA, pariwarId: p, versionId: w.versionId }))).toBe('ok');
  });

  it('make live for ONE Pariwar: only an APPROVED version; then served to P (⛔ Q); already live there ⇒ not publishable; pariwarsKeepingOwn names P', async () => {
    const { client } = getTx();
    const [p, q] = [randomUUID(), randomUUID()];
    const t = await asTenant(client, p);
    const v = await proposeVersion(t, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    let g = await asGlobal(client);
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: p, acknowledgeBaseMoved: false }))).toBe('questionnaire.not_publishable');
    await approveVersion(await asTenant(client, p), { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS });
    g = await asGlobal(client);
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: p, acknowledgeBaseMoved: false }))).toBe('ok');
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', p)).def?.versionId).toBe(v.versionId);
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', q)).source).toBe('code');
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: p, acknowledgeBaseMoved: false }))).toBe('questionnaire.not_publishable');
    expect(await pariwarsKeepingOwn(g, 'peer_mesh')).toContainEqual({ pariwarId: p, versionId: v.versionId });
    // the made_live step is scoped to the target (TENANCY = RESOLUTION for a resolution step)
    expect((await readVersionSteps(g, v.versionId)).at(-1)).toMatchObject({ step: 'made_live', targetPariwarId: p, scopePariwarId: p, actorDisplay: 'Super Admin' });
  });

  it('QE7 (e) base_moved (acknowledgeable) vs QE5 ruled_base_moved (⛔ acknowledgeable)', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const t = await asTenant(client, p);
    const first = await proposeVersion(t, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    const second = await proposeVersion(t, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    for (const v of [first, second]) await approveVersion(t, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS });
    const g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: first.versionId, targetPariwarId: p, acknowledgeBaseMoved: false });
    // `second` was based on v4 — the version in force for P is now `first`
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: second.versionId, targetPariwarId: p, acknowledgeBaseMoved: false }))).toBe('questionnaire.base_moved');
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: second.versionId, targetPariwarId: p, acknowledgeBaseMoved: true }))).toBe('ok');
    // a version recorded on the OLDER ruled base (v3), approved: ⛔ made live, acknowledgement or not
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V3, 900_000 + Math.floor(Math.random() * 99_999));
    await client.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v3', 'peer_mesh.v3', $4, $5, 'pa', 'PA', false, NULL)`,
      [id, def.version, def.versionId, p, JSON.stringify(toStoredDefinition(def))],
    );
    for (const step of ['proposed', 'approved']) {
      await client.query(
        `INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display, hindi_reviewed, classification_attested) VALUES ($1, $2, $3, 'pa', 'PA', $4, $4)`,
        [def.versionId, step, p, step === 'approved' ? true : null],
      );
    }
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: def.versionId, targetPariwarId: p, acknowledgeBaseMoved: true }))).toBe('questionnaire.ruled_base_moved');
  });

  it('QE7 (c) direct for ONE Pariwar: `direct`, the reason, three steps in ONE transaction (seq-ordered), both ticks; served at once', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const g = await asGlobal(client);
    expect(await code(client, () => directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p, pages: draft(), reason: 'adding a question', hindiReviewed: true, classificationAttested: false, acknowledgeBaseMoved: false }))).toBe(
      'questionnaire.classification_attestation_required',
    );
    const v = await directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p, pages: draft(), reason: 'adding a question', ...TICKS, acknowledgeBaseMoved: false });
    expect(await readVersionRow(g, v.versionId)).toMatchObject({ direct: true, reason: 'adding a question', originPariwarId: p, baseVersionId: 'peer_mesh.v4' });
    const steps = await readVersionSteps(g, v.versionId);
    expect(steps.map((s) => [s.step, s.targetPariwarId, s.scopePariwarId])).toEqual([
      ['proposed', null, p],
      ['approved', null, p],
      ['made_live', p, p],
    ]);
    expect(steps[1]).toMatchObject({ hindiReviewed: true, classificationAttested: true });
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', p)).def?.versionId).toBe(v.versionId);
  });

  it('QE7 (d) revert: nothing to revert ⇒ 409; ends P\'s own version (the step names it); made live AGAIN after', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const g = await asGlobal(client);
    expect(await code(client, () => revertPariwar(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p }))).toBe('questionnaire.nothing_to_revert');
    const v = await directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p, pages: draft(), reason: 'r', ...TICKS, acknowledgeBaseMoved: false });
    expect(await revertPariwar(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p })).toEqual({ endedVersionId: v.versionId });
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', p)).source).toBe('code');
    expect(await code(client, () => revertPariwar(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p }))).toBe('questionnaire.nothing_to_revert');
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: p, acknowledgeBaseMoved: false }))).toBe('ok');
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', p)).def?.versionId).toBe(v.versionId);
  });

  it('QE7 (a) make live for ALL sets the DEFAULT level: a Pariwar with its OWN version in force KEEPS it (`-422` Q3 A)', async () => {
    const { client } = getTx();
    const [p, q] = [randomUUID(), randomUUID()];
    const g = await asGlobal(client);
    const own = await directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p, pages: draft(), reason: 'own', ...TICKS, acknowledgeBaseMoved: false });
    const all = await directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: null, pages: draft(), reason: 'all', ...TICKS, acknowledgeBaseMoved: false });
    expect(await readVersionRow(g, all.versionId)).toMatchObject({ originPariwarId: null, direct: true });
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', p)).def?.versionId).toBe(own.versionId);
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', q)).def?.versionId).toBe(all.versionId);
    // the ALL version, visible to a Pariwar that did ⛔ write it (reference data) — its global steps too
    const t = await asTenant(client, q);
    expect((await readVersionSteps(t, all.versionId)).map((s) => s.step)).toEqual(['proposed', 'approved', 'made_live']);
  });
  // ── Code review (2026-10-30) — the patches' legs ────────────────────────────────────────────────────────────────────

  /** A raw version row on `ruledBase` (superuser — as the global path writes), for fixtures the writer would refuse. */
  async function insertRaw(client: Client, ruledBase: QuestionnaireDefinition, version: number, origin: string | null, over: { definition?: unknown } = {}) {
    const { id, def } = chainDefinition(ruledBase, version);
    await client.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, 'pa', 'PA', $8, $9)`,
      [id, def.kind, def.version, def.versionId, ruledBase.versionId, origin, JSON.stringify(over.definition ?? toStoredDefinition(def)), origin === null, origin === null ? 'direct' : null],
    );
    return def;
  }

  it('review RV2 — a version made live for ANOTHER Pariwar is ⛔ withdrawable by its author: the origin READS the made_live scoped to the target (stage published); ⛔ a third Pariwar does', async () => {
    const { client } = getTx();
    const [p, q, r, s] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const tp = await asTenant(client, p);
    const v = await proposeVersion(tp, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    await approveVersion(tp, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS });
    let g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: q, acknowledgeBaseMoved: false }); // P's version, live in Q (QE7)
    const tp2 = await asTenant(client, p);
    // the ORIGIN reads Q's step — the stage the writers derive is `published`, so the withdraw is refused (made_live is ⛔ withdrawable)
    expect((await readVersionSteps(tp2, v.versionId)).map((x) => [x.step, x.scopePariwarId])).toEqual([
      ['proposed', p],
      ['approved', p],
      ['made_live', q],
    ]);
    expect(await code(client, () => withdrawVersion(tp2, { ...PA, pariwarId: p, versionId: v.versionId }))).toBe('questionnaire.not_withdrawable');
    // `return` needs stage `proposed` — never reachable once approved
    expect(await code(client, () => returnVersion(tp2, { ...PA, pariwarId: p, versionId: v.versionId, note: 'reword' }))).toBe('questionnaire.not_approvable');
    // still served in Q, and (published → made_live) still publishable for another target
    g = await asGlobal(client);
    expect((await resolveLiveQuestionnaire(g, 'peer_mesh', q)).def?.versionId).toBe(v.versionId);
    expect(await code(client, () => makeVersionLive(g, { ...SA, versionId: v.versionId, targetPariwarId: r, acknowledgeBaseMoved: false }))).toBe('ok');
    // a Pariwar that neither originated the version nor is a target reads NOTHING of it
    const ts = await asTenant(client, s);
    expect(await readVersionSteps(ts, v.versionId)).toEqual([]);
    expect(await versionVisibleTo(ts, s, v.versionId)).toBe(false);
    expect(await versionVisibleTo(await asTenant(client, q), q, v.versionId)).toBe(true); // live THERE
    expect(await versionVisibleTo(await asTenant(client, p), p, v.versionId)).toBe(true); // its own
  });

  it('review RV3 — a tenant ⛔ bases a proposal on ANOTHER Pariwar\'s open proposal, an unknown id or an unreadable row; its own, a code version and one live here / for all are fine', async () => {
    const { client } = getTx();
    const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
    const ta = await asTenant(client, a);
    const open = await proposeVersion(ta, { ...PA, pariwarId: a, kind: 'peer_mesh', pages: draft() });
    const base = (id: string, pid = b) => async () => proposeVersion(await asTenant(client, pid), { ...PA, pariwarId: pid, kind: 'peer_mesh', baseVersionId: id, pages: draft() });
    // another Pariwar's open proposal — indistinguishable from an unknown id
    expect(await code(client, base(open.versionId))).toBe('questionnaire.base_invalid');
    expect(await code(client, base('peer_mesh.v9999999'))).toBe('questionnaire.base_invalid');
    // its own, and a code version
    const own = await proposeVersion(await asTenant(client, b), { ...PA, pariwarId: b, kind: 'peer_mesh', pages: draft() });
    expect(await code(client, base(own.versionId))).toBe('ok');
    expect(await code(client, base('peer_mesh.v3'))).toBe('ok');
    // live for ANOTHER Pariwar only (c) — still ⛔ b's to build on
    await approveVersion(await asTenant(client, a), { ...PA, pariwarId: a, versionId: open.versionId, ...TICKS });
    let g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: open.versionId, targetPariwarId: c, acknowledgeBaseMoved: false });
    expect(await code(client, base(open.versionId))).toBe('questionnaire.base_invalid');
    // live for ALL — visible to everyone
    g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: open.versionId, targetPariwarId: null, acknowledgeBaseMoved: true });
    expect(await code(client, base(open.versionId))).toBe('ok');
    // review RP10 — the Pariwar is filtered IN CODE: on a SUPERUSER handle (every step readable) a foreign version live only for ANOTHER
    // Pariwar is still ⛔ visible to b, and one live for ALL is
    g = await asGlobal(client);
    const onlyForC = await proposeVersion(await asTenant(client, a), { ...PA, pariwarId: a, kind: 'peer_mesh', pages: draft() });
    await approveVersion(await asTenant(client, a), { ...PA, pariwarId: a, versionId: onlyForC.versionId, ...TICKS });
    g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: onlyForC.versionId, targetPariwarId: c, acknowledgeBaseMoved: true });
    expect(await versionVisibleTo(g, b, onlyForC.versionId)).toBe(false); // steps exist, but scoped to a and c — ⛔ b
    expect(await versionVisibleTo(g, c, onlyForC.versionId)).toBe(true);
    expect(await versionVisibleTo(g, b, open.versionId)).toBe(true); // `open` was made live for ALL above
    // an UNREADABLE base (its own origin, so visibility is ⛔ the reason) is refused on the tenant AND the global path
    const bad = 1_200_000 + Math.floor(Math.random() * 99_999);
    g = await asGlobal(client);
    await insertRaw(client, PEER_MESH_QUESTIONNAIRE_V4, bad, b, { definition: { kind: 'peer_mesh', versionId: `peer_mesh.v${bad}`, version: bad, junk: true } });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await code(client, base(`peer_mesh.v${bad}`))).toBe('questionnaire.base_invalid');
      g = await asGlobal(client);
      expect(
        await code(client, () => directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: b, baseVersionId: `peer_mesh.v${bad}`, pages: draft(), reason: 'r', ...TICKS, acknowledgeBaseMoved: true })),
      ).toBe('questionnaire.base_invalid');
    } finally {
      quiet.mockRestore();
    }
  });

  it('review RV20 — the version list caps PER KIND: a busy kind ⛔ pushes the other out of the list', async () => {
    const { client } = getTx();
    const g = await asGlobal(client);
    // Review RP17 — HERMETIC: `top` is read from the database inside this test's own transaction, so it sits above every row any other
    // spec leaked (the earlier version drew a random band that a leaked higher row could beat).
    const { rows: [m] } = await client.query<{ top: number }>(`SELECT (greatest(coalesce(max(version), 0), 1000000) + 10)::int AS top FROM questionnaire_versions`);
    const top = Number(m!.top);
    for (let i = 0; i < 3; i += 1) await insertRaw(client, PEER_MESH_QUESTIONNAIRE_V4, top + i, null);
    await insertRaw(client, GROUND_INSPECTION_QUESTIONNAIRE_V1, top, null);
    const rows = await listVersionRows(g, { pariwarId: null, limit: 2 });
    const mesh = rows.filter((x) => x.kind === 'peer_mesh');
    const gi = rows.filter((x) => x.kind === 'ground_inspection');
    expect(mesh.map((x) => x.version)).toEqual([top + 2, top + 1]); // the busy kind is capped at 2 — newest first
    expect(gi[0]!.version).toBe(top); // ⭐ the OTHER kind is ⛔ pushed out: its newest row is listed first
    expect(gi.length).toBeLessThanOrEqual(2);
  });

  it('review RV12 — a REAL drizzle unique violation is recognised through `.cause` (the QE3 retry\'s test); the bare `code` check never saw it', async () => {
    const { client } = getTx();
    const g = await asGlobal(client);
    const n = 1_400_000 + Math.floor(Math.random() * 99_999);
    await insertRaw(client, PEER_MESH_QUESTIONNAIRE_V4, n, null);
    await client.query('SAVEPOINT dup');
    let caught: unknown;
    try {
      const { sql } = await import('drizzle-orm');
      await g.execute(sql`INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
        SELECT gen_random_uuid(), kind, version, 'peer_mesh.v' || ${n}::text, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason
          FROM questionnaire_versions WHERE version = ${n} AND kind = 'peer_mesh'`);
    } catch (err) {
      caught = err;
    }
    await client.query('ROLLBACK TO SAVEPOINT dup');
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBeUndefined(); // wrapped: the OLD check `err.code === '23505'` was always false
    expect(isUniqueViolation(caught)).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ cause: { code: '40001' } })).toBe(false);
    // review RP11 — ⛔ a throw on a non-object; and only a NUMBERING constraint is a lost numbering race
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
    expect(isNumberingCollision(caught)).toBe(true); // the REAL drizzle error: its constraint is (kind, version) / version_id
    expect(isNumberingCollision({ cause: { code: '23505', constraint: 'questionnaire_versions_pkey' } })).toBe(false);
    expect(isNumberingCollision({ code: '23505', constraint: 'questionnaire_versions_kind_version_uq' })).toBe(true);
    expect(isNumberingCollision({ code: '23505' })).toBe(false); // no constraint named ⇒ ⛔ retried
    expect(isNumberingCollision(null)).toBe(false);
  });

  it('QE7 (b) direct WITH a named base is judged by what THAT proposal was based on (base_moved until acknowledged); QE5 approving a version on an OLDER ruled base ⇒ ruled_base_moved', async () => {
    const { client } = getTx();
    const p = randomUUID();
    const t = await asTenant(client, p);
    const first = await proposeVersion(t, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    const second = await proposeVersion(t, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: draft() });
    for (const v of [first, second]) await approveVersion(t, { ...PA, pariwarId: p, versionId: v.versionId, ...TICKS });
    const g = await asGlobal(client);
    await makeVersionLive(g, { ...SA, versionId: first.versionId, targetPariwarId: p, acknowledgeBaseMoved: false });
    const direct = (baseVersionId: string, ack: boolean) => () =>
      directVersion(g, { ...SA, kind: 'peer_mesh', targetPariwarId: p, baseVersionId, pages: draft(), reason: 'modify', ...TICKS, acknowledgeBaseMoved: ack });
    // the base IS what is in force ⇒ no acknowledgement needed
    expect(await code(client, direct(first.versionId, false))).toBe('ok');
    // `second` was based on v4 — what is in force is now the direct version just made live ⇒ the base moved
    expect(await code(client, direct(second.versionId, false))).toBe('questionnaire.base_moved');
    expect(await code(client, direct(second.versionId, true))).toBe('ok');
    // QE5 — an APPROVAL of a version recorded on the OLDER ruled base (v3) is refused too (only make-live was tested)
    const stale = await insertRaw(client, PEER_MESH_QUESTIONNAIRE_V3, 1_500_000 + Math.floor(Math.random() * 99_999), p);
    await client.query(`INSERT INTO questionnaire_version_steps (version_id, step, scope_pariwar_id, actor, actor_display) VALUES ($1, 'proposed', $2, 'pa', 'PA')`, [stale.versionId, p]);
    expect(await code(client, async () => approveVersion(await asTenant(client, p), { ...PA, pariwarId: p, versionId: stale.versionId, ...TICKS }))).toBe('questionnaire.ruled_base_moved');
  });
});
