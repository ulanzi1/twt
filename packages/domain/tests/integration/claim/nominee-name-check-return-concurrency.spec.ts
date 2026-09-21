// Story 6.18 AC11 — the RETURN loop under TRUE two-connection races (Task 7, checklist family 2).
//
// ⚠⚠ WHY THIS FILE EXISTS. Story 6.18's two live specs (`nominee-name-check.spec.ts`,
// `nominee-name-check-return-loop.spec.ts`) both run inside `setupLiveDb()` + `getTx()` — ONE
// connection, inside a single BEGIN/ROLLBACK. That shape proves sequencing and error mapping, and it
// ⛔ cannot prove a race: on one connection every read already sees its own uncommitted writes, the
// advisory lock is trivially re-entrant, and a partial-unique index can never be contended. So the
// story's exclusion invariants were asserted ⛔ nowhere. The code-review bullet put it plainly:
// *"no two-connection race is proven for any new write."* This is that proof.
//
// ⭐ THE THREE INVARIANTS PROVED HERE, none of which is observable on a single connection:
//   (1) Two concurrent RETURNS → exactly ONE live `correction_return` row. The loser surfaces the
//       partial-unique `(claim_case_id, phase) WHERE superseded_at IS NULL` as the TYPED
//       `TrusteeDecisionConflictError`, ⛔ never a raw 23505 escaping to the caller.
//   (2) A concurrent RETURN and ROUTE-TO-R9 → exactly ONE of them lands. These write DIFFERENT
//       phases, so the unique index ⛔ does not catch them; the mutual-exclusion GUARDS do
//       (`hasLiveReturnRow` / `hasLiveRoutedRow`), and the loser gets `TrusteeExclusionConflictError`.
//       ⭐ `routeToR9`'s own comment makes this a CONCURRENCY claim in as many words — *"Read under
//       the claim lock this function already holds, so a concurrent return cannot slip past"* — and
//       a claim about concurrency is exactly what a one-connection test cannot check.
//   (3) The exclusion is SYMMETRIC: it holds whichever of the two is submitted first.
//
// ⭐ WHY THE OUTCOME IS DETERMINISTIC AND ⛔ NOT FLAKY. Both writers take
// `acquireTrusteeLock(pariwarId, claimCaseId)` as their FIRST statement, then `lockClaim`. Postgres
// serialises the two transactions on that advisory lock: the second acquires it only after the first
// COMMITS, and therefore reads the first's row. So "exactly one wins" is a property of the lock, not
// of timing — which is why this asserts an exact partition (1 fulfilled, 1 rejected) rather than a
// tolerant "at least one".
//
// ⚠ Own-committing (⛔ NOT `setupLiveDb`): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup is by the specific claim ids this suite creates; `events_log` is append-only, so
// its rows go under `SET LOCAL session_replication_role='replica'`. Assertions key on our OWN ids,
// ⛔ never absolute counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  projectClaimState,
  returnToDistrictAdmin,
  routeToR9,
  TrusteeDecisionConflictError,
  TrusteeExclusionConflictError,
} from '../../../src/claim/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const TRUSTEE = '88888888-8888-8888-8888-888888888888';
const TIMEOUT = 20_000;

/** `other` is the only code valid for a return — `-227` cl.10 asks for a NOTE, not a category. */
const returnInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  reasonCode: 'other' as const,
  rationaleCiphertext: 'enc:v1:the-holder-name-is-not-the-nominee',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

const routeInput = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  reasonCode: 'r9_special_case' as const,
  rationaleCiphertext: 'enc:v1:this-is-an-r9-special-case',
  actorId: TRUSTEE,
  actorDisplay: 'Pariwar Admin One',
  actor: 'trustee' as const,
});

