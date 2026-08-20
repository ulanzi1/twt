// Gate-leg tests + REVERT-SANITY negative controls — Story 11a.1 (AC1, AC7, AC8, AC10).
//
// ⭐ AC10 is the load-bearing one and the house doctrine is blunt about why:
// *"a gate that cannot be made to fail has no teeth, and a governance gate that
// silently stopped detecting anything would be worse than no gate: the green
// check would actively certify an invariant nobody is enforcing"*
// (`scripts/governance-boundary/README.md`). This story exists because exactly
// that happened to the tier-leak leg.
//
// So EACH detection route below carries its own independently-planted violation.
// Not one fixture that trips several checks — one per route, because a single
// shared fixture lets a route quietly stop firing while its neighbours keep the
// suite green.
//
// Routes covered here (source-provable legs):
//   · undeclared route          · orphaned matrix surface
//   · stale renders:false       · indexing conflict (both directions)
//   · shell-less page claiming noindex
//   · escalation count mismatch · unattested escalation (decision ref with no entry)
// The remaining routes — tier leak, unclassified field, Tier-1 `public` without an
// exception, a second Tier-1 exception, malformed ledger — are proven in
// `public-pages-matrix-schema.test.ts` (parse-time) and the live-render
// integration spec (render-time), per the D2 split.

import { describe, expect, it } from 'vitest';

import {
  type PublicVsPrivateMatrix,
  astroTemplate,
  checkCachePolicyReconciliation,
  checkEscalationAttestation,
  checkIndexingReconciliation,
  checkPaginationBinding,
  checkRouteCoverage,
  detectCacheSignal,
  detectIndexingSignal,
  pageRouteFromPath,
} from '../src/public-pages/index.js';

function matrix(surfaces: PublicVsPrivateMatrix['surfaces'], extra: Partial<PublicVsPrivateMatrix> = {}): PublicVsPrivateMatrix {
  return { version: 2, surfaces, escalations: [], escalation_count: 0, ...extra };
}

const TERMS = {
  id: 'terms',
  route: '/terms',
  renders: true,
  search_indexing_policy: 'index' as const,
  cache_policy: 'edge_cacheable' as const,
  paginated: false,
  fields: [{ id: 'tc_body_html', tier: 'public' as const }],
};

/** A page that sets a shared-cache header, as `/terms` and `/niyamavali` do. */
const CACHED_PAGE = `---
Astro.response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
---
<PublicShell><p>hi</p></PublicShell>`;

describe('pageRouteFromPath — Astro file-based routing (AC1)', () => {
  it.each([
    ['index.astro', '/'],
    ['404.astro', '/404'],
    ['terms.astro', '/terms'],
    ['blog.astro', '/blog'],
    ['blog/[postId].astro', '/blog/[postId]'],
    ['blog/index.astro', '/blog'],
    ['a/b/c.astro', '/a/b/c'],
  ])('maps %s → %s', (path, route) => {
    expect(pageRouteFromPath(path)).toBe(route);
  });

  it('keeps a dynamic segment VERBATIM (the matrix declares the literal a reader sees)', () => {
    expect(pageRouteFromPath('blog/[postId].astro')).toContain('[postId]');
  });
});

describe('route coverage — both directions (AC1)', () => {
  it('passes when routes and surfaces agree exactly', () => {
    expect(checkRouteCoverage(matrix([TERMS]), ['/terms'])).toEqual([]);
  });

  it('NEGATIVE CONTROL — an UNDECLARED shipped route fails', () => {
    const findings = checkRouteCoverage(matrix([TERMS]), ['/terms', '/members-new']);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.leg).toBe('route_coverage');
    expect(findings[0]!.message).toMatch(/UNDECLARED ROUTE.*\/members-new/s);
  });

  it('NEGATIVE CONTROL — an ORPHANED matrix surface fails (the other direction)', () => {
    const findings = checkRouteCoverage(matrix([TERMS]), []);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/ORPHANED SURFACE/);
  });

  it('a renders:false surface is EXEMPT from needing a route (D5)', () => {
    const declared = { ...TERMS, id: 'member-directory', route: '/members', renders: false };
    expect(checkRouteCoverage(matrix([declared]), [])).toEqual([]);
  });

  it('NEGATIVE CONTROL — a STALE renders:false fails once its route ships', () => {
    const declared = { ...TERMS, id: 'member-directory', route: '/members', renders: false };
    const findings = checkRouteCoverage(matrix([declared]), ['/members']);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/STALE renders:false/);
  });
});

