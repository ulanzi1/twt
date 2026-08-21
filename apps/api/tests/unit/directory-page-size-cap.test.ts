// The Member Directory page-size cap — cross-package drift guard (Story 11a.3, AC6.1;
// code-review finding, 2026-08-21).
//
// ── ⛔ WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────────
// AC6.1 requires `PUBLIC_PAGE_SIZE_MAX` (50) be "imported from `_common/pagination.ts`, ⛔ not
// re-declared" and "enforced at BOTH ends: rejected at the Astro parse and clamped at the domain
// accessor." `apps/public`'s `pagination.ts` DOES import it. `packages/domain`'s
// `directory-read.ts` does NOT — it declares its own literal `DIRECTORY_PAGE_SIZE_CAP = 50`,
// because `@twt/domain` structurally cannot import `@twt/contracts` (contracts already depends on
// domain — the reverse import would be a workspace dependency cycle, per the contracts↔domain
// bundle boundary). That structural block is real, but it left NOTHING asserting the two literals
// stay equal — a silent drift at either end would only be caught by someone reading both files.
//
// `apps/api` is the one package that already depends on BOTH `@twt/domain` and `@twt/contracts` —
// so THIS is where the property can be asserted without restructuring the dependency graph.
// Pure, DB-free, no network — this is a constant-equality check, not an integration test.
import {
  PUBLIC_SURFACE_PAGE_SIZE_CAP,
  PUBLIC_SURFACE_PAGE_SIZE_DEFAULT,
} from '@twt/contracts';
import { member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

describe('Member Directory page-size cap — the domain accessor never drifts from the wire cap', () => {
  it('DIRECTORY_PAGE_SIZE_CAP === PUBLIC_SURFACE_PAGE_SIZE_CAP', () => {
    expect(memberDomain.DIRECTORY_PAGE_SIZE_CAP).toBe(PUBLIC_SURFACE_PAGE_SIZE_CAP);
  });

  it('⚠ both are 50, named so a future reader sees the number without opening either file', () => {
    // ⛔ Not the property alone — a drift where BOTH sides moved together to the SAME wrong number
    // would pass the equality check above and still violate the ruled cap. Pinning the literal
    // here means raising it (an FR-91 change, per directory-read.ts's own doc comment) requires
    // touching this assertion too, not just the two declarations.
    expect(PUBLIC_SURFACE_PAGE_SIZE_CAP).toBe(50);
  });
});

describe('Member Directory page-size DEFAULT — the same guard, for the number one line away', () => {
  // ⚠ WHY THIS BLOCK EXISTS. The cap above got a cross-package drift guard because 11a.2's review
  // found a false "shared constant" claim. The DEFAULT (25) was then re-declared as a bare literal
  // in THREE places — `apps/public`'s pagination module, the `apps/api` handler, and the domain
  // accessor — and left unguarded, recreating the same class of defect immediately beside its own
  // fix. Two of the three now IMPORT `PUBLIC_SURFACE_PAGE_SIZE_DEFAULT`; the domain accessor
  // structurally cannot (contracts already depends on domain), so it is pinned here.
  it('DIRECTORY_PAGE_SIZE_DEFAULT === PUBLIC_SURFACE_PAGE_SIZE_DEFAULT', () => {
    expect(memberDomain.DIRECTORY_PAGE_SIZE_DEFAULT).toBe(PUBLIC_SURFACE_PAGE_SIZE_DEFAULT);
  });

  it('⚠ the default is 25 and the cap is 50 — DIFFERENT FR-91 numbers, ⛔ never merged', () => {
    // ⛔ The epic's "e.g., 25 entries/page" is the DEFAULT, ⛔ not a second cap, and pinning both
    // literals means moving either one requires touching this assertion — which is where a reader
    // learns it is an FR-91 change needing its own ruling.
    expect(PUBLIC_SURFACE_PAGE_SIZE_DEFAULT).toBe(25);
    expect(PUBLIC_SURFACE_PAGE_SIZE_DEFAULT).toBeLessThan(PUBLIC_SURFACE_PAGE_SIZE_CAP);
  });
});
