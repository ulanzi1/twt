// Pure T&C render model + HTML composer — Story 2.6 (Task 8; AC4, AC5).
//
// ALL `/terms` display logic lives HERE (the `.astro` page is a thin wrapper — the
// Astro component-test carve-out means `.astro` files have no co-located unit
// tests, so the testable logic moves to this `.ts` module). `buildTcRenderModel`
// turns a `TcVersionRow | null` + its pinned clause versions into a flat render
// model; `renderTcHtml` composes that model into a single HTML string that BOTH
// `terms.astro` (via `set:html`) and the Task 9 PII-scrape spec consume (fixture-
// fed, no live server) — mirroring `niyamavali-render.ts`'s `renderNiyamavaliHtml`.
//
// ── Security: body_html_rendered is emitted RAW ──────────────────────────────
// `model.html` is `terms_and_conditions_versions.body_html_rendered` — already
// sanitized at WRITE time by `renderTcMarkdown` (the markdown libs never enter the
// apps/public graph). It is inserted verbatim; every OTHER value is HTML-escaped.

import type { schema } from '@twt/domain';

import { deriveFieldIds, type FieldIdMapping } from './surface-fields.js';

type TcVersionRow = schema.TcVersionRow;

/** The legal-review statuses that render the provisional banner (AC5). */
const PROVISIONAL_STATUSES: ReadonlySet<string> = new Set(['pending', 'under-review']);

/** Caller-supplied display strings (i18n in `terms.astro`; fixed in the scrape spec). */
export interface TcRenderLabels {
  /** AC5 exact provisional-banner copy (locale-resolved by the caller). */
  provisionalBanner: string;
  effectiveLabel: string;
  pinnedLabel: string;
  emptyTitle: string;
  emptyBody: string;
}

/** The flat render model the page + scrape spec consume. */
export interface TcRenderModel {
  hasContent: boolean;
  /** body_html_rendered (already sanitized) — empty string when no content. */
  html: string;
  version: number | null;
  /** ISO-8601 effective-from instant, or null when no content. */
  effectiveFrom: string | null;
  pinnedClauseIds: string[];
  /** AC5: true iff legal_review_status ∈ {pending, under-review}. */
  showProvisionalBanner: boolean;
  labels: TcRenderLabels;
}

/**
 * Build the render model from the effective T&C row (or null) + its pinned clause
 * versions. Banner-selection (AC5) is computed HERE, not in the `.astro`
 * frontmatter. A null row yields the empty-state model (a dignified empty state
 * shows when no T&C is published, AC4).
 */
export function buildTcRenderModel(
  row: TcVersionRow | null,
  pinnedClauseIds: readonly string[],
  labels: TcRenderLabels,
): TcRenderModel {
  if (!row) {
    return {
      hasContent: false,
      html: '',
      version: null,
      effectiveFrom: null,
      pinnedClauseIds: [],
      showProvisionalBanner: false,
      labels,
    };
  }
  return {
    hasContent: true,
    html: row.bodyHtmlRendered,
    version: row.version,
    effectiveFrom: row.effectiveFrom.toISOString(),
    pinnedClauseIds: [...pinnedClauseIds],
    showProvisionalBanner: PROVISIONAL_STATUSES.has(row.legalReviewStatus),
    labels,
  };
}

/** HTML-escape a display string before it enters rendered markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serialise the render model to an HTML fragment: the provisional banner (when
 * shown) + the precomputed sanitized body + a version/effective-date meta block +
 * the pinned clause versions. `model.html` is emitted RAW (sanitized at write); all
 * other values are escaped. NEVER renders legal_reviewer_actor_id / audit_id /
 * authored_by_actor (they are not in the model at all — AC4).
 */
export function renderTcHtml(model: TcRenderModel): string {
  if (!model.hasContent) {
    return (
      `<section class="tc tc-empty">` +
      `<h2 class="tc-empty__title">${escapeHtml(model.labels.emptyTitle)}</h2>` +
      `<p>${escapeHtml(model.labels.emptyBody)}</p>` +
      `</section>`
    );
  }

  const banner = model.showProvisionalBanner
    ? `<aside class="tc-provisional" role="note">${escapeHtml(model.labels.provisionalBanner)}</aside>`
    : '';

  const meta =
    `<dl class="tc-meta">` +
    `<div><dt class="tc-version">v</dt><dd>${model.version}</dd></div>` +
    `<div><dt>${escapeHtml(model.labels.effectiveLabel)}</dt>` +
    `<dd><time>${escapeHtml(model.effectiveFrom ?? '')}</time></dd></div>` +
    `</dl>`;

  // Render the pinned-version COUNT, not the raw clause_version_id UUIDs: a public
  // reader gains nothing from internal UUIDs, and a UUID's digit runs false-positive
  // the FR-74 PII scanner (e.g. an aadhaar `dddd-dddd-dddd` substring). The ids stay
  // in the model (the AC8 handle Story 2.7/Epic 3 consume) — they are simply not
  // surfaced in the public HTML.
  const pinned =
    model.pinnedClauseIds.length > 0
      ? `<dl class="tc-pinned"><div><dt>${escapeHtml(model.labels.pinnedLabel)}</dt>` +
        `<dd>${model.pinnedClauseIds.length}</dd></div></dl>`
      : '';

  return (
    `<section class="tc">` +
    banner +
    `<div class="tc-body">${model.html}</div>` +
    meta +
    pinned +
    `</section>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix field ids (Story 11a.1, Task 6; AC2 + ruling D3(a))
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The `/terms` surface's matrix field ids, derived from this module's own model.
 *
 * ⚠ `pinnedClauseIds` maps to `tc_pinned_clause_count`, and the gap is worth
 * stating plainly rather than papering over: the MODEL carries the clause-version
 * UUIDs (they are the AC8 handle a later story consumes) while the public HTML
 * renders only their COUNT — `renderTcHtml` emits `model.pinnedClauseIds.length`,
 * deliberately, because a public reader gains nothing from internal UUIDs and a
 * UUID's digit runs false-positive the PII scanner.
 *
 * So the id names what is RENDERED, not what the model holds. That is the right
 * call for a visibility matrix — it classifies renders — but it means this one
 * mapping is a claim about the template rather than about the model, and a change
 * to `renderTcHtml` that started emitting the ids would not be caught HERE. It
 * would be caught by the naked-PII leg, which scans the real HTML. ⛔ If you change
 * that render, change this id and classify it.
 */
const TC_FIELD_IDS: FieldIdMapping<TcRenderModel> = {
  html: 'tc_body_html',
  version: 'tc_version',
  effectiveFrom: 'tc_effective_from',
  pinnedClauseIds: 'tc_pinned_clause_count',
  showProvisionalBanner: 'tc_provisional_banner',
  hasContent: null, // which branch renders (content vs the dignified empty state)
  labels: null, // caller-supplied fixed UI copy (i18n strings), never record data
};

/** The `/terms` field-id set, derived from the model the page renders. */
export function tcSurfaceFieldIds(model: TcRenderModel): string[] {
  return deriveFieldIds(model, TC_FIELD_IDS);
}
