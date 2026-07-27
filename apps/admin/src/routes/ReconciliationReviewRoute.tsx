// The /p/:pariwarId/reconciliation-review route — the trustee ADJUDICATION surface (Story 9.8, Task 7).
//
// Tenant-scoped, like the cycle-freeze / R9 surfaces. `reconciliation.review` is a PARIWAR-dimension grant,
// so the CLIENT gate is only "is there a live session"; the REAL boundary is the server chain
// [adminSession, scope, requirePermissionHook(reconciliation.review, pariwar), requireStepUp(...)]
// (fail-closed, audited). Each action rides the FixedAmountPage three-step step-up client loop (submit →
// 403 auth.step_up_required → requestStepUp(context) → verifyStepUp(otp) → re-submit).
//
// `ReconciliationReviewGateView` is a PURE presentational decision (no hooks/router) so the gate is
// unit-testable without a router context (the VerifierConsoleGateView precedent).
//
// i18n note: this Tier-2 staff surface ships English labels; the member-facing reject/reverse notification
// copy is bilingual (the member app's `contribution` namespace). The Hindi admin-chrome labels are a NAMED,
// TRACKED gap acceptable for this Tier-2 surface (AC7). WCAG-AA is targeted (labelled controls, roles).

import {
  isReconciliationRationaleRequired,
  reconciliationReasonCodesForOutcome,
  type ReconciliationCaseDetail,
  type ReconciliationReviewOutcome,
  type ReconciliationReviewReasonCode,
} from '@twt/contracts';
import { useParams } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';

import { ApiError, errorMessage } from '../api/client.js';
import {
  useReconciliationActions,
  useReconciliationCase,
  useReconciliationQueue,
  useRequestStepUp,
  useSession,
  useVerifyStepUp,
} from '../api/hooks.js';

/** English admin-chrome labels (the reason-code machine tokens rendered human-readable). */
const t = {
  title: 'Reconciliation review',
  subtitle: 'Open cases, most time-sensitive first',
  empty: 'No open reconciliation cases.',
  caseTypes: {
    mismatch: 'UTR mismatch',
    self_verify: 'Screenshot uploaded',
    manual_transcription: 'Statement transcription',
    takeover: 'Staff takeover',
  } as Record<string, string>,
  reasonLabels: {
    wrong_pool: 'Wrong pool',
    amount_mismatch: 'Amount mismatch',
    no_statement_entry: 'No statement entry',
    no_evidence: 'No evidence',
    screenshot_verified: 'Screenshot verified',
    statement_matched_manually: 'Statement matched (manual)',
    member_contacted: 'Member contacted',
    awaiting_correction: 'Awaiting correction',
    confirmed_in_error: 'Confirmed in error',
    duplicate: 'Duplicate',
    other: 'Other (rationale required)',
  } as Record<string, string>,
  actions: { confirm: 'Confirm', reject: 'Reject', recover: 'Facilitate recovery', reverse: 'Reverse' },
  unavailable: 'unavailable',
};

/** Pure gate: decide loading / redirecting / allowed from session state. */
export function ReconciliationReviewGateView({
  status,
  children,
}: {
  status: 'loading' | 'error' | 'success';
  children: ReactNode;
}): ReactElement {
  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'error') return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

/** A reconciliation reason-code dropdown offering only outcome-compatible codes (the single source of truth). */
function ReconReasonDropdown({
  outcome,
  value,
  onChange,
}: {
  outcome: ReconciliationReviewOutcome;
  value: ReconciliationReviewReasonCode | '';
  onChange: (code: ReconciliationReviewReasonCode | '') => void;
}): ReactElement {
  const options = reconciliationReasonCodesForOutcome(outcome);
  return (
    <select
      className="rounded border p-1 text-sm"
      value={value}
      aria-label="Reason code"
      data-testid="recon-reason-select"
      onChange={(e) => onChange(e.target.value as ReconciliationReviewReasonCode | '')}
    >
      <option value="">Select a reason…</option>
      {options.map((code) => (
        <option key={code} value={code} data-testid={`recon-reason-${code}`}>
          {t.reasonLabels[code] ?? code}
        </option>
      ))}
    </select>
  );
}

