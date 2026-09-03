// Member self-verify screenshot-upload CORE — live-DB integration (Story 9.7, Tasks 3/4; AC3/AC4).
//
// Exercises the injectable TRANSPORT core (`uploadScreenshotTransport`) directly over a real scope tx + the
// in-memory SelfVerifyScreenshotStorage / no-op StatementScanner fakes — the MIME/byte-cap/emptiness gate,
// the virus-scan quarantine reject, the AR-45 storage-outage → dignified 503, the happy path (blob stored +
// `reconciliation.self-verify-screenshot-uploaded` event appended on the alert stream), and the LOAD-BEARING
// AC4 teeth: the upload path emits ONLY the evidence event — NEVER a `contribution.confirmed`, never a remap.
// Driving the core directly (not the full HTTP auth stack) keeps the test on the transport logic; the route
// wiring + the member-session authz are asserted by typecheck + the login-wall CI gate. Rolls back each tx.

import { randomUUID } from 'node:crypto';

import type { SelfVerifyScreenshotStorage, StatementScanner } from '@twt/contracts';
import { bindScopedDb, ids, member as memberDomain, pool as poolDomain, schema } from '@twt/domain';
import { loadEvents } from '@twt/events';
import { createRejectingStatementScanner } from '@twt/platform-adapters';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createSelfVerifyHandlers,
  type SelfVerifyUploadContext,
} from '../../../src/modules/self-verify/handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

/** A tiny valid PNG header (the bytes are opaque to the scanner/store — content is never parsed). */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

/** A minimal fake multipart FastifyRequest carrying `bytes` at `mimetype`. */
function fakeRequest(bytes: Buffer, mimetype: string, actorId: string) {
  return {
    file: async () => ({
      mimetype,
      toBuffer: async () => bytes,
      file: { truncated: false },
    }),
    requestContext: { actorId, pariwarId: PARIWAR, traceId: randomUUID() },
    log: { warn: () => undefined, error: () => undefined, info: () => undefined },
  } as unknown as import('fastify').FastifyRequest;
}

function makeCtx(
  poolId: string,
  alertId: string,
  actorId: string,
  overrides: Partial<SelfVerifyUploadContext> = {},
): SelfVerifyUploadContext {
  return {
    pariwarId: ids.pariwarId(PARIWAR),
    poolId: ids.poolId(poolId),
    alertId: ids.alertId(alertId),
    memberId: actorId,
    mismatchReason: 'wrong_pool',
    auditReason: 'wrong_pool',
    ...overrides,
  };
}

/**
 * Seed a member all the way to `active` (mirrors the member-home/lock-in-status.spec.ts sequence, one
 * transition further: `member.lock_in_expired` lock-in → active) with ONE live cycle (a `cycleFreezeCommits`
 * row + a `live` cycle-open alert) and ONE spawned pool in that cycle whose persisted snapshot assigns the
 * member (poolIndex 0) — everything `resolveMemberLivePool` needs to resolve the member's OWN live pool.
 * Seeded on a fresh raw client (superuser — RLS/trigger-guard bypass, the domain `_helpers.ts` convention),
 * committed directly (own-committing — a fresh random id per call avoids collisions across test runs).
 */
