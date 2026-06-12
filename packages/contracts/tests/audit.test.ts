// packages/contracts/tests/audit.test.ts
//
// Story 1.10 (AC-1). Asserts AuditLogEntryContract stays assignable from the
// Drizzle-inferred audit_log_entries row (the transport boundary serializes
// recordedAt Date → Iso8601 string), enforces .strict(), and keeps the
// multi-tenant pariwarId required. Standalone — NOT coupled to EventLogContract
// (D13-1.4): the column sets differ (seq / prevAuditHash / auditHash).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  AuditLogEntryContract,
  type AuditLogEntryContract as AuditLogEntryContractType,
} from '../src/audit/index.js';

type AuditLogEntryRow = typeof schema.auditLogEntries.$inferSelect;

// Wire projection: recordedAt is an Iso8601 string at the transport boundary
// (the Drizzle row holds a JS Date). If a future Drizzle column changes type or
// is removed, this projection fails at typecheck.
type AuditLogWireProjection = Omit<AuditLogEntryRow, 'recordedAt'> & {
  recordedAt: string;
};

// Architecture-canonical direction (§1.3 L787-790): contract types are
// assignable from inferred Drizzle types (serialized at the boundary).
type _AssertWireFromDrizzle =
  AuditLogWireProjection extends AuditLogEntryContractType ? true : never;
const _wireFromDrizzle: _AssertWireFromDrizzle = true;
void _wireFromDrizzle;

function sampleRow(): AuditLogEntryRow {
  return {
    auditId: '00000000-0000-0000-0000-000000000001',
    seq: 42,
    pariwarId: '00000000-0000-0000-0000-000000000003' as AuditLogEntryRow['pariwarId'],
    actorId: null,
    actorRole: null,
    action: 'claim.approve',
    resourceLocator: 'claim/abc',
    requestPayloadHash: 'a'.repeat(64),
    responseStatus: 200,
    prevAuditHash: null, // genesis
    auditHash: 'b'.repeat(64),
    recordedAt: new Date('2026-06-12T00:00:00.000Z'),
    traceId: null,
  };
}

describe('AuditLogEntryContract (Story 1.10, AC-1)', () => {
  it('parses a Drizzle-shaped row (recordedAt serialized to ISO)', () => {
    const row = sampleRow();
    const wire = { ...row, recordedAt: row.recordedAt.toISOString() };
    const parsed = AuditLogEntryContract.parse(wire);
    expect(parsed.auditId).toBe(row.auditId);
    expect(parsed.seq).toBe(42);
    expect(parsed.prevAuditHash).toBeNull();
    expect(parsed.auditHash).toBe('b'.repeat(64));
  });

  it('rejects a wire payload missing pariwarId (multi-tenant scoping discipline)', () => {
    const row = sampleRow();
    const { pariwarId: _omit, ...rest } = row;
    void _omit;
    const wire = { ...rest, recordedAt: row.recordedAt.toISOString() };
    expect(AuditLogEntryContract.safeParse(wire).success).toBe(false);
  });

  it('rejects unknown wire keys (.strict() discipline)', () => {
    const row = sampleRow();
    const wire = {
      ...row,
      recordedAt: row.recordedAt.toISOString(),
      __unexpected: 'should-be-rejected',
    };
    expect(AuditLogEntryContract.safeParse(wire).success).toBe(false);
  });

  it('accepts a non-genesis row (prevAuditHash present)', () => {
    const row = { ...sampleRow(), prevAuditHash: 'c'.repeat(64) };
    const wire = { ...row, recordedAt: row.recordedAt.toISOString() };
    expect(AuditLogEntryContract.safeParse(wire).success).toBe(true);
  });
});
