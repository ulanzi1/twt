// State-Trustee cycle-freeze CONCURRENCY — true two-connection races (Story 6.13, Task 9; AC9).
//
// Proves the level a single-connection spec can't: ACTUAL multi-connection race behaviour. Two claims of
// races are exercised, both keyed on the (pariwarId, claimCaseId)-scoped advisory lock the writers take:
//   (1) VOTE path — two genuinely concurrent approve votes on the SAME freeze-ready claim. The lock
//       serializes them: the first advances the claim to state_trustee_approved + writes the live
//       frozen_vote row; the second BLOCKS, then re-reads FRESH and finds the claim no longer votable →
//       ClaimNotFreezeVotableError. Exactly one live frozen_vote row survives.
//   (2) ESCALATION-RESOLUTION path — two concurrent resolves of the SAME live escalated verifier decision.
//       The atomic conditional supersession (0-row UPDATE ⇒ 409) is the backstop; combined with the lock,
//       exactly one resolve wins and the loser errors (ClaimStreamConcurrencyError or
//       EscalationResolutionConflictError / EscalationNotResolvableError on the fresh re-read).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool clients.
// Cleanup is by the specific claim ids this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { projectClaimState, resolveEscalation, voteOnFrozenClaim } from '../../../src/claim/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
// A DEDICATED pariwarId (NOT the shared _helpers.ts PARIWAR_A) — this spec COMMITS rows.
const PARIWAR = toPariwarId('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1');
const TRUSTEE = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
const VERIFIER = 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1';
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('state-trustee cycle-freeze — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];

  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR);
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

  /** Drive a fresh claim to `target` on one own-committing tx. */
  async function seedClaimTo(claimCaseId: ClaimId, deceased: MemberId, target: 'verifier_review' | 'verifier_approved'): Promise<void> {
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId,
          pariwarId: PARIWAR,
          deceasedMemberId: deceased,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: deceased,
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
      if (target === 'verifier_approved') {
        await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      }
    });
  }

  beforeAll(async () => {
    if (!hasDatabase) return;
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
  });

  afterAll(async () => {
    if (!hasDatabase || !pool) return;
    const admin = await pool.connect();
    try {
      // Cleanup by the specific claim ids (own-committed rows do NOT roll back). Deleting the claim
      // cascades to claim_state_trustee_decisions + claim_verifier_decisions (FK ON DELETE CASCADE).
      await admin.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims]).catch(() => undefined);
      // events_log is append-only (AR-8 trigger) — replica role sheds the trigger for the test-only purge.
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[state-trustee-cycle-freeze-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it(
    'VOTE: two concurrent approve votes on one claim — exactly one succeeds, one is rejected',
    async () => {
      const claimCaseId = toClaimId(randomUUID());
      const deceased = toMemberId(randomUUID());
      createdClaims.push(claimCaseId);
      await seedClaimTo(claimCaseId, deceased, 'verifier_approved');

      const voteInput = {
        claimCaseId,
        pariwarId: PARIWAR,
        reasonCode: null,
        rationaleCiphertext: null,
        actorId: TRUSTEE,
        actorDisplay: 'Trustee One',
        actor: 'trustee' as const,
        outcome: 'approved' as const,
      };
      const results = await Promise.allSettled([
        onOwnTx((client) => voteOnFrozenClaim(client, voteInput)),
        onOwnTx((client) => voteOnFrozenClaim(client, voteInput)),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Exactly one live frozen_vote row survives.
      const admin = await pool.connect();
      try {
        const { rows } = await admin.query(
          `SELECT count(*)::int AS n FROM claim_state_trustee_decisions
             WHERE claim_case_id = $1 AND phase = 'frozen_vote' AND superseded_at IS NULL`,
          [claimCaseId],
        );
        expect(rows[0].n).toBe(1);
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );

  it(
    'ESCALATION: two concurrent resolves of one escalated decision — exactly one wins',
    async () => {
      const claimCaseId = toClaimId(randomUUID());
      const deceased = toMemberId(randomUUID());
      createdClaims.push(claimCaseId);
      await seedClaimTo(claimCaseId, deceased, 'verifier_review');
      // Commit a live escalated verifier decision.
      await onOwnTx(async (client) => {
        await client.query(
          `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, actor_id, actor_display)
           VALUES ($1, $2, 'escalated', 'r9_routed_to_voting', $3, 'Verifier Anita')`,
          [claimCaseId, PARIWAR, VERIFIER],
        );
      });

      const resolveInput = {
        claimCaseId,
        pariwarId: PARIWAR,
        reasonCode: null,
        rationaleCiphertext: null,
        actorId: TRUSTEE,
        actorDisplay: 'Trustee One',
        actor: 'trustee' as const,
        outcome: 'approved' as const,
      };
      const results = await Promise.allSettled([
        onOwnTx((client) => resolveEscalation(client, resolveInput)),
        onOwnTx((client) => resolveEscalation(client, resolveInput)),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);

      // The escalated verifier decision is superseded exactly once.
      const admin = await pool.connect();
      try {
        const { rows } = await admin.query(
          `SELECT count(*)::int AS n FROM claim_verifier_decisions
             WHERE claim_case_id = $1 AND outcome = 'escalated' AND superseded_at IS NULL`,
          [claimCaseId],
        );
        expect(rows[0].n).toBe(0);
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );
});
