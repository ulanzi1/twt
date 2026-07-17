// AI-4-2 — real-path determinism/replay harness (measured-validation framework; live DB) (:5433).
//
// D2 ratified (BigDev 2026-07-17): EXTEND the determinism gate to the REAL DB-backed producer — what
// Story 7.9 needs anyway for `hash(member_id+cycle_id)%N` replay across synthetic members, so building it
// here is the "no duplicate tooling" win. The synthetic 100×-thread P0 gate (`determinism.test.ts`) stays
// intact + additive; THIS is the DB-backed backstop, carrying the STRONGER-THAN-HASH proof:
//   (a) full canonical-payload DEEP EQUALITY across K replays (not just the digest — proves field coverage)
//   (b) exactly ONE distinct validity_payload_hash
//   (c) DISCRIMINATION — a perturbed input (a different member / instant) yields a DIFFERENT hash
// So a stable-but-incomplete hash OR a degenerate constant hash BOTH fail (semantic-coverage discipline).
// The stable value also matches the Story 4.8 hit≡recompute contract (getValidity == getValidityCached).

import { randomUUID } from 'node:crypto';

import { createDb, ids, idempotency, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidity, getValidityCached, getValidityAt, type ValidityServiceDeps } from '../../src/index.js';
import { assertReplayStable, seedValidityMembers, type ReplaySample } from '../framework/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const REPLAYS = 12;

describe.skipIf(!hasDatabase)('AI-4-2 — real-path determinism/replay (framework; live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  let memberIds: ids.MemberId[];
  const pariwarId = ids.pariwarId(randomUUID());
  const PIN = new Date('2025-06-01T00:00:00.000Z');

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 8 });
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
    memberIds = await seedValidityMembers(db, { scale: 3, pariwarId });
  }, 60_000);

  afterAll(async () => {
    if (!hasDatabase) return;
    // Scoped to our OWN Pariwar. idempotency_keys are deliberately NOT swept — a global `LIKE` delete
    // races other suites' in-flight keys ([[project_live_db_test_gotchas]]); the memo keys TTL-expire.
    for (const t of ['member_validity_cache', 'cohort_invalidation_epochs', 'clause_versions', 'events_log']) {
      await pool.query(`DELETE FROM ${t} WHERE pariwar_id = $1`, [pariwarId]).catch(() => undefined);
    }
    await pool.end();
  });

  it('K real-producer replays: full payload deep-equal + single hash + discrimination (stronger than same-hash)', async () => {
    const member = memberIds[0]!;
    const other = memberIds[1]!;

    // K replays of the SAME input against the REAL DB-backed producer (getValidityAt at a pinned instant).
    const replays: ReplaySample[] = [];
    for (let i = 0; i < REPLAYS; i++) {
      const payload = await getValidityAt(deps, { pariwarId, memberId: member }, PIN, { internal: true });
      replays.push({ payload, hash: payload.validityPayloadHash });
    }

    // A DELIBERATELY PERTURBED input — a DIFFERENT member over identical seeded shape — MUST change the
    // hash (proves the digest is a real function of the varying state, not a vacuous constant).
    const perturbedPayload = await getValidityAt(deps, { pariwarId, memberId: other }, PIN, { internal: true });

    const stableHash = assertReplayStable({
      replays,
      perturbed: { payload: perturbedPayload, hash: perturbedPayload.validityPayloadHash },
    });

    // The stable real-path hash matches the Story 4.8 hit≡recompute contract (cached == direct recompute).
    const cached = await getValidityCached(deps, { pariwarId, memberId: member }, { internal: true });
    const direct = await getValidity(deps, { pariwarId, memberId: member }, { internal: true });
    expect(cached.validityPayloadHash).toBe(direct.validityPayloadHash);
    // getValidity pins live now() (≠ PIN) but the hash EXCLUDES evaluatedAt, so it equals the pinned replay.
    expect(direct.validityPayloadHash).toBe(stableHash);
  }, 60_000);
});
