// scripts/friction-budget/lib.ts
//
// Pure, importable logic for the friction-budget PR CI gate (Story 1.16a,
// UX-DR3). Everything here is side-effect-free and unit-tested with fixtures
// (lib.test.ts); the impure orchestration (fs reads, git, process.exit) lives
// in check.ts — mirroring the testable-pure-core style of
// packages/contracts/scripts/check-openapi-determinism.ts.
//
// UX-DR3 has TWO facets, both enforced by this one gate:
//   (1) METRIC facet     — friction-budget.yaml ceilings (AC-1/2/3): bundle
//                          bytes + page-weight per surface, regress→fail,
//                          improve→assert committed baseline-of-record.
//   (2) DECLARATION facet — friction-budget.md named-payer ledger (AC-4):
//                          payer/protects/event_type per row + attribution
//                          when a PR touches a member-facing surface.
//
// Architecture authority: Principle #8 (line 294) friction-as-budget;
// §4.11.1 (lines 2785-2799) page-weight budget; AR-60 + UX-DR3; UX Stance #2.

import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// METRIC facet — friction-budget.yaml registry
// ─────────────────────────────────────────────────────────────────────────────

/** One budgeted metric on a surface: a ceiling + the committed baseline-of-record. */
export interface MetricBudget {
  id: string;
  /** Hard ceiling in bytes. A measured value above this fails the gate (AC-3). */
  ceiling: number;
  /**
   * baseline-of-record (AC-3): the committed current value the gate compares
   * against. `null` until the surface produces its first measurable build
   * output. The author commits an improved baseline in-PR; the gate asserts
   * committed === measured — it never auto-pushes.
   */
  baseline: number | null;
}

/** A member-facing surface whose build output carries budgeted metrics. */
export interface Surface {
  id: string;
  description?: string;
  /**
   * Repo-relative path to the build manifest reporting this surface's measured
   * bytes (a JSON object of `{ metricId: bytes }`). Absent → the surface is a
   * graceful no-op (AC-2) until its build output lands.
   */
  manifest: string;
  metrics: MetricBudget[];
}

/** A metric committed-but-deferred (AC-6): live-device critical-render-path timing. */
export interface DeferredMetric {
  id: string;
  status: string;
  canonicalDevice?: string;
  trigger?: string;
}

