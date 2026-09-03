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

import {
  contribution,
  createDb,
  ids,
  idempotency,
  niyamavali,
  schema,
  trusteeLite,
  type Db,
} from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  contributionFactsToBag,
  contributionFactsToSummary,
  deriveContributionFacts,
  getValidityAt,
  scanR7ViolatorCandidates,
  type ValidityServiceDeps,
} from '../../src/index.js';
import { R7A_PAYLOAD, R7_PAYLOADS } from '../fixtures/r7-clauses.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** The pinned evaluation instant for every case below (mid-2026, so the IST year is 2026). */
const AT = new Date('2026-08-05T00:00:00.000Z');

/** Story 10.25 — opportunity-sequence shorthand. `T` = TAKEN (live-confirmed at `at`), `M` = MISSED. */
const T = true;
const M = false;

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
        // Story 10.26 — R7(G) is ACTIVATED, so the seeder must provision it or the scan reports
        // fewer resolved clauses than `R7_ACTIVATED_CLAUSE_IDS` names.
        'niy.contribution-discipline.r7-g',
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

    /**
     * Seed R7(A) — Story 10.25, and for its DATA ALONE (`restoration.consecutive_required: 3`).
     *
     * ⚠ This does NOT activate R7(A) and cannot: `evaluateAppliedR7ClauseSlots` passes only
     * `R7_ACTIVATED_CLAUSE_IDS` to the ladder, so a seeded r7-a version is never evaluated, memoized,
     * audited, or admitted to `applicableNiyamavaliClauses[]`. The D2 behavioural tests below still
     * assert exactly which clauses reach the payload, and the totality test still asserts r7-a is
     * held. What this DOES do is make the restoration threshold resolvable — which is the state
     * production is already in (`niyamavali-v1-clauses.sql` seeds all seven).
     */
    async function seedR7ARestorationClause(pariwarId: ids.PariwarId): Promise<void> {
      await db.insert(schema.clauseVersions).values({
        clauseVersionId: ids.clauseVersionId(randomUUID()),
        clauseId: ids.clauseId('niy.contribution-discipline.r7-a'),
        pariwarId,
        version: 1,
        effectiveDate: new Date('2000-01-01T00:00:00Z'),
        payload: { ...R7A_PAYLOAD },
        benefitMechanism: 'pool',
      });
    }

    /**
     * Record the Pariwar's projection COVERAGE WATERMARK — i.e. "this tenant has been backfilled".
     *
     * Required by every test that expects facts to DERIVE at all. Since the round-2 review,
     * `deriveContributionFacts` returns the `producer_unavailable` sentinel for a Pariwar with no
     * coverage row (⚖ "Unknown projection state must never fabricate a clean member"), so a fixture
     * that seeds events but no coverage is asserting the un-derivable case whether it means to or not.
     * `covered_from` is set far in the past so no test instant falls before it.
     */
    async function seedCoverage(pariwarId: ids.PariwarId): Promise<void> {
      await db
        .insert(schema.contributionProjectionCoverage)
        .values({ pariwarId, coveredFrom: new Date('2000-01-01T00:00:00Z') })
        .onConflictDoNothing();
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

    /**
     * Append a `member.personal_event_asserted` on the MEMBER's own stream — Story 10.26.
     *
     * `eventVersion` starts at 5 because `seedMember` writes four lifecycle events. The event is a
     * NON-TRANSITION marker, so `members.state` is deliberately left untouched.
     */
    async function assertPersonalEvent(
      pariwarId: ids.PariwarId,
      memberId: ids.MemberId,
      occurredAt: Date,
      version = 5,
      kind = 'bereavement',
    ): Promise<void> {
      await db.insert(schema.eventsLog).values({
        streamId: memberId,
        eventType: 'member.personal_event_asserted',
        payload: {
          from_state: 'active',
          to_state: 'active',
          trigger: 'member.personal_event_asserted',
          actor: 'member',
          kind,
        },
        eventVersion: version,
        actorId: null,
        pariwarId,
        occurredAt,
      });
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
          // `public_token` (Story 11b.10) is NOT NULL with a GLOBAL unique index — derived from the
          // pool id HERE ONLY because this is a seed and needs to be collision-free across a suite.
          // ⛔ The production mint is RANDOM and is ⛔ never derived from pool identity (D2).
          `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier,
                              support_category, benefit_mechanism, fixed_amount, current_state, state_event_version,
                              public_token)
           VALUES ($1,$2,$3,$4,0,$5,'death_support','pool',500,'spawned',1,$6)`,
          [poolId, pariwarId, cycleId, claimCaseId, `P-${poolId.slice(0, 8)}`, `seed-${poolId}`],
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

      // ⚠ NAME CORRECTED (code review 2026-08-05, round 2). This was titled "assigned + a MISMATCH
      // (red, never confirmed) → IS a skip", which implied the derivation reads
      // `contribution.reconciliation-mismatch`. It does not — nothing in `facts.ts` references that
      // event type. Deleting the mismatch insert below left the test green, because the skip comes
      // entirely from "assigned + closed + no live confirmation". It was a duplicate of the
      // not-confirmed case wearing a name that advertised coverage of the red-verdict path.
      //
      // Kept (rather than deleted) because the assertion it ACTUALLY makes is worth having: a mismatch
      // event must not accidentally satisfy the confirmation predicate. The name now says that.
      it('a MISMATCH event does NOT count as a confirmation — assigned + closed + mismatch IS a skip', async () => {
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

      it('⚖ assigned + confirmed AFTER the cycle CLOSED but before `at` → NOT a skip', async () => {
        // ⚖ Ratified 2026-08-05 (round-2 code review): "Contribution discipline evaluates member
        // CONDUCT, not administrative processing latency. Late reconciliation should clear the skip
        // once it becomes part of the historical record being evaluated."
        //
        // The member paid in-window; the reconciliation tail (Story 8.9's whole purpose) confirmed it
        // AFTER the cycle closed. The confirmation predicate is therefore evaluated at `at`, NOT at the
        // close instant — matching D1's formula and the shipped SQL.
        //
        // ⚠ NEITHER direction of this case was covered before: the arms below pin confirm-BEFORE-close
        // and close-after-`at`, and the AC4 prose said "at close" while D1 and the code said "at `at`".
        // A change to either semantics was invisible. It is not any more.
        expect(
          await skipCountFor(async (pariwarId, memberId) => {
            const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
              assignedAt,
              closedAt, // 2026-03-01
            });
            // Confirmed a month AFTER the cycle closed, still well before the pinned AT.
            await confirm(pariwarId, alertId, memberId, poolId, 1, new Date('2026-04-05T00:00:00Z'));
          }),
        ).toBe(0);
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
    // ── Story 10.25 — R7(A) restoration accounting, END TO END (AC1, AC2, AC4, AC7; D1, D3) ───────
    //
    // The unit tests pin `consecutive-opportunity-restoration-v1` as a PURE function over a boolean
    // sequence. These pin the thing the unit tests structurally cannot: that the SQL gap-and-islands
    // spelling folded into `missedCycleAggregateSql` computes the SAME policy over real assignments,
    // real alert closures and real reversals — the [[project_epic6_drizzle_correlated_subquery_bug]]
    // drift class, which only a live DB can catch.
    describe('Story 10.25 — restoration accounting over the real opportunity sequence', () => {
      /**
       * Seed one member whose opportunity sequence is exactly `sequence` (`true` = TAKEN), one cycle
       * per element, in order, and return the derived fact inputs at `AT`.
       *
       * Each opportunity is its own cycle with a strictly increasing close instant, so the SQL's
       * `(closed_at, pool_id)` ordering is the array order — the fixture cannot accidentally pass by
       * agreeing with a scan order.
       */
      async function seedSequence(
        sequence: readonly boolean[],
        opts: { seedR7A?: boolean } = {},
      ): Promise<{
        inputs: Awaited<ReturnType<typeof contribution.readContributionFactInputs>>;
        pariwarId: ids.PariwarId;
        memberId: string;
      }> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCoverage(pariwarId);
        if (opts.seedR7A !== false) await seedR7ARestorationClause(pariwarId);

        for (const [index, taken] of sequence.entries()) {
          // One DAY apart, all inside IST-2026 January and all before `AT`. Days rather than months
          // so a long sequence cannot silently run past `AT` and drop its own tail — an as-of
          // truncation would make a fixture look like a producer bug.
          const assignedAt = new Date(Date.UTC(2026, 0, 1 + index));
          const closedAt = new Date(Date.UTC(2026, 0, 1 + index, 12));
          const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
            assignedAt,
            closedAt,
          });
          if (taken) {
            await confirm(
              pariwarId,
              alertId,
              memberId,
              poolId,
              100 + index,
              new Date(Date.UTC(2026, 0, 1 + index, 6)),
            );
          }
        }

        const inputs = await contribution.readContributionFactInputs(
          db,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        return { inputs, pariwarId, memberId };
      }

      /**
       * THE PIN (D3). Assert the SQL and the PURE reference agree on the SAME sequence, and that both
       * agree with the case's stated expectation. Three assertions rather than one, deliberately: two
       * implementations that are wrong in the same way would still pass a bare equality check.
       */
      async function expectRuns(
        sequence: readonly boolean[],
        expected: { completedEpisodes: number; currentOpenRun: number },
      ): Promise<void> {
        const { inputs } = await seedSequence(sequence);
        const pure = contribution.deriveRestorationRuns(sequence, 3);
        expect(pure, 'the PURE reference disagreed with the expectation').toEqual(expected);
        expect(
          {
            completedEpisodes: inputs.completedRestorationEpisodes,
            currentOpenRun: inputs.currentOpenTakenRun,
          },
          'the SQL gap-and-islands spelling disagreed with the PURE reference — a second definition has drifted in',
        ).toEqual(pure);
        // The threshold reached the SQL from the CLAUSE DATA, not from a constant.
        expect(inputs.r7aConsecutiveRequired).toBe(3);
      }

      it('AC1 — SIX consecutive taken after a miss is ONE restoration, not two', async () => {
        await expectRuns([M, T, T, T, T, T, T], { completedEpisodes: 1, currentOpenRun: 6 });
      });

      it('AC1 — a member who NEVER missed has completed ZERO restorations (the preceding-MISS gate)', async () => {
        // Without the gate this member reads as having burned restorations and is pushed toward
        // R7(B), the harsher clause — for the offence of taking every opportunity they were given.
        await expectRuns([T, T, T, T, T, T], { completedEpisodes: 0, currentOpenRun: 0 });
      });

      it('AC1 — a SHORT run then a LONG run counts only the run that completed', async () => {
        await expectRuns([M, T, T, M, T, T, T], { completedEpisodes: 1, currentOpenRun: 3 });
      });

      it('AC1 — an IN-PROGRESS package is not a consumed one', async () => {
        await expectRuns([M, T, T], { completedEpisodes: 0, currentOpenRun: 2 });
      });

      it('AC1 — a member with NO opportunities has no episodes and no open package', async () => {
        await expectRuns([], { completedEpisodes: 0, currentOpenRun: 0 });
      });

      it('AC2 — a REVERSAL turns a TAKEN opportunity into a MISS and breaks the run', async () => {
        // The live-only case: the same six confirmations, one of which is reversed BEFORE `AT`. A
        // ledger-row count would still see six contributions; the opportunity sequence sees the break.
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCoverage(pariwarId);
        await seedR7ARestorationClause(pariwarId);

        const confirmationIds: string[] = [];
        const alertIds: string[] = [];
        for (const index of [0, 1, 2, 3, 4, 5]) {
          const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
            assignedAt: new Date(Date.UTC(2026, index, 5)),
            closedAt: new Date(Date.UTC(2026, index, 20)),
          });
          alertIds.push(alertId);
          // Opportunity 0 is the opening MISS; 1..5 are taken.
          if (index === 0) continue;
          confirmationIds.push(
            await confirm(
              pariwarId,
              alertId,
              memberId,
              poolId,
              100 + index,
              new Date(Date.UTC(2026, index, 10)),
            ),
          );
        }

        const scope = { pariwarId, memberId: ids.memberId(memberId) };
        const before = await contribution.readContributionFactInputs(db, scope, AT);
        // MISS then five TAKEN → one completed episode, open run 5.
        expect(before.completedRestorationEpisodes).toBe(1);
        expect(before.currentOpenTakenRun).toBe(5);

        // Reverse the SECOND taken opportunity (sequence index 2), splitting 5 into 1 + 3.
        await reverse(pariwarId, alertIds[2]!, memberId, confirmationIds[1]!, 200, new Date(Date.UTC(2026, 6, 1)));

        const after = await contribution.readContributionFactInputs(db, scope, AT);
        expect({
          completedEpisodes: after.completedRestorationEpisodes,
          currentOpenRun: after.currentOpenTakenRun,
        }).toEqual(contribution.deriveRestorationRuns([M, T, M, T, T, T], 3));
        expect(after.completedRestorationEpisodes).toBe(1); // the trailing 3-run, not the broken 5
        expect(after.currentOpenTakenRun).toBe(3);
      });

      it('AC2 — an OPEN cycle and a NON-ASSIGNED cycle are not opportunities at all', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        const otherMemberId = randomUUID();
        await seedCoverage(pariwarId);
        await seedR7ARestorationClause(pariwarId);

        // The opening miss, then two taken — an in-progress package of 2.
        for (const index of [0, 1, 2]) {
          const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
            assignedAt: new Date(Date.UTC(2026, index, 5)),
            closedAt: new Date(Date.UTC(2026, index, 20)),
          });
          if (index > 0) {
            await confirm(pariwarId, alertId, memberId, poolId, 100 + index, new Date(Date.UTC(2026, index, 10)));
          }
        }
        // A cycle this member IS assigned to but which is still OPEN: mid-window, they have missed
        // nothing — it must not break the run and must not become a third taken opportunity.
        await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date(Date.UTC(2026, 3, 5)),
          closedAt: null,
        });
        // A CLOSED cycle this member was never assigned to: they had nothing to take, so it is not a
        // missed opportunity and must not break the run either.
        await seedCycleFixture(pariwarId, [otherMemberId], {
          assignedAt: new Date(Date.UTC(2026, 4, 5)),
          closedAt: new Date(Date.UTC(2026, 4, 20)),
        });

        const inputs = await contribution.readContributionFactInputs(
          db,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        expect({
          completedEpisodes: inputs.completedRestorationEpisodes,
          currentOpenRun: inputs.currentOpenTakenRun,
        }).toEqual(contribution.deriveRestorationRuns([M, T, T], 3));
      });

      it('AC1 — the fact reaches the engine bag UNCLAMPED, and the summary carries it', async () => {
        // Four completed episodes — twice R7(A)'s `lifetime_max: 2`. A producer that clamped would
        // make "used 2" and "used 7" indistinguishable and would put a governance threshold in code.
        const sequence = [M, T, T, T, M, T, T, T, M, T, T, T, M, T, T, T];
        const { inputs } = await seedSequence(sequence);
        const facts = deriveContributionFacts(inputs, AT)!;
        expect(facts.r7aRestorationsUsed).toBe(4);
        expect(contributionFactsToBag(facts)['contribution.r7a_restorations_used']).toBe(4);
        expect(contributionFactsToSummary(facts, null).facts['contribution.r7a_restorations_used']).toBe(4);
      });

      it('AC7 — an UNPROVISIONED R7(A) makes the count UNKNOWN, never a fabricated zero', async () => {
        // ⚠ The Pariwar is fully backfilled and the member's history is perfectly readable — what is
        // missing is the GOVERNANCE NUMBER: no R7(A) clause version resolves at `AT`, so "how long is
        // a restoration?" has no answer. Reporting `0` would be an affirmative claim about the member
        // on the clause that decides whether their restoration path still exists.
        const { inputs } = await seedSequence([M, T, T, T], { seedR7A: false });
        expect(inputs.r7aConsecutiveRequired).toBeNull();
        const facts = deriveContributionFacts(inputs, AT)!;
        expect(facts.r7aRestorationsUsed).toBeNull();
        expect(contributionFactsToBag(facts)).not.toHaveProperty('contribution.r7a_restorations_used');
      });

      it('AC1 — the R7(A) threshold read agrees with `niyamavali.resolveByClauseId` (the parity pin)', async () => {
        // `facts.ts` re-spells clause resolution as a scalar subquery to stay inside AC8's two-query
        // budget. That is a second EXECUTION STRATEGY, not a second definition — and this is what
        // keeps it so. A future change to clause resolution must update both and keep this green.
        const { pariwarId } = await seedSequence([M, T, T, T]);
        const row = await niyamavali.resolveByClauseId(
          db,
          pariwarId,
          ids.clauseId('niy.contribution-discipline.r7-a'),
          AT,
        );
        const viaAccessor = (row?.payload as { restoration?: { consecutive_required?: number } })
          ?.restoration?.consecutive_required;
        const viaSql = (
          await contribution.readContributionProjectionContext(db, pariwarId, AT)
        ).r7aConsecutiveRequired;
        expect(viaSql).toBe(viaAccessor);
        expect(viaSql).toBe(3);
      });

      it('AC1 — the count is AS-OF correct: an episode completed after `at` is not counted at `at`', async () => {
        // Replayability is not decoration here: `assignable-roster.ts` calls `getValidityAt(...,
        // committedAt)`, and an R7(A) finding that only answers "now" would be irreproducible on the
        // surface that feeds a suspension decision.
        const { pariwarId, memberId } = await seedSequence([M, T, T, T]);
        const scope = { pariwarId, memberId: ids.memberId(memberId) };
        // Opportunities close on Jan 1/2/3/4 at 12:00. Evaluated at Jan 4 00:00 only the first three
        // have closed, so the package is still open with two taken.
        const midPackage = new Date(Date.UTC(2026, 0, 4));
        const early = await contribution.readContributionFactInputs(db, scope, midPackage);
        expect(early.completedRestorationEpisodes).toBe(0);
        expect(early.currentOpenTakenRun).toBe(2);

        const now = await contribution.readContributionFactInputs(db, scope, AT);
        expect(now.completedRestorationEpisodes).toBe(1);
      });

      /**
       * Seed a member with a real lifecycle + the activated R7 clauses + R7(A)'s data, walk them
       * through `sequence`, and return their full validity payload at `AT`.
       */
      async function payloadForSequence(
        sequence: readonly boolean[],
      ): Promise<Awaited<ReturnType<typeof getValidityAt>>> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, ids.memberId(memberId));
        await seedActivatedR7(pariwarId);
        await seedR7ARestorationClause(pariwarId);
        for (const [index, taken] of sequence.entries()) {
          const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
            assignedAt: new Date(Date.UTC(2026, 0, 1 + index)),
            closedAt: new Date(Date.UTC(2026, 0, 1 + index, 12)),
          });
          if (taken) {
            await confirm(pariwarId, alertId, memberId, poolId, 100 + index, new Date(Date.UTC(2026, 0, 1 + index, 6)));
          }
        }
        return getValidityAt(deps, { pariwarId, memberId: ids.memberId(memberId) }, AT, {
          internal: true,
        });
      }

      it('AC4 — the payload carries { remaining, required } from the APPLIED clause DATA', async () => {
        // One contribution, then twelve missed opportunities ⇒ `months_since_last` reaches 12 and
        // R7(C) applies (precedence 70, so it is also the ladder's PICK over R7(F)). R7(C) prescribes
        // FIVE consecutive contributions — and FIVE is what the disclosure must say, not R7(A)'s
        // three. That is the whole point of reading `required` from the APPLIED clause.
        const payload = await payloadForSequence([T, ...Array<boolean>(12).fill(M)]);

        expect(payload.applicableNiyamavaliClauses.map((c) => String(c.clauseId))).toContain(
          'niy.contribution-discipline.r7-c',
        );
        expect(payload.contributionHistorySummary.status).toBe('ok');
        if (payload.contributionHistorySummary.status === 'ok') {
          expect(payload.contributionHistorySummary.restorationPackage).toEqual({
            status: 'ok',
            remaining: 5,
            required: 5,
          });
          // The sixth fact rides the same summary, from the same read.
          expect(
            payload.contributionHistorySummary.facts['contribution.r7a_restorations_used'],
          ).toBe(0);
        }
      });

      // ⚠ RECORDED FINDING (Story 10.25, surfaced by the test above rather than asserted from the
      // story text). Today `remaining` is NECESSARILY EQUAL to `required` on every reachable `ok`
      // arm, and it is worth stating rather than leaving for a reader to rediscover:
      //
      //   · R7(C) is the ONLY activated clause carrying `restoration.consecutive_required`, and its
      //     own precondition is `months_since_last >= 12` — a gap counted in MISSED opportunities
      //     SINCE THE LAST LIVE CONFIRMATION.
      //   · So the moment the member takes one contribution, that gap resets to 0, R7(C) stops
      //     applying, and the `ok` arm stops being reached at all.
      //   · Therefore any member for whom the `ok` arm renders has a trailing run of 0.
      //
      // The PARTIAL-progress case (`{ remaining: 3, required: 5 }`) is real arithmetic and is pinned
      // DB-free in `contribution-facts.test.ts`; it becomes reachable on a live payload only when a
      // clause whose precondition survives a contribution activates — i.e. R7(A)/(B), which need
      // Story 10.23's fact AND the Trustee Panel's published Part 11 amendment (Decision
      // 2026-08-06-077). This is NOT a defect in the accounting and must not be "fixed" by measuring
      // the run differently; it is a property of which clauses are activated today.
      it('AC4/D4 — a member whose applied clause has NO consecutive package is told exactly that', async () => {
        // Ten contributions then a single missed cycle ⇒ R7(D) (`total_count >= 10 && skips == 1`),
        // which prescribes `lock_in_months` + `catch_up_required` and NO `consecutive_required`.
        // Leaving this member on `package_unavailable` after 10.25 shipped would name a story that
        // has already shipped and did not close their case — the 10.24-AC9 lie-by-staleness failure.
        const payload = await payloadForSequence([...Array<boolean>(10).fill(T), M]);

        expect(payload.applicableNiyamavaliClauses.map((c) => String(c.clauseId))).toEqual([
          'niy.contribution-discipline.r7-d',
        ]);
        expect(payload.contributionHistorySummary.status).toBe('ok');
        if (payload.contributionHistorySummary.status === 'ok') {
          expect(payload.contributionHistorySummary.restorationPackage).toEqual({
            status: 'no_consecutive_requirement',
            clauseId: 'niy.contribution-discipline.r7-d',
          });
        }
      });

      it('AC4 — a member in NO restoration path gets the null-clause arm, not a sentinel', async () => {
        // Every opportunity taken: no R7 clause applies at all. There is no package to count, which
        // is a different claim from "we cannot tell you".
        const payload = await payloadForSequence([T, T, T]);
        expect(payload.applicableNiyamavaliClauses.map((c) => String(c.clauseId))).toEqual([]);
        expect(payload.contributionHistorySummary.status).toBe('ok');
        if (payload.contributionHistorySummary.status === 'ok') {
          expect(payload.contributionHistorySummary.restorationPackage).toEqual({
            status: 'no_consecutive_requirement',
            clauseId: null,
          });
          // The preceding-MISS gate, end to end: a member who never missed has burned nothing.
          expect(
            payload.contributionHistorySummary.facts['contribution.r7a_restorations_used'],
          ).toBe(0);
        }
      });
    });

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

      /**
       * Story 10.25 (AC8) — the same count, for a member with `episodes` COMPLETED restoration
       * episodes. The run computation folded into `missedCycleAggregateSql` must cost nothing extra,
       * and it must not start costing per-episode as the sequence grows.
       */
      async function queriesForEpisodes(episodes: number): Promise<number> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = randomUUID();
        await seedCoverage(pariwarId);
        await seedR7ARestorationClause(pariwarId);
        let index = 0;
        for (let e = 0; e < episodes; e += 1) {
          for (const taken of [M, T, T, T]) {
            const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
              assignedAt: new Date(Date.UTC(2026, 0, 1 + index)),
              closedAt: new Date(Date.UTC(2026, 0, 1 + index, 12)),
            });
            if (taken) {
              await confirm(pariwarId, alertId, memberId, poolId, 100 + index, new Date(Date.UTC(2026, 0, 1 + index, 6)));
            }
            index += 1;
          }
        }
        const counting = countingDb();
        const inputs = await contribution.readContributionFactInputs(
          counting.handle,
          { pariwarId, memberId: ids.memberId(memberId) },
          AT,
        );
        // The fixture must genuinely produce the episodes it claims, or the count below is vacuous.
        expect(inputs.completedRestorationEpisodes).toBe(episodes);
        return counting.count();
      }

      /**
       * Story 10.26 (AC9) — the same count, for a member with `count` ASSERTIONS on their own stream.
       *
       * The assertion existential is an `EXISTS`, so 0, 1 and several assertions must all cost exactly
       * one query. A future rewrite that fetched the assertion ROWS (to count them, or to read their
       * `kind`) would break this — and would also be wrong, because the fact is a lifetime boolean.
       */
      async function queriesForAssertions(count: number): Promise<number> {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = ids.memberId(randomUUID());
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, memberId);
        for (let i = 0; i < count; i += 1) {
          await assertPersonalEvent(
            pariwarId,
            memberId,
            new Date(Date.UTC(2026, 0, 10 + i)),
            5 + i,
          );
        }
        const counting = countingDb();
        const inputs = await contribution.readContributionFactInputs(
          counting.handle,
          { pariwarId, memberId },
          AT,
        );
        // The fixture must genuinely produce the assertion state it claims, or the count is vacuous.
        expect(inputs.personalEventAsserted).toBe(count > 0);
        return counting.count();
      }

      const one = await queriesFor(1);
      const many = await queriesFor(25);
      // An N-INDEPENDENT read is the definition of "no N+1". Asserting equality (rather than a
      // threshold) is what makes a future per-row read fail here instead of merely looking slower.
      expect(many).toBe(one);
      // ⚖ Story 10.26 (AC9/D7) — the budget moved 2 → 3, DELIBERATELY and not by folding. One ledger
      // aggregate + one missed-cycle aggregate + one assertion EXISTS. The third is separate because
      // the assertion lives on the member's own `events_log` stream while `missedCycleAggregateSql`
      // scans the pool/assignment axis: joining across axes would make the riskiest SQL in the
      // subsystem riskier and buy nothing, since all three are already history-size-independent.
      expect(one).toBe(3);

      // ⚖ Story 10.25 / D3 — the restoration accounting itself still costs NOTHING extra. The run
      // computation rides the existing scan as window functions and R7(A)'s threshold rides the
      // existing ledger statement as a scalar subquery, so 0, 1 and several episodes all cost the same.
      const zeroEpisodes = await queriesForEpisodes(0);
      const oneEpisode = await queriesForEpisodes(1);
      const severalEpisodes = await queriesForEpisodes(4);
      expect([zeroEpisodes, oneEpisode, severalEpisodes]).toEqual([3, 3, 3]);

      // ⚖ Story 10.26 (AC9) — 0, 1 and SEVERAL assertions all cost exactly three: the existential is
      // an EXISTS, never a row fetch, and the fact is a lifetime boolean rather than a count.
      const zeroAsserts = await queriesForAssertions(0);
      const oneAssert = await queriesForAssertions(1);
      const severalAsserts = await queriesForAssertions(4);
      expect([zeroAsserts, oneAssert, severalAsserts]).toEqual([3, 3, 3]);
    });

    // ── D3: the ACCEPTANCE-level equivalence (a diff here is a P0 finding) ────────────────────────
    it('D3 — facts over the INCREMENTAL tables === facts over FRESHLY-BACKFILLED tables', async () => {
      const pariwarId = ids.pariwarId(randomUUID());
      const memberId = randomUUID();
      const scope = { pariwarId, memberId: ids.memberId(memberId) };
      await seedCoverage(pariwarId);

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
        await seedCoverage(pariwarId);
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
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, memberId);
        const { poolId, alertId } = await seedCycleFixture(pariwarId, [memberId], {
          assignedAt: new Date('2025-06-01T00:00:00Z'),
          closedAt: new Date('2025-07-01T00:00:00Z'),
        });
        await confirm(
          pariwarId,
          alertId,
          memberId,
          poolId,
          1,
          new Date('2025-07-05T00:00:00Z'),
        );

        // ⚖ 13 ELAPSED OPPORTUNITIES, not 13 elapsed months. `months_since_last` counts assigned cycles
        // that CLOSED without a live confirmation since the member's last one — so the gap only exists
        // if the Pariwar actually gave them 13 chances to pay and they took none.
        //
        // This fixture previously seeded ONLY the 13-month-old confirmation and relied on wall-clock
        // arithmetic, which is precisely the derivation ratified away on 2026-08-05: it flagged a
        // member the Pariwar had never asked for anything. Seeding the missed cycles explicitly is what
        // makes the R7(C)/(F) assertion below mean "this member ignored 13 requests" rather than
        // "13 months passed".
        //
        // 2025-07 → 2026-07, one per month, each assigned + closed + unconfirmed, every close landing
        // BEFORE the pinned AT (2026-08-05) so all 13 count. r7-d/r7-e stay dark for the reason they
        // always did — both require `total_count >= 10` and this member has exactly 1 — not because of
        // the year window, so the assertion still isolates the gap clauses.
        for (let i = 0; i < 13; i++) {
          await seedCycleFixture(pariwarId, [memberId], {
            assignedAt: new Date(Date.UTC(2025, 6 + i, 1)),
            closedAt: new Date(Date.UTC(2025, 6 + i, 20)),
          });
        }

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

      // ── 2026-08-06 finding: the individual-member path gave a false all-clear when the Pariwar's
      // R7 registry was unprovisioned — the exact failure `scanR7ViolatorCandidates` already guards
      // against (`resolvedClauses.length === 0` → `{status:'unavailable'}`), but `getValidityAt` had
      // no equivalent check: zero clauses resolving looked IDENTICAL to zero clauses applying, so a
      // member with derivable contribution facts in an R7-unprovisioned Pariwar read as `status: 'ok'`
      // with zero R7 entries — byte-identical to a genuinely clean, compliant member.
      it('R7 registry unprovisioned for the Pariwar → contributionHistorySummary reports the registry gap, never a fabricated clean record', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const memberId = ids.memberId(randomUUID());
        // Deliberately NOT seedActivatedR7(pariwarId) — this Pariwar has no R7(C)-(F) clause versions.
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, memberId);
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
        expect(r7).toEqual([]);
        // THE assertion: NOT `status: 'ok'` (that would be indistinguishable from a clean member).
        expect(payload.contributionHistorySummary).toEqual({
          status: 'producer_unavailable',
          producer: 'niyamavali-registry',
        });
      });
    });

    // ── The Trustee-Lite candidate scan (AC5/AC7) ─────────────────────────────────────────────────
    it('the Pariwar scan surfaces the flagged member with facts + a holdingSince ≠ evaluatedAt', async () => {
      const pariwarId = ids.pariwarId(randomUUID());
      const flagged = ids.memberId(randomUUID());
      const clean = ids.memberId(randomUUID());
      await seedActivatedR7(pariwarId);
      await seedCoverage(pariwarId);
      await seedMember(pariwarId, flagged);
      await seedMember(pariwarId, clean);

      // `flagged`: a confirmation, then a run of assigned-and-closed cycles they ignored. The gap fact
      // counts those OPPORTUNITIES (⚖ 2026-08-05), so the run is what makes r7-c (>=12) and r7-f (>=6)
      // fire — not the calendar distance from the last confirmation.
      const old = await seedCycleFixture(pariwarId, [flagged], {
        assignedAt: new Date('2023-12-01T00:00:00Z'),
        closedAt: new Date('2024-01-01T00:00:00Z'),
      });
      await confirm(pariwarId, old.alertId, flagged, old.poolId, 1, new Date('2024-01-05T00:00:00Z'));
      // 12 missed opportunities, ALL closing before 2026 so they do not disturb the current-year
      // window below. Together with the 2026 miss that follows, the gap reaches 13.
      for (let i = 0; i < 12; i++) {
        await seedCycleFixture(pariwarId, [flagged], {
          assignedAt: new Date(Date.UTC(2024, 1 + i, 1)),
          closedAt: new Date(Date.UTC(2024, 1 + i, 20)),
        });
      }
      // Exactly ONE missed cycle in the CURRENT IST year, so `in_lapse` is true and `lapseSince` is
      // unambiguously this cycle's close — which is what the holdingSince assertion below reads.
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

      const scan = await scanR7ViolatorCandidates(db, pariwarId, AT);
      // The scan reports its own discriminant: a Pariwar whose registry HAS R7 clauses in effect (this
      // fixture seeds them) is `available`. The `unavailable` arm is asserted separately below.
      expect(scan.status).toBe('available');
      if (scan.status !== 'available') throw new Error('unreachable — asserted above');
      const byId = new Map(scan.candidates.map((c) => [c.memberId, c]));

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

    /**
     * Story 10.26 (AC9) — the BULK scan's query budget, counted rather than commented.
     *
     * ⚠ This assertion did not exist before. AC9 asked for the Pariwar-scan budget to be "re-stated
     * rather than smuggled", and re-stating a comment is exactly what let the previous number rot:
     * `r7-candidate-scan.ts`'s header claimed SEVEN while the code had issued EIGHT since Story 10.25
     * added `readContributionProjectionContext` (only `facts.ts`'s own comment was updated then). A
     * counted assertion survives a refactor that a comment does not — the same argument the
     * single-member counted test above already makes.
     *
     * TEN: 1 membership + 4 fact reads (ledger GROUP BY, missed-cycle aggregate, projection context,
     * assertion existential) + 5 hoisted `resolveByClauseId` (R7(C)–(G), member-INDEPENDENT).
     */
    it('AC9 — the Pariwar scan costs the SAME bounded query count for 1 vs N members (no N+1)', async () => {
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

      async function queriesForMembers(memberCount: number, assertingCount: number): Promise<number> {
        const pariwarId = ids.pariwarId(randomUUID());
        await seedActivatedR7(pariwarId);
        await seedCoverage(pariwarId);
        const members: ids.MemberId[] = [];
        for (let i = 0; i < memberCount; i += 1) {
          const memberId = ids.memberId(randomUUID());
          await seedMember(pariwarId, memberId);
          members.push(memberId);
        }
        for (let i = 0; i < assertingCount; i += 1) {
          await assertPersonalEvent(pariwarId, members[i]!, new Date(Date.UTC(2026, 0, 10)));
        }
        const counting = countingDb();
        const scan = await scanR7ViolatorCandidates(counting.handle, pariwarId, AT);
        // The scan must genuinely have evaluated every member, or the count below is vacuous.
        expect(scan.status).toBe('available');
        if (scan.status === 'available') expect(scan.candidates.length).toBe(memberCount);
        return counting.count();
      }

      const oneMember = await queriesForMembers(1, 0);
      const manyMembers = await queriesForMembers(12, 5);
      // MEMBER-INDEPENDENT is the definition of "no N+1" for this path — and asserting equality is
      // what makes a future per-member read fail here rather than merely look slower.
      expect(manyMembers).toBe(oneMember);
      expect(oneMember).toBe(10);
    });

    // ── ⭐ Story 10.26 AC5/D4 — THE HARM GATE, on the live scan path ──────────────────────────────
    //
    // ⚖ "A clause may influence trustee UNDERSTANDING without influencing trustee SUSPICION."
    //
    // R7(G) applies exactly when a member told the truth about their own life. `deriveViolatorFlags`
    // maps EVERY R7 clause id in `applicableNiyamavaliClauses[]` into a violator flag with no applied
    // check and no outcome check, on the surface that feeds SUSPENSION decisions — so without the
    // upstream `imposesRestorationObligation` filter, disclosing a bereavement makes a member a
    // suspension candidate. The ratified Niyamavali §3.1 says the assertion "carries no consequence
    // of its own", so that is not merely a bad UX: it contradicts the constitution.
    //
    // ── Revert-sanity probe, RUN AND RECORDED (Story 10.26, AC5) ─────────────────────────────────
    // Recorded in the Dev Agent Record with verbatim counts. Removing
    // `.filter((entry) => contributesViolatorFlag(entry.clauseId, payloadsByClauseId))` from
    // `r7-candidate-scan.ts` makes BOTH tests below go RED, each naming
    // `niy.contribution-discipline.r7-g` in its diff.
    describe('AC5/D4 — an asserted personal event NEVER becomes a violator flag', () => {
      it('⭐ a member whose ONLY applied clause is R7(G) carries ZERO flags — they do not appear at all', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const bereaved = ids.memberId(randomUUID());
        await seedActivatedR7(pariwarId);
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, bereaved);
        // A recent confirmation ⇒ no gap, no skips: NO imposing clause fires. The ONLY thing true of
        // this member is that they disclosed a bereavement.
        const recent = await seedCycleFixture(pariwarId, [bereaved], {
          assignedAt: new Date('2026-07-01T00:00:00Z'),
          closedAt: new Date('2026-08-01T00:00:00Z'),
        });
        await confirm(
          pariwarId,
          recent.alertId,
          bereaved,
          recent.poolId,
          1,
          new Date('2026-07-10T00:00:00Z'),
        );
        await assertPersonalEvent(pariwarId, bereaved, new Date('2026-07-15T00:00:00Z'));

        const scan = await scanR7ViolatorCandidates(db, pariwarId, AT);
        expect(scan.status).toBe('available');
        if (scan.status !== 'available') throw new Error('unreachable — asserted above');
        const candidate = scan.candidates.find((c) => c.memberId === String(bereaved));
        expect(candidate).toBeDefined();

        // R7(G) genuinely APPLIED — the fact is true and the clause fired. It is excluded from the
        // ACCUSATION channel, not from evaluation.
        expect(candidate!.payload.applicableNiyamavaliClauses.map((c) => c.clauseId)).toEqual([]);

        // ...and therefore the member is absent from the violator section entirely.
        const section = trusteeLite.summarizeViolatorFlags({ status: 'available', candidates: scan.candidates });
        expect(section.status).toBe('ok');
        if (section.status !== 'ok') throw new Error('unreachable — asserted above');
        expect(section.members.map((m) => m.memberId)).not.toContain(String(bereaved));
      });

      it('⭐ an assertion NEVER changes the flag count of a member flagged for an IMPOSING clause', async () => {
        const pariwarId = ids.pariwarId(randomUUID());
        const silent = ids.memberId(randomUUID());
        const disclosed = ids.memberId(randomUUID());
        await seedActivatedR7(pariwarId);
        await seedCoverage(pariwarId);
        await seedMember(pariwarId, silent);
        await seedMember(pariwarId, disclosed);

        // Two members with IDENTICAL contribution histories. The only difference between them is that
        // one of them disclosed a bereavement — which is the whole experiment.
        for (const memberId of [silent, disclosed]) {
          const old = await seedCycleFixture(pariwarId, [memberId], {
            assignedAt: new Date('2023-12-01T00:00:00Z'),
            closedAt: new Date('2024-01-01T00:00:00Z'),
          });
          await confirm(pariwarId, old.alertId, memberId, old.poolId, 1, new Date('2024-01-05T00:00:00Z'));
          for (let i = 0; i < 12; i++) {
            await seedCycleFixture(pariwarId, [memberId], {
              assignedAt: new Date(Date.UTC(2024, 1 + i, 1)),
              closedAt: new Date(Date.UTC(2024, 1 + i, 20)),
            });
          }
        }
        await assertPersonalEvent(pariwarId, disclosed, new Date('2026-01-15T00:00:00Z'));

        const scan = await scanR7ViolatorCandidates(db, pariwarId, AT);
        expect(scan.status).toBe('available');
        if (scan.status !== 'available') throw new Error('unreachable — asserted above');
        const byId = new Map(scan.candidates.map((c) => [c.memberId, c]));

        const silentClauses = byId.get(String(silent))!.payload.applicableNiyamavaliClauses
          .map((c) => c.clauseId)
          .sort();
        const disclosedClauses = byId.get(String(disclosed))!.payload.applicableNiyamavaliClauses
          .map((c) => c.clauseId)
          .sort();

        // The imposing clauses fired for BOTH, identically — asserting neither adds nor removes one.
        expect(silentClauses).toEqual(['niy.contribution-discipline.r7-c', 'niy.contribution-discipline.r7-f']);
        expect(disclosedClauses).toEqual(silentClauses);
        expect(disclosedClauses).not.toContain('niy.contribution-discipline.r7-g');

        const section = trusteeLite.summarizeViolatorFlags({ status: 'available', candidates: scan.candidates });
        if (section.status !== 'ok') throw new Error('unreachable');
        const flagsOf = (m: ids.MemberId): number =>
          section.members.find((x) => x.memberId === String(m))?.flags.length ?? 0;
        // THE assertion this AC exists for: the flag count is UNCHANGED from what it would have been
        // had they never asserted.
        expect(flagsOf(disclosed)).toBe(flagsOf(silent));
        expect(flagsOf(disclosed)).toBe(2);

        // ── And the DELIBERATE OTHER HALF: the assertion stays VISIBLE to the trustee as a FACT ────
        // `deriveViolatorFlags` builds `factsEstablishing[]` from every `contribution.*` key on the
        // payload, so the assertion rides into the fact list of a member flagged for some OTHER
        // clause and can inform a trustee's discretion there. Asserting can only ever HELP or do
        // NOTHING; it can never HURT. Both halves are the design — pin both.
        const disclosedFlags = section.members.find((x) => x.memberId === String(disclosed))!.flags;
        const factKeys = disclosedFlags[0]!.factsEstablishing.map((f) => f.key);
        expect(factKeys).toContain('contribution.personal_event_excuse_claimed');
        expect(
          disclosedFlags[0]!.factsEstablishing.find(
            (f) => f.key === 'contribution.personal_event_excuse_claimed',
          )!.value,
        ).toBe(true);
        // ...and the SILENT member's identical flag carries the same key as `false`.
        const silentFlags = section.members.find((x) => x.memberId === String(silent))!.flags;
        expect(
          silentFlags[0]!.factsEstablishing.find(
            (f) => f.key === 'contribution.personal_event_excuse_claimed',
          )!.value,
        ).toBe(false);
      });
    });
  },
);
