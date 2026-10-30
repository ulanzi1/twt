// Story 6.33 (Task 6; AC8, AC12) — the chain's steps SERIALIZE (two connections, committed): approve vs return, withdraw vs
// make-live, two make-lives of one version for one Pariwar, make-live vs revert. The second transaction BLOCKS on the
// advisory lock the first holds (asserted — ⛔ a sleep) and, once the first commits, reads its step and refuses (or, for the
// revert, ends the version just made live). Without the per-version step lock (or the live lock) each pair would both
// succeed. Every target is a fresh Pariwar (⛔ an all-Pariwar step is committed); the rows are removed after (superuser,
// `session_replication_role = replica` — the append-only triggers do ⛔ fire).

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  approveVersion,
  directVersion,
  makeVersionLive,
  proposeVersion,
  QuestionnaireChainError,
  returnVersion,
  revertPariwar,
  toStoredDefinition,
  withdrawVersion,
} from '../../../src/questionnaire-versions/index.js';
import { PEER_MESH_QUESTIONNAIRE_V4 } from '../../../src/questionnaires/index.js';
import { chainDefinition, chainQuestion } from '../../questionnaires/_chain-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PA = { actor: 'pa-actor', actorDisplay: 'Pariwar Admin' };
const SA = { actor: 'sa-actor', actorDisplay: 'Super Admin' };
const TICKS = { hindiReviewed: true, classificationAttested: true };
const pages = () => [...PEER_MESH_QUESTIONNAIRE_V4.pages, { questions: [chainQuestion(randomUUID())] }];

