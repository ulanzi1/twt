// packages/contracts/src/public-pages/scrape.ts
//
// The PII scrape verification ENGINE (Story 1.16b, AC-2) — pure + importable.
// Two checks against the FR-74 Public-vs-Private matrix:
//   (1) the four tier-leak rules over a rendered surface's field-set, and
//   (2) naked-PII pattern detection over a public HTML render.
//
// Side-effect-free by design: the architecture-committed live-render integration
// spec `tests/integration/public-pages/scrape-test.spec.ts` (D13-1.2) lands at
// Story 2.5/11a.2 and consumes THIS engine against real renders. The impure gate
// (packages/contracts/scripts/check-pii-scrape.ts) loads the matrix, enumerates
// snapshots, accumulates failures, and exits — mirroring the testable-pure-core /
// impure-orchestration split of scripts/friction-budget/{lib.ts,check.ts}.
//
// Authority: Story 11a.1 AC tier-leak rules (epics L3618-3620); FR-74 testable
// consequence "scrapes the public site and asserts that no PII from the Never
// list is exposed" (PRD L1039) + Story 11a.4 / FR-93 (naked phone/email/Aadhaar
// in public HTML, epics L3698-3701).

import { TIER_RANK } from './matrix.js';
import type { MatrixSurface, PublicVsPrivateMatrix, VisibilityTier } from './matrix.js';

// ─────────────────────────────────────────────────────────────────────────────
// Viewer context + tier ordering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The viewer a render is produced for. `never_exposed` is NOT a viewer context —
 * it is the tier that no viewer may ever see; a `never_exposed` field leaks on
 * every render.
 */
export type ViewerContext = 'public' | 'authenticated_member' | 'operator_restricted';

// `TIER_RANK` (low → high sensitivity) is imported from `matrix.js` — Story 11a.1
// moved it there so there is exactly ONE copy of the tier ordering in the repo.
// Both halves of the engine (the leak rules + `getVisibility`) AND the matrix's own
// escalation-direction check read the same table; ⛔ a second copy drifts and one of
// them silently stops being the truth.

/** The highest tier rank a viewer context may see (the 4 leak rules, epics L3618-3620). */
const VIEWER_CEILING: Record<ViewerContext, number> = {
  public: 0, // public viewer → only `public` fields (rule c + d)
  authenticated_member: 1, // member viewer → ≤ authenticated_member (rule b + c)
  operator_restricted: 2, // operator viewer → ≤ operator_restricted (rule a)
};

// ─────────────────────────────────────────────────────────────────────────────
// Render snapshot abstraction (AC-2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A captured render of one surface at one viewer context. Either `html` (a
 * rendered page) or `fields` (the field-id set of an API response shape) — or
 * neither, in which case the snapshot is a no-op (AC-3: a surface with no
 * available render → no-op). At v1 there are NO snapshots: `apps/public` is a
 * `tsc` stub until the Story 2.5 Astro shell; `apps/api/src/modules/public-pages`
 * is empty until Epic 11b.
 */
