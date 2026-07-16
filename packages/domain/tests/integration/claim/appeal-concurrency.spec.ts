// Appeal CONCURRENCY + forced-rollback — true two-connection races (Story 6.16, Task 11; AC9). Mirrors the
// SCOPE of r9-voting-concurrency.spec.ts (the 6.14 pattern this story's Stage-2 panel is explicitly built
// from) — this file did not exist before the 6.16 code review, despite Task 11 claiming this coverage.
//
// Proves what a single-connection spec (appeal.spec.ts) can't: ACTUAL multi-connection race behaviour, all
// keyed on the (pariwarId, claimCaseId)-scoped `appeal:` advisory lock every appeal writer takes:
//   (1) TWO RACING FINALIZES — exactly one advances the lifecycle + emits claim.appeal_stage2_reviewed
//       (+ claim.reversed on a reverse); the loser serializes behind the lock, re-checks the outcome
//       short-circuit, and returns the recorded outcome (idempotentReplay) — never a double-advance/emit.
//   (2) CONCURRENT VOTES by different panelists — both land (the lock serializes the inserts).
//   (3) OPEN-RACING-OPEN — the partial-unique + lock → exactly one session; the loser errors.
//   (4) FORCED ROLLBACK (AC9) — forcing finalize's claim_appeal_decisions insert to fail proves the WHOLE tx
//       rolls back: no orphan claim.appeal_stage2_reviewed OR claim.reversed event (both or neither), the
//       session outcome stays null, the claim_appeals anchor stays at stage 2.
//
// NOT included: a genuine two-connection "concurrent vote-revision" race for castAppealVote. Unlike
// concealment-assessment-persist.ts (which has no advisory lock and so has a real race window), EVERY appeal
// writer — including castAppealVote — takes the per-claim `appeal:` advisory lock FIRST, which fully
// serializes concurrent calls on the same claim: a second castAppealVote call blocks until the first commits,
// then reads the FRESH (already-revised) row, so its own conditional supersede always targets a live row —
// `AppealPanelVoteRevisionConflictError` cannot be reached through two genuinely concurrent calls. This
// mirrors the 6.14 R9 precedent exactly: `castR9Vote` has the identical advisory-lock + conditional-update
// shape and `r9-voting-concurrency.spec.ts` does not attempt this race either (confirmed by inspection).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool clients.
// Cleanup is by the specific ids this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  AppealPanelSessionExistsError,
  castAppealVote,
  finalizeAppealOutcome,
  initiateAppeal,
  openAppealPanel,
  prepareAppealCiphertext,
  projectClaimState,
  reviewAppealStage1,
} from '../../../src/claim/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId('aa11aa11-aa11-aa11-aa11-aa11aa11aa11');
const CLAIMANT = 'bb22bb22-bb22-bb22-bb22-bb22bb22bb22';
const REVIEWER = 'cc33cc33-cc33-cc33-cc33-cc33cc33cc33';
const PANEL = ['dd44dd44-dd44-dd44-dd44-dd44dd44dd44', 'ee55ee55-ee55-ee55-ee55-ee55ee55ee55'];
const CIPHER = prepareAppealCiphertext('enc:v1:fake');
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Appeal — two-connection concurrency + forced rollback (own-committing)', () => {
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
    panelActorIds: PANEL,
    actorId: PANEL[0]!,
    actorDisplay: 'Panelist One',
    actor: 'trustee' as const,
  });
  const voteInput = (claimCaseId: ClaimId, voter: string, vote: 'reverse' | 'deny') => ({
    claimCaseId,
    pariwarId: PARIWAR,
    vote,
    rationaleCiphertext: CIPHER,
    actorId: voter,
    actorDisplay: `Panelist ${voter.slice(0, 4)}`,
    actor: 'trustee' as const,
  });
  const finalizeInput = (claimCaseId: ClaimId, dispositionCategory: 'new_evidence_presented' | null = null) => ({
    claimCaseId,
    pariwarId: PARIWAR,
    rationaleCiphertext: CIPHER,
    dispositionCategory,
    actorId: PANEL[0]!,
    actorDisplay: 'Panelist One',
    actor: 'trustee' as const,
  });

  /** Drive a fresh claim to `denied` → initiate → Stage-1 advance → `appeal_stage_2`, own-committing. */
  async function seedClaimAtStage2(): Promise<ClaimId> {
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
          claimantActorId: CLAIMANT,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
          actorId: CLAIMANT,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: deceased,
        intake_channel: 'member_app',
        claimant_actor_id: CLAIMANT,
      });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'denied', 'claim.verifier_denied');
    });
    await onOwnTx((client) => initiateAppeal(client, { claimCaseId, pariwarId: PARIWAR, initiatedByActor: CLAIMANT, initiatedOnBehalf: false, actor: 'member' }));
    await onOwnTx((client) =>
      reviewAppealStage1(client, {
        claimCaseId,
        pariwarId: PARIWAR,
        reviewerActorId: REVIEWER,
        reviewerDisplay: 'Reviewer',
        decision: 'advance',
        dispositionCategory: null,
        rationaleCiphertext: CIPHER,
        actor: 'operator',
      }),
    );
    return claimCaseId;
  }

  beforeAll(async () => {
    if (!hasDatabase) return;
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
    // Seed the panel grants ONCE (committed; cleaned in afterAll) — claim.appeal_vote via pariwar_admin.
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      for (const uid of [REVIEWER, ...PANEL]) {
        await admin.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active') ON CONFLICT DO NOTHING`, [uid]);
      }
      for (const uid of PANEL) {
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
      await admin.query('DELETE FROM users WHERE id = ANY($1)', [[REVIEWER, ...PANEL]]).catch(() => undefined);
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[appeal-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  it(
    '(1) two racing Stage-2 finalizes → exactly one advances + emits claim.appeal_stage2_reviewed + claim.reversed; the loser is an idempotent replay',
    async () => {
      const claimCaseId = await seedClaimAtStage2();
      await onOwnTx((c) => openAppealPanel(c, openInput(claimCaseId)));
      await onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[0]!, 'reverse')));
      await onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[1]!, 'reverse')));

      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => finalizeAppealOutcome(c, finalizeInput(claimCaseId, 'new_evidence_presented'))),
        onOwnTx((c) => finalizeAppealOutcome(c, finalizeInput(claimCaseId, 'new_evidence_presented'))),
      ]);
      const fulfilled = [a, b].filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof finalizeAppealOutcome>>> => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(2); // both succeed (one fresh, one idempotent replay)
      const fresh = fulfilled.filter((r) => r.value.idempotentReplay === false);
      const replay = fulfilled.filter((r) => r.value.idempotentReplay === true);
      expect(fresh).toHaveLength(1);
      expect(replay).toHaveLength(1);

      const admin = await pool.connect();
      try {
        // Exactly ONE reviewed event and ONE claim.reversed event (no double-emit under the real race).
        const reviewed = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.appeal_stage2_reviewed'`, [claimCaseId]);
        expect(reviewed.rows[0].n).toBe(1);
        const reversedEvt = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.reversed'`, [claimCaseId]);
        expect(reversedEvt.rows[0].n).toBe(1);
        const st = await admin.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId]);
        expect(st.rows[0].current_state).toBe('reversed');
        const decisionRows = await admin.query(
          `SELECT count(*)::int AS n FROM claim_appeal_decisions WHERE claim_case_id = $1 AND stage = '2'`,
          [claimCaseId],
        );
        expect(decisionRows.rows[0].n).toBe(1); // exactly one stage-2 decision row, never two
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );

  it(
    '(2) concurrent votes by different panelists both land (the lock serializes the inserts)',
    async () => {
      const claimCaseId = await seedClaimAtStage2();
      await onOwnTx((c) => openAppealPanel(c, openInput(claimCaseId)));
      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[0]!, 'reverse'))),
        onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[1]!, 'deny'))),
      ]);
      expect(a.status).toBe('fulfilled');
      expect(b.status).toBe('fulfilled');
      const admin = await pool.connect();
      try {
        const n = await admin.query(`SELECT count(*)::int AS n FROM claim_appeal_panel_votes WHERE claim_case_id = $1 AND superseded_at IS NULL`, [claimCaseId]);
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
      const claimCaseId = await seedClaimAtStage2();
      const [a, b] = await Promise.allSettled([
        onOwnTx((c) => openAppealPanel(c, openInput(claimCaseId))),
        onOwnTx((c) => openAppealPanel(c, openInput(claimCaseId))),
      ]);
      const ok = [a, b].filter((r) => r.status === 'fulfilled');
      const failed = [a, b].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.reason).toBeInstanceOf(AppealPanelSessionExistsError);
    },
    TIMEOUT,
  );

  it(
    '(4) forced rollback (AC9) — a failing claim_appeal_decisions insert on a REVERSING finalize rolls back the WHOLE tx: no orphan claim.appeal_stage2_reviewed OR claim.reversed event (both or neither)',
    async () => {
      const claimCaseId = await seedClaimAtStage2();
      await onOwnTx((c) => openAppealPanel(c, openInput(claimCaseId)));
      await onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[0]!, 'reverse')));
      await onOwnTx((c) => castAppealVote(c, voteInput(claimCaseId, PANEL[1]!, 'reverse')));

      // Force the claim_appeal_decisions INSERT (the LAST write in finalizeAppealOutcome, after the session
      // outcome UPDATE + the reviewed/reversed events) to fail.
      const client = await pool.connect();
      let threw = false;
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR);
        const realQuery = client.query.bind(client);
        (client as unknown as { query: typeof client.query }).query = ((text: unknown, params?: unknown): unknown => {
          const sqlText = (typeof text === 'string' ? text : (text as { text?: string }).text ?? '').toLowerCase();
          if (sqlText.includes('insert into "claim_appeal_decisions"')) {
            return Promise.reject(new Error('forced failure: stage-2 decision insert'));
          }
          return (realQuery as (t: unknown, p?: unknown) => unknown)(text, params);
        }) as typeof client.query;
        await finalizeAppealOutcome(client, finalizeInput(claimCaseId, 'new_evidence_presented'));
        await client.query('COMMIT');
      } catch {
        threw = true;
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        client.release();
      }
      expect(threw).toBe(true);

      const admin = await pool.connect();
      try {
        const reviewed = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.appeal_stage2_reviewed'`, [claimCaseId]);
        expect(reviewed.rows[0].n).toBe(0); // no orphan reviewed event
        const reversedEvt = await admin.query(`SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.reversed'`, [claimCaseId]);
        expect(reversedEvt.rows[0].n).toBe(0); // no orphan publish-hook event either — both or neither
        const s = await admin.query(`SELECT outcome FROM claim_appeal_panel_sessions WHERE claim_case_id = $1 AND superseded_at IS NULL`, [claimCaseId]);
        expect(s.rows[0].outcome).toBeNull(); // the session-outcome write rolled back too
        const anchor = await admin.query(`SELECT current_stage, status FROM claim_appeals WHERE claim_case_id = $1`, [claimCaseId]);
        expect(anchor.rows[0].current_stage).toBe('2'); // the anchor never advanced to stage 3 / reversed
        expect(anchor.rows[0].status).toBe('open');
        const st = await admin.query(`SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId]);
        expect(st.rows[0].current_state).toBe('appeal_stage_2'); // the claim's live state never moved
      } finally {
        admin.release();
      }
    },
    TIMEOUT,
  );
});
