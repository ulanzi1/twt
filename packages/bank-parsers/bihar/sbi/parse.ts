// SBI (State Bank of India) statement parser — Story 9.2 (Task 2).
//
// Native CSV format (generic Indian bank e-statement export — no real SBI sample existed
// at authoring time; the format is documented in ADR-0033 as the reconciliation baseline
// for Story 9.3's real-file testing):
//   Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
//   DD/MM/YYYY dates; separate Debit/Credit columns; UTR in the Description narration.

import { defineBankParser, type BankParser } from '../../src/factory.js';

export const SBI_PARSER_VERSION = 'sbi@1';

export const parseSbi: BankParser = defineBankParser({
  bankCode: 'sbi',
  parserVersion: SBI_PARSER_VERSION,
  columns: {
    date: 0,
    narration: 2,
    ref: 3,
    debit: 4,
    credit: 5,
    balance: 6,
  },
});
