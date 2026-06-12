// Exhaustive unit tests for the audit hash-chain primitives (Story 1.10 Task 5.3,
// AC-5/AC-6). Pure functions, no DB. This is the shared primitive Story 1.11a's
// scheduled integrity-check job consumes — so the tamper-detection contract is
// pinned down here.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AuditLogEntryRow } from '../../src/schema/audit_log_entries';
import {
  GENESIS_PREV_HASH,
  auditRowDigestInput,
  computeAuditHash,
  verifyChainSegment,
} from '../../src/audit/hash-chain';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

/** Build the chain content for row `seq` (deterministic, no DB). */
function makeContent(seq: number): Omit<AuditLogEntryRow, 'prevAuditHash' | 'auditHash'> {
  return {
    auditId: randomUUID(),
    seq,
    pariwarId: PARIWAR as AuditLogEntryRow['pariwarId'],
    actorId: seq % 2 === 0 ? randomUUID() : null,
    actorRole: seq % 2 === 0 ? 'trustee' : null,
    action: `test.action_${seq}`,
    resourceLocator: `res/${seq}`,
    requestPayloadHash: `payloadhash_${seq}`,
    responseStatus: 200,
    recordedAt: new Date(1_700_000_000_000 + seq * 1000),
    traceId: seq % 3 === 0 ? `trace-${seq}` : null,
  };
}

/** Build a valid chain of N rows (genesis prev = NULL, then linked). */
function buildValidChain(n: number): AuditLogEntryRow[] {
  const rows: AuditLogEntryRow[] = [];
  let prev: string | null = null;
  for (let seq = 1; seq <= n; seq++) {
    const content = makeContent(seq);
    const prevFeed = prev ?? GENESIS_PREV_HASH;
    const auditHash = computeAuditHash(prevFeed, content);
    rows.push({ ...content, prevAuditHash: prev, auditHash });
    prev = auditHash;
  }
  return rows;
}

describe('GENESIS_PREV_HASH', () => {
  it('is 64 hex zeros (a sentinel distinct from any real SHA-256 digest position)', () => {
    expect(GENESIS_PREV_HASH).toBe('0'.repeat(64));
  });
});

describe('auditRowDigestInput', () => {
  it('excludes audit_hash, prev_audit_hash, and seq (DB-assigned/output fields)', () => {
    const row = buildValidChain(1)[0]!;
    const input = auditRowDigestInput(row) as Record<string, unknown>;
    expect(input).not.toHaveProperty('auditHash');
    expect(input).not.toHaveProperty('audit_hash');
    expect(input).not.toHaveProperty('prevAuditHash');
    expect(input).not.toHaveProperty('seq');
  });

  it('projects recordedAt to a stable ISO string (Date is not canonical-JSON-representable)', () => {
    const row = buildValidChain(1)[0]!;
    const input = auditRowDigestInput(row) as Record<string, unknown>;
    expect(input['recordedAt']).toBe(row.recordedAt.toISOString());
  });

  it('is deterministic — same content yields identical projection', () => {
    const row = buildValidChain(1)[0]!;
    expect(JSON.stringify(auditRowDigestInput(row))).toBe(
      JSON.stringify(auditRowDigestInput(row)),
    );
  });
});

describe('computeAuditHash', () => {
  it('returns a 64-char lowercase hex SHA-256 digest', () => {
    const row = buildValidChain(1)[0]!;
    const h = computeAuditHash(GENESIS_PREV_HASH, row);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any chained field changes (avalanche)', () => {
    const row = buildValidChain(1)[0]!;
    const baseline = computeAuditHash(GENESIS_PREV_HASH, row);
    const mutated = computeAuditHash(GENESIS_PREV_HASH, { ...row, action: 'tampered' });
    expect(mutated).not.toBe(baseline);
  });

  it('changes when the prev-hash feed changes (chain linkage is load-bearing)', () => {
    const row = buildValidChain(1)[0]!;
    const a = computeAuditHash(GENESIS_PREV_HASH, row);
    const b = computeAuditHash('a'.repeat(64), row);
    expect(a).not.toBe(b);
  });
});

describe('verifyChainSegment', () => {
  it('empty segment is vacuously valid', () => {
    expect(verifyChainSegment([])).toEqual({ chainValid: true, firstBrokenSeq: null });
  });

  it('genesis-only (single row, prev = NULL) verifies', () => {
    expect(verifyChainSegment(buildValidChain(1))).toEqual({
      chainValid: true,
      firstBrokenSeq: null,
    });
  });

  it('N-row valid chain from genesis verifies', () => {
    expect(verifyChainSegment(buildValidChain(7))).toEqual({
      chainValid: true,
      firstBrokenSeq: null,
    });
  });

  it('a mid-chain SEGMENT not starting at genesis verifies (prev is a real hash)', () => {
    const full = buildValidChain(7);
    const segment = full.slice(3); // rows seq 4..7; row[0].prevAuditHash is a real hash
    expect(segment[0]!.prevAuditHash).not.toBeNull();
    expect(verifyChainSegment(segment)).toEqual({
      chainValid: true,
      firstBrokenSeq: null,
    });
  });

  it('detects a single mutated field and identifies the offending row (AC-5)', () => {
    const rows = buildValidChain(5);
    rows[2] = { ...rows[2]!, action: 'TAMPERED' }; // seq 3, audit_hash now stale
    expect(verifyChainSegment(rows)).toEqual({ chainValid: false, firstBrokenSeq: 3 });
  });

  it('detects a forged audit_hash', () => {
    const rows = buildValidChain(4);
    rows[1] = { ...rows[1]!, auditHash: 'f'.repeat(64) }; // seq 2
    const result = verifyChainSegment(rows);
    expect(result.chainValid).toBe(false);
    expect(result.firstBrokenSeq).toBe(2);
  });

  it('detects a deleted middle row via broken linkage (AC-5)', () => {
    const rows = buildValidChain(5);
    rows.splice(2, 1); // remove seq 3; seq 4 now follows seq 2 but links to seq 3's hash
    const result = verifyChainSegment(rows);
    expect(result.chainValid).toBe(false);
    expect(result.firstBrokenSeq).toBe(4); // first row whose linkage is inconsistent
  });

  it('detects reordered rows via broken linkage', () => {
    const rows = buildValidChain(5);
    [rows[1], rows[2]] = [rows[2]!, rows[1]!]; // swap seq 2 and seq 3 in the array
    const result = verifyChainSegment(rows);
    expect(result.chainValid).toBe(false);
  });

  it('reports the FIRST break when multiple rows are tampered', () => {
    const rows = buildValidChain(6);
    rows[3] = { ...rows[3]!, action: 'x' }; // seq 4
    rows[1] = { ...rows[1]!, action: 'y' }; // seq 2 (earlier)
    expect(verifyChainSegment(rows).firstBrokenSeq).toBe(2);
  });
});
