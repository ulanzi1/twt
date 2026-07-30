// The `bulkExecute` harness unit tests — Story 10.6 (Task 2/6; AC2-AC7, AC8).
//
// Uses the fixture operation (fixtures.ts) throughout — the registry ships empty in production;
// only this test tree instantiates an operation. Covers: the dry-run parity invariant (AC7,
// byte-identical + the silent-divergence mutation proof), dry-run zero-side-effects (AC2),
// scope-respecting (AC3, incl. the deny-deeper geo pin), the 5k cap fail-closed in both modes
// (AC5), per-item-failure-does-not-roll-back (AC6), the shared batch_id → traceId on every
// execute audit line (AC4), unknown-operationType fail-closed (AC1), and the Review Findings
// hardening: the required `auditItem` seam in execute mode, the itemId-based collision fix, the
// 403 skip-status, per-item fault isolation for `targetLocatorOf`/`evaluate`/`csvRow`, and the
// real (non-overridden) 5001-item cap boundary.

import { describe, expect, it } from 'vitest';

import type { AuditEntryInput } from '../../src/audit/write.js';
import { bulkExecute, BULK_BATCH_CAP } from '../../src/bulk-operations/execute.js';
import {
  BulkAuditItemRequiredError,
  BulkBatchCapExceededError,
  UnknownBulkOperationError,
} from '../../src/bulk-operations/errors.js';
import { createBulkOperationRegistry } from '../../src/bulk-operations/registry.js';
import type { BulkExecuteOptions, BulkOperation } from '../../src/bulk-operations/types.js';
import {
  DISTRICT_ADMIN_PATNA_GRANT,
  STATE_TRUSTEE_BIHAR_GRANT,
  actorContext,
  createFixtureContextA,
  fixtureItemsA,
  fixtureOperationA,
  type FixtureItemA,
} from './fixtures.js';

function registryWithA() {
  const registry = createBulkOperationRegistry();
  registry.register(fixtureOperationA);
  return registry;
}

function auditCapture(): { calls: AuditEntryInput[]; auditItem: (input: AuditEntryInput) => Promise<void> } {
  const calls: AuditEntryInput[] = [];
  return {
    calls,
    auditItem: async (input) => {
      calls.push(input);
    },
  };
}

describe('bulkExecute — unknown operationType (AC1)', () => {
  it('throws UnknownBulkOperationError before touching any item, in both modes', async () => {
    const registry = createBulkOperationRegistry();
    const items = fixtureItemsA(3);
    const ctx = createFixtureContextA();
    const { auditItem } = auditCapture();
    for (const dryRun of [true, false]) {
      await expect(
        bulkExecute(registry, 'nonexistent.op', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
          dryRun,
          auditItem,
        }),
      ).rejects.toBeInstanceOf(UnknownBulkOperationError);
    }
    expect(ctx.applied).toEqual([]);
  });
});

describe('bulkExecute — execute mode requires an auditItem seam (Review Findings)', () => {
  it('throws BulkAuditItemRequiredError before touching any item when dryRun:false and no auditItem is supplied', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(3);
    const ctx = createFixtureContextA();
    await expect(
      bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
        dryRun: false,
      }),
    ).rejects.toBeInstanceOf(BulkAuditItemRequiredError);
    expect(ctx.applied).toEqual([]);
  });

  it('dry-run never requires auditItem', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(3);
    const ctx = createFixtureContextA();
    await expect(
      bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
        dryRun: true,
      }),
    ).resolves.toBeDefined();
  });
});

