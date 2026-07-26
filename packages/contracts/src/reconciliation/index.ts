// packages/contracts/src/reconciliation/index.ts — the reconciliation contract barrel.
//
// Story 9.2 lands the FIRST reconciliation contract: the parser normalization-output
// SUMMARY the 9.3 `<BankStatementUpload>` surface renders. The UTR-matching + triage-queue
// contracts land at Story 9.4 (see the directory README). Consume via the `@twt/contracts`
// top barrel (there is no subpath `exports` map): `import { ParseResultSummary } from '@twt/contracts'`.

export * from './parse-result.js';
