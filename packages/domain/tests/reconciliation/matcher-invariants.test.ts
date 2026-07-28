// Matcher invariants — DB-free teeth (Story 9.4, Task 6; AC5b/AC7). The structural half of the
// monotonic-confirmation invariant + the reason-vocabulary drift guard + the verdict-payload schemas.
//
// These are the "teeth, not a green scan" ([[feedback_gate_scope_semantic_coverage]]): the no-reversal-
// emitter structural test source-scans the matcher's write + worker code and fails if either references the
// reversal event type — revert-sanity proven (plant a `RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE`
// reference in either file → this goes RED → revert → GREEN).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MATCH_MISMATCH_REASONS,
} from '../../src/reconciliation/matcher.js';
import {
  CONTRIBUTION_MISMATCH_REASONS,
  ContributionConfirmedPayloadSchema,
  ContributionReconciliationMismatchPayloadSchema,
} from '../../src/contribution/events.js';
import {
  RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
  ReconciliationConfirmationReversedPayloadSchema,
} from '../../src/reconciliation/events.js';
import { mapParsedEntriesToRows } from '../../src/reconciliation/entries.js';
import type { BankStatementEntry } from '../../src/bank-statement/schema.js';
import * as matcherWrite from '../../src/reconciliation/matcher-write.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** Strip block + line comments so the scan sees CODE only (the header prose legitimately explains WHY the
 *  matcher never emits the reversal — that must not read as an emitter). */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ── AC5b — the matcher NEVER emits a reversal (structural) ────────────────────────────────────────────

