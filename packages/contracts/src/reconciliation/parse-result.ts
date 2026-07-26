// packages/contracts/src/reconciliation/parse-result.ts
//
// The parser NORMALIZATION-OUTPUT transport contract (Story 9.2, Task 5) — the FIRST
// reconciliation contract. The parse-result SUMMARY the Story 9.3 `<BankStatementUpload>`
// surface renders after the server parses an uploaded statement: how many rows normalized,
// how many were skipped-with-record (+ why), which bank + parser version. `.strict()`.
//
// ── This is a SUMMARY, not the entries themselves (no type-shadowing — README #2) ──────
// The canonical row shape `BankStatementEntry` is OWNED by @twt/domain; this contract does
// NOT redeclare or embed it. The full entries stay server-internal (the 9.4 matcher's
// input); the upload surface renders only this summary. So there is nothing here to shadow.
//
// ── Bank code is re-declared locally, kept in lockstep by a TEST (bundle boundary) ─────
// `packages/contracts` MUST NOT import @twt/domain at SOURCE (it would pull `pg` into the
// mobile Metro bundle — [[project_contracts_domain_bundle_boundary]]). So `BankCodeSchema`
// is a LOCAL z.enum; `packages/contracts/tests/reconciliation.test.ts` imports the domain
// `BANK_CODES` TEST-ONLY and asserts the two are value-aligned (the upi-intent precedent).
//
// ── Tenant-scoped route (noted for 9.3, not wired here) ────────────────────────────────
// The 9.3 upload endpoint is tenant-scoped: `POST /api/v1/p/<pariwar_id>/reconciliation/
// statements` (architecture §3.1). 9.2 authors the shape only — no route, no `.openapi()`.

import { z } from 'zod';

/**
 * The 5 v1 bank codes (SBI / PNB / BoB / BoI / Bihar cooperative). LOCAL copy of the
 * @twt/domain `BankCode` enum — value-aligned by the reconciliation test's lockstep guard,
 * never imported at source (browser-bundle rule).
 */
export const BankCodeSchema = z.enum(['sbi', 'pnb', 'bob', 'boi', 'cooperative']);
export type BankCodeValue = z.output<typeof BankCodeSchema>;

/**
 * Why rows were skipped-with-record, as a per-reason count breakdown (the machine tokens
 * the parser emits). Presentation: the 9.3 surface can show "3 rows skipped (2 partial, 1
 * empty)" without leaking any row content. `.strict()`.
 */
export const RejectedRowBreakdown = z
  .object({
    /** A data row whose date could not be normalized to ISO. */
    'unparseable-date': z.number().int().nonnegative(),
    /** A data row with no parseable amount in any amount column. */
    'missing-amount': z.number().int().nonnegative(),
    /** An all-blank row. */
    'empty-row': z.number().int().nonnegative(),
    /** A single-amount-column row whose Dr/Cr indicator is blank/unrecognized. */
    'ambiguous-direction': z.number().int().nonnegative(),
    /** A separate-debit/credit-column row with both cells non-empty. */
    'ambiguous-amount': z.number().int().nonnegative(),
  })
  .strict();
export type RejectedRowBreakdown = z.output<typeof RejectedRowBreakdown>;

/**
 * `POST /api/v1/p/<pariwar_id>/reconciliation/statements` response SUMMARY (Story 9.3
 * renders it). Carries counts + provenance, never the entries themselves. `.strict()`.
 */
export const ParseResultSummary = z
  .object({
    /** The bank whose parser produced this result. */
    bank_code: BankCodeSchema,
    /** How many rows normalized into a canonical entry. */
    rows_parsed: z.number().int().nonnegative(),
    /** How many rows were skipped-with-record. */
    rows_rejected: z.number().int().nonnegative(),
    /** Per-reason breakdown of the skipped rows. */
    rejected_breakdown: RejectedRowBreakdown,
    /** The parser + version that produced this result (e.g. `sbi@1`) — auditability. */
    parser_version: z.string().min(1),
  })
  .strict();
export type ParseResultSummary = z.output<typeof ParseResultSummary>;
