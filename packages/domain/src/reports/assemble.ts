// Reports library — the assembly harness (Story 10.7, Task 2; AC1/AC3/AC4).
//
// THE OPEN/CLOSED SPINE (inherited from 10.6 Decision 5). `assembleReport` depends ONLY on the
// `ReportTemplate` contract methods + the registry lookup — it contains NO comparison against a
// specific `reportType` value and NO report-specific branch. A future report type extends the contract
// / registers a template; it NEVER adds an `if` here. Enforced by a source-text regex test + a
// behavioral proof (two divergent fixtures through the unchanged harness), the 10.6 twin.
//
// Two guarantees per call:
//   · AUTHORIZATION (Decision 6) — `checkPermission` fail-closed against the template's OWN permission
//     key at the actor's RESOLVED scope. An unauthorized actor never reaches `query`.
//   · SCOPE-RESPECTING (Decision 3) — the template's `query` receives the actor's resolved scope and
//     pushes it into the SQL predicate, so out-of-scope rows are NEVER fetched (RLS tenant-isolates
//     `pariwar_id` underneath as the backstop).
//
// v1 masks (Decision 2): `assembleReport` NEVER decrypts Tier-1 — the templates project Tier-3 clear +
// Tier-2 hashes + stored masked derivations only. There is no `enc` parameter here; the build worker
// envelope-encrypts the finished ARTIFACT (like 3.11 encrypts the finished ZIP), not per-row fields.

import type { Db } from '../db.js';
import { checkPermission } from '../rbac/check.js';
import { UnknownReportTypeError } from './errors.js';
import type { ReportRegistry } from './registry.js';
import type { ReportResult, ReportScopeCtx } from './types.js';

/**
 * Assemble a registered report scope-respectingly. Resolves the template (fail-closed on unknown type),
 * authorizes the actor at their resolved scope, runs the template's scope-narrowed `query`, and returns
 * the rows + count + column declaration. Throws `UnknownReportTypeError` for an unregistered type and
 * `AuthorizationDeniedError` when the actor lacks the template's key at their resolved scope.
 */
export async function assembleReport(
  registry: ReportRegistry,
  reportType: string,
  scopeCtx: ReportScopeCtx,
  client: Db,
): Promise<ReportResult> {
  const template = registry.get(reportType);
  if (!template) {
    throw new UnknownReportTypeError(reportType);
  }

  // Authorization (Decision 6): the actor must hold the template's OWN key at their resolved scope.
  // ⭐ SITE 9 (Story 1.18, AC3) — WIRED. `resolvedScope.dimension` is a geo dimension for a
  // district- or state-scoped report actor, so this is a real geo check. An absent `geoResolver`
  // means `denyDeeperGeoResolver`, i.e. today's behaviour, so no existing caller changes.
  // ⚠ AUTHORIZATION ONLY. The template's `query` narrows on `resolvedScope` through a SEPARATE
  // deny-deeper mechanism (`templates/_shared.ts`) that this resolver does not touch.
  //
  // ⭐ N NODES ⇒ N CHECKS, AND **EVERY** ONE MUST PASS (Story 10.28, D2 — ALL, never ANY).
  // `checkPermission` takes ONE `ResourceLocator`, so a multi-node scope is checked node by node.
  // ⛔ OR WOULD BE A GENUINE ESCALATION: one qualifying node would authorize a query that reads N.
  // Every value came from a grant that already passed the bundle + ceiling + active-Pariwar filters
  // in `resolveActorReportScope`, so ALL passes BY CONSTRUCTION today — which is exactly why
  // requiring ALL costs nothing now, and why it fails CLOSED if the producer and this checker ever
  // drift apart. `global` carries the empty set and is checked ONCE with `value: null` (D1(i)).
  // ⛔ THE OPEN/CLOSED INVARIANT SURVIVES (10.7 AC1, inherited from 10.6 Decision 5): this loop
  // iterates SCOPE VALUES, never `reportType`. There is still no `if (reportType === …)` here, and
  // `tests/reports/assemble.test.ts` proves it BOTH structurally (it `readFileSync`s this file) and
  // behaviourally (two divergent fixtures through the unchanged harness).
  // ⛔ THE EMPTY SET MAPS TO A SINGLE `null` TARGET, AND THAT IS THE FAIL-CLOSED PATH — never an
  // empty loop, which would authorize NOTHING and therefore permit EVERYTHING. For `global` that
  // `null` IS the canonical target and passes; for any other dimension `scopeContains` rejects a
  // null target outright (`rbac/scope.ts:236`), so an (unreachable) empty non-global set denies
  // through the REAL mechanism rather than through a hand-built error.
  const targetValues: readonly (string | null)[] =
    scopeCtx.resolvedScope.values.length > 0 ? scopeCtx.resolvedScope.values : [null];
  for (const value of targetValues) {
    const check = checkPermission(
      {
        actorId: scopeCtx.actorId,
        grants: scopeCtx.grants,
        key: template.permissionKey,
        resource: {
          dimension: scopeCtx.resolvedScope.dimension,
          value,
          pariwarId: scopeCtx.pariwarId,
        },
      },
      { resolver: scopeCtx.geoResolver },
    );
    if (!check.ok) {
      // Fail-closed — surface the structured denial (the app maps it to 403).
      throw check.error;
    }
  }

  // Scope-respecting fetch (Decision 3): the template pushes the resolved scope into its SQL.
  const rows = await template.query(scopeCtx, client);
  return { rows, rowCount: rows.length, columns: template.columns };
}
