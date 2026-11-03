// The `attributionCode` namespace's EXACT export list + the deny-list ↔ migration LOCKSTEP — DB-free unit tests (Story 13.2,
// Task 6.3). A new export is a reviewed edit here; `assertTxBoundScope` is module-private (⛔ exported).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { attributionCode } from '../../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('attributionCode namespace (AC5 — the only export keyed by code is resolveAttribution)', () => {
  it('exports exactly the pinned names', () => {
    expect(Object.keys(attributionCode).sort()).toEqual(
      [
        'generateAttributionCode',
        'allocateAttributionCode',
        'resolveAttribution',
        'readAttributionCodeForFieldWorker',
        'flagAllocationExhausted',
        'listAllocationFlags',
        'isDenylistedAttributionCode',
        'ATTRIBUTION_CODE_LENGTH',
        'ATTRIBUTION_CODE_PATTERN',
        'ATTRIBUTION_CODE_DENYLIST',
        'ATTRIBUTION_CODE_MAX_ATTEMPTS',
        'InvalidAttributionCodeError',
        'AttributionPariwarScopeMismatchError',
        'FieldWorkerAlreadyHasAttributionCodeError',
        'AttributionCodeAllocationExhaustedError',
        'AttributionCodeRequiresTransactionError',
        'AttributionCaptureMismatchError',
      ].sort(),
    );
    expect(attributionCode).not.toHaveProperty('assertTxBoundScope');
    expect(attributionCode.ATTRIBUTION_CODE_MAX_ATTEMPTS).toBe(8);
  });
});

describe('deny-list LOCKSTEP (TR6) — the TS constant equals migration 0199 CHECK', () => {
  it('reads the CHECK literals out of the migration file', () => {
    const sql = readFileSync(
      path.resolve(here, '../../migrations/0199_field-worker-attribution-codes.sql'),
      'utf8',
    );
    const m = /"field_worker_attribution_codes_code_denylist_check" CHECK \("code" NOT IN \(([^)]*)\)\)/.exec(sql);
    expect(m, 'the deny-list CHECK is present').not.toBeNull();
    const literals = (m?.[1] ?? '').split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    expect([...literals].sort()).toEqual([...attributionCode.ATTRIBUTION_CODE_DENYLIST].sort());
    // The format CHECK uses `[0-9]`, ⛔ `\d` (TR5).
    expect(sql).toContain(`CHECK ("code" ~ '^[0-9]{6}$')`);
  });
});
