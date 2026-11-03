// The shared harness of the field-worker registration specs — Story 13.1 (AC8, AC13). Two spec files use it (the exhaustion
// legs need a FILE-WIDE `vi.mock` of the door, so they live apart).
//
// ⚠ OWN-COMMITTING: the route COMMITS inside `mutate`, so every 201 leaves append-only rows (`events_log`, the code, audit
// lines) on the shared DB. Every test uses a FRESH `randomUUID()` Pariwar, asserts by its own ids (⛔ counts), and `cleanup`
// removes everything under `session_replication_role = 'replica'` in the story's order (13.2 TR12): codes → flags →
// field_workers → events_log → admin_sessions / role_grants / users → the listed districts / trees. Audit lines are
// append-only and Pariwar-tagged; they stay (the shared-DB convention of every audited spec).

import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';

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

  async function cleanup(): Promise<void> {
    await app.close();
    const c = await td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const streams = (await c.query<{ id: string }>('SELECT field_worker_id AS id FROM field_workers WHERE pariwar_id = ANY($1)', [createdPariwars])).rows.map((r) => r.id);
      await c.query('DELETE FROM field_worker_attribution_codes WHERE pariwar_id = ANY($1)', [createdPariwars]);
      await c.query('DELETE FROM attribution_code_allocation_flags WHERE pariwar_id = ANY($1)', [createdPariwars]);
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

  return { td, deps, app, logs: () => logged, freshPariwar, actor, addGrant, listDistrict, seedTree, register, cleanup };
}

export const json = (r: { body: string }): Json => JSON.parse(r.body) as Json;
export const errOf = (r: { body: string }): { code: string; message: string } => (JSON.parse(r.body) as { error: { code: string; message: string } }).error;
