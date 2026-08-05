// Contribution-fact producer — live-DB integration (Story 10.24; AC1, AC4, AC5, AC7, D2, D3). :5433
//
// The end-to-end proofs the pure unit tests structurally cannot give:
//
//   · AC4 — `skips_current_year` derives from assignment ∩ verdict, with EACH ARM proven independently
//     (assigned+confirmed / assigned+reversed / assigned+cycle-open / not-assigned / assigned+mismatch).
//   · D2  — ONLY APPLIED R7 clauses reach `applicableNiyamavaliClauses[]`. The two behavioural tests
//     that make the story's highest-severity trap impossible to reintroduce silently.
//   · AC7 — the counted-query assertion: a 1-contribution member and an N-contribution member cost the
//     IDENTICAL number of queries. That is the definition of "no N+1", and a counted assertion survives
//     a refactor that a comment does not.
//   · D3  — the ACCEPTANCE-level equivalence: `deriveContributionFacts` over the incrementally-
//     maintained tables equals it over freshly-backfilled tables for the same (member, at). A diff here
//     is a P0 finding, not a tolerance — one mechanism is wrong and every downstream fact untrustworthy.
//   · AC1 — as-of correctness: a historical `at` returns what was true AT `at`, not what is true now.
//
// Own-committing (NOT setupLiveDb): the engine's keyed store + audit writer commit their own txs. Every
// assertion keys on membership / our own rows / explicit values, NEVER a global count
// ([[project_live_db_test_gotchas]]). Real CI `test (unit)` runs with DATABASE_URL UNSET → this skips.

import { randomUUID } from 'node:crypto';

import { contribution, createDb, ids, idempotency, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  deriveContributionFacts,
  getValidityAt,
  scanR7ViolatorCandidates,
  type ValidityServiceDeps,
} from '../../src/index.js';
import { R7_PAYLOADS } from '../fixtures/r7-clauses.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** The pinned evaluation instant for every case below (mid-2026, so the IST year is 2026). */
const AT = new Date('2026-08-05T00:00:00.000Z');

