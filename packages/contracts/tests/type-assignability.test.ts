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
import {
  AuditIntegrityCheckRequest,
  AuditIntegrityCheckResult,
  type AuditIntegrityCheckResult as AuditIntegrityCheckResultType,
} from '../src/audit/integrity-check.js';

// Inferred Drizzle row type (Story 1.3 events_log table).
type EventLogRow = typeof schema.eventsLog.$inferSelect;

// Inferred Drizzle row type (Story 1.11a audit_integrity_checks table). The wire
// shape serializes `verifiedAt` as Iso8601 string (Drizzle row is JS Date); the
// projection narrows the row to a structurally compatible wire shape. A future
// Drizzle column change that diverges from the contract fails typecheck here
// (architecture §1.3 line 787-790: contract types are assignable FROM Drizzle).
type AuditIntegrityCheckRow = typeof schema.auditIntegrityChecks.$inferSelect;
type AuditIntegrityCheckWireProjection = Omit<AuditIntegrityCheckRow, 'verifiedAt'> & {
  verifiedAt: string;
};
type _AssertAuditIntegrityWireFromDrizzle =
  AuditIntegrityCheckWireProjection extends AuditIntegrityCheckResultType ? true : never;
const _auditIntegrityWireFromDrizzle: _AssertAuditIntegrityWireFromDrizzle = true;
void _auditIntegrityWireFromDrizzle;

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

describe('AuditIntegrityCheckResult (packages/contracts) — Story 1.11a', () => {
  it('parses a Drizzle-shaped intact-chain verdict (verifiedAt serialized to ISO)', () => {
    const row: AuditIntegrityCheckRow = {
      checkId: '00000000-0000-0000-0000-0000000000a1',
      verifiedAt: new Date('2026-06-14T02:00:00.000Z'),
      chainValid: true,
      startSeq: 1,
      startAuditId: '00000000-0000-0000-0000-0000000000b1',
      endSeq: 42,
      endAuditId: '00000000-0000-0000-0000-0000000000b2',
      firstBrokenSeq: null,
      firstBrokenAuditId: null,
      rowsVerified: 42,
      verifierActor: 'on-demand:00000000-0000-0000-0000-0000000000c1',
      triggerSource: 'on_demand',
    };
    const wire = { ...row, verifiedAt: row.verifiedAt.toISOString() };
    const parsed = AuditIntegrityCheckResult.parse(wire);
    expect(parsed.chainValid).toBe(true);
    expect(parsed.firstBrokenSeq).toBeNull();
    expect(parsed.rowsVerified).toBe(42);
  });

  it('parses a broken-chain verdict (first_broken_* populated, empty boundaries allowed)', () => {
    const wire = {
      checkId: '00000000-0000-0000-0000-0000000000a2',
      verifiedAt: '2026-06-14T02:00:00.000Z',
      chainValid: false,
      startSeq: 1,
      startAuditId: '00000000-0000-0000-0000-0000000000b1',
      endSeq: 6,
      endAuditId: '00000000-0000-0000-0000-0000000000b6',
      firstBrokenSeq: 7,
      firstBrokenAuditId: '00000000-0000-0000-0000-0000000000b7',
      rowsVerified: 6,
      verifierActor: 'cron',
      triggerSource: 'cron',
    };
    expect(AuditIntegrityCheckResult.parse(wire).firstBrokenSeq).toBe(7);
  });

  it('rejects unknown wire keys (.strict() discipline)', () => {
    const wire = {
      checkId: '00000000-0000-0000-0000-0000000000a3',
      verifiedAt: '2026-06-14T02:00:00.000Z',
      chainValid: true,
      startSeq: null,
      startAuditId: null,
      endSeq: null,
      endAuditId: null,
      firstBrokenSeq: null,
      firstBrokenAuditId: null,
      rowsVerified: 0,
      verifierActor: 'cron',
      triggerSource: 'cron',
      __unexpected: 'should-be-rejected',
    };
    expect(AuditIntegrityCheckResult.safeParse(wire).success).toBe(false);
  });

  it('AuditIntegrityCheckRequest accepts {} and rejects extra keys', () => {
    expect(AuditIntegrityCheckRequest.safeParse({}).success).toBe(true);
    expect(AuditIntegrityCheckRequest.safeParse({ range: 'all' }).success).toBe(false);
  });
});