describe('bulkExecute — the 5k cap, fail-closed, before any item is processed (AC5)', () => {
  it('throws BulkBatchCapExceededError carrying {cap, actual} in dry-run', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(4);
    const ctx = createFixtureContextA();
    await expect(
      bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
        dryRun: true,
        cap: 3,
      }),
    ).rejects.toMatchObject({ cap: 3, actual: 4 });
  });

  it('throws BulkBatchCapExceededError in execute mode too — no partial execution, no auditItem required to reach it', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(4);
    const ctx = createFixtureContextA();
    await expect(
      bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
        dryRun: false,
        cap: 3,
      }),
    ).rejects.toBeInstanceOf(BulkBatchCapExceededError);
    // No item was applied and no audit line was written — the cap check runs before any work
    // (and before the auditItem-required check, so this rejects even without one supplied).
    expect(ctx.applied).toEqual([]);
  });

  it('honours the default BULK_BATCH_CAP (5000) when no override is supplied', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(1); // well under the default cap — must NOT throw
    const ctx = createFixtureContextA();
    await expect(
      bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
        dryRun: true,
      }),
    ).resolves.toBeDefined();
  });

  it('AC8: 5001 REAL items (no cap override) throw against the actual default BULK_BATCH_CAP, both modes', async () => {
    expect(BULK_BATCH_CAP).toBe(5000);
    const registry = registryWithA();
    const items = fixtureItemsA(BULK_BATCH_CAP + 1);
    const { auditItem } = auditCapture();

    await expect(
      bulkExecute(
        registry,
        'test.fixture_a',
        items,
        actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
        createFixtureContextA(),
        { dryRun: true },
      ),
    ).rejects.toMatchObject({ cap: BULK_BATCH_CAP, actual: BULK_BATCH_CAP + 1 });

    await expect(
      bulkExecute(
        registry,
        'test.fixture_a',
        items,
        actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
        createFixtureContextA(),
        { dryRun: false, auditItem },
      ),
    ).rejects.toBeInstanceOf(BulkBatchCapExceededError);
  });
});

describe('bulkExecute — dry-run: zero side effects (AC2)', () => {
  it('never calls apply and never invokes the auditItem seam', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(6);
    const ctx = createFixtureContextA();
    const { calls, auditItem } = auditCapture();

    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: true, auditItem },
    );

    expect(ctx.applied).toEqual([]);
    expect(calls).toEqual([]);
    expect(result.mode).toBe('dry_run');
    expect(result.previewCsv).toBeTruthy();
    expect(result.errorCsv).toBeUndefined();
  });

  it('reports per-item outcomes + aggregate counts matching the fixture parity rule', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(4); // ids 0,2 even -> would_succeed; 1,3 odd -> would_fail
    const ctx = createFixtureContextA();

    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: true },
    );

    expect(result.counts).toMatchObject({ total: 4, wouldSucceed: 2, wouldFail: 2, skipped: 0, succeeded: 0, failed: 0 });
    expect(result.items.map((i) => i.status)).toEqual(['would_succeed', 'would_fail', 'would_succeed', 'would_fail']);
  });
});

describe('bulkExecute — scope-respecting (AC3)', () => {
  it('an in-scope item is acted on', async () => {
    const registry = registryWithA();
    const items: FixtureItemA[] = [{ id: 'a-0', district: 'Patna', parity: 'even' }];
    const ctx = createFixtureContextA();
    const { auditItem } = auditCapture();
    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: false, auditItem },
    );
    expect(result.items[0]?.status).toBe('succeeded');
    expect(ctx.applied).toEqual(['a-0']);
  });

  it('an out-of-scope item (exact-node mismatch) is silently skipped WITH a count, evaluate never called', async () => {
    const registry = registryWithA();
    const items: FixtureItemA[] = [{ id: 'a-0', district: 'Vaishali', parity: 'even' }];
    const ctx = createFixtureContextA();
    const { auditItem } = auditCapture();
    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]), // grant is Patna-only
      ctx,
      { dryRun: false, auditItem },
    );
    expect(result.items[0]).toMatchObject({ status: 'skipped', reason: 'out_of_scope' });
    expect(result.counts.skipped).toBe(1);
    expect(ctx.applied).toEqual([]); // never became a candidate for apply
  });

  it('deny-deeper geo pin: a state-ceiling grant does not reach a district-level item (Epic-3 deferral)', async () => {
    const registry = registryWithA();
    const items: FixtureItemA[] = [{ id: 'a-0', district: 'Patna', parity: 'even' }];
    const ctx = createFixtureContextA();
    const { auditItem } = auditCapture();
    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([STATE_TRUSTEE_BIHAR_GRANT]), // state ceiling — broader than district, but denied by default resolver
      ctx,
      { dryRun: false, auditItem },
    );
    expect(result.items[0]).toMatchObject({ status: 'skipped', reason: 'out_of_scope' });
  });

  it('uses the per-item locator dimension for the scope check, not the operation-declared static scopeDimension (Review Findings)', async () => {
    // The operation's static `scopeDimension` is deliberately STALE ('pariwar'), but the real
    // per-item locator reports 'district' + value 'Patna', matching the district_admin grant
    // exactly. If the harness used `op.scopeDimension` (the bug this patches), a district-ceiling
    // grant checked against a 'pariwar' target is broader-than-grant → denied. Using the locator's
    // OWN dimension ('district'), the exact-node match succeeds — proving which one is actually
    // consulted.
    const staleDimensionOp: BulkOperation<{ id: string }, Record<string, never>> = {
      operationType: 'test.stale_scope_dimension',
      permissionKey: 'claim.approve',
      scopeDimension: 'pariwar', // declared, but intentionally NOT what targetLocatorOf reports
      auditAction: 'test.stale_scope_dimension_processed',
      targetLocatorOf: () => ({ dimension: 'district', value: 'Patna' }),
      evaluate: () => ({ outcome: 'would_succeed' }),
      apply: async () => undefined,
      csvRow: () => ({}),
    };
    const registry = createBulkOperationRegistry();
    registry.register(staleDimensionOp);
    const { auditItem } = auditCapture();

    const result = await bulkExecute(
      registry,
      'test.stale_scope_dimension',
      [{ id: 'x' }],
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      {},
      { dryRun: false, auditItem },
    );

    expect(result.items[0]?.status).toBe('succeeded');
  });
});