describe('AC5b — the matcher path has NO reversal emitter (the monotonic invariant, structural)', () => {
  it('the verdict-write module exports exactly the two forward emitters + no reversal writer', () => {
    const fnExports = Object.keys(matcherWrite).filter(
      (k) => typeof (matcherWrite as Record<string, unknown>)[k] === 'function',
    );
    expect(fnExports.sort()).toEqual(['appendConfirmedContribution', 'appendReconciliationMismatch']);
    // No exported function name hints at a reversal/un-confirm emitter.
    for (const name of fnExports) {
      expect(name.toLowerCase()).not.toMatch(/revers|unconfirm|un_confirm/);
    }
  });

  it('neither the domain verdict-writer nor the jobs matcher worker references the reversal event type', () => {
    // Source-scan teeth: the ONLY producer of reconciliation.confirmation-reversed is Story 9.8's trustee
    // panel. If a matcher code path ever appends it, this fails. Revert-sanity: plant a reference to
    // RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE (or the literal) in either file → RED → revert → GREEN.
    const scanned = [
      'packages/domain/src/reconciliation/matcher-write.ts',
      'packages/domain/src/reconciliation/matcher.ts',
      'apps/jobs/src/matcher/matcher-worker.ts',
    ];
    const offenders: string[] = [];
    for (const rel of scanned) {
      const src = codeOnly(read(rel));
      if (
        src.includes('RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE') ||
        src.includes("'reconciliation.confirmation-reversed'") ||
        src.includes('"reconciliation.confirmation-reversed"') ||
        src.includes('ReconciliationConfirmationReversedPayloadSchema')
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders, `matcher code references the reversal event: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the reversal event type is nonetheless REGISTERED (9.4 defines it; 9.8 produces it)', () => {
    expect(RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE).toBe('reconciliation.confirmation-reversed');
    // It is DELIBERATELY off the contribution.* namespace (Decision D1 — the 8.10 fence stays at three).
    expect(RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE.startsWith('contribution.')).toBe(false);
  });
});

// ── AC7 — the reason vocabulary does not drift between the matcher + the event payload ────────────────

describe('AC7 — the mismatch reason vocabulary is single-sourced (no drift)', () => {
  it('MATCH_MISMATCH_REASONS === CONTRIBUTION_MISMATCH_REASONS', () => {
    expect([...CONTRIBUTION_MISMATCH_REASONS]).toEqual([...MATCH_MISMATCH_REASONS]);
  });
});

// ── The verdict payload schemas (AC3/AC6/D1) ──────────────────────────────────────────────────────────

describe('AC3 — contribution.confirmed payload schema', () => {
  const valid = {
    poolId: '00000000-0000-4000-8000-0000000000a1',
    memberId: '00000000-0000-4000-8000-0000000000b2',
    alertId: '00000000-0000-4000-8000-0000000000c3',
    utr: '111111111111',
    confirmedAt: '2026-07-26T10:00:00.000Z',
    matchProvenance: {
      bankStatementEntryId: '00000000-0000-4000-8000-0000000000d4',
      idempotencyKey: 'reconciliation.match:p:a:m:e',
      matcherRun: 'trace-1',
      senderVpaCheck: { available: false, reason: 'member_vpa_not_collected' },
    },
  };

  it('accepts the load-bearing camelCase shape', () => {
    expect(() => ContributionConfirmedPayloadSchema.parse(valid)).not.toThrow();
  });

  it('is .strict() — an unknown key is a defect', () => {
    expect(() => ContributionConfirmedPayloadSchema.parse({ ...valid, extra: 1 })).toThrow();
  });

  it('rejects a bad UTR shape + a sender-VPA arm claiming available:true', () => {
    expect(() => ContributionConfirmedPayloadSchema.parse({ ...valid, utr: 'nope!' })).toThrow();
    expect(() =>
      ContributionConfirmedPayloadSchema.parse({
        ...valid,
        matchProvenance: { ...valid.matchProvenance, senderVpaCheck: { available: true } },
      }),
    ).toThrow();
  });
});

describe('AC6 — contribution.reconciliation-mismatch payload schema', () => {
  const valid = {
    poolId: '00000000-0000-4000-8000-0000000000a1',
    memberId: '00000000-0000-4000-8000-0000000000b2',
    alertId: '00000000-0000-4000-8000-0000000000c3',
    utr: '111111111111',
    reason: 'wrong_pool' as const,
    bankStatementEntryId: '00000000-0000-4000-8000-0000000000d4',
    detectedAt: '2026-07-26T10:00:00.000Z',
    matcherRun: 'trace-1',
  };

  it('accepts a found-and-rejected mismatch + a null entry (no_statement_entry)', () => {
    expect(() => ContributionReconciliationMismatchPayloadSchema.parse(valid)).not.toThrow();
    expect(() =>
      ContributionReconciliationMismatchPayloadSchema.parse({ ...valid, reason: 'no_statement_entry', bankStatementEntryId: null }),
    ).not.toThrow();
  });

  it('rejects an unknown reason', () => {
    expect(() => ContributionReconciliationMismatchPayloadSchema.parse({ ...valid, reason: 'made_up' })).toThrow();
  });

  // Story 9.11 (AC1/AC8) — the carried over/under amounts are additive-optional.
  it('accepts the amount_mismatch carried amounts (deposited/expected paise)', () => {
    expect(() =>
      ContributionReconciliationMismatchPayloadSchema.parse({
        ...valid,
        reason: 'amount_mismatch',
        depositedAmountPaise: 110_000,
        expectedAmountPaise: 100_000,
      }),
    ).not.toThrow();
  });

  it('a legacy no-amounts mismatch still validates (additive-optional, backward-compatible)', () => {
    const parsed = ContributionReconciliationMismatchPayloadSchema.parse(valid);
    expect(parsed.depositedAmountPaise).toBeUndefined();
    expect(parsed.expectedAmountPaise).toBeUndefined();
  });

  it('rejects a negative or non-integer carried amount', () => {
    expect(() =>
      ContributionReconciliationMismatchPayloadSchema.parse({ ...valid, reason: 'amount_mismatch', depositedAmountPaise: -1 }),
    ).toThrow();
    expect(() =>
      ContributionReconciliationMismatchPayloadSchema.parse({ ...valid, reason: 'amount_mismatch', expectedAmountPaise: 1.5 }),
    ).toThrow();
  });
});

// ── Task 2 — the parsed-entry → row map (minimal Tier-1-adjacent footprint) ───────────────────────────

describe('Task 2 — mapParsedEntriesToRows', () => {
  const entry: BankStatementEntry = {
    entry_id: '00000000-0000-4000-8000-0000000000d4',
    bank_code: 'sbi',
    transaction_date: '2026-07-10',
    transaction_id_utr: '100000000001',
    sender_vpa: 'payer@upi',
    sender_name: 'SECRET NAME',
    amount: 100_000,
    description: 'SECRET NARRATION',
    entry_type: 'credit',
    running_balance: 500_000,
    source_account: 'acct-1',
    raw_row: ['SECRET', 'RAW', 'CELLS'],
    parser_version: 'sbi@1',
  };

  it('denormalizes pool_id + provenance and keeps the matcher-load-bearing fields', () => {
    const [row] = mapParsedEntriesToRows(
      {
        pariwarId: '11111111-1111-1111-1111-111111111111' as never,
        poolId: '00000000-0000-4000-8000-0000000000a1' as never,
        statementEventId: '00000000-0000-4000-8000-0000000000f6',
        claimCaseId: '00000000-0000-4000-8000-0000000000c7' as never,
      },
      [entry],
    );
    expect(row).toMatchObject({
      entryId: entry.entry_id,
      poolId: '00000000-0000-4000-8000-0000000000a1',
      transactionIdUtr: '100000000001',
      amount: 100_000,
      transactionDate: '2026-07-10',
      entryType: 'credit',
      parserVersion: 'sbi@1',
    });
  });

  it('DROPS the free-text PII (sender_name / description / raw_row / running_balance) — minimal footprint', () => {
    const [row] = mapParsedEntriesToRows(
      {
        pariwarId: '11111111-1111-1111-1111-111111111111' as never,
        poolId: '00000000-0000-4000-8000-0000000000a1' as never,
        statementEventId: '00000000-0000-4000-8000-0000000000f6',
        claimCaseId: '00000000-0000-4000-8000-0000000000c7' as never,
      },
      [entry],
    );
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain('SECRET NAME');
    expect(serialized).not.toContain('SECRET NARRATION');
    expect(serialized).not.toContain('SECRET');
    expect(row).not.toHaveProperty('senderName');
    expect(row).not.toHaveProperty('description');
    expect(row).not.toHaveProperty('rawRow');
    expect(row).not.toHaveProperty('runningBalance');
  });
});

describe('D1 — reconciliation.confirmation-reversed payload schema', () => {
  const valid = {
    poolId: '00000000-0000-4000-8000-0000000000a1',
    memberId: '00000000-0000-4000-8000-0000000000b2',
    alertId: '00000000-0000-4000-8000-0000000000c3',
    reversedConfirmedEventId: '00000000-0000-4000-8000-0000000000e5',
    reasonCode: 'duplicate_deposit_returned',
    attestedByActorIds: ['trustee-1'],
    reversedAt: '2026-07-26T10:00:00.000Z',
  };

  it('accepts a valid trustee-attested reversal', () => {
    expect(() => ReconciliationConfirmationReversedPayloadSchema.parse(valid)).not.toThrow();
  });

  it('requires at least one attesting trustee', () => {
    expect(() => ReconciliationConfirmationReversedPayloadSchema.parse({ ...valid, attestedByActorIds: [] })).toThrow();
  });
});
