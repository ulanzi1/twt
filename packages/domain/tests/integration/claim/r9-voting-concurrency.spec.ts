// R9 voting CONCURRENCY + forced-rollback — true two-connection races (Story 6.14, Task 11; AC9/#15/#16).
//
// Proves what a single-connection spec can't: ACTUAL multi-connection race behaviour, all keyed on the
// (pariwarId, claimCaseId)-scoped advisory lock the R9 writers take:
//   (1) TWO RACING FINALIZES — exactly one advances the lifecycle + emits claim.r9_outcome; the loser
//       serializes behind the lock, re-checks the outcome short-circuit, and returns the recorded outcome
//       (idempotentReplay) — never a double-advance / double-emit (#7/#16).
//   (2) CONCURRENT VOTES by different panelists — both land (the lock serializes the inserts), the tally
//       reflects both.
//   (3) OPEN-RACING-OPEN — the partial-unique + lock → exactly one session; the loser errors (#4).
//   (4) FORCED ROLLBACK (#15) — forcing the finalize's claim_state_trustee_decisions insert to fail proves
//       the WHOLE tx rolls back: no orphan claim.r9_outcome event, no session-outcome write, the routing row
//       stays live.
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool clients.
// Cleanup is by the specific ids this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  castR9Vote,
  finalizeR9Outcome,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  projectClaimState,
  R9SessionExistsError,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId('d9d9d9d9-d9d9-d9d9-d9d9-d9d9d9d9d9d9');