describe('astroTemplate — frontmatter is stripped before scanning (AC7)', () => {
  it('⭐ does NOT see "noindex" discussed in a frontmatter COMMENT', () => {
    // This is the shipped shape of 404.astro/500.astro: prose in the frontmatter
    // that mentions noindex, and the actual prop in the template.
    const source = '---\n// noindex (a not-found page is never SEO content).\nconst x = 1;\n---\n<PublicShell />';
    expect(astroTemplate(source)).not.toMatch(/noindex/);
    expect(detectIndexingSignal(source).noindex).toBe(false);
  });

  it('strips {/* … */} template comments too', () => {
    expect(astroTemplate('---\n---\n{/* noindex here */}<PublicShell />')).not.toMatch(/noindex/);
  });

  it('handles a file with no frontmatter at all', () => {
    expect(astroTemplate('<PublicShell noindex />')).toMatch(/noindex/);
  });
});

describe('detectIndexingSignal (AC7)', () => {
  it('detects the bare shorthand prop', () => {
    expect(detectIndexingSignal('---\n---\n<PublicShell locale={l} noindex>x</PublicShell>')).toEqual({
      shellPresent: true,
      noindex: true,
      conditional: false,
    });
  });

  it('detects noindex={true}', () => {
    expect(detectIndexingSignal('---\n---\n<PublicShell noindex={true} />').noindex).toBe(true);
  });

  it('treats noindex={false} as NOT noindex (the prop is passed but disabled)', () => {
    expect(detectIndexingSignal('---\n---\n<PublicShell noindex={false} />').noindex).toBe(false);
  });

  it('flags noindex={expr} as CONDITIONAL', () => {
    const s = detectIndexingSignal('---\n---\n<PublicShell noindex={isPreview} />');
    expect(s).toEqual({ shellPresent: true, noindex: true, conditional: true });
  });

  it('reports shellPresent=false for a page that never renders PublicShell', () => {
    expect(detectIndexingSignal('---\nreturn Astro.redirect("/x", 302);\n---').shellPresent).toBe(false);
  });

  it('does not match noindex inside a longer identifier', () => {
    expect(detectIndexingSignal('---\n---\n<PublicShell data-noindexed={1} />').noindex).toBe(false);
  });
});

describe('indexing reconciliation (AC7)', () => {
  const pages = (route: string, src: string) => new Map([[route, src]]);

  it('passes when an `index` surface passes no noindex prop', () => {
    expect(
      checkIndexingReconciliation(matrix([TERMS]), pages('/terms', '---\n---\n<PublicShell />')),
    ).toEqual([]);
  });

  it('passes when a `noindex` surface passes the prop', () => {
    const nf = { ...TERMS, id: 'not-found', route: '/404', search_indexing_policy: 'noindex' as const };
    expect(
      checkIndexingReconciliation(matrix([nf]), pages('/404', '---\n---\n<PublicShell noindex />')),
    ).toEqual([]);
  });

  it('NEGATIVE CONTROL — declares `index`, page ships noindex → CONFLICT', () => {
    const findings = checkIndexingReconciliation(
      matrix([TERMS]),
      pages('/terms', '---\n---\n<PublicShell noindex />'),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.leg).toBe('indexing_reconciliation');
    expect(findings[0]!.message).toMatch(/INDEXING CONFLICT.*PASSES the noindex prop/s);
  });

  it('NEGATIVE CONTROL — declares `noindex`, page ships index,follow → CONFLICT', () => {
    const nf = { ...TERMS, id: 'not-found', route: '/404', search_indexing_policy: 'noindex' as const };
    const findings = checkIndexingReconciliation(matrix([nf]), pages('/404', '---\n---\n<PublicShell />'));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/does NOT pass the noindex prop/);
  });

  it('NEGATIVE CONTROL — a shell-less page cannot claim `noindex` (nothing emits it)', () => {
    const redirect = { ...TERMS, id: 'root', route: '/', search_indexing_policy: 'noindex' as const, fields: [] };
    const findings = checkIndexingReconciliation(
      matrix([redirect]),
      pages('/', '---\nreturn Astro.redirect("/niyamavali", 302);\n---'),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/emits no robots meta at all/);
  });

  it('a shell-less page declaring `index` is accepted (indexing is simply not suppressed)', () => {
    const redirect = { ...TERMS, id: 'root', route: '/', fields: [] };
    expect(
      checkIndexingReconciliation(matrix([redirect]), pages('/', '---\nreturn Astro.redirect("/x", 302);\n---')),
    ).toEqual([]);
  });

  it('SKIPS a renders:false surface (there is no page to reconcile against)', () => {
    const md = { ...TERMS, id: 'member-directory', route: '/members', renders: false, search_indexing_policy: 'noindex' as const };
    expect(checkIndexingReconciliation(matrix([md]), new Map())).toEqual([]);
  });

  it('NEGATIVE CONTROL — still reconciles a STALE renders:false surface whose page now exists (code review 2026-08-20)', () => {
    // Before this fix, `!surface.renders` short-circuited the whole leg, so a real indexing
    // conflict on a newly-shipped-but-not-yet-flipped surface went unchecked here — only the
    // separate route-coverage STALE finding fired, and that says nothing about indexing.
    const md = { ...TERMS, id: 'member-directory', route: '/members', renders: false, search_indexing_policy: 'noindex' as const };
    const findings = checkIndexingReconciliation(matrix([md]), pages('/members', '---\n---\n<PublicShell />'));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/INDEXING CONFLICT.*does NOT pass the noindex prop/s);
  });
});

