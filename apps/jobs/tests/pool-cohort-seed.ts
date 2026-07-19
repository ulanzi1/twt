// Pool-cohort seeder — Story 7.9 (Task 2; AC1). NOT a `*.test.ts`, so vitest does not collect it.
//
// Seeds the synthetic dataset the pre-launch capacity gate drives the REAL Pool-Spawn saga against:
//   · M synthetic members that are ACTIVE-AND-VALID at the cycle-freeze `committed_at` — seeded through
//     the real event-log path (the `member.signup_initiated → kyc_completed → vyawastha_shulk_paid →
//     lock_in_expired` active chain that replays to `is_valid = true`) PLUS a `members` projection row
//     (the `listMemberIdsForPariwar` enumeration the AI-7-2 roster resolver keys off). Assignability is
//     `getValidityAt(...).is_valid` ONLY ([[project_assignability_predicate_is_isvalid_only]]) — we seed
//     the active lifecycle, never lock-in / grace / suspension subfields the spawn path must not inspect.
//   · A backdated per-Pariwar `pool_fixed_amount_schedule` head (effective BEFORE `committed_at`) so
//     `planCycleSpawn`'s `getEffectiveFixedAmount(committed_at)` resolves — seeded directly (NOT via
//     `seedGenesisFixedAmount`, whose `effective_from = now()` would post-date a past `committed_at`).
//   · `cycleCount` distinct `cycle_freeze_commits` rows, each with N approved-claim ids, so every measured
//     iteration drives a FRESH cycle (distinct `cycle_id` → distinct deterministic pool_ids → no
//     cross-iteration spawn-idempotency collision).
//
// Inserts are CHUNKED + own-committing (the `seedValidityMembers` discipline) so a 4L (400k) `beforeAll`
// does not open one multi-hundred-thousand-row transaction. The caller tracks its seeded `pariwar_id` and
// deletes by it in `afterAll` — assert membership, not global counts ([[project_live_db_test_gotchas]]).
// NEVER regenerate an applied migration; NEVER `DROP SCHEMA` reset.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

/** Members per chunked INSERT — mirrors the framework seeder's `SEED_CHUNK_SIZE`. Bounds statement size
 *  (4 event rows × 7 cols per member) well under Postgres' 65535-parameter ceiling at 500 members. */
export const SEED_CHUNK_SIZE = 500;

/** The seeded per-pool contribution (whole INR) — arbitrary; the capacity gate does not exercise the
 *  amount, only that a schedule row RESOLVES so `planCycleSpawn` completes. */
const SEED_FIXED_AMOUNT_INR = 500;

/** The freeze instant validity is evaluated at. Fixed + well AFTER the seeded join instant so every member
 *  replays to `active` (is_valid) at this point — mirrors `assignable-roster-live.test.ts`'s proven pair. */
export const SEED_COMMITTED_AT = new Date('2026-05-01T00:00:00.000Z');
/** The seeded member join instant (before the freeze). */
const SEED_JOINED_AT = new Date('2025-01-01T00:00:00.000Z');
/** The fixed-amount schedule head's `effective_from` — before `committed_at` so it is in force at freeze. */
const SEED_SCHEDULE_EFFECTIVE_FROM = new Date('2024-01-01T00:00:00.000Z');

/** One seeded cycle: the freeze-commit id + its N approved-claim ids (index i → pool_index i). */
export interface SeededCycle {
  readonly cycleId: string;
  readonly frozenClaims: { readonly claimCaseId: string }[];
}

export interface SeedPoolCohortInput {
  /** M — the number of synthetic active-and-valid members to seed into the Pariwar. */
  readonly scale: number;
  /** N — approved claims per cycle (⇒ N child pools spawned per cycle). */
  readonly n: number;
  /** How many distinct cycles to pre-create (≥ warmup + iterations for the measured run). */
  readonly cycleCount: number;
  /** The non-production Pariwar id the cohort is seeded under. */
  readonly pariwarId: string;
}

export interface SeededPoolCohort {
  readonly pariwarId: string;
  readonly committedAt: Date;
  readonly memberIds: string[];
  readonly cycles: SeededCycle[];
}

/** One `events_log` VALUES tuple per row: `($a,$b,$c::jsonb,$d,NULL,$e,$f)` — `actor_id` is the NULL
 *  literal; `payload` is cast to jsonb. 6 bound params per row. */
function eventValuesList(rowCount: number): string {
  const rows: string[] = [];
  let p = 1;
  for (let r = 0; r < rowCount; r++) {
    rows.push(`($${p++},$${p++},$${p++}::jsonb,$${p++},NULL,$${p++},$${p++})`);
  }
  return rows.join(',');
}

/** One `members` VALUES tuple per row: `($a,$b,'active',4,now(),now())` — 2 bound params per row. */
function memberValuesList(rowCount: number): string {
  const rows: string[] = [];
  let p = 1;
  for (let r = 0; r < rowCount; r++) {
    rows.push(`($${p++},$${p++},'active',4,now(),now())`);
  }
  return rows.join(',');
}

/**
 * Seed the cohort. Own-committing raw inserts on `pool` (the test connection runs as a role that bypasses
 * RLS for these seed writes, exactly as `seedValidityMembers` / `assignable-roster-live.test.ts` do). The
 * `members` INSERT is unguarded (the state-writer trigger guards UPDATE only), so a direct active-state row
 * is legitimate here.
 */
