// Green/red integrity status banner (Story 1.11b, AC-2/AC-4/AC-5, §4.10).
//
// Accessibility (§4.10): the RED failure banner is `role="alert"` +
// `aria-live="assertive"` — a security-critical alert must interrupt the screen
// reader. The green/empty states use `aria-live="polite"`. All four AC-4 fields are
// rendered on a failure (failing row, prior-valid row, tamper-suspect window, and
// the cold-mirror last-good-state pointer — the hot-chain proxy, clearly labelled,
// with the deferred cold-mirror line per DD-4).

import type { AuditIntegrityAcknowledgement } from '@twt/contracts';
import type { ReactElement } from 'react';

import { AcknowledgeDialog } from './AcknowledgeDialog.js';
import type { FailureFields, IntegrityView } from './derive.js';

function Field({ label, value }: { label: string; value: string | number | null }): ReactElement {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="font-mono text-sm break-all">{value ?? '—'}</dd>
    </div>
  );
}

function FailureDetail({
  failure,
  acknowledgement,
}: {
  failure: FailureFields;
  acknowledgement: AuditIntegrityAcknowledgement | null;
}): ReactElement {
  return (
    <div className="mt-3">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Failing row ID (seq)"
          value={
            failure.failingAuditId
              ? `${failure.failingAuditId} (seq ${failure.failingSeq ?? '—'})`
              : null
          }
        />
        <Field
          label="Prior valid row ID (seq)"
          value={
            failure.priorValidAuditId
              ? `${failure.priorValidAuditId} (seq ${failure.priorValidSeq ?? '—'})`
              : null
          }
        />
        <Field
          label="Tamper-suspect window"
          value={`${failure.tamperWindowFrom ?? 'chain start'} → ${failure.tamperWindowTo}`}
        />
        <Field
          label="Last provably-good state (hot chain)"
          value={
            failure.lastProvablyGoodAuditId
              ? `${failure.lastProvablyGoodAuditId} (seq ${failure.lastProvablyGoodSeq ?? '—'})`
              : null
          }
        />
      </dl>
      <p className="mt-2 text-xs italic opacity-80">
        Cold-mirror cross-verification: deferred (D1-1.11a) — showing the hot
        chain&apos;s last provably-good state as the best available pointer.
      </p>
      {acknowledgement && (
        <p className="mt-2 text-sm" data-testid="acknowledged-note">
          Acknowledged — investigation ticket{' '}
          <span className="font-mono">{acknowledgement.ticketRef}</span>.
        </p>
      )}
    </div>
  );
}

export interface StatusBannerProps {
  view: IntegrityView;
  onAcknowledge: (ticketRef: string) => void;
  acknowledgePending: boolean;
  acknowledgeError?: string;
}

export function StatusBanner({
  view,
  onAcknowledge,
  acknowledgePending,
  acknowledgeError,
}: StatusBannerProps): ReactElement {
  if (view.banner === 'empty' || !view.latest) {
    return (
      <div
        className="rounded border border-status-muted-fg/20 bg-status-muted-bg p-4 text-status-muted-fg"
        aria-live="polite"
        data-testid="status-banner"
        data-status="empty"
      >
        No integrity checks have been recorded yet. Run a verification to establish a
        baseline.
      </div>
    );
  }

  if (view.banner === 'ok') {
    return (
      <div
        className="rounded border-l-4 border-status-ok-border bg-status-ok-bg p-4 text-status-ok-fg"
        aria-live="polite"
        role="status"
        data-testid="status-banner"
        data-status="ok"
      >
        <p className="font-semibold">✓ Audit chain verified — no tampering detected.</p>
        <p className="mt-1 text-sm">
          Last checked <time dateTime={view.latest.verifiedAt}>{view.latest.verifiedAt}</time>{' '}
          ({view.latest.rowsVerified} rows).
        </p>
      </div>
    );
  }

  // Failure (red). 'fail' = blocking/unacknowledged; 'fail-acknowledged' = muted.
  const acknowledged = view.banner === 'fail-acknowledged';
  return (
    <div
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-4 text-status-fail-fg"
      role="alert"
      aria-live="assertive"
      data-testid="status-banner"
      data-status={acknowledged ? 'fail-acknowledged' : 'fail'}
    >
      <p className="text-lg font-bold">
        ⚠ Audit-log integrity FAILURE — the hash chain did not verify.
      </p>
      {acknowledged ? (
        <p className="mt-1 text-sm">
          This failure has been acknowledged, but it remains on record. Review the
          details below.
        </p>
      ) : (
        <p className="mt-1 text-sm">
          This is a tamper signal. It will persist until acknowledged with an
          investigation ticket.
        </p>
      )}
      {view.failure && (
        <FailureDetail failure={view.failure} acknowledgement={view.latest.acknowledgement} />
      )}
      {!acknowledged && (
        <AcknowledgeDialog
          onAcknowledge={onAcknowledge}
          pending={acknowledgePending}
          errorMessage={acknowledgeError}
        />
      )}
    </div>
  );
}
