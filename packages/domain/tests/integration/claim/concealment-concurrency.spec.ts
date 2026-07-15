// Concealment-assessment CONCURRENCY + forced-rollback + clause-resolution failure classification — Story
// 6.15 code-review follow-up (D-E, P7, and the "real conflict translation" ask).
//
// Proves what a single-connection spec (concealment.spec.ts) can't:
//   (1) FORCED ROLLBACK (D-E) — forcing the `claim.concealment_assessed` events_log insert to fail proves
//       the WHOLE tx rolls back: no orphan assessment row, no orphan event (they're atomic together).
//   (2) A REAL concurrent-conflict race THROUGH `recordConcealmentAssessment`'s own conflict-detection path
//       — a competing raw supersede (a SEPARATE connection, bypassing the advisory lock on purpose, the
//       only way this specific 0-row-conditional-UPDATE branch is reachable) lands BETWEEN the function's
//       own live-assessment read and its own conditional UPDATE, so the typed
//       `ConcealmentAssessmentRevisionConflictError` is thrown by the ACTUAL application code, not inferred
//       from a bypassed raw-insert unique-violation.
//   (3) CLAUSE-RESOLUTION FAILURE CLASSIFICATION (the P7 fix) — an unexpected/transient failure resolving
//       the R14 clause PROPAGATES out of `assessClaimConcealment` rather than silently collapsing to the
//       same `not_evaluated` a genuinely unprovisioned registry produces.
//
// ⚠ Own-committing (NOT setupLiveDb): these races need REAL concurrent commits on SEPARATE pool clients.
// Cleanup is by the specific ids this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  ConcealmentAssessmentRevisionConflictError,
  recordConcealmentAssessment,
} from '../../../src/claim/concealment-assessment-persist.js';
import { assessClaimConcealment } from '../../../src/claim/concealment-review.js';
import { projectClaimState } from '../../../src/claim/project.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId('c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9');
const ACTOR = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
const RACER_ACTOR = 'b4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4';
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.15 concealment — two-connection concurrency + forced rollback (own-committing)', () => {
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

  /** Drive a fresh claim to `verification_in_progress` (a D2-permitted concealment-assessment window),
   *  own-committing so the identity-event replay has real history to fold over. */
  async function seedActiveClaim(): Promise<ClaimId> {
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
    });
    return claimCaseId;
  }

  /** Bypass the advisory lock ON PURPOSE — a raw competing supersede from a SEPARATE connection, own tx,
   *  committed immediately. The only way to land inside the 0-row conditional-UPDATE window the app code
   *  defends against (the lock makes this unreachable via two ordinary `recordConcealmentAssessment` calls). */
  async function raceSupersede(claimCaseId: ClaimId): Promise<void> {
    const racer = await pool.connect();
    try {
      await racer.query('BEGIN');
      await racer.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(racer, PARIWAR);
      await racer.query(
        `UPDATE claim_concealment_assessments SET superseded_at = now() WHERE claim_case_id = $1 AND superseded_at IS NULL`,
        [claimCaseId],
      );
      await racer.query('COMMIT');
    } catch (err) {
      await racer.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      racer.release();
    }
  }

  beforeAll(async () => {
    if (!hasDatabase) return;
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      for (const uid of [ACTOR, RACER_ACTOR]) {
        await admin.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active') ON CONFLICT DO NOTHING`, [uid]);
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
      await admin.query('DELETE FROM users WHERE id = ANY($1)', [[ACTOR, RACER_ACTOR]]).catch(() => undefined);
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[concealment-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it(
    'D-E forced rollback — a failing events_log insert rolls back the WHOLE tx (no orphan assessment row, no orphan event)',
    async () => {
      const claimCaseId = await seedActiveClaim();

      const client = await pool.connect();
      const realQuery = client.query.bind(client);
      let threw = false;
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR);
        (client as unknown as { query: typeof client.query }).query = ((text: unknown, params?: unknown): unknown => {
          const sqlText = typeof text === 'string' ? text : (text as { text?: string }).text ?? '';
          if (sqlText.includes('insert into "events_log"')) {
            return Promise.reject(new Error('forced failure: claim.concealment_assessed event insert'));
          }
          return (realQuery as (t: unknown, p?: unknown) => unknown)(text, params);
        }) as typeof client.query;
        await recordConcealmentAssessment(client, {
          claimCaseId,
          pariwarId: PARIWAR,
          kind: 'linked',
          noteCiphertext: null,
          actorId: ACTOR,
          actorDisplay: 'Verifier One',
          actor: 'operator',
        });
        await client.query('COMMIT');
      } catch {
        threw = true;
        (client as unknown as { query: typeof client.query }).query = realQuery;
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        // ALWAYS restore the real query fn before releasing — a monkey-patched client leaks back into the
        // POOL otherwise and corrupts whatever the NEXT `pool.connect()` happens to reuse.
        (client as unknown as { query: typeof client.query }).query = realQuery;
        client.release();
      }
      expect(threw).toBe(true);

      const admin = await pool.connect();
      try {
        const row = await admin.query(
          `SELECT count(*)::int AS n FROM claim_concealment_assessments WHERE claim_case_id = $1`,
          [claimCaseId],
        );
        expect(row.rows[0].n).toBe(0);
        const ev = await admin.query(
          `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.concealment_assessed'`,
          [claimCaseId],
        );
        expect(ev.rows[0].n).toBe(0);
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );

  it(
    'a REAL concurrent revise race lands inside the conditional-UPDATE window → recordConcealmentAssessment ITSELF throws ConcealmentAssessmentRevisionConflictError',
    async () => {
      const claimCaseId = await seedActiveClaim();
      // A first, committed assessment to revise against.
      await onOwnTx((client) =>
        recordConcealmentAssessment(client, {
          claimCaseId,
          pariwarId: PARIWAR,
          kind: 'linked',
          noteCiphertext: null,
          actorId: ACTOR,
          actorDisplay: 'Verifier One',
          actor: 'operator',
        }),
      );

      const client = await pool.connect();
      const realQuery = client.query.bind(client);
      let caught: unknown;
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR);
        let raced = false;
        (client as unknown as { query: typeof client.query }).query = (async (text: unknown, params?: unknown) => {
          const sqlText = (typeof text === 'string' ? text : (text as { text?: string }).text ?? '').trim().toLowerCase();
          const result = await (realQuery as (t: unknown, p?: unknown) => Promise<unknown>)(text, params);
          // The ONE getLiveConcealmentAssessment SELECT inside recordConcealmentAssessment's own call —
          // land the competing supersede AFTER it reads `live`, BEFORE its own conditional UPDATE runs.
          if (!raced && sqlText.startsWith('select') && sqlText.includes('claim_concealment_assessments') && sqlText.includes('is null')) {
            raced = true;
            await raceSupersede(claimCaseId);
          }
          return result;
        }) as typeof client.query;

        await recordConcealmentAssessment(client, {
          claimCaseId,
          pariwarId: PARIWAR,
          kind: 'not_linked',
          noteCiphertext: null,
          actorId: RACER_ACTOR,
          actorDisplay: 'Verifier Two',
          actor: 'operator',
        });
      } catch (err) {
        caught = err;
      } finally {
        // ALWAYS restore before ROLLBACK/release — a leaked monkey-patch corrupts the next pooled reuse.
        (client as unknown as { query: typeof client.query }).query = realQuery;
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      }
      expect(caught).toBeInstanceOf(ConcealmentAssessmentRevisionConflictError);
    },
    TIMEOUT,
  );

  it(
    'clause-resolution failure classification (P7) — a transient error resolving the R14 clause PROPAGATES, never silently collapses to not_evaluated',
    async () => {
      const claimCaseId = await seedActiveClaim();
      await onOwnTx((client) =>
        recordConcealmentAssessment(client, {
          claimCaseId,
          pariwarId: PARIWAR,
          kind: 'linked',
          noteCiphertext: null,
          actorId: ACTOR,
          actorDisplay: 'Verifier One',
          actor: 'operator',
        }),
      );

      const client = await pool.connect();
      const realQuery = client.query.bind(client);
      let caught: unknown;
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR);
        (client as unknown as { query: typeof client.query }).query = ((text: unknown, params?: unknown): unknown => {
          const sqlText = typeof text === 'string' ? text : (text as { text?: string }).text ?? '';
          if (sqlText.toLowerCase().includes('select') && sqlText.includes('clause_versions')) {
            return Promise.reject(new Error('forced failure: transient clause_versions read (connection reset)'));
          }
          return (realQuery as (t: unknown, p?: unknown) => unknown)(text, params);
        }) as typeof client.query;

        const db = bindScopedDb(client);
        await assessClaimConcealment(db, { pariwarId: PARIWAR, claimCaseId });
      } catch (err) {
        caught = err;
      } finally {
        // ALWAYS restore before ROLLBACK/release — a leaked monkey-patch corrupts the next pooled reuse.
        (client as unknown as { query: typeof client.query }).query = realQuery;
        await client.query('ROLLBACK').catch(() => undefined);
        client.release();
      }
      // PROPAGATES (not swallowed to `{ status: 'not_evaluated' }` — the pre-fix behavior). Drizzle wraps
      // the underlying driver error in its own "Failed query" error — the ORIGINAL forced failure survives
      // as `.cause`.
      expect(caught).toBeInstanceOf(Error);
      const cause = (caught as Error & { cause?: Error }).cause;
      expect(cause?.message ?? (caught as Error).message).toContain('forced failure');
    },
    TIMEOUT,
  );
});
