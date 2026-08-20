// Source-provable gate legs for the FR-74 matrix — Story 11a.1 (Task 5; AC1, AC7, AC8).
//
// ── The split, and why it is documented rather than merely implemented (D2) ──
// The tier-leak check needs a RENDER. This file cannot produce one, and pretending
// otherwise is how the leg went vacuous in the first place (`loadSnapshots()`
// returned `[]` while the README promised the rules would acquire teeth "without a
// code change to the gate"). So the work is split, by ruling D2:
//
//   · THE GATE SCRIPT (this module + check-pii-scrape.ts) owns everything provable
//     from COMMITTED SOURCE: does every shipped route have a matrix surface and
//     vice-versa; does each surface's declared indexing policy match the `noindex`
//     the page actually passes; does every escalation name a real, existing
//     `.decision-log.md` entry, and does the count agree.
//   · THE INTEGRATION SPEC (`apps/public/tests/integration/public-pages/
//     scrape-test.spec.ts`, the architecture-committed D13-1.2 slot) owns the
//     LIVE-RENDER tier-leak check. It already holds real render HTML, already runs
//     on every PR via `pnpm turbo run test`, and needs no new CI wiring.
//
// PURE: every function here takes source text or a file list and returns findings.
// No fs, no process, no exit — the impure orchestration lives in `scripts/`,
// mirroring `scripts/friction-budget/{lib.ts,check.ts}`.

import type { CachePolicy, PublicVsPrivateMatrix, SearchIndexingPolicy } from './matrix.js';

