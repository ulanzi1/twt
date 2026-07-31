// Reports library — the report-template registry (Story 10.7, Task 2; AC1).
//
// Keyed by `reportType`. Unlike 10.6's bulk-operations registry (seeded EMPTY — bulk operations belong
// to their consuming surfaces), the reports registry SEEDS its v1 template set by default (AC1: the
// reports library ships WITH its standard templates). A caller may pass its own template array (the
// Open/Closed test drives the harness with divergent fixtures). Duplicate-registration fails loudly.

import { DuplicateReportTemplateError } from './errors.js';
import type { ReportTemplate } from './types.js';

export interface ReportRegistry {
  /** Register a template. Throws `DuplicateReportTemplateError` if its `reportType` already exists. */
  register<TRow>(template: ReportTemplate<TRow>): void;
  /** Resolve a template by `reportType`, or `undefined` when none is registered. */
  get<TRow = unknown>(reportType: string): ReportTemplate<TRow> | undefined;
  /** The registered report-type ids (for introspection / the admin console's picker). */
  reportTypes(): string[];
}

/**
 * Build a registry over an arbitrary template set. Each caller owns its own instance (no shared
 * process-wide singleton — the 10.6 per-composition-root-independence posture). Defaults to the v1
 * seed set (AC1); tests pass their own fixtures. Templates are stored type-erased (the 10.6 registry's
 * `as unknown as` posture — each template's own `TRow` is opaque to the harness).
 */
export function createReportRegistry(templates: readonly ReportTemplate<unknown>[]): ReportRegistry {
  const byType = new Map<string, ReportTemplate<unknown>>();

  function register<TRow>(template: ReportTemplate<TRow>): void {
    if (byType.has(template.reportType)) {
      throw new DuplicateReportTemplateError(template.reportType);
    }
    byType.set(template.reportType, template as unknown as ReportTemplate<unknown>);
  }

  for (const template of templates) register(template);

  return {
    register,
    get<TRow>(reportType: string): ReportTemplate<TRow> | undefined {
      return byType.get(reportType) as ReportTemplate<TRow> | undefined;
    },
    reportTypes: (): string[] => [...byType.keys()],
  };
}