describe('bulkExecute — per-item failure does not roll back the batch (AC6)', () => {
  it('one apply throw is caught + recorded as failed; the rest of the batch still executes', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(4); // a-0 (even), a-1 (odd), a-2 (even), a-3 (odd)
    const ctx = createFixtureContextA(['a-2']); // a-2 would_succeed but apply throws
    const { auditItem } = auditCapture();
    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: false, auditItem },
    );

    expect(result.items.map((i) => i.status)).toEqual(['succeeded', 'failed', 'failed', 'failed']);
    // a-0 (the only surviving would_succeed item) still ran; a-2 failed but did not abort a-0/a-1/a-3.
    expect(ctx.applied).toEqual(['a-0']);
    expect(result.items[2]).toMatchObject({ status: 'failed', reason: expect.stringContaining('a-2') });
    expect(result.errorCsv).toContain('a-1');
    expect(result.errorCsv).toContain('a-2');
    expect(result.errorCsv).toContain('a-3');
    expect(result.errorCsv).not.toContain('a-0,');
  });
});

describe('bulkExecute — per-item fault isolation for operation-supplied code (Review Findings)', () => {
  it('a throw from targetLocatorOf/evaluate on one item is recorded as would_fail and does not abort the rest of the batch', async () => {
    const throwingOp: BulkOperation<{ id: string }, Record<string, never>> = {
      operationType: 'test.throws_on_locate',
      permissionKey: 'claim.approve',
      scopeDimension: 'district',
      auditAction: 'test.throws_on_locate_processed',
      targetLocatorOf: (item) => {
        if (item.id === 'bad') throw new Error('malformed item');
        return { dimension: 'district', value: 'Patna' };
      },
      evaluate: () => ({ outcome: 'would_succeed' }),
      apply: async () => undefined,
      csvRow: (item) => ({ id: item.id }),
    };
    const registry = createBulkOperationRegistry();
    registry.register(throwingOp);
    const { auditItem } = auditCapture();

    const result = await bulkExecute(
      registry,
      'test.throws_on_locate',
      [{ id: 'good-1' }, { id: 'bad' }, { id: 'good-2' }],
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      {},
      { dryRun: false, auditItem },
    );

    expect(result.items).toHaveLength(3);
    expect(result.items[0]?.status).toBe('succeeded');
    expect(result.items[1]?.status).toBe('failed');
    expect(result.items[1]?.reason).toContain('evaluation_error');
    expect(result.items[2]?.status).toBe('succeeded'); // the batch continued past the throwing item
  });

  it('a throw from csvRow (called after the loop, after audit already ran) does not lose the BulkResult', async () => {
    // evaluate → would_fail deterministically, so the item lands in errorCsv (status: 'failed')
    // and buildCsvRow is actually invoked for it — a would_succeed item that never reaches the
    // (execute-only, non-succeeded-only) error CSV would make this test vacuous.
    const throwingCsvOp: BulkOperation<{ id: string }, Record<string, never>> = {
      operationType: 'test.throws_on_csv_row',
      permissionKey: 'claim.approve',
      scopeDimension: 'district',
      auditAction: 'test.throws_on_csv_row_processed',
      targetLocatorOf: () => ({ dimension: 'district', value: 'Patna' }),
      evaluate: () => ({ outcome: 'would_fail', reason: 'always_fails' }),
      apply: async () => undefined,
      csvRow: () => {
        throw new Error('csvRow blew up');
      },
    };
    const registry = createBulkOperationRegistry();
    registry.register(throwingCsvOp);
    const { calls, auditItem } = auditCapture();

    const result = await bulkExecute(
      registry,
      'test.throws_on_csv_row',
      [{ id: 'x' }],
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      {},
      { dryRun: false, auditItem },
    );

    // The audit line already ran (step 4 fires for every processed item, before CSV building) —
    // a throw from csvRow, which only runs afterward, must not discard the result or the audit
    // trail already written.
    expect(calls).toHaveLength(1);
    expect(result.items[0]?.status).toBe('failed');
    expect(result.errorCsv).toContain('csvRow_failed');
    expect(result.errorCsv).toContain('csvRow blew up');
  });
});

