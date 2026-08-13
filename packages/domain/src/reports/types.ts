// Reports library — shared contracts (Story 10.7, Task 2; AC1/AC3/AC4).
//
// The `ReportTemplate` contract is what a report registers into the registry. `assembleReport`
// (assemble.ts) depends ONLY on these contract methods + the registry lookup — never on a specific
// `reportType` (inherits 10.6's Open/Closed invariant, AC1). A future report type extends this
// contract / adds a template; it NEVER adds a branch to the assembly harness.

import type { Db } from '../db.js';
import type { EffectiveGrant } from '../rbac/check.js';
import type { GeoTreeResolver, ScopeDimension } from '../rbac/scope.js';

/** The report-export lifecycle status value set (the `report_exports.status` domain of truth; the
 *  contracts `ReportExportStatus` enum mirrors this — a test-only sync-guard pins them equal). */
export const REPORT_EXPORT_STATUSES = ['pending', 'ready', 'failed', 'consumed', 'expired'] as const;
export type ReportExportStatus = (typeof REPORT_EXPORT_STATUSES)[number];

/** The report output formats (the `report_exports.format` domain of truth; the contracts `ReportFormat`
 *  enum mirrors this). */
export const REPORT_FORMATS = ['csv', 'json'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** The bounded NON-PII `failed_reason` code set (the `report_exports.failed_reason` domain of truth;
 *  the contracts `ReportFailureReason` enum mirrors this — a test-only sync-guard pins them equal).
 *  NEVER an exception message (R1) — `markReportExportFailed` is typed to this set so a caller cannot
 *  accidentally persist free text. */
export const REPORT_FAILURE_REASONS = ['enqueue_failed', 'assemble_error', 'stale_pending_timeout'] as const;
export type ReportFailureReasonCode = (typeof REPORT_FAILURE_REASONS)[number];

/**
 * One column a report template projects. `piiTier` is the AR-12 tier of the SOURCE field. The
 * load-bearing v1 invariant (Decision 2, AC4): a template column NEVER carries decrypted Tier-1
 * plaintext — v1 columns are Tier-3 clear + Tier-2 hashes + already-stored masked derivations only,
 * so every seeded template's columns are `piiTier: 2 | 3`. `decryptIfPermitted` is a FIRST-CLASS
 * DEFERRED SEAM ([[project_nominee_vpa_deferred_seam]] discipline): it resolves `false`/masked
 * everywhere in v1; the `reports.view_pii`-class capability + gate + its audit are a named follow-up.
 */
export interface ReportColumn {
  /** The row-object key this column reads. */
  readonly key: string;
  /** The human-readable CSV/JSON header. */
  readonly header: string;
  /** The AR-12 PII tier of the source field. v1 seeded templates are `2 | 3` ONLY (never `1`). */
  readonly piiTier: 1 | 2 | 3;
  /** DEFERRED SEAM: decrypt this Tier-1 field IF the requestor's RBAC scope permits. Resolves
   *  `false`/masked in v1 (the capability + gate + audit are a forward commitment). */
  readonly decryptIfPermitted?: boolean;
}

/**
 * The actor's RESOLVED scope for a report — the dimension their grant carries for the template's
 * permission key, and EVERY node they hold it at (Decision 3). The template's `query` pushes THIS
 * into the SQL predicate so out-of-scope rows are never fetched.
 *
 * ⭐ MULTI-VALUED SINCE STORY 10.28 (D1 arm A). An actor holding the key at two same-dimension nodes
 * (`{district,'Patna'}` + `{district,'Gaya'}`) carries BOTH, and the template narrows
 * `WHERE district IN (…)`. Before 10.28 this was single-valued and a strict-`<` tie-break silently
 * kept whichever grant iterated first — a multi-district admin exported ONE district with no signal
 * that the rest were dropped.
 */
export interface ResolvedReportScope {
  readonly dimension: ScopeDimension;
  /** EVERY node the actor holds this key at, at `dimension` — deduped, sorted, stable.
   *  EMPTY iff `dimension === 'global'` (the one dimension whose canonical target value is
   *  null — `rbac/scope.ts:236`). A NON-global dimension with an empty set is UNREACHABLE:
   *  `resolveActorReportScope` returns `null` rather than an empty-set scope. */
  readonly values: readonly string[];
}

/**
 * Everything a template's `query` needs to narrow scope-respectingly. Built by the API request handler
 * (from the request's grants) AND re-built by the build worker (re-loading grants under scope — the
 * RBAC is RE-VALIDATED at build time, column-free; the persisted row carries no resolved-scope columns).
 */
export interface ReportScopeCtx {
  readonly actorId: string;
  readonly grants: readonly EffectiveGrant[];
  readonly pariwarId: string;
  /** The actor's resolved (dimension, values) for this report's permission key — MULTI-VALUED since
   *  Story 10.28; see `ResolvedReportScope` above. */
  readonly resolvedScope: ResolvedReportScope;
  /** Bounded, NON-PII request params (forward-compat seam; v1 seed templates are parameterless). */
  readonly params?: Readonly<Record<string, unknown>>;
  /**
   * ⭐ Story 1.18 (AC3, site 9) — the caller's in-force geo-tree resolver, OPTIONAL.
   *
   * `assembleReport`'s `checkPermission` evaluates the actor at `resolvedScope.dimension`, which for
   * a district-scoped report actor IS a geo dimension — so this is a real geo check that has been
   * silently deny-deeper since Story 10.7.
   *
   * ⛔ OPTIONAL, and omitting it means TODAY'S BEHAVIOUR EXACTLY: `checkPermission` falls back to
   * `denyDeeperGeoResolver`, so every existing caller and test keeps the deny-deeper posture
   * unchanged. The API handler supplies it from `request.geoTree`; the build worker re-loads it at
   * build time, alongside the grants it already re-validates.
   *
   * ⛔ It is a resolver, NOT a loader — PURE and SYNCHRONOUS, closing over an already-loaded
   * document, because `checkPermission` is a pure predicate and cannot await.
   *
   * ⚠ THIS AFFECTS AUTHORIZATION ONLY, NOT QUERY NARROWING. A template's `query` narrows on
   * `resolvedScope` independently (`templates/_shared.ts`), and that narrowing is a SEPARATE
   * deny-deeper mechanism with its own disposition — see `reports/scope.ts` and Story 10.28.
   */
  readonly geoResolver?: GeoTreeResolver;
}

/**
 * A registered report template (AC1). `query` is scope-respecting — it receives the actor's resolved
 * scope and pushes it into the SQL predicate (Decision 3), so out-of-scope rows are NEVER read.
 * `csvRow`/`jsonRow` project one row for serialization (masked per `columns`).
 */
export interface ReportTemplate<TRow = unknown> {
  /** The registry key. Never compared against inside `assembleReport` (AC1 Open/Closed). */
  readonly reportType: string;
  /** The RBAC permission key `assembleReport` validates fail-closed (Decision 6, per-template key). */
  readonly permissionKey: string;
  /** The template's DECLARED scope dimension (AC1) — static metadata for introspection/tooling. The
   *  actual `checkPermission` uses the actor's RESOLVED (dimension, value), not this field (the 10.6
   *  static-vs-actual-dimension lesson). */
  readonly scopeDimension: ScopeDimension;
  /** Dotted lowercase `resource.action` — the build audit line's action (matches the writeAuditEntry regex). */
  readonly auditAction: string;
  /** The column declaration (AC1). v1: every entry is `piiTier: 2 | 3` (the masking invariant, AC4). */
  readonly columns: readonly ReportColumn[];
  /** Scope-respecting fetch: pushes the actor's resolved scope INTO the SQL (Decision 3). */
  query(scopeCtx: ReportScopeCtx, client: Db): Promise<TRow[]>;
  /** Project one row into a stable CSV row (string values; masked per `columns`). */
  csvRow(row: TRow): Record<string, string>;
  /** Project one row into a canonical-JSON-safe value (masked per `columns`). */
  jsonRow(row: TRow): unknown;
}

/** What `assembleReport` returns — the assembled rows + count + the template's column declaration. */
export interface ReportResult<TRow = unknown> {
  readonly rows: TRow[];
  readonly rowCount: number;
  readonly columns: readonly ReportColumn[];
}
