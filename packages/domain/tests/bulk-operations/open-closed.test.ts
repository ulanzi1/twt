// AC7b — the Open/Closed invariant proof (Load-Bearing Decision 5). `bulkExecute` must depend
// ONLY on the `BulkOperation` contract + the registry lookup, never on a specific `operationType`
// value. Two DELIBERATELY divergent fixture operations (different item shape, evaluate rule,
// apply side effect, csvRow projection) flow through the SAME unchanged harness — proving every
// behavior difference comes from the contract, none from a harness branch.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { bulkExecute } from '../../src/bulk-operations/execute.js';
import { createBulkOperationRegistry } from '../../src/bulk-operations/registry.js';
import {
  DISTRICT_ADMIN_PATNA_GRANT,
  actorContext,
  createFixtureContextA,
  createFixtureContextB,
  fixtureItemsA,
  fixtureItemsB,
  fixtureOperationA,
  fixtureOperationB,
} from './fixtures.js';

const noopAuditItem = async (): Promise<void> => undefined;

describe('AC7b — the harness treats two divergent operations identically', () => {
  it('fixture A (parity-rule evaluate, id-keyed apply) flows through the unchanged harness', async () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    registry.register(fixtureOperationB);

    const ctxA = createFixtureContextA();
    const result = await bulkExecute(
      registry,
      'test.fixture_a',
      fixtureItemsA(4),
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctxA,
      { dryRun: false, auditItem: noopAuditItem },
    );

    expect(result.items.map((i) => i.status)).toEqual(['succeeded', 'failed', 'succeeded', 'failed']);
    expect(ctxA.applied).toEqual(['a-0', 'a-2']);
  });

  it('fixture B (tier-threshold evaluate, tier-tracking apply, different csvRow columns) flows through the SAME unchanged harness', async () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    registry.register(fixtureOperationB);

    const ctxB = createFixtureContextB();
    const result = await bulkExecute(
      registry,
      'test.fixture_b',
      fixtureItemsB(10), // tiers 0..9; >=5 -> would_succeed
      actorContext([DISTRICT_ADMIN_PATNA_GRANT]),
      ctxB,
      { dryRun: false, auditItem: noopAuditItem },
    );

    expect(result.counts).toMatchObject({ total: 10, succeeded: 5, failed: 5, skipped: 0 });
    expect(ctxB.appliedTiers.sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 9]);
    // Distinct csvRow columns from fixture A prove the CSV content is operation-owned, not harness-owned.
    expect(result.errorCsv).toContain('itemId');
    expect(result.errorCsv).toContain('tier');
  });

  it('both operations coexist in ONE registry with zero cross-contamination', async () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    registry.register(fixtureOperationB);
    expect(registry.get('test.fixture_a')).toBe(fixtureOperationA);
    expect(registry.get('test.fixture_b')).toBe(fixtureOperationB);
  });

  // Structural teeth for the code-review invariant ("a harness operationType string-literal
  // comparison is a review-blocking regression"): assert the harness source contains no
  // comparison against a literal operationType value. This is the mechanical form of "the harness
  // never branches on operation identity" — a future PR that adds `if (operationType === '...')`
  // or `if (op.operationType === '...')` inside execute.ts fails this test immediately.
  it('execute.ts contains no operationType string-literal comparison (structural Open/Closed check)', () => {
    const executeSourcePath = fileURLToPath(
      new URL('../../src/bulk-operations/execute.ts', import.meta.url),
    );
    const source = readFileSync(executeSourcePath, 'utf8');
    expect(source).not.toMatch(/operationType\s*===\s*['"]/);
    expect(source).not.toMatch(/op\.operationType/);
  });
});
