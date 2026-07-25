// 90-second loop — OFF-DEVICE p95 aggregation (Story 8.12, Task 4; AC2). NOT a `*.test.ts` (vitest does
// not collect it); the CLI at the bottom runs it against an exported JSON file.
//
// ── Why this lives OFF the mobile bundle (D3 / the bundle boundary) ─────────────────────────────────────
// @twt/measured-validation transitively deps @twt/domain → `pg`. Importing it into apps/mobile would leak
// `pg` into the Metro bundle ([[project_contracts_domain_bundle_boundary]]). So the MOBILE side captures +
// exports raw per-session breakdowns as JSON; the p95 is computed HERE, in a node context that already deps
// the package (apps/jobs, Story 7.9's consumer) — no premature new package ([[feedback_no_premature_package]]).
//
// ── Right tool, right use (D3) ──────────────────────────────────────────────────────────────────────────
// We reuse ONLY `percentile()` — the fixed FLOOR-INDEXED NEAREST-RANK convention, so the doc's number is
// reproducible + comparable. We do NOT use `measureP95` / `runPool`: those drive an `op` under a
// concurrency pool for SYNTHETIC-load benching. The 90-second loop is a HUMAN on a real device, one session
// at a time — there is no `op` to pool. Wiring the concurrency driver here would be a category error; do
// not "fix" this file by importing it.
//
// The `ExportedLoopSession` shape MIRRORS apps/mobile/lib/loop-timing.ts's `LoopBreakdown` numeric fields
// as a JSON contract at the file boundary — a deliberate re-declaration (not a cross-app import, which the
// bundle boundary forbids), so the two sides stay decoupled through JSON.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { percentile } from '@twt/measured-validation';

/** The B21 measurement fence (epics.md:2853): TWT-portion ≤ 60s p95; total observed loop ≤ 90s. */
export const TWT_PORTION_BUDGET_MS = 60_000;
export const TOTAL_BUDGET_MS = 90_000;

/** The story's own stated sample floor (AC3 / validation doc §2): fewer complete sessions than this can't
 *  produce a meaningful p95 (Review finding, 2026-07-25 code review — an aggregate over 1-2 sessions would
 *  otherwise silently pass as if the ≥10-session gate had been met). */
export const MINIMUM_COMPLETE_SESSIONS = 10;

/** One exported per-session breakdown (the JSON the mobile store's exportSessionsJson emits). Mirrors the
 *  numeric fields of the mobile `LoopBreakdown`; only the fields the aggregation reads are required. */
export interface ExportedLoopSession {
  twtPortionMs: number | null;
  totalMs: number | null;
  upiRoundTripMs?: number | null;
  memberThinkMs?: number | null;
  complete: boolean;
}

/** p50/p95/p99 over one measured set (ms). */
export interface PercentileTriple {
  p50: number;
  p95: number;
  p99: number;
}

/** The aggregation result — the versioned figures the validation doc records. */
export interface LoopAggregate {
  /** Total exported sessions (complete + incomplete). */
  n: number;
  /** Complete, in-order sessions actually aggregated (the p95 denominator). */
  nComplete: number;
  /** TWT-portion percentiles (the budgeted number). */
  twtPortion: PercentileTriple;
  /** Total-observed-loop percentiles (includes the excluded round-trip). */
  total: PercentileTriple;
  /** p95 TWT-portion ≤ 60s. */
  passesTwtBudget: boolean;
  /** p95 total ≤ 90s. */
  passesTotalBudget: boolean;
}

/** p50/p95/p99 of a numeric sample using the shared floor-indexed nearest-rank `percentile()`. */
function triple(values: readonly number[]): PercentileTriple {
  const sortedAsc = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sortedAsc, 50),
    p95: percentile(sortedAsc, 95),
    p99: percentile(sortedAsc, 99),
  };
}

/**
 * Aggregate exported loop sessions into the p95 TWT-portion + p95 total, EXCLUDING incomplete / out-of-order
 * sessions (which carry `complete: false` and/or null durations) before any percentile is taken — so an
 * already-attested-shortcut session (D1a) can never pollute the number. Throws when nothing complete
 * remains (an honest empty, never a fabricated zero-verdict — [[feedback_record_unattested_no_backfill]]).
 */
export function aggregateLoopSessions(sessions: readonly ExportedLoopSession[]): LoopAggregate {
  const usable = sessions.filter(
    (s): s is ExportedLoopSession & { twtPortionMs: number; totalMs: number } =>
      s.complete && typeof s.twtPortionMs === 'number' && typeof s.totalMs === 'number',
  );
  if (usable.length < MINIMUM_COMPLETE_SESSIONS) {
    throw new Error(
      `[loop-90s] only ${usable.length} complete session(s) — capture ≥${MINIMUM_COMPLETE_SESSIONS} before aggregating a gate verdict`,
    );
  }

  const twtPortion = triple(usable.map((s) => s.twtPortionMs));
  const total = triple(usable.map((s) => s.totalMs));

  return {
    n: sessions.length,
    nComplete: usable.length,
    twtPortion,
    total,
    passesTwtBudget: twtPortion.p95 <= TWT_PORTION_BUDGET_MS,
    passesTotalBudget: total.p95 <= TOTAL_BUDGET_MS,
  };
}

/** ms → seconds with 2dp, for the human-readable CLI summary. */
function s(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Render the aggregate as the doc-ready summary lines. */
export function renderAggregate(agg: LoopAggregate): string {
  return [
    `sessions: ${agg.n} exported, ${agg.nComplete} complete (aggregated)`,
    `TWT-portion  p50 ${s(agg.twtPortion.p50)}  p95 ${s(agg.twtPortion.p95)}  p99 ${s(agg.twtPortion.p99)}  ` +
      `→ ${agg.passesTwtBudget ? 'PASS' : 'FAIL'} (≤ 60s p95)`,
    `total loop   p50 ${s(agg.total.p50)}  p95 ${s(agg.total.p95)}  p99 ${s(agg.total.p99)}  ` +
      `→ ${agg.passesTotalBudget ? 'PASS' : 'FAIL'} (≤ 90s p95)`,
  ].join('\n');
}

// ── CLI: `tsx apps/jobs/tests/loop-90s-aggregate.ts <exported-sessions.json>` ──────────────────────────
// Reads the JSON exported off-device (the debug screen's "Share JSON") and prints the p95 figures for the
// validation doc. Kept out of vitest collection by the `.ts` (non-`.test.ts`) name.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: tsx loop-90s-aggregate.ts <exported-sessions.json>');
    process.exit(2);
  }
  let sessions: unknown;
  try {
    sessions = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[loop-90s] failed to read/parse ${path}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
  if (!Array.isArray(sessions)) {
    console.error(`[loop-90s] ${path} does not contain a JSON array of exported sessions`);
    process.exit(2);
  }
  console.log(renderAggregate(aggregateLoopSessions(sessions as ExportedLoopSession[])));
}
