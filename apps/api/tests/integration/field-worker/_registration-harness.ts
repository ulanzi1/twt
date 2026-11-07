// The shared harness of the field-worker registration specs — Story 13.1 (AC8, AC13). Two spec files use it (the exhaustion
// legs need a FILE-WIDE `vi.mock` of the door, so they live apart). Story 13.1a EXTENDS it with one helper per new route
// (`approve`, `code`, `identity`, `list`, `districts`) and `registered`; its approval / code-read / reads specs use it too. Story
// 13.1c adds `move`, `suspend`, `reactivate`, `terminate` and `log` (its lifecycle / race / log specs); `cleanup` is unchanged.
//
// ⚠ OWN-COMMITTING: the route COMMITS inside `mutate`, so every 201 leaves append-only rows (`events_log`, the code, audit
// lines) on the shared DB. Every test uses a FRESH `randomUUID()` Pariwar, asserts by its own ids (⛔ counts), and `cleanup`
// removes everything under `session_replication_role = 'replica'` in the story's order (13.2 TR12): codes → flags →
// field_workers → events_log → admin_sessions / role_grants / users → the listed districts / trees. Audit lines are
// append-only and Pariwar-tagged; they stay (the shared-DB convention of every audited spec).

import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';

import type { Pool, PoolClient } from 'pg';
import { expect } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

export type Client = ReturnType<typeof makeClient>;
export type Json = Record<string, unknown>;

export interface Harness {
  td: TestDeps;
  deps: AppDeps;
  app: Awaited<ReturnType<typeof buildServer>>;
  /** Everything the server logged (the `logStream`), as text. */
  logs: () => string;
  freshPariwar: () => string;
  actor: (p: string, role: string, dim: string, value: string | null, displayName?: string | null) => Promise<{ client: Client; userId: string; grantId: string }>;
  addGrant: (userId: string, p: string, role: string, dim: string, value: string | null) => Promise<string>;
  listDistrict: (p: string, ...names: string[]) => Promise<void>;
  seedTree: (p: string, nodes: Json[]) => Promise<void>;
  register: (c: Client, p: string, body: Json, key?: string | null) => ReturnType<Client['inject']>;
  // ── Story 13.1a — the five new routes (the same Client / Pariwar conventions) ──
  approve: (c: Client, p: string, id: string, key?: string | null, body?: string) => ReturnType<Client['inject']>;
  code: (c: Client, p: string, id: string) => ReturnType<Client['inject']>;
  identity: (c: Client, p: string, id: string) => ReturnType<Client['inject']>;
  list: (c: Client, p: string, query: Record<string, string>) => ReturnType<Client['inject']>;
  districts: (c: Client, p: string) => ReturnType<Client['inject']>;
  // ── Story 13.1c — the lifecycle acts and the log (a JSON body string, so `reactivate`'s `'{}'` is sent as-is — TR5) ──
  move: (c: Client, p: string, id: string, body: Json, key?: string | null) => ReturnType<Client['inject']>;
  suspend: (c: Client, p: string, id: string, body: Json, key?: string | null) => ReturnType<Client['inject']>;
  reactivate: (c: Client, p: string, id: string, key?: string | null, body?: string) => ReturnType<Client['inject']>;
  terminate: (c: Client, p: string, id: string, body: Json, key?: string | null) => ReturnType<Client['inject']>;
  log: (c: Client, p: string, id: string, query?: Record<string, string>) => ReturnType<Client['inject']>;
  /** Register through the route as `c` and return the new worker's id (asserts the 201). */
  registered: (c: Client, p: string, body: Json) => Promise<string>;
  cleanup: () => Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  const fakeWebauthn = new FakeWebAuthnProvider();
  const td = buildTestDeps({ webauthn: fakeWebauthn });
  const deps = td.deps;
  const logStream = new PassThrough();
  let logged = '';
  logStream.on('data', (chunk: Buffer) => {
    logged += chunk.toString('utf8');
  });
  const app = await buildServer(deps, { logStream });
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  function freshPariwar(): string {
    const p = randomUUID();
    createdPariwars.push(p);
    return p;
  }

