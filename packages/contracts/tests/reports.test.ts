// Reports & Exports library contracts — Story 10.7 (Task 4).
//
// TWO jobs: (1) the test-only sync-guard binding the contract enums to the @twt/domain source tuples
// (contracts cannot import domain in SHIPPED files — the RN bundle boundary — so this test, which never
// ships, is the mechanical drift guard, per [[project_contracts_domain_bundle_boundary]]); (2) the
// `.strict()` behaviour + snake_case wire shape of the DTOs (a live wire-shape drift must fail).

import { reports } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  ReportExportStatus,
  ReportFailureReason,
  ReportFormat,
  ReportRequest,
  ReportRequestResponse,
  ReportStatusResponse,
} from '../src/reports/index.js';

describe('reports contract ↔ domain sync-guard', () => {
  it('ReportExportStatus matches the domain REPORT_EXPORT_STATUSES tuple', () => {
    expect([...ReportExportStatus.options]).toEqual([...reports.REPORT_EXPORT_STATUSES]);
  });

  it('ReportFormat matches the domain REPORT_FORMATS tuple', () => {
    expect([...ReportFormat.options]).toEqual([...reports.REPORT_FORMATS]);
  });

  it('ReportFailureReason matches the domain REPORT_FAILURE_REASONS tuple', () => {
    expect([...ReportFailureReason.options]).toEqual([...reports.REPORT_FAILURE_REASONS]);
  });
});

describe('reports DTO strictness + wire shape', () => {
  it('ReportRequest accepts a valid snake_case body (params optional)', () => {
    const parsed = ReportRequest.parse({ report_type: 'member_roster', format: 'csv' });
    expect(parsed.report_type).toBe('member_roster');
    expect(parsed.format).toBe('csv');
  });

  it('ReportRequest rejects an unknown field (.strict)', () => {
    expect(() =>
      ReportRequest.parse({ report_type: 'member_roster', format: 'csv', extra: 1 }),
    ).toThrow();
  });

  it('ReportRequest rejects an out-of-set format', () => {
    expect(() => ReportRequest.parse({ report_type: 'x', format: 'pdf' })).toThrow();
  });

  it('ReportRequestResponse round-trips the handle + status', () => {
    const v = { report_export_id: 'e1', status: 'pending' as const };
    expect(ReportRequestResponse.parse(v)).toEqual(v);
  });

  it('ReportStatusResponse round-trips full metadata; NO artifact field crosses the contract', () => {
    const v = {
      report_export_id: 'e1',
      status: 'ready' as const,
      report_type: 'member_roster',
      format: 'json' as const,
      requested_at: '2026-07-31T00:00:00.000Z',
      ready_at: '2026-07-31T00:01:00.000Z',
      expires_at: '2026-08-01T00:01:00.000Z',
      row_count: 42,
    };
    expect(ReportStatusResponse.parse(v)).toEqual(v);
    // The R1 rule: an artifact field must be rejected by .strict().
    expect(() => ReportStatusResponse.parse({ ...v, artifact_ciphertext: 'nope' })).toThrow();
  });

  it('ReportStatusResponse accepts a bounded NON-PII failure code only', () => {
    const base = {
      report_export_id: 'e1',
      status: 'failed' as const,
      report_type: 'member_roster',
      format: 'csv' as const,
      requested_at: '2026-07-31T00:00:00.000Z',
    };
    expect(ReportStatusResponse.parse({ ...base, failed_reason: 'assemble_error' }).failed_reason).toBe(
      'assemble_error',
    );
    expect(() =>
      ReportStatusResponse.parse({ ...base, failed_reason: 'stack trace with a member mobile' }),
    ).toThrow();
  });
});
