// `resolveAttribution` + `readAttributionCodeForFieldWorker` — live-DB (Story 13.2, Task 6.1; AC5 / AC6 / AC8; AT4 (c); I1 / I4 /
// I6 / I7). Per-test ROLLBACK. ⚠ Sub-millisecond instants are seeded as SQL `timestamptz` LITERALS (⛔ a JS Date — TR10), code rows
// under `session_replication_role = 'replica'` so the stamp trigger keeps them (TR11).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { InvalidPariwarScopeError, PariwarScopeMissingError } from '../../../src/errors.js';
import { setPariwarScope } from '../../../src/db.js';
import {
  fieldWorkerId as toFieldWorkerId,
  memberAttributionId as toCaptureId,
  pariwarId as toPariwarId,
} from '../../../src/ids/index.js';
import { attributionCode } from '../../../src/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';
import { caught, seedCapture, seedCode, seedFieldWorker } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const B = toPariwarId(PARIWAR_B);
const capture = (id: string) => ({ captureId: toCaptureId(id) });

describe.skipIf(!hasDatabase)('resolveAttribution (AC5 / AC8)', () => {
  setupLiveDb();

  it('same (code, pariwarId) resolves to the same field worker on every call, for every asOf at or after its allocation', async () => {
    const { tx, client } = getTx();
    const w = await seedCode(client, PARIWAR_A, '482913', { allocatedAt: '2026-11-01 12:00:00+00' });
    const c1 = await seedCapture(tx, client, PARIWAR_A, '482913', '2026-11-01 12:00:01+00');
    const c2 = await seedCapture(tx, client, PARIWAR_A, '482913', '2027-03-01 00:00:00+00');
    await enterAppScope(client, PARIWAR_A);
    for (let i = 0; i < 3; i += 1) {
      expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: 'now' })).toBe(w);
      expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(c1) })).toBe(w);
      expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(c2) })).toBe(w);
    }
  });

  it('⭐ AT4 (c) at MICROSECOND precision: captures at .123455 (BEFORE) / .123456 (EQUAL) / .123457 (AFTER) a code allocated at .123456 ⇒ null / holder / holder', async () => {
    const { tx, client } = getTx();
    const w = await seedCode(client, PARIWAR_A, '482913', { allocatedAt: '2026-11-01 12:00:00.123456+00' });
    const before = await seedCapture(tx, client, PARIWAR_A, '482913', '2026-11-01 12:00:00.123455+00');
    const equal = await seedCapture(tx, client, PARIWAR_A, '482913', '2026-11-01 12:00:00.123456+00');
    const after = await seedCapture(tx, client, PARIWAR_A, '482913', '2026-11-01 12:00:00.123457+00');
    // The seeds really are µs-distinct and inside one millisecond (a JS Date would have made them identical).
    const stored = await client.query<{ us: string }>(
      `SELECT to_char(captured_at AT TIME ZONE 'UTC', 'US') AS us FROM member_attribution WHERE attribution_id = ANY($1) ORDER BY captured_at`,
      [[before, equal, after]],
    );
    expect(stored.rows.map((r) => r.us)).toEqual(['123455', '123456', '123457']);
    await enterAppScope(client, PARIWAR_A);
    expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(before) })).toBeNull();
    expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(equal) })).toBe(w);
    expect(await attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(after) })).toBe(w);
  });

  it('the stamp: an INSERT as twt_app supplying allocated_at = 2000-01-01 stores the DB clock instead (⛔ backdating)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const w = await seedFieldWorker(client, PARIWAR_A); // ⭐ a REAL holder — Story 13.1 (the 0200 FK); the seed steps out of twt_app and back
    await client.query(
      `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts, allocated_at)
         VALUES ($1, $2, '482915', 1, '2000-01-01 00:00:00+00')`,
      [PARIWAR_A, w],
    );
    const r = await client.query<{ stamped: boolean }>(
      `SELECT allocated_at > now() - interval '1 hour' AND allocated_at <= clock_timestamp() AS stamped
         FROM field_worker_attribution_codes WHERE field_worker_id = $1`,
      [w],
    );
    expect(r.rows).toEqual([{ stamped: true }]);
  });

  it("'now' ⇒ the holder for a code allocated earlier in the test; an un-held code ⇒ null", async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const w = await seedFieldWorker(client, PARIWAR_A); // ⭐ a REAL holder — Story 13.1 (the 0200 FK)
    const { code } = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w });
    expect(await attributionCode.resolveAttribution(client, { code, pariwarId: A, asOf: 'now' })).toBe(w);
    const unheld = code === '482916' ? '482917' : '482916';
    expect(await attributionCode.resolveAttribution(client, { code: unheld, pariwarId: A, asOf: 'now' })).toBeNull();
  });

  it('{ captureId } of a capture whose code is UN-HELD ⇒ null (⛔ a mismatch — the LEFT JOIN from the capture)', async () => {
    const { tx, client } = getTx();
    const c = await seedCapture(tx, client, PARIWAR_A, '482918');
    await enterAppScope(client, PARIWAR_A);
    expect(await attributionCode.resolveAttribution(client, { code: '482918', pariwarId: A, asOf: capture(c) })).toBeNull();
  });

  it('a capture of a DIFFERENT code ⇒ AttributionCaptureMismatchError; an unknown capture id ⇒ AttributionCaptureMismatchError', async () => {
    const { tx, client } = getTx();
    await seedCode(client, PARIWAR_A, '482914');
    const c = await seedCapture(tx, client, PARIWAR_A, '482913');
    await enterAppScope(client, PARIWAR_A);
    const e1 = await caught(() => attributionCode.resolveAttribution(client, { code: '482914', pariwarId: A, asOf: capture(c) }));
    expect(e1).toBeInstanceOf(attributionCode.AttributionCaptureMismatchError);
    const e2 = await caught(() => attributionCode.resolveAttribution(client, { code: '482914', pariwarId: A, asOf: capture(randomUUID()) }));
    expect(e2).toBeInstanceOf(attributionCode.AttributionCaptureMismatchError);
  });

  it('a captureId from ANOTHER Pariwar ⇒ AttributionCaptureMismatchError — as the OWNER role too, so RLS is ⛔ what catches it', async () => {
    const { tx, client } = getTx();
    await seedCode(client, PARIWAR_A, '482913', { allocatedAt: '2026-01-01 00:00:00+00' });
    const inB = await seedCapture(tx, client, PARIWAR_B, '482913');
    await setPariwarScope(client, PARIWAR_A); // owner: RLS bypassed
    const owner = await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(inB) }));
    expect(owner).toBeInstanceOf(attributionCode.AttributionCaptureMismatchError);
    await enterAppScope(client, PARIWAR_A);
    const app = await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: capture(inB) }));
    expect(app).toBeInstanceOf(attributionCode.AttributionCaptureMismatchError);
  });

  it('I1: the SAME code in A (W1) and B (W2) resolves to W1 under A and to W2 under B', async () => {
    const { client } = getTx();
    const w1 = await seedCode(client, PARIWAR_A, '731004');
    const w2 = await seedCode(client, PARIWAR_B, '731004');
    await enterAppScope(client, PARIWAR_A);
    expect(await attributionCode.resolveAttribution(client, { code: '731004', pariwarId: A, asOf: 'now' })).toBe(w1);
    await setPariwarScope(client, PARIWAR_B);
    expect(await attributionCode.resolveAttribution(client, { code: '731004', pariwarId: B, asOf: 'now' })).toBe(w2);
  });

  it('resolving A’s code with pariwarId = B while scoped to A ⇒ AttributionPariwarScopeMismatchError', async () => {
    const { client } = getTx();
    await seedCode(client, PARIWAR_A, '731005');
    await enterAppScope(client, PARIWAR_A);
    const err = await caught(() => attributionCode.resolveAttribution(client, { code: '731005', pariwarId: B, asOf: 'now' }));
    expect(err).toBeInstanceOf(attributionCode.AttributionPariwarScopeMismatchError);
  });

  it('⭐ as the OWNER role (RLS BYPASSED), scope = A: a code held ONLY in B ⇒ null under A; held in B first then A ⇒ A’s holder — only the explicit pariwar_id predicate makes these hold (TR3)', async () => {
    const { tx, client } = getTx();
    // B's row is written FIRST, so a scan without the Pariwar predicate meets it first.
    const wB = await seedCode(client, PARIWAR_B, '731006', { allocatedAt: '2026-01-01 00:00:00+00' });
    const onlyB = await seedCode(client, PARIWAR_B, '731007', { allocatedAt: '2026-01-01 00:00:00+00' });
    const wA = await seedCode(client, PARIWAR_A, '731006', { allocatedAt: '2026-01-01 00:00:00+00' });
    const capA = await seedCapture(tx, client, PARIWAR_A, '731006');
    const capOnlyB = await seedCapture(tx, client, PARIWAR_A, '731007');
    await setPariwarScope(client, PARIWAR_A); // ⛔ SET ROLE twt_app
    expect(await attributionCode.resolveAttribution(client, { code: '731007', pariwarId: A, asOf: 'now' })).toBeNull();
    expect(await attributionCode.resolveAttribution(client, { code: '731007', pariwarId: A, asOf: capture(capOnlyB) })).toBeNull();
    expect(await attributionCode.resolveAttribution(client, { code: '731006', pariwarId: A, asOf: 'now' })).toBe(wA);
    expect(await attributionCode.resolveAttribution(client, { code: '731006', pariwarId: A, asOf: capture(capA) })).toBe(wA);
    expect([wB, onlyB]).not.toContain(wA);
  });

  it('a code not matching ^[0-9]{6}$ ⇒ InvalidAttributionCodeError BEFORE any statement — even on a pg.Pool-shaped handle (TR14)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const code of ['12345', '1234567', '12a456', ' 123456', '१२३४५६', 123456 as unknown as string]) {
      const onClient = await caught(() => attributionCode.resolveAttribution(client, { code, pariwarId: A, asOf: 'now' }));
      expect(onClient, String(code)).toBeInstanceOf(attributionCode.InvalidAttributionCodeError);
      const onPool = await caught(() => attributionCode.resolveAttribution({ query: () => undefined } as never, { code, pariwarId: A, asOf: 'now' }));
      expect(onPool, String(code)).toBeInstanceOf(attributionCode.InvalidAttributionCodeError);
    }
  });

  it('a deny-listed code is a valid capture shape: resolving it ⇒ null (it can never be held)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await attributionCode.resolveAttribution(client, { code: '123456', pariwarId: A, asOf: 'now' })).toBeNull();
  });

  it('asOf of any other shape ⇒ TypeError BEFORE any statement (⛔ a JS Date)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const asOf of [undefined, null, new Date(), 'later', {}, { captureId: 'not-a-uuid' }, { captureId: randomUUID(), extra: 1 }, [randomUUID()]]) {
      const err = await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: asOf as never }));
      expect(err, JSON.stringify(asOf)).toBeInstanceOf(TypeError);
    }
  });

  it('unset scope ⇒ PariwarScopeMissingError; a non-UUID scope ⇒ InvalidPariwarScopeError', async () => {
    const { client } = getTx();
    await enterAppRoleNoScope(client);
    expect(await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: 'now' }))).toBeInstanceOf(
      PariwarScopeMissingError,
    );
    await client.query("SELECT set_config('app.pariwar_id', 'not-a-uuid', true)");
    expect(await caught(() => attributionCode.resolveAttribution(client, { code: '482913', pariwarId: A, asOf: 'now' }))).toBeInstanceOf(
      InvalidPariwarScopeError,
    );
  });

  it('the scope comparison is case-insensitive (an upper-cased pariwarId still resolves)', async () => {
    const { client } = getTx();
    const w = await seedCode(client, PARIWAR_A, '731008');
    await enterAppScope(client, PARIWAR_A);
    const upper = PARIWAR_A.toUpperCase() as typeof A;
    expect(await attributionCode.resolveAttribution(client, { code: '731008', pariwarId: upper, asOf: 'now' })).toBe(w);
  });
});

