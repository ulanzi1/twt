// The authoritative bilingual display contract for the public Niyamavali render
// (Story 2.5, Task 5; AC2, AC6a, AC9). PURE + deterministic — no DB, no Astro, no
// I/O — so the `.astro` page is a thin wrapper (architecture §"Astro component test
// carve-out": render logic lives in `.ts`, unit-tested by vitest; the `.astro` file
// has no co-located test). This module is the live-render source the PII scrape spec
// (`tests/integration/public-pages/scrape-test.spec.ts`) feeds the engine.
//
// SERVER-ONLY: imported by `.astro` frontmatter + Node tests, never by a client
// island, so importing `@twt/domain` is allowed (AC9 governs client-reachable code).
// This SUPERSEDES the pragmatic `apps/api/.../render-diff.ts` placeholder, which
// explicitly deferred "the authoritative bilingual display contract" to this story.
//
// OPAQUENESS (freeze row 14 — Epic 4 owns rule semantics): this is DISPLAY-FIELD
// rendering, NOT rule interpretation. We surface title / clause_id / version /
// effective-date / rule_code and a deterministic key→value rendering of the
// remaining payload display fields; we never interpret what a field MEANS.
import { niyamavali } from '@twt/domain';
import type { schema } from '@twt/domain';
import type { Locale } from '@twt/i18n';

import { deriveFieldIds, type FieldIdMapping } from './surface-fields.js';

type ClauseRow = schema.ClauseVersionRow;
type ClausePayload = schema.ClausePayload;

/** Payload keys surfaced as first-class display fields (excluded from the generic list). */
const SPECIAL_KEYS = new Set(['title_en', 'title_hi', 'rule_code']);

/** One generic display field rendered key→value (snake_case key kept as the stable handle). */
export interface ClauseFieldRow {
  key: string;
  value: string;
}

/** The view model for a single effective clause. All strings — ready for the `.astro` wrapper. */
export interface ClauseDisplay {
  /** The stable, human-readable reference handle (AC2 — rendered visibly). */
  clauseId: string;
  /** Localised title (Hindi-primary on this member surface), falling back to clause_id. */
  title: string;
  /** The `payload.rule_code` display field, when present. */
  ruleCode: string | null;
  version: number;
  /** ISO `YYYY-MM-DD` — operational data ⇒ Gregorian + Latin numerals (amendment-A2). */
  effectiveDate: string;
  benefitMechanism: string;
  /** Remaining payload display fields, sorted by key (deterministic). */
  fields: ClauseFieldRow[];
}

/** The whole-page view model the public Niyamavali render consumes. */
export interface NiyamavaliRenderModel {
  locale: Locale;
  clauses: ClauseDisplay[];
}

