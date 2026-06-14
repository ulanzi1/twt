// Public API surface for the audit-log module — Story 1.10.
//
// Consumed via `import { writeAuditEntry } from '@twt/domain/audit'` or the
// top-level `audit.*` namespace re-export in packages/domain/src/index.ts
// (mirroring crossTenant.*). The writer primitive + the pure hash-chain helpers
// (shared with Story 1.11a's integrity-check job) + the advisory-lock key.
// See README.md.

export {
  writeAuditEntry,
  AUDIT_CHAIN_LOCK_KEY,
  type AuditEntryInput,
} from './write.js';
export {
  GENESIS_PREV_HASH,
  auditRowDigestInput,
  computeAuditHash,
  verifyChainSegment,
  type AuditChainContent,
  type ChainVerificationResult,
} from './hash-chain.js';
