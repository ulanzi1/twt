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

import { NomineeNameCheckDisclosure } from '../claim-verification/NomineeNameCheckDisclosure.js';
import { nameDifferenceReasonLabel, verifierConsoleEn } from '../claim-verification/i18n-en.js';

type PendingCase = CycleFreezePendingResponse['ready_to_freeze'][number];
type Bucket = 'ready_to_freeze' | 'escalated' | 'voted_pending_commit';

export interface PendingCaseCardProps {
  case_: PendingCase;
  bucket: Bucket;
  /** Needed for the on-demand names disclosure (D3) — the read is per-claim and tenant-scoped. */
  pariwarId: string;
  onDecision: (body: CycleFreezeDecisionRequest) => void;
  pending: boolean;
  error?: string | undefined;
}

/** The reason codes valid for an outcome (drives the dropdown; from the contract compat map). */
function reasonCodesFor(outcome: 'denied' | 'routed_to_r9' | 'returned_for_correction'): string[] {
  return Object.entries(TRUSTEE_REASON_CODE_OUTCOME_COMPAT)
    .filter(([, outcomes]) => (outcomes as readonly string[]).includes(outcome))
    .map(([code]) => code);
}

/**
 * How each outcome is NAMED in a validation message — the words the Pariwar Admin reads.
 * ⚠ A `Partial` on purpose: an unlisted outcome falls back to its own code rather than being
 * mislabelled as a different action.
 */
const ACTION_LABEL: Partial<Record<StateTrusteeDecisionOutcome, string>> = {
  denied: 'Deny',
  routed_to_r9: 'Route to R9',
  returned_for_correction: 'Return to District Admin',
};

/** Is the currently-selected reason code valid for `outcome`? An absent selection defers to the server's
 *  required-per-outcome check (deny/route require one; that 400 is expected + surfaced via `error`). */
function reasonCodeValidFor(reasonCode: string, outcome: StateTrusteeDecisionOutcome): boolean {
  if (reasonCode === '') return true;
  const compat = TRUSTEE_REASON_CODE_OUTCOME_COMPAT[reasonCode as keyof typeof TRUSTEE_REASON_CODE_OUTCOME_COMPAT] as
    | readonly string[]
    | undefined;
  return compat?.includes(outcome) ?? false;
}

