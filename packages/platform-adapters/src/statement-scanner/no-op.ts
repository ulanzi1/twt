// No-op StatementScanner — Story 9.3 (Task 4 / architecture §3.6 "quarantine").
//
// The v1 virus-scan adapter: allow-all. There is NO real ClamAV / AV-vendor in the stack yet, so — the
// 6.5 `OcrProvider` "no boundary gate until a real vendor exists" posture — the seam is wired abstraction-
// first with a fake that always returns `{ clean: true }`. When a real vendor lands, ONLY this adapter is
// replaced; the port, the upload core's scan-before-store ordering, and the AR-45 wrapping are already in
// place. For a hostile-input test, `createRejectingStatementScanner` flags everything (quarantine-path teeth).

import type { StatementScanner, StatementScanVerdict } from '@twt/contracts';

/**
 * The allow-all v1 scanner. Deterministic: every input is `{ clean: true }`. Async to honour the port
 * (a real scanner performs I/O), so the upload core's AR-45 timeout/retry wrapping exercises the same
 * shape the live adapter will.
 */
export function createNoOpStatementScanner(): StatementScanner {
  return {
    async scan(): Promise<StatementScanVerdict> {
      return { clean: true };
    },
  };
}

/**
 * A scanner that QUARANTINES everything (or optionally by a byte-signature predicate) — for tests proving
 * the quarantine path rejects + audit-logs and never stores/parses. Not wired in production.
 */
export function createRejectingStatementScanner(
  opts: { readonly reason?: string; readonly flagIf?: (bytes: Uint8Array) => boolean } = {},
): StatementScanner {
  const reason = opts.reason ?? 'test-signature';
  return {
    async scan(bytes): Promise<StatementScanVerdict> {
      if (opts.flagIf && !opts.flagIf(bytes)) return { clean: true };
      return { clean: false, reason };
    },
  };
}