describe.skipIf(!hasDatabase)(
  'Story 6.18 AC11 — the return loop under two-connection races (own-committing)',
  () => {
    let pool: pg.Pool;
    const createdClaims: string[] = [];

    async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // ⭐ Shed the Docker superuser, or RLS never applies and the race proves nothing about the
        // path production actually takes.
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR_A);
        const out = await fn(client);
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }

    /** Drive a fresh claim to `verifier_approved` — a state in `TRUSTEE_RETURNABLE_STATES`. */
    async function seedApprovedClaim(): Promise<ClaimId> {
      const cid = toClaimId(randomUUID());
      const mid: MemberId = toMemberId(randomUUID());
      createdClaims.push(cid);
      await onOwnTx(async (client) => {
        const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
          projectClaimState(client, {
            claimCaseId: cid,
            pariwarId: PARIWAR_A,
            deceasedMemberId: mid,
            intakeChannels: ['member_app'],
            claimantActorId: null,
            eventType: eventType as never,
            payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
            actorId: null,
          });
        await emit(null, 'intake_pending', 'claim.intake_initiated', {
          deceased_member_id: mid,
          intake_channel: 'member_app',
          claimant_actor_id: null,
        });
        await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
        await emit('intake_converged', 'documents_pending', 'claim.documents_received');
        await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
          selected_member_ids: [randomUUID()],
          metric_id: 'district_cohort_v1',
          metric_version: 1,
        });
        await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
        await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      });
      return cid;
    }

    /** Live decision rows for ONE claim, by phase — keyed on our own id, never a global count. */
    async function livePhases(claimCaseId: ClaimId): Promise<string[]> {
      const r = await pool.query(
        `SELECT phase FROM claim_state_trustee_decisions
          WHERE claim_case_id = $1 AND superseded_at IS NULL
          ORDER BY phase`,
        [claimCaseId],
      );
      return (r.rows as { phase: string }[]).map((x) => x.phase);
    }

    /** Split a settled pair into [fulfilled, rejected] — the exact partition is the assertion. */
    function partition<T>(results: PromiseSettledResult<T>[]): {
      readonly ok: PromiseFulfilledResult<T>[];
      readonly failed: PromiseRejectedResult[];
    } {
      return {
        ok: results.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled'),
        failed: results.filter((r): r is PromiseRejectedResult => r.status === 'rejected'),
      };
    }

    beforeAll(() => {
      pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
      pool.on('error', (err) =>
        console.error('[nominee-name-check-return-concurrency.spec] idle client error:', err.message),
      );
    });

    afterAll(async () => {
      if (createdClaims.length > 0) {
        await pool
          .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
          .catch((e: Error) =>
            console.error('[nominee-name-check-return-concurrency.spec] claims cleanup:', e.message),
          );
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK').catch(() => undefined);
          console.error(
            '[nominee-name-check-return-concurrency.spec] events_log cleanup:',
            (e as Error).message,
          );
        } finally {
          c.release();
        }
      }
      await pool.end();
    });

    it(
      '⭐⭐ two concurrent RETURNS → exactly ONE live row; the loser gets the TYPED conflict, ⛔ never a raw 23505',
      async () => {
        const cid = await seedApprovedClaim();

        const results = await Promise.allSettled([
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(cid))),
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(cid))),
        ]);
        const { ok, failed } = partition(results);

        // ⭐ An EXACT partition, not "at least one" — the advisory lock makes this deterministic.
        expect(ok).toHaveLength(1);
        expect(failed).toHaveLength(1);

        // ⛔ The partial-unique must surface as the story's typed error. A raw 23505 reaching the
        // caller would become a 500 for the Pariwar Admin instead of the 409 AC11 specifies.
        expect(failed[0]?.reason).toBeInstanceOf(TrusteeDecisionConflictError);

        // ⭐ And the database agrees with the winner: exactly one live return, by OUR claim id.
        expect(await livePhases(cid)).toEqual(['correction_return']);
      },
      TIMEOUT,
    );

    it(
      '⭐⭐ a concurrent RETURN and ROUTE-TO-R9 → exactly ONE lands; the guards hold across connections',
      async () => {
        const cid = await seedApprovedClaim();

        const results = await Promise.allSettled([
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(cid))),
          onOwnTx((client) => routeToR9(client, routeInput(cid))),
        ]);
        const { ok, failed } = partition(results);

        expect(ok).toHaveLength(1);
        expect(failed).toHaveLength(1);

        // ⛔ These write DIFFERENT phases, so the unique index cannot catch them — the mutual
        // exclusion is enforced by `hasLiveReturnRow` / `hasLiveRoutedRow`, read under the claim
        // lock. This is the assertion that proves the guard is not merely a same-transaction check.
        expect(failed[0]?.reason).toBeInstanceOf(TrusteeExclusionConflictError);

        // ⭐ Exactly one live row, and it is whichever writer won — never both phases.
        const phases = await livePhases(cid);
        expect(phases).toHaveLength(1);
        expect(['correction_return', 'routing']).toContain(phases[0]);
      },
      TIMEOUT,
    );

    it(
      '⭐ the exclusion is SYMMETRIC — it holds with the route submitted first',
      async () => {
        const cid = await seedApprovedClaim();

        // ⚠ Order reversed deliberately. If the guard were only implemented on one of the two
        // writers, the previous test would still pass half the time and this one would fail.
        const results = await Promise.allSettled([
          onOwnTx((client) => routeToR9(client, routeInput(cid))),
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(cid))),
        ]);
        const { ok, failed } = partition(results);

        expect(ok).toHaveLength(1);
        expect(failed).toHaveLength(1);
        expect(failed[0]?.reason).toBeInstanceOf(TrusteeExclusionConflictError);

        const phases = await livePhases(cid);
        expect(phases).toHaveLength(1);
        expect(['correction_return', 'routing']).toContain(phases[0]);
      },
      TIMEOUT,
    );

    it(
      '⭐ POSITIVE CONTROL — two races on DIFFERENT claims both succeed, so the partition above is a real exclusion',
      async () => {
        // ⚠⚠ WITHOUT THIS, "exactly one wins" could equally be explained by the second call failing
        // for a reason that has ⛔ nothing to do with exclusion — a seeding bug, a scope error, a
        // lock timeout. Two returns against two SEPARATE claims must BOTH land. Same code path, same
        // concurrency, ⛔ no shared claim ⇒ ⛔ no conflict.
        const [a, b] = [await seedApprovedClaim(), await seedApprovedClaim()];

        const results = await Promise.allSettled([
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(a))),
          onOwnTx((client) => returnToDistrictAdmin(client, returnInput(b))),
        ]);
        const { ok, failed } = partition(results);

        expect(failed.map((f) => (f.reason as Error)?.message)).toEqual([]);
        expect(ok).toHaveLength(2);
        expect(await livePhases(a)).toEqual(['correction_return']);
        expect(await livePhases(b)).toEqual(['correction_return']);
      },
      TIMEOUT,
    );
  },
);
