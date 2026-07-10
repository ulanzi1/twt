// Ground-inspection CONCURRENCY — true two-connection races (Story 6.7 review follow-up, 2026-07-10).
//
// The sequential ground-inspection.spec proves idempotency BEHAVIOUR and the PRESENCE of the
// unique-index + row-lock MECHANISMS on a single connection. These tests prove the third level the
// review flagged: ACTUAL two-connection race behaviour — that the `ON CONFLICT DO NOTHING` loser
// and the `SELECT … FOR UPDATE` row lock hold under genuinely concurrent, own-committing txs.
//
// Why the outcomes are deterministic (NOT flaky): a UNIQUE index admits exactly one key winner, and
// a `FOR UPDATE` lock serialises the contending verbs — so the INVARIANT (one winner / one event /
// never-exceeds-MAX) holds regardless of which connection wins the race or how threads interleave.
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients, so the single per-test BEGIN/ROLLBACK envelope cannot be used (it would serialise
// everything and roll it back). Mirrors idempotency/keyed-store.spec. Cleanup is by the specific
// claim ids + derived idempotency keys this suite creates: a `claims` delete cascades to
// inspections+photos; `events_log` is append-only, so its rows are removed under
// `SET LOCAL session_replication_role='replica'` (dev login). Assertions key on our OWN ids, never
// on absolute counts (the shared live DB accumulates rows across suites) — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  GroundInspectionNotActiveError,
  GroundInspectionPhotoLimitError,
  MAX_GROUND_INSPECTION_PHOTOS,
  addGroundInspectionPhoto,
  completeGroundInspection,
  projectClaimState,
  recordGroundInspectionRefusal,
  scheduleGroundInspection,
} from '../../../src/claim/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const INSPECTOR = '99999999-9999-9999-9999-999999999999';
const ADMIN = '88888888-8888-8888-8888-888888888888';
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('ground inspection — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];
  const createdKeys: string[] = [];

  const scheduleInput = (cid: ClaimId, key: string, over: Record<string, unknown> = {}) => {
    // The writer derives `ground_inspection:schedule:<pariwar>:<claim>:<clientKey>` — track it for cleanup.
    createdKeys.push(`ground_inspection:schedule:${PARIWAR_A}:${cid}:${key}`);
    return {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      district: 'Patna',
      inspectionStage: 'initial' as const,
      inspectionSiteType: 'family_residence' as const,
      inspectorActorId: INSPECTOR,
      scheduledAt: new Date('2026-07-10T12:00:00Z'),
      locationCiphertext: 'enc:v1:location',
      familyContactCiphertext: 'enc:v1:contact',
      notesCiphertext: null,
      scheduledByActor: ADMIN,
      idempotencyKey: key,
      ...over,
    };
  };

  /** Run `fn` on a dedicated pooled connection inside its OWN committed scope-tx (role+scope like the
   *  app's openScopeTx). COMMITs on success; ROLLBACKs + rethrows on error. */
  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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

  /** Seed a fresh claim to verification_in_progress, COMMITTED so concurrent connections can see it. */
  async function seedClaimInVerification(): Promise<ClaimId> {
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
    });
    return cid;
  }

  async function countRows(sql: string, params: unknown[]): Promise<number> {
    const r = await pool.query(sql, params);
    return Number((r.rows[0] as { n: string }).n);
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[gi-concurrency.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    // Best-effort cleanup (dev login bypasses RLS). `claims` delete cascades to inspections+photos;
    // `events_log` needs replica mode to bypass its append-only trigger.
    if (createdClaims.length > 0) {
      await pool
        .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
        .catch((e: Error) => console.error('[gi-concurrency.spec] claims cleanup:', e.message));
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[gi-concurrency.spec] events_log cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    if (createdKeys.length > 0) {
      await pool
        .query('DELETE FROM idempotency_keys WHERE key = ANY($1)', [createdKeys])
        .catch((e: Error) => console.error('[gi-concurrency.spec] keys cleanup:', e.message));
    }
    await pool.end();
  });

  it(
    'REQUESTED #1 — N concurrent schedules with the SAME Idempotency-Key → exactly one winner, one row, one event; every loser re-reads the winner',
    async () => {
      const cid = await seedClaimInVerification();
      const key = `concurrent-schedule:${randomUUID()}`;
      const N = 6;

      // Fire N identical schedules across N separate committed connections at once.
      const results = await Promise.allSettled(
        Array.from({ length: N }, () => onOwnTx((client) => scheduleGroundInspection(client, scheduleInput(cid, key)))),
      );

      // (g) Every attempt SUCCEEDS — the ON CONFLICT loser cleanly re-reads the winner, never errors.
      const fulfilled = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      expect(fulfilled).toHaveLength(N);

      // Exactly ONE creator; the rest are replays resolving to the SAME assignment (property (f)+(g)).
      const winners = fulfilled.filter((v) => v.created);
      expect(winners).toHaveLength(1);
      const winnerGid = winners[0]!.groundInspection.groundInspectionId;
      expect(fulfilled.filter((v) => !v.created)).toHaveLength(N - 1);
      expect(fulfilled.every((v) => v.groundInspection.groundInspectionId === winnerGid)).toBe(true);

      // The DB holds exactly one assignment and exactly one scheduled event — no duplicate, no double emit.
      expect(await countRows('SELECT count(*)::text AS n FROM claim_ground_inspections WHERE claim_case_id = $1', [cid])).toBe(1);
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.ground_inspection_scheduled'",
          [cid],
        ),
      ).toBe(1);
    },
    TIMEOUT,
  );

  it(
    'REQUESTED #2 — the app scope-tx runs at READ COMMITTED (the isolation the ON CONFLICT loser re-read depends on)',
    async () => {
      // openScopeTx issues a plain BEGIN with no `SET TRANSACTION ISOLATION`, so the loser's
      // getBoundAssignment SELECT gets a FRESH statement snapshot and always sees the winner's commit.
      // Under REPEATABLE READ / SERIALIZABLE that guarantee would break — pin it so it can't regress.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, PARIWAR_A);
        const r = await client.query('SHOW transaction_isolation');
        expect((r.rows[0] as { transaction_isolation: string }).transaction_isolation).toBe('read committed');
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    },
    TIMEOUT,
  );

  it(
    'BONUS — concurrent complete vs refusal on ONE assignment → exactly one terminal transition wins, the other gets NotActive; ≤1 completed event',
    async () => {
      const cid = await seedClaimInVerification();
      const key = `complete-vs-refuse:${randomUUID()}`;
      const gid = (await onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, key)))).groundInspection.groundInspectionId;
      // Completion requires ≥1 photo.
      await onOwnTx((c) =>
        addGroundInspectionPhoto(c, {
          pariwarId: PARIWAR_A,
          groundInspectionId: gid,
          actingActorId: INSPECTOR,
          storageObjectKey: `k-${randomUUID()}`,
          contentType: 'image/jpeg',
          byteSize: 100,
        }),
      );

      const [complete, refuse] = await Promise.allSettled([
        onOwnTx((c) => completeGroundInspection(c, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR })),
        onOwnTx((c) =>
          recordGroundInspectionRefusal(c, {
            pariwarId: PARIWAR_A,
            groundInspectionId: gid,
            actingActorId: INSPECTOR,
            disposition: 'photo_refused',
            refusalReason: 'family_refused_photography',
            notesCiphertext: 'enc:v1:note',
          }),
        ),
      ]);

      // The FOR UPDATE lock serialises them: exactly one commits the terminal transition, the other
      // acquires the lock afterwards, re-reads status ≠ 'scheduled', and throws NotActive.
      const outcomes = [complete, refuse];
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = outcomes.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toBeInstanceOf(GroundInspectionNotActiveError);

      // At most one completed event (0 if refusal won, 1 if completion won).
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.ground_inspection_completed'",
          [cid],
        ),
      ).toBeLessThanOrEqual(1);
      const statusRow = (await pool.query('SELECT status FROM claim_ground_inspections WHERE ground_inspection_id = $1', [gid])).rows[0] as
        | { status: string }
        | undefined;
      expect(['completed', 'photo_refused']).toContain(statusRow?.status);
    },
    TIMEOUT,
  );

  it(
    'BONUS — concurrent photo uploads at the MAX boundary → the parent row lock serialises count+insert; never exceeds MAX',
    async () => {
      const cid = await seedClaimInVerification();
      const key = `photo-slot:${randomUUID()}`;
      const gid = (await onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, key)))).groundInspection.groundInspectionId;

      // Fill to MAX-1 sequentially, leaving exactly one open slot.
      for (let i = 0; i < MAX_GROUND_INSPECTION_PHOTOS - 1; i += 1) {
        await onOwnTx((c) =>
          addGroundInspectionPhoto(c, {
            pariwarId: PARIWAR_A,
            groundInspectionId: gid,
            actingActorId: INSPECTOR,
            storageObjectKey: `k-${i}-${randomUUID()}`,
            contentType: 'image/png',
            byteSize: 10,
          }),
        );
      }

      // Two connections contend for the LAST slot at once.
      const contend = () =>
        onOwnTx((c) =>
          addGroundInspectionPhoto(c, {
            pariwarId: PARIWAR_A,
            groundInspectionId: gid,
            actingActorId: INSPECTOR,
            storageObjectKey: `k-race-${randomUUID()}`,
            contentType: 'image/png',
            byteSize: 10,
          }),
        );
      const [a, b] = await Promise.allSettled([contend(), contend()]);

      const outcomes = [a, b];
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1); // exactly one took the slot
      const rejected = outcomes.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toBeInstanceOf(GroundInspectionPhotoLimitError);
      // The count-under-lock held: exactly MAX photos, never MAX+1.
      expect(await countRows('SELECT count(*)::text AS n FROM claim_ground_inspection_photos WHERE ground_inspection_id = $1', [gid])).toBe(
        MAX_GROUND_INSPECTION_PHOTOS,
      );
    },
    TIMEOUT,
  );
});
