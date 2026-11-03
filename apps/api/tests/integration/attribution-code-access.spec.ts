// The API door — the RUNTIME proof (Story 13.2, Task 6.4; AC10; AT8 v2 iii; AT7). Live DB.
//
// A fake request carrying `requestContext.pariwarId = A` and a `ScopeTx` opened by the real `openScopeTx` (twt_app, scoped):
// A + A resolves; A + B ⇒ AttributionPariwarScopeMismatchError BEFORE any SQL (the G9a gap — a member handler that opened its
// tx from config — caught); no `pariwarId` / no `actorId` ⇒ the loud 500; the flag row records the AUTHENTICATED actor and
// their `users.display_name`; no display name ⇒ AdminDisplayNameMissingError and ⛔ row; the flag survives the caller's rollback.
// ⚠ The flag wrapper COMMITS append-only rows that never leave the shared DB (TR12): every flag leg uses a fresh randomUUID()
// Pariwar and asserts by `flag_id` / that Pariwar — ⛔ a global count. Every other leg rolls its ScopeTx back.

import { randomUUID } from 'node:crypto';

import { ids } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AdminDisplayNameMissingError } from '../../src/http-errors.js';
import {
  AttributionCodeAllocationExhaustedError,
  AttributionPariwarScopeMismatchError,
  allocateAttributionCodeForRequest,
  flagAllocationExhaustedForRequest,
  listAllocationFlagsForRequest,
  readAttributionCodeForRequest,
  resolveAttributionForRequest,
} from '../../src/modules/field-worker/attribution-code-access.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../src/types.js';
import { buildTestDeps, hasDatabase, type TestDeps } from './_setup.js';

const fakeRequest = (ctx: { pariwarId?: string; actorId?: string }): FastifyRequest =>
  ({ requestContext: { traceId: 't-13-2', ...ctx } }) as unknown as FastifyRequest;

