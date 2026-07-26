// Per-bank parser factory — Story 9.2 (Task 2).
//
// The 5 v1 banks differ ONLY in their native column layout + amount representation
// (separate Withdrawal/Deposit columns vs a single Amount + Dr/Cr indicator) + date
// format (auto-detected by `normalizeDate`). So a single `defineBankParser` config
// captures a bank's format; the normalization logic (date/amount/UTR/VPA/sender-name/
// entry-type + skip-with-record) is the shared `normalize.ts` implementation — no
// per-bank drift. Each `bihar/<bank>/parse.ts` is a thin config + `defineBankParser`.

import { bankStatement } from '@twt/domain';
import {
  buildEntry,
  decodeInput,
  extractSenderName,
  extractUtr,
  extractVpa,
  normalizeDate,
  parseAmountCell,
  parseBalanceCell,
  readCsv,
  type BankParseResult,
  type RejectedRow,
} from './normalize.js';

type BankCode = bankStatement.BankCode;
type BankStatementEntry = bankStatement.BankStatementEntry;

/** Column index map for a bank's native CSV. `debit`+`credit` XOR `amount`+`drCr`. */
export interface BankColumns {
  readonly date: number;
  readonly narration: number;
  /** Explicit reference/UTR column (preferred over narration extraction), if any. */
  readonly ref?: number;
  /** Running-balance column, if any. */
  readonly balance?: number;
  /** Source-account column, if any. */
  readonly account?: number;
  // Strategy A — separate withdrawal/deposit columns:
  readonly debit?: number;
  readonly credit?: number;
  // Strategy B — single amount column + a Dr/Cr indicator column:
  readonly amount?: number;
  readonly drCr?: number;
}

export interface BankParserConfig {
  readonly bankCode: BankCode;
  /** Stamped into every emitted row's `parser_version` (e.g. `sbi@1`). Bump on a
   *  format change so a re-parse is auditable (AC4). */
  readonly parserVersion: string;
  readonly columns: BankColumns;
}

/** A bank parser: pure `(input) => BankParseResult` (entries + skip-with-record rejects). */
export type BankParser = (input: string | Buffer) => BankParseResult;

function cell(row: readonly string[], index: number | undefined): string {
  if (index === undefined) return '';
  return (row[index] ?? '').trim();
}

/**
 * Build a bank parser from its format config. The returned function is PURE (no I/O, no
 * clock, no randomness — parser-sandbox posture) and DETERMINISTIC (the `entry_id` is
 * content-derived), so a re-parse of the same bytes is byte-identical (golden identity).
 */
export function defineBankParser(config: BankParserConfig): BankParser {
  const { bankCode, parserVersion, columns } = config;

  return (input: string | Buffer): BankParseResult => {
    const text = decodeInput(input);
    const { rows } = readCsv(text);
    const entries: BankStatementEntry[] = [];
    const rejected: RejectedRow[] = [];

    rows.forEach((rawRow, rowIndex) => {
      // Empty row → record + skip.
      if (rawRow.every((c) => c.trim() === '')) {
        rejected.push({ rowIndex, rawRow, reason: 'empty-row' });
        return;
      }

      const transactionDate = normalizeDate(cell(rawRow, columns.date));
      if (transactionDate === null) {
        rejected.push({ rowIndex, rawRow, reason: 'unparseable-date' });
        return;
      }

      // Amount + direction — strategy A (debit/credit columns) or B (amount + Dr/Cr).
      let amountPaise: number | null;
      let isCredit: boolean;
      if (columns.amount !== undefined) {
        amountPaise = parseAmountCell(rawRow[columns.amount]);
        if (amountPaise === null) {
          rejected.push({ rowIndex, rawRow, reason: 'missing-amount' });
          return;
        }
        const dc = cell(rawRow, columns.drCr).toLowerCase();
        const isCreditToken = dc === 'cr' || dc === 'credit' || dc === 'c';
        const isDebitToken = dc === 'dr' || dc === 'debit' || dc === 'd';
        if (!isCreditToken && !isDebitToken) {
          rejected.push({ rowIndex, rawRow, reason: 'ambiguous-direction' });
          return;
        }
        isCredit = isCreditToken;
      } else {
        const debit = parseAmountCell(columns.debit !== undefined ? rawRow[columns.debit] : undefined);
        const credit = parseAmountCell(columns.credit !== undefined ? rawRow[columns.credit] : undefined);
        if (debit !== null && credit !== null) {
          rejected.push({ rowIndex, rawRow, reason: 'ambiguous-amount' });
          return;
        } else if (credit !== null) {
          amountPaise = credit;
          isCredit = true;
        } else if (debit !== null) {
          amountPaise = debit;
          isCredit = false;
        } else {
          amountPaise = null;
          isCredit = false;
        }
      }
      if (amountPaise === null) {
        rejected.push({ rowIndex, rawRow, reason: 'missing-amount' });
        return;
      }

      const narration = cell(rawRow, columns.narration);
      const refCell = columns.ref !== undefined ? rawRow[columns.ref] : undefined;

      entries.push(
        buildEntry({
          bankCode,
          parserVersion,
          rowIndex,
          rawRow,
          transactionDate,
          narration,
          utr: extractUtr(narration, refCell),
          vpa: extractVpa(narration),
          senderName: extractSenderName(narration),
          amountPaise,
          isCredit,
          runningBalancePaise:
            columns.balance !== undefined ? parseBalanceCell(rawRow[columns.balance]) : null,
          sourceAccount:
            columns.account !== undefined ? cell(rawRow, columns.account) || null : null,
        }),
      );
    });

    return { entries, rejected };
  };
}