describe('escalation attestation (AC8)', () => {
  const LOG = '# Decision Log\n\n### Decision 2026-08-19-136: **The presentation policy**\n\nbody\n';
  const entry = {
    surface: 'terms',
    field: 'tc_body_html',
    from: 'authenticated_member' as const,
    to: 'public' as const,
    decision: '2026-08-19-136',
    rationale: 'Ruled by the Panel.',
  };

  it('passes when the cited decision exists in the log', () => {
    expect(
      checkEscalationAttestation(matrix([TERMS], { escalations: [entry], escalation_count: 1 }), LOG),
    ).toEqual([]);
  });

  it('⭐ NEGATIVE CONTROL — a decision ref with NO entry in the log FAILS', () => {
    // The half the schema cannot check: a `decision:` string is well-formed
    // whether or not any trustee ever wrote the ruling it names.
    const bogus = { ...entry, decision: '2099-01-01-999' };
    const findings = checkEscalationAttestation(
      matrix([TERMS], { escalations: [bogus], escalation_count: 1 }),
      LOG,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.leg).toBe('escalation_ledger');
    expect(findings[0]!.message).toMatch(/UNATTESTED ESCALATION.*2099-01-01-999/s);
  });

  it('NEGATIVE CONTROL — a count mismatch FAILS (belt-and-braces on the parser)', () => {
    const findings = checkEscalationAttestation(
      matrix([TERMS], { escalations: [entry], escalation_count: 7 }),
      LOG,
    );
    expect(findings.some((f) => /ESCALATION COUNT MISMATCH/.test(f.message))).toBe(true);
  });

  it('does not match a decision id that is merely a PREFIX of a real one', () => {
    const findings = checkEscalationAttestation(
      matrix([TERMS], { escalations: [{ ...entry, decision: '2026-08-19-13' }], escalation_count: 1 }),
      LOG,
    );
    expect(findings).toHaveLength(1);
  });

  it('an empty ledger passes (nothing to attest)', () => {
    expect(checkEscalationAttestation(matrix([TERMS]), LOG)).toEqual([]);
  });
});

// ── Story 11a.2 — cache-policy reconciliation (AC5) + its planted controls ────
//
// ⚠ This leg's SCOPE IS THE OPPOSITE of the indexing leg's, and getting that
// backwards would silently disarm it: `noindex` is a TEMPLATE prop, so that leg
// strips the frontmatter; `Cache-Control` is set IN the frontmatter, so this one
// must read it. The tests below pin both halves of that distinction.

describe('detectCacheSignal — reads the frontmatter, matches the CALL not the words (AC5)', () => {
  it('reads the literal Cache-Control value a page sets', () => {
    expect(detectCacheSignal(CACHED_PAGE).cacheControl).toBe('public, max-age=60, s-maxage=300');
  });

  it('reports null when the page sets none', () => {
    expect(detectCacheSignal('---\nconst x = 1;\n---\n<p>hi</p>').cacheControl).toBeNull();
  });

  it('⛔ PROSE ABOUT Cache-Control IS NOT A HEADER — a comment must not satisfy the leg', () => {
    // The mirror of the indexing leg's frontmatter-strip, and load-bearing for the
    // same reason: a gate that agrees with a comment instead of with the code is
    // worse than no gate. `/blog` had exactly such prose while setting nothing.
    const prose = `---
// TODO: we should set a Cache-Control header here (Cache-Control: public, max-age=60).
const x = 1;
---
<PublicShell />`;
    expect(detectCacheSignal(prose).cacheControl).toBeNull();
  });

  it('detects a redirect page (no body to cache)', () => {
    const redirect = "---\nreturn Astro.redirect('/niyamavali', 302);\n---";
    expect(detectCacheSignal(redirect)).toEqual({ cacheControl: null, redirects: true });
  });

  it('tolerates double quotes, backticks and whitespace in the call', () => {
    expect(
      detectCacheSignal('Astro.response.headers.set( "Cache-Control" ,  "no-store" )').cacheControl,
    ).toBe('no-store');
  });
});

