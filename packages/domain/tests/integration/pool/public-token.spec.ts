// The pool's PUBLIC ADDRESS TOKEN — live-DB integration (Story 11b.10, Tasks 1-2; AC1, AC2).
//
// ⭐ Governance of record: `2026-09-03-184` **(B)** (Trustee-ratified — the public address must be
// UNGUESSABLE) with **D1** (an OPEN LINK: the token bounds DISCOVERY, ⛔ not AUTHORISATION) and
// **D2** (RANDOM · STORED · ROTATABLE, ⛔ not derived) ruled 2026-09-04.
//
// ⚠ Asserts MEMBERSHIP and explicit values, ⛔ never counts over a shared fixture, and ⛔ never
// `DROP SCHEMA` ([[project_live_db_test_gotchas]]). Runs inside the per-test BEGIN/ROLLBACK.
//
// ⛔⛔ THE ONE THING THESE TESTS EXIST TO CATCH, because it would pass every OTHER gate: a token
// that is DERIVED from pool identity. It would produce working links, a green typecheck and a green
// route suite — while re-creating exactly the guessability the story removes, and while being
// UNROTATABLE per drive, which leaves D1's open-link ruling with no remedy at all.

import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  claimId as toClaimId,
  cycleFreezeCommitId as toCycleId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
} from '../../../src/ids/index.js';
import { projectPoolState } from '../../../src/pool/index.js';
import {
  POOL_PUBLIC_TOKEN_LENGTH,
  mintPoolPublicToken,
  readPoolPublicToken,
  rotatePoolPublicToken,
} from '../../../src/pool/public-token.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedPool } from '../_helpers.js';