const TRUSTEE = 'e9e9e9e9-e9e9-e9e9-e9e9-e9e9e9e9e9e9';
const PANEL = [
  'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1',
  'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
  'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3',
];
const R9_CLAUSE = 'niy.special-death.r9';
const CIPHER = prepareR9VoteCiphertext('enc:v1:fake');
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('R9 voting — two-connection concurrency + forced rollback (own-committing)', () => {
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

  const openInput = (claimCaseId: ClaimId) => ({
    claimCaseId,
    pariwarId: PARIWAR,
    clauseId: R9_CLAUSE,
    panelActorIds: PANEL,
    actorId: TRUSTEE,
    actorDisplay: 'Trustee One',
    actor: 'trustee' as const,
  });
  const voteInput = (claimCaseId: ClaimId, voter: string, vote: 'approve' | 'deny') => ({
    claimCaseId,
    pariwarId: PARIWAR,
    vote,
    rationaleCiphertext: CIPHER,
    actorId: voter,
    actorDisplay: `Panelist ${voter.slice(0, 4)}`,
    actor: 'trustee' as const,
  });
  const finalizeInput = (claimCaseId: ClaimId) => ({
    claimCaseId,
    pariwarId: PARIWAR,
    actorId: PANEL[0]!,
    actorDisplay: 'Panelist f1',
    actor: 'trustee' as const,
  });

  /** Drive a fresh claim to verifier_approved + insert a live routed_to_r9 row, own-committing. */
  async function seedRoutedClaim(): Promise<ClaimId> {
    const claimCaseId = toClaimId(randomUUID());
    const deceased: MemberId = toMemberId(randomUUID());
    createdClaims.push(claimCaseId);
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
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await bindScopedDb(client).insert(schema.claimStateTrusteeDecisions).values({
        claimCaseId,
        pariwarId: PARIWAR,
        phase: 'routing',
        outcome: 'routed_to_r9',
        reasonCode: 'r9_special_case',
        rationaleCiphertext: null,
        actorId: TRUSTEE,
        actorDisplay: 'Trustee One',
      });
    });
    return claimCaseId;
  }

  beforeAll(async () => {
    if (!hasDatabase) return;
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    // Seed the R9 clause + panel grants ONCE (committed; cleaned in afterAll).
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query(
        `INSERT INTO clause_versions (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
         VALUES (gen_random_uuid(), $1, $2, 1, now(), $3, 'pool') ON CONFLICT DO NOTHING`,
        [R9_CLAUSE, PARIWAR, JSON.stringify({ rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' })],
      );
      for (const uid of [TRUSTEE, ...PANEL]) {
        await admin.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active') ON CONFLICT DO NOTHING`, [uid]);
        await admin.query(
          `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3) ON CONFLICT DO NOTHING`,
          [uid, PARIWAR, PARIWAR],
        );
      }
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      admin.release();
    }
  });

  afterAll(async () => {
    if (!hasDatabase || !pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims]).catch(() => undefined);
      await admin.query('DELETE FROM role_grants WHERE pariwar_id = $1', [PARIWAR]).catch(() => undefined);
      await admin.query('DELETE FROM clause_versions WHERE pariwar_id = $1', [PARIWAR]).catch(() => undefined);
      await admin.query('DELETE FROM users WHERE id = ANY($1)', [[TRUSTEE, ...PANEL]]).catch(() => undefined);
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[r9-voting-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it(
    '(1) two racing finalizes → exactly one advances + emits claim.r9_outcome; the loser is an idempotent replay',
    async () => {
      const claimCaseId = await seedRoutedClaim();
      await onOwnTx((c) => openR9VotingSession(c, openInput(claimCaseId)));
      await onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[0]!, 'approve')));
      await onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[1]!, 'approve')));

      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => finalizeR9Outcome(c, finalizeInput(claimCaseId))),
        onOwnTx((c) => finalizeR9Outcome(c, finalizeInput(claimCaseId))),
      ]);
      const fulfilled = [a, b].filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof finalizeR9Outcome>>> => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(2); // both succeed (one fresh, one idempotent replay)
      const fresh = fulfilled.filter((r) => r.value.idempotentReplay === false);
      const replay = fulfilled.filter((r) => r.value.idempotentReplay === true);
      expect(fresh).toHaveLength(1);
      expect(replay).toHaveLength(1);

      // Exactly ONE claim.r9_outcome event exists (no double-emit).
      const admin = await pool.connect();
      try {
        const ev = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.r9_outcome'`, [claimCaseId]);
        expect(ev.rows[0].n).toBe(1);
        const st = await admin.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId]);
        expect(st.rows[0].current_state).toBe('state_trustee_approved');
        // Directly assert the other two "exactly one" guarantees under the REAL race too (previously only
        // inferred via the event count, or only checked in the sequential single-connection spec).
        const routing = await admin.query(
          `SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND phase = 'routing' AND outcome = 'routed_to_r9' AND superseded_at IS NULL`,
          [claimCaseId],
        );
        expect(routing.rows[0].n).toBe(0); // the live routed_to_r9 row was superseded exactly once
        const outcomeRow = await admin.query(
          `SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND phase = 'r9_outcome'`,
          [claimCaseId],
        );
        expect(outcomeRow.rows[0].n).toBe(1); // exactly one r9_outcome-phase decision row, never two
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );

  it(
    '(2) concurrent votes by different panelists both land (the lock serializes the inserts)',
    async () => {
      const claimCaseId = await seedRoutedClaim();
      await onOwnTx((c) => openR9VotingSession(c, openInput(claimCaseId)));
      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[0]!, 'approve'))),
        onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[1]!, 'deny'))),
      ]);
      expect(a.status).toBe('fulfilled');
      expect(b.status).toBe('fulfilled');
      const admin = await pool.connect();
      try {
        const n = await admin.query(`SELECT count(*)::int AS n FROM claim_r9_votes WHERE claim_case_id = $1 AND superseded_at IS NULL`, [claimCaseId]);
        expect(n.rows[0].n).toBe(2);
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );

  it(
    '(3) open-racing-open → exactly one session; the loser errors',
    async () => {
      const claimCaseId = await seedRoutedClaim();
      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => openR9VotingSession(c, openInput(claimCaseId))),
        onOwnTx((c) => openR9VotingSession(c, openInput(claimCaseId))),
      ]);
      const ok = [a, b].filter((r) => r.status === 'fulfilled');
      const failed = [a, b].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      // The loser is a session-exists conflict (or a raw 23505 that the writer maps to it).
      expect(failed[0]!.reason).toBeInstanceOf(R9SessionExistsError);
    },
    TIMEOUT,
  );

  it(
    '(4) forced rollback — a failing decision-row insert on finalize rolls back the WHOLE tx (no orphan event)',
    async () => {
      const claimCaseId = await seedRoutedClaim();
      await onOwnTx((c) => openR9VotingSession(c, openInput(claimCaseId)));
      await onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[0]!, 'approve')));
      await onOwnTx((c) => castR9Vote(c, voteInput(claimCaseId, PANEL[1]!, 'approve')));

      // Force the r9_outcome claim_state_trustee_decisions INSERT to fail mid-finalize.
      const client = await pool.connect();
      let threw = false;
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR);
        const realQuery = client.query.bind(client);
        (client as unknown as { query: typeof client.query }).query = ((text: unknown, params?: unknown): unknown => {
          const sqlText = typeof text === 'string' ? text : (text as { text?: string }).text ?? '';
          if (sqlText.includes('insert into "claim_state_trustee_decisions"') || sqlText.includes('claim_state_trustee_decisions"')) {
            if (sqlText.toLowerCase().includes('insert')) return Promise.reject(new Error('forced failure: r9_outcome decision insert'));
          }
          return (realQuery as (t: unknown, p?: unknown) => unknown)(text, params);
        }) as typeof client.query;
        await finalizeR9Outcome(client, finalizeInput(claimCaseId));
        await client.query('COMMIT');
      } catch {
        threw = true;
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        client.release();
      }
      expect(threw).toBe(true);

      // Prove the WHOLE tx rolled back: no claim.r9_outcome event, session outcome still null, routing still live.
      const admin = await pool.connect();
      try {
        const ev = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.r9_outcome'`, [claimCaseId]);
        expect(ev.rows[0].n).toBe(0);
        const s = await admin.query(`SELECT outcome FROM claim_r9_voting_sessions WHERE claim_case_id = $1 AND superseded_at IS NULL`, [claimCaseId]);
        expect(s.rows[0].outcome).toBeNull();
        const r = await admin.query(
          `SELECT count(*)::int AS n FROM claim_state_trustee_decisions WHERE claim_case_id = $1 AND phase = 'routing' AND superseded_at IS NULL`,
          [claimCaseId],
        );
        expect(r.rows[0].n).toBe(1);
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );
});
