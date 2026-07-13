// One pending-case card — Story 6.13 (Task 7, AC1). The per-case provenance row + its decision controls.
//
// Follows the claim-verification module patterns (VerificationDecisionStrip / ReasonCodeDropdown). A
// [SURFACE] demoable — minimal, no gold-plating. Three shapes by bucket:
//   · ready_to_freeze      → Approve / Deny / Route-to-R9 (the frozen vote + the durable R9 exclusion).
//   · escalated            → Resolve → Approve / Resolve → Deny (the AC4b escalation resolution).
//   · voted_pending_commit → Route-to-R9 only (the claim already carries a live vote; `approve`/`deny` are
//     no longer legal from `state_trustee_approved` — routing is the one remaining pre-commit action).
// Deny + Route-to-R9 require a trustee reason code (+ a rationale on Deny / "other"), enforced client-side
// AND server-side (the contract superRefine + the domain write-path — defense in depth). The reason-code
// select is shared across Deny/Route (one input, two possible targets), so submission validates the
// selected code against the SPECIFIC action being submitted rather than relying on the merged option list
// alone — a code picked for one action but left selected when a different button is clicked is caught here
// instead of round-tripping to a confusing 400.

import { TRUSTEE_REASON_CODE_OUTCOME_COMPAT } from '@twt/contracts';
import type {
  CycleFreezeDecisionRequest,
  CycleFreezePendingResponse,
  StateTrusteeDecisionOutcome,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];
type Bucket = 'ready_to_freeze' | 'escalated' | 'voted_pending_commit';

export interface PendingCaseCardProps {
  case_: PendingCase;
  bucket: Bucket;
  onDecision: (body: CycleFreezeDecisionRequest) => void;
  pending: boolean;
  error?: string | undefined;
}

/** The reason codes valid for an outcome (drives the dropdown; from the contract compat map). */
function reasonCodesFor(outcome: 'denied' | 'routed_to_r9'): string[] {
  return Object.entries(TRUSTEE_REASON_CODE_OUTCOME_COMPAT)
    .filter(([, outcomes]) => (outcomes as readonly string[]).includes(outcome))
    .map(([code]) => code);
}

/** Is the currently-selected reason code valid for `outcome`? An absent selection defers to the server's
 *  required-per-outcome check (deny/route require one; that 400 is expected + surfaced via `error`). */
function reasonCodeValidFor(reasonCode: string, outcome: StateTrusteeDecisionOutcome): boolean {
  if (reasonCode === '') return true;
  const compat = TRUSTEE_REASON_CODE_OUTCOME_COMPAT[reasonCode as keyof typeof TRUSTEE_REASON_CODE_OUTCOME_COMPAT] as
    | readonly string[]
    | undefined;
  return compat?.includes(outcome) ?? false;
}

export function PendingCaseCard({ case_, bucket, onDecision, pending, error }: PendingCaseCardProps): ReactElement {
  const [reasonCode, setReasonCode] = useState<string>('');
  const [rationale, setRationale] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  const denyOptions = reasonCodesFor('denied');
  const routeOptions = reasonCodesFor('routed_to_r9');

  const submit = (
    partial: Pick<CycleFreezeDecisionRequest, 'action' | 'escalation_outcome'>,
    outcome: StateTrusteeDecisionOutcome,
  ): void => {
    setValidationError(undefined);

    if (outcome === 'approved') {
      // Approve takes no reason code/rationale — clear any leftover selection from a different action
      // before submitting, so it can never leak into an approve decision.
      onDecision({ claim_case_id: case_.claim_case_id, ...partial });
      setReasonCode('');
      setRationale('');
      return;
    }

    if (!reasonCodeValidFor(reasonCode, outcome)) {
      setValidationError(
        `"${reasonCode}" isn't a valid reason code for ${outcome === 'denied' ? 'Deny' : 'Route to R9'} — choose a matching code, or clear the selection.`,
      );
      return;
    }

    const body: CycleFreezeDecisionRequest = {
      claim_case_id: case_.claim_case_id,
      ...partial,
      ...(reasonCode !== '' ? { reason_code: reasonCode as CycleFreezeDecisionRequest['reason_code'] } : {}),
      ...(rationale.trim() !== '' ? { rationale: rationale.trim() } : {}),
    };
    onDecision(body);
  };

  return (
    <li className="rounded border p-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <code className="font-mono text-xs opacity-80">{case_.claim_case_id}</code>
        <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{case_.current_state}</span>
        {case_.routed_to_r9 && (
          <span className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg">routed to R9</span>
        )}
        {case_.concealment_flags.map((f) => (
          <span key={f} className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg">
            {f}
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-xs opacity-80">
        <dt>Deceased</dt>
        <dd className="font-mono">{case_.deceased_member_id}</dd>
        <dt>Verifier</dt>
        <dd>
          {case_.verifier_actor_display ?? '—'}
          {case_.verifier_reason_code ? ` · ${case_.verifier_reason_code}` : ''}
        </dd>
        <dt>Verifier rationale</dt>
        <dd>{case_.verifier_rationale ? case_.verifier_rationale : '—'}</dd>
        <dt>Signals</dt>
        <dd>{case_.signals_summary}</dd>
      </dl>

      {/* Shared reason-code + rationale inputs — every bucket has at least one action that requires them
          (Deny/Route here; Route is also the sole action left once a claim reaches voted_pending_commit). */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex flex-col text-xs">
          <span className="opacity-70">Reason code (required for deny / route)</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={reasonCode}
            onChange={(e) => {
              setReasonCode(e.target.value);
              setValidationError(undefined);
            }}
          >
            <option value="">— none —</option>
            {[...new Set([...denyOptions, ...routeOptions])].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col text-xs">
          <span className="opacity-70">Rationale (required on deny / “other”)</span>
          <input
            className="rounded border px-2 py-1 text-sm"
            value={rationale}
            maxLength={500}
            onChange={(e) => setRationale(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {bucket === 'ready_to_freeze' && (
          <>
            <button
              type="button"
              className="rounded bg-status-ok-bg px-3 py-1 text-sm text-status-ok-fg disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'approve' }, 'approved')}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded bg-status-fail-bg px-3 py-1 text-sm text-status-fail-fg disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'deny' }, 'denied')}
            >
              Deny
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'route_to_r9' }, 'routed_to_r9')}
            >
              Route to R9
            </button>
          </>
        )}
        {bucket === 'escalated' && (
          <>
            <button
              type="button"
              className="rounded bg-status-ok-bg px-3 py-1 text-sm text-status-ok-fg disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'resolve_escalation', escalation_outcome: 'approved' }, 'approved')}
            >
              Resolve → Approve
            </button>
            <button
              type="button"
              className="rounded bg-status-fail-bg px-3 py-1 text-sm text-status-fail-fg disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'resolve_escalation', escalation_outcome: 'denied' }, 'denied')}
            >
              Resolve → Deny
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={pending}
              onClick={() => submit({ action: 'route_to_r9' }, 'routed_to_r9')}
            >
              Route to R9
            </button>
          </>
        )}
        {bucket === 'voted_pending_commit' && (
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={pending}
            onClick={() => submit({ action: 'route_to_r9' }, 'routed_to_r9')}
          >
            Route to R9
          </button>
        )}
      </div>

      {validationError && (
        <p role="alert" className="text-xs text-status-fail-fg">
          {validationError}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-status-fail-fg">
          {error}
        </p>
      )}
    </li>
  );
}
