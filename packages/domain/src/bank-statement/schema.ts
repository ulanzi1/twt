// Canonical normalized bank-statement row schema — Story 9.2 (Task 1; AC3, AC1).
//
// THE [P0] shape of the reconciliation engine. Architecture §Deferred Decisions
// L177-179: "if the normalized schema is wrong, the matcher is wrong." Every bank
// parser (`packages/bank-parsers/bihar/<bank>/parse.ts`) emits `BankStatementEntry[]`,
// and the Story 9.4 UTR matcher consumes ONLY this shape — one canonical record
// regardless of source bank. This module is the single authority for that shape +
// the `BankCode` enum + the money/id derivation helpers the parsers share.
//
// ── D4 field reconciliation (ratified in ADR-0032) ────────────────────────────
// Three schema statements existed and are unioned here (see the ADR for the full
// mapping table): the epics.md §9.2 superset (`entry_type`, `running_balance`,
// `raw_row`, `parser_version`) + the architecture §3.6 `sender_name`/`source_account`
// + FR-29's deposit fields. Field-name mapping: `transaction_date` ← arch `datetime`;
// `transaction_id_utr` ← arch `utr` / FR-29 `UTR`; `description` ← arch `narration`;
// `bank_code` ← arch `source_bank`.
//
// ── Money is INTEGER PAISE, never a float (replay-safety) ──────────────────────
// `amount` and `running_balance` are integer paise (₹1,000.50 → 100050). The parser
// is replay-critical — the 9.4 matcher replays these rows and compares against the
// pool's whole-INR `fixed_amount` (× 100). Floats break replay identity (`1000.50 *
// 100 !== 100050` in IEEE-754); `parseInrToPaise` below is string-based and exact.
//
// ── Determinism (golden-file identity) ────────────────────────────────────────
// The parser must be a pure function whose output is byte-identical on every re-parse
// (that is what the 250 golden files assert, and what makes a re-parse auditable). So
// `entry_id` is NOT random/DB-defaulted — it is a UUIDv5 derived from the entry's
// identifying content via `deriveBankStatementEntryId` (mirrors pool-spawn's
// `derivePoolId`). NEVER introduce `Date.now()`/`randomUUID()` into a parser.

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bankStatementEntryId, type BankStatementEntryId } from '../ids/index.js';

// ── Bank-code authority (AC1) ─────────────────────────────────────────────────
// The single bank-code authority the schema AND the `@twt/bank-parsers` registry
// share (Task 1: "no type-shadowing"). v1 ships exactly 5 codes; the closed set is
// enforced at the transport by the registry lookup + `bank-allowlist.yaml`
// (`registry banks ⊆ allowlist`, exactly-5). Adding a 6th code here is one half of a
// trustee-attested admission (the other halves: a parser, 50 golden files, an
// allowlist bump — see the bank-parsers README).

/**
 * The v1 bank-code enum — SBI, PNB, Bank of Baroda, Bank of India, and the named
 * Bihar cooperative. This is the code authority; the allowlist governs which
 * `(pariwar_id, bank_code)` PAIRS are admitted at runtime (v1: all 5 for `bihar`).
 */
export const BankCode = z.enum(['sbi', 'pnb', 'bob', 'boi', 'cooperative']);
export type BankCode = z.output<typeof BankCode>;

/** The 5 v1 codes as a readonly tuple (read the set, never a hardcoded literal). */
export const BANK_CODES = BankCode.options;

/**
 * The runtime-permitted bank type. In v1 the permitted set === the full `BankCode`
 * enum (all 5 admitted for `bihar`); the AUTHORITY for which `(pariwar_id, bank_code)`
 * pairs are actually admitted is `bank-allowlist.yaml` (read by `@twt/bank-parsers`,
 * which owns the allowlist — the dependency direction is bank-parsers → domain, so the
 * pair-level allowlist cannot live here). This alias exists so downstream code names
 * "a permitted bank" intentionally rather than reaching for `BankCode` directly.
 */
export type PermittedBank = BankCode;

// ── Entry-type derivation (AC3) ───────────────────────────────────────────────