describe.skipIf(!hasDatabase)('pools.public_token — the unguessable public address (PARIWAR_A)', () => {
  setupLiveDb();

  describe('⭐ the mint (AC2, D2)', () => {
    it('is 128 bits of CSPRNG entropy rendered URL-safe — 22 base64url chars, ⛔ no padding', () => {
      const token = mintPoolPublicToken();
      expect(token).toHaveLength(POOL_PUBLIC_TOKEN_LENGTH);
      // ⛔ base64url ONLY: ⛔ no `+`, ⛔ no `/`, ⛔ no `=`. Any of those would need percent-encoding
      // in a path segment, and a URL a human retypes would then break in a way nothing else catches.
      expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });

    it('⛔ NEVER repeats — 512 mints are 512 distinct values', () => {
      // ⚠ NOT a statistical claim about randomness (a test cannot make one). What it catches is the
      // real regression shape: a mint that returns a CONSTANT, a counter, or a per-process value.
      const tokens = new Set(Array.from({ length: 512 }, () => mintPoolPublicToken()));
      expect(tokens.size).toBe(512);
    });
  });

  describe('⭐⭐ minted AT SPAWN, and ⛔ NOT derived from pool identity (AC2, D2)', () => {
    it('the projector mints a token on the spawn INSERT, and it is readable back', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const poolId = toPoolId(randomUUID());
      const cycleId = randomUUID();
      const claimCaseId = randomUUID();
      const canonical = `P-2026-07-${randomUUID().slice(0, 6)}`;

      await projectPoolState(client, {
        poolId,
        pariwarId: toPariwarId(PARIWAR_A),
        cycleId: toCycleId(cycleId),
        claimCaseId: toClaimId(claimCaseId),
        poolIndex: 0,
        poolCanonicalIdentifier: canonical,
        supportCategory: 'death_support',
        benefitMechanism: 'pool',
        fixedAmount: 500,
        eventType: 'pool.spawned',
        payload: {
          from_state: null,
          to_state: 'spawned',
          trigger: 'cycle_freeze_commit:spawn',
          actor: 'system',
          support_category: 'death_support',
          benefit_mechanism: 'pool',
          fixed_amount: 500,
          pool_index: 0,
          cycle_id: cycleId,
          pool_canonical_identifier: canonical,
        },
        actorId: null,
      });

      const token = await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), poolId);
      expect(token).not.toBeNull();
      expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);

      // ⛔⛔ THE DERIVATION CHECK — the defect that would pass everything else. The token must share
      // ⛔ NOTHING with `pool_id` (7.3 mints a DETERMINISTIC UUIDv5 one), the canonical identifier,
      // or the cycle. ⚠ Asserted as "does not contain", which is what a naive derivation
      // (`slice`/`replace`/`base64(poolId)`) actually produces.
      const hex = poolId.replace(/-/g, '');
      expect(token).not.toContain(hex.slice(0, 8));
      expect(token).not.toContain(canonical);
      expect(Buffer.from(token!, 'base64url').toString('hex')).not.toBe(hex);
    });

    it('⛔ two pools spawned in the SAME cycle get DIFFERENT addresses', async () => {
      // ⚠ Same cycle, adjacent `pool_index` — the shape in which a derived token would collide or
      // become adjacent-guessable. ⭐ 7.3's spawn determinism binds `pool_id`, ⛔ never this.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cycleId = randomUUID();
      const ids: ReturnType<typeof toPoolId>[] = [];
      for (const poolIndex of [0, 1]) {
        const poolId = toPoolId(randomUUID());
        ids.push(poolId);
        const canonical = `P-2026-07-${randomUUID().slice(0, 6)}`;
        await projectPoolState(client, {
          poolId,
          pariwarId: toPariwarId(PARIWAR_A),
          cycleId: toCycleId(cycleId),
          claimCaseId: toClaimId(randomUUID()),
          poolIndex,
          poolCanonicalIdentifier: canonical,
          supportCategory: 'death_support',
          benefitMechanism: 'pool',
          fixedAmount: 500,
          eventType: 'pool.spawned',
          payload: {
            from_state: null,
            to_state: 'spawned',
            trigger: 'cycle_freeze_commit:spawn',
            actor: 'system',
            support_category: 'death_support',
            benefit_mechanism: 'pool',
            fixed_amount: 500,
            pool_index: poolIndex,
            cycle_id: cycleId,
            pool_canonical_identifier: canonical,
          },
          actorId: null,
        });
      }
      const [a, b] = await Promise.all(
        ids.map((id) => readPoolPublicToken(tx, toPariwarId(PARIWAR_A), id)),
      );
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a).not.toBe(b);
    });
  });

  describe('⭐⭐ ROTATION — the ONLY remedy D1 has (AC2, D2)', () => {
    it('rotating ONE drive changes ITS address and ⛔ leaves EVERY other drive untouched', async () => {
      // ⭐⭐ WITHOUT THIS, D1's open-link ruling has ⛔ NO REMEDY: a forwarded link is permanent
      // public access to that drive until its token is rotated. ⚠ And the isolation half is the
      // load-bearing one — a rotation that also moved the neighbours would be a mass link-breakage
      // dressed as a fix, which is precisely what a DERIVED token (one shared secret) would do.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const targetId = toPoolId(randomUUID());
      const neighbourId = toPoolId(randomUUID());
      await seedPool(tx, PARIWAR_A, { poolId: targetId });
      await seedPool(tx, PARIWAR_A, { poolId: neighbourId });

      const before = await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), targetId);
      const neighbourBefore = await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), neighbourId);
      expect(before).not.toBeNull();
      expect(neighbourBefore).not.toBeNull();

      const rotated = await rotatePoolPublicToken(tx, toPariwarId(PARIWAR_A), targetId);

      expect(rotated).not.toBeNull();
      expect(rotated).not.toBe(before);
      expect(rotated).toMatch(/^[A-Za-z0-9_-]{22}$/);
      // ⭐ The returned value IS what is stored — ⛔ not a value the caller has to trust.
      expect(await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), targetId)).toBe(rotated);
      // ⛔ THE ISOLATION: the neighbour's address is byte-for-byte what it was.
      expect(await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), neighbourId)).toBe(
        neighbourBefore,
      );
    });

    it('⛔ the OLD address stops resolving — a rotation actually WITHDRAWS the link', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const poolId = toPoolId(randomUUID());
      await seedPool(tx, PARIWAR_A, { poolId });
      const old = await readPoolPublicToken(tx, toPariwarId(PARIWAR_A), poolId);
      await rotatePoolPublicToken(tx, toPariwarId(PARIWAR_A), poolId);

      const rows = await tx
        .select({ poolId: schema.pools.poolId })
        .from(schema.pools)
        .where(eq(schema.pools.publicToken, old!));
      expect(rows).toEqual([]);
    });

    it('rotating an UNKNOWN pool returns null — ⛔ never a throw, and ⛔ nothing is written', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const rotated = await rotatePoolPublicToken(
        tx,
        toPariwarId(PARIWAR_A),
        toPoolId(randomUUID()),
      );
      expect(rotated).toBeNull();
    });

    it('⛔ rotation does NOT touch the current_state cache — the 0071 guard is not engaged', async () => {
      // ⚠ THE PROPERTY THIS PINS: `public_token` is an ADDRESS, ⛔ not part of the replay-derived
      // state cache. Migration 0071's trigger guards `current_state` / `state_event_version` and
      // its own header says writes touching NEITHER are unaffected — so rotation needs ⛔ no
      // `app.pool_state_writer` guard. ⛔ If a future change makes rotation set either column, this
      // test fails and the guard question comes back into view instead of being silently answered.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const poolId = toPoolId(randomUUID());
      await seedPool(tx, PARIWAR_A, { poolId, currentState: 'live', stateEventVersion: 2 });
      await rotatePoolPublicToken(tx, toPariwarId(PARIWAR_A), poolId);
      const rows = await tx
        .select({
          currentState: schema.pools.currentState,
          stateEventVersion: schema.pools.stateEventVersion,
        })
        .from(schema.pools)
        .where(eq(schema.pools.poolId, poolId));
      expect(rows[0]?.currentState).toBe('live');
      expect(rows[0]?.stateEventVersion).toBe(2);
    });
  });

  describe('⭐⭐ ZERO NULL TOKENS — structural, ⛔ not a snapshot (AC2)', () => {
    it('⛔ NO pool row in ANY state carries a NULL token — the 0114 backfill + NOT NULL', async () => {
      // ⭐⭐ WHY THIS MATTERS MORE THAN IT LOOKS: a VISIBLE pool with a NULL token is a drive whose
      // public page **404s** — a broken archive. ⚠ The migration backfilled every pre-existing row
      // and THEN set NOT NULL, in that order, so this is a STRUCTURAL truth rather than a
      // point-in-time observation. ⛔ Do not weaken it to "the rows this test seeded".
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      // Seed one pool in each of the four lifecycle states, so the assertion covers the VISIBLE
      // ones (`live` / `closed` / `settled`) as well as `spawned`.
      for (const currentState of ['spawned', 'live', 'closed', 'settled'] as const) {
        await seedPool(tx, PARIWAR_A, { poolId: toPoolId(randomUUID()), currentState });
      }
      const nulls = await tx.execute(
        sql`SELECT count(*)::int AS n FROM pools WHERE public_token IS NULL`,
      );
      const rows = nulls as unknown as { rows?: { n: number }[] };
      expect((rows.rows ?? (nulls as unknown as { n: number }[]))[0]?.n ?? 0).toBe(0);
    });

    it('⛔ the column REFUSES a NULL — the guarantee is the DB’s, ⛔ not a convention', async () => {
      // ⚠ The other direction: a nullable column plus a "zero NULLs today" check passes and ships a
      // broken archive the first time a spawn path misses the mint. This asserts the constraint.
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const err = await client
        .query("SET LOCAL app.pool_state_writer = 'on'")
        .then(() =>
          client.query(
            `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
               pool_canonical_identifier, support_category, benefit_mechanism, fixed_amount,
               current_state, state_event_version)
             VALUES ($1,$2,$3,$4,0,$5,'death_support','pool',500,'spawned',1)`,
            [randomUUID(), PARIWAR_A, randomUUID(), randomUUID(), `P-2026-07-${randomUUID().slice(0, 6)}`],
          ),
        )
        .then(() => null)
        .catch((e: unknown) => e);
      // 23502 = not_null_violation.
      expect((err as { code?: string })?.code).toBe('23502');
    });

    it('⛔ a DUPLICATE token is refused — the GLOBAL unique index, ⛔ not a per-Pariwar one', async () => {
      // ⭐ An ADDRESS must name at most ONE thing without a second value to disambiguate it. ⇒ the
      // index is global, and a colliding mint fails LOUDLY (23505) instead of silently re-pointing
      // one drive's public address at another's.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const shared = mintPoolPublicToken();
      await seedPool(tx, PARIWAR_A, { poolId: toPoolId(randomUUID()), publicToken: shared });
      const err = await seedPool(tx, PARIWAR_A, {
        poolId: toPoolId(randomUUID()),
        publicToken: shared,
      })
        .then(() => null)
        .catch((e: unknown) => e);
      expect((err as { cause?: { code?: string } })?.cause?.code).toBe('23505');
    });
  });
});
