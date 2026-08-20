// <AuthenticatedFragment> + the cache-safety guarantee — Story 11a.2 (Task 5; AC3).
//
// ── ⚠ WHY THIS IS A SOURCE SCAN AND NOT A RENDER TEST ───────────────────────
// `.astro` components are not unit-testable in this repo, which is why the house
// convention puts display logic in pure `.ts`. But AC3's property is not a display
// decision — it is the ABSENCE of a capability: the fragment must read no session,
// no cookie, no auth header, so its SSR output is identical for every request.
//
// An absence is proven by scanning for what must not be there. That is strictly
// STRONGER than rendering twice with different cookies and comparing: a render test
// proves the two requests it happened to try produced the same bytes; this proves
// the component cannot read the input that would make them differ, for any request.
// ⛔ It is not a weaker substitute — say so plainly rather than implying a render
// comparison was skipped for convenience.
//
// ⚠ WHAT IT DOES NOT PROVE: that a fragment's *slotted children* are auth-free. A
// caller could pass authenticated content into the slot. Nothing here can see that,
// and the tier-leak leg is what would catch the resulting render.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, '../src', rel), 'utf8');

/**
 * Strip comments before scanning for forbidden reads.
 *
 * ⭐ LOAD-BEARING, and it caught itself on the first run: `AuthenticatedFragment.astro`
 * DOCUMENTS the prohibition ("⛔ DO NOT read Astro.cookies …"), so an unstripped scan
 * flagged the very prose that states the rule. That is the mirror of the defect
 * `astroTemplate()` exists to prevent in the indexing leg — a check agreeing with a
 * comment instead of with the code — and it must not be "fixed" by softening the
 * comment. ⛔ Strip, then scan.
 */
function code(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // {/* astro template comments */}
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* block */
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // // line (⛔ not inside a URL)
}

const src = (rel: string) => code(read(rel));

/**
 * Auth-bearing request surfaces. ⚠ `Astro.request.headers` is NOT here: pages read
 * `accept-language` from it legitimately, and that is negotiated content covered by
 * `Vary: Accept-Language` — ⛔ not auth-derived branching. Listing it would make the
 * test wrong, and a wrong test gets deleted rather than fixed.
 */
const AUTH_READS = [
  'Astro.cookies',
  'Astro.session',
  'Astro.locals.session',
  'Astro.locals.member',
  "headers.get('authorization')",
  'headers.get("authorization")',
  'Authorization',
];

describe('AC3 — <AuthenticatedFragment> SSRs the public fallback and NOTHING else', () => {
  const component = src('components/AuthenticatedFragment.astro');

  it.each(AUTH_READS)('⛔ reads no auth surface: %s', (needle) => {
    expect(component.toLowerCase()).not.toContain(needle.toLowerCase().replace('⛔', ''));
  });

  it('⛔ takes NO `isAuthenticated`-style prop — a prop only moves the read to the caller', () => {
    // The subtle failure this forbids: a caller reading the session and passing a
    // boolean in would put auth-derived branching back into cache-safe SSR output
    // while this file still looked clean.
    expect(/isAuthenticated|isLoggedIn|viewerIsMember|authenticated\s*[?:]/.test(component)).toBe(
      false,
    );
  });

  it('⛔ contains no conditional branch on any viewer state — the markup is unconditional', () => {
    // The template renders one wrapper plus <slot />, always. No ternary, no `&&`
    // guard, no <Fragment set:if>. If this ever needs to become conditional, the
    // deferral in COMPOSITION-CONTRACT.md is the thing to reopen — not this test.
    const template = component.split('---').slice(2).join('---');
    expect(template).toContain('<slot />');
    expect(/\{\s*\w+\s*&&/.test(template)).toBe(false);
    expect(/\?[^:]*:/.test(template.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''))).toBe(false);
  });

  it('names the deferral and its re-trigger, ⛔ so the fork cannot be silently resolved later', () => {
    // ⚠ Reads the RAW source deliberately — this assertion is ABOUT the prose, which
    // is where a deferral lives. Everything above reads the comment-stripped code.
    const raw = read('components/AuthenticatedFragment.astro');
    expect(raw).toMatch(/server:defer/);
    expect(raw).toMatch(/FR-77/);
    expect(raw).toMatch(/member-web/);
  });
});

describe('AC3 — the cache-safe guarantee holds across the shell, not just the fragment', () => {
  // Story 2.5 committed "no session is read on any public route" and enforced it by
  // convention. ⚠ This story mechanizes it, because a new page is exactly where that
  // convention gets forgotten — the way /blog forgot Cache-Control.
  const SCANNED = [
    'layouts/PublicShell.astro',
    'components/AuthenticatedFragment.astro',
    'components/MatrixField.astro',
  ];

  it.each(SCANNED)('%s reads no session or cookie', (rel) => {
    const source = src(rel).toLowerCase();
    for (const needle of AUTH_READS) {
      expect(source, `${rel} must not read ${needle}`).not.toContain(needle.toLowerCase());
    }
  });
});

describe('AC3 — the fragment registry is HONESTLY empty', () => {
  const contract = readFileSync(join(here, '../COMPOSITION-CONTRACT.md'), 'utf8');

  it('states plainly that ZERO live fragments ship, ⛔ not that the pattern is established', () => {
    expect(contract).toMatch(/zero (live )?(authenticated )?fragments/i);
  });

  it('names FR-77 (Epic 11b) as the v1 registry entry the architecture already commits', () => {
    expect(contract).toMatch(/FR-77/);
  });

  it('⛔ apps/api/src/modules/public-pages/ is NOT created — a module with no route is a claim', () => {
    // Asserted on the real tree: `feedback_no_premature_package` — a boundary lands
    // with its first consumer, and the first consumer is Epic 11b.
    const apiModules = join(here, '../../../apps/api/src/modules/public-pages');
    let exists = true;
    try {
      readFileSync(join(apiModules, 'index.ts'), 'utf8');
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