/**
 * The canonical transaction classification every parser derives from the bank's
 * native row: `credit` (a deposit — the contribution happy path the 9.4 matcher
 * confirms), `debit` (an outgoing transfer), `charge` (a bank fee), `reversal` (a
 * refund / reversal of a prior entry).
 */
export const BankEntryType = z.enum(['credit', 'debit', 'charge', 'reversal']);
export type BankEntryType = z.output<typeof BankEntryType>;

// ── ISO date authority (AC3) ──────────────────────────────────────────────────

/**
 * `transaction_date` format authority — an ISO-8601 calendar date (`YYYY-MM-DD`),
 * optionally with a `THH:MM:SS` time (some banks carry a value-time). Parsers
 * normalize the bank's native `DD/MM/YYYY` / `DD-MMM-YY` etc. into this canonical
 * form so the matcher never re-parses locale-specific date strings.
 */
export const BANK_TRANSACTION_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?$/;

// ── The canonical row (AC3) ───────────────────────────────────────────────────

/**
 * The single normalized bank-statement row. `.strict()` — an unexpected key is a
 * parser bug (a native column that leaked past normalization), not something to
 * silently pass through.
 */
export const BankStatementEntry = z
  .object({
    /** Deterministic UUIDv5 (see `deriveBankStatementEntryId`) — NEVER random. */
    entry_id: z.string().uuid(),
    /** Which of the 5 v1 banks produced the source statement. */
    bank_code: BankCode,
    /** ISO-8601 date (or date-time) of the transaction (← arch `datetime`). */
    transaction_date: z.string().regex(BANK_TRANSACTION_DATE_REGEX),
    /**
     * The UTR / bank reference number (← arch `utr` / FR-29 `UTR`) — the matcher's
     * primary key. NULLABLE: charges, reversals, and partial/malformed rows may carry
     * no UTR (a partial row is recorded, not dropped — parser-sandbox graceful
     * degradation), and the matcher simply never confirms a UTR-less row.
     */
    transaction_id_utr: z.string().min(1).nullable(),
    /** The payer's UPI VPA if the narration carried one (arch `sender_vpa?`). */
    sender_vpa: z.string().min(1).nullable(),
    /**
     * The payer's name (KEEP per D4 — architecture §3.6 + FR-29 require it; the 9.4
     * secondary match reads sender identity). NULL when the bank's row carries none.
     */
    sender_name: z.string().min(1).nullable(),
    /** Signed amount in INTEGER PAISE (₹1,000.50 → 100050). Always non-negative here;
     *  direction is carried by `entry_type`, not the sign. */
    amount: z.number().int().nonnegative(),
    /** The narration / description text (← arch `narration`), preserved as decoded.
     *  May be an empty string (some rows carry none). */
    description: z.string(),
    /** The derived transaction classification. */
    entry_type: BankEntryType,
    /** The running account balance after this entry, INTEGER PAISE. NULL when the
     *  bank's format omits a balance column or the cell was blank/unparseable. */
    running_balance: z.number().int().nullable(),
    /**
     * The source account identifier the statement belongs to (arch `source_account`) —
     * ties an entry to the nominee account that produced it (relevant to the dual-account
     * 6.8/9.9 workaround). NULL when the CSV carries no account column; the 9.3 transport
     * MAY inject it from the upload context.
     */
    source_account: z.string().min(1).nullable(),
    /**
     * The VERBATIM native cells of the source row, exactly as decoded and split by the
     * CSV reader — preserved for audit and NEVER interpreted (architecture §3.6: "CSV
     * inputs preserved… original narration values stored unmodified"). Formula-injection
     * cells (`=`, `+`, `-`, `@` prefixes) live here untouched; output-sanitization is an
     * EXPORT concern, not the parser's.
     */
    raw_row: z.array(z.string()).readonly(),
    /** Which parser + version produced this row (e.g. `sbi@1`) — makes a re-parse
     *  auditable and lets a format-change bump the version deterministically. */
    parser_version: z.string().min(1),
  })
  .strict();

export type BankStatementEntry = z.output<typeof BankStatementEntry>;

// ── Money helper — exact string→paise (no float) ──────────────────────────────

