// packages/contracts/src/pariwar-provisioning/index.ts
//
// Barrel for the multi-Pariwar provisioning transport contracts (Story 1.15,
// FR-61/FR-62). Re-exported from the package root (packages/contracts/src/index.ts)
// so consumers import from `@twt/contracts` (the established root-barrel convention
// — no `exports` subpath map is wired on this package; see pariwar-passport/index.ts).
// REUSES `@twt/contracts/pariwar-passport` (BrandingBundle + LocaleDefault +
// PariwarPassportResponse) — provisioning does not redefine branding/locale shapes.

export * from './add-pariwar.js';
export * from './status.js';
