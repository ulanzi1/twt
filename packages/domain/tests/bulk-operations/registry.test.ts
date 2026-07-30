// Bulk-operation registry unit tests — Story 10.6 (Task 1/6; AC1, AC8).

import { describe, expect, it } from 'vitest';

import { DuplicateBulkOperationError } from '../../src/bulk-operations/errors.js';
import { createBulkOperationRegistry } from '../../src/bulk-operations/registry.js';
import { createFixtureContextA, fixtureOperationA, fixtureOperationB } from './fixtures.js';

describe('createBulkOperationRegistry', () => {
  it('ships seeded empty — an unregistered operationType resolves to undefined', () => {
    const registry = createBulkOperationRegistry();
    expect(registry.get('anything')).toBeUndefined();
  });

  it('resolves a registered operation by its operationType', () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    expect(registry.get('test.fixture_a')).toBe(fixtureOperationA);
  });

  it('is a fresh, independent instance per call — registering in one never leaks into another', () => {
    const a = createBulkOperationRegistry();
    const b = createBulkOperationRegistry();
    a.register(fixtureOperationA);
    expect(b.get('test.fixture_a')).toBeUndefined();
  });

  it('throws DuplicateBulkOperationError on a second registration of the same operationType (Review Findings)', () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    expect(() => registry.register(fixtureOperationA)).toThrow(DuplicateBulkOperationError);
    // The original registration survives untouched — no silent overwrite occurred.
    expect(registry.get('test.fixture_a')).toBe(fixtureOperationA);
  });

  it('a distinct operationType registers fine alongside an existing one', () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    expect(() => registry.register(fixtureOperationB)).not.toThrow();
    expect(registry.get('test.fixture_b')).toBe(fixtureOperationB);
  });

  // Exercises the fixture's own contract shape end-to-end (registration + lookup + evaluate),
  // independent of bulkExecute — a sanity check that the fixture itself is well-formed.
  it('a registered fixture evaluates as expected once resolved from the registry', () => {
    const registry = createBulkOperationRegistry();
    registry.register(fixtureOperationA);
    const resolved = registry.get<Parameters<typeof fixtureOperationA.evaluate>[0], ReturnType<typeof createFixtureContextA>>(
      'test.fixture_a',
    );
    expect(resolved).toBeDefined();
    expect(resolved?.evaluate({ id: 'a-0', district: 'Patna', parity: 'even' }, createFixtureContextA())).toEqual({
      outcome: 'would_succeed',
    });
  });
});