  async function addGrant(userId: string, p: string, role: string, dim: string, value: string | null): Promise<string> {
    const r = await td.pool.query<{ id: string }>(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, p, role, dim, value],
    );
    return r.rows[0]!.id;
  }

  // Copied from `marketplace-admin.spec.ts` (G8 — ⛔ a shared helper exists): a real admin, a real passkey session, ONE grant.
  async function actor(p: string, role: string, dim: string, value: string | null, displayName: string | null = 'Asha Verma') {
    const email = `fw-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: displayName ?? 'Temporary Name' });
    createdUserIds.push(userId);
    if (displayName === null) await td.pool.query('UPDATE users SET display_name = NULL WHERE id = $1', [userId]);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    const grantId = await addGrant(userId, p, role, dim, value);
    return { client, userId, grantId };
  }

  async function listDistrict(p: string, ...names: string[]): Promise<void> {
    await td.pool.query(`INSERT INTO workplace_districts (pariwar_id, district, status) SELECT $1, d, 'listed' FROM unnest($2::text[]) AS d`, [p, names]);
  }

  async function seedTree(p: string, nodes: Json[]): Promise<void> {
    await td.pool.query(
      `INSERT INTO geo_tree_versions (pariwar_id, version, effective_at, tree_document) VALUES ($1, 1, now() - interval '1 hour', $2::jsonb)`,
      [p, JSON.stringify({ version: 1, nodes })],
    );
  }

  const register = (c: Client, p: string, body: Json, key: string | null = randomUUID()) =>
    c.inject({ method: 'POST', url: `/api/v1/p/${p}/field-workers`, payload: body, headers: key === null ? {} : { 'idempotency-key': key } });

  const approve = (c: Client, p: string, id: string, key: string | null = randomUUID(), body = '{}') =>
    c.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/field-workers/${id}/approve`,
      payload: body,
      headers: { 'content-type': 'application/json', ...(key === null ? {} : { 'idempotency-key': key }) },
    });
  const code = (c: Client, p: string, id: string) => c.inject({ method: 'GET', url: `/api/v1/p/${p}/field-workers/${id}/code` });
  const identity = (c: Client, p: string, id: string) => c.inject({ method: 'GET', url: `/api/v1/p/${p}/field-workers/${id}` });
  const list = (c: Client, p: string, query: Record<string, string>) =>
    c.inject({ method: 'GET', url: `/api/v1/p/${p}/field-workers?${new URLSearchParams(query).toString()}` });
  const districts = (c: Client, p: string) => c.inject({ method: 'GET', url: `/api/v1/p/${p}/field-workers/districts` });
  const actPost = (c: Client, p: string, id: string, act: string, body: string, key: string | null) =>
    c.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/field-workers/${id}/${act}`,
      payload: body,
      headers: { 'content-type': 'application/json', ...(key === null ? {} : { 'idempotency-key': key }) },
    });
  const move = (c: Client, p: string, id: string, body: Json, key: string | null = randomUUID()) => actPost(c, p, id, 'move', JSON.stringify(body), key);
  const suspend = (c: Client, p: string, id: string, body: Json, key: string | null = randomUUID()) => actPost(c, p, id, 'suspend', JSON.stringify(body), key);
  const reactivate = (c: Client, p: string, id: string, key: string | null = randomUUID(), body = '{}') => actPost(c, p, id, 'reactivate', body, key);
  const terminate = (c: Client, p: string, id: string, body: Json, key: string | null = randomUUID()) => actPost(c, p, id, 'terminate', JSON.stringify(body), key);
  const log = (c: Client, p: string, id: string, query: Record<string, string> = {}) => {
    const qs = new URLSearchParams(query).toString();
    return c.inject({ method: 'GET', url: `/api/v1/p/${p}/field-workers/${id}/log${qs === '' ? '' : `?${qs}`}` });
  };
  async function registered(c: Client, p: string, body: Json): Promise<string> {
    const r = await register(c, p, body);
    expect(r.statusCode, r.body).toBe(201);
    return (JSON.parse(r.body) as { field_worker_id: string }).field_worker_id;
  }

  async function cleanup(): Promise<void> {
    await app.close();
    const c = await td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const streams = (await c.query<{ id: string }>('SELECT field_worker_id AS id FROM field_workers WHERE pariwar_id = ANY($1)', [createdPariwars])).rows.map((r) => r.id);
      await c.query('DELETE FROM field_worker_attribution_codes WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM attribution_code_allocation_flags WHERE pariwar_id = ANY($1)', [createdPariwars]);
      // Story 13.1b — before the workers: replica mode disables the FK, so a `due` row would outlive them for a later sweep to find.
      // Code review CB51: `reads.spec.ts` seeds `fw` delivery reports for its send rows; they go with them, never as orphans.
      await c.query(`DELETE FROM sms_send_deliveries WHERE send_kind = 'fw' AND pariwar_id = ANY($1)`, [createdPariwars]);
      await c.query('DELETE FROM field_worker_code_sms_sends WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM field_workers WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM events_log WHERE pariwar_id = ANY($1) AND stream_id = ANY($2)', [createdPariwars, streams]);
      await c.query('DELETE FROM geo_tree_versions WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM workplace_districts WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('COMMIT');
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1) OR user_id = ANY($1::uuid[])`, [createdUserIds]);
        await c.query('DELETE FROM role_grants WHERE user_id = ANY($1)', [createdUserIds]);
        await c.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  }

  return {
    td,
    deps,
    app,
    logs: () => logged,
    freshPariwar,
    actor,
    addGrant,
    listDistrict,
    seedTree,
    register,
    approve,
    code,
    identity,
    list,
    districts,
    move,
    suspend,
    reactivate,
    terminate,
    log,
    registered,
    cleanup,
  };
}

/**
 * Wait until some backend is blocked by the transaction running as `blockerPid` (`pg_blocking_pids`) — a race leg holds a row lock on
 * a connection it owns and needs to know the REQUEST is parked behind it. ⛔ Not "any backend waiting on a lock in the shared
 * database" (another spec file's waiter would satisfy that), and ⛔ never a silent fall-through: it THROWS on timeout, so a
 * request that never reached the lock fails the leg instead of turning it into a sleep (review round 2, CR22).
 */
export async function waitForBlockedBy(pool: Pool, blockerPid: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const r = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))', [blockerPid]);
    if (r.rows[0]!.n > 0) return;
    if (Date.now() > deadline) throw new Error(`no backend became blocked by backend ${blockerPid} within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Wait until the backend `pid` is blocked — for a blocker the test has no handle on (the request's own connection). Throws on timeout. */
export async function waitUntilBlocked(pool: Pool, pid: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const r = await pool.query<{ blocked: boolean }>('SELECT cardinality(pg_blocking_pids($1)) > 0 AS blocked', [pid]);
    if (r.rows[0]!.blocked) return;
    if (Date.now() > deadline) throw new Error(`backend ${pid} was not blocked within ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** A lock holder's `finally` (CR40): a failure before its COMMIT must not hand the pool an open transaction and its row lock. */
export async function releaseHolder(c: PoolClient): Promise<void> {
  await c.query('ROLLBACK').catch(() => undefined);
  c.release(true);
}

export const json = (r: { body: string }): Json => JSON.parse(r.body) as Json;
export const errOf = (r: { body: string }): { code: string; message: string } => (JSON.parse(r.body) as { error: { code: string; message: string } }).error;