describe.skipIf(!hasDatabase)('Story 6.33 — the chain steps serialize on their advisory locks (two connections)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const versionIds: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (versionIds.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query(`DELETE FROM questionnaire_version_steps WHERE version_id = ANY($1)`, [versionIds]);
        await c.query(`DELETE FROM questionnaire_versions WHERE version_id = ANY($1)`, [versionIds]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[write-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  /** An open transaction — as `twt_app` in `pid` (tenant) or the superuser (global). */
  async function openTx(pid: string | null) {
    const client = await pool.connect();
    await client.query('BEGIN');
    if (pid !== null) {
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pid);
    }
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return {
      db: bindScopedDb(client),
      backendPid: rows[0]!.pid,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      },
    };
  }

  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`, [backendPid]);
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on a lock`);
  }

  /**
   * Blocked on an ADVISORY lock specifically (`wait_event = 'advisory'`). Review RV12 — a writer that lost the numbering lock would
   * still BLOCK on the `UNIQUE (kind, version)` index (a `transactionid` wait), hit the `23505`, and the retry would take the next
   * number: the same outcome through the BACKSTOP. Asserting the advisory wait is what proves the LOCK, not the backstop, serialised it.
   */
  async function waitUntilBlockedOnAdvisoryLock(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock' AND wait_event = 'advisory'`,
        [backendPid],
      );
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on an ADVISORY lock`);
  }

  const settle = <T,>(p: Promise<T>) =>
    p.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  const codeOf = (r: { ok: boolean; error?: unknown }) => (r.ok ? 'ok' : r.error instanceof QuestionnaireChainError ? r.error.code : String(r.error));

  /** A committed proposal in `pid` (optionally approved). */
  async function proposed(pid: string, approve = false): Promise<string> {
    const t = await openTx(pid);
    const v = await proposeVersion(t.db, { ...PA, pariwarId: pid, kind: 'peer_mesh', pages: pages() });
    if (approve) await approveVersion(t.db, { ...PA, pariwarId: pid, versionId: v.versionId, ...TICKS });
    await t.commit();
    versionIds.push(v.versionId);
    return v.versionId;
  }

  it('approve vs return: the return WAITS on the step lock, then sees the approval ⇒ not_approvable', async () => {
    const p = randomUUID();
    const v = await proposed(p);
    const t1 = await openTx(p);
    const t2 = await openTx(p);
    await approveVersion(t1.db, { ...PA, pariwarId: p, versionId: v, ...TICKS });
    const second = settle(returnVersion(t2.db, { ...PA, pariwarId: p, versionId: v, note: 'please reword' }));
    await waitUntilBlocked(t2.backendPid);
    await t1.commit();
    const r = await second;
    await (r.ok ? t2.commit() : t2.rollback());
    expect(codeOf(r)).toBe('questionnaire.not_approvable');
  });

  it('withdraw vs make-live: the withdraw WAITS, then sees the version live ⇒ not_withdrawable', async () => {
    const p = randomUUID();
    const v = await proposed(p, true);
    const g = await openTx(null);
    const t = await openTx(p);
    await makeVersionLive(g.db, { ...SA, versionId: v, targetPariwarId: p, acknowledgeBaseMoved: false });
    const second = settle(withdrawVersion(t.db, { ...PA, pariwarId: p, versionId: v }));
    await waitUntilBlocked(t.backendPid);
    await g.commit();
    const r = await second;
    await (r.ok ? t.commit() : t.rollback());
    expect(codeOf(r)).toBe('questionnaire.not_withdrawable');
  });

  it('review round 4 (RF7) — withdraw vs a direct version BASED on it: the direct path WAITS on the base\'s step lock, then sees it withdrawn ⇒ base_invalid', async () => {
    const [p, q] = [randomUUID(), randomUUID()];
    const v = await proposed(p, true);
    const t = await openTx(p);
    const g = await openTx(null);
    await withdrawVersion(t.db, { ...PA, pariwarId: p, versionId: v });
    const second = settle(
      directVersion(g.db, { ...SA, kind: 'peer_mesh', targetPariwarId: q, baseVersionId: v, pages: pages(), reason: 'modify', ...TICKS, acknowledgeBaseMoved: true }),
    );
    await waitUntilBlockedOnAdvisoryLock(g.backendPid);
    await t.commit();
    const r = await second;
    if (r.ok) versionIds.push(r.value.versionId);
    await (r.ok ? g.commit() : g.rollback());
    expect(codeOf(r)).toBe('questionnaire.base_invalid');
  });

  it('two make-lives of one version for one Pariwar: the second WAITS, then sees it live there ⇒ not_publishable', async () => {
    const p = randomUUID();
    const v = await proposed(p, true);
    const g1 = await openTx(null);
    const g2 = await openTx(null);
    await makeVersionLive(g1.db, { ...SA, versionId: v, targetPariwarId: p, acknowledgeBaseMoved: false });
    const second = settle(makeVersionLive(g2.db, { ...SA, versionId: v, targetPariwarId: p, acknowledgeBaseMoved: false }));
    await waitUntilBlocked(g2.backendPid);
    await g1.commit();
    const r = await second;
    await (r.ok ? g2.commit() : g2.rollback());
    expect(codeOf(r)).toBe('questionnaire.not_publishable');
  });

  it('make-live vs revert: the revert WAITS on the live lock, then ENDS the version just made live (⛔ "nothing to revert")', async () => {
    const p = randomUUID();
    const v = await proposed(p, true);
    const g1 = await openTx(null);
    const g2 = await openTx(null);
    await makeVersionLive(g1.db, { ...SA, versionId: v, targetPariwarId: p, acknowledgeBaseMoved: false });
    const second = settle(revertPariwar(g2.db, { ...SA, kind: 'peer_mesh', targetPariwarId: p }));
    await waitUntilBlocked(g2.backendPid);
    await g1.commit();
    const r = await second;
    await (r.ok ? g2.commit() : g2.rollback());
    expect(r).toEqual({ ok: true, value: { endedVersionId: v } });
  });
  // Review RV12 — the QE3 NUMBERING lock. Without it two writers read the same `max(version) + 1`, and the only thing left is
  // the `23505` backstop. (The first transaction holds the lock until it commits; the second must BLOCK, then take the next number.)
  const numberOf = (versionId: string) => Number(versionId.split('.v')[1]);

  it('propose vs propose (QE3): the second WAITS on the numbering lock, then takes the NEXT number — ⛔ the same one', async () => {
    const [p1, p2] = [randomUUID(), randomUUID()];
    const t1 = await openTx(p1);
    const t2 = await openTx(p2);
    const first = await proposeVersion(t1.db, { ...PA, pariwarId: p1, kind: 'peer_mesh', pages: pages() });
    const second = settle(proposeVersion(t2.db, { ...PA, pariwarId: p2, kind: 'peer_mesh', pages: pages() }));
    await waitUntilBlockedOnAdvisoryLock(t2.backendPid);
    await t1.commit();
    versionIds.push(first.versionId);
    const r = await second;
    await (r.ok ? t2.commit() : t2.rollback());
    expect(r.ok).toBe(true);
    if (r.ok) {
      versionIds.push(r.value.versionId);
      expect(numberOf(r.value.versionId)).toBe(numberOf(first.versionId) + 1);
    }
  });

  it('propose vs direct (QE3): the Super Admin\'s direct version WAITS on the same numbering lock, then takes the NEXT number', async () => {
    const [p, target] = [randomUUID(), randomUUID()];
    const t = await openTx(p);
    const g = await openTx(null);
    const first = await proposeVersion(t.db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: pages() });
    const second = settle(
      directVersion(g.db, { ...SA, kind: 'peer_mesh', targetPariwarId: target, pages: pages(), reason: 'race', ...TICKS, acknowledgeBaseMoved: false }),
    );
    await waitUntilBlockedOnAdvisoryLock(g.backendPid);
    await t.commit();
    versionIds.push(first.versionId);
    const r = await second;
    await (r.ok ? g.commit() : g.rollback());
    expect(r.ok).toBe(true);
    if (r.ok) {
      versionIds.push(r.value.versionId);
      expect(numberOf(r.value.versionId)).toBe(numberOf(first.versionId) + 1);
    }
  });
  it('review RP11 — the 23505 BACKSTOP, end to end: a writer that holds the next number WITHOUT the numbering lock makes a proposal block on the unique index, hit the collision, and RETRY into the following number', async () => {
    const [p] = [randomUUID()];
    const rogue = await openTx(null); // a superuser transaction that does ⛔ take the numbering lock (a path that forgot it)
    const { rows } = await rogue.db.execute<{ n: number }>(
      sql`SELECT (greatest(999, coalesce(max(version), 0)) + 1)::int AS n FROM questionnaire_versions WHERE kind = 'peer_mesh'`,
    );
    const taken = Number(rows[0]!.n);
    const { id, def } = chainDefinition(PEER_MESH_QUESTIONNAIRE_V4, taken);
    await rogue.db.execute(
      sql`INSERT INTO questionnaire_versions (id, kind, version, version_id, base_version_id, ruled_base_code_version_id, origin_pariwar_id, definition, authored_by_actor, authored_by_display, direct, reason)
          VALUES (${id}, 'peer_mesh', ${taken}, ${def.versionId}, 'peer_mesh.v4', 'peer_mesh.v4', NULL, ${JSON.stringify(toStoredDefinition(def))}::jsonb, 'rogue', 'Rogue', true, 'race')`,
    );
    versionIds.push(def.versionId);
    const t = await openTx(p);
    const second = settle(proposeVersion(t.db, { ...PA, pariwarId: p, kind: 'peer_mesh', pages: pages() }));
    await waitUntilBlocked(t.backendPid); // on the UNIQUE index (a transactionid wait), ⛔ the advisory lock
    await rogue.commit();
    const r = await second;
    await (r.ok ? t.commit() : t.rollback());
    expect(r.ok, r.ok ? '' : String((r as { error: unknown }).error)).toBe(true);
    if (r.ok) {
      versionIds.push(r.value.versionId);
      expect(numberOf(r.value.versionId)).toBe(taken + 1); // the retry took the NEXT number
    }
  });
});