/** Render a single payload value to a readable string. Objects/arrays → compact JSON. */
function renderValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Read a payload string field only when it is a non-empty string. */
function stringField(payload: ClausePayload, key: string): string | null {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * The localised title: Hindi-primary (`title_hi` → `title_en` → clause_id) on this
 * member-facing surface; `en` prefers `title_en`. Falls back to the clause_id handle
 * so a clause with no title still renders a stable reference (never an empty label).
 */
function localisedTitle(payload: ClausePayload, locale: Locale, clauseId: string): string {
  const hi = stringField(payload, 'title_hi');
  const en = stringField(payload, 'title_en');
  if (locale === 'hi') return hi ?? en ?? clauseId;
  return en ?? hi ?? clauseId;
}

/** Format a clause-version row's effective instant as `YYYY-MM-DD` (Gregorian/Latin). */
function effectiveDateIso(effectiveDate: Date): string {
  return effectiveDate.toISOString().slice(0, 10);
}

/** Project one clause-version row to its display model. */
function toClauseDisplay(row: ClauseRow, locale: Locale): ClauseDisplay {
  const payload = row.payload;
  const fields: ClauseFieldRow[] = Object.keys(payload)
    .filter((k) => !SPECIAL_KEYS.has(k))
    .sort()
    .map((key) => ({ key, value: renderValue(payload[key]) }));

  return {
    clauseId: row.clauseId,
    title: localisedTitle(payload, locale, row.clauseId),
    ruleCode: stringField(payload, 'rule_code'),
    version: row.version,
    effectiveDate: effectiveDateIso(row.effectiveDate),
    benefitMechanism: row.benefitMechanism,
    fields,
  };
}

/**
 * Render the effective clause set to the page view model (AC2). Deterministic:
 * clauses are sorted by `clause_id` (independent of input order) and every clause's
 * generic fields are sorted by key. No PII fields exist in a rule payload (freeze
 * row 14 — registry rule content carries no member PII); the PII scrape spec is the
 * structural backstop (AC6a).
 */
export function renderNiyamavaliClauses(
  clauses: ClauseRow[],
  opts: { locale: Locale },
): NiyamavaliRenderModel {
  const ordered = [...clauses].sort((a, b) => a.clauseId.localeCompare(b.clauseId));
  return {
    locale: opts.locale,
    clauses: ordered.map((row) => toClauseDisplay(row, opts.locale)),
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
 * Serialise the page view model to an HTML fragment of the SAME public-tier display
 * fields the `.astro` page emits (title / clause_id / version / effective-date /
 * rule_code / payload fields), every value HTML-escaped. This is the server-free
 * "real render" the PII scrape integration spec feeds the engine (AC6a) — it needs no
 * live Astro server, and because it carries exactly the rendered field VALUES, the
 * naked-PII / tier-leak verdict over it is faithful to what a visitor would receive.
 */
export function renderNiyamavaliHtml(model: NiyamavaliRenderModel): string {
  const items = model.clauses
    .map((c) => {
      const ruleCode = c.ruleCode ? `<span class="rule-code">${escapeHtml(c.ruleCode)}</span>` : '';
      const fields = c.fields
        .map((f) => `<div><dt>${escapeHtml(f.key)}</dt><dd>${escapeHtml(f.value)}</dd></div>`)
        .join('');
      return (
        `<article class="clause">` +
        `<h3 class="clause-title">${escapeHtml(c.title)}</h3>${ruleCode}` +
        `<code class="clause-id">${escapeHtml(c.clauseId)}</code>` +
        `<span class="version">${c.version}</span>` +
        `<time class="effective">${escapeHtml(c.effectiveDate)}</time>` +
        `<dl class="fields">${fields}</dl>` +
        `</article>`
      );
    })
    .join('\n');
  return `<section lang="${escapeHtml(model.locale)}" class="niyamavali">\n${items}\n</section>`;
}

/** One added/removed payload field in a version diff. */
export interface DiffFieldRow {
  key: string;
  value: string;
}

/** One changed payload field (before → after) in a version diff. */
export interface DiffChangeRow {
  key: string;
  from: string;
  to: string;
}

/** The diff-selector view model over a structured-payload diff. */
export interface DiffDisplay {
  added: DiffFieldRow[];
  removed: DiffFieldRow[];
  changed: DiffChangeRow[];
}

/**
 * Render the structured-payload diff between two clause versions for the diff
 * selector (AC2). A view adapter over the domain's `computePayloadDiff` (do NOT
 * reimplement diff logic — Task 4) — structural only (freeze row 14). Keys are
 * sorted within each bucket for deterministic output.
 */
export function renderDiff(versionA: ClauseRow, versionB: ClauseRow): DiffDisplay {
  const doc = niyamavali.computePayloadDiff(versionA.payload, versionB.payload);
  return {
    added: Object.keys(doc.added)
      .sort()
      .map((key) => ({ key, value: renderValue(doc.added[key]) })),
    removed: Object.keys(doc.removed)
      .sort()
      .map((key) => ({ key, value: renderValue(doc.removed[key]) })),
    changed: Object.keys(doc.changed)
      .sort()
      .map((key) => {
        const change = doc.changed[key];
        return { key, from: renderValue(change?.from), to: renderValue(change?.to) };
      }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix field ids (Story 11a.1, Task 6; AC2 + ruling D3(a))
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The `/niyamavali` surface's matrix field ids, derived from THIS module's own
 * render model — the coupling D3(a) ruled: to render a field you must first put
 * it in the model, so a newly-added field reaches the tier-leak snapshot by
 * itself and fails closed as `unclassified` until it is classified.
 *
 * ⚠ `fields` (the generic payload key→value list) maps to ONE field id. That is
 * a deliberate and stated limit: the payload key set is DATA — clause payloads
 * differ per clause and per Pariwar — so no committed file can enumerate it. The
 * matrix classifies the payload DISPLAY BLOCK as a whole; what protects its
 * CONTENTS is `renderValue`'s opaqueness (freeze row 14: display rendering, never
 * rule interpretation) plus the naked-PII leg, which scans the real rendered HTML
 * and does not care where a phone number came from.
 */
const NIYAMAVALI_CLAUSE_FIELD_IDS: FieldIdMapping<ClauseDisplay> = {
  clauseId: 'clause_id',
  title: 'clause_title',
  ruleCode: 'rule_code',
  version: 'clause_version',
  effectiveDate: 'effective_date',
  benefitMechanism: 'benefit_mechanism',
  fields: 'clause_payload_display_fields',
};

/** Model-level keys: render settings, not rendered record data. */
const NIYAMAVALI_MODEL_FIELD_IDS: FieldIdMapping<NiyamavaliRenderModel> = {
  locale: null, // which language to render in — a request parameter, not clause data
  clauses: null, // the clauses themselves — classified per-clause above
};

/**
 * The `/niyamavali` field-id set: the union over the rendered clauses. An empty
 * clause list yields an empty set, which is correct — a page rendering no clauses
 * renders no clause fields.
 */
export function niyamavaliSurfaceFieldIds(model: NiyamavaliRenderModel): string[] {
  deriveFieldIds(model, NIYAMAVALI_MODEL_FIELD_IDS); // validates the model shape itself
  const ids = model.clauses.flatMap((c) => deriveFieldIds(c, NIYAMAVALI_CLAUSE_FIELD_IDS));
  return [...new Set(ids)].sort();
}
