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
