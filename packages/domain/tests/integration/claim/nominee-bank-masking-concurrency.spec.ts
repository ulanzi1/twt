// NOMINEE-BANK MASKING SCHEDULE CONCURRENCY — a true two-connection race on the governed write
// (Story 11b.3a, SECOND-PASS code review 2026-09-03; load-bearing-invariant checklist family 2).
//
// ⛔ WHAT THIS EXISTS TO PROVE. The FIRST review pass added
// `SELECT pg_advisory_xact_lock(hashtext(pariwarId))` to `setNomineeBankMaskingSchedule` to fix a
// real defect: two interleaved `super_admin` PUTs both read the same `max(version)`, and the loser
// violates `…_pariwar_version_uq` (or `…_pariwar_current_uq`) with a bare `23505` — which is ⛔ NOT in
// the error-mapping registry, so a benign write-write race surfaced as an opaque 500.
//
// ⚠⛔ BUT NOTHING ASSERTED IT. Both existing suites are single-writer, so DELETING THE LOCK would have
// re-introduced the defect with every test still green — the exact "un-mechanized half decays" shape
// the checklist's family 2 exists to catch ([[feedback_mechanization_split_commitment]]).
//
// ⚠ THE TEST MUST BE ABLE TO FAIL, AND THAT IS THE HARD PART (the `rtbf-concurrency.spec.ts`
// discipline, reused). Two writes that merely start "at the same time" serialize BY CHANCE and pass
// with or without the lock — the vacuity this file exists to prevent. So the race is FORCED: writer A
// is held open PAST the point where writer B has already attempted its lock acquisition, and only
// then committed. Without the lock, B reads a stale `max(version)` while A is still uncommitted and
// collides on COMMIT; with it, B blocks until A commits and then reads the true head.
//
// ⚠ Own-committing (⛔ NOT `setupLiveDb`): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup deletes ONLY the rows this suite creates ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getNomineeBankMaskingHead,
  setNomineeBankMaskingSchedule,
} from '../../../src/claim/nominee-bank-masking-policy.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)(
  'nominee-bank masking schedule — two-connection write race (own-committing)',
  () => {
    let pool: pg.Pool;
    const createdPariwars: string[] = [];

    beforeAll(() => {
      pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    });

    afterAll(async () => {
      if (createdPariwars.length > 0) {
        const client = await pool.connect();
        try {
          // ⛔ ONLY this suite's own rows, by id — ⛔ never a truncate, ⛔ never a DROP SCHEMA.
          // ⚠ The app role has no DELETE on this table by design (a governance record is not
          // discarded), so the purge runs as the owner rather than through `twt_app`.
          await client.query(
            'DELETE FROM pariwar_nominee_bank_masking_schedule WHERE pariwar_id = ANY($1::uuid[])',
            [createdPariwars],
          );
        } catch (e) {
          console.error('[nominee-bank-masking-concurrency.spec] cleanup:', (e as Error).message);
        } finally {
          client.release();
        }
      }
      await pool.end();
    });

    /** A fresh tenant per test — ⛔ never the shared `PARIWAR_A`, whose counts other suites assert. */
    function freshPariwar(): string {
      const id = randomUUID();
      createdPariwars.push(id);
      return id;
    }

    /** Open a scoped transaction on its OWN client (caller commits/rolls back). */
    async function beginScoped(pariwar: string): Promise<pg.PoolClient> {
      const client = await pool.connect();
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, toPariwarId(pariwar));
      return client;
    }

    function governed(pariwar: string, maskAfterDays: number, effectiveFrom: Date) {
      return {
        pariwarId: toPariwarId(pariwar),
        setting: { mode: 'after_days' as const, maskAfterDays },
        effectiveFrom,
        changedByActor: randomUUID() as never,
        changedByDisplay: 'Kalpana Bharti',
        rationale: `Race fixture (${String(maskAfterDays)} days), second-pass review 2026-09-03.`,
        auditId: randomUUID(),
        actorGrants: [
          {
            pariwarId: pariwar,
            role: 'super_admin',
            scopeDimension: 'global' as const,
            scopeValue: null,
          },
        ],
      };
    }

    it(
      '⭐⭐ TWO INTERLEAVED WRITERS SERIALIZE — exactly one open head, versions 1 and 2, ⛔ no 23505',
      async () => {
        const pariwar = freshPariwar();

        // ── Writer A: takes the lock, does its whole sequence, and is HELD OPEN. ────────────────
        const a = await beginScoped(pariwar);
        await setNomineeBankMaskingSchedule(bindScopedDb(a), governed(pariwar, 30, new Date()));

        // ── Writer B: starts while A is STILL UNCOMMITTED. ──────────────────────────────────────
        // ⭐ THIS IS THE FORCED RACE. Without the advisory lock, B's `max(version)` read does not see
        // A's uncommitted row (READ COMMITTED), so B computes version 1 as well and collides on
        // COMMIT with a bare 23505. With the lock, B blocks HERE until A commits.
        const b = await beginScoped(pariwar);
        const bWrite = setNomineeBankMaskingSchedule(
          bindScopedDb(b),
          governed(pariwar, 7, new Date(Date.now() + 1000)),
        ).then(async () => {
          await b.query('COMMIT');
        });

        // Give B a real chance to get past the lock if the lock is not there. ⚠ Without this pause
        // the two writes can serialize by luck and the test passes vacuously.
        await new Promise((resolve) => setTimeout(resolve, 250));

        // Only NOW does A commit — releasing the lock B is waiting on.
        await a.query('COMMIT');

        // ⭐ B must SUCCEED. A rejection here means the lock is gone and the 500 is back.
        await expect(bWrite).resolves.toBeUndefined();

        a.release();
        b.release();

        // ── Assert the end state directly. ──────────────────────────────────────────────────────
        const verify = await beginScoped(pariwar);
        try {
          const rows = await verify.query<{ version: number; effective_until: Date | null }>(
            `SELECT version, effective_until FROM pariwar_nominee_bank_masking_schedule
              WHERE pariwar_id = $1 ORDER BY version`,
            [pariwar],
          );
          // Both writes landed, each with its own version — ⛔ neither lost, ⛔ neither duplicated.
          expect(rows.rows.map((r) => r.version)).toEqual([1, 2]);
          // ⭐ EXACTLY ONE OPEN HEAD. Two would mean the close-head step raced the insert.
          expect(rows.rows.filter((r) => r.effective_until === null)).toHaveLength(1);

          // And the head is B's setting — the LAST writer wins, which is what supersession means.
          const head = await getNomineeBankMaskingHead(bindScopedDb(verify), toPariwarId(pariwar));
          expect(head?.version).toBe(2);
          expect(head?.maskAfterDays).toBe(7);
        } finally {
          await verify.query('ROLLBACK').catch(() => undefined);
          verify.release();
        }
      },
      TIMEOUT,
    );

    it(
      '⭐ the lock is PER PARIWAR — a write to another tenant is ⛔ not blocked by a held lock',
      async () => {
        // ⚠ The other half: serialization must not become a global bottleneck on one hot lock. If
        // this ever hangs to timeout, the lock key stopped depending on `pariwarId`.
        const one = freshPariwar();
        const two = freshPariwar();

        const a = await beginScoped(one);
        await setNomineeBankMaskingSchedule(bindScopedDb(a), governed(one, 30, new Date()));

        // A still holds `one`'s lock. A write to `two` must complete without waiting for it.
        const b = await beginScoped(two);
        await setNomineeBankMaskingSchedule(bindScopedDb(b), governed(two, 7, new Date()));
        await b.query('COMMIT');
        b.release();

        await a.query('COMMIT');
        a.release();

        const verify = await beginScoped(two);
        try {
          const head = await getNomineeBankMaskingHead(bindScopedDb(verify), toPariwarId(two));
          expect(head?.maskAfterDays).toBe(7);
        } finally {
          await verify.query('ROLLBACK').catch(() => undefined);
          verify.release();
        }
      },
      TIMEOUT,
    );
  },
);
