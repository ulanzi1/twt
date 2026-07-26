// Shared normalization helpers for the per-bank parsers — Story 9.2 (Task 2).
//
// The per-bank parsers (`bihar/<bank>/parse.ts`) differ only in their NATIVE column
// layout + date format; the mapping into the canonical `BankStatementEntry` reuses
// these pure helpers so UTR/VPA/sender-name extraction + entry-type derivation +
// date/amount normalization are ONE implementation (no per-bank drift). All pure,
// no side effects, resource-bounded — the parser-sandbox posture (architecture §5.3).

import { parse as parseCsvSync } from 'csv-parse/sync';
import { bankStatement } from '@twt/domain';

type BankStatementEntry = bankStatement.BankStatementEntry;
type BankCode = bankStatement.BankCode;
type BankEntryType = bankStatement.BankEntryType;

const { parseInrToPaise, deriveBankStatementEntryId, BankAmountParseError } = bankStatement;

// ── Resource caps (parser-sandbox posture — reject absurd inputs early) ────────

/** Hard cap on decoded input size — reject a multi-GB "statement" before it OOMs
 *  (architecture §5.3 resource limits). 16 MiB comfortably exceeds any real monthly
 *  CSV statement while bounding a hostile upload. */
export const MAX_INPUT_BYTES = 16 * 1024 * 1024;

/** Hard cap on row count — a real monthly statement is hundreds of rows, not millions. */
export const MAX_ROWS = 100_000;

/** Hard cap on a single cell's length — bounds a crafted mega-cell. */
export const MAX_CELL_CHARS = 64 * 1024;

// ── Decode (encoding-variant robustness: UTF-8 / UTF-8-BOM / latin1) ───────────

/**
 * Decode a `string | Buffer` input to text. A string is returned as-is. A Buffer is
 * decoded UTF-8 first; if that yields the U+FFFD replacement character (i.e. the bytes
 * were not valid UTF-8), it is re-decoded latin1 — the pragmatic heuristic that lets a
 * legacy latin1 e-statement export round-trip without a declared charset. A leading
 * UTF-8 BOM is stripped downstream by csv-parse (`bom: true`).
 */
export function decodeInput(input: string | Buffer): string {
  if (typeof input === 'string') {
    if (Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES) {
      throw new RangeError(
        `input exceeds MAX_INPUT_BYTES (${Buffer.byteLength(input, 'utf8')} > ${MAX_INPUT_BYTES})`,
      );
    }
    return input;
  }
  if (input.byteLength > MAX_INPUT_BYTES) {
    throw new RangeError(`input exceeds MAX_INPUT_BYTES (${input.byteLength} > ${MAX_INPUT_BYTES})`);
  }
  const utf8 = input.toString('utf8');
  if (utf8.includes('�')) return input.toString('latin1');
  return utf8;
}

// ── CSV read (bounded, header-aware) ──────────────────────────────────────────

export interface ReadCsvResult {
  /** The header row (first record), trimmed cells. */
  header: string[];
  /** The data rows (records after the header), VERBATIM cells (untrimmed — raw_row). */
  rows: string[][];
}

/**
 * Read CSV text into a header + verbatim data rows, bounded. `relax_column_count` keeps
 * a short/long row as a row (a partial row is RECORDED, not a hard failure — graceful
 * degradation). BOM stripped. Empty lines skipped. Cells are NOT trimmed here (raw_row
 * must be verbatim); trimming happens per-field during mapping.
 */
