// PNB (Punjab National Bank) statement parser — Story 9.2 (Task 2).
//
// Native CSV format (generic baseline — see ADR-0033):
//   Date, Narration, Cheque Details, Withdrawal, Deposit, Balance
//   DD-MM-YYYY dates; separate Withdrawal/Deposit columns; UTR in the Narration.

import { defineBankParser, type BankParser } from '../../src/factory.js';

export const PNB_PARSER_VERSION = 'pnb@1';

export const parsePnb: BankParser = defineBankParser({
  bankCode: 'pnb',
  parserVersion: PNB_PARSER_VERSION,
  columns: {
    date: 0,
    narration: 1,
    ref: 2,
    debit: 3,
    credit: 4,
    balance: 5,
  },
});
