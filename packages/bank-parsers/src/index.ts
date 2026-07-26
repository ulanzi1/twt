// @twt/bank-parsers — the bank-statement parser engine (Story 9.2, [PRIMITIVE]).
//
// Fills the PR-1 placeholder. The pure parse engine for the reconciliation pipeline:
// a 5-bank allowlist (SBI/PNB/BoB/BoI/+1 Bihar cooperative) of per-bank CSV parsers
// dispatched by a `(pariwar, bank_code)` registry, each emitting the ONE canonical
// `@twt/domain` `BankStatementEntry` shape the Story 9.4 UTR matcher replays.
//
// PURE + LOCAL + DB-FREE — no storage, no network, no DB (D1: that transport is the
// Story 9.3 `<BankStatementUpload>` surface). AR-45 resilience binds the 9.3 storage-
// fetch / future-OCR seam, NOT this pure parser (D3). Dependency direction is
// bank-parsers → @twt/domain, never the reverse.

export {
  parseStatement,
  isSupported,
  registeredPairs,
  type RegistryKey,
} from './registry.js';

export { UnsupportedBankError, BankStatementParseError } from './errors.js';

export {
  parseBankAllowlist,
  loadBankAllowlist,
  bankAllowlistPath,
  BankAllowlistError,
  type BankAllowlist,
  type AllowlistPair,
} from './allowlist.js';

export { defineBankParser, type BankParser, type BankParserConfig, type BankColumns } from './factory.js';

export type { BankParseResult, RejectedRow } from './normalize.js';

// NOTE: the per-bank parser fns (parseSbi, parsePnb, ...) are intentionally NOT
// re-exported here. `parseStatement` is the only public entry point so every
// caller is forced through the (pariwar, bank_code) allowlist/registry gate
// (AC1/AC4) — a direct per-bank export would let a consumer bypass it.
