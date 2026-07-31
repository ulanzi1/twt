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
  const check = checkPermission({
    actorId: scopeCtx.actorId,
    grants: scopeCtx.grants,
    key: template.permissionKey,
    resource: {
      dimension: scopeCtx.resolvedScope.dimension,
      value: scopeCtx.resolvedScope.value,
      pariwarId: scopeCtx.pariwarId,
    },
  });
  if (!check.ok) {
    // Fail-closed — surface the structured denial (the app maps it to 403).
    throw check.error;
  }

  // Scope-respecting fetch (Decision 3): the template pushes the resolved scope into its SQL.
  const rows = await template.query(scopeCtx, client);
  return { rows, rowCount: rows.length, columns: template.columns };
}
