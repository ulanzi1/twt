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

import type { PublicVsPrivateMatrix, SearchIndexingPolicy } from './matrix.js';

/** One gate finding. `leg` survives a partial fix — one route closed, another still open. */
export interface GateFinding {
  leg: 'route_coverage' | 'indexing_reconciliation' | 'escalation_ledger';
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
    if (!surface.renders) continue; // nothing to reconcile against; route coverage owns this
    const source = pageSources.get(surface.route);
    if (source === undefined) continue; // an orphan — route coverage reports it, not this leg
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
