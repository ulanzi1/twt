// packages/contracts/tests/type-assignability.test.ts
//
// Per architecture §1.3 line 787-790 + §Naming patterns line 3719-3723.
//
// Asserts that the contract-layer Zod schemas in packages/contracts/ stay
// assignable from the Drizzle-inferred row types in packages/domain/. A
// future Drizzle schema change that diverges from a contract type fails
// typecheck here.
//
// At Story 1.4 there's only one Drizzle schema in-tree (events_log from
// Story 1.3); downstream Stories authoring per-domain Drizzle schemas
// extend this file with their per-domain assertions.

import { describe, it, expect } from 'vitest';
import { schema } from '@twt/domain';
import {
  EventLogContract,
  type EventLogContract as EventLogContractType,
} from '../src/_common/event-log-contract.js';

// Inferred Drizzle row type (Story 1.3 events_log table).
type EventLogRow = typeof schema.eventsLog.$inferSelect;

// Compile-time mapping from the Drizzle row to the wire-shape contract.
// The wire shape serializes `occurredAt` as Iso8601 string (Drizzle row is
// JS Date) — so the assertion narrows the wire-shape to a structurally
// compatible projection of the Drizzle row. If a future Drizzle column
// changes type or is removed, this projection fails at typecheck.
type EventLogWireProjection = Omit<EventLogRow, 'occurredAt'> & {
  occurredAt: string;
};

// Architecture-canonical direction (architecture §1.3 line 787-790):
// "contract types are assignable from inferred Drizzle types". A Drizzle row
// (serialized at the transport boundary so `occurredAt` becomes Iso8601 string)
// must satisfy the contract. The reverse direction is NOT required — the
// contract MAY be a relaxed superset (additional optional fields, looser
// constraints) that doesn't roundtrip back through Drizzle without info loss.
type _AssertWireFromDrizzle =
  EventLogWireProjection extends EventLogContractType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

describe('contract-↔-domain type assignability (Story 1.4 scaffold; per architecture §1.3 + §Naming patterns)', () => {
  it('EventLogContract (packages/contracts) parses a Drizzle-shaped row', () => {
    const sample: EventLogRow = {
      eventId: '00000000-0000-0000-0000-000000000001',
      streamId: '00000000-0000-0000-0000-000000000002',
      eventType: 'member.signup_initiated',
      payload: { version: 'v1' },
      eventVersion: 1,
      occurredAt: new Date('2026-06-09T00:00:00.000Z'),
      actorId: null,
      pariwarId: '00000000-0000-0000-0000-000000000003',
    };
    // The transport boundary in apps/api will serialize Date → Iso8601 string.
    const wire = { ...sample, occurredAt: sample.occurredAt.toISOString() };
    const parsed = EventLogContract.parse(wire);
    expect(parsed.eventId).toBe(sample.eventId);
    expect(parsed.eventType).toBe(sample.eventType);
    expect(parsed.eventVersion).toBe(1);
    expect(parsed.actorId).toBeNull();
  });

  it('EventLogContract rejects a wire payload missing pariwarId (multi-tenant scoping discipline)', () => {
    const malformedWire = {
      eventId: '00000000-0000-0000-0000-000000000001',
      streamId: '00000000-0000-0000-0000-000000000002',
      eventType: 'member.signup_initiated',
      payload: { version: 'v1' },
      eventVersion: 1,
      occurredAt: '2026-06-09T00:00:00.000Z',
      actorId: null,
      // pariwarId missing — architecture §1.2 multi-tenant invariant
    };
    const result = EventLogContract.safeParse(malformedWire);
    expect(result.success).toBe(false);
  });

  it('EventLogContract rejects unknown wire keys (.strict() discipline)', () => {
    const wireWithExtra = {
      eventId: '00000000-0000-0000-0000-000000000001',
      streamId: '00000000-0000-0000-0000-000000000002',
      eventType: 'member.signup_initiated',
      payload: { version: 'v1' },
      eventVersion: 1,
      occurredAt: '2026-06-09T00:00:00.000Z',
      actorId: null,
      pariwarId: '00000000-0000-0000-0000-000000000003',
      __unexpected: 'should-be-rejected',
    };
    const result = EventLogContract.safeParse(wireWithExtra);
    expect(result.success).toBe(false);
  });
});
