// Story 6.33 (Task 3; AC3, AC12) — the database-aware reader on a live DB: R1's strict parse (an unknown field, a string
// "true", a validator failure), R2's resolution by `seq` (own before all; the revert rule keyed on the Pariwar;
// re-make-live after a revert; the steps of ONE transaction; a stale ruled base and an invalid row SKIPPED to the next
// level, alarmed), R3's counsel overlay, R4's explicit Pariwar predicate (run as the superuser — RLS bypassed — and as
// `twt_app` in another Pariwar), a proposed / approved version ⛔ resolving (I4), the read-only invalid pin (R7 (v)), and
// QE3's boot check. Per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertNoCodeVersionInDatabase,
  databaseVersionIds,
  getQuestionnaireDefinition,
  getQuestionnaireDefinitions,
  readQuestionnaireDefinition,
  readStepsFor,
  resolveLiveQuestionnaire,
  toStoredDefinition,
} from '../../../src/questionnaire-versions/index.js';
import {
  GROUND_INSPECTION_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V3,
  PEER_MESH_QUESTIONNAIRE_V4,
  questionsOf,
  type QuestionnaireDefinition,
} from '../../../src/questionnaires/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import { chainDefinition, chainQuestion } from '../../questionnaires/_chain-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const freshVersion = () => 500_000 + Math.floor(Math.random() * 499_999);

async function insertVersion(
  client: Client,
  def: QuestionnaireDefinition,
  id: string,
  over: { ruledBase?: string; storedDefinition?: unknown; origin?: string | null } = {},
): Promise<string> {
  await client.query(
    `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pa', 'Pariwar Admin', $9, $10)`,
    [
      id,
      def.kind,
      def.version,
      def.versionId,
      over.ruledBase ?? `${def.kind}.v${def.kind === 'peer_mesh' ? 4 : 1}`,
      over.ruledBase ?? `${def.kind}.v${def.kind === 'peer_mesh' ? 4 : 1}`,
      over.origin === undefined ? randomUUID() : over.origin,
      JSON.stringify(over.storedDefinition ?? toStoredDefinition(def)),
      over.origin === null,
      over.origin === null ? 'direct' : null,
    ],
  );
  return def.versionId;
}

async function step(client: Client, versionId: string, s: string, target: string | null = null): Promise<void> {
  const ticks = s === 'approved' ? true : null;
  await client.query(
    `INSERT INTO questionnaire_version_steps (version_id, step, target_pariwar_id, scope_pariwar_id, actor, actor_display, hindi_reviewed, classification_attested)
     VALUES ($1, $2, $3, $4, 'sa', 'Super Admin', $5, $5)`,
    [versionId, s, target, s === 'made_live' || s === 'pariwar_reverted' ? target : randomUUID(), ticks],
  );
}

/** A valid peer_mesh DB version on v4, inserted; returns its id. */
async function peerVersion(client: Client, over: Parameters<typeof insertVersion>[3] = {}): Promise<string> {
  const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion());
  return insertVersion(client, def, id, over);
}

