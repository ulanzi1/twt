// Story 6.39a — code review, second pass (K8): the writer maps a 23505 on the one-live bank-date index (and ONLY that index)
// to the typed `stale` refusal. The predicate is pure, and the constant it compares with is PINNED to the index the schema
// and the migration define — a typo in the constant would turn the typed `stale` into a 500 and nothing else would notice.
// The race itself cannot be constructed live (every inserter serialises on the claim row), so the predicate and the name are
// all that can be proved; the story says so. (What the index MEANS — one live record per claim, in the database — is proved live by
// `tests/integration/rls/claim-fee-bank-date-policy-regression.spec.ts`; this file pins the constant to it.)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX, isOneLiveFeeBankDateViolation } from '../../src/claim/index.js';
import { claimFeeBankDates } from '../../src/schema/claim_fee_bank_dates.js';

describe('isOneLiveFeeBankDateViolation', () => {
  it('is true for a 23505 on that index — on the error or on its drizzle `.cause`', () => {
    expect(isOneLiveFeeBankDateViolation({ code: '23505', constraint: CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX })).toBe(true);
    expect(isOneLiveFeeBankDateViolation({ cause: { code: '23505', constraint: CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX } })).toBe(true);
  });

  it('is false for any other 23505, another SQLSTATE, and a non-object', () => {
    expect(isOneLiveFeeBankDateViolation({ code: '23505', constraint: 'claim_fee_bank_dates_pkey' })).toBe(false);
    expect(isOneLiveFeeBankDateViolation({ code: '23505', constraint: 'claim_fee_bank_dates_record_claim_uq' })).toBe(false);
    expect(isOneLiveFeeBankDateViolation({ code: '23503', constraint: CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX })).toBe(false);
    expect(isOneLiveFeeBankDateViolation(null)).toBe(false);
    expect(isOneLiveFeeBankDateViolation(undefined)).toBe(false);
    expect(isOneLiveFeeBankDateViolation(new Error('x'))).toBe(false);
  });
});

describe('CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX is the index the schema and the migration define', () => {
  it('the constant names a UNIQUE index of the Drizzle table', () => {
    const named = getTableConfig(claimFeeBankDates).indexes.filter((i) => i.config.name === CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX);
    expect(named).toHaveLength(1);
    expect(named[0]!.config.unique).toBe(true);
  });

  it('the migration creates a UNIQUE index of that exact name on the table — over the CLAIM, PARTIAL on the live rows (that is what makes it the "one live per claim" index)', () => {
    const sql = readFileSync(fileURLToPath(new URL('../../migrations/0219_claim-fee-bank-dates.sql', import.meta.url)), 'utf8');
    // ⭐ M3 / N5 — STRIP the SQL comments first, line (`--`) AND block: a comment may contain a `;` (this migration's own does — "…is the
    // interface; this index is the truth") or quote the index name or the predicate, and a segment cut mid-comment would satisfy a
    // loose match. Then take the statement that BEGINS with `CREATE UNIQUE INDEX` (any case, any whitespace) and names the index.
    const code = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
    const statement = code
      .split(';')
      .map((part) => part.trim())
      .find((part) => /^CREATE\s+UNIQUE\s+INDEX\s/i.test(part) && part.includes(`"${CLAIM_FEE_BANK_DATE_ONE_LIVE_INDEX}"`));
    expect(statement, 'the migration has no CREATE UNIQUE INDEX statement of that name').toBeDefined();
    expect(statement).toMatch(/\bON\s+"claim_fee_bank_dates"/i);
    // The KEY is the claim — a partial unique index over any other column would not be "one live record PER CLAIM"…
    expect(statement).toMatch(/USING\s+btree\s*\(\s*"claim_case_id"\s*\)/i);
    // …and the predicate is the END of THAT statement.
    expect(statement).toMatch(/WHERE\s+superseded_at\s+IS\s+NULL$/i);
    // NOT pinned here, by design: the Drizzle schema's own `where` (a SQL object that renders only through a dialect) and a LATER
    // migration that drops or recreates the index — the DB-level spec proves the behaviour against the live schema.
  });
});
