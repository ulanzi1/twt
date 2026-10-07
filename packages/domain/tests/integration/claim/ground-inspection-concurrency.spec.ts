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
  GroundInspectionCertificateChangedError,
  GroundInspectionClaimNotInVerificationError,
  GroundInspectionNotActiveError,
  GroundInspectionPhotoLimitError,
  MAX_GROUND_INSPECTION_PHOTOS,
  addGroundInspectionPhoto,
  completeGroundInspection,
  projectClaimState,
  recordGroundInspectionRefusal,
  rescheduleGroundInspection,
  scheduleGroundInspection,
} from '../../../src/claim/index.js';
import { currentUploadIdOf, seedDeathCertificate } from '../_helpers.js';

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

  /** Story 6.26a — a completion's FQ11 record + the family's date (a fixed past day), against `uploadId`. */
  const completeInput = (groundInspectionId: string, uploadId: string) => ({
    pariwarId: PARIWAR_A,
    groundInspectionId: groundInspectionId as never,
    actingActorId: INSPECTOR,
    originalCertificateVerdict: 'matches' as const,
    comparedCertificateUploadId: uploadId,
    deathDate: {
      plaintext: '2026-06-01',
      ciphertext: 'enc:v1:death-date',
      index: 'fixture-death-date-index:2026-06-01',
      source: 'family_statement' as const,
    },
  });

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
      // ⚠ AMENDED by Story 6.26a (GI4 / GI5): a completion now also needs the original-certificate record against
      // the claim's CURRENT certificate and the family's date — without them the completion leg failed on its own
      // validation and the test passed only when the refusal happened to win the lock.
      const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
      const key = `complete-vs-refuse:${randomUUID()}`;
      const gid = (await onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, key)))).groundInspection.groundInspectionId;
      // Completion requires ≥1 photo — and ≥1 of the original certificate (6.26a GI4).
      await onOwnTx((c) =>
        addGroundInspectionPhoto(c, {
          pariwarId: PARIWAR_A,
          groundInspectionId: gid,
          actingActorId: INSPECTOR,
          storageObjectKey: `k-${randomUUID()}`,
          contentType: 'image/jpeg',
          byteSize: 100,
          photoKind: 'original_certificate',
          comparedCertificateUploadId: uploadId,
        }),
      );

      const [complete, refuse] = await Promise.allSettled([
        onOwnTx((c) => completeGroundInspection(c, completeInput(gid, uploadId))),
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

  it(
    '⭐ `-286` H2 (checklist family 2) — two concurrent original\'s photos for the RESERVED slot at the cap → exactly ONE admitted (MAX + 1), the other refused at the limit',
    async () => {
      const cid = await seedClaimInVerification();
      const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
      const key = `reserved-slot:${randomUUID()}`;
      const gid = (await onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, key)))).groundInspection.groundInspectionId;
      // Fill the cap with SITE photos — the reserved slot is all that is left for the original's photo.
      for (let i = 0; i < MAX_GROUND_INSPECTION_PHOTOS; i += 1) {
        await onOwnTx((c) =>
          addGroundInspectionPhoto(c, {
            pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
            storageObjectKey: `k-${i}-${randomUUID()}`, contentType: 'image/png', byteSize: 10,
          }),
        );
      }
      const contend = () =>
        onOwnTx((c) =>
          addGroundInspectionPhoto(c, {
            pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
            storageObjectKey: `k-orig-${randomUUID()}`, contentType: 'image/png', byteSize: 10,
            photoKind: 'original_certificate', comparedCertificateUploadId: uploadId,
          }),
        );
      // ⚠ A BARRIER (narrow review 2026-10-07 — without it the two transactions never overlapped, and the test stayed
      // green with the assignment lock REMOVED): a third connection holds the photo table so that BOTH contenders are
      // provably blocked before either can count. With the lock, the second waits on the assignment row and counts
      // AFTER the first commits; without it, both count 20 and both insert — the red this test exists to show.
      const barrier = await pool.connect();
      let outcomes: PromiseSettledResult<unknown>[];
      try {
        await barrier.query('BEGIN');
        await barrier.query('LOCK TABLE claim_ground_inspection_photos IN ACCESS EXCLUSIVE MODE');
        const racing = Promise.allSettled([contend(), contend()]);
        for (let i = 0; ; i += 1) {
          const r = await pool.query<{ n: string }>(
            `SELECT count(*)::text AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%claim_ground_inspection%'`,
          );
          if (Number(r.rows[0]!.n) >= 2) break;
          if (i >= 250) throw new Error('the two contenders never both blocked behind the barrier');
          await new Promise((res) => setTimeout(res, 20));
        }
        await barrier.query('COMMIT');
        outcomes = await racing;
      } finally {
        barrier.release();
      }
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = outcomes.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toBeInstanceOf(GroundInspectionPhotoLimitError);
      // The reservation is ONE photo of the compared certificate's original — never two.
      expect(
        await countRows(
          `SELECT count(*)::text AS n FROM claim_ground_inspection_photos WHERE ground_inspection_id = $1 AND photo_kind = 'original_certificate' AND certificate_upload_id = $2`,
          [gid, uploadId],
        ),
      ).toBe(1);
      expect(await countRows('SELECT count(*)::text AS n FROM claim_ground_inspection_photos WHERE ground_inspection_id = $1', [gid])).toBe(
        MAX_GROUND_INSPECTION_PHOTOS + 1,
      );
    },
    TIMEOUT,
  );

  // ── Story 6.26a (Task 2.1 / 2.3; Trap 1) — the lock order assignment → claim, and the window on the LOCKED row ──

  /** Schedule + photograph the original on `cid` (committed); returns the assignment id. */
  async function openAssignment(cid: ClaimId, keyPrefix: string): Promise<string> {
    const key = `${keyPrefix}:${randomUUID()}`;
    const gid = (await onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, key)))).groundInspection.groundInspectionId;
    await onOwnTx(async (c) =>
      addGroundInspectionPhoto(c, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
        storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
        comparedCertificateUploadId: await currentUploadIdOf(c, PARIWAR_A, cid),
      }),
    );
    return gid;
  }

  /** Open a tx on its own connection that takes the claim row `FOR UPDATE`, runs `during`, and holds the lock until
   *  `commit()` is called. Resolves once the lock is HELD. */
  async function holdClaimLock(cid: ClaimId, during: (c: pg.PoolClient) => Promise<void>) {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR_A);
    await client.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE', [cid]);
    await during(client);
    return {
      async commit() {
        try {
          await client.query('COMMIT');
        } finally {
          client.release();
        }
      },
    };
  }

  /** Is `pid`'s backend currently blocked on a lock? (Proves the second tx really WAITED, not merely ran after.) */
  async function waitUntilBlocked(): Promise<void> {
    for (let i = 0; i < 50; i += 1) {
      const r = await pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%claims%'`,
      );
      if (Number(r.rows[0]!.n) > 0) return;
      await new Promise((res) => setTimeout(res, 20));
    }
    throw new Error('the completion never blocked on the claim-row lock');
  }

  it(
    '⭐ complete vs RESCHEDULE of the same assignment → exactly one wins, the other NotActive — ⛔ never a 40P01 deadlock',
    async () => {
      for (let round = 0; round < 3; round += 1) {
        const cid = await seedClaimInVerification();
        const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
        const gid = await openAssignment(cid, 'complete-vs-reschedule');
        const rescheduleKey = `reschedule:${randomUUID()}`;
        createdKeys.push(`ground_inspection:reschedule:${PARIWAR_A}:${gid}:${rescheduleKey}`);
        const outcomes = await Promise.allSettled([
          onOwnTx((c) => completeGroundInspection(c, completeInput(gid, uploadId))),
          onOwnTx((c) => rescheduleGroundInspection(c, { ...scheduleInput(cid, rescheduleKey), groundInspectionId: gid as never })),
        ]);
        const rejected = outcomes.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
        expect(rejected.map((e) => (e as { code?: string }).code)).not.toContain('40P01');
        expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0]).toBeInstanceOf(GroundInspectionNotActiveError);
      }
    },
    TIMEOUT,
  );

  it(
    '⭐ complete vs a certificate made CURRENT under the claim lock (the OCR job\'s posture) → the completion waits, then refuses `certificate_changed`',
    async () => {
      const cid = await seedClaimInVerification();
      const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
      const gid = await openAssignment(cid, 'complete-vs-upload');
      // The OCR job makes a new upload current while holding the claim row (claim-ocr-parity.ts) — simulated here.
      const holder = await holdClaimLock(cid, async (c) => {
        await seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid });
      });
      const completion = onOwnTx((c) => completeGroundInspection(c, completeInput(gid, uploadId)));
      await waitUntilBlocked();
      await holder.commit();
      await expect(completion).rejects.toBeInstanceOf(GroundInspectionCertificateChangedError);
    },
    TIMEOUT,
  );

  it(
    '⭐ complete vs the R9 routing row SUPERSEDED under the claim lock (what R9 finalize does) → the completion waits, then refuses `not_allowed` — the window is read on the LOCKED row',
    async () => {
      const cid = await seedClaimInVerification();
      const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
      const gid = await openAssignment(cid, 'complete-vs-r9');
      // Drive the claim to `state_trustee_approved`, R9-routed (a window state under `-283` A1).
      await onOwnTx(async (c) => {
        const emit = (from: string, to: string, eventType: string) =>
          projectClaimState(c, {
            claimCaseId: cid, pariwarId: PARIWAR_A, deceasedMemberId: toMemberId(randomUUID()), intakeChannels: ['member_app'],
            claimantActorId: null, eventType: eventType as never,
            payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system' } as never, actorId: null,
          });
        await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
        await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
        await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
        await emit('state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
        await c.query(
          `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
           VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Pariwar Admin')`,
          [cid, PARIWAR_A, ADMIN],
        );
      });
      const holder = await holdClaimLock(cid, async (c) => {
        await c.query(`UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE claim_case_id = $1 AND phase = 'routing'`, [cid]);
      });
      const completion = onOwnTx((c) => completeGroundInspection(c, completeInput(gid, uploadId)));
      await waitUntilBlocked();
      await holder.commit();
      await expect(completion).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.ground_inspection_completed'",
          [cid],
        ),
      ).toBe(0);
    },
    TIMEOUT,
  );

  it(
    '⭐ complete vs SCHEDULE of another assignment on the same claim → both succeed (⛔ no lock cycle)',
    async () => {
      const cid = await seedClaimInVerification();
      const { uploadId } = await onOwnTx((c) => seedDeathCertificate(c, { pariwarId: PARIWAR_A, claimCaseId: cid }));
      const gid = await openAssignment(cid, 'complete-vs-schedule');
      const outcomes = await Promise.allSettled([
        onOwnTx((c) => completeGroundInspection(c, completeInput(gid, uploadId))),
        onOwnTx((c) => scheduleGroundInspection(c, scheduleInput(cid, `second:${randomUUID()}`))),
      ]);
      expect(outcomes.map((o) => o.status)).toEqual(['fulfilled', 'fulfilled']);
    },
    TIMEOUT,
  );
});