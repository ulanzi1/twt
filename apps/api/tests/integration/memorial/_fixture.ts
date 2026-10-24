// Story 11b.4 — the family memorial's integration fixture. A world is the DECEASED member (the Ravi-mode session member),
// their declared nominee, a KYC name, an approved claim and its pool in the requested state. By default every world is its
// own Pariwar, so no assertion counts over shared rows; `intoPariwar` seeds a SECOND world (another deceased, another drive)
// into an existing Pariwar — the same-Pariwar legs, where RLS cannot be what separates two families (checklist family 12 (a)).
// Explicit values only.

import { randomUUID } from 'node:crypto';

import { encryption, ids, member as memberDomain, memorial, pool as poolDomain, schema } from '@twt/domain';
import { expect } from 'vitest';

import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { encryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, makeClient, type TestApp, type TestDepsOverrides } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
export type Json = Record<string, unknown>;

export interface MemorialWorld {
  readonly pariwarId: string;
  readonly memberId: string;
  readonly claimCaseId: string;
  readonly poolId: string;
  readonly token: string;
}

export function memberToken(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

export async function memberInject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json | string | Buffer; token?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: Json; raw: string }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body, raw: res.body };
}

/**
 * Seed one world. `nominee: false` ⇒ no nominee declared (the `nominee_unresolved` leg). `intoPariwar` ⇒ the world joins that
 * existing Pariwar (a different deceased member, claim and pool) instead of getting its own.
 */
export async function seedMemorialWorld(
  t: TestApp,
  opts: { poolState?: 'spawned' | 'live' | 'closed' | 'settled'; nominee?: boolean; legalName?: string | null; intoPariwar?: string } = {},
): Promise<MemorialWorld> {
  const pariwarId = opts.intoPariwar ?? randomUUID();
  const memberId = randomUUID();
  const claimCaseId = randomUUID();
  const poolId = randomUUID();
  const cycleId = randomUUID();
  const pid = ids.pariwarId(pariwarId);
  const mid = ids.memberId(memberId);

  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.signup_initiated',
      actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.kyc_manual_fallback',
      actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }

  // The nominee is declared BEFORE the claim exists (a filed claim locks the declaration — `nominee.locked_claim_filed`).
  const token = memberToken(t, memberId, pariwarId);
  if (opts.nominee !== false) {
    const res = await memberInject(t, 'POST', '/api/v1/member/nominees', {
      payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
      token,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  }

  const seedTx = await openScopeTx(t.deps, pariwarId);
  try {
    const scopeTx = seedTx;
    if (opts.legalName !== null) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: mid,
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(opts.legalName ?? 'Shanti Devi', pariwarId, t.deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1960-03-01', pariwarId, t.deps.encryption),
        photoCiphertext: null,
        aadhaarMaskedId: 'XXXX4321',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }
    await scopeTx.client.query(
      `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [cycleId, pariwarId, randomUUID(), 'Test Trustee', [claimCaseId]],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, memberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.tx.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(claimCaseId),
      poolIndex: 0,
      poolCanonicalIdentifier: `P-2026-10-${poolId.slice(0, 6)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: opts.poolState ?? 'closed',
      stateEventVersion: 1,
      publicToken: poolDomain.mintPoolPublicToken(),
    });
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");
    await closeScopeTx(seedTx, true);
  } catch (err) {
    await closeScopeTx(seedTx, false);
    throw err;
  }
  return { pariwarId, memberId, claimCaseId, poolId, token };
}

/** The nominee's handover code — through the NOMINEE route (the only one that mints `claim_handover` after MA19). */
export async function handover(t: TestApp, w: MemorialWorld): Promise<void> {
  const send = await memberInject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: w.token });
  expect(send.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  const verify = await memberInject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', { payload: { code }, token: w.token });
  expect(verify.body).toMatchObject({ verified: true });
}