export interface FrictionBudgetConfig {
  version: number;
  surfaces: Surface[];
  deferredMetrics: DeferredMetric[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + structurally validate friction-budget.yaml. Throws Error with a
 * precise message on any malformed entry — a malformed registry must fail the
 * gate loudly, never be silently skipped.
 */
export function parseFrictionBudgetYaml(raw: string): FrictionBudgetConfig {
  const doc: unknown = parseYaml(raw);
  if (!isObject(doc)) throw new Error('friction-budget.yaml: top-level must be a mapping');

  if (typeof doc.version !== 'number') {
    throw new Error('friction-budget.yaml: `version` must be a number');
  }
  if (!Array.isArray(doc.surfaces)) {
    throw new Error('friction-budget.yaml: `surfaces` must be a list');
  }

  const surfaces: Surface[] = doc.surfaces.map((s, i) => {
    if (!isObject(s)) throw new Error(`friction-budget.yaml: surfaces[${i}] must be a mapping`);
    if (typeof s.id !== 'string') {
      throw new Error(`friction-budget.yaml: surfaces[${i}].id must be a string`);
    }
    if (typeof s.manifest !== 'string') {
      throw new Error(`friction-budget.yaml: surface "${s.id}" is missing a string \`manifest\``);
    }
    if (!Array.isArray(s.metrics)) {
      throw new Error(`friction-budget.yaml: surface "${s.id}".metrics must be a list`);
    }
    const metrics: MetricBudget[] = s.metrics.map((m, j) => {
      if (!isObject(m)) {
        throw new Error(`friction-budget.yaml: surface "${s.id}".metrics[${j}] must be a mapping`);
      }
      if (typeof m.id !== 'string') {
        throw new Error(
          `friction-budget.yaml: surface "${s.id}".metrics[${j}].id must be a string`,
        );
      }
      if (typeof m.ceiling !== 'number') {
        throw new Error(`friction-budget.yaml: metric "${s.id}.${m.id}".ceiling must be a number`);
      }
      const baseline = m.baseline;
      if (baseline !== null && typeof baseline !== 'number') {
        throw new Error(
          `friction-budget.yaml: metric "${s.id}.${m.id}".baseline must be a number or null`,
        );
      }
      if (typeof baseline === 'number' && baseline > (m.ceiling as number)) {
        throw new Error(
          `friction-budget.yaml: metric "${s.id}.${m.id}".baseline (${baseline}) exceeds ceiling (${m.ceiling as number}) — committed baseline must be ≤ its ceiling`,
        );
      }
      return { id: m.id, ceiling: m.ceiling, baseline: baseline ?? null };
    });
    return {
      id: s.id,
      description: typeof s.description === 'string' ? s.description : undefined,
      manifest: s.manifest,
      metrics,
    };
  });

  const deferredRaw = Array.isArray(doc.deferred_metrics) ? doc.deferred_metrics : [];
  const deferredMetrics: DeferredMetric[] = deferredRaw.filter(isObject).map((d) => ({
    id: typeof d.id === 'string' ? d.id : '(unnamed)',
    status: typeof d.status === 'string' ? d.status : 'deferred',
    canonicalDevice: typeof d.canonical_device === 'string' ? d.canonical_device : undefined,
    trigger: typeof d.trigger === 'string' ? d.trigger : undefined,
  }));

  return { version: doc.version, surfaces, deferredMetrics };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC facet — measurement + threshold comparison (AC-2, AC-3)
// ─────────────────────────────────────────────────────────────────────────────

export type MetricStatus = 'pass' | 'fail' | 'no-op';

export interface MetricVerdict {
  surface: string;
  metric: string;
  status: MetricStatus;
  measured: number | null;
  ceiling: number;
  baseline: number | null;
  message: string;
}

/** A build manifest: `{ metricId: measuredBytes }`. `null` = manifest absent. */
export type Manifest = Record<string, number>;

/**
 * Evaluate one metric against its manifest reading (AC-2/AC-3):
 *   - manifest absent, or this metric absent from it → no-op (passes; AC-2).
 *   - measured  >  ceiling                           → FAIL (regression).
 *   - measured  <  committed baseline                → FAIL (improved but the
 *       baseline-of-record was not lowered in-PR — the "drift" case).
 *   - baseline null, or baseline <= measured <= ceiling → pass (delta reported).
 */
export function evaluateMetric(
  surface: string,
  metric: MetricBudget,
  manifest: Manifest | null,
): MetricVerdict {
  const base = { surface, metric: metric.id, ceiling: metric.ceiling, baseline: metric.baseline };

  if (manifest === null || typeof manifest[metric.id] !== 'number') {
    return {
      ...base,
      status: 'no-op',
      measured: null,
      message: `no-op — no measurable build output for "${surface}.${metric.id}" yet`,
    };
  }

  const measured = manifest[metric.id];

  if (measured > metric.ceiling) {
    return {
      ...base,
      status: 'fail',
      measured,
      message:
        `REGRESSION — ${surface}.${metric.id}: ${measured} bytes exceeds ceiling ` +
        `${metric.ceiling} (Δ +${measured - metric.ceiling}). ` +
        `baseline-of-record: ${metric.baseline ?? 'none'}.`,
    };
  }

  if (metric.baseline !== null && measured < metric.baseline) {
    return {
      ...base,
      status: 'fail',
      measured,
      message:
        `IMPROVED but baseline-of-record not updated — ${surface}.${metric.id}: measured ` +
        `${measured} < committed baseline ${metric.baseline}. Lower the baseline to ${measured} ` +
        `in friction-budget.yaml in this PR (the gate asserts committed === measured; it never auto-pushes).`,
    };
  }

  const delta = metric.baseline === null ? 0 : measured - metric.baseline;
  const deltaNote =
    metric.baseline === null
      ? `baseline-of-record not yet set — record ${measured} in friction-budget.yaml`
      : `Δ ${delta >= 0 ? '+' : ''}${delta} vs baseline ${metric.baseline}`;
  return {
    ...base,
    status: 'pass',
    measured,
    message: `pass — ${surface}.${metric.id}: ${measured} ≤ ceiling ${metric.ceiling} (${deltaNote})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC facet — same-PR threshold-loosening guard (AC-1)
// ─────────────────────────────────────────────────────────────────────────────

export interface Loosening {
  surface: string;
  metric: string;
  from: number;
  to: number;
}

function ceilingIndex(config: FrictionBudgetConfig): Map<string, number> {
  const idx = new Map<string, number>();
  for (const s of config.surfaces) {
    for (const m of s.metrics) idx.set(`${s.id}.${m.id}`, m.ceiling);
  }
  return idx;
}

function baselineIndex(config: FrictionBudgetConfig): Map<string, number | null> {
  const idx = new Map<string, number | null>();
  for (const s of config.surfaces) {
    for (const m of s.metrics) idx.set(`${s.id}.${m.id}`, m.baseline);
  }
  return idx;
}

/**
 * Ceilings that were LOOSENED (raised) between the base-ref config and HEAD.
 * `base === null` (the file did not exist at the base ref, e.g. the PR that
 * introduces it) → no loosening is possible.
 */
export function detectLoosenedCeilings(
  base: FrictionBudgetConfig | null,
  head: FrictionBudgetConfig,
): Loosening[] {
  if (base === null) return [];
  const baseCeilings = ceilingIndex(base);
  const out: Loosening[] = [];
  for (const [key, to] of ceilingIndex(head)) {
    const from = baseCeilings.get(key);
    if (from !== undefined && to > from) {
      const [surface, metric] = key.split(/\.(.*)/s);
      out.push({ surface, metric, from, to });
    }
  }
  return out;
}

/** True if any committed baseline-of-record value changed between base and HEAD. */
export function detectBaselineChanges(
  base: FrictionBudgetConfig | null,
  head: FrictionBudgetConfig,
): boolean {
  if (base === null) return false;
  const baseBaselines = baselineIndex(base);
  for (const [key, value] of baselineIndex(head)) {
    if (baseBaselines.has(key) && baseBaselines.get(key) !== value) return true;
  }
  return false;
}

export interface BaselineRaise {
  surface: string;
  metric: string;
  from: number;
  to: number;
}

/**
 * Baselines that were RAISED (inflated) between base and HEAD. A baseline can
 * only decrease in-PR (the author commits an improved lower value); an increase
 * erodes the improvement-tracking discipline and must ship in a rationale PR.
 */
export function detectRaisedBaselines(
  base: FrictionBudgetConfig | null,
  head: FrictionBudgetConfig,
): BaselineRaise[] {
  if (base === null) return [];
  const baseBaselines = baselineIndex(base);
  const out: BaselineRaise[] = [];
  for (const [key, to] of baselineIndex(head)) {
    const from = baseBaselines.get(key);
    if (from !== undefined && from !== null && to !== null && to > from) {
      const [surface, metric] = key.split(/\.(.*)/s);
      out.push({ surface, metric, from, to });
    }
  }
  return out;
}

/**
 * AC-1: a ceiling loosening must ship in its OWN PR with written rationale, not
 * bundled with a measurement change. Fail when a loosening co-occurs with a
 * measurement change (a baseline edit or a member-facing surface diff).
 */
export function loosenedGuardVerdict(
  loosenings: Loosening[],
  measurementChanged: boolean,
): { ok: boolean; message: string } {
  if (loosenings.length === 0) {
    return { ok: true, message: 'no ceiling loosening detected' };
  }
  const list = loosenings.map((l) => `${l.surface}.${l.metric} ${l.from}→${l.to}`).join(', ');
  if (measurementChanged) {
    return {
      ok: false,
      message:
        `THRESHOLD LOOSENING bundled with a measurement change (${list}). ` +
        `Split into a rationale PR: a ceiling change (loosening a budget) must land in its own PR ` +
        `with written rationale, separate from any measurement/code change (AC-1).`,
    };
  }
  return {
    ok: true,
    message: `ceiling loosening (${list}) in a rationale-only PR — allowed (AC-1)`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DECLARATION facet — friction-budget.md named-payer ledger (AC-4)
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_TYPES = ['forced', 'optional'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface LedgerRow {
  payer: string;
  protects: string;
  eventType: string;
}

export interface LedgerResult {
  rows: LedgerRow[];
  errors: string[];
}

function splitTableRow(line: string): string[] {
  // `| a | b | c |` → ['a','b','c'] (drop the leading/trailing empties).
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

/**
 * Parse + structurally validate the ledger table embedded in friction-budget.md.
 * Locates the table whose header carries payer / protects / event_type columns,
 * then validates each data row (AC-4): all three keys present;
 * event_type ∈ {forced, optional}.
 */
export function parseAndValidateLedger(markdown: string): LedgerResult {
  const lines = markdown.split('\n');
  const errors: string[] = [];
  const rows: LedgerRow[] = [];

  // Find the header row that names all three columns (case-insensitive).
  let headerIdx = -1;
  let cols: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) continue;
    const cells = splitTableRow(line).map((c) => c.toLowerCase());
    if (cells.includes('payer') && cells.includes('protects') && cells.includes('event_type')) {
      headerIdx = i;
      cols = cells;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      rows,
      errors: [
        'no friction-budget ledger table found (expected columns: payer | protects | event_type)',
      ],
    };
  }

  const payerCol = cols.indexOf('payer');
  const protectsCol = cols.indexOf('protects');
  const eventCol = cols.indexOf('event_type');

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;              // skip blank lines within the table
    if (!line.trim().startsWith('|')) break; // table ended
    const cells = splitTableRow(line);
    if (isSeparatorRow(cells)) continue;

    const payer = cells[payerCol] ?? '';
    const protects = cells[protectsCol] ?? '';
    const eventType = cells[eventCol] ?? '';
    const rowLabel = `ledger row ${rows.length + 1} (${payer || '<empty payer>'})`;

    if (!payer) errors.push(`${rowLabel}: missing \`payer\``);
    if (!protects) errors.push(`${rowLabel}: missing \`protects\``);
    if (!eventType) {
      errors.push(`${rowLabel}: missing \`event_type\``);
    } else if (!(EVENT_TYPES as readonly string[]).includes(eventType)) {
      errors.push(
        `${rowLabel}: event_type "${eventType}" must be one of ${EVENT_TYPES.join(' | ')}`,
      );
    }

    rows.push({ payer, protects, eventType });
  }

  return { rows, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// DECLARATION facet — member-facing path classifier + attribution-on-change
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The member-facing form/interaction surface set (AC-4 trigger). Kept here as a
 * single named constant so later stories extend it in one place. `apps/mobile`
 * is the member app; `apps/public` becomes member-facing as the Astro shell +
 * forms land (Story 2.5+). Admin / api / jobs / infra / docs / _bmad are
 * deliberately excluded — they are not member-facing. Conservative by design:
 * a false-positive (asking for a declaration on a non-friction change) is cheap
 * to satisfy; a false-negative (silent friction) is the failure Stance #2 exists
 * to prevent.
 */
export const MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/'] as const;

/** The ledger file path, repo-relative. */
export const LEDGER_FILE = 'friction-budget.md';

export function isMemberFacingPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');
  return MEMBER_FACING_PREFIXES.some((p) => normalized.startsWith(p));
}

export interface DeclarationVerdict {
  ok: boolean;
  touchedMemberPaths: string[];
  ledgerChanged: boolean;
  /** What actually satisfied (or failed) AC-4. `content-unavailable` = degraded fallback. */
  basis: 'dormant' | 'row' | 'disposition' | 'content-unavailable' | 'unchanged' | 'no-declaration';
  message: string;
}

/**
 * The ledger's text on both sides of the PR. `base` is `null` when the file did
 * not exist at the base ref (or `git show` failed) — the one case where content
 * cannot be compared and AC-4 degrades to the old file-touched check.
 */
export interface LedgerDiffInput {
  base: string | null;
  head: string;
}

/** `payer|protects|event_type`, normalized — the identity of a declaration row. */
function declarationRowKey(r: LedgerRow): string {
  const norm = (v: string): string => v.trim().replace(/\s+/g, ' ').toLowerCase();
  return `${norm(r.payer)}|${norm(r.protects)}|${norm(r.eventType)}`;
}

/**
 * The per-story disposition headings, e.g. `**Story 3.4 disposition (declaration
 * affirmed, no new row):**`. A story that legitimately owes NO new row still owes
 * a reasoned disposition, and this is the shape 106 of them already use.
 */
function dispositionHeadings(markdown: string): Set<string> {
  const out = new Set<string>();
  for (const line of markdown.split('\n')) {
    const m = /^\*\*Story\s+(\S+?)\s+disposition\b/.exec(line.trim());
    if (m) out.add(m[1].toLowerCase());
  }
  return out;
}

/**
 * AC-4 attribution-on-change: when a PR's diff touches a member-facing surface it
 * must DECLARE the friction — not merely touch the file.
 *
 * ⚠⛔ WHY THIS INSPECTS CONTENT (corrected 2026-09-05, `#decision-2026-09-05-202`
 * follow-up). This function used to pass whenever `friction-budget.md` appeared in
 * the changed-file list. That is satisfiable by ANY edit for ANY reason, and it was
 * DEMONSTRATED LIVE: a prose correction to an unrelated paragraph flipped AC-4 from
 * red to green while the declaration it was demanding of Story 11b.10 stayed
 * unwritten. A merge-blocking gate whose green means "something changed" rather than
 * "the thing is true" does not block anything.
 *
 * ⇒ AC-4 is satisfied by EITHER of the two things a story can legitimately owe:
 *   (1) a NEW or AMENDED declaration row — added, edited, or retired (11b.9 retired
 *       11b.1's row, so removal counts); or
 *   (2) a NEW per-story DISPOSITION block, which is how a story records that no row
 *       is warranted and why.
 * ⛔ Touching the file without either is no longer a pass.
 *
 * ⚠ DEGRADED, AND IT SAYS SO: when `ledger.base` is null the two sides cannot be
 * compared, so the old file-touched check applies and the message names the
 * fallback. ⛔ A silent degradation would re-create the defect this fixes.
 */
export function evaluateDeclaration(
  changedFiles: string[],
  ledger: LedgerDiffInput | null,
): DeclarationVerdict {
  const touchedMemberPaths = changedFiles.filter(isMemberFacingPath);
  const ledgerChanged = changedFiles.some((f) => f.replace(/\\/g, '/') === LEDGER_FILE);

  if (touchedMemberPaths.length === 0) {
    return {
      ok: true,
      touchedMemberPaths,
      ledgerChanged,
      basis: 'dormant',
      message: 'no member-facing surface touched — declaration facet dormant',
    };
  }

  const touched = touchedMemberPaths.join(', ');
  const remedy =
    `Declare the friction in ${LEDGER_FILE}: either a NEW/AMENDED declaration row ` +
    `(payer + protects + event_type, forced|optional) per UX Stance #2 / AR-60, ` +
    `or a new "**Story <id> disposition (...)**" block recording why no row is warranted.`;

  if (!ledgerChanged) {
    return {
      ok: false,
      touchedMemberPaths,
      ledgerChanged,
      basis: 'unchanged',
      message: `member-facing surface touched (${touched}) but ${LEDGER_FILE} was not changed. ${remedy}`,
    };
  }

  if (ledger === null || ledger.base === null) {
    return {
      ok: true,
      touchedMemberPaths,
      ledgerChanged,
      basis: 'content-unavailable',
      message:
        `member-facing surface touched and ${LEDGER_FILE} updated — declaration affirmed ` +
        `(DEGRADED: base revision of ${LEDGER_FILE} unavailable, so the change could not be ` +
        `inspected for a declaration row or disposition).`,
    };
  }

  const baseKeys = new Set(parseAndValidateLedger(ledger.base).rows.map(declarationRowKey));
  const headKeys = new Set(parseAndValidateLedger(ledger.head).rows.map(declarationRowKey));
  const added = [...headKeys].filter((k) => !baseKeys.has(k));
  const removed = [...baseKeys].filter((k) => !headKeys.has(k));

  if (added.length > 0 || removed.length > 0) {
    const parts: string[] = [];
    if (added.length > 0) parts.push(`${String(added.length)} added/amended`);
    if (removed.length > 0) parts.push(`${String(removed.length)} retired`);
    return {
      ok: true,
      touchedMemberPaths,
      ledgerChanged,
      basis: 'row',
      message: `member-facing surface touched and a declaration row changed (${parts.join(', ')}) — declaration affirmed`,
    };
  }

  const baseDisp = dispositionHeadings(ledger.base);
  const newDisp = [...dispositionHeadings(ledger.head)].filter((d) => !baseDisp.has(d));
  if (newDisp.length > 0) {
    return {
      ok: true,
      touchedMemberPaths,
      ledgerChanged,
      basis: 'disposition',
      message:
        `member-facing surface touched and a new story disposition was recorded ` +
        `(${newDisp.join(', ')}) — declaration affirmed with no new row`,
    };
  }

  return {
    ok: false,
    touchedMemberPaths,
    ledgerChanged,
    basis: 'no-declaration',
    message:
      `member-facing surface touched (${touched}) and ${LEDGER_FILE} WAS edited, but the edit ` +
      `contains NO new/amended declaration row and NO new story disposition — an incidental edit ` +
      `does not discharge AC-4. ${remedy}`,
  };
}