describe.skipIf(!hasDatabase)('questionnaire-versions — the reader (QE12 R1–R4, R8)', { timeout: 20000 }, () => {
  setupLiveDb();
  const alarm = vi.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => alarm.mockClear());

  it('⛔ DB version in force ⇒ the code registry (byte-identical: v4 / ground_inspection.v1)', async () => {
    const { tx } = getTx();
    const p = randomUUID();
    const live = await resolveLiveQuestionnaire(tx, 'peer_mesh', p);
    expect(live).toEqual({ def: PEER_MESH_QUESTIONNAIRE_V4, source: 'code', skipped: [] });
    expect((await resolveLiveQuestionnaire(tx, 'ground_inspection', p)).def).toBe(GROUND_INSPECTION_QUESTIONNAIRE_V1);
  });

  it('I4 — a proposed / approved (never made live) version ⛔ resolves', async () => {
    const { tx, client } = getTx();
    const p = randomUUID();
    const v = await peerVersion(client);
    await step(client, v, 'proposed');
    await step(client, v, 'approved');
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).source).toBe('code');
  });

  it("R2 — the all-Pariwar version; a Pariwar's OWN beats it; another Pariwar ⛔ sees P's own; newest by seq", async () => {
    const { tx, client } = getTx();
    const [p, q] = [randomUUID(), randomUUID()];
    const all1 = await peerVersion(client);
    const own = await peerVersion(client);
    const all2 = await peerVersion(client);
    await step(client, all1, 'made_live', null);
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).def?.versionId).toBe(all1);
    await step(client, own, 'made_live', p);
    await step(client, all2, 'made_live', null);
    const forP = await resolveLiveQuestionnaire(tx, 'peer_mesh', p);
    expect([forP.def?.versionId, forP.source]).toEqual([own, 'own']);
    const forQ = await resolveLiveQuestionnaire(tx, 'peer_mesh', q);
    expect([forQ.def?.versionId, forQ.source]).toEqual([all2, 'all']);
    expect(forQ.def?.scope).toEqual({ kind: 'all' });
    expect(forQ.def?.status).toBe('live');
    // ⛔ another kind's steps
    expect((await resolveLiveQuestionnaire(tx, 'ground_inspection', p)).source).toBe('code');
  });

  it('R2 — the revert rule (keyed on the Pariwar), and re-make-live after a revert', async () => {
    const { tx, client } = getTx();
    const p = randomUUID();
    const all = await peerVersion(client);
    const own = await peerVersion(client);
    await step(client, all, 'made_live', null);
    await step(client, own, 'made_live', p);
    await step(client, own, 'pariwar_reverted', p);
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).def?.versionId).toBe(all);
    await step(client, own, 'made_live', p);
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).def?.versionId).toBe(own);
  });

  it('R2 — three steps in ONE transaction (the direct path) order by seq: the last made_live wins', async () => {
    const { tx, client } = getTx();
    const p = randomUUID();
    const a = await peerVersion(client);
    const b = await peerVersion(client);
    for (const v of [a, b]) {
      await step(client, v, 'proposed');
      await step(client, v, 'approved');
      await step(client, v, 'made_live', p);
    }
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).def?.versionId).toBe(b);
  });

  it('R2 / QE5 — a STALE ruled base (v3) is SKIPPED to the next level, alarmed with ids only', async () => {
    const { tx, client } = getTx();
    const p = randomUUID();
    const all = await peerVersion(client);
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V3, freshVersion());
    const stale = await insertVersion(client, def, id, { ruledBase: 'peer_mesh.v3' });
    await step(client, all, 'made_live', null);
    await step(client, stale, 'made_live', p);
    const live = await resolveLiveQuestionnaire(tx, 'peer_mesh', p);
    expect(live.def?.versionId).toBe(all);
    expect(live.skipped).toEqual([{ versionId: stale, level: 'own', reason: 'stale' }]);
    const line = alarm.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('questionnaire.version_skipped'))!;
    expect(line).toContain(stale);
    expect(line).not.toMatch(/water|पानी/);
    // a stale version is still READ (and saved to) for its pins — validated against its OWN recorded base
    expect(await readQuestionnaireDefinition(tx, stale)).toMatchObject({ status: 'found', writable: true, origin: 'db' });
  });

  it('R1 — an INVALID row (a warning chain question) is ⛔ served: skipped to code, read-only for its pins, alarmed', async () => {
    const { tx, client } = getTx();
    const p = randomUUID();
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion(), randomUUID(), (cid) => [chainQuestion(cid, { warning: true })]);
    const bad = await insertVersion(client, def, id);
    await step(client, bad, 'made_live', null);
    const live = await resolveLiveQuestionnaire(tx, 'peer_mesh', p);
    expect(live.source).toBe('code');
    expect(live.skipped).toEqual([{ versionId: bad, level: 'all', reason: 'invalid' }]);
    expect(await readQuestionnaireDefinition(tx, bad)).toMatchObject({ status: 'found', writable: false });
    expect(alarm.mock.calls.some((c) => String(c[0]).includes('questionnaire.version_unreadable'))).toBe(true);
  });

  it('R1 — the STRICT parse: an unknown field, or a string "true", is ⛔ parseable (⛔ servable at all)', async () => {
    const { tx, client } = getTx();
    const mk = async (mutate: (stored: Record<string, unknown>) => void) => {
      const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion());
      const stored = JSON.parse(JSON.stringify(toStoredDefinition(def))) as Record<string, unknown>;
      mutate(stored);
      return insertVersion(client, def, id, { storedDefinition: stored });
    };
    const lastQ = (s: Record<string, unknown>) => ((s['pages'] as { questions: Record<string, unknown>[] }[]).at(-1)!.questions[0]!);
    const extraField = await mk((s) => (lastQ(s)['gates'] = true));
    const stringTrue = await mk((s) => (lastQ(s)['sensitive'] = 'true'));
    const withScope = await mk((s) => (s['scope'] = { kind: 'all' }));
    for (const v of [extraField, stringTrue, withScope]) {
      expect(await readQuestionnaireDefinition(tx, v)).toEqual({ status: 'unparseable', versionId: v });
      expect(await getQuestionnaireDefinition(tx, v)).toBeNull();
    }
    expect(await readQuestionnaireDefinition(tx, 'peer_mesh.v999999999')).toEqual({ status: 'missing', versionId: 'peer_mesh.v999999999' });
  });

  it("R3 — the ruled health questions' counselBasis is overlaid from the newest code version (whatever the row stored)", async () => {
    const { tx, client } = getTx();
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion());
    const stored = JSON.parse(JSON.stringify(toStoredDefinition(def))) as { pages: { questions: { key: string; counselBasis: unknown }[] }[] };
    for (const p of stored.pages) for (const q of p.questions) if (q.key === 'death_cause') q.counselBasis = '2026-11-01-500';
    const v = await insertVersion(client, def, id, { storedDefinition: stored });
    const read = await getQuestionnaireDefinition(tx, v);
    expect(questionsOf(read!).find((q) => q.key === 'death_cause')?.counselBasis).toBe('pending');
  });

  it("R4 — the explicit Pariwar predicate: on an RLS-BYPASSING connection P ⛔ sees Q's own version; as twt_app in Q the same", async () => {
    const { tx, client } = getTx();
    const [p, q] = [randomUUID(), randomUUID()];
    const own = await peerVersion(client);
    await step(client, own, 'made_live', q);
    // the test login is a superuser — RLS bypassed, exactly like the jobs' BYPASSRLS pool
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', p)).source).toBe('code');
    await enterAppScope(client, q);
    expect((await resolveLiveQuestionnaire(tx, 'peer_mesh', q)).def?.versionId).toBe(own);
  });

  it('a code id resolves from the code registry; QE3 — the boot check refuses a code id stored as a row', async () => {
    const { tx, client } = getTx();
    expect(await readQuestionnaireDefinition(tx, 'peer_mesh.v4')).toEqual({ status: 'found', def: PEER_MESH_QUESTIONNAIRE_V4, writable: true, origin: 'code' });
    await expect(assertNoCodeVersionInDatabase(tx)).resolves.toBeUndefined();
    // the floor CHECK would refuse 'peer_mesh.v4' — so lift it for this leg only (the boot check is the second line)
    await client.query('ALTER TABLE questionnaire_versions DROP CONSTRAINT questionnaire_versions_floor_check');
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, 4);
    await insertVersion(client, def, id);
    await expect(assertNoCodeVersionInDatabase(tx)).rejects.toThrow(/peer_mesh\.v4/);
  });
  // ── Code review RP6 / RV24 — the batched, COUNTED definition reads ────────────────────────────────────────────────────

  /** The statements a callback sends that SELECT from `questionnaire_versions` (drizzle passes a query config object). */
  async function versionSelects(client: Client, run: () => Promise<unknown>): Promise<number> {
    const spy = vi.spyOn(client, 'query');
    try {
      await run();
      return spy.mock.calls.filter(([q]) => {
        const text = typeof q === 'string' ? q : (q as { text?: string }).text ?? '';
        return /^\s*select/i.test(text) && /questionnaire_versions/i.test(text);
      }).length;
    } finally {
      spy.mockRestore();
    }
  }

  it('RP6 — a CODE-only set costs NO statement and reports `queried: false` (today\'s only claims: the console\'s ceiling is not touched)', async () => {
    const { tx, client } = getTx();
    let out: Awaited<ReturnType<typeof getQuestionnaireDefinitions>> | undefined;
    const n = await versionSelects(client, async () => {
      out = await getQuestionnaireDefinitions(tx, ['peer_mesh.v4', 'peer_mesh.v3', 'ground_inspection.v1', 'peer_mesh.v4']);
    });
    expect(n).toBe(0);
    expect(out!.queried).toBe(false);
    expect([...out!.defs.keys()].sort()).toEqual(['ground_inspection.v1', 'peer_mesh.v3', 'peer_mesh.v4']);
    expect(out!.defs.get('peer_mesh.v4')).toBe(PEER_MESH_QUESTIONNAIRE_V4);
    expect(databaseVersionIds(['peer_mesh.v4', 'ground_inspection.v1'])).toEqual([]);
  });

  it('RP6 — N distinct DATABASE ids cost ONE statement (⛔ one per version); a duplicate is read once; unknown and unparseable ⇒ `null` (the latter alarmed); the batch EQUALS the single read for every id', async () => {
    const { tx, client } = getTx();
    const a = await peerVersion(client);
    const b = await peerVersion(client);
    const c = await peerVersion(client);
    const junkDef = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion());
    const junk = await insertVersion(client, junkDef.def, junkDef.id, {
      storedDefinition: { kind: junkDef.def.kind, versionId: junkDef.def.versionId, version: junkDef.def.version, junk: true },
    });
    const invalid = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, freshVersion(), randomUUID(), (cid) => [chainQuestion(cid, { warning: true })]);
    const invalidId = await insertVersion(client, invalid.def, invalid.id); // parses, fails validation ⇒ served READ-ONLY
    const ids = [a, b, c, a, 'peer_mesh.v4', junk, invalidId, 'peer_mesh.v9999999'];
    expect(databaseVersionIds(ids).sort()).toEqual([a, b, c, junk, invalidId, 'peer_mesh.v9999999'].sort());
    let out: Awaited<ReturnType<typeof getQuestionnaireDefinitions>> | undefined;
    const n = await versionSelects(client, async () => {
      out = await getQuestionnaireDefinitions(tx, ids);
    });
    expect(n).toBe(1); // ONE statement for six DATABASE ids (two of them unreadable)
    expect(out!.queried).toBe(true);
    expect(out!.defs.get(junk)).toBeNull();
    expect(out!.defs.get('peer_mesh.v9999999')).toBeNull();
    expect(alarm).toHaveBeenCalledWith(expect.stringContaining('questionnaire.version_unreadable'), expect.stringContaining(junk));
    for (const id of ids) expect(out!.defs.get(id) ?? null, id).toEqual(await getQuestionnaireDefinition(tx, id)); // ≡ the single read
    expect(out!.defs.get(invalidId)).not.toBeNull(); // the invalid-but-parsed one IS served (read-only), as the single read does
  });

  it('RP6 — `readStepsFor`: every listed version\'s steps in `seq` order; an empty list sends no statement', async () => {
    const { tx, client } = getTx();
    const a = await peerVersion(client);
    const b = await peerVersion(client);
    await step(client, a, 'proposed');
    await step(client, b, 'proposed');
    await step(client, a, 'approved');
    const rows = await readStepsFor(tx, [a, b]);
    expect(rows.map((r) => [r.versionId, r.step])).toEqual([
      [a, 'proposed'],
      [b, 'proposed'],
      [a, 'approved'],
    ]); // by `seq` across versions
    expect((await readStepsFor(tx, [a])).map((r) => r.step)).toEqual(['proposed', 'approved']);
    expect(await versionSelects(client, () => readStepsFor(tx, []))).toBe(0);
    expect(await readStepsFor(tx, [])).toEqual([]);
  });
});