export function readCsv(text: string): ReadCsvResult {
  if (Buffer.byteLength(text, 'utf8') > MAX_INPUT_BYTES) {
    throw new RangeError(
      `input exceeds MAX_INPUT_BYTES (${Buffer.byteLength(text, 'utf8')} > ${MAX_INPUT_BYTES})`,
    );
  }
  const records = parseCsvSync(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: false,
  }) as string[][];
  if (records.length > MAX_ROWS + 1) {
    throw new RangeError(`input exceeds MAX_ROWS (${records.length - 1} > ${MAX_ROWS})`);
  }
  for (const rec of records) {
    for (const cell of rec) {
      if (cell.length > MAX_CELL_CHARS) {
        throw new RangeError(`cell exceeds MAX_CELL_CHARS (${cell.length} > ${MAX_CELL_CHARS})`);
      }
    }
  }
  const [header = [], ...rows] = records;
  return { header: header.map((c) => c.trim()), rows };
}

// ── Date normalization → ISO YYYY-MM-DD ───────────────────────────────────────

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Whether `yyyy-mm-dd` (all numeric, 1-based month) is a real calendar date. */
function isValidCalendarDate(yyyy: number, mm: number, dd: number): boolean {
  if (mm < 1 || mm > 12 || dd < 1) return false;
  const isLeap = (yyyy % 4 === 0 && yyyy % 100 !== 0) || yyyy % 400 === 0;
  const daysInMonth = mm === 2 && isLeap ? 29 : DAYS_IN_MONTH[mm - 1]!;
  return dd <= daysInMonth;
}

