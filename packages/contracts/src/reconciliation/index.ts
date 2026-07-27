// packages/contracts/src/reconciliation/index.ts — the reconciliation contract barrel.
//
// Story 9.2 lands the FIRST reconciliation contract: the parser normalization-output
// SUMMARY the 9.3 `<BankStatementUpload>` surface renders. The UTR-matching + triage-queue
// contracts land at Story 9.4 (see the directory README). Consume via the `@twt/contracts`
// top barrel (there is no subpath `exports` map): `import { ParseResultSummary } from '@twt/contracts'`.

export * from './parse-result.js';
// Story 9.3 — the upload-transport shapes + the two injectable ports (BankStatementStorage +
// StatementScanner) the `<BankStatementUpload>` surface rides on (Decisions D1/D3/D4).
export * from './statement-storage.js';
// Story 9.7 — the member self-verify SCREENSHOT-upload transport port + its accepted-MIME/byte-cap
// constants (Decision D1: a NEW port instance + bucket, the 9.3 D3 precedent). Reuses the 9.3
// `StatementScanner` virus-scan seam (no new scanner port). The `SelfVerifyScreenshotStorage` adapters
// live in `@twt/platform-adapters`.
export * from './self-verify-screenshot-storage.js';