export type Part =
  | { kind: 'field'; name: string; value: string }
  | { kind: 'file'; name: string; filename: string; contentType: string; bytes: Buffer };

/** A multipart/form-data body from ordered parts (the helpdesk spec's builder). */
export function multipart(parts: readonly Part[]): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const chunks: Buffer[] = [];
  for (const p of parts) {
    if (p.kind === 'field') {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\n\r\n`));
      chunks.push(Buffer.from(p.value, 'utf-8'));
      chunks.push(Buffer.from('\r\n'));
    } else {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\n` +
            `Content-Type: ${p.contentType}\r\n\r\n`,
        ),
      );
      chunks.push(p.bytes);
      chunks.push(Buffer.from('\r\n'));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), ct: `multipart/form-data; boundary=${boundary}` };
}

/**
 * The permission text's CURRENT version id — read from the registry, not a second literal to move: a new permission text (a new
 * version id, Row 41 (a)) would otherwise make every Send in this suite answer `authorisation_outdated`. The ids themselves
 * are pinned in `packages/domain/tests/memorial/memorial-status.test.ts`.
 */
export const CURRENT_VERSION: string = memorial.MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION;

/** The Send's standard fields (override per test). */
export function sendFields(over: Partial<Record<'body' | 'altText' | 'authorisationCopyVersion' | 'authorisationLocale' | 'keepPreviousPhoto', string>> = {}): Part[] {
  const f: Record<string, string> = {
    body: 'माँ हमेशा हमारे साथ रहेंगी।',
    authorisationCopyVersion: CURRENT_VERSION,
    authorisationLocale: 'hi',
    ...over,
  };
  return Object.entries(f).map(([name, value]) => ({ kind: 'field', name, value }));
}

export async function send(
  t: TestApp,
  w: MemorialWorld,
  parts: readonly Part[],
  opts: { key?: string | null } = {},
): Promise<{ status: number; body: Json }> {
  const { body, ct } = multipart(parts);
  const headers: Record<string, string> = { 'content-type': ct };
  if (opts.key !== null) headers['idempotency-key'] = opts.key ?? randomUUID();
  const r = await memberInject(t, 'POST', '/api/v1/member/memorial/submissions', { payload: body, token: w.token, headers });
  return { status: r.status, body: r.body };
}

/** A tiny valid JPEG carrying a planted GPS EXIF block (the stripper must remove it). */
export function jpegWithGps(): Buffer {
  const seg = (marker: number, payload: number[]): number[] => {
    const len = payload.length + 2;
    return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
  };
  const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
  return Buffer.from([
    0xff, 0xd8,
    ...seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS-26.8467N-80.9462E')]),
    ...seg(0xdb, [0, ...new Array<number>(64).fill(1)]),
    ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]),
    ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12, 0x34, 0xff, 0x00, 0x56,
    0xff, 0xd9,
  ]);
}

/** A refusal's `error` object minus the per-request id — what a prober can compare byte for byte. */
export function errorWithoutRequestId(error: unknown): Record<string, unknown> {
  return Object.fromEntries(Object.entries((error ?? {}) as Record<string, unknown>).filter(([key]) => key !== 'request_id'));
}

/** Read rows with the service pool (BYPASSRLS) — assertions only. */
export async function rows<T extends Record<string, unknown>>(t: TestApp, text: string, params: unknown[]): Promise<T[]> {
  const c = await t.pool.connect();
  try {
    return (await c.query<T>(text, params)).rows;
  } finally {
    c.release();
  }
}

/** A world whose family has already Sent one version (handover + Send) — the version is with the Trust. */
export async function sentMemorialWorld(
  t: TestApp,
  opts: { world?: Parameters<typeof seedMemorialWorld>[1]; parts?: readonly Part[] } = {},
): Promise<{ w: MemorialWorld; id: string }> {
  const w = await seedMemorialWorld(t, opts.world);
  await handover(t, w);
  const r = await send(t, w, opts.parts ?? sendFields());
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { w, id: r.body.submissionId as string };
}