/** The four-action panel with the step-up client loop (submit → 403 → OTP → re-submit). */
function CaseActions({ pariwarId, detail }: { pariwarId: string; detail: ReconciliationCaseDetail }): ReactElement {
  const actions = useReconciliationActions(pariwarId);
  const requestStepUp = useRequestStepUp();
  const verifyStepUp = useVerifyStepUp();

  const [outcome, setOutcome] = useState<ReconciliationReviewOutcome>('confirm');
  const [reasonCode, setReasonCode] = useState<ReconciliationReviewReasonCode | ''>('');
  const [rationale, setRationale] = useState('');
  const [bankEntryId, setBankEntryId] = useState('');
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [errText, setErrText] = useState<string | undefined>(undefined);

  const stepUpContext = `reconciliation_review_${outcome}`;

  const submit = (): void => {
    setErrText(undefined);
    if (reasonCode === '') {
      setErrText('Select a reason code.');
      return;
    }
    if (isReconciliationRationaleRequired(outcome, reasonCode) && rationale.trim() === '') {
      setErrText('A rationale is required for this reason code / action.');
      return;
    }
    const caseKey = detail.case_key;
    const onError = (err: unknown): void => {
      if (err instanceof ApiError && err.code === 'auth.step_up_required') {
        setStepUpRequired(true);
        return;
      }
      setErrText(errorMessage(err));
    };
    const onSuccess = (): void => {
      setStepUpRequired(false);
      setOtp('');
      requestStepUp.reset();
    };
    if (outcome === 'confirm') {
      if (bankEntryId === '') {
        setErrText('Select the bank-statement entry this confirms.');
        return;
      }
      actions.confirm.mutate(
        { caseKey, body: { reason_code: reasonCode, bank_statement_entry_id: bankEntryId, ...(rationale ? { rationale } : {}) } },
        { onSuccess, onError },
      );
    } else if (outcome === 'reject') {
      actions.reject.mutate({ caseKey, body: { reason_code: reasonCode, ...(rationale ? { rationale } : {}) } }, { onSuccess, onError });
    } else if (outcome === 'recover') {
      actions.recover.mutate({ caseKey, body: { reason_code: reasonCode, ...(rationale ? { rationale } : {}) } }, { onSuccess, onError });
    } else {
      if (detail.confirmed_event_id === null) {
        setErrText('This case has no live confirmation to reverse.');
        return;
      }
      actions.reverse.mutate(
        { caseKey, body: { reason_code: reasonCode, reversed_confirmed_event_id: detail.confirmed_event_id, ...(rationale ? { rationale } : {}) } },
        { onSuccess, onError },
      );
    }
  };

  const verify = (): void => {
    const code = otp.trim();
    if (code === '') return;
    verifyStepUp.mutate(code, {
      onSuccess: () => {
        setStepUpRequired(false);
        setOtp('');
        requestStepUp.reset();
        submit(); // re-submit now that the session is elevated for this action context
      },
      onError: (err) => setErrText(errorMessage(err)),
    });
  };

  return (
    <section aria-label="Actions" className="flex flex-col gap-2 border-t pt-3" data-testid="recon-actions">
      <div className="flex gap-2" role="tablist" aria-label="Action">
        {(['confirm', 'reject', 'recover', 'reverse'] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={outcome === o}
            className={`rounded border px-2 py-1 text-sm ${outcome === o ? 'bg-slate-200' : ''}`}
            data-testid={`recon-outcome-${o}`}
            onClick={() => {
              setOutcome(o);
              setReasonCode('');
              setStepUpRequired(false);
              setErrText(undefined);
            }}
          >
            {t.actions[o]}
          </button>
        ))}
      </div>

      <ReconReasonDropdown outcome={outcome} value={reasonCode} onChange={setReasonCode} />

      {outcome === 'confirm' ? (
        <label className="text-sm">
          Bank entry
          <select
            className="ml-2 rounded border p-1 text-sm"
            value={bankEntryId}
            aria-label="Bank statement entry"
            data-testid="recon-bank-entry-select"
            onChange={(e) => setBankEntryId(e.target.value)}
          >
            <option value="">Select the deposit…</option>
            {detail.bank_entries.map((e) => (
              <option key={e.entry_id} value={e.entry_id}>
                ₹{(e.amount_paise / 100).toFixed(2)} · {e.value_date ?? '—'} · {e.description ?? ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <textarea
        className="rounded border p-1 text-sm"
        placeholder="Rationale (required for Other / Reject / Reverse)"
        aria-label="Rationale"
        data-testid="recon-rationale"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
      />

      {stepUpRequired ? (
        <div className="flex items-center gap-2" data-testid="recon-stepup">
          <label className="text-sm">
            OTP
            <input
              className="ml-2 rounded border p-1 text-sm"
              value={otp}
              aria-label="Step-up OTP"
              data-testid="recon-otp"
              onChange={(e) => setOtp(e.target.value)}
            />
          </label>
          <button type="button" className="rounded border px-2 py-1 text-sm" data-testid="recon-verify" onClick={verify}>
            Verify & submit
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-sm"
            data-testid="recon-request-otp"
            onClick={() => requestStepUp.mutate(stepUpContext, { onError: (err) => setErrText(errorMessage(err)) })}
          >
            Send OTP
          </button>
        </div>
      ) : (
        <button type="button" className="self-start rounded bg-slate-800 px-3 py-1 text-sm text-white" data-testid="recon-submit" onClick={submit}>
          {t.actions[outcome]}
        </button>
      )}

      {errText ? (
        <p role="alert" className="text-sm text-red-700" data-testid="recon-action-error">
          {errText}
        </p>
      ) : null}
    </section>
  );
}

/** The case detail panel (AC2 fields). Missing/undecryptable optional data reads "unavailable", never blank. */
function CaseDetailPanel({ pariwarId, caseKey }: { pariwarId: string; caseKey: string }): ReactElement {
  const view = useReconciliationCase(pariwarId, caseKey);
  if (view.isLoading) return <p role="status">Loading case…</p>;
  if (view.isError) return <p role="alert">{errorMessage(view.error)}</p>;
  const d = view.data;
  if (!d) return <p role="status">No case.</p>;

  return (
    <div className="flex flex-col gap-2" data-testid="recon-case-detail">
      <h3 className="text-base font-semibold">{t.caseTypes[d.case_type] ?? d.case_type}</h3>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 text-sm">
        <dt>Member</dt>
        <dd>{d.member ? `${d.member.name ?? t.unavailable} · ${d.member.mobile ?? t.unavailable}` : t.unavailable}</dd>
        <dt>Status</dt>
        <dd data-testid="recon-case-status">{d.status}</dd>
        <dt>Attestation</dt>
        <dd>
          {d.attestation
            ? `UTR ${d.attestation.utr ?? t.unavailable} · expects ₹${d.attestation.expected_amount_inr ?? '—'}`
            : t.unavailable}
        </dd>
        <dt>Deadline</dt>
        <dd>{d.deadline_at ?? t.unavailable}</dd>
      </dl>

      <div>
        <h4 className="text-sm font-medium">Bank entries near the window</h4>
        {d.bank_entries.length === 0 ? (
          <p className="text-sm text-slate-500">{t.unavailable}</p>
        ) : (
          <ul className="text-sm" data-testid="recon-bank-entries">
            {d.bank_entries.map((e) => (
              <li key={e.entry_id}>
                ₹{(e.amount_paise / 100).toFixed(2)} · {e.value_date ?? '—'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {d.screenshot_url ? (
        <img src={d.screenshot_url} alt="Member payment screenshot" className="max-w-xs rounded border" data-testid="recon-screenshot" />
      ) : null}

      {/* Keyed on case_key: a stale bank-entry id / rationale / reason code selected for a PRIOR case must
          never survive a switch to a different case (React only resets local state on a key change). */}
      <CaseActions key={d.case_key} pariwarId={pariwarId} detail={d} />
    </div>
  );
}

/** The route: the deadline-ordered queue list + the selected case's detail panel. */
export function ReconciliationReviewRoute(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/reconciliation-review' });
  const session = useSession();
  const queue = useReconciliationQueue(pariwarId);
  const [selected, setSelected] = useState<string | null>(null);

  const status: 'loading' | 'error' | 'success' = session.isLoading
    ? 'loading'
    : session.isError
      ? 'error'
      : 'success';

  return (
    <ReconciliationReviewGateView status={status}>
      <main className="flex gap-6 p-4" aria-label={t.title}>
        <section className="w-96" aria-label="Queue">
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
          {queue.isLoading ? (
            <p role="status">Loading queue…</p>
          ) : queue.isError ? (
            <p role="alert">{errorMessage(queue.error)}</p>
          ) : queue.data && queue.data.rows.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1" data-testid="recon-queue">
              {queue.data.rows.map((r) => (
                <li key={r.case_key}>
                  <button
                    type="button"
                    className={`w-full rounded border p-2 text-left text-sm ${selected === r.case_key ? 'bg-slate-100' : ''}`}
                    data-testid={`recon-queue-row-${r.case_key}`}
                    onClick={() => setSelected(r.case_key)}
                  >
                    <span className="font-medium">{t.caseTypes[r.case_type] ?? r.case_type}</span>
                    {r.mismatch_reason ? <span className="text-slate-500"> · {t.reasonLabels[r.mismatch_reason] ?? r.mismatch_reason}</span> : null}
                    <br />
                    <span className="text-xs text-slate-500">deadline {r.deadline_at ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500" data-testid="recon-queue-empty">
              {t.empty}
            </p>
          )}
        </section>

        <section className="flex-1" aria-label="Case detail">
          {selected ? <CaseDetailPanel pariwarId={pariwarId} caseKey={selected} /> : <p className="text-sm text-slate-500">Select a case.</p>}
        </section>
      </main>
    </ReconciliationReviewGateView>
  );
}
