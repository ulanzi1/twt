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
  checkEscalationAttestation,
  checkIndexingReconciliation,
  checkRouteCoverage,
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
  fields: [{ id: 'tc_body_html', tier: 'public' as const }],
};

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