/** Poll `probe` until it is true (a race test waiting for a request to reach the lock it is about to queue on). */
export async function waitUntil(label: string, probe: () => Promise<boolean>, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

export interface PoolLockHold {
  /** How many backends are queued behind this pool's memorial advisory lock right now. */
  waiters(): Promise<number>;
  waitForWaiters(n: number): Promise<void>;
  /** COMMIT — the queued writers wake in the order they queued. */
  release(): Promise<void>;
  /** ROLLBACK + release the connection (the `finally` of a test that threw before `release`). */
  abort(): Promise<void>;
}

/**
 * ⭐ Hold the pool's memorial advisory lock (`pg_advisory_xact_lock(hashtext('memorial:' || pool_id))` — the lock EVERY memorial
 * write takes first, MA9) from a separate connection. Writers started while it is held queue behind it, so a test can start
 * two requests, wait until BOTH are parked on the lock (`waitForWaiters(2)`), and release — a true two-connection race at the
 * lock, with the order fixed by who queued first (the order the lock then serialises them in), not by scheduler luck.
 */
export async function holdPoolLock(t: TestApp, poolId: string): Promise<PoolLockHold> {
  const key = `memorial:${poolId}`;
  const c = await t.pool.connect();
  let finished = false;
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  } catch (err) {
    c.release();
    throw err;
  }
  const finish = async (statement: 'COMMIT' | 'ROLLBACK'): Promise<void> => {
    if (finished) return;
    finished = true;
    try {
      await c.query(statement);
    } finally {
      c.release();
    }
  };
  const waiters = async (): Promise<number> => {
    // A `bigint` advisory key is stored as (classid = high 32 bits, objid = low 32 bits, objsubid = 1).
    const r = await rows<{ n: number }>(
      t,
      `SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted AND ((classid::bigint << 32) | objid::bigint) = hashtext($1)::bigint`,
      [key],
    );
    return r[0]!.n;
  };
  return {
    waiters,
    waitForWaiters: (n) => waitUntil(`${n} writer(s) queued on the memorial lock of pool ${poolId}`, async () => (await waiters()) >= n),
    release: () => finish('COMMIT'),
    abort: () => finish('ROLLBACK'),
  };
}

/**
 * An UNLOCKED writer: a second connection that inserts a version WITHOUT taking the advisory lock and keeps its transaction
 * open. A Send that reads the chain (it cannot see the uncommitted row), then inserts, parks on the unique index until this
 * writer finishes — then loses with a `23505`: the backstop path (Trap 12) driven through the real handler. With
 * `idempotencyKey` the writer's row carries that Send key (0183) — the Send's 23505 then finds the key on a row and replays it.
 */
