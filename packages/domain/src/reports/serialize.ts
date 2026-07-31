// Reports library — artifact serialization (Story 10.7, Task 2/5; AC4).
//
// The finished-rows → bytes step the build worker runs before envelope-encrypting. CSV REUSES 10.6's
// `toCsv` (`bulk-operations/csv.ts` — RFC-4180 + OWASP formula-injection neutralization; 10.6 built it
// content-only and deferred durable async download to THIS story). JSON is canonical serialization of
// the same rows. A second CSV serializer would be a review-blocking duplication — import, never re-implement.

import { toCsv } from '../bulk-operations/csv.js';
import { canonicalJsonStringify } from '../canonical-json.js';
import type { ReportFormat, ReportTemplate } from './types.js';

/**
 * Serialize assembled rows into the requested format's bytes (a UTF-8 string). CSV via the reused
 * `toCsv` over `template.csvRow`; JSON via canonical serialization of `template.jsonRow` + a NON-PII
 * envelope (report type, column declaration, row count). Both project through the template's row
 * mappers, so masking (Decision 2) is applied uniformly.
 */
export function serializeReport(
  template: ReportTemplate,
  rows: readonly unknown[],
  format: ReportFormat,
): string {
  if (format === 'csv') {
    return toCsv(rows.map((row) => template.csvRow(row)));
  }
  return canonicalJsonStringify({
    report_type: template.reportType,
    columns: template.columns.map((c) => ({ key: c.key, header: c.header })),
    row_count: rows.length,
    rows: rows.map((row) => template.jsonRow(row)),
  });
}