describe('cache-policy reconciliation (AC5)', () => {
  it('passes when the declared policy matches the header the page sets', () => {
    expect(
      checkCachePolicyReconciliation(matrix([TERMS]), new Map([['/terms', CACHED_PAGE]])),
    ).toEqual([]);
  });

  it('passes for a `redirect` surface that redirects and sets no header', () => {
    const root = { ...TERMS, id: 'root', route: '/', cache_policy: 'redirect' as const };
    const page = "---\nreturn Astro.redirect('/niyamavali', 302);\n---";
    expect(checkCachePolicyReconciliation(matrix([root]), new Map([['/', page]]))).toEqual([]);
  });

  it('passes for `private_no_store` when the page sets no-store', () => {
    const err = { ...TERMS, id: 'err', route: '/500', cache_policy: 'private_no_store' as const };
    const page = "---\nAstro.response.headers.set('Cache-Control', 'no-store');\n---\n<PublicShell />";
    expect(checkCachePolicyReconciliation(matrix([err]), new Map([['/500', page]]))).toEqual([]);
  });

  it('NEGATIVE CONTROL — ⭐ a rendering surface with NO Cache-Control FAILS (fail-closed)', () => {
    // ⭐ THE CONTROL THIS LEG EXISTS FOR. `/blog` shipped exactly this shape for a
    // whole epic and nothing noticed, because absence read as "the default is fine".
    const findings = checkCachePolicyReconciliation(
      matrix([TERMS]),
      new Map([['/terms', '---\nconst x = 1;\n---\n<PublicShell />']]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.leg).toBe('cache_policy_reconciliation');
    expect(findings[0]!.message).toMatch(/NO CACHE-CONTROL/);
    expect(findings[0]!.message).toMatch(/Absence is NOT/);
  });

  it('NEGATIVE CONTROL — a CONFLICTING header fails, independently of the absence control', () => {
    // Independently planted: the header EXISTS here, so this can only pass by the
    // value comparison actually running.
    const err = { ...TERMS, id: 'err', route: '/500', cache_policy: 'private_no_store' as const };
    const findings = checkCachePolicyReconciliation(
      matrix([err]),
      new Map([['/500', CACHED_PAGE]]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/CACHE POLICY CONFLICT/);
    expect(findings[0]!.message).toMatch(/private_no_store/);
  });

  it('NEGATIVE CONTROL — `edge_cacheable` declared while the page sets no-store fails', () => {
    // The third direction, planted separately again: declaration and header both
    // present, both well-formed, and pointing opposite ways.
    const page = "---\nAstro.response.headers.set('Cache-Control', 'no-store');\n---\n<PublicShell />";
    const findings = checkCachePolicyReconciliation(matrix([TERMS]), new Map([['/terms', page]]));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/CACHE POLICY CONFLICT/);
  });

  it('NEGATIVE CONTROL — a `redirect` declaration on a page that actually RENDERS fails', () => {
    const root = { ...TERMS, id: 'root', route: '/', cache_policy: 'redirect' as const };
    const findings = checkCachePolicyReconciliation(matrix([root]), new Map([['/', CACHED_PAGE]]));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.message).toMatch(/CACHE POLICY CONFLICT/);
  });

  it('a declared surface whose route has not shipped is skipped (route coverage owns it)', () => {
    expect(checkCachePolicyReconciliation(matrix([TERMS]), new Map())).toEqual([]);
  });
});

// ── Story 11a.2 — pagination binding, FR-91 (AC2) + its planted control ───────
describe('pagination binding — FR-91 on apps/public (AC2)', () => {
  const PAGINATED = { ...TERMS, id: 'member-directory', route: '/members', paginated: true };

  it('passes when a paginated surface\'s page calls parsePageParams()', () => {
    const page = `---
import { parsePageParams } from '../lib/pagination.js';
const paging = parsePageParams(Astro.url.searchParams);
---
<PublicShell />`;
    expect(checkPaginationBinding(matrix([PAGINATED]), new Map([['/members', page]]))).toEqual([]);
  });

  it('NEGATIVE CONTROL — a paginated surface whose page NEVER binds the guard fails', () => {
    const page = '---\nconst rows = await listEveryMember();\n---\n<PublicShell />';
    const findings = checkPaginationBinding(matrix([PAGINATED]), new Map([['/members', page]]));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.leg).toBe('pagination_binding');
    expect(findings[0]!.message).toMatch(/UNBOUND PAGINATION/);
    // ⛔ The message must keep saying WHY this is not covered elsewhere; a future
    // reader who assumes Story 1.14 covers it would delete this leg.
    expect(findings[0]!.message).toMatch(/OpenAPI/);
  });

  it('⛔ an IMPORT without a CALL does not satisfy the leg', () => {
    const page = `---
import { parsePageParams } from '../lib/pagination.js';
---
<PublicShell />`;
    expect(checkPaginationBinding(matrix([PAGINATED]), new Map([['/members', page]]))).toHaveLength(1);
  });

  it('a NON-paginated surface is not required to bind anything', () => {
    expect(checkPaginationBinding(matrix([TERMS]), new Map([['/terms', CACHED_PAGE]]))).toEqual([]);
  });
});