/** One gate finding. `leg` survives a partial fix — one route closed, another still open. */
export interface GateFinding {
  leg:
    | 'route_coverage'
    | 'indexing_reconciliation'
    | 'escalation_ledger'
    | 'cache_policy_reconciliation'
    | 'pagination_binding';
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg — route coverage (AC1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map an `apps/public` page path to the route it serves, using Astro's
 * file-based routing: `index.astro` is the directory's route, everything else
 * takes its own name. Dynamic segments (`[postId]`) are kept VERBATIM rather than
 * normalised to a pattern — the matrix declares `/blog/[postId]`, so the join is
 * on the literal the developer reads in both files.
 *
 * @param relPath page path relative to `src/pages/`, e.g. `blog/[postId].astro`.
 */
export function pageRouteFromPath(relPath: string): string {
  const withoutExt = relPath.replace(/\.astro$/, '');
  const segments = withoutExt.split('/');
  if (segments[segments.length - 1] === 'index') segments.pop();
  const route = `/${segments.join('/')}`;
  // Collapse the root case (`index.astro` → segments empty → `/`).
  return route === '/' ? '/' : route.replace(/\/$/, '');
}

/**
 * Reconcile shipped routes against declared surfaces IN BOTH DIRECTIONS.
 *
 * ⭐ THE SECOND DIRECTION IS THE POINT. Checking only "every surface names a real
 * route" would let a new public page ship entirely unclassified — which is the
 * hole this leg exists to close, and the mechanism that makes it SAFE not to
 * pre-declare Epic 11b's surfaces: when 11b ships a route, this fails until it is
 * declared, which is a stronger guarantee than a guessed entry would have been.
 *
 * `renders: false` exempts a surface from needing a route (D5 — `member-directory`
 * is declared before Story 11a.3 builds it). ⛔ Deliberately the ONLY escape, and
 * deliberately explicit: a missing route must fail, an intentionally-absent one
 * must be stated.
 */
export function checkRouteCoverage(
  matrix: PublicVsPrivateMatrix,
  shippedRoutes: readonly string[],
): GateFinding[] {
  const findings: GateFinding[] = [];
  const declared = new Map(matrix.surfaces.map((s) => [s.route, s]));

  for (const route of [...shippedRoutes].sort()) {
    if (!declared.has(route)) {
      findings.push({
        leg: 'route_coverage',
        message:
          `UNDECLARED ROUTE — "${route}" ships under apps/public/src/pages/ but no matrix ` +
          `surface declares it. Every public route classifies the fields it renders before ` +
          `it can pass this gate (fail-closed). Add a surface with its route, indexing ` +
          `policy, and tier-classified fields.`,
      });
      continue;
    }
    const surface = declared.get(route)!;
    if (!surface.renders) {
      findings.push({
        leg: 'route_coverage',
        message:
          `STALE renders:false — surface "${surface.id}" declares renders: false but route ` +
          `"${route}" now ships. Flip renders to true (the surface is real now), so the ` +
          `indexing and tier checks stop treating it as unbuilt.`,
      });
    }
  }

  const shipped = new Set(shippedRoutes);
  for (const surface of matrix.surfaces) {
    if (surface.renders && !shipped.has(surface.route)) {
      findings.push({
        leg: 'route_coverage',
        message:
          `ORPHANED SURFACE — "${surface.id}" declares route "${surface.route}", which does ` +
          `not exist under apps/public/src/pages/. Either the page was removed (drop the ` +
          `surface) or it has not been built yet (declare renders: false and say so).`,
      });
    }
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg — search-indexing reconciliation (AC7)
// ─────────────────────────────────────────────────────────────────────────────

/** What a page's source says about robots directives. */
export interface PageIndexingSignal {
  /** True iff the page renders through `PublicShell` (which is what emits the meta). */
  shellPresent: boolean;
  /** True iff it passes the `noindex` prop (shorthand or `noindex={…}`). */
  noindex: boolean;
  /** True iff `noindex` is bound to an EXPRESSION rather than passed as a bare flag. */
  conditional: boolean;
}

/**
 * Strip an `.astro` file down to its TEMPLATE — everything after the closing `---`
 * of the frontmatter — and remove `{/* … *\/}` comments.
 *
 * ⚠ THIS IS LOAD-BEARING, not tidiness. `404.astro` and `500.astro` both discuss
 * "noindex" in their frontmatter prose. A scan over the whole file would match
 * those comments and "confirm" a directive that prose merely described — a gate
 * agreeing with a comment instead of with the code.
 */
export function astroTemplate(source: string): string {
  const fm = /^---\r?\n[\s\S]*?\r?\n---/;
  const template = fm.test(source) ? source.replace(fm, '') : source;
  return template.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

/**
 * Read a page's robots posture from its committed source.
 *
 * The directive itself is emitted by `PublicShell.astro`
 * (`<meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'}>`),
 * so what a PAGE controls is the `noindex` prop it passes — and that is exactly
 * what is provable from source here.
 */
export function detectIndexingSignal(source: string): PageIndexingSignal {
  const template = astroTemplate(source);
  const shellPresent = /<PublicShell[\s>]/.test(template);
  // `noindex` as its own JSX-ish attribute: bare shorthand, or `noindex={…}`.
  // The lookbehind keeps it from matching inside a longer identifier.
  const attr = /(?<![\w$-])noindex(\s*=\s*\{([^}]*)\})?(?=[\s/>])/.exec(template);
  if (attr === null) return { shellPresent, noindex: false, conditional: false };
  const bound = attr[2]?.trim();
  return {
    shellPresent,
    // `noindex={false}` passes the prop but disables it — treat it as not-noindex.
    noindex: bound !== 'false',
    conditional: bound !== undefined && bound !== 'true' && bound !== 'false',
  };
}

/** What the declared policy REQUIRES of a page's source, per policy value. */
function policySatisfied(policy: SearchIndexingPolicy, signal: PageIndexingSignal): boolean {
  if (policy === 'noindex') return signal.noindex;
  if (policy === 'index') return !signal.noindex;
  return signal.conditional; // `conditional` ⇒ the prop is bound to a runtime expression
}

/**
 * Reconcile each rendering surface's declared `search_indexing_policy` against the
 * `noindex` prop its page actually passes. A conflict FAILS — the matrix must not
 * be able to claim a page is `noindex` while the page ships `index,follow`.
 *
 * ⚠ `apps/api` stamps `X-Robots-Tag: noindex, nofollow` on every response
 * (`security-headers/index.ts`), and the Story 1.14 honeypot trap routes inherit
 * it. Those are `apps/api` ROUTES, not `apps/public` PAGES — outside this leg by
 * construction, and verified as already covered rather than rebuilt.
 */
export function checkIndexingReconciliation(
  matrix: PublicVsPrivateMatrix,
  pageSources: ReadonlyMap<string, string>,
): GateFinding[] {
  const findings: GateFinding[] = [];
  for (const surface of matrix.surfaces) {
    const source = pageSources.get(surface.route);
    // No page to reconcile against — legitimate for a `renders:false` surface whose route has not
    // shipped yet; route coverage owns reporting an orphaned `renders:true` surface. ⛔ Do NOT also
    // skip when `!surface.renders` but a page DOES exist (code review 2026-08-20): that STALE case
    // used to skip indexing reconciliation entirely, so a real conflict on a newly-shipped-but-not-
    // yet-flipped surface went unchecked by this leg until someone remembered to flip `renders`.
    if (source === undefined) continue;
    const signal = detectIndexingSignal(source);

    if (!signal.shellPresent) {
      // A page that never renders PublicShell emits no robots meta at all. Only
      // `index` is honest for it — `noindex` would claim a suppression that no
      // markup performs.
      if (surface.search_indexing_policy !== 'index') {
        findings.push({
          leg: 'indexing_reconciliation',
          message:
            `INDEXING CONFLICT — surface "${surface.id}" (${surface.route}) declares ` +
            `"${surface.search_indexing_policy}", but its page does not render PublicShell and ` +
            `so emits no robots meta at all. Nothing suppresses indexing there.`,
        });
      }
      continue;
    }

    if (!policySatisfied(surface.search_indexing_policy, signal)) {
      findings.push({
        leg: 'indexing_reconciliation',
        message:
          `INDEXING CONFLICT — surface "${surface.id}" (${surface.route}) declares ` +
          `"${surface.search_indexing_policy}", but its page ` +
          `${signal.noindex ? 'PASSES' : 'does NOT pass'} the noindex prop` +
          `${signal.conditional ? ' (bound to an expression)' : ''}. The matrix and the ` +
          `render must agree — fix whichever one is wrong, ⛔ do not relax the declaration ` +
          `to match a mistake.`,
      });
    }
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg — cache-policy reconciliation (Story 11a.2, AC5; rulings D3(a) + D4)
// ─────────────────────────────────────────────────────────────────────────────

/** What a page's source says about its cache posture. */
export interface PageCacheSignal {
  /** The literal `Cache-Control` value the page sets, or null if it sets none. */
  cacheControl: string | null;
  /** True iff the page returns an `Astro.redirect(...)` — no body to cache. */
  redirects: boolean;
}

/**
 * Read a page's cache posture from its committed source.
 *
 * ⚠ THE OPPOSITE SCOPE FROM `detectIndexingSignal`, and the difference is
 * load-bearing. The `noindex` prop is passed in the TEMPLATE, so that leg strips the
 * frontmatter first. `Cache-Control` is set in the FRONTMATTER
 * (`Astro.response.headers.set(...)`), so this one must read the frontmatter — and
 * must therefore not be fooled by prose. It is not: the pattern matches the CALL,
 * not the words. A comment saying "we should set Cache-Control here" contains no
 * `Astro.response.headers.set('Cache-Control', …)` and is correctly ignored.
 */
export function detectCacheSignal(source: string): PageCacheSignal {
  const call =
    /Astro\.response\.headers\.set\(\s*['"`]Cache-Control['"`]\s*,\s*['"`]([^'"`]*)['"`]/i.exec(
      source,
    );
  return {
    cacheControl: call === null ? null : call[1]!.trim(),
    redirects: /Astro\.redirect\s*\(/.test(source),
  };
}

/** Does the emitted header satisfy the declared policy? */
function cachePolicySatisfied(policy: CachePolicy, signal: PageCacheSignal): boolean {
  if (policy === 'redirect') return signal.redirects && signal.cacheControl === null;
  if (signal.cacheControl === null) return false; // fail-closed — see the leg below
  const value = signal.cacheControl.toLowerCase();
  const shared = /(^|[\s,])public([\s,]|$)/.test(value) && !/no-store/.test(value);
  if (policy === 'edge_cacheable') return shared;
  // `private_no_store`: the page must actively prevent storage.
  return /no-store/.test(value) || /(^|[\s,])private([\s,]|$)/.test(value);
}

/**
 * Reconcile each rendering surface's declared `cache_policy` against the
 * `Cache-Control` its page ACTUALLY SETS. A conflict FAILS CI.
 *
 * ⭐ FAIL-CLOSED ON ABSENCE, and that is the entire reason this leg exists. Before
 * Story 11a.2, `/blog` and `/blog/[postId]` set NO `Cache-Control` at all and
 * nothing noticed for a whole epic — because ABSENCE READ AS "the default is fine".
 * It is not fine: with no header the shared-cache behaviour is whatever the origin,
 * proxy and CDN each decide independently, which is precisely the property a
 * cache-safety architecture cannot leave undetermined. So a rendering surface that
 * declares a policy and emits no header is a FINDING, ⛔ not a pass.
 *
 * ⛔ WHAT THIS DOES NOT PROVE — read this before citing it. It proves what the
 * ORIGIN EMITS from committed source. It proves NOTHING about Cloudflare or any
 * other edge: that is not in this repo, and its selection is contingent on DPDPA
 * legal review (architecture §5.8a). A green leg here means the origin's
 * instructions are correct and declared — ⛔ never that an edge honoured them.
 */
export function checkCachePolicyReconciliation(
  matrix: PublicVsPrivateMatrix,
  pageSources: ReadonlyMap<string, string>,
): GateFinding[] {
  const findings: GateFinding[] = [];
  for (const surface of matrix.surfaces) {
    const source = pageSources.get(surface.route);
    // No page: legitimate for a `renders:false` surface whose route has not shipped.
    // Route coverage owns reporting an orphaned `renders:true` surface.
    if (source === undefined) continue;
    const signal = detectCacheSignal(source);

    if (signal.cacheControl === null && surface.cache_policy !== 'redirect') {
      findings.push({
        leg: 'cache_policy_reconciliation',
        message:
          `NO CACHE-CONTROL — surface "${surface.id}" (${surface.route}) declares ` +
          `"${surface.cache_policy}" but its page sets no Cache-Control header at all. ` +
          `⛔ Absence is NOT "the default is fine": with no header, every proxy and CDN ` +
          `decides independently. Set the header the declaration promises.`,
      });
      continue;
    }

    if (!cachePolicySatisfied(surface.cache_policy, signal)) {
      findings.push({
        leg: 'cache_policy_reconciliation',
        message:
          `CACHE POLICY CONFLICT — surface "${surface.id}" (${surface.route}) declares ` +
          `"${surface.cache_policy}", but its page ` +
          (signal.cacheControl === null
            ? `does not redirect and sets no Cache-Control`
            : `sets "Cache-Control: ${signal.cacheControl}"`) +
          `. The matrix and the render must agree — fix whichever one is wrong, ` +
          `⛔ do not relax the declaration to match a mistake.`,
      });
    }
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg — pagination binding (Story 11a.2, AC2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert every surface declaring `paginated: true` has a page that actually BINDS
 * the FR-91 guard.
 *
 * ⭐ Why a leg and not a README note: FR-91 is genuinely unenforced on this surface.
 * The Story 1.14 guard walks the committed OpenAPI surface and `apps/public` emits
 * none — so on public Astro routes, forced pagination is only as real as the code
 * that calls the helper. A convention would be forgotten exactly the way `/blog`
 * forgot `Cache-Control`. This makes it structural instead.
 *
 * ⚠ WHAT IT PROVES, precisely: that the page IMPORTS AND CALLS `parsePageParams`.
 * ⛔ It does NOT prove the page honours the rejection — a page could call the parser
 * and ignore the result. That residual is covered by the page's own tests, and
 * saying so here is the point: a leg whose limit is unstated gets over-cited.
 */
export function checkPaginationBinding(
  matrix: PublicVsPrivateMatrix,
  pageSources: ReadonlyMap<string, string>,
): GateFinding[] {
  const findings: GateFinding[] = [];
  for (const surface of matrix.surfaces) {
    if (!surface.paginated) continue;
    const source = pageSources.get(surface.route);
    if (source === undefined) continue; // route coverage owns the missing-page case
    if (!/parsePageParams\s*\(/.test(source)) {
      findings.push({
        leg: 'pagination_binding',
        message:
          `UNBOUND PAGINATION — surface "${surface.id}" (${surface.route}) declares ` +
          `paginated: true but its page never calls parsePageParams(). FR-91 is NOT ` +
          `enforced on apps/public by any other mechanism (the Story 1.14 guard walks ` +
          `the OpenAPI surface, which Astro routes do not emit), so an unbound list ` +
          `route is genuinely unpoliced — "?page=all" would be served.`,
      });
    }
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg — escalation ledger (AC8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify every escalation's `decision` names an entry that ACTUALLY EXISTS in the
 * decision log.
 *
 * ⭐ This is the half the schema cannot do. `matrix.ts` already enforces the count
 * cross-check, orphan detection and escalation direction — all structural, all
 * pure. What it cannot do is leave the file: a `decision:` string is well-formed
 * whether or not any trustee ever wrote the entry it names. Checking that the
 * attestation EXISTS is the difference between "an escalation cites a ruling" and
 * "an escalation is ruled", and it is the whole point of the attestation
 * requirement (the `governance-boundary` precedent: attestation + entry + count
 * bump in the same commit, cross-checked so neither half can move alone).
 */
export function checkEscalationAttestation(
  matrix: PublicVsPrivateMatrix,
  decisionLog: string,
): GateFinding[] {
  const findings: GateFinding[] = [];

  // Belt-and-braces on the parser's own check: if the schema were ever relaxed,
  // this leg must not silently stop cross-checking.
  if (matrix.escalation_count !== matrix.escalations.length) {
    findings.push({
      leg: 'escalation_ledger',
      message:
        `ESCALATION COUNT MISMATCH — escalation_count is ${matrix.escalation_count} but the ` +
        `ledger holds ${matrix.escalations.length}. Entry and count bump in the SAME commit.`,
    });
  }

  for (const entry of matrix.escalations) {
    const heading = new RegExp(`^###\\s+Decision\\s+${escapeRegExp(entry.decision)}\\b`, 'm');
    if (!heading.test(decisionLog)) {
      findings.push({
        leg: 'escalation_ledger',
        message:
          `UNATTESTED ESCALATION — "${entry.surface}.${entry.field}" (${entry.from} → ` +
          `${entry.to}) cites decision "${entry.decision}", which has no entry in ` +
          `.decision-log.md. A visibility escalation is attested by a RULING, not by a ` +
          `reference to one. ⛔ Write the entry; do not remove the citation.`,
      });
    }
  }
  return findings;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
