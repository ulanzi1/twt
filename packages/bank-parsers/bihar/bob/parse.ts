// BoB (Bank of Baroda) statement parser — Story 9.2 (Task 2).
//
// Native CSV format (generic baseline — see ADR-0033):
//   Tran Date, Remarks, UTR Number, Withdrawal Amt, Deposit Amt, Running Balance
//   DD-MMM-YYYY dates (e.g. 15-Jan-2026); an EXPLICIT UTR column (preferred over
//   narration extraction — proves the ref-column path); separate Withdrawal/Deposit.

import { defineBankParser, type BankParser } from '../../src/factory.js';

export const BOB_PARSER_VERSION = 'bob@1';

export const parseBob: BankParser = defineBankParser({
  bankCode: 'bob',
  parserVersion: BOB_PARSER_VERSION,
  columns: {
    date: 0,
    narration: 1,
    ref: 2,
    debit: 3,
    credit: 4,
    balance: 5,
  },
});
