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
