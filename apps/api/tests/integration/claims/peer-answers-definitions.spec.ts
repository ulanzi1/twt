// Story 6.33 (review RP6 / RV24) — the assembler's DEFINITION reads are COUNTED and BATCHED: a pin that is a CODE version costs
// ⛔ statement, ⛔ savepoint and ⛔ `bump` (today's only claims — the console's ceiling is untouched); ANY number of DATABASE pins costs
// exactly ONE `bump` and ONE `run` (one statement), so the ceiling's "+2 conditional" is real and the original defect — the
// reads shipped uncounted — cannot come back without this failing. Live DB (the chain rows are removed after).

import { randomUUID } from 'node:crypto';

import { questionnaires, questionnaireVersions } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { definitionsFor, type PeerAnswersContext } from '../../../src/modules/claims/peer-answers-assembler.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

describe.skipIf(!hasDatabase)('Story 6.33 (RP6) — definitionsFor: counted and batched', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  const versionIds: string[] = [];

  beforeAll(() => {
    td = buildTestDeps();
    deps = td.deps;
  });

  afterAll(async () => {
    if (versionIds.length > 0) {
      const c = await td.pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [versionIds]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[peer-answers-definitions.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await td.pool.end();
  });

  /** A valid peer_mesh DATABASE version (v4 + one staff question), inserted as the superuser. */
  async function chainVersion(): Promise<string> {
    const v4 = questionnaires.PEER_MESH_QUESTIONNAIRE_V4;
    const id = randomUUID();
    const version = 2_100_000 + Math.floor(Math.random() * 800_000);
    const versionId = `peer_mesh.v${version}`;
    const def = {
      ...v4,
      versionId,
      version,
      approvedBy: [...v4.approvedBy, `chain:${id}`],
      pages: [
        ...v4.pages,
        {
          questions: [
            {
              key: 'water_source',
              kind: 'single' as const,
              text: { en: 'Where did {member} get water?', hi: '{member} पानी कहाँ से लाते थे?' },
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
            },
          ],
        },
      ],
    };
    await td.pool.query(
      `INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
       VALUES ($1, 'peer_mesh', $2, $3, 'peer_mesh.v4', 'peer_mesh.v4', NULL, $4, 'pa', 'Pariwar Admin', true, 'fixture')`,
      [id, version, versionId, JSON.stringify(questionnaireVersions.toStoredDefinition(def as never))],
    );
    versionIds.push(versionId);
    return versionId;
  }

  /** `definitionsFor` on a real scope handle, with a counting `bump` and a spy `run` (the console's SAVEPOINT wrapper). */
  async function call(ids: readonly (string | null)[]) {
    const scope = await openScopeTx(deps, randomUUID());
    const bump = vi.fn();
    const run = vi.fn(async <T>(_label: string, read: () => Promise<T>) => read());
    try {
      const defs = await definitionsFor({ db: scope.tx, run } as unknown as PeerAnswersContext, bump, 'peer_section_reply_definitions', ids);
      return { defs, bump, run };
    } finally {
      await closeScopeTx(scope, true);
    }
  }

  it('CODE pins only (and nulls): ⛔ bump, ⛔ run — the definitions come from the registry, ZERO statements', async () => {
    const { defs, bump, run } = await call(['peer_mesh.v4', null, 'peer_mesh.v3', 'peer_mesh.v4', 'ground_inspection.v1']);
    expect(bump).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect([...defs.keys()].sort()).toEqual(['ground_inspection.v1', 'peer_mesh.v3', 'peer_mesh.v4']);
  });

  it('ONE database pin ⇒ exactly one `bump` and one `run`, under the label the console\'s read ledger names', async () => {
    const v = await chainVersion();
    const { defs, bump, run } = await call([v]);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]![0]).toBe('peer_section_reply_definitions');
    expect(defs.get(v)?.versionId).toBe(v);
  });

  it('THREE distinct database pins mixed with code pins and a duplicate ⇒ STILL one `bump` and one `run` (batched, ⛔ one per version)', async () => {
    const [a, b, c] = [await chainVersion(), await chainVersion(), await chainVersion()];
    const { defs, bump, run } = await call([a, 'peer_mesh.v4', b, c, a, null]);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect([...defs.keys()].sort()).toEqual([a, b, c, 'peer_mesh.v4'].sort());
    for (const v of [a, b, c]) expect(defs.get(v)).not.toBeNull();
  });
});