async function seedActiveLivePoolMember(
  t: TestDeps,
  memberId: string,
  pariwarId: string,
): Promise<{ poolId: string; cycleId: string; alertId: string }> {
  const cycleId = randomUUID();
  const alertId = randomUUID();
  const poolId = randomUUID();
  const client = await t.pool.connect();
  try {
    await client.query('BEGIN');
    const db = bindScopedDb(client);
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);

    const seq: Array<[string, Record<string, unknown>]> = [
      ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
      ['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'm' }],
      ['member.nominees_declared', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'nominees', actor: 'member', nominee_count: 1, split: 'sole' }],
      ['member.medical_disclosed', { from_state: 'pending-fee', to_state: 'pending-fee', trigger: 'medical', actor: 'member', ima_list_version: 'ima-v1', condition_count: 0, acknowledged: true, ack_locale: 'en' }],
      ['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 110 }],
      ['member.lock_in_entered', { from_state: 'lock-in', to_state: 'lock-in', trigger: 'lock_in_entered', actor: 'member', lock_in_days_at_join: 30, lock_in_policy_version: '0e1c0006-0000-4000-8000-000000000006' }],
      ['member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true }],
    ];
    for (const [eventType, payload] of seq) {
      await memberDomain.projectMemberState(client, {
        memberId: mid, pariwarId: pid, actorId: memberId, eventType: eventType as never, payload,
      });
    }

    await db.insert(schema.cycleFreezeCommits).values({
      commitId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      actorId: 'trustee-actor-1',
      actorDisplay: 'Trustee One',
      committedClaimIds: [],
      committedAt: new Date(),
    });

    await client.query("SET LOCAL app.alert_state_writer = 'on'");
    await db.insert(schema.alerts).values({
      alertId: ids.alertId(alertId),
      cycleId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      poolCount: 1,
      currentState: 'live',
      stateEventVersion: 3,
      createdByActor: 'trustee-actor-1',
    });
    await client.query("SET LOCAL app.alert_state_writer = 'off'");

    await client.query("SET LOCAL app.pool_state_writer = 'on'");
    await db.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(randomUUID()),
      poolIndex: 0,
      poolCanonicalIdentifier: `P-TEST-${poolId.slice(0, 8)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      stateEventVersion: 1,
      // Story 11b.10 — the public address (NOT NULL, GLOBAL unique index). Minted per row.
      publicToken: poolDomain.mintPoolPublicToken(),
    });
    await client.query("SET LOCAL app.pool_state_writer = 'off'");

    const snapshot = poolDomain.serializePoolSnapshot({
      poolId,
      pariwarId,
      cycleId,
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: [{ member_id: memberId }],
    });
    await db.insert(schema.poolSnapshots).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      formatVersion: snapshot.format_version,
      schemaVersion: snapshot.schema_version,
      integrityHash: snapshot.integrity_hash,
      stateEventVersion: 1,
      snapshot,
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
  return { poolId, cycleId, alertId };
}

describe.skipIf(!hasDatabase)('self-verify screenshot upload core (PARIWAR scope)', { timeout: 20000 }, () => {
  let t: TestDeps;

  afterEach(async () => {
    await t?.pool.end().catch(() => undefined);
  });

  it('AC3/AC4 — a valid screenshot stores the blob + appends ONLY the evidence event (no verdict)', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      const res = await h.uploadScreenshotTransport(
        fakeRequest(PNG_BYTES, 'image/png', actorId),
        scopeTx,
        makeCtx(poolId, alertId, actorId),
      );
      expect(res).toEqual({ status: 'uploaded' });

      // The evidence event landed on the ALERT stream — and it is the ONLY event (AC4: no contribution.confirmed).
      const events = await loadEvents(scopeTx.tx, alertId);
      const types = events.map((e) => e.eventType);
      expect(types).toEqual(['reconciliation.self-verify-screenshot-uploaded']);
      expect(types).not.toContain('contribution.confirmed');
      const payload = events[0]!.payload as Record<string, unknown>;
      expect(payload['poolId']).toBe(poolId);
      expect(payload['memberId']).toBe(actorId);
      expect(payload['mismatchReason']).toBe('wrong_pool');
      expect(payload['contentType']).toBe('image/png');
      expect(payload['objectKey']).toMatch(new RegExp(`^pariwar/${PARIWAR}/pool/${poolId}/`));
      // The raw bytes were stored under that key.
      expect(t.selfVerifyScreenshotStorage.store.get(payload['objectKey'] as string)).toBeTruthy();
      // The screenshot upload is member-attributed (actorId = memberId) — the resident-sink audit line.
      expect(t.auditSink.events.some((e) => e.type === 'member_self_verify.screenshot_uploaded')).toBe(true);
    } finally {
      await closeScopeTx(scopeTx, false); // rollback — no persistence
    }
  });

  it('AC3 — a "Trouble with UTR?" fallback (no live mismatch) carries a NULL mismatchReason', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await h.uploadScreenshotTransport(
        fakeRequest(PNG_BYTES, 'application/pdf', actorId),
        scopeTx,
        makeCtx(poolId, alertId, actorId, { mismatchReason: null, auditReason: 'trouble_with_utr' }),
      );
      const events = await loadEvents(scopeTx.tx, alertId);
      const payload = events[0]!.payload as Record<string, unknown>;
      expect(payload['mismatchReason']).toBeNull();
      expect(payload['contentType']).toBe('application/pdf');
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('rejects a non-image/PDF MIME with a dignified 4xx — nothing stored, no event', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadScreenshotTransport(fakeRequest(Buffer.from('hello'), 'text/csv', actorId), scopeTx, makeCtx(poolId, alertId, actorId)),
      ).rejects.toMatchObject({ code: 'self_verify.unsupported_type' });
      expect((await loadEvents(scopeTx.tx, alertId)).length).toBe(0);
      expect(t.selfVerifyScreenshotStorage.store.size).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('an empty upload is a dignified 400, never stored', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadScreenshotTransport(fakeRequest(Buffer.alloc(0), 'image/png', actorId), scopeTx, makeCtx(poolId, alertId, actorId)),
      ).rejects.toMatchObject({ code: 'self_verify.empty' });
      expect(t.selfVerifyScreenshotStorage.store.size).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('a virus-flagged screenshot is QUARANTINED — rejected before store, no event, nothing stored', async () => {
    const scanner: StatementScanner = createRejectingStatementScanner({ reason: 'eicar' });
    t = buildTestDeps({ statementScanner: scanner, env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadScreenshotTransport(fakeRequest(PNG_BYTES, 'image/png', actorId), scopeTx, makeCtx(poolId, alertId, actorId)),
      ).rejects.toMatchObject({ code: 'self_verify.file_quarantined' });
      expect((await loadEvents(scopeTx.tx, alertId)).length).toBe(0);
      expect(t.selfVerifyScreenshotStorage.store.size).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('the guard (member-scope): a member with no active live pool gets a dignified 404 — never an upload', async () => {
    // Drives the full `uploadScreenshot` wrapper (which opens its own scope tx + resolves the member's own
    // live pool). An unseeded member is not `active`, so `resolveMemberLivePool` returns null ⇒ 404. This
    // proves a member can never upload without their OWN live pool (the FR-12A self-scope), and that the
    // mandatory-only-on-mismatch guard sits behind that resolution (the mismatch half is DB-proven by the
    // domain self-verify read spec).
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const req = {
      file: async () => ({ mimetype: 'image/png', toBuffer: async () => PNG_BYTES, file: { truncated: false } }),
      query: { pool_id: randomUUID() },
      requestContext: { actorId, pariwarId: PARIWAR, traceId: randomUUID() },
      log: { warn: () => undefined, error: () => undefined, info: () => undefined },
    } as unknown as import('fastify').FastifyRequest;
    await expect(h.uploadScreenshot(req)).rejects.toMatchObject({ code: 'self_verify.no_active_pool' });
    expect(t.selfVerifyScreenshotStorage.store.size).toBe(0);
  });

  it('the guard (member-scope): uploading against a DIFFERENT pool than the member\'s own live pool is a dignified 404 — never an upload', async () => {
    // A member WITH an active live-pool assignment — unlike the no-active-pool case above, this proves
    // the `query.pool_id !== chosen.pool.poolId` branch (handlers.ts) specifically: a member cannot upload
    // against a pool that is not their own live one, even though they DO have one.
    // A DEDICATED pariwar id (never the shared `PARIWAR` constant): this test's seed COMMITS real rows
    // (a live alert + a spawned pool) rather than rolling back, and `PARIWAR` is the well-known id many
    // other live-DB suites assume has NO live alert — reusing it here would leak a persistent live alert
    // across test files/runs.
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const isolatedPariwarId = randomUUID();
    const actorId = randomUUID();
    await seedActiveLivePoolMember(t, actorId, isolatedPariwarId);
    const otherPoolId = randomUUID(); // deliberately NOT the member's own live pool
    const h = createSelfVerifyHandlers(t.deps);
    const req = {
      file: async () => ({ mimetype: 'image/png', toBuffer: async () => PNG_BYTES, file: { truncated: false } }),
      query: { pool_id: otherPoolId },
      requestContext: { actorId, pariwarId: isolatedPariwarId, traceId: randomUUID() },
      log: { warn: () => undefined, error: () => undefined, info: () => undefined },
    } as unknown as import('fastify').FastifyRequest;
    await expect(h.uploadScreenshot(req)).rejects.toMatchObject({ code: 'self_verify.pool_not_found' });
    expect(t.selfVerifyScreenshotStorage.store.size).toBe(0);
  });

  it('AC4 — a storage outage degrades to a dignified 503 (never a 500), audit-logged', async () => {
    const flaky: SelfVerifyScreenshotStorage = {
      async put() {
        throw new Error('gcs unavailable');
      },
      async getBytes() {
        throw new Error('n/a');
      },
      async signedReadUrl() {
        return 'n/a';
      },
    };
    t = buildTestDeps({ selfVerifyScreenshotStorage: flaky as never, env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const alertId = randomUUID();
    const actorId = randomUUID();
    const h = createSelfVerifyHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadScreenshotTransport(fakeRequest(PNG_BYTES, 'image/png', actorId), scopeTx, makeCtx(poolId, alertId, actorId)),
      ).rejects.toMatchObject({ statusCode: 503, code: 'self_verify.storage_unavailable' });
      expect((await loadEvents(scopeTx.tx, alertId)).length).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
    expect(t.auditSink.events.some((e) => e.type === 'member_self_verify.storage_unavailable')).toBe(true);
  });
});
