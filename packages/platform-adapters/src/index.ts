// @twt/platform-adapters public surface.
//
// Story 6.5 — the reusable `ClaimDocumentStorage` object-store adapters (Decision D1). Both
// apps/api (upload → `put`; preview → `signedReadUrl`) and apps/jobs (OCR job → `getBytes`)
// import these; apps cannot depend on apps, so the shared concrete adapters land HERE. The
// `ClaimDocumentStorage` PORT lives in `@twt/contracts`; these are its implementations.
export { createGcsClaimDocumentStorage } from './claim-document-storage/gcs.js';
export type { GcsClaimDocumentStorageOpts } from './claim-document-storage/gcs.js';
export { createInMemoryClaimDocumentStorage } from './claim-document-storage/in-memory.js';
export type { InMemoryClaimDocumentStorage } from './claim-document-storage/in-memory.js';
export { createLocalFsClaimDocumentStorage } from './claim-document-storage/local-fs.js';
export type { LocalFsClaimDocumentStorageOpts } from './claim-document-storage/local-fs.js';

// Story 9.3 — the NEW `BankStatementStorage` object-store adapters (Decision D3 — the 6.5 PATTERN, a
// separate port instance + bucket, NOT a claim-document reuse) + the abstraction-first `StatementScanner`
// virus-scan seam (Task 4; no-op v1, the 6.5 `OcrProvider` posture). The PORTS live in `@twt/contracts`.
export { createGcsBankStatementStorage } from './bank-statement-storage/gcs.js';
export type { GcsBankStatementStorageOpts } from './bank-statement-storage/gcs.js';
export { createInMemoryBankStatementStorage } from './bank-statement-storage/in-memory.js';
export type { InMemoryBankStatementStorage } from './bank-statement-storage/in-memory.js';
export { createLocalFsBankStatementStorage } from './bank-statement-storage/local-fs.js';
export type { LocalFsBankStatementStorageOpts } from './bank-statement-storage/local-fs.js';
export {
  createNoOpStatementScanner,
  createRejectingStatementScanner,
} from './statement-scanner/no-op.js';

// Story 9.7 — the NEW `SelfVerifyScreenshotStorage` object-store adapters (Decision D1 — the 6.5/9.3
// PATTERN, a separate port instance + bucket, NOT a reuse) for the member self-verify screenshot-upload
// transport. Reuses the 9.3 `StatementScanner` virus-scan seam (no new scanner). The PORT lives in
// `@twt/contracts`.
export { createGcsSelfVerifyScreenshotStorage } from './self-verify-screenshot-storage/gcs.js';
export type { GcsSelfVerifyScreenshotStorageOpts } from './self-verify-screenshot-storage/gcs.js';
export { createInMemorySelfVerifyScreenshotStorage } from './self-verify-screenshot-storage/in-memory.js';
export type { InMemorySelfVerifyScreenshotStorage } from './self-verify-screenshot-storage/in-memory.js';
export { createLocalFsSelfVerifyScreenshotStorage } from './self-verify-screenshot-storage/local-fs.js';
export type { LocalFsSelfVerifyScreenshotStorageOpts } from './self-verify-screenshot-storage/local-fs.js';

// Story 10.2 — helpdesk-attachment object store (a NEW port instance, the 6.5 PATTERN, not a
// claim-document reuse): the member ticket-filing surface stores photos/PDFs by object key + the
// signed-URL read is the member's OWN-attachment access. The `HelpdeskAttachmentStorage` PORT lives
// in `@twt/contracts` (no `getBytes` — no server-side re-fetch consumer).
export { createGcsHelpdeskAttachmentStorage } from './helpdesk-attachment-storage/gcs.js';
export type { GcsHelpdeskAttachmentStorageOpts } from './helpdesk-attachment-storage/gcs.js';
export { createInMemoryHelpdeskAttachmentStorage } from './helpdesk-attachment-storage/in-memory.js';
export type { InMemoryHelpdeskAttachmentStorage } from './helpdesk-attachment-storage/in-memory.js';
export { createLocalFsHelpdeskAttachmentStorage } from './helpdesk-attachment-storage/local-fs.js';
export type { LocalFsHelpdeskAttachmentStorageOpts } from './helpdesk-attachment-storage/local-fs.js';

// Story 6.8 — the abstraction-first `BankIfscLookup` port (interface + adapters bundled) for
// claim-time IFSC pre-validation (D4). apps/api (member + helpline nominee-bank routes) imports
// the port type + the in-memory stub. NO real-vendor adapter / CI boundary gate yet (the 6.5
// `OcrProvider` posture — the gate lands with a real vendor).
export { IFSC_REGEX, isValidIfscFormat } from './bank-ifsc-lookup/port.js';
export type { BankIfscLookup, BankIfscRecord } from './bank-ifsc-lookup/port.js';
export { createInMemoryBankIfscLookup } from './bank-ifsc-lookup/in-memory.js';
export type { InMemoryBankIfscLookup } from './bank-ifsc-lookup/in-memory.js';

// Story 7.1 — the pool-snapshot cold-storage adapters (Task 6, AC3). The `SnapshotStorage`
// PORT lives in `@twt/contracts`; these are its GCS (live) + in-memory (test) implementations.
// The port EXPOSES a write/read seam only — the daily dump job (Story 1.10 mirror pattern) +
// bucket/Object-Retention-Lock provisioning are DEFERRED infra, calling through this port.
export { createGcsSnapshotStorage } from './snapshot-storage/gcs.js';
export type { GcsSnapshotStorageOpts } from './snapshot-storage/gcs.js';
export { createInMemorySnapshotStorage } from './snapshot-storage/in-memory.js';
export type { InMemorySnapshotStorage } from './snapshot-storage/in-memory.js';

// Story 8.7 — the `ContributionNotePdfRenderer` adapters (Yogdaan Pratigya PDF, D1). The PORT lives in
// `@twt/contracts`; these are its headless-Chromium (live) + deterministic-fake (test) implementations.
// `puppeteer-core` is imported LAZILY inside the Chromium adapter, so importing this barrel — which
// every apps/api test does — never loads the engine.
export { createChromiumContributionNotePdfRenderer } from './contribution-note-pdf/chromium.js';
export type {
  ChromiumContributionNotePdfRenderer,
  ChromiumContributionNotePdfRendererOpts,
} from './contribution-note-pdf/chromium.js';
export { createFakeContributionNotePdfRenderer } from './contribution-note-pdf/fake.js';
export type {
  FakeContributionNotePdfRenderer,
  RecordedContributionNoteRender,
} from './contribution-note-pdf/fake.js';
