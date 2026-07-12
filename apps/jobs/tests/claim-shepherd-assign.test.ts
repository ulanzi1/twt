// Human shepherd assignment worker — live-DB integration (Story 6.12, Task 4; Review Finding).
//
// Drives runClaimShepherdAssign against real Postgres (:5433). This suite exists because the review
// found the worker had ZERO test coverage despite the story claiming full Task 8 verification:
//   · AUTO path: assigns the sole eligible district_admin; fires the notify hook with reason 'initial';
//     NO audit line (AC5's audit-logged surface is reassignment/fallback, not the plain initial assign).
//   · idempotency (AC9): a redelivered trigger for an already-shepherded claim is a no-op — no second
//     event/row, notify hook NOT re-fired.
//   · AR-61 fallback (AC4): an empty/ineligible in-scope pool routes to the injected
//     ShepherdFallbackResolver; the resulting reassignment IS audit-logged (Review Finding — the fix that
//     wires `audit.writeAuditEntry` into this worker for the fallback path).
//   · unresolved (AC4): pool empty AND fallback resolver returns null → alarm + throw (pg-boss retries).

import { randomUUID } from 'node:crypto';

import { claim, createDb, ids, setPariwarScope, type CreatedDb } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  runClaimShepherdAssign,
  type ClaimShepherdAssignDeps,
  type ClaimShepherdAssignPayload,
} from '../src/claim-shepherd-assign.js';
import {
  createFixedShepherdFallbackResolver,
  type FallbackShepherd,
} from '../src/shepherd-fallback-resolver.js';
import type { ShepherdAssignedEvent } from '../src/shepherd-notification-hook.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const DISTRICT = 'Jaipur';

