// `<HelplineConsoleShell>` — the two-pane operator console (Story 6.3, Task 5; AC1/AC2/AC4/AC5, UX §11).
//
// Pure presentational (all state via props → unit-testable without hooks/router/query). Layout
// (UX §11): a sticky call-status header; a LEFT pane for member lookup (the page injects the
// shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>` via `lookupSlot` — search is
// NOT re-implemented); a RIGHT pane for read-back + intake.
//
// THE INTAKE GATE lives here, in ONE place (AC2): submit is enabled only once an identity
// read-back is confirmed (`identityConfirmed`). The nominee-summary read-back is advisory — its
// confirmation state is NEVER consulted for the gate. The AR-61 "Escalate to supervisor" control
// is present at every node; the "convert to member-app handover" affordance is a FLAGGED,
// NON-FUNCTIONAL seam (Decision #4 — no deep-link infra in 6.3). "Route for verification" is the
// primary post-intake action.

import type { ClaimantRelationship, MemberSearchResultItem } from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';

import { ReadBackCard, type ReadBackCardProps } from './ReadBackCard.js';
import { resolveEn } from './i18n-en.js';

type ReadBackScript = ReadBackCardProps['script'];

export interface HelplineIntakeResult {
  claimCaseId: string;
  state: string;
  created: boolean;
}

const RELATIONSHIPS: readonly ClaimantRelationship[] = ['spouse', 'child', 'parent', 'sibling', 'other'];

export interface HelplineConsoleShellProps {
  /** The lookup pane — the page injects the shipped `<MemberLookupForm>` + `<MemberSearchResults>`. */
  lookupSlot: ReactNode;
  selected: MemberSearchResultItem | null;
  identityScript: ReadBackScript;
  nomineeScript: ReadBackScript;
  // Read-back state (identity gates; nominee is advisory).
  identityConfirmed: boolean;
  onIdentityConfirmedChange: (v: boolean) => void;
  nomineeConfirmed: boolean;
  onNomineeConfirmedChange: (v: boolean) => void;
  identityCorrections: readonly string[];
  onAddIdentityCorrection: (note: string) => void;
  nomineeCorrections: readonly string[];
  onAddNomineeCorrection: (note: string) => void;
  // Relationship (recorded on the intake audit trail). `null` = no explicit operator choice yet
  // — the relationship select MUST default to an unselected placeholder, never a silent guess
  // (Review Finding — a forgotten dropdown must not submit an incorrect relationship).
  relationship: ClaimantRelationship | null;
  onRelationshipChange: (r: ClaimantRelationship | null) => void;
  // Submit + result.
  onSubmit: () => void;
  submitPending: boolean;
  submitError?: string;
  result: HelplineIntakeResult | null;
  // Step-up (the operator's own admin step-up — §2.2). Shown when the intake POST reported it.
  stepUpRequired: boolean;
  stepUpSlot: ReactNode;
  // AR-61 supervisor escalation.
  escalated: boolean;
  onEscalate: () => void;
}

