// PER-PARIWAR DRIVE TARGET — a true two-connection race on the governed schedule write
// (Story 11b.13, code review 2026-09-06; load-bearing-invariant checklist family 2).
//
// ⛔ WHAT THIS EXISTS TO PROVE. `setDriveTargetSchedule` takes
// `SELECT pg_advisory_xact_lock(hashtext(pariwarId))` before its close-head / max-version /
// insert-head sequence, and checks `expectedVersion` INSIDE that lock. `2026-09-05-201` cl.6: the
// lock is what keeps a losing writer from ever reaching the insert and colliding on
// `…_pariwar_current_uq` / `…_pariwar_version_uq` with a bare `23505` → opaque 500.
//
// ⚠⛔ BUT EVERY OTHER SUITE IS SINGLE-TRANSACTION. `drive-target.spec.ts`'s "race" tests run writer B
// as a sequential call after writer A has already returned, inside ONE `getTx()` transaction — so
// `pg_advisory_xact_lock` never actually blocks anything and DELETING IT would leave every test
// green. That is the "un-mechanized half decays" shape family 2 exists to catch
// ([[feedback_mechanization_split_commitment]]). This file is the two-connection proof.
//
// ⚠ THE RACE IS FORCED (the `nominee-bank-masking-concurrency.spec.ts` discipline): writer A is held
// open PAST the point where writer B has already attempted its lock acquisition, and only then
// committed. Two writes that merely start "at the same time" serialize by chance and pass with or
// without the lock — the vacuity this file exists to prevent.
//
// ⚠ Own-committing (⛔ NOT `setupLiveDb`): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup deletes ONLY the rows this suite creates ([[project_live_db_test_gotchas]]); the
// app role has no DELETE on this table by design, so the purge runs as the owner.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ THE DISCRIMINATOR — ⛔ WITHOUT IT THIS FILE PROVES NOTHING (code review Pass 2)
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⚠⛔ As first written, this file's central claim was FALSE. Deleting the advisory lock left every
// assertion green, because the SAME review pass that added this file also added a `23505` →
// `DriveTargetVersionConflictError` backstop in `setDriveTargetSchedule`: with no lock, B passes its
// own `expectedVersion: null` check, collides on the unique index, and the backstop converts that
// into the SAME class with the SAME code this file asserts on. Two patches from one pass, and the
// second silently voided the first's proof value. ⇒ all three review layers independently walked
// the mutant and reached it.
//
// ⭐ WHAT SEPARATES THE TWO PATHS IS `actualVersion`:
//   · LOCK PRESENT  — B blocks, A commits, B RE-READS the head and sees version 1
//                     ⇒ the conflict carries `actualVersion === 1`.
//   · LOCK ABSENT   — B never re-reads; the backstop rethrows with the head B read BEFORE the
//                     insert, which was `null` ⇒ the conflict carries `actualVersion === null`.
// ⇒ asserting `actualVersion === 1` is what makes deleting `pg_advisory_xact_lock` FAIL this suite.
// ⛔ Do not weaken that assertion to `toBeDefined()` or drop it — it is the entire mechanization.
//
// ⚠⛔ HONEST LIMIT (family 10). The backstop's `catch` BODY is ⛔ not reachable from this suite while
// the lock stands — that is precisely what makes it defence-in-depth rather than the primary guard.
// Its predicate is pinned by a unit test (`tests/pool/drive-target.test.ts`); its live path is
// reachable only with the lock removed, and is ⛔ not faked here.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, userId as toUserId } from '../../../src/ids/index.js';
import {
  DriveTargetVersionConflictError,
  getDriveTargetHead,
  setDriveTargetSchedule,
} from '../../../src/pool/index.js';
import type { EffectiveGrant } from '../../../src/rbac/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)(
  'drive-target schedule — two-connection write race (own-committing)',
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
          // ⛔ ONLY this suite's own rows, by id — ⛔ never a truncate, ⛔ never a DROP SCHEMA. The
          // app role has no DELETE on this table (a governance record is not discarded), so the
          // purge runs as the owner rather than through `twt_app`.
          await client.query(
            'DELETE FROM pariwar_drive_target_schedule WHERE pariwar_id = ANY($1::uuid[])',
            [createdPariwars],
          );
        } catch (e) {
          console.error('[drive-target-concurrency.spec] cleanup:', (e as Error).message);
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

    function superAdminGrants(pariwar: string): EffectiveGrant[] {
      return [{ role: 'super_admin', pariwarId: pariwar, scopeDimension: 'global', scopeValue: null }];
    }

    /** The minimum governed FIRST write (`expectedVersion: null` — "I believe there is no head"). */
    function governedFirstWrite(pariwar: string, targetInr: number) {
      return {
        pariwarId: toPariwarId(pariwar),
        targetInr,
        expectedVersion: null as number | null,
        effectiveFrom: new Date(),
        changedByActor: toUserId(randomUUID()),
        changedByDisplay: 'Kalpana Bharti',
        rationale: `Race fixture (₹${String(targetInr)}), code review 2026-09-06.`,
        auditId: randomUUID(),
        actorGrants: superAdminGrants(pariwar),
      };
    }

    it(
      '⭐⭐ TWO INTERLEAVED FIRST-WRITES SERIALIZE — exactly one lands as version 1, the loser gets the REGISTERED 409, ⛔ never a bare 23505 and ⛔ never a second version',
      async () => {
        const pariwar = freshPariwar();

        let bError: unknown;
        // ⚠ try/finally (Pass 2): without it, a throw from A's write or COMMIT leaves an uncommitted
        // transaction holding the row + advisory locks, `afterAll`'s DELETE then blocks on it, and
        // `pool.end()` waits on the unreleased client — turning ONE failed assertion into a hung
        // suite that masks the original failure.
        const a = await beginScoped(pariwar);
        const b = await beginScoped(pariwar);
        try {
          // ── Writer A: takes the lock, writes version 1, and is HELD OPEN (uncommitted). ────────
          await setDriveTargetSchedule(bindScopedDb(a), governedFirstWrite(pariwar, 500_000));

          // ── Writer B: starts while A is STILL UNCOMMITTED, and also believes there is no head. ─
          // ⭐ THE FORCED RACE. Without the advisory lock, B's head read does not see A's uncommitted
          // row (READ COMMITTED), so B passes its own `expectedVersion: null` check, computes version
          // 1 as well, and collides on COMMIT with a bare 23505. With the lock, B blocks HERE until A
          // commits, then re-reads the head as version 1 and its `null` expectation is refused.
          const bWrite = (async () => {
            try {
              await setDriveTargetSchedule(bindScopedDb(b), governedFirstWrite(pariwar, 999_000));
              await b.query('COMMIT');
            } catch (err) {
              bError = err;
              await b.query('ROLLBACK').catch(() => undefined);
            }
          })();

          // Give B a real chance to get past the lock if the lock is not there. ⚠ Without this pause
          // the two writes can serialize by luck and the test passes vacuously.
          await new Promise((resolve) => setTimeout(resolve, 250));

          // Only NOW does A commit — releasing the lock B is waiting on.
          await a.query('COMMIT');
          await bWrite;
        } finally {
          await a.query('ROLLBACK').catch(() => undefined);
          await b.query('ROLLBACK').catch(() => undefined);
          a.release();
          b.release();
        }

        // ⭐ B was REFUSED — and with the registered typed error, ⛔ not a raw Postgres 23505.
        expect(bError).toBeInstanceOf(DriveTargetVersionConflictError);
        expect((bError as { code?: string }).code).toBe('pariwar.drive_target_version_conflict');

        // ⭐⭐ THE DISCRIMINATOR — see the file header. B's conflict must report the head it re-read
        // AFTER waiting on the lock (version 1), ⛔ NOT the `null` it read before A committed.
        // ⛔ DELETING `pg_advisory_xact_lock` FROM `setDriveTargetSchedule` FAILS EXACTLY HERE:
        // the `23505` backstop would rethrow with the pre-insert `actualVersion` of `null`, and
        // every other assertion in this test would still pass.
        expect((bError as DriveTargetVersionConflictError).actualVersion).toBe(1);
        expect((bError as DriveTargetVersionConflictError).expectedVersion).toBeNull();

        // ── Assert the end state directly. ─────────────────────────────────────────────────────
        const verify = await beginScoped(pariwar);
        try {
          const rows = await verify.query<{
            version: number;
            target_inr: string;
            effective_until: Date | null;
          }>(
            `SELECT version, target_inr, effective_until FROM pariwar_drive_target_schedule
              WHERE pariwar_id = $1 ORDER BY version`,
            [pariwar],
          );
          // ⭐ EXACTLY ONE ROW — A's. B's write never landed: ⛔ no lost update, ⛔ no duplicate.
          expect(rows.rows.map((r) => r.version)).toEqual([1]);
          expect(Number(rows.rows[0]?.target_inr)).toBe(500_000);
          // ⭐ EXACTLY ONE OPEN HEAD.
          expect(rows.rows.filter((r) => r.effective_until === null)).toHaveLength(1);

          const head = await getDriveTargetHead(bindScopedDb(verify), toPariwarId(pariwar));
          expect(head?.version).toBe(1);
          expect(head?.targetInr).toBe(500_000);
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

        // ⚠ try/finally (Pass 2) — same reasoning as the race test above.
        const a = await beginScoped(one);
        const b = await beginScoped(two);
        try {
          await setDriveTargetSchedule(bindScopedDb(a), governedFirstWrite(one, 500_000));

          // A still holds `one`'s lock. A write to `two` must complete without waiting for it.
          await setDriveTargetSchedule(bindScopedDb(b), governedFirstWrite(two, 750_000));
          await b.query('COMMIT');
          await a.query('COMMIT');
        } finally {
          await a.query('ROLLBACK').catch(() => undefined);
          await b.query('ROLLBACK').catch(() => undefined);
          a.release();
          b.release();
        }

        const verify = await beginScoped(two);
        try {
          const head = await getDriveTargetHead(bindScopedDb(verify), toPariwarId(two));
          expect(head?.version).toBe(1);
          expect(head?.targetInr).toBe(750_000);
        } finally {
          await verify.query('ROLLBACK').catch(() => undefined);
          verify.release();
        }
      },
      TIMEOUT,
    );
  },
);