describe.skipIf(!hasDatabase)('claim shepherd assign worker — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;
  const createdClaims: string[] = [];
  const createdUsers: string[] = [];

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });

  afterAll(async () => {
    if (createdClaims.length > 0) {
      await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims]).catch(() => undefined);
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch {
        await c.query('ROLLBACK').catch(() => undefined);
      } finally {
        c.release();
      }
    }
    if (createdUsers.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUsers]).catch(() => undefined);
    }
    await pool.end();
  });

  function capturingNotify(): { notify: (e: ShepherdAssignedEvent) => void; calls: ShepherdAssignedEvent[] } {
    const calls: ShepherdAssignedEvent[] = [];
    return { notify: (e) => calls.push(e), calls };
  }

  function deps(overrides: Partial<ClaimShepherdAssignDeps> = {}): ClaimShepherdAssignDeps {
    return {
      pool,
      fallbackResolver: createFixedShepherdFallbackResolver(null),
      notify: () => undefined,
      onAlarm: () => undefined,
      ...overrides,
    };
  }

  function envelope(payload: ClaimShepherdAssignPayload, pariwarId: string): JobEnvelope<ClaimShepherdAssignPayload> {
    return { requestId: randomUUID(), pariwarId, actorId: null, traceId: randomUUID(), payload };
  }

  async function seedUser(opts: { displayName?: string | null; contactPhone?: string | null } = {}): Promise<string> {
    const id = randomUUID();
    createdUsers.push(id);
    await pool.query(
      `INSERT INTO users (id, identity_type, status, display_name, contact_phone)
       VALUES ($1, 'admin', 'active', $2, $3)`,
      [id, opts.displayName ?? null, opts.contactPhone ?? null],
    );
    return id;
  }

  async function grantDistrictAdmin(userId: string, pariwarId: string, district = DISTRICT): Promise<void> {
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
       VALUES ($1, $2, 'district_admin', 'district', $3)`,
      [userId, pariwarId, district],
    );
  }

  /** Seed a deceased member with a posting district + a fresh claim already at
   *  `verification_in_progress` (own-committing, direct SQL — the worker only needs to READ this state). */
  async function seedClaimInVerification(pariwarId: string, district: string | null = DISTRICT): Promise<{ claimCaseId: string; deceasedMemberId: string }> {
    const claimCaseId = randomUUID();
    const deceasedMemberId = randomUUID();
    createdClaims.push(claimCaseId);
    await pool.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
       VALUES ($1, $2, 'active', 0, now(), now())`,
      [deceasedMemberId, pariwarId],
    );
    if (district !== null) {
      await pool.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, false, now())`,
        [deceasedMemberId, pariwarId, district],
      );
    }
    // The claim row's `current_state` is a replay-derived cache — `projectClaimState` (called inside
    // `claim.assignShepherd`) recomputes it from `events_log` on every write, so seeding the row directly
    // via raw SQL (bypassing the real event chain) gets silently overwritten back to the reducer's
    // blank-slate default on the worker's own first write. Drive the REAL event chain instead (mirrors
    // the domain/api sibling suites).
    const claimId = ids.claimId(claimCaseId);
    const pid = ids.pariwarId(pariwarId);
    const mid = ids.memberId(deceasedMemberId);
    const c = await pool.connect();
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(c, {
        claimCaseId: claimId, pariwarId: pid, deceasedMemberId: mid, intakeChannels: ['member_app'], claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, pariwarId);
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: deceasedMemberId, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      c.release();
    }
    return { claimCaseId, deceasedMemberId };
  }

  async function liveShepherdRows(claimCaseId: string): Promise<Array<{ shepherd_actor_id: string; assignment_reason: string }>> {
    const res = await pool.query(
      'SELECT shepherd_actor_id, assignment_reason FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
      [claimCaseId],
    );
    return res.rows as Array<{ shepherd_actor_id: string; assignment_reason: string }>;
  }

  async function auditCount(action: string, pariwarId: string): Promise<number> {
    const res = await pool.query('SELECT count(*)::text AS n FROM audit_log_entries WHERE action = $1 AND pariwar_id = $2', [action, pariwarId]);
    return Number((res.rows[0] as { n: string }).n);
  }

  it('AUTO path: assigns the sole eligible district_admin; fires notify(reason=initial); no audit line', async () => {
    const pariwarId = randomUUID();
    const admin = await seedUser({ displayName: 'Anita', contactPhone: '+919000000001' });
    await grantDistrictAdmin(admin, pariwarId);
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId);
    const auditBefore = await auditCount('admin_claim.shepherd_reassigned', pariwarId);

    const { notify, calls } = capturingNotify();
    const result = await runClaimShepherdAssign(
      deps({ notify }),
      envelope({ claimCaseId, deceasedMemberId }, pariwarId),
    );

    expect(result.assigned).toBe(true);
    expect(result.assignmentReason).toBe('initial');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ shepherdActorId: admin, assignmentReason: 'initial' });

    const live = await liveShepherdRows(claimCaseId);
    expect(live).toHaveLength(1);
    expect(live[0]!.shepherd_actor_id).toBe(admin);
    expect(live[0]!.assignment_reason).toBe('initial');

    // AC5's audit-logged surface is reassignment/fallback — the plain initial auto-assign is NOT audited.
    expect(await auditCount('admin_claim.shepherd_reassigned', pariwarId)).toBe(auditBefore);
  });

  it('idempotency (AC9): a redelivered trigger for an already-shepherded claim is a no-op; notify NOT re-fired', async () => {
    const pariwarId = randomUUID();
    const admin = await seedUser({ displayName: 'Anita', contactPhone: '+919000000001' });
    await grantDistrictAdmin(admin, pariwarId);
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId);

    const first = capturingNotify();
    await runClaimShepherdAssign(deps({ notify: first.notify }), envelope({ claimCaseId, deceasedMemberId }, pariwarId));
    expect(first.calls).toHaveLength(1);

    const second = capturingNotify();
    const redelivered = await runClaimShepherdAssign(deps({ notify: second.notify }), envelope({ claimCaseId, deceasedMemberId }, pariwarId));
    expect(redelivered.assigned).toBe(false);
    expect(redelivered.assignmentReason).toBe('noop');
    expect(second.calls).toHaveLength(0);
    expect(await liveShepherdRows(claimCaseId)).toHaveLength(1);
  });

  it('AR-61 fallback (AC4): empty pool routes to the injected resolver; result is audit-logged (Review Finding)', async () => {
    const pariwarId = randomUUID();
    // No district_admin seeded in-scope at all → the auto path's pool is empty.
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId);
    const fallbackHandler: FallbackShepherd = {
      shepherdActorId: randomUUID(),
      display: 'Fallback Handler',
      contactPhone: '+919000009999',
      contactWhatsapp: null,
    };
    const auditBefore = await auditCount('admin_claim.shepherd_reassigned', pariwarId);
    const { notify, calls } = capturingNotify();

    const result = await runClaimShepherdAssign(
      deps({ notify, fallbackResolver: createFixedShepherdFallbackResolver(fallbackHandler) }),
      envelope({ claimCaseId, deceasedMemberId }, pariwarId),
    );

    expect(result.assigned).toBe(true);
    expect(result.assignmentReason).toBe('fallback');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ shepherdActorId: fallbackHandler.shepherdActorId, assignmentReason: 'fallback' });

    const live = await liveShepherdRows(claimCaseId);
    expect(live).toHaveLength(1);
    expect(live[0]!.shepherd_actor_id).toBe(fallbackHandler.shepherdActorId);
    expect(live[0]!.assignment_reason).toBe('fallback');

    // The fallback assignment DOES get a post-commit audit line (Review Finding fix).
    expect(await auditCount('admin_claim.shepherd_reassigned', pariwarId)).toBe(auditBefore + 1);
  });

  it('unresolved (AC4): empty pool AND fallback resolver returns null → alarm + throw (pg-boss retries)', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId);
    const alarms: string[] = [];

    await expect(
      runClaimShepherdAssign(
        deps({ fallbackResolver: createFixedShepherdFallbackResolver(null), onAlarm: (m) => alarms.push(m) }),
        envelope({ claimCaseId, deceasedMemberId }, pariwarId),
      ),
    ).rejects.toThrow();

    expect(alarms.some((m) => m.includes('no eligible shepherd AND no fallback'))).toBe(true);
    expect(await liveShepherdRows(claimCaseId)).toHaveLength(0);
  });

  it('unresolved district (D-C): a deceased with no posting district → alarm + throw, never a fabricated district', async () => {
    const pariwarId = randomUUID();
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId, null);
    const alarms: string[] = [];

    await expect(
      runClaimShepherdAssign(deps({ onAlarm: (m) => alarms.push(m) }), envelope({ claimCaseId, deceasedMemberId }, pariwarId)),
    ).rejects.toThrow();
    expect(alarms.some((m) => m.includes('no posting district'))).toBe(true);
  });

  it('missing pariwarId → alarm + throw (pg-boss retries)', async () => {
    const alarms: string[] = [];
    await expect(
      runClaimShepherdAssign(
        deps({ onAlarm: (m) => alarms.push(m) }),
        { requestId: randomUUID(), pariwarId: null, actorId: null, traceId: randomUUID(), payload: { claimCaseId: randomUUID(), deceasedMemberId: randomUUID() } },
      ),
    ).rejects.toThrow();
    expect(alarms.some((m) => m.includes('missing pariwarId'))).toBe(true);
  });

  it('a notify hook throwing is swallowed (best-effort) — the committed assignment is not undone', async () => {
    const pariwarId = randomUUID();
    const admin = await seedUser({ displayName: 'Anita', contactPhone: '+919000000001' });
    await grantDistrictAdmin(admin, pariwarId);
    const { claimCaseId, deceasedMemberId } = await seedClaimInVerification(pariwarId);
    const alarms: string[] = [];

    const result = await runClaimShepherdAssign(
      deps({
        notify: () => {
          throw new Error('notify boom');
        },
        onAlarm: (m) => alarms.push(m),
      }),
      envelope({ claimCaseId, deceasedMemberId }, pariwarId),
    );
    expect(result.assigned).toBe(true);
    expect(alarms.some((m) => m.includes('notify hook threw'))).toBe(true);
    expect(await liveShepherdRows(claimCaseId)).toHaveLength(1);
  });
});
