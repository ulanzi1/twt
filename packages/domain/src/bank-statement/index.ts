// Barrel for the bank-statement normalized-row module — Story 9.2.
// Re-exported from @twt/domain as the `bankStatement` namespace (see ../index.ts) so
// consumers call `bankStatement.BankStatementEntry` / `bankStatement.parseInrToPaise`
// / `bankStatement.deriveBankStatementEntryId`. The `@twt/bank-parsers` package imports
// these (dependency direction: bank-parsers → domain, never the reverse).

export * from './schema.js';
