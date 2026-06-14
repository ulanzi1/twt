// History table of the last 30 integrity checks (Story 1.11b, AC-2 / Task 7.2).
//
// Not virtualized: 30 rows comfortably fit the viewport (§4.6 calls for
// virtualization only when a list can exceed the viewport — TanStack Virtual /
// react-virtuoso graduate if the limit grows). The table is keyboard-reachable and
// has a caption for screen readers.

import type { AuditIntegrityCheckList } from '@twt/contracts';
import type { ReactElement } from 'react';

function range(startSeq: number | null, endSeq: number | null): string {
  if (startSeq === null && endSeq === null) return '— (empty chain)';
  return `${startSeq ?? '—'} … ${endSeq ?? '—'}`;
}

export function HistoryTable({ checks }: { checks: AuditIntegrityCheckList }): ReactElement {
  if (checks.length === 0) {
    return <p className="text-sm opacity-70">No checks recorded yet.</p>;
  }
  return (
    <table className="w-full border-collapse text-left text-sm" data-testid="history-table">
      <caption className="sr-only">History of the last 30 audit-integrity checks</caption>
      <thead>
        <tr className="border-b">
          <th scope="col" className="py-1 pr-3">Verified at</th>
          <th scope="col" className="py-1 pr-3">Result</th>
          <th scope="col" className="py-1 pr-3">Range (seq)</th>
          <th scope="col" className="py-1 pr-3">Rows</th>
          <th scope="col" className="py-1 pr-3">Trigger</th>
          <th scope="col" className="py-1 pr-3">Verifier</th>
          <th scope="col" className="py-1 pr-3">Acknowledged</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c) => (
          <tr key={c.checkId} className="border-b border-black/5" data-testid="history-row">
            <td className="py-1 pr-3">
              <time dateTime={c.verifiedAt}>{c.verifiedAt}</time>
            </td>
            <td className="py-1 pr-3">
              {c.chainValid ? (
                <span className="text-status-ok-fg">✓ valid</span>
              ) : (
                <span className="font-semibold text-status-fail-fg">✗ broken</span>
              )}
            </td>
            <td className="py-1 pr-3 font-mono">{range(c.startSeq, c.endSeq)}</td>
            <td className="py-1 pr-3">{c.rowsVerified}</td>
            <td className="py-1 pr-3">{c.triggerSource}</td>
            <td className="py-1 pr-3 font-mono break-all">{c.verifierActor}</td>
            <td className="py-1 pr-3">
              {c.acknowledgement ? (
                <span title={c.acknowledgement.ticketRef}>✓ {c.acknowledgement.ticketRef}</span>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