describe.skipIf(!hasDatabase)('readAttributionCodeForFieldWorker (AC6)', () => {
  setupLiveDb();

  it('returns the worker’s code + allocated_at; null for a worker with none; scope-checked', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const w = await seedFieldWorker(client, PARIWAR_A); // ⭐ a REAL holder — Story 13.1 (the 0200 FK)
    const { code } = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w });
    const held = await attributionCode.readAttributionCodeForFieldWorker(client, { pariwarId: A, fieldWorkerId: w });
    expect(held?.code).toBe(code);
    expect(held?.allocatedAt).toBeInstanceOf(Date);
    expect(
      await attributionCode.readAttributionCodeForFieldWorker(client, { pariwarId: A, fieldWorkerId: toFieldWorkerId(randomUUID()) }),
    ).toBeNull();
    expect(await caught(() => attributionCode.readAttributionCodeForFieldWorker(client, { pariwarId: B, fieldWorkerId: w }))).toBeInstanceOf(
      attributionCode.AttributionPariwarScopeMismatchError,
    );
  });

  it('as the OWNER role, scope = A: a worker whose code is in B reads null under A (the explicit predicate)', async () => {
    const { client } = getTx();
    const wB = await seedCode(client, PARIWAR_B, '731009');
    await setPariwarScope(client, PARIWAR_A);
    expect(await attributionCode.readAttributionCodeForFieldWorker(client, { pariwarId: A, fieldWorkerId: toFieldWorkerId(wB) })).toBeNull();
  });
});
