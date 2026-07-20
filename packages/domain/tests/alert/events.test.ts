// Alert event payload schemas — DB-free unit tests (Story 8.1, Task 2; AC1/AC3/AC4).
// Proves .strict() rejection of unknown keys, the audit-shape contract, the genesis
// pool_ids/pool_count invariant, the attestation reuse, and the AC4 time_critical field.

import { describe, expect, it } from 'vitest';

import {
  ALERT_EVENT_PAYLOAD_SCHEMAS,
  ALERT_EVENT_TYPES,
  AlertFrozenPayloadSchema,
  AlertLivePayloadSchema,
  AlertPublishedPayloadSchema,
} from '../../src/alert/events.js';

const ATTESTATION = {
  actor_id: 'trustee-actor-1',
  actor_display: 'Trustee One',
  committed_at: '2026-07-15T06:00:00.000Z',
};

const frozenBase = {
  from_state: 'draft' as const,
  to_state: 'frozen' as const,
  trigger: 'cycle.frozen:cycle_open',
  actor: 'system' as const,
  cycle_id: '0e87b4b8-8fff-459d-817c-dd46e46848dc',
  pariwar_id: '11111111-1111-1111-1111-111111111111',
  pool_count: 2,
  pool_ids: [
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  ],
  attestation: ATTESTATION,
};

describe('alert event vocabulary', () => {
  it('exposes exactly the 5 alert.* lifecycle event types with a schema each', () => {
    expect([...ALERT_EVENT_TYPES]).toEqual([
      'alert.frozen',
      'alert.published',
      'alert.live',
      'alert.closed',
      'alert.settled',
    ]);
    for (const t of ALERT_EVENT_TYPES) {
      expect(ALERT_EVENT_PAYLOAD_SCHEMAS[t]).toBeDefined();
    }
  });
});

describe('AlertFrozenPayloadSchema (genesis)', () => {
  it('accepts a well-formed genesis payload with the copied attestation', () => {
    expect(() => AlertFrozenPayloadSchema.parse(frozenBase)).not.toThrow();
  });

  it('rejects an unknown key (.strict())', () => {
    expect(() => AlertFrozenPayloadSchema.parse({ ...frozenBase, extra: 'nope' })).toThrow();
  });

  it('rejects a pool_ids length that disagrees with pool_count', () => {
    expect(() => AlertFrozenPayloadSchema.parse({ ...frozenBase, pool_count: 3 })).toThrow(/pool_ids length/);
  });

  it('rejects a duplicated pool id even when the length matches pool_count (Review Finding)', () => {
    expect(() =>
      AlertFrozenPayloadSchema.parse({
        ...frozenBase,
        pool_ids: [frozenBase.pool_ids[0]!, frozenBase.pool_ids[0]!],
      }),
    ).toThrow(/pool_ids must be distinct/);
  });

  it('rejects a malformed attestation (missing committed_at)', () => {
    expect(() =>
      AlertFrozenPayloadSchema.parse({
        ...frozenBase,
        attestation: { actor_id: 'x', actor_display: 'y' },
      }),
    ).toThrow();
  });

  it('rejects a member actor (alert lifecycle is system/operator/trustee only)', () => {
    expect(() => AlertFrozenPayloadSchema.parse({ ...frozenBase, actor: 'member' })).toThrow();
  });
});

describe('AlertPublishedPayloadSchema (AC4 time_critical)', () => {
  const base = {
    from_state: 'frozen' as const,
    to_state: 'published' as const,
    trigger: 'cycle.frozen:cycle_open',
    actor: 'system' as const,
    time_critical: false,
  };

  it('requires the time_critical boolean signal', () => {
    expect(() => AlertPublishedPayloadSchema.parse(base)).not.toThrow();
    expect(() => AlertPublishedPayloadSchema.parse({ ...base, time_critical: true })).not.toThrow();
    const { time_critical: _omit, ...withoutSignal } = base;
    void _omit;
    expect(() => AlertPublishedPayloadSchema.parse(withoutSignal)).toThrow();
  });

  it('rejects an unknown key (.strict())', () => {
    expect(() => AlertPublishedPayloadSchema.parse({ ...base, sms: true })).toThrow();
  });
});

describe('AlertLivePayloadSchema (audit-shape only)', () => {
  it('accepts the bare audit shape and rejects unknown keys', () => {
    const base = {
      from_state: 'published' as const,
      to_state: 'live' as const,
      trigger: 'cycle.frozen:cycle_open',
      actor: 'system' as const,
    };
    expect(() => AlertLivePayloadSchema.parse(base)).not.toThrow();
    expect(() => AlertLivePayloadSchema.parse({ ...base, foo: 1 })).toThrow();
  });
});