export function HelplineConsoleShell(props: HelplineConsoleShellProps): ReactElement {
  const {
    lookupSlot,
    selected,
    identityScript,
    nomineeScript,
    identityConfirmed,
    onIdentityConfirmedChange,
    nomineeConfirmed,
    onNomineeConfirmedChange,
    identityCorrections,
    onAddIdentityCorrection,
    nomineeCorrections,
    onAddNomineeCorrection,
    relationship,
    onRelationshipChange,
    onSubmit,
    submitPending,
    submitError,
    result,
    stepUpRequired,
    stepUpSlot,
    escalated,
    onEscalate,
  } = props;

  // THE GATE (AC2): identity read-back confirmed + a member selected + an explicit relationship
  // choice. Nominee confirmation is deliberately NOT part of this expression. A present result
  // hides submit (already filed); a pending step-up elevation or an active escalation also
  // withhold submit (Review Finding — no redundant intake POSTs while step-up is outstanding;
  // an escalated case must not be filed out from under the "held for supervisor" messaging).
  const canSubmit =
    Boolean(selected) &&
    identityConfirmed &&
    relationship !== null &&
    !submitPending &&
    !stepUpRequired &&
    !escalated &&
    result === null;

  return (
    <div className="flex flex-col gap-6" data-testid="helpline-console-shell">
      {/* Sticky call-status header (UX §11). */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white/90 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">{resolveEn('helpline.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm opacity-70">{resolveEn('helpline.subtitle')}</p>
        </div>
        <span className="whitespace-nowrap rounded bg-status-warn-bg px-2 py-1 text-xs text-status-warn-fg">
          {resolveEn('helpline.call.sticky')}
        </span>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — member lookup (the shipped Story 4.7 search, injected). */}
        <section aria-label={resolveEn('helpline.pane.lookup')} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {resolveEn('helpline.pane.lookup')}
          </h2>
          {lookupSlot}
          <p className="text-xs opacity-60">{resolveEn('helpline.nomatch.hint')}</p>
        </section>

        {/* RIGHT — read-back + intake. */}
        <section aria-label={resolveEn('helpline.pane.readback')} className="flex flex-col gap-4 rounded border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {resolveEn('helpline.pane.readback')}
          </h2>

          {!selected && <p className="text-sm opacity-70">{resolveEn('helpline.select.prompt')}</p>}

          {selected && (
            <>
              <ReadBackCard
                variant="identity"
                script={identityScript}
                confirmed={identityConfirmed}
                onConfirmedChange={onIdentityConfirmedChange}
                corrections={identityCorrections}
                onAddCorrection={onAddIdentityCorrection}
              />
              <ReadBackCard
                variant="nominee"
                script={nomineeScript}
                confirmed={nomineeConfirmed}
                onConfirmedChange={onNomineeConfirmedChange}
                corrections={nomineeCorrections}
                onAddCorrection={onAddNomineeCorrection}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="claim-relationship" className="text-sm font-medium">
                  {resolveEn('helpline.relationship.label')}
                </label>
                <select
                  id="claim-relationship"
                  className="rounded border px-2 py-1"
                  value={relationship ?? ''}
                  onChange={(e) =>
                    onRelationshipChange(e.target.value === '' ? null : (e.target.value as ClaimantRelationship))
                  }
                  data-testid="helpline-relationship"
                >
                  <option value="" disabled>
                    {resolveEn('helpline.relationship.placeholder')}
                  </option>
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step-up panel (the operator's own admin step-up — surfaced when the route asked for it). */}
              {stepUpRequired && result === null && (
                <div
                  role="region"
                  aria-label={resolveEn('helpline.stepup.region')}
                  data-testid="helpline-stepup"
                  className="flex flex-col gap-2 rounded border border-status-warn-fg bg-status-warn-bg p-3"
                >
                  <p className="text-sm">{resolveEn('helpline.stepup.required')}</p>
                  {stepUpSlot}
                </div>
              )}

              {result === null && (
                <>
                  <button
                    type="button"
                    disabled={!canSubmit}
                    aria-busy={submitPending}
                    onClick={onSubmit}
                    data-testid="helpline-submit-intake"
                    className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                  >
                    {submitPending ? resolveEn('helpline.submit.pending') : resolveEn('helpline.submit')}
                  </button>
                  {!identityConfirmed && (
                    <p className="text-xs opacity-60" data-testid="helpline-gate-hint">
                      {resolveEn('helpline.submit.gateHint')}
                    </p>
                  )}
                  {submitError && (
                    <p role="alert" className="text-sm text-status-fail-fg">
                      {submitError}
                    </p>
                  )}
                </>
              )}

              {/* Post-intake outcome — created vs a cross-channel convergence hit (AC3). */}
              {result !== null && (
                <div
                  role="status"
                  data-testid="helpline-intake-result"
                  className="flex flex-col gap-2 rounded border border-status-ok-border bg-status-ok-bg p-3 text-sm"
                >
                  <p>
                    {result.created
                      ? resolveEn('helpline.result.created')
                      : resolveEn('helpline.result.exists')}
                  </p>
                  <p className="text-xs opacity-70">
                    <code>{result.claimCaseId}</code> · {result.state}
                  </p>
                  <p data-testid="helpline-route-for-verification" className="text-xs opacity-80">
                    {resolveEn('helpline.result.routeForVerification')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* AR-61 supervisor escalation — present at every node. */}
          <div className="mt-2 flex flex-col gap-2 border-t pt-3">
            <button
              type="button"
              onClick={onEscalate}
              data-testid="helpline-escalate"
              className="self-start rounded border border-status-warn-fg px-3 py-1 text-sm text-status-warn-fg"
            >
              {resolveEn('helpline.escalate')}
            </button>
            {escalated && (
              <p role="status" data-testid="helpline-escalated-note" className="text-xs opacity-80">
                {resolveEn('helpline.escalate.held')}
              </p>
            )}

            {/* Deep-link handover — flagged, NON-FUNCTIONAL seam (Decision #4). */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              data-testid="helpline-handover-seam"
              title={resolveEn('helpline.handover.comingSoon')}
              className="self-start rounded border px-3 py-1 text-sm opacity-50"
            >
              {resolveEn('helpline.handover.seam')}
            </button>
            <p className="text-xs opacity-60" data-testid="helpline-handover-note">
              {resolveEn('helpline.handover.comingSoon')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