export async function seedPoolCohort(pool: pg.Pool, input: SeedPoolCohortInput): Promise<SeededPoolCohort> {
  const { scale, n, cycleCount, pariwarId } = input;
  if (!Number.isInteger(scale) || scale < 1) throw new Error(`[seedPoolCohort] scale must be ≥ 1, got ${scale}`);
  if (!Number.isInteger(n) || n < 1) throw new Error(`[seedPoolCohort] n must be ≥ 1, got ${n}`);
  if (!Number.isInteger(cycleCount) || cycleCount < 1) {
    throw new Error(`[seedPoolCohort] cycleCount must be ≥ 1, got ${cycleCount}`);
  }

  // (1) The fixed-amount schedule head, backdated so it is effective at `committed_at`.
  await pool.query(
    `INSERT INTO pool_fixed_amount_schedule
       (pariwar_id, version, fixed_amount, effective_from, effective_until, change_type, created_by_actor)
     VALUES ($1, 1, $2, $3, NULL, 'standard', 'system:seed-7-9')`,
    [pariwarId, SEED_FIXED_AMOUNT_INR, SEED_SCHEDULE_EFFECTIVE_FROM.toISOString()],
  );

  // (2) M members — the active event chain (4 events/member) + the projection row, chunked.
  const memberIds: string[] = [];
  const at = (offsetSeconds: number): string =>
    new Date(SEED_JOINED_AT.getTime() + offsetSeconds * 1000).toISOString();
  const joinedIso = SEED_JOINED_AT.toISOString();

  for (let chunkStart = 0; chunkStart < scale; chunkStart += SEED_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + SEED_CHUNK_SIZE, scale);
    const eventParams: unknown[] = [];
    const memberParams: unknown[] = [];
    for (let i = chunkStart; i < chunkEnd; i++) {
      const memberId = randomUUID();
      memberIds.push(memberId);
      // The active chain: signup(v1) → kyc(v2) → fee(v3) → lock_in_expired(v4). Replays to is_valid.
      eventParams.push(memberId, 'member.signup_initiated', JSON.stringify({}), 1, pariwarId, joinedIso);
      eventParams.push(memberId, 'member.kyc_completed', JSON.stringify({}), 2, pariwarId, at(2));
      eventParams.push(memberId, 'member.vyawastha_shulk_paid', JSON.stringify({}), 3, pariwarId, at(3));
      eventParams.push(memberId, 'member.lock_in_expired', JSON.stringify({ kyc_verified: true }), 4, pariwarId, at(4));
      memberParams.push(memberId, pariwarId);
    }
    const eventRowCount = (chunkEnd - chunkStart) * 4;
    await pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id, occurred_at)
       VALUES ${eventValuesList(eventRowCount)}`,
      eventParams,
    );
    await pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
       VALUES ${memberValuesList(chunkEnd - chunkStart)}`,
      memberParams,
    );
  }

  // (3) `cycleCount` distinct freeze-commit rows, each with N approved-claim ids.
  const cycles: SeededCycle[] = [];
  for (let c = 0; c < cycleCount; c++) {
    const cycleId = randomUUID();
    const frozenClaims = Array.from({ length: n }, () => ({ claimCaseId: randomUUID() }));
    await pool.query(
      `INSERT INTO cycle_freeze_commits
         (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at, created_at)
       VALUES ($1, $2, 'system:seed-7-9', 'System (7.9 harness)', $3::uuid[], $4, now())`,
      [cycleId, pariwarId, frozenClaims.map((f) => f.claimCaseId), SEED_COMMITTED_AT.toISOString()],
    );
    cycles.push({ cycleId, frozenClaims });
  }

  return { pariwarId, committedAt: SEED_COMMITTED_AT, memberIds, cycles };
}

/**
 * Delete everything this cohort seeded, by `pariwar_id` (membership, not global counts). Ordered:
 * pool snapshots + pool rows first, then the event streams (member/pool/cycle) with the projector
 * triggers bypassed (`session_replication_role = replica`, the assignable-roster-live.test precedent),
 * then members / freeze commits / the naming counter / the fixed-amount schedule. Idempotency keys are
 * DELIBERATELY NOT swept — a `LIKE 'cycle.spawn.parent:%'` global delete would race concurrent suites'
 * in-flight parent claims ([[project_live_db_test_gotchas]]); every run uses fresh cycle ids, so nothing
 * accrues.
 */
export async function cleanupPoolCohort(pool: pg.Pool, pariwarId: string): Promise<void> {
  const step = async (label: string, run: () => Promise<unknown>): Promise<void> => {
    try {
      await run();
    } catch (err) {
      console.warn(`[pool-cohort-seed] cleanup step "${label}" failed (residue may remain): ${String(err)}`);
    }
  };

  await step('pool_snapshots', () => pool.query('DELETE FROM pool_snapshots WHERE pariwar_id = $1', [pariwarId]));
  await step('pools', () => pool.query('DELETE FROM pools WHERE pariwar_id = $1', [pariwarId]));

  // Event streams (member + pool + cycle) share the pariwar_id column; bypass the projector triggers so
  // the bulk delete does not fire per-row state-projection logic. `pool.connect()` itself can reject (pool
  // exhausted/closing) — wrapped in the same `step` helper as every other step so a connect failure here
  // still lets the members/cycle_freeze_commits/counters/schedule steps below run instead of aborting them.
  await step('events_log', async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
  });

  await step('members', () => pool.query('DELETE FROM members WHERE pariwar_id = $1', [pariwarId]));
  await step('cycle_freeze_commits', () =>
    pool.query('DELETE FROM cycle_freeze_commits WHERE pariwar_id = $1', [pariwarId]),
  );
  await step('pool_canonical_counters', () =>
    pool.query('DELETE FROM pool_canonical_counters WHERE pariwar_id = $1', [pariwarId]),
  );
  await step('pool_fixed_amount_schedule', () =>
    pool.query('DELETE FROM pool_fixed_amount_schedule WHERE pariwar_id = $1', [pariwarId]),
  );
}
