// Cache-key composition tests — Story 4.1 (Task 8, DB-free).
//
// The idempotency memo key must be deterministic AND change when any bound input
// changes. Covers: stable composition, the single-version fast path (the version id
// itself), and the >1-version hash path (snapshot resolution resolves 2 clauses).

import { ids } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { buildCacheKey, memberStateHash, niyamavaliVersionHash } from '../src/index.js';

const V1 = ids.clauseVersionId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
const V2 = ids.clauseVersionId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

describe('niyamavaliVersionHash', () => {
  it('returns the single resolved version id verbatim (fast path)', () => {
    expect(niyamavaliVersionHash([V1])).toBe(V1);
  });

  it('hashes ALL versions (order-independent) when more than one is resolved', () => {
    const h1 = niyamavaliVersionHash([V1, V2]);
    const h2 = niyamavaliVersionHash([V2, V1]);
    expect(h1).toBe(h2); // sorted before hashing
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(V1);
  });
});

describe('memberStateHash', () => {
  it('is deterministic and fact-order independent', () => {
    const a = memberStateHash('active', { x: 1, y: 2 });
    const b = memberStateHash('active', { y: 2, x: 1 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when the state changes', () => {
    expect(memberStateHash('active', {})).not.toBe(memberStateHash('lapsed-unpaid', {}));
  });
});

describe('buildCacheKey', () => {
  it('composes the v1 rule-eval key shape', () => {
    const key = buildCacheKey({
      pariwarId: ids.pariwarId('11111111-1111-1111-1111-111111111111'),
      memberId: ids.memberId('22222222-2222-2222-2222-222222222222'),
      clauseId: ids.clauseId('niy.test.r1'),
      evaluationTimestampIso: '2025-06-01T00:00:00.000Z',
      memberStateHash: 'a'.repeat(64),
      niyamavaliVersionHash: V1,
    });
    expect(key).toBe(
      `rule-eval:v1:11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222:niy.test.r1:2025-06-01T00:00:00.000Z:${'a'.repeat(64)}:${V1}`,
    );
  });
});