export interface RenderSnapshot {
  surfaceId: string;
  viewerContext: ViewerContext;
  html?: string;
  fields?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier-leak rules (AC-2: the four rules)
// ─────────────────────────────────────────────────────────────────────────────

/** A single leak finding — a field rendered above the viewer's permitted ceiling. */
export interface Leak {
  surfaceId: string;
  field: string;
  /** The matrix tier of the leaked field, or `unclassified` if undeclared (fail-closed). */
  tier: VisibilityTier | 'unclassified';
  viewerContext: ViewerContext;
  message: string;
}

function findSurface(matrix: PublicVsPrivateMatrix, surfaceId: string): MatrixSurface | undefined {
  return matrix.surfaces.find((s) => s.id === surfaceId);
}

/**
 * Evaluate one surface render against the matrix at a viewer context, returning
 * every tier-leak. A field whose tier rank exceeds the viewer's ceiling is a
 * leak (rules a–d); a rendered field the matrix does NOT declare is also a leak
 * (`unclassified`, fail-closed — the matrix is the canonical authority, so an
 * undeclared rendered field cannot be proven safe). A surface absent from the
 * matrix entirely → every rendered field is `unclassified`.
 *
 * Mixing tiers above the viewer's context within a single surface render fails:
 * each offending field is reported, naming the surface + field (epics L1321).
 */
export function evaluateSurfaceRender(
  matrix: PublicVsPrivateMatrix,
  surfaceId: string,
  viewerContext: ViewerContext,
  renderedFieldIds: string[],
): Leak[] {
  const leaks: Leak[] = [];
  const ceiling = VIEWER_CEILING[viewerContext];
  const surface = findSurface(matrix, surfaceId);
  const uniqueFieldIds = [...new Set(renderedFieldIds)];

  for (const fieldId of uniqueFieldIds) {
    const field = surface?.fields.find((f) => f.id === fieldId);
    if (field === undefined) {
      leaks.push({
        surfaceId,
        field: fieldId,
        tier: 'unclassified',
        viewerContext,
        message:
          `LEAK — surface "${surfaceId}" field "${fieldId}" is rendered to a ` +
          `${viewerContext} viewer but is NOT declared in the matrix (fail-closed: ` +
          `every rendered field must declare a tier).`,
      });
      continue;
    }
    if (TIER_RANK[field.tier] > ceiling) {
      leaks.push({
        surfaceId,
        field: fieldId,
        tier: field.tier,
        viewerContext,
        message:
          `LEAK — surface "${surfaceId}" field "${fieldId}" (tier ${field.tier}) is ` +
          `rendered to a ${viewerContext} viewer, which may only see tier ` +
          `≤ ${ceilingTierName(ceiling)}.`,
      });
    }
  }
  return leaks;
}

// ─────────────────────────────────────────────────────────────────────────────
// getVisibility — the single canonical lookup (Story 11a.1, AC11)
// ─────────────────────────────────────────────────────────────────────────────

/** Why a field is not visible. Absent on a visible verdict. */
export type NotVisibleReason = 'unknown_surface' | 'undeclared_field' | 'above_viewer_ceiling';

/**
 * A decidable visibility verdict: visible, or not-visible WITH A REASON. The
 * reason is not decoration — a renderer that must omit a field usually needs to
 * know whether it is omitting something classified (render a shield/placeholder)
 * or something nobody has classified yet (a bug to fix).
 */
export interface VisibilityVerdict {
  surfaceId: string;
  fieldId: string;
  viewerContext: ViewerContext;
  visible: boolean;
  /** The declared tier, or `unclassified` when the matrix does not declare the field. */
  tier: VisibilityTier | 'unclassified';
  reason?: NotVisibleReason;
  message: string;
}

/**
 * THE single canonical visibility lookup (Story 11a.1 AC11): *may this viewer see
 * this field on this surface?* — the query half of the same engine whose detection
 * half is `evaluateSurfaceRender`. Both read the same matrix and the same
 * `TIER_RANK`/`VIEWER_CEILING`, so the two can never disagree (asserted by test).
 *
 * ⭐ FAIL-CLOSED, without exception. An unknown surface or an undeclared field
 * resolves to NOT visible, matching `evaluateSurfaceRender`'s `unclassified`
 * posture: the matrix is the canonical authority, so what it has never heard of
 * cannot be proven safe. ⛔ An unknown field must never resolve to *visible* —
 * that would turn every forgotten declaration into a silent publication.
 *
 * Story 11a.2's `<MatrixField>` renderer is the intended consumer; ⛔ this story
 * ships the function, not the component.
 *
 * PURE: no fs, no db, no env, no clock.
 */
export function getVisibility(
  matrix: PublicVsPrivateMatrix,
  surfaceId: string,
  fieldId: string,
  viewerContext: ViewerContext,
): VisibilityVerdict {
  const base = { surfaceId, fieldId, viewerContext };
  const surface = findSurface(matrix, surfaceId);

  if (surface === undefined) {
    return {
      ...base,
      visible: false,
      tier: 'unclassified',
      reason: 'unknown_surface',
      message:
        `NOT VISIBLE — surface "${surfaceId}" is not declared in the matrix (fail-closed). ` +
        `Declare the surface before rendering from it.`,
    };
  }

  const field = surface.fields.find((f) => f.id === fieldId);
  if (field === undefined) {
    return {
      ...base,
      visible: false,
      tier: 'unclassified',
      reason: 'undeclared_field',
      message:
        `NOT VISIBLE — surface "${surfaceId}" does not declare field "${fieldId}" ` +
        `(fail-closed: every renderable field declares a tier).`,
    };
  }

  if (TIER_RANK[field.tier] > VIEWER_CEILING[viewerContext]) {
    return {
      ...base,
      visible: false,
      tier: field.tier,
      reason: 'above_viewer_ceiling',
      message:
        `NOT VISIBLE — "${surfaceId}"."${fieldId}" is tier ${field.tier}, above what a ` +
        `${viewerContext} viewer may see (≤ ${ceilingTierName(VIEWER_CEILING[viewerContext])}).`,
    };
  }

  return {
    ...base,
    visible: true,
    tier: field.tier,
    message: `visible — "${surfaceId}"."${fieldId}" (tier ${field.tier}) to a ${viewerContext} viewer`,
  };
}

function ceilingTierName(ceiling: number): string {
  const name = (Object.keys(TIER_RANK) as VisibilityTier[]).find((t) => TIER_RANK[t] === ceiling);
  if (name === undefined) {
    throw new Error(
      `BUG: unrecognised viewer ceiling rank ${ceiling} — VIEWER_CEILING is out of sync with TIER_RANK`,
    );
  }
  return name;
}

// ─────────────────────────────────────────────────────────────────────────────
// Naked-PII pattern detection (AC-2: public HTML renders)
// ─────────────────────────────────────────────────────────────────────────────

export type PiiPatternType = 'phone' | 'email' | 'aadhaar';

export interface PiiMatch {
  type: PiiPatternType;
  value: string;
}

// Conservative patterns (Story 11a.4 obfuscation is defense-in-depth; the gate
// detects LEAKS). Fresh RegExp per scan so the global `lastIndex` never leaks
// between calls. Patterns run in priority order (email first) so that a phone-
// number-shaped local part of an email address is not double-counted.
//   email   — standard local@domain.tld.
//   aadhaar — 12 digits, optionally grouped 4-4-4 by space/hyphen; digit
//             boundaries on both sides so it never overlaps a 10-digit phone.
//   phone   — Indian mobile: optional +91 / 0 prefix, then [6-9] + 9 digits;
//             extended lookbehind excludes digits AND email-local chars so the
//             pattern never fires inside an email address or another number.
function piiPatterns(): { type: PiiPatternType; re: RegExp }[] {
  return [
    { type: 'email', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: 'aadhaar', re: /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g },
    { type: 'phone', re: /(?<![a-zA-Z0-9._%+\-\d])(?:\+?91[\s-]?|0)?[6-9]\d{9}(?!\d)/g },
  ];
}

/**
 * Detect naked phone / email / Aadhaar patterns in an HTML render. A public-tier
 * render containing any match is a leak (FR-74 testable consequence, PRD L1039;
 * Story 11a.4 / FR-93). Pure: returns every match; the caller decides the verdict.
 */
export function detectNakedPii(html: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const { type, re } of piiPatterns()) {
    for (const m of html.matchAll(re)) {
      matches.push({ type, value: m[0] });
    }
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot orchestration (engine entry the gate + integration spec consume)
// ─────────────────────────────────────────────────────────────────────────────

export type SnapshotStatus = 'pass' | 'fail' | 'no-op';

export interface SnapshotVerdict {
  surfaceId: string;
  viewerContext: ViewerContext;
  status: SnapshotStatus;
  leaks: Leak[];
  piiMatches: PiiMatch[];
  warnings: string[];
  message: string;
}

/**
 * Evaluate one render snapshot against the matrix:
 *   - neither html nor fields → no-op (AC-3: a surface with no render → no-op).
 *   - `fields` present → the four tier-leak rules over the field-set.
 *   - `html` present on a `public` render → naked-PII detection (a public render
 *     must contain no naked PII). On non-public renders the PII detector is not
 *     run (members/operators legitimately see PII; tier-leak rules govern there,
 *     and HTML carries no field-ids to enumerate).
 * Any leak or PII match → `fail`; otherwise `pass`.
 */
export function evaluateSnapshot(
  matrix: PublicVsPrivateMatrix,
  snapshot: RenderSnapshot,
): SnapshotVerdict {
  const { surfaceId, viewerContext } = snapshot;
  // null-safe guard (handles JSON-deserialised null at runtime); empty string is no-op
  const fields = snapshot.fields != null ? snapshot.fields : null;
  const html = snapshot.html !== undefined && snapshot.html !== '' ? snapshot.html : null;

  if (fields === null && html === null) {
    return {
      surfaceId,
      viewerContext,
      status: 'no-op',
      leaks: [],
      piiMatches: [],
      warnings: [],
      message: `no-op — no render snapshot available for surface "${surfaceId}" (${viewerContext})`,
    };
  }

  const warnings: string[] = [];
  if (fields !== null) {
    const surface = matrix.surfaces.find((s) => s.id === surfaceId);
    if (surface !== undefined && surface.fields.length === 0) {
      warnings.push(
        `surface "${surfaceId}" is declared in the matrix but has no fields — ` +
          `leak check is a no-op until Epic 11a (Story 11a.1) populates its field list.`,
      );
    }
  }

  const leaks =
    fields !== null ? evaluateSurfaceRender(matrix, surfaceId, viewerContext, fields) : [];
  const piiMatches = html !== null && viewerContext === 'public' ? detectNakedPii(html) : [];

  if (leaks.length > 0 || piiMatches.length > 0) {
    const piiNote =
      piiMatches.length > 0
        ? ` naked PII: ${piiMatches.map((p) => `${p.type}(${p.value})`).join(', ')}.`
        : '';
    return {
      surfaceId,
      viewerContext,
      status: 'fail',
      leaks,
      piiMatches,
      warnings,
      message:
        `FAIL — surface "${surfaceId}" (${viewerContext}): ${leaks.length} tier-leak(s),` +
        ` ${piiMatches.length} naked-PII match(es).${piiNote}`,
    };
  }

  return {
    surfaceId,
    viewerContext,
    status: 'pass',
    leaks: [],
    piiMatches: [],
    warnings,
    message: `pass — surface "${surfaceId}" (${viewerContext}): no leaks, no naked PII`,
  };
}
