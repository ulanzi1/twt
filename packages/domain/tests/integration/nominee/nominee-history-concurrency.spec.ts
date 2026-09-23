// The nominee declaration history — TWO-CONNECTION concurrency (own-committing). Story 6.20 (Task 9;
// D1, D3, D4; AC11).
//
// ⭐ A real race needs real concurrent COMMITs on SEPARATE pool clients (the `*-concurrency.spec.ts`
// family, `nominee-bank-concurrency.spec.ts` the exemplar): each writer runs BEGIN → SET LOCAL ROLE
// twt_app → scope → work → COMMIT, raced or deliberately interleaved, asserting on ITS OWN ids and
// cleaning up by those ids.
//   · D1 — `(member_id, rank, version_no)` is UNIQUE: two committed writers of the same version, one wins.
//   · ⭐ D3 — THE LOCK RACE. The nominee edit and a claim intake take the SAME advisory lock
//     (`intakeAdvisoryLockKey`). Interleaved both ways: an intake holding the lock makes the edit WAIT and
//     then REFUSE (it sees the claim); an edit holding the lock makes the intake WAIT, and the edit lands
//     legitimately "before the claim".
//   · D4 — two District Admins determining the same claim at once: exactly ONE determination is live.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  NomineeDeclarationLockedError,
  NomineeDeterminationRefusedError,
  lockNomineeDeclarationForEdit,
  projectClaimState,
  recordNomineeDetermination,
  tryConverge,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { seedNomineeDeclaration } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID()); // ⭐ a fresh tenant — committed rows never pollute PARIWAR_A
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.20 — nominee history two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const members: string[] = [];
  const claims: string[] = [];

  async function begin(): Promise<pg.PoolClient> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
    return client;
  }
  async function end(client: pg.PoolClient, commit: boolean): Promise<void> {
    try {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } finally {
      client.release();
    }
  }
  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await begin();
    try {
      const out = await fn(client);
      await end(client, true);
      return out;
    } catch (err) {
      await end(client, false).catch(() => undefined);
      throw err;
    }
  }

  async function seedMember(): Promise<MemberId> {
    const mid = toMemberId(randomUUID());
    members.push(mid);
    await onOwnTx((c) => seedNomineeDeclaration(bindScopedDb(c), PARIWAR, mid));
    return mid;
  }

  /** Is `p` still pending after `ms`? (Proves a writer is BLOCKED on the lock, ⛔ not merely slow.) */
  async function stillPending(p: Promise<unknown>, ms: number): Promise<boolean> {
    const marker = Symbol('pending');
    return (await Promise.race([p.then(() => 'done', () => 'done'), new Promise((r) => setTimeout(() => r(marker), ms))])) === marker;
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[nominee-history-concurrency.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // Replica mode disables triggers — including the append-only one — for fixture cleanup ONLY.
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM nominee_determination_items WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM nominee_determinations WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM member_nominee_versions WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM member_nominees WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM intake_attempts WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM claims WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM events_log WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('DELETE FROM members WHERE pariwar_id = $1', [PARIWAR]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      console.error('[nominee-history-concurrency.spec] cleanup:', (e as Error).message);
    } finally {
      c.release();
    }
    await pool.end();
  });

  it('⭐ D1 — two committed writers of the SAME (member, rank, version_no): exactly one wins, the other 23505', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const write = () =>
      onOwnTx((c) =>
        c.query(
          `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source,
             name_ciphertext, relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
           VALUES ($1, $2, 1, 2, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100, now(), now())`,
          [mid, PARIWAR],
        ),
      );
    const results = await Promise.allSettled([write(), write()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((rejected.reason as { code?: string }).code).toBe('23505');
  });

  it('⭐⭐ D3 — an INTAKE holding the lock makes the edit WAIT, then REFUSE (it sees the committed claim)', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const intake = await begin();
    const res = await tryConverge(intake, {
      pariwarId: PARIWAR,
      deceasedMemberId: mid,
      intakeChannel: 'member_app',
      actor: 'member',
      claimantActorId: null,
      trigger: 'race_intake',
      actorId: null,
      auditId: 'race-1',
    });
    claims.push(res.claimCaseId);

    const edit = onOwnTx((c) => lockNomineeDeclarationForEdit(c, PARIWAR, mid));
    expect(await stillPending(edit, 400), 'the edit did not wait for the intake\'s lock').toBe(true);
    await end(intake, true);
    await expect(edit).rejects.toBeInstanceOf(NomineeDeclarationLockedError);
  });

  it('⭐⭐ D3 — an EDIT holding the lock makes the intake WAIT; the edit lands legitimately BEFORE the claim', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const edit = await begin();
    await lockNomineeDeclarationForEdit(edit, PARIWAR, mid);
    await seedNomineeDeclaration(bindScopedDb(edit), PARIWAR, mid, { declaredAt: new Date(), ensureMember: false });

    const intake = onOwnTx((c) =>
      tryConverge(c, {
        pariwarId: PARIWAR,
        deceasedMemberId: mid,
        intakeChannel: 'member_app',
        actor: 'member',
        claimantActorId: null,
        trigger: 'race_intake',
        actorId: null,
        auditId: 'race-2',
      }),
    );
    expect(await stillPending(intake, 400), 'the intake did not wait for the edit\'s lock').toBe(true);
    await end(edit, true);
    const res = await intake;
    claims.push(res.claimCaseId);

    // Both committed; the edit's version exists, and a FURTHER edit is now refused.
    const versions = await onOwnTx((c) => listNomineeDeclarationVersions(bindScopedDb(c), PARIWAR, mid));
    expect(versions.filter((v) => v.rank === 1)).toHaveLength(2);
    await expect(onOwnTx((c) => lockNomineeDeclarationForEdit(c, PARIWAR, mid))).rejects.toBeInstanceOf(
      NomineeDeclarationLockedError,
    );
  });

  it('⭐ D4 — two District Admins determining the same claim at once: exactly ONE is live, the other is a typed 409', { timeout: TIMEOUT }, async () => {
    const mid = await seedMember();
    const cid: ClaimId = toClaimId(randomUUID());
    claims.push(cid);
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    const versions = await onOwnTx((c) => listNomineeDeclarationVersions(bindScopedDb(c), PARIWAR, mid));
    const determine = () =>
      onOwnTx((c) =>
        recordNomineeDetermination(c, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          certificateDate: '2099-01-01',
          certificateDateCiphertext: 'enc:v1:d',
          noteCiphertext: 'enc:v1:n',
          marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
          watermark: { rank1: 1, rank2: null },
          expectedLiveDeterminationId: null,
          actorId: randomUUID(),
          actorDisplay: 'Anita',
          actor: 'operator',
        }),
      );
    const results = await Promise.allSettled([determine(), determine()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason;
    expect(loser).toBeInstanceOf(NomineeDeterminationRefusedError);
    expect((loser as NomineeDeterminationRefusedError).reason).toBe('stale_supersession');
    const live = await pool.query(
      'SELECT count(*)::int AS n FROM nominee_determinations WHERE claim_case_id = $1 AND superseded_at IS NULL',
      [cid],
    );
    expect(live.rows[0].n).toBe(1);
  });
});