export function PendingCaseCard({
  case_,
  bucket,
  pariwarId,
  onDecision,
  pending,
  error,
}: PendingCaseCardProps): ReactElement {
  const [reasonCode, setReasonCode] = useState<string>('');
  const [rationale, setRationale] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  const denyOptions = reasonCodesFor('denied');
  const routeOptions = reasonCodesFor('routed_to_r9');
  // Story 6.18 (AC11) — a RETURN takes exactly one code, `other`, because `-227` cl.10 asks for a
  // NOTE explaining the discrepancy rather than a category. Selecting `other` makes the rationale
  // mandatory at the contract boundary, which is how the note is actually enforced.
  const returnOptions = reasonCodesFor('returned_for_correction');

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

    // ⭐⭐ A RETURN NEEDS A CODE **AND** A NOTE, CHECKED HERE (code review 2026-09-20).
    // `reasonCodeValidFor('')` returns `true` — an absent selection deliberately defers to the
    // server — so a bare click on "Return to District Admin" posted with NO code and NO note and
    // relied on a 400 coming back. `-227` cl.10's note is the ONLY thing that tells the District
    // Admin what to get corrected, and with ⛔ no event minted for a return, that note plus the
    // audit line IS the trail. Asking for it before the round trip is the least we can do.
    if (outcome === 'returned_for_correction') {
      if (reasonCode === '') {
        setValidationError(
          'Choose the reason code "other" and write a note saying what needs correcting — the District Admin has nothing else to go on.',
        );
        return;
      }
      if (rationale.trim() === '') {
        setValidationError(
          'Write a note saying what needs correcting. It is the only thing the District Admin will see — the claim is not denied, it goes back to be fixed.',
        );
        return;
      }
    }

    if (!reasonCodeValidFor(reasonCode, outcome)) {
      // ⚠ NAME THE ACTUAL ACTION. This was a two-way ternary that called a RETURN a "Route to R9".
      setValidationError(
        `"${reasonCode}" isn't a valid reason code for ${ACTION_LABEL[outcome] ?? outcome} — choose a matching code, or clear the selection.`,
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
        {/* Story 6.18 (AC11) — the claim is UNDER CORRECTION: this Pariwar Admin (or another) sent
            it back to the District Admin and it has not been resubmitted. ⛔ NOT a denial — the
            wording must never read as one. */}
        {case_.under_correction && (
          <span
            data-testid="under-correction-badge"
            className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
          >
            returned for correction
          </span>
        )}
        {/* Story 6.18 (AC8) — `-226` cl.5's highlight. It comes from the District Admin's RECORDED
            judgement, ⛔ never a computer comparison, and shows the reason CODE, ⛔ never a name. */}
        {case_.name_difference_reasons.length > 0 && (
          <span
            data-testid="name-difference-badge"
            className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
          >
            {/* ⚠ LABELS, ⛔ NOT RAW CODES. This printed `bank_shortened_name` at a Pariwar Admin,
                while the District Admin's own panel printed "The bank's shortened name" for the
                same fact — two surfaces disagreeing about one ruling's vocabulary. */}
            {/* ⭐ The SHARED table (code review 2026-09-23) — a hand-copied one here had already
                drifted from the District Admin's and R9's in case. */}
            {verifierConsoleEn.nameCheck.approvedWithDifference}:{' '}
            {case_.name_difference_reasons.map(nameDifferenceReasonLabel).join(', ')}
          </span>
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
          <span className="opacity-70">Reason code (required for deny / route / return)</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={reasonCode}
            onChange={(e) => {
              setReasonCode(e.target.value);
              setValidationError(undefined);
            }}
          >
            <option value="">— none —</option>
            {[...new Set([...denyOptions, ...routeOptions, ...returnOptions])].map((code) => (
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
        {/* Story 6.18 (AC11), `-227` cl.10 — send the claim BACK to the District Admin with a note.
            ⛔ NOT a denial: the claim keeps its state, no appeal flow starts, and the label says
            "return", never "reject".
            ⚠⚠ ⛔ NOT OFFERED IN `voted_pending_commit`, AND THE STORY REVERSED ITSELF TO GET HERE
            (code review 2026-09-20, D1 = option A). The pre-commit window looked like one the
            Pariwar Admin could still act in — but a return written at `state_trustee_approved` could
            never be CLEARED: the only code that supersedes a return row is inside
            `voteOnFrozenClaim`, which refuses that state, and the District Admin cannot record the
            fresh check there either. The claim would be stuck forever. `TRUSTEE_RETURNABLE_STATES`
            now excludes it, so offering the button here would be offering a guaranteed 409. */}
        {bucket !== 'voted_pending_commit' && !case_.under_correction && (
          <button
            type="button"
            data-testid="return-to-district-admin"
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={pending}
            onClick={() => submit({ action: 'return_to_district_admin' }, 'returned_for_correction')}
          >
            Return to District Admin
          </button>
        )}
      </div>

      {/* ⭐⭐ D3 — THE PARIWAR ADMIN SEES THE TWO NAMES (code review 2026-09-20). This card had only
          badges: the surface that casts the FINAL approval, and the one that decides whether to
          RETURN a claim over a name, could not see the names it was deciding about. D3 says in as
          many words *"The Pariwar Admin sees both names, the DA's reason and the filer's note, then
          approves or returns"* — and the component that does exactly that already existed, used by
          the District Admin's console and the R9 panel but not here.
          ⛔ ON DEMAND: the read decrypts a living nominee's Tier-1 name and writes an audit line, so
          it fires only when somebody presses the button. ⛔ `canCheck` is false — recording the
          verdict is the District Admin's, `-226` cl.3. */}
      <NomineeNameCheckDisclosure
        pariwarId={pariwarId}
        claimCaseId={case_.claim_case_id}
        testId={`pending-case-name-check-${case_.claim_case_id}`}
      />

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