/**
 * Normalize a bank's native date string into ISO `YYYY-MM-DD`. Handles `YYYY-MM-DD`
 * (pass-through), `DD/MM/YYYY`, `DD-MM-YYYY`, `DD/MM/YY`, `DD-MMM-YYYY`, `DD-MMM-YY`
 * (2-digit years → 20YY). Returns `null` for an unparseable/blank/impossible date (e.g.
 * `2026-02-30`) — a partial row, the caller records it with a null date rather than
 * crashing or propagating a bogus calendar date to the 9.4 matcher.
 */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // Already ISO.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    if (!isValidCalendarDate(Number(yyyy), Number(mm), Number(dd))) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  // DD<sep>MMM<sep>YY(YY) — alphabetic month.
  const named = /^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2}|\d{4})$/.exec(s);
  if (named) {
    const mm = MONTHS[named[2]!.toLowerCase()];
    if (!mm) return null;
    const yyyy = named[3]!.length === 2 ? `20${named[3]}` : named[3]!;
    const dd = named[1]!.padStart(2, '0');
    if (!isValidCalendarDate(Number(yyyy), Number(mm), Number(dd))) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  // DD<sep>MM<sep>YY(YY) — numeric.
  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(s);
  if (numeric) {
    const dd = numeric[1]!.padStart(2, '0');
    const mm = numeric[2]!.padStart(2, '0');
    const yyyy = numeric[3]!.length === 2 ? `20${numeric[3]}` : numeric[3]!;
    if (!isValidCalendarDate(Number(yyyy), Number(mm), Number(dd))) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

// ── UTR / VPA / sender-name extraction (from UPI narration + native columns) ───

/** A 12-digit UPI UTR, or a 22-char alphanumeric RRN (matches the domain UTR regex). */
const UTR_RE = /\b(\d{12}|[A-Za-z0-9]{22})\b/;
/** A UPI VPA (`handle@psp`). Deliberately conservative — avoids matching email-like
 *  noise (e.g. an embedded "Contact@Bank" in free text) by requiring the PSP segment
 *  to be a known-shape lowercase handle (real UPI PSP handles — oksbi, ybl, paytm,
 *  okhdfcbank, ... — are always lowercase; mixed/upper-case is never a real PSP). */
const VPA_RE = /\b([a-zA-Z0-9.\-_]{2,})@([a-z]{2,})\b/;

/**
 * Extract a UTR from an explicit reference cell first (if provided + well-formed), else
 * from the free-text narration. Returns `null` when neither carries one (a charge row,
 * or a partial row missing its UTR).
 */
export function extractUtr(narration: string, refCell?: string): string | null {
  if (refCell) {
    const ref = refCell.trim();
    if (UTR_RE.test(ref)) return UTR_RE.exec(ref)![1]!;
  }
  const m = UTR_RE.exec(narration);
  return m ? m[1]! : null;
}

/** Extract the payer's UPI VPA from the narration, or `null`. */
export function extractVpa(narration: string): string | null {
  const m = VPA_RE.exec(narration);
  return m ? `${m[1]}@${m[2]}` : null;
}

/**
 * Best-effort extract the payer's name from a UPI narration. Indian bank UPI narrations
 * are delimited (`UPI/CR/<utr>/<NAME>/<vpa>/<remark>` and variants) — the name is the
 * first `/`-segment that is alphabetic-with-spaces and not a known keyword/UTR/VPA.
 * Returns `null` when no plausible name segment exists.
 */
export function extractSenderName(narration: string): string | null {
  const segs = narration.trim().split('/');
  // Positional path: a UPI narration is `UPI/<CR|DR|…>/<ref>/<NAME>/<vpa>/<remark>` — the
  // name is the 4th segment. Positional extraction is correct even for a non-ASCII name
  // (Devanagari / accented latin1) where the heuristic scan below would fall through.
  if (segs[0]?.toUpperCase() === 'UPI' && segs.length >= 4) {
    const name = segs[3]?.trim() ?? '';
    if (name && !name.includes('@') && !UTR_RE.test(name) && !CHARGE_RE.test(name) && !REVERSAL_RE.test(name)) {
      return name;
    }
  }
  const KEYWORDS = new Set([
    'upi', 'cr', 'dr', 'neft', 'imps', 'rtgs', 'nach', 'ach', 'ecs', 'ref', 'p2a', 'p2m',
  ]);
  for (const rawSeg of segs) {
    const seg = rawSeg.trim();
    if (!seg) continue;
    if (KEYWORDS.has(seg.toLowerCase())) continue;
    if (UTR_RE.test(seg)) continue;
    if (seg.includes('@')) continue;
    // A charge/reversal narration segment is bookkeeping text, not a payer name.
    if (CHARGE_RE.test(seg) || REVERSAL_RE.test(seg)) continue;
    // A name: letters + spaces + dots, at least 2 letters, not purely numeric.
    if (/^[A-Za-z][A-Za-z .]{1,}$/.test(seg)) return seg;
  }
  return null;
}

// ── Entry-type derivation ─────────────────────────────────────────────────────

const REVERSAL_RE = /\b(reversal|refund|rev|rvsl|return|reversed|chargeback)\b/i;
const CHARGE_RE = /\b(charge|charges|chrg|chg|fee|fees|gst|penalty|commission|comm|amc)\b/i;

/**
 * Derive the canonical `entry_type` from the narration + the credit/debit direction.
 * A REVERSAL or CHARGE keyword in the narration WINS over the raw direction (a fee is a
 * `charge` even though it is a debit; a refund is a `reversal` even though it is a
 * credit) — this is what gives the `entry_type` enum meaningful, tested coverage. With
 * no keyword: a positive credit → `credit`, else `debit`.
 */
export function deriveEntryType(params: {
  narration: string;
  isCredit: boolean;
}): BankEntryType {
  const { narration, isCredit } = params;
  if (REVERSAL_RE.test(narration)) return 'reversal';
  if (CHARGE_RE.test(narration)) return 'charge';
  return isCredit ? 'credit' : 'debit';
}

// ── Amount normalization (null-safe wrapper over the domain paise helper) ──────

/**
 * Parse a native amount cell to integer paise, returning `null` for a blank cell (the
 * common "this row is a debit, so the Credit column is empty" case) and for a malformed
 * cell (a partial row — recorded with a null amount, never a crash). Non-blank +
 * well-formed → exact paise via the domain `parseInrToPaise`.
 */
export function parseAmountCell(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!s) return null;
  try {
    return parseInrToPaise(s);
  } catch (err) {
    if (err instanceof BankAmountParseError) return null;
    throw err;
  }
}

/**
 * Parse a running-balance cell to SIGNED integer paise. Unlike `amount` (a magnitude —
 * direction is `entry_type`), a balance can be negative (overdraft), so a leading `-` or
 * a trailing `Dr` marker negates the magnitude. Blank/malformed → `null`.
 */
export function parseBalanceCell(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim();
  if (!s) return null;
  const negative = s.startsWith('-') || /dr$/i.test(s);
  const magnitude = parseAmountCell(s);
  if (magnitude === null) return null;
  return negative ? -magnitude : magnitude;
}

// ── Parser result — entries + skipped-with-record rejects ─────────────────────

/**
 * A data row the parser could not normalize into a valid `BankStatementEntry` — it is
 * RECORDED (skip-with-record, parser-sandbox posture), not silently dropped and never a
 * crash. `reason` is a stable machine token the 9.3 surface + audit log key on. This is
 * how AC5's "degrade gracefully" + Task 5's `rows_rejected` are realized.
 */
export interface RejectedRow {
  /** 0-based index among the file's DATA rows (header excluded). */
  readonly rowIndex: number;
  /** The verbatim native cells of the skipped row. */
  readonly rawRow: readonly string[];
  /** Stable machine token: why the row could not be normalized. */
  readonly reason:
    | 'unparseable-date'
    | 'missing-amount'
    | 'empty-row'
    | 'ambiguous-direction'
    | 'ambiguous-amount';
}

/**
 * The result of parsing one statement: the normalized `entries` + the `rejected` rows
 * (skip-with-record). NOTE (Dev Agent Record): Story 9.2 Task 2 sketched the per-bank
 * parser as `(input) => BankStatementEntry[]`; it is REFINED to this richer result so
 * "skip-with-record" (AC5) and Task 5's `rows_parsed` / `rows_rejected` are honest and
 * testable rather than a silent array-length delta. `entries` is still the single
 * canonical shape — the refinement only adds the reject ledger alongside it.
 */
export interface BankParseResult {
  readonly entries: BankStatementEntry[];
  readonly rejected: RejectedRow[];
}

// ── The canonical row builder (every parser funnels through this) ──────────────

export interface BuildEntryInput {
  readonly bankCode: BankCode;
  readonly parserVersion: string;
  readonly rowIndex: number;
  readonly rawRow: readonly string[];
  /** Non-null: the caller rejects (skip-with-record) rows whose date did not parse. */
  readonly transactionDate: string;
  readonly narration: string;
  readonly utr: string | null;
  readonly vpa: string | null;
  readonly senderName: string | null;
  /** Non-null: the caller rejects (skip-with-record) rows with no parseable amount. */
  readonly amountPaise: number;
  readonly isCredit: boolean;
  readonly runningBalancePaise: number | null;
  readonly sourceAccount: string | null;
}

/**
 * Assemble a canonical `BankStatementEntry` from a parser's per-row extraction. Central
 * so the deterministic `entry_id` + the `entry_type` derivation + the raw-row copy live
 * in ONE place (no per-bank drift). Callers pass only rows that cleared the date +
 * amount guards (partial rows are recorded via `RejectedRow`, never reach here).
 */
export function buildEntry(input: BuildEntryInput): BankStatementEntry {
  const entryId = deriveBankStatementEntryId({
    bankCode: input.bankCode,
    parserVersion: input.parserVersion,
    rowIndex: input.rowIndex,
    rawRow: input.rawRow,
  });
  return {
    entry_id: entryId,
    bank_code: input.bankCode,
    transaction_date: input.transactionDate,
    transaction_id_utr: input.utr,
    sender_vpa: input.vpa,
    sender_name: input.senderName,
    amount: input.amountPaise,
    description: input.narration,
    entry_type: deriveEntryType({ narration: input.narration, isCredit: input.isCredit }),
    running_balance: input.runningBalancePaise,
    source_account: input.sourceAccount,
    raw_row: [...input.rawRow],
    parser_version: input.parserVersion,
  };
}
