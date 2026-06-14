// The trustee-facing "Verify audit-log integrity" page (Story 1.11b — the [SURFACE]).
//
// Assembles the surface (AC-2/AC-3/AC-4/AC-5): the last-automated-check card, the
// green/red status banner (with the four AC-4 failure fields + acknowledge), the
// "Run verification now" action (POST the 1.11a endpoint, progress indicator,
// verdict in ≤~10s), and the history of the last 30 checks. All server state comes
// from cache-disabled TanStack Query reads (§4.5); run-now + acknowledge are
// pessimistic mutations that invalidate the history so the banner re-derives.

import type { AuditIntegrityCheckListItem } from '@twt/contracts';
import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useIntegrityChecks, useRunVerification, useAcknowledge } from '../../api/hooks.js';
import { deriveIntegrityView } from './derive.js';
import { HistoryTable } from './HistoryTable.js';
import { StatusBanner } from './StatusBanner.js';

function LastAutomatedCard({
  check,
}: {
  check: AuditIntegrityCheckListItem | null;
}): ReactElement {
  return (
    <section
      className="rounded border p-4"
      aria-live="polite"
      aria-label="Last automated check"
      data-testid="last-automated"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
        Last automated check
      </h2>
      {check ? (
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="opacity-60">Timestamp</dt>
            <dd>
              <time dateTime={check.verifiedAt}>{check.verifiedAt}</time>
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Range (seq)</dt>
            <dd className="font-mono">
              {check.startSeq ?? '—'} … {check.endSeq ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="opacity-60">Result</dt>
            <dd>{check.chainValid ? '✓ valid' : '✗ broken'}</dd>
          </div>
          <div>
            <dt className="opacity-60">Verifier</dt>
            <dd className="font-mono break-all">{check.verifierActor}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-sm opacity-70">No automated check has run yet.</p>
      )}
    </section>
  );
}

export function IntegrityPage(): ReactElement {
  const checksQuery = useIntegrityChecks();
  const runVerification = useRunVerification();
  const acknowledge = useAcknowledge();

  if (checksQuery.isLoading) {
    return <p role="status">Loading integrity history…</p>;
  }
  if (checksQuery.isError) {
    return (
      <p role="alert" className="text-status-fail-fg">
        Could not load integrity history: {(checksQuery.error as Error).message}
      </p>
    );
  }

  const checks = checksQuery.data ?? [];
  const view = deriveIntegrityView(checks);

  const onAcknowledge = (ticketRef: string): void => {
    if (!view.latest) return;
    acknowledge.mutate({ checkId: view.latest.checkId, ticketRef });
  };

  const ackError =
    acknowledge.error instanceof ApiError ? acknowledge.error.message : undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Verify audit-log integrity</h1>
        <button
          type="button"
          onClick={() => runVerification.mutate()}
          disabled={runVerification.isPending}
          aria-busy={runVerification.isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          data-testid="run-now"
        >
          {runVerification.isPending ? 'Verifying…' : 'Run verification now'}
        </button>
      </header>

      {runVerification.isPending && (
        <p role="status" aria-live="polite" data-testid="run-progress">
          Walking the audit hash chain…
        </p>
      )}
      {runVerification.isError && (
        <p role="alert" className="text-status-fail-fg">
          Verification request failed: {(runVerification.error as Error).message}
        </p>
      )}

      <StatusBanner
        view={view}
        onAcknowledge={onAcknowledge}
        acknowledgePending={acknowledge.isPending}
        acknowledgeError={ackError}
      />

      <LastAutomatedCard check={view.lastAutomated} />

      <section aria-label="Check history">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          History (last 30 checks)
        </h2>
        <HistoryTable checks={checks} />
      </section>
    </div>
  );
}