export async function beginUnlockedSubmission(
  t: TestApp,
  w: MemorialWorld,
  opts: { supersedes: string | null; idempotencyKey?: string | null },
): Promise<UnlockedSubmission> {
  const submissionId = randomUUID();
  const c = await t.pool.connect();
  let finished = false;
  let backendPid: number;
  try {
    // This writer's own backend — what a parked Send is blocked BY (`waitForParkedSubmissionInsert`, review T10 (d)).
    backendPid = (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
    await c.query('BEGIN');
    await c.query(
      `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, supersedes_submission_id,
         body_ciphertext, authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'hi', 'latest', $9, $10)`,
      [
        submissionId,
        w.pariwarId,
        w.poolId,
        w.claimCaseId,
        w.memberId,
        opts.supersedes,
        await encryptMemorialField('an unlocked writer\'s words', w.pariwarId, t.deps.encryption),
        CURRENT_VERSION,
        randomUUID(),
        opts.idempotencyKey ?? null,
      ],
    );
  } catch (err) {
    await c.query('ROLLBACK').catch(() => undefined);
    c.release();
    throw err;
  }
  const finish = async (statement: 'COMMIT' | 'ROLLBACK'): Promise<void> => {
    if (finished) return;
    finished = true;
    try {
      await c.query(statement);
    } finally {
      c.release();
    }
  };
  return { submissionId, backendPid, commit: () => finish('COMMIT'), rollback: () => finish('ROLLBACK') };
}

export interface UnlockedSubmission {
  readonly submissionId: string;
  /** The writer connection's backend pid (`pg_backend_pid()`). */
  readonly backendPid: number;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Wait until a Send is parked on a lock inside an `INSERT INTO memorial_submissions` (the unique-index wait) — and parked
 * BEHIND THIS TEST'S OWN unlocked writer (review T10 (d)): a backend counts only if `blocker`'s backend is among its
 * `pg_blocking_pids`, in this database. Before, any backend on the server inserting into the table under a lock wait
 * (another worktree's suite on a shared database, a parallel file) satisfied the wait, so the test could release its writer
 * before its own Send had reached the index — and pass or fail for the wrong reason.
 */
export async function waitForParkedSubmissionInsert(t: TestApp, blocker: Pick<UnlockedSubmission, 'backendPid'>): Promise<void> {
  await waitUntil(`a Send parked on the memorial_submissions unique index behind backend ${blocker.backendPid}`, async () => {
    const r = await rows<{ n: number }>(
      t,
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND $1::int = ANY (pg_blocking_pids(pid))
          AND wait_event_type = 'Lock' AND wait_event IN ('transactionid', 'tuple')
          AND query ILIKE 'insert into "memorial_submissions"%'`,
      [blocker.backendPid],
    );
    return r[0]!.n >= 1;
  });
}

export type StaffClient = ReturnType<typeof makeClient>;

export interface ReviewHarness {
  /** The app under test — member routes AND the Trust's review routes in ONE server. */
  readonly t: TestApp;
  /** A signed-in staff session (passkey + login), optionally holding `role` at the `pariwar` dimension of `pariwarId`. */
  staff(pariwarId: string, role: string | null, displayName?: string): Promise<StaffClient>;
  close(): Promise<void>;
}

/** The Trust's review harness: a real admin login per staff user (fake WebAuthn), the memorial switch ON (the suite default). */
export async function createReviewHarness(overrides: TestDepsOverrides = {}): Promise<ReviewHarness> {
  const fakeWebauthn = new FakeWebAuthnProvider();
  const td = buildTestDeps({ ...overrides, webauthn: fakeWebauthn });
  const t: TestApp = { ...td, app: await buildServer(td.deps) };
  const createdUserIds: string[] = [];
  return {
    t,
    async staff(pariwarId, role, displayName = 'Panel Member') {
      const email = `memorial-${randomUUID()}@example.test`;
      const password = 'CorrectHorseBatteryStaple9';
      const userId = await service.createAdminAccount(td.deps, { email, password, displayName });
      createdUserIds.push(userId);
      const credentialId = `cred-${userId}`;
      fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
      fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
      const client = makeClient(t.app);
      const token = service.mintEnrollmentToken(td.deps, userId);
      await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
      await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
      await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
      await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
      const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
      expect(verify.statusCode).toBe(200);
      if (role !== null) {
        await rows(t, `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`, [userId, pariwarId, role, pariwarId]);
      }
      return client;
    },
    async close() {
      let thrown: { error: unknown } | null = null;
      try {
        await t.app.close();
        const c = await td.pool.connect();
        try {
          if (createdUserIds.length > 0) {
            await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
            await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
          }
        } finally {
          c.release();
        }
      } catch (error) {
        thrown = { error };
      }
      // The pool is ALWAYS ended — a failed cleanup must not leak it — and the FIRST error stays the one that is thrown.
      try {
        await td.pool.end();
      } catch (error) {
        thrown ??= { error };
      }
      if (thrown !== null) throw thrown.error;
    },
  };
}
