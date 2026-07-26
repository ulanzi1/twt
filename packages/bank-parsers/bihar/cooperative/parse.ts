// Bihar cooperative bank statement parser — Story 9.2 (Task 2).
//
// The named Bihar cooperative in `bank-allowlist.yaml` (the 5th allowlisted bank).
// Native CSV format (generic baseline — see ADR-0033), the most minimal of the 5:
//   DATE, DETAILS, CHQ/REF, DR, CR, BAL
//   DD/MM/YY dates (2-digit year → 20YY); separate DR/CR columns; an account column is
//   absent (a small cooperative export) — source_account stays null (9.3 may inject it).

import { defineBankParser, type BankParser } from '../../src/factory.js';

export const COOPERATIVE_PARSER_VERSION = 'cooperative@1';

export const parseCooperative: BankParser = defineBankParser({
  bankCode: 'cooperative',
  parserVersion: COOPERATIVE_PARSER_VERSION,
  columns: {
    date: 0,
    narration: 1,
    ref: 2,
    debit: 3,
    credit: 4,
    balance: 5,
  },
});