describe.skipIf(!hasDatabase)('attribution-code API door (AC10)', () => {
  let td: TestDeps;
  const named = randomUUID(); // an admin WITH a display name
  const unnamed = randomUUID(); // an admin with ⛔ display name

  beforeAll(async () => {
    td = buildTestDeps();
    await td.pool.query(
      `INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', 'active', 'Asha Verma'), ($2, 'admin', 'active', NULL)`,
      [named, unnamed],
    );
  });

  afterAll(async () => {
    try {
      await td.pool.query('DELETE FROM users WHERE id = ANY($1)', [[named, unnamed]]);
    } finally {
      await td.pool.end();
    }
  });

  /** Run `fn` in a scope tx for `pariwarId`, always rolled back. */
  async function inScope<T>(pariwarId: string, fn: (s: ScopeTx) => Promise<T>): Promise<T> {
    const s = await openScopeTx(td.deps, pariwarId);
    try {
      return await fn(s);
    } finally {
      await closeScopeTx(s, false);
    }
  }

  it('A-request + A-ScopeTx: allocate, then resolve and read the holder (and a forwarded `generate` is ⛔ honoured)', async () => {
    const A = randomUUID();
    const w = ids.fieldWorkerId(randomUUID());
    await inScope(A, async (s) => {
      const req = fakeRequest({ pariwarId: A });
      // A caller cannot smuggle the test seam through the door's opts (AT9): a deny-listed generator is ignored.
      const allocated = await allocateAttributionCodeForRequest(req, s, { fieldWorkerId: w }, {
        maxAttempts: 2,
        generate: () => '123456',
      } as never);
      expect(allocated.code).toMatch(/^[0-9]{6}$/);
      expect(allocated.code).not.toBe('123456');
      expect(await resolveAttributionForRequest(req, s, { code: allocated.code, asOf: 'now' })).toBe(w);
      expect((await readAttributionCodeForRequest(req, s, { fieldWorkerId: w }))?.code).toBe(allocated.code);
      expect(await listAllocationFlagsForRequest(req, s, {})).toEqual([]);
    });
  });

  it('A-request + B-ScopeTx ⇒ AttributionPariwarScopeMismatchError BEFORE any SQL (the G9a gap, caught at the door)', async () => {
    const A = randomUUID();
    const B = randomUUID();
    await inScope(B, async (s) => {
      const req = fakeRequest({ pariwarId: A });
      await expect(resolveAttributionForRequest(req, s, { code: '482913', asOf: 'now' })).rejects.toBeInstanceOf(AttributionPariwarScopeMismatchError);
      await expect(readAttributionCodeForRequest(req, s, { fieldWorkerId: ids.fieldWorkerId(randomUUID()) })).rejects.toBeInstanceOf(
        AttributionPariwarScopeMismatchError,
      );
      await expect(allocateAttributionCodeForRequest(req, s, { fieldWorkerId: ids.fieldWorkerId(randomUUID()) })).rejects.toBeInstanceOf(
        AttributionPariwarScopeMismatchError,
      );
      await expect(listAllocationFlagsForRequest(req, s, {})).rejects.toBeInstanceOf(AttributionPariwarScopeMismatchError);
    });
    // "before any SQL": a ScopeTx whose client throws on ANY query still yields the mismatch.
    const poisoned = {
      client: { query: () => Promise.reject(new Error('SQL was sent')), release: () => undefined },
      pariwarId: B,
      scopeSet: true,
    } as unknown as ScopeTx;
    await expect(resolveAttributionForRequest(fakeRequest({ pariwarId: A }), poisoned, { code: '482913', asOf: 'now' })).rejects.toBeInstanceOf(
      AttributionPariwarScopeMismatchError,
    );
  });

  it('⛔ requestContext.pariwarId ⇒ the loud 500 (a plain Error, ⛔ an ApiError) — for every wrapper', async () => {
    const A = randomUUID();
    await inScope(A, async (s) => {
      const req = fakeRequest({ actorId: named });
      const NO_PARIWAR = '[attribution-code-access] no authenticated Pariwar';
      await expect(resolveAttributionForRequest(req, s, { code: '482913', asOf: 'now' })).rejects.toThrow(NO_PARIWAR);
      await expect(readAttributionCodeForRequest(req, s, { fieldWorkerId: ids.fieldWorkerId(randomUUID()) })).rejects.toThrow(NO_PARIWAR);
      await expect(allocateAttributionCodeForRequest(req, s, { fieldWorkerId: ids.fieldWorkerId(randomUUID()) })).rejects.toThrow(NO_PARIWAR);
      await expect(listAllocationFlagsForRequest(req, s, {})).rejects.toThrow(NO_PARIWAR);
      await expect(flagAllocationExhaustedForRequest(td.deps, req, { attempts: 8 })).rejects.toThrow(NO_PARIWAR);
    });
  });

  it('the flag wrapper without requestContext.actorId ⇒ the loud 500, and ⛔ row', async () => {
    const P = randomUUID();
    await expect(flagAllocationExhaustedForRequest(td.deps, fakeRequest({ pariwarId: P }), { attempts: 8 })).rejects.toThrow(
      '[attribution-code-access] no authenticated actor',
    );
    expect((await td.pool.query('SELECT 1 FROM attribution_code_allocation_flags WHERE pariwar_id = $1', [P])).rows).toHaveLength(0);
  });

  it('an admin with ⛔ display name ⇒ AdminDisplayNameMissingError and ⛔ row (⛔ fallback to the id — Story 6.11 R5)', async () => {
    const P = randomUUID();
    const err = await flagAllocationExhaustedForRequest(td.deps, fakeRequest({ pariwarId: P, actorId: unnamed }), { attempts: 8 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminDisplayNameMissingError);
    expect((await td.pool.query('SELECT 1 FROM attribution_code_allocation_flags WHERE pariwar_id = $1', [P])).rows).toHaveLength(0);
  });

  it('⭐ the flag records the AUTHENTICATED actor + their display name, and SURVIVES the caller’s rollback (its own committed tx)', async () => {
    const P = randomUUID();
    const req = fakeRequest({ pariwarId: P, actorId: named });
    let flagId: string | null = null;
    // The registration's tx: exhaustion is simulated, the flag is written, the caller rolls back (C1's catch → flag → rethrow).
    await inScope(P, async () => {
      try {
        throw new AttributionCodeAllocationExhaustedError(P, 8);
      } catch (e) {
        if (e instanceof AttributionCodeAllocationExhaustedError) flagId = await flagAllocationExhaustedForRequest(td.deps, req, { attempts: e.attempts });
      }
    });
    expect(flagId).not.toBeNull();
    const row = await td.pool.query('SELECT pariwar_id, attempts, actor_id, actor_display FROM attribution_code_allocation_flags WHERE flag_id = $1', [flagId]);
    expect(row.rows).toEqual([{ pariwar_id: P, attempts: 8, actor_id: named, actor_display: 'Asha Verma' }]);
    // …and the trustee read (C3) lists it through the door, by id.
    const listed = await inScope(P, (s) => listAllocationFlagsForRequest(req, s, {}));
    expect(listed.map((f) => f.flagId)).toContain(flagId);
    expect(listed.find((f) => f.flagId === flagId)?.actorDisplay).toBe('Asha Verma');
  });
});
