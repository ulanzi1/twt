// Reports v1 seed templates — the masking invariant + per-template RBAC + toCsv reuse (Story 10.7, AC4/AC6).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isCatalogKey } from '../../src/rbac/permissions.js';
import {
  DEFAULT_REPORT_TEMPLATES,
  serializeReport,
  type ReportTemplate,
} from '../../src/reports/index.js';

describe('v1 seed templates — the masking invariant (Decision 2, AC4)', () => {
  it('NO seeded template projects a Tier-1 column as plaintext (every column is Tier-2 or Tier-3)', () => {
    for (const t of DEFAULT_REPORT_TEMPLATES) {
      for (const col of t.columns) {
        expect(col.piiTier, `${t.reportType}.${col.key} must not be Tier-1`).not.toBe(1);
      }
    }
  });

  it('the decrypt-if-permitted seam resolves false/absent in v1 (no column requests decryption)', () => {
    for (const t of DEFAULT_REPORT_TEMPLATES) {
      for (const col of t.columns) {
        expect(col.decryptIfPermitted ?? false).toBe(false);
      }
    }
  });
});

describe('v1 seed templates — per-template RBAC (Decision 6, AC1)', () => {
  it('every template declares a permissionKey that is a real catalog key + a scopeDimension', () => {
    for (const t of DEFAULT_REPORT_TEMPLATES) {
      expect(isCatalogKey(t.permissionKey), `${t.reportType} key ${t.permissionKey}`).toBe(true);
      expect(t.scopeDimension).toBeTruthy();
    }
  });

  it('the three templates use THREE distinct authorities (one new mint + two reuses)', () => {
    const byType = new Map(DEFAULT_REPORT_TEMPLATES.map((t) => [t.reportType, t.permissionKey]));
    expect(byType.get('member_roster')).toBe('member.export_roster'); // NEW (Decision 6 mint)
    expect(byType.get('contribution_rate_by_district')).toBe('reconciliation.review'); // REUSE
    expect(byType.get('audit_log_query')).toBe('audit.export'); // REUSE (Auditor)
  });
});

describe('serializeReport — reuses 10.6 toCsv (AC4/AC6)', () => {
  const rosterTemplate = DEFAULT_REPORT_TEMPLATES.find(
    (t) => t.reportType === 'member_roster',
  ) as ReportTemplate;

  it('CSV output is formula-injection-safe (proves the reused toCsv neutralization path)', () => {
    // A malicious district value beginning with `=` must be neutralized (leading `'`), not emitted raw.
    const rows = [{ member_id: 'm1', state: 'active', district: '=SUM(A1:A9)', aadhaar_masked_id: 'xxxx1234' }];
    const csv = serializeReport(rosterTemplate, rows, 'csv');
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).not.toMatch(/,=SUM/); // never an unescaped leading `=`
  });

  it('JSON output is canonical + carries the column declaration + row count', () => {
    const rows = [{ member_id: 'm1', state: 'active', district: 'Patna', aadhaar_masked_id: null }];
    const json = JSON.parse(serializeReport(rosterTemplate, rows, 'json')) as {
      report_type: string;
      row_count: number;
      columns: { key: string }[];
    };
    expect(json.report_type).toBe('member_roster');
    expect(json.row_count).toBe(1);
    expect(json.columns.map((c) => c.key)).toContain('aadhaar_masked_id');
  });

  it('serialize.ts imports toCsv from bulk-operations (not a second CSV serializer)', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/reports/serialize.ts', import.meta.url)),
      'utf8',
    );
    expect(source).toMatch(/from '\.\.\/bulk-operations\/csv\.js'/);
    expect(source).toMatch(/\btoCsv\b/);
  });
});