describe('bulkExecute — audit: shared batch_id → traceId on every execute audit line (AC4)', () => {
  it('writes exactly one audit line per processed item, all sharing the same traceId, hashing the item payload', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(5);
    const ctx = createFixtureContextA();
    const { calls, auditItem } = auditCapture();

    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: false, auditItem },
    );

    expect(calls).toHaveLength(5);
    const traceIds = new Set(calls.map((c) => c.traceId));
    expect(traceIds.size).toBe(1);
    expect([...traceIds][0]).toBe(result.batchId);
    // Every item shares district: 'Patna' (a scope-locator collision) but has a distinct id —
    // itemId (Review Findings) keeps resourceLocator/requestPayloadHash distinct per item.
    const resourceLocators = new Set(calls.map((c) => c.resourceLocator));
    expect(resourceLocators.size).toBe(5);
    const payloadHashes = new Set(calls.map((c) => c.requestPayloadHash));
    expect(payloadHashes.size).toBe(5);
    for (const call of calls) {
      expect(call.action).toBe('test.fixture_a_processed');
      expect(call.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('writes an audit line even for a scope-skipped item (it was still processed), with responseStatus 403', async () => {
    const registry = registryWithA();
    const items: FixtureItemA[] = [{ id: 'a-0', district: 'Vaishali', parity: 'even' }];
    const ctx = createFixtureContextA();
    const { calls, auditItem } = auditCapture();

    await bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
      dryRun: false,
      auditItem,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.responseStatus).toBe(403);
  });

  it('records responseStatus 200 for succeeded and 422 for failed', async () => {
    const registry = registryWithA();
    const items = fixtureItemsA(2); // a-0 even (succeeds), a-1 odd (would_fail -> failed, no apply attempt)
    const ctx = createFixtureContextA();
    const { calls, auditItem } = auditCapture();

    await bulkExecute(registry, 'test.fixture_a', items, actorContext([DISTRICT_ADMIN_PATNA_GRANT]), ctx, {
      dryRun: false,
      auditItem,
    });

    expect(calls.map((c) => c.responseStatus)).toEqual([200, 422]);
  });
});

