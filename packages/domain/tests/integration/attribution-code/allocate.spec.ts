// `allocateAttributionCode` — live-DB (Story 13.2, Task 6.1; AC4 / AC8; AT3 / AT4 / AT6 / AT9; I1 / I2 / I5). Per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { attributionCode } from '../../../src/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { caught, expectNoAllocatorSavepoint, seedCapture, seedCode, scripted } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const B = toPariwarId(PARIWAR_B);
const worker = () => toFieldWorkerId(randomUUID());

describe.skipIf(!hasDatabase)('allocateAttributionCode (AC4)', () => {
  setupLiveDb();

  it('allocates a six-digit code on the first draw and returns it with the DB-stamped instant', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const w = worker();
    const r = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w });
    expect(r.code).toMatch(/^[0-9]{6}$/);
    expect(r.attempts).toBe(1);
    expect(r.allocatedAt).toBeInstanceOf(Date);
    const row = await client.query(
      'SELECT pariwar_id, field_worker_id, code, allocation_attempts FROM field_worker_attribution_codes WHERE attribution_code_id = $1',
      [r.attributionCodeId],
    );
    expect(row.rows).toEqual([{ pariwar_id: PARIWAR_A, field_worker_id: w, code: r.code, allocation_attempts: 1 }]);
  });

  it('forced clash: a held code then a fresh one ⇒ success on attempt 2 (attempts = 2)', async () => {
    const { client } = getTx();
    await seedCode(client, PARIWAR_A, '482913');
    await enterAppScope(client, PARIWAR_A);
    const g = scripted('482913', '482914');
    const r = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { generate: g.generate });
    expect(r).toMatchObject({ code: '482914', attempts: 2 });
    expect(g.draws()).toBe(2);
    await expectNoAllocatorSavepoint(client); // the failed attempt's savepoint was released too (R6)
  });

  it('exhaustion: a generator that always clashes ⇒ AttributionCodeAllocationExhaustedError after exactly maxAttempts draws — and the caller’s tx is still usable (CONTROL: a second worker allocates)', async () => {
    const { client } = getTx();
    await seedCode(client, PARIWAR_A, '482913');
    await enterAppScope(client, PARIWAR_A);
    const g = scripted('482913');
    const err = await caught(() =>
      attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { maxAttempts: 3, generate: g.generate }),
    );
    expect(err).toBeInstanceOf(attributionCode.AttributionCodeAllocationExhaustedError);
    expect(err).toMatchObject({ pariwarId: A, attempts: 3 });
    expect(g.draws()).toBe(3);
    await expectNoAllocatorSavepoint(client); // ⛔ three stale savepoints (R6)
    // ⛔ "no row survived" (vacuous after ROLLBACK TO SAVEPOINT) — the CONTROL: the same tx still works. A scripted fresh code
    // (⛔ a random draw, which could legitimately hit the held one — R7).
    const ok = await attributionCode.allocateAttributionCode(
      client,
      { pariwarId: A, fieldWorkerId: worker() },
      { generate: scripted('482914').generate },
    );
    expect(ok).toMatchObject({ code: '482914', attempts: 1 });
  });

  it('the default is 8 draws', async () => {
    const { client } = getTx();
    await seedCode(client, PARIWAR_A, '482913');
    await enterAppScope(client, PARIWAR_A);
    const g = scripted('482913');
    const err = await caught(() => attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { generate: g.generate }));
    expect(err).toMatchObject({ attempts: 8 });
    expect(g.draws()).toBe(attributionCode.ATTRIBUTION_CODE_MAX_ATTEMPTS);
  });

  it('AT4: a candidate a member already typed in THIS Pariwar is skipped (the attempt counts); the same string typed in ANOTHER Pariwar is ⛔ skipped', async () => {
    const { tx, client } = getTx();
    await seedCapture(tx, client, PARIWAR_A, '555123');
    await seedCapture(tx, client, PARIWAR_B, '555125');
    await enterAppScope(client, PARIWAR_A);
    const skip = await attributionCode.allocateAttributionCode(
      client,
      { pariwarId: A, fieldWorkerId: worker() },
      { generate: scripted('555123', '555124').generate },
    );
    expect(skip).toMatchObject({ code: '555124', attempts: 2 });
    const cross = await attributionCode.allocateAttributionCode(
      client,
      { pariwarId: A, fieldWorkerId: worker() },
      { generate: scripted('555125').generate },
    );
    expect(cross).toMatchObject({ code: '555125', attempts: 1 });
  });

  it('⭐ as the OWNER role (RLS BYPASSED), scope = A: the AT4 skip ignores B’s capture — only the explicit pariwar_id predicate makes this hold (TR3)', async () => {
    const { tx, client } = getTx();
    await seedCapture(tx, client, PARIWAR_B, '555126');
    await setPariwarScope(client, PARIWAR_A); // ⛔ SET ROLE twt_app — the superuser sees B's row
    const r = await attributionCode.allocateAttributionCode(
      client,
      { pariwarId: A, fieldWorkerId: worker() },
      { generate: scripted('555126', '555127').generate },
    );
    expect(r).toMatchObject({ code: '555126', attempts: 1 });
  });

  it('I1: the same code may be held in two Pariwars — both INSERTs succeed', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const a = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { generate: scripted('731004').generate });
    await setPariwarScope(client, PARIWAR_B);
    const b = await attributionCode.allocateAttributionCode(client, { pariwarId: B, fieldWorkerId: worker() }, { generate: scripted('731004').generate });
    expect([a.code, b.code]).toEqual(['731004', '731004']);
  });

  it('I2: a second allocation for the same worker ⇒ FieldWorkerAlreadyHasAttributionCodeError (⛔ retried)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const w = worker();
    await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w }, { generate: scripted('602117').generate });
    const g = scripted('602118', '602119');
    const err = await caught(() => attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w }, { generate: g.generate }));
    expect(err).toBeInstanceOf(attributionCode.FieldWorkerAlreadyHasAttributionCodeError);
    expect(g.draws()).toBe(0); // refused before any draw (R3)
  });

  it('R3: an existing holder drawing ITS OWN code, or a code a member typed, with maxAttempts 1 ⇒ FieldWorkerAlreadyHasAttributionCodeError (⛔ an exhaustion, ⛔ a trustee flag)', async () => {
    const { tx, client } = getTx();
    await seedCapture(tx, client, PARIWAR_A, '602131');
    await enterAppScope(client, PARIWAR_A);
    const w = worker();
    await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w }, { generate: scripted('602130').generate });
    for (const candidate of ['602130', '602131']) {
      const g = scripted(candidate);
      const err = await caught(() =>
        attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: w }, { maxAttempts: 1, generate: g.generate }),
      );
      expect(err, candidate).toBeInstanceOf(attributionCode.FieldWorkerAlreadyHasAttributionCodeError);
      expect(err).toMatchObject({ pariwarId: A, fieldWorkerId: w });
      expect(g.draws()).toBe(0);
    }
  });

  it('an injected generate returning a malformed or deny-listed code ⇒ InvalidAttributionCodeError (⛔ a raw 23514)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const [bad, reason] of [
      ['12345', 'format'],
      ['1234567', 'format'],
      ['123456', 'denylisted'],
      ['000000', 'denylisted'],
    ] as const) {
      const err = await caught(() =>
        attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { generate: () => bad }),
      );
      expect(err, bad).toBeInstanceOf(attributionCode.InvalidAttributionCodeError);
      expect(err).toMatchObject({ reason });
    }
  });

  it('maxAttempts outside 1..32 or fractional ⇒ RangeError BEFORE any statement (even on a non-client)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    for (const maxAttempts of [0, 33, 1.5, Number.NaN]) {
      await expect(attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { maxAttempts })).rejects.toBeInstanceOf(RangeError);
      // A non-client: the pure check still fires first (TR14).
      await expect(
        attributionCode.allocateAttributionCode({} as never, { pariwarId: A, fieldWorkerId: worker() }, { maxAttempts }),
      ).rejects.toBeInstanceOf(RangeError);
    }
    const one = await attributionCode.allocateAttributionCode(client, { pariwarId: A, fieldWorkerId: worker() }, { maxAttempts: 1 });
    expect(one.attempts).toBe(1);
  });

  it('scope ≠ pariwarId ⇒ AttributionPariwarScopeMismatchError (the generator is never drawn — the guard runs first)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const g = scripted('602120');
    const err = await caught(() => attributionCode.allocateAttributionCode(client, { pariwarId: B, fieldWorkerId: worker() }, { generate: g.generate }));
    expect(err).toBeInstanceOf(attributionCode.AttributionPariwarScopeMismatchError);
    expect(err).toMatchObject({ expectedPariwarId: B, scopedPariwarId: PARIWAR_A });
    expect(g.draws()).toBe(0);
  });
});
