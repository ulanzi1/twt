// packages/contracts/src/public-pages/index.ts
//
// Barrel for the FR-74 Public-vs-Private matrix schema + the PII scrape
// verification engine (Story 1.16b). Re-exported from the package root
// (packages/contracts/src/index.ts) so consumers import from `@twt/contracts`.
//
// The verification engine (scrape.ts) is PURE + IMPORTABLE by design: the
// architecture-committed live-render integration spec
// `tests/integration/public-pages/scrape-test.spec.ts` (D13-1.2) lands at
// Story 2.5/11a.2 and consumes this same engine against real public renders.
//
// No `@twt/contracts/public-pages` subpath export is wired (no apps/api consumer
// yet; mirrors the rbac / pariwar-passport convention) — adding an `exports` map
// entry then is trivial.

// Story 11a.3 — the public Member Directory transport DTO + the deep-pagination horizon. This IS
// an apps/api consumer, unlike the matrix/gate/scrape trio above.
export * from './abuse-rules.js';
export * from './directory.js';
export * from './gate.js';
export * from './matrix.js';
export * from './scrape.js';