describe('bulkExecute — the dry-run parity invariant (AC7, load-bearing)', () => {
  it('produces byte-identical per-item ItemEvaluation arrays for the same frozen inputs across both modes', async () => {
    const items = fixtureItemsA(6);
    const grants = [DISTRICT_ADMIN_PATNA_GRANT];
    const { auditItem } = auditCapture();

    const preview = await bulkExecute(
      registryWithA(),
      'test.fixture_a',
      items,
      actorContext(grants),
      createFixtureContextA(),
      { dryRun: true, batchId: 'fixed-batch' },
    );
    const executed = await bulkExecute(
      registryWithA(),
      'test.fixture_a',
      items,
      actorContext(grants),
      createFixtureContextA(),
      { dryRun: false, batchId: 'fixed-batch', auditItem },
    );

    // The REVERT-SANITY teeth: comparing the stable-JSON serialization of the full per-item
    // evaluation array, not just aggregate counts. If bulkExecute were ever split into two
    // functions ("previewBulk" / "executeBulk") that happened to diverge in how they call
    // op.evaluate or the scope check, this exact assertion is what would fail.
    expect(JSON.stringify(executed.items.map((i) => i.evaluation))).toBe(
      JSON.stringify(preview.items.map((i) => i.evaluation)),
    );
  });

  it('silent divergence is structurally impossible: evaluate=would_succeed + apply throws surfaces as failed, never succeeded', async () => {
    const items: FixtureItemA[] = [{ id: 'a-0', district: 'Patna', parity: 'even' }]; // would_succeed
    const ctx = createFixtureContextA(['a-0']); // apply throws for this id
    const { auditItem } = auditCapture();
    const result = await bulkExecute(
      registryWithA(),
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctx,
      { dryRun: false, auditItem },
    );

    expect(result.items[0]?.evaluation).toEqual({ outcome: 'would_succeed' });
    expect(result.items[0]?.status).toBe('failed'); // never 'succeeded' despite the would_succeed evaluation
    expect(result.errorCsv).toContain('a-0');
  });

  it('surfaces a concurrent-state divergence when execute-time evaluation differs from the preview prediction', async () => {
    const previewItem: FixtureItemA = { id: 'a-0', district: 'Patna', parity: 'even' }; // predicted would_succeed
    const changedItem: FixtureItemA = { id: 'a-0', district: 'Patna', parity: 'odd' }; // now would_fail (concurrent change)
    // Keyed by itemId ('a-0'), not the (shared) district locator — Review Findings.
    const expectedOutcomes: BulkExecuteOptions['expectedOutcomes'] = { 'a-0': { outcome: 'would_succeed' } };
    const { auditItem } = auditCapture();

    const result = await bulkExecute(
      registryWithA(),
      'test.fixture_a',
      [changedItem],
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      createFixtureContextA(),
      { dryRun: false, expectedOutcomes, auditItem },
    );

    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0]).toMatchObject({
      itemRef: 'a-0',
      expected: { outcome: 'would_succeed' },
      actual: { outcome: 'would_fail', reason: 'odd_id' },
    });
    void previewItem; // documents the "preview predicted X" half of the scenario for the reader
  });

  it('two distinct items sharing a scope node (district) no longer collide on itemRef (Review Findings regression proof)', async () => {
    // Both items are in district 'Patna' — under the pre-fix behavior (itemRef = locator.value)
    // both would resolve to the SAME itemRef ('Patna'), colliding in expectedOutcomes lookup and
    // in the audit resourceLocator/requestPayloadHash. itemId ('a-0'/'a-2') keeps them distinct.
    const items: FixtureItemA[] = [
      { id: 'a-0', district: 'Patna', parity: 'even' },
      { id: 'a-2', district: 'Patna', parity: 'even' },
    ];
    const expectedOutcomes: BulkExecuteOptions['expectedOutcomes'] = {
      'a-0': { outcome: 'would_succeed' },
      'a-2': { outcome: 'would_fail', reason: 'changed' }, // deliberately wrong prediction for a-2 only
    };
    const { auditItem } = auditCapture();

    const result = await bulkExecute(
      registryWithA(),
      'test.fixture_a',
      items,
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      createFixtureContextA(),
      { dryRun: false, expectedOutcomes, auditItem },
    );

    // Only a-2's prediction was wrong — a-0's correct prediction produces NO divergence, proving
    // the two items were compared against their OWN expected outcome, not a shared one.
    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0]?.itemRef).toBe('a-2');
  });
});
