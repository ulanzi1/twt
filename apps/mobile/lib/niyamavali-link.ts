// Public Niyamavali deep-link builder (Story 3.7, Task 6).
//
// The lock-in clock widget's tap-target opens the public Niyamavali render (Story 2.5,
// apps/public/src/pages/niyamavali.astro) deep-linked to the relevant clause. That page reads
// `?clause=<clauseId>&lang=<locale>` (niyamavali.astro:43 `clause`, :29 `lang`); a malformed clause
// falls through to its unknown-clause view, so no client-side guard is needed beyond URL-encoding.
//
// ⚖ Story 10.19: the origin resolution moved to `lib/public-site.ts` when the termination surface
// became a second consumer of it (AC10 — a terminated member keeps reaching public Trust content).
// This module is kept as the named entry point its existing callers import; the builder itself now
// lives beside the origin so the two cannot drift.

export { niyamavaliClauseUrl } from './public-site'
