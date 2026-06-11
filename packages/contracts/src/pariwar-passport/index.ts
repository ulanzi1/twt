// packages/contracts/src/pariwar-passport/index.ts
//
// Barrel for the Pariwar-Passport transport contracts (Story 1.7, FR-63).
// Re-exported from the package root (packages/contracts/src/index.ts) so
// consumers import from `@twt/contracts`. A `@twt/contracts/pariwar-passport`
// subpath export is NOT wired yet (no apps/api consumer until Story 1.9+); adding
// an `exports` map entry then is trivial.

export * from './branding-bundle.js';
export * from './passport.js';
