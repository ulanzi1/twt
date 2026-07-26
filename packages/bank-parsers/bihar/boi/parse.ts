// BoI (Bank of India) statement parser — Story 9.2 (Task 2).
//
// Native CSV format (generic baseline — see ADR-0033):
//   Transaction Date, Particulars, Instrument ID, Amount, Dr/Cr, Balance
//   YYYY-MM-DD dates (already ISO); a SINGLE Amount column + a Dr/Cr indicator column
//   (strategy B — proves the single-amount+indicator path distinct from SBI/PNB/BoB).

import { defineBankParser, type BankParser } from '../../src/factory.js';

export const BOI_PARSER_VERSION = 'boi@1';

export const parseBoi: BankParser = defineBankParser({
  bankCode: 'boi',
  parserVersion: BOI_PARSER_VERSION,
  columns: {
    date: 0,
    narration: 1,
    ref: 2,
    amount: 3,
    drCr: 4,
    balance: 5,
  },
});
