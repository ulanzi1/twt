// Type-level proof that the module's DB functions take ONE transaction-bound `pg.PoolClient` — ⛔ a `pg.Pool`, ⛔ a Drizzle `Db`
// (Story 13.2, AC8 / AT8 v2 i). Checked by `tsc` (the domain tsconfig includes tests/**); the body never runs a statement.

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import type { FieldWorkerId, PariwarId } from '../../src/ids/index.js';
import { attributionCode } from '../../src/index.js';

declare const pool: pg.Pool;
declare const db: Db;
declare const client: pg.PoolClient;
declare const pariwarId: PariwarId;
declare const fieldWorkerId: FieldWorkerId;

// Never invoked — exists for the compiler only.
function compileOnly(): void {
  // @ts-expect-error a pool is ⛔ a client
  void attributionCode.resolveAttribution(pool, { code: '482913', pariwarId, asOf: 'now' });
  // @ts-expect-error a Drizzle Db is ⛔ a client
  void attributionCode.resolveAttribution(db, { code: '482913', pariwarId, asOf: 'now' });
  // @ts-expect-error a pool is ⛔ a client
  void attributionCode.allocateAttributionCode(pool, { pariwarId, fieldWorkerId });
  // @ts-expect-error a Drizzle Db is ⛔ a client
  void attributionCode.allocateAttributionCode(db, { pariwarId, fieldWorkerId });
  // @ts-expect-error a pool is ⛔ a client
  void attributionCode.readAttributionCodeForFieldWorker(pool, { pariwarId, fieldWorkerId });
  // @ts-expect-error a Drizzle Db is ⛔ a client
  void attributionCode.readAttributionCodeForFieldWorker(db, { pariwarId, fieldWorkerId });
  // @ts-expect-error a Drizzle Db is ⛔ a client
  void attributionCode.listAllocationFlags(db, { pariwarId });
  // @ts-expect-error a pool is ⛔ a client
  void attributionCode.listAllocationFlags(pool, { pariwarId });
  // @ts-expect-error `asOf` is required
  void attributionCode.resolveAttribution(client, { code: '482913', pariwarId });
  // @ts-expect-error a JS Date is ⛔ an `asOf` (AT4 (c) — the instant stays in the database)
  void attributionCode.resolveAttribution(client, { code: '482913', pariwarId, asOf: new Date() });
  // The supported shape compiles.
  void attributionCode.resolveAttribution(client, { code: '482913', pariwarId, asOf: 'now' });
}

describe('attribution-code handle types (AT8 v2 i)', () => {
  it('is checked by tsc — the @ts-expect-error lines above fail typecheck if a Pool or Db ever compiles', () => {
    expect(typeof compileOnly).toBe('function');
  });
});