/**
 * Parse an INR amount string into INTEGER PAISE, exactly, with no floating-point.
 * Accepts thousands separators (`1,000.50`), a leading currency symbol/whitespace
 * (`₹ 1,000`), and 0/1/2 decimal places (`1000`, `1000.5`, `1000.50`). Returns the
 * non-negative paise magnitude (a leading `-` or trailing `Dr`/`Cr` is the CALLER's
 * concern — direction is `entry_type`, per the schema). Throws `BankAmountParseError`
 * on a value that is not a well-formed amount (the caller decides: skip-with-record
 * for a partial row, or propagate).
 */
export function parseInrToPaise(raw: string): number {
  const cleaned = raw
    .trim()
    // Leading currency symbol / "Rs."/"Rs" token only — NOT a bare `.`, which would
    // otherwise swallow the decimal point of a value like `.50` and silently turn it
    // into 50.00 (a 100x error).
    .replace(/^\s*(?:₹|rs\.?)?\s*/i, '')
    .replace(/[,\s]/g, '') // thousands separators + inner whitespace
    .replace(/(cr|dr)$/i, ''); // trailing Cr/Dr direction markers
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(cleaned)) {
    throw new BankAmountParseError(raw);
  }
  const negative = cleaned.startsWith('-');
  const magnitude = negative ? cleaned.slice(1) : cleaned;
  const [rupees, frac = ''] = magnitude.split('.');
  const paiseFrac = (frac + '00').slice(0, 2); // pad to exactly 2 digits
  // Integer arithmetic only — no `* 100` on a float.
  return Number(rupees) * 100 + Number(paiseFrac);
}

/** Thrown by `parseInrToPaise` when a cell is not a well-formed INR amount. */
export class BankAmountParseError extends Error {
  constructor(public readonly received: string) {
    super(`[bank-statement] not a well-formed INR amount: ${JSON.stringify(received)}`);
    this.name = 'BankAmountParseError';
  }
}

// ── Deterministic entry-id (UUIDv5) — replay identity ─────────────────────────

/**
 * PINNED namespace UUID for deterministic `entry_id` derivation. Part of the parser's
 * REPLAY IDENTITY — NEVER change it (a change would make every re-parse mint different
 * ids and break all 250 golden files). Arbitrary but permanent (mirrors
 * `POOL_ID_NAMESPACE_UUID`).
 */
export const BANK_STATEMENT_ENTRY_ID_NAMESPACE_UUID = 'a1f4c8d2-9b3e-4c7a-8d61-2e5f0a9b4c37';

const NAMESPACE_BYTES = Buffer.from(
  BANK_STATEMENT_ENTRY_ID_NAMESPACE_UUID.replace(/-/g, ''),
  'hex',
);

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * The identifying content a deterministic `entry_id` is derived from. `rowIndex` is
 * included so two byte-identical rows in the same file still get DISTINCT (but stable)
 * ids — a statement can legitimately repeat a row, and the duplicate-row golden case
 * must round-trip.
 */
export interface BankStatementEntryIdInput {
  readonly bankCode: BankCode;
  readonly parserVersion: string;
  readonly rowIndex: number;
  readonly rawRow: readonly string[];
}

/**
 * Derive a normalized entry's id DETERMINISTICALLY as UUIDv5 over the pinned namespace
 * + the canonical string `${bankCode}|${parserVersion}|${rowIndex}|${rawRow…}`. A
 * re-parse of the same bytes reproduces the identical id — that is what makes the
 * golden corpus a fixed regression baseline and a re-parse auditable. Uses U+0001 as
 * the cell delimiter (a control char that cannot appear in decoded CSV text) so the
 * join is injective.
 */
export function deriveBankStatementEntryId(input: BankStatementEntryIdInput): BankStatementEntryId {
  const { bankCode, parserVersion, rowIndex, rawRow } = input;
  if (!Number.isInteger(rowIndex) || rowIndex < 0) {
    throw new Error(
      `[deriveBankStatementEntryId] rowIndex must be a non-negative integer, got ${String(rowIndex)}`,
    );
  }
  const canonical = `${bankCode}|${parserVersion}|${rowIndex}|${rawRow.join('\u0001')}`;
  const hash = createHash('sha1')
    .update(Buffer.concat([NAMESPACE_BYTES, Buffer.from(canonical, 'utf8')]))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC-4122 variant
  return bankStatementEntryId(bytesToUuid(bytes));
}