describe.skipIf(!hasDatabase)(
  'Story 10.24 — the contribution-fact producer (live DB, own-committing) (:5433)',
  { timeout: 20000 },
  () => {
    let db: Db;
    let pool: pg.Pool;
    let deps: ValidityServiceDeps;

    beforeAll(() => {
      if (!hasDatabase) return;
      const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
      db = created.db;
      pool = created.pool;
      deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
    });

    afterAll(async () => {
      if (pool) await pool.end();
    });

    /** Seed the four ACTIVATED R7 clauses for a Pariwar (the HELD three are deliberately NOT seeded). */
    async function seedActivatedR7(pariwarId: ids.PariwarId): Promise<void> {
      for (const clauseId of [
        'niy.contribution-discipline.r7-c',
        'niy.contribution-discipline.r7-d',
        'niy.contribution-discipline.r7-e',
        'niy.contribution-discipline.r7-f',
      ]) {
        await db.insert(schema.clauseVersions).values({
          clauseVersionId: ids.clauseVersionId(randomUUID()),
          clauseId: ids.clauseId(clauseId),
          pariwarId,
          version: 1,
          effectiveDate: new Date('2000-01-01T00:00:00Z'),
          payload: { ...R7_PAYLOADS[clauseId] },
          benefitMechanism: 'pool',
        });
      }
    }

    /** A member row + the event chain that replays to `active`. */
    async function seedMember(pariwarId: ids.PariwarId, memberId: ids.MemberId): Promise<void> {
      const joinedAt = new Date('2020-01-01T00:00:00Z');
      const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
      await db.insert(schema.members).values({
        memberId,
        pariwarId,
        state: 'active',
        stateEventVersion: 4,
      });
      for (const [version, eventType, occurredAt] of [
        [1, 'member.signup_initiated', joinedAt],
        [2, 'member.kyc_completed', at(2)],
        [3, 'member.vyawastha_shulk_paid', at(3)],
        [4, 'member.lock_in_expired', at(4)],
      ] as const) {
        await db.insert(schema.eventsLog).values({
          streamId: memberId,
          eventType,
          payload: eventType === 'member.lock_in_expired' ? { kyc_verified: true } : {},
          eventVersion: version,
          actorId: null,
          pariwarId,
          occurredAt,
        });
      }
    }

    /** Append a `contribution.confirmed` on an alert stream — the TRIGGER projects it into the ledger. */
    async function confirm(
      pariwarId: ids.PariwarId,
      alertId: string,
      memberId: string,
      poolId: string,
      version: number,
      occurredAt: Date,
    ): Promise<string> {
      const eventId = randomUUID();
      await db.insert(schema.eventsLog).values({
        eventId,
        streamId: alertId,
        eventType: 'contribution.confirmed',
        payload: { memberId, poolId, alertId },
        eventVersion: version,
        actorId: null,
        pariwarId,
        occurredAt,
      });
      return eventId;
    }

    /** Append a reversal naming an exact confirmation event id. */
    async function reverse(
      pariwarId: ids.PariwarId,
      alertId: string,
      memberId: string,
      reversedConfirmedEventId: string,
      version: number,
      occurredAt: Date,
    ): Promise<void> {
      await db.insert(schema.eventsLog).values({
        streamId: alertId,
        eventType: 'reconciliation.confirmation-reversed',
        payload: { memberId, reversedConfirmedEventId, alertId },
        eventVersion: version,
        actorId: null,
        pariwarId,
        occurredAt,
      });
    }

    /**
     * Seed a whole cycle: the freeze commit, the alert, the pool, the members' assignments — and
     * (unless `closedAt` is null) the `alert.closed` event that makes the cycle closed AS OF that
     * instant. Driven through the raw pool because the alert/pool state columns are projector-guarded
     * and the guard GUC must be armed on the same session as the INSERT (this harness is
     * own-committing, so there is no enclosing transaction to `SET LOCAL` on).
     */
    async function seedCycleFixture(
      pariwarId: ids.PariwarId,
      memberIds: readonly string[],
      opts: { assignedAt: Date; closedAt: Date | null },
    ): Promise<{ cycleId: string; poolId: string; alertId: string }> {
      const cycleId = randomUUID();
      const poolId = randomUUID();
      const alertId = randomUUID();
      const claimCaseId = randomUUID();

      await pool.query(
        `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
         VALUES ($1,$2,'trustee-actor-1','Trustee One','{}',$3)`,
        [cycleId, pariwarId, opts.assignedAt],
      );
      // The alert/pool state columns are projector-guarded (migrations 0071/0078). The guard reads a
      // session GUC, so the SET and the INSERT must run on the SAME connection — hence an explicitly
      // checked-out client rather than `pool.query`, which may hand out a different session each call.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL app.alert_state_writer = 'on'");
        await client.query(
          `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor)
           VALUES ($1,$2,$3,1,'live',3,'trustee-actor-1')`,
          [alertId, cycleId, pariwarId],
        );
        await client.query("SET LOCAL app.pool_state_writer = 'on'");
        await client.query(
          `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier,
                              support_category, benefit_mechanism, fixed_amount, current_state, state_event_version)
           VALUES ($1,$2,$3,$4,0,$5,'death_support','pool',500,'spawned',1)`,
          [poolId, pariwarId, cycleId, claimCaseId, `P-${poolId.slice(0, 8)}`],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      for (const memberId of memberIds) {
        await pool.query(
          `INSERT INTO member_pool_assignments (pool_id, member_id, pariwar_id, cycle_id, assigned_at)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [poolId, memberId, pariwarId, cycleId, opts.assignedAt],
        );
      }
      if (opts.closedAt !== null) {
        await pool.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
           VALUES ($1,'alert.closed','{}'::jsonb, 9, NULL, $2, $3)`,
          [alertId, pariwarId, opts.closedAt],
        );
      }
      return { cycleId, poolId, alertId };
    }

    // ── AC4: skips_current_year = assignment ∩ verdict, each arm proven independently ─────────────
    describe('AC4 — skips_current_year derives from assignment ∩ verdict', () => {
      const assignedAt = new Date('2026-02-01T00:00:00Z');
      const closedAt = new Date('2026-03-01T00:00:00Z');

      async function skipCountFor(
        setup: (p: ids.PariwarId, m: string) => Promise<void>,
      ): Promise<number> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await setup(pariwarId, memberId);
        const inputs = await contribution.readContributionFactInputs(
          db,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        return inputs.skipsCurrentYear;
      }

      it('assigned + LIVE confirmation → NOT a skip', async () => {
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
              assignedAt,
              closedAt,
            });
            await confirm(pariwarId, alertId, memberId, poolId, 1, new Date('2026-02-10T00:00:00Z'));
          }),
        ).toBe(0);
      });

      it('assigned + confirmation REVERSED → IS a skip (the reversal is honoured)', async () => {
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
              assignedAt,
              closedAt,
            });
            const eventId = await confirm(
              pariwarId,
              alertId,
              memberId,
              poolId,
              1,
              new Date('2026-02-10T00:00:00Z'),
            );
            await reverse(
              pariwarId,
              alertId,
              memberId,
              eventId,
              2,
              new Date('2026-02-20T00:00:00Z'),
            );
          }),
        ).toBe(1);
      });

      it('assigned + cycle STILL OPEN → NOT a skip (a member mid-window has missed nothing)', async () => {
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            await seedCycleFixture(pariwarId, [memberId], { assignedAt, closedAt: null });
          }),
        ).toBe(0);
      });

      it('NOT assigned → NOT a skip (a cycle you were never on cannot be missed)', async () => {
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            // The cycle exists and closes, but this member is not on its roster.
            await seedCycleFixture(pariwarId, [randomUUID()], { assignedAt, closedAt });
            void memberId;
          }),
        ).toBe(0);
      });

      it('assigned + a MISMATCH (red, never confirmed) → IS a skip', async () => {
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
              assignedAt,
              closedAt,
            });
            await pool.query(
              `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
               VALUES ($1,'contribution.reconciliation-mismatch',$2::jsonb,1,NULL,$3,$4)`,
              [
                alertId,
                JSON.stringify({ memberId, poolId, alertId }),
                pariwarId,
                new Date('2026-02-10T00:00:00Z'),
              ],
            );
          }),
        ).toBe(1);
      });

      it('a cycle closed AFTER `at` is not yet a skip — as-of correctness (AC1)', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCycleFixture(pariwarId, [memberId], {
          assignedAt,
          closedAt: new Date('2026-09-01T00:00:00Z'), // AFTER the pinned AT
        });
        const inputs = await contribution.readContributionFactInputs(
          db,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        expect(inputs.skipsCurrentYear).toBe(0);
      });

      it('a PRIOR calendar year assignment is out of the current-year window', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date('2025-06-01T00:00:00Z'),
          closedAt: new Date('2025-07-01T00:00:00Z'),
        });
        const inputs = await contribution.readContributionFactInputs(
          db,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        expect(inputs.skipsCurrentYear).toBe(0);
      });
    });

    // ── AC1: as-of correctness of the ledger aggregates ───────────────────────────────────────────
    it('AC1 — a reversal that happened AFTER `at` does NOT apply AT `at` (replay correctness)', async () => {
      const pariwarId = ids.pariwarId(randomUUID());
      const memberId = randomUUID();
      const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
        assignedAt: new Date('2026-01-05T00:00:00Z'),
        closedAt: new Date('2026-02-05T00:00:00Z'),
      });
      const eventId = await confirm(
        pariwarId,
        alertId,
        memberId,
        poolId,
        1,
        new Date('2026-01-10T00:00:00Z'),
      );
      await reverse(pariwarId, alertId, memberId, eventId, 2, new Date('2026-07-01T00:00:00Z'));

      const scope = { pariwarId, memberId: ids.memberId(memberId) };
      // BEFORE the reversal: the confirmation is live, so it counts and the cycle is not a skip.
      const before = await contribution.readContributionFactInputs(
        db,
        scope,
        new Date('2026-03-01T00:00:00Z'),
      );
      expect(before.totalCount).toBe(1);
      expect(before.skipsCurrentYear).toBe(0);

      // AFTER the reversal: it no longer counts, and the closed cycle becomes a skip.
      const after = await contribution.readContributionFactInputs(db, scope, AT);
      expect(after.totalCount).toBe(0);
      expect(after.skipsCurrentYear).toBe(1);
    });

    // ── AC7: the counted-query assertion (the binding structural criterion) ───────────────────────
    it('AC7 — the fact read costs the SAME number of queries for 1 vs N contributions (no N+1)', async () => {
      /** Wrap the Db handle and count every query it issues. */
      function countingDb(): { handle: Db; count: () => number } {
        let n = 0;
        const target = db as unknown as Record<string, unknown>;
        const proxy = new Proxy(target, {
          get(obj, prop, receiver) {
            const value = Reflect.get(obj, prop, receiver);
            if ((prop === 'select' || prop === 'execute') && typeof value === 'function') {
              return (...args: unknown[]) => {
                n += 1;
                return (value as (...a: unknown[]) => unknown).apply(obj, args);
              };
            }
            return typeof value === 'function' ? (value as () => unknown).bind(obj) : value;
          },
        });
        return { handle: proxy as unknown as Db, count: () => n };
      }

      async function queriesFor(contributionCount: number): Promise<number> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date('2026-01-05T00:00:00Z'),
          closedAt: new Date('2026-02-05T00:00:00Z'),
        });
        for (let i = 0; i < contributionCount; i += 1) {
          await confirm(
            pariwarId,
            alertId,
            memberId,
            poolId,
            // Offset past the `alert.closed` seed's event_version 9 — the stream is shared, and a
            // collision on (stream_id, event_version) would look like a producer bug rather than a
            // fixture one.
            i + 100,
            new Date(Date.UTC(2026, 0, 10, 0, 0, i)),
          );
        }
        const counting = countingDb();
        await contribution.readContributionFactInputs(
          counting.handle,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        return counting.count();
      }

      const one = await queriesFor(1);
      const many = await queriesFor(25);
      // An N-INDEPENDENT read is the definition of "no N+1". Asserting equality (rather than a
      // threshold) is what makes a future per-row read fail here instead of merely looking slower.
      expect(many).toBe(one);
      expect(one).toBe(2); // one ledger aggregate + one missed-cycle aggregate — and nothing else.
    });

    // ── D3: the ACCEPTANCE-level equivalence (a diff here is a P0 finding) ────────────────────────
    it('D3 — facts over the INCREMENTAL tables === facts over FRESHLY-BACKFILLED tables', async () => {
      const pariwarId = ids.pariwarId(randomUUID());
      const memberId = randomUUID();
      const scope = { pariwarId, memberId: ids.memberId(memberId) };

      // A fixture exercising confirmations, a reversal, an open cycle and a closed cycle.
      const closedCycle = await seedCycleFixture(pariwarId, [memberId], {
        assignedAt: new Date('2026-01-05T00:00:00Z'),
        closedAt: new Date('2026-02-05T00:00:00Z'),
      });
      const openCycle = await seedCycleFixture(pariwarId, [memberId], {
        assignedAt: new Date('2026-06-05T00:00:00Z'),
        closedAt: null,
      });
      const missedCycle = await seedCycleFixture(pariwarId, [memberId], {
        assignedAt: new Date('2026-03-05T00:00:00Z'),
        closedAt: new Date('2026-04-05T00:00:00Z'),
      });
      await confirm(
        pariwarId,
        closedCycle.alertId,
        memberId,
        closedCycle.poolId,
        1,
        new Date('2026-01-10T00:00:00Z'),
      );
      const reversed = await confirm(
        pariwarId,
        openCycle.alertId,
        memberId,
        openCycle.poolId,
        1,
        new Date('2026-06-10T00:00:00Z'),
      );
      await reverse(
        pariwarId,
        openCycle.alertId,
        memberId,
        reversed,
        2,
        new Date('2026-06-20T00:00:00Z'),
      );
      void missedCycle;

      const incremental = deriveContributionFacts(
        await contribution.readContributionFactInputs(db, scope, AT),
        AT,
      );

      // Wipe both projections for THIS member only, then rebuild from the surviving source data.
      await pool.query(`DELETE FROM member_contribution_ledger WHERE member_id = $1`, [memberId]);
      await pool.query(`DELETE FROM member_pool_assignments WHERE member_id = $1`, [memberId]);
      await contribution.backfillContributionLedger(db, pariwarId);
      // The assignment backfill sources `pool_snapshots`, which this fixture does not write (the
      // assignments were inserted directly), so it is re-seeded the same way — what is under test here
      // is the LEDGER rebuild plus the fact-level agreement, not the snapshot pathway (that arm is
      // covered by the domain projection-equivalence spec).
      for (const cycle of [closedCycle, openCycle, missedCycle]) {
        await pool.query(
          `INSERT INTO member_pool_assignments (pool_id, member_id, pariwar_id, cycle_id, assigned_at)
           SELECT $1,$2,$3,$4, c.committed_at FROM cycle_freeze_commits c WHERE c.commit_id = $4
           ON CONFLICT DO NOTHING`,
          [cycle.poolId, memberId, pariwarId, cycle.cycleId],
        );
      }

      const rebuilt = deriveContributionFacts(
        await contribution.readContributionFactInputs(db, scope, AT),
        AT,
      );

      // ⚠ A DIFF HERE IS A P0 FINDING, not a tolerance: it means one of the two maintenance
      // mechanisms is wrong and every fact downstream of it is untrustworthy.
      expect(rebuilt).toEqual(incremental);
      expect(incremental).not.toBeNull();
    });

    // ── D2: ONLY APPLIED R7 clauses reach the payload (the story's highest-severity trap) ─────────
    // ── Revert-sanity probe #2 (Task 5, D2 — RUN AND RECORDED, not asserted-by-comment) ────────────
    // A green scan proves nothing ([[feedback_gate_scope_semantic_coverage]]). Probe RUN 2026-08-05:
    // removing `.filter((entry) => entry.applied)` from `evaluateAppliedR7ClauseSlots` (rules.ts) made
    // the FIRST test below ("ZERO applied R7 clauses contributes ZERO R7 entries") go RED — the clean
    // member in that fixture acquired all FOUR activated R7 entries (`r7-c`, `r7-d`, `r7-e`, `r7-f`,
    // each `r7_not_applicable`) instead of the expected `[]`. That is D2's predicted catastrophe,
    // reproduced exactly: a member with no applied clause would have four violator flags on the
    // Trustee-Lite surface. Restored immediately.
    describe('D2 — only APPLIED R7 clauses enter applicableNiyamavaliClauses[]', () => {
      /** Every call here is a genuine trusted internal read — never an unaudited accidental one. */
      function internalCall(): { internal: true } {
        return { internal: true };
      }

      it('a member with ZERO applied R7 clauses contributes ZERO R7 entries', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = ids.memberId(randomUUID());
        await seedActivatedR7(pariwarId);
        await seedMember(pariwarId, memberId);
        // A recent confirmation ⇒ months_since_last = 0, skips = 0, total = 1: nothing fires.
        const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date('2026-07-01T00:00:00Z'),
          closedAt: new Date('2026-08-01T00:00:00Z'),
        });
        await confirm(
          pariwarId,
          alertId,
          memberId,
          poolId,
          1,
          new Date('2026-07-10T00:00:00Z'),
        );

        const payload = await getValidityAt(deps, { pariwarId, memberId }, AT, internalCall());
        const r7 = payload.applicableNiyamavaliClauses.filter((c) =>
          String(c.clauseId).startsWith('niy.contribution-discipline.'),
        );
        // THE assertion. If this ever returns four `r7_not_applicable` entries, the Trustee-Lite
        // violator section recommends suspending every member in the Pariwar.
        expect(r7).toEqual([]);
        expect(payload.contributionHistorySummary.status).toBe('ok');
      });

      it('a member with months_since_last = 13 contributes EXACTLY r7-c and r7-f — never r7-d/r7-e', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = ids.memberId(randomUUID());
        await seedActivatedR7(pariwarId);
        await seedMember(pariwarId, memberId);
        const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date('2025-06-01T00:00:00Z'),
          closedAt: new Date('2025-07-01T00:00:00Z'),
        });
        // Confirmed 13 calendar months before AT (2026-08-05) ⇒ r7-c (>=12) and r7-f (>=6) both fire.
        await confirm(
          pariwarId,
          alertId,
          memberId,
          poolId,
          1,
          new Date('2025-07-05T00:00:00Z'),
        );

        const payload = await getValidityAt(deps, { pariwarId, memberId }, AT, internalCall());
        const r7Ids = payload.applicableNiyamavaliClauses
          .map((c) => String(c.clauseId))
          .filter((id) => id.startsWith('niy.contribution-discipline.'))
          .sort();
        expect(r7Ids).toEqual([
          'niy.contribution-discipline.r7-c',
          'niy.contribution-discipline.r7-f',
        ]);
        // The HELD clauses are absent because they were never given a descriptor (D4's omission
        // mechanism), not because they were evaluated and filtered.
        expect(r7Ids).not.toContain('niy.contribution-discipline.r7-a');
        expect(r7Ids).not.toContain('niy.contribution-discipline.r7-b');
        expect(r7Ids).not.toContain('niy.contribution-discipline.r7-g');
      });
    });

    // ── The Trustee-Lite candidate scan (AC5/AC7) ─────────────────────────────────────────────────
    it('the Pariwar scan surfaces the flagged member with facts + a holdingSince ≠ evaluatedAt', async () => {
      const pariwarId = ids.pariwarId(randomUUID());
      const flagged = ids.memberId(randomUUID());
      const clean = ids.memberId(randomUUID());
      await seedActivatedR7(pariwarId);
      await seedMember(pariwarId, flagged);
      await seedMember(pariwarId, clean);

      // `flagged`: assigned to a closed cycle with no confirmation ⇒ a skip ⇒ in lapse; and a
      // 13-month-old confirmation ⇒ r7-c + r7-f fire.
      const old = await seedCycleFixture(pariwarId, [flagged], {
        assignedAt: new Date('2025-06-01T00:00:00Z'),
        closedAt: new Date('2025-07-01T00:00:00Z'),
      });
      await confirm(pariwarId, old.alertId, flagged, old.poolId, 1, new Date('2025-07-05T00:00:00Z'));
      await seedCycleFixture(pariwarId, [flagged], {
        assignedAt: new Date('2026-03-01T00:00:00Z'),
        closedAt: new Date('2026-04-01T00:00:00Z'),
      });

      // `clean`: a recent confirmation on a closed cycle ⇒ nothing fires.
      const recent = await seedCycleFixture(pariwarId, [clean], {
        assignedAt: new Date('2026-07-01T00:00:00Z'),
        closedAt: new Date('2026-08-01T00:00:00Z'),
      });
      await confirm(
        pariwarId,
        recent.alertId,
        clean,
        recent.poolId,
        1,
        new Date('2026-07-10T00:00:00Z'),
      );

      const candidates = await scanR7ViolatorCandidates(db, pariwarId, AT);
      const byId = new Map(candidates.map((c) => [c.memberId, c]));

      const flaggedCandidate = byId.get(String(flagged));
      expect(flaggedCandidate).toBeDefined();
      expect(
        flaggedCandidate!.payload.applicableNiyamavaliClauses.map((c) => c.clauseId).sort(),
      ).toEqual(['niy.contribution-discipline.r7-c', 'niy.contribution-discipline.r7-f']);

      const summary = flaggedCandidate!.payload.contributionHistorySummary;
      expect(summary.status).toBe('ok');
      if (summary.status === 'ok') {
        expect(summary.facts['contribution.in_lapse']).toBe(true);
        // AC5: the onset is a DIFFERENT claim from the evaluation instant, and must not be it.
        expect(summary.lapseSince).not.toBeNull();
        expect(summary.lapseSince).not.toBe(flaggedCandidate!.payload.evaluatedAt);
        expect(summary.lapseSince).toBe(new Date('2026-04-01T00:00:00Z').toISOString());
      }

      // The clean member IS scanned (so `summarizeViolatorFlags` can distinguish "evaluated, no
      // flags" from "not evaluated"), but carries no applied clause.
      const cleanCandidate = byId.get(String(clean));
      expect(cleanCandidate).toBeDefined();
      expect(cleanCandidate!.payload.applicableNiyamavaliClauses).toEqual([]);
    });
  },
);
