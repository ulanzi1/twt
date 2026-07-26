// Typed errors for the bank-parser engine — Story 9.2 (AC1, parser-sandbox posture).
//
// The parser is PURE and FAILURE-ISOLATED (architecture §5.3): a lookup miss or a
// malformed input returns a TYPED error to the caller — it must never crash the
// (future) matcher or the API process. The 9.3 `<BankStatementUpload>` surface renders
// these; 9.2 only produces them.

import type { bankStatement } from '@twt/domain';

type BankCode = bankStatement.BankCode;

/**
 * Thrown when a `(pariwar_id, bank_code)` has no registered parser — i.e. the bank is
 * outside the 5-bank allowlist (AC1). It is NOT a silent drop and NOT a crash: it
 * carries a clear, member-safe message + a `helpdeskRouting` marker the 9.3 surface
 * uses to route the uploader to support ("this bank isn't supported yet — contact
 * helpdesk"). The requested pair is echoed for the audit log.
 */
export class UnsupportedBankError extends Error {
  /** Stable marker the 9.3 upload surface keys on to show the helpdesk route (AC1). */
  public readonly helpdeskRouting = true;
  public readonly code = 'UNSUPPORTED_BANK' as const;

  constructor(
    public readonly pariwarId: string,
    public readonly bankCode: string,
  ) {
    super(
      `[bank-parsers] no parser registered for (pariwar=${pariwarId}, bank=${bankCode}); ` +
        `this bank is not in the supported allowlist — route to helpdesk`,
    );
    this.name = 'UnsupportedBankError';
  }
}

/**
 * Thrown when the input as a whole cannot be read as CSV (not a per-row problem — a
 * per-row problem degrades to a skip-with-record, see `parse()`). E.g. an oversized
 * input that exceeds the resource cap, or a fundamentally un-CSV payload. Carries the
 * bank for the audit log; failure-isolated (never propagates as an uncaught throw past
 * the caller's boundary).
 */
export class BankStatementParseError extends Error {
  public readonly code = 'PARSE_FAILED' as const;

  constructor(
    public readonly bankCode: BankCode,
    public readonly reason: string,
  ) {
    super(`[bank-parsers] ${bankCode}: could not parse statement — ${reason}`);
    this.name = 'BankStatementParseError';
  }
}
