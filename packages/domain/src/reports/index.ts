// Reports & Exports library — the admin/trustee report-template registry + scope-respecting, PII-masked
// assembly core (Story 10.7). The [SURFACE] that clones 3.11's async-export machinery for an ADMIN
// audience: scope-as-predicate (Decision 3), mask-by-default (Decision 2), per-template RBAC (Decision
// 6), Open/Closed harness (inherited 10.6 Decision 5). See ./types.ts for the `ReportTemplate` contract.

export * from './types.js';
export * from './errors.js';
export * from './registry.js';
export * from './scope.js';
export * from './assemble.js';
export * from './serialize.js';
export * from './store.js';
export * from './templates/index.js';

import { createReportRegistry, type ReportRegistry } from './registry.js';
import { DEFAULT_REPORT_TEMPLATES } from './templates/index.js';

/** The default reports library registry, seeded with the v1 template set (AC1). */
export function createDefaultReportRegistry(): ReportRegistry {
  return createReportRegistry(DEFAULT_REPORT_TEMPLATES);
}
