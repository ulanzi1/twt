// Reports & Exports library console (Story 10.7, Task 7) — the pariwar-scoped admin surface.
//
// MINIMAL by design (the 10.3/10.4/10.5 console precedent): a "request a report" form (pick report_type
// + format), the requestor's export list with poll-status, and a one-time download affordance. No
// dashboards, no saved reports, no scheduling (FR-58A ad-hoc + pre-built templates only). `pariwarId` is
// a prop (from the route) so the page is testable without a router.
//
// The real security boundary is the server: [adminSession, scope] + the per-template RBAC check inside
// the handler (Decision 6). A report the actor may not run returns 403; the form surfaces it as an error.

import type { ReportRequest, ReportStatusResponse } from '@twt/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { downloadReport, getReportStatus, listReports, requestReport } from '../../api/client.js';

/** The v1 seed templates (mirrors the domain registry — the ~10 FR-58A reports register in follow-ups). */
const REPORT_TYPES: readonly { value: string; label: string }[] = [
  { value: 'member_roster', label: 'Member roster (Tier-3 + masked)' },
  { value: 'contribution_rate_by_district', label: 'Contribution rate by district' },
  { value: 'audit_log_query', label: 'Audit-log query (Auditor)' },
];

const FORMATS: readonly ReportRequest['format'][] = ['csv', 'json'];

interface RequestedExport {
  reportExportId: string;
  reportType: string;
  format: string;
}

export function ReportsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]!.value);
  const [format, setFormat] = useState<ReportRequest['format']>('csv');
  const [requested, setRequested] = useState<RequestedExport[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Seed the list from the server on mount (review finding: a page refresh previously lost all
  // knowledge of in-flight/ready exports — `requested` was pure client-side session state).
  const history = useQuery({
    queryKey: ['report-exports', pariwarId],
    queryFn: () => listReports(pariwarId),
  });
  useEffect(() => {
    if (!history.data) return;
    const serverList: RequestedExport[] = history.data.exports.map((e) => ({
      reportExportId: e.report_export_id,
      reportType: e.report_type,
      format: e.format,
    }));
    setRequested((prev) => {
      // Keep any export the mutation just created but the (not-yet-refetched) list doesn't know about
      // yet, ahead of the server's newest-first list.
      const serverIds = new Set(serverList.map((r) => r.reportExportId));
      const localOnly = prev.filter((r) => !serverIds.has(r.reportExportId));
      return [...localOnly, ...serverList];
    });
    // Merge is one-directional (server → local) and only needs to run when a fresh list lands.
  }, [history.data]);

  const request = useMutation({
    mutationFn: () => requestReport(pariwarId, { report_type: reportType, format }),
    onSuccess: (res) => {
      setError(null);
      setRequested((prev) =>
        prev.some((r) => r.reportExportId === res.report_export_id)
          ? prev
          : [{ reportExportId: res.report_export_id, reportType, format }, ...prev],
      );
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'Request failed'),
  });

  return (
    <section aria-labelledby="reports-heading">
      <h1 id="reports-heading">Reports &amp; Exports</h1>
      <p>
        Request a standard report. It is generated asynchronously, scope-respecting and PII-masked, and
        available as a one-time download for 24 hours once ready.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          request.mutate();
        }}
      >
        <label>
          Report
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          Format
          <select value={format} onChange={(e) => setFormat(e.target.value as ReportRequest['format'])}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>{' '}
        <button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Requesting…' : 'Request report'}
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      ) : null}

      <h2>Your report exports</h2>
      {requested.length === 0 ? (
        <p>No reports requested yet.</p>
      ) : (
        <ul>
          {requested.map((r) => (
            <ReportExportRow key={r.reportExportId} pariwarId={pariwarId} exportRef={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** One requested export — polls its status until terminal, then offers the one-time download. */
function ReportExportRow({
  pariwarId,
  exportRef,
}: {
  pariwarId: string;
  exportRef: RequestedExport;
}): ReactElement {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const status = useQuery<ReportStatusResponse>({
    queryKey: ['report-export', pariwarId, exportRef.reportExportId],
    queryFn: () => getReportStatus(pariwarId, exportRef.reportExportId),
    // Poll while the build is in flight; stop once terminal. A poll ERROR must keep retrying (slower)
    // rather than silently going quiet forever (review finding: reading `query.state.data?.status` alone
    // treated "no data because the last poll errored" the same as "terminal", stopping with no visible
    // signal to the operator).
    refetchInterval: (query) => {
      if (query.state.data) return query.state.data.status === 'pending' ? 2000 : false;
      return query.state.status === 'error' ? 5000 : 2000;
    },
  });

  const s = status.data?.status;

  async function onDownload(): Promise<void> {
    try {
      const { blob, filename } = await downloadReport(pariwarId, exportRef.reportExportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Defer revocation (review finding): some browsers dispatch the download asynchronously, so
      // revoking the blob URL in the same tick as click() can abort or empty a larger download. The
      // server-side one-time consume means a failed save is unrecoverable, so give the browser time to
      // start the transfer before releasing the URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setDownloaded(true);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <li>
      <code>{exportRef.reportType}</code> ({exportRef.format.toUpperCase()}) — status:{' '}
      <strong>{s ?? (status.isLoading ? 'loading…' : status.isError ? 'error checking status' : '—')}</strong>
      {status.isError && !s ? (
        <span role="alert" style={{ color: 'crimson' }}>
          {' '}
          (retrying…)
        </span>
      ) : null}
      {typeof status.data?.row_count === 'number' ? ` · ${String(status.data.row_count)} rows` : ''}
      {s === 'ready' && !downloaded ? (
        <>
          {' '}
          <button type="button" onClick={() => void onDownload()}>
            Download
          </button>
        </>
      ) : null}
      {downloaded ? ' · downloaded (one-time — link now consumed)' : ''}
      {s === 'failed' ? ` · ${status.data?.failed_reason ?? 'failed'}` : ''}
      {downloadError ? (
        <span role="alert" style={{ color: 'crimson' }}>
          {' '}
          {downloadError}
        </span>
      ) : null}
    </li>
  );
}
