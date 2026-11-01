// `<HelplineFraudFlag>` — the helpline operator FLAGS a claim that may be about a member who is ALIVE (Story 6.22, DL5 /
// DL10 (ii); `2026-09-21-238` cl. 3 *"operator flags"*). The ONLY place a flag is raised.
//
// The list is EVERY claim naming the SELECTED member, in every state (a member locked by a `denied` false claim must be
// flaggable — the shipped helpline reads drop `settled` / `denied`), with where each one's investigation stands. ⛔ No
// claimant name, ⛔ no note on the list — ids, states and dates only.
//
// ⚠ DELIBERATE — the read-back gate is CLIENT-SIDE ONLY (the D5 precedent `<HelplineCertificateReplacement>` records).
// The flag's `step_id` is minted when the form OPENS, so a retry of the same submission replays (⛔ a second flag).

import { useEffect, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useFlagClaimForFraud, useMemberFraudClaims } from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { certificateClaimOption, resolveEn } from './i18n-en.js';

/** A claim's state in words. A `closed` claim reads plainly "Closed" here — this list carries ⛔ OP10's holder bit. */
function stateWords(state: string): string {
  if (state === 'closed') return resolveEn('helpline.fraud.state.closed');
  const labels: Record<string, string> = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;
  return labels[state] ?? '—';
}

/** A flag refusal in words — ⛔ never a raw code. */
function flagRefusal(err: unknown): string {
  if (err instanceof ApiError && err.code === 'fraud_investigation.already_flagged') return resolveEn('helpline.fraud.refusal.already_flagged');
  if (err instanceof ApiError && err.code === 'fraud_investigation.missing_note') return resolveEn('helpline.fraud.noteRequired');
  return resolveEn('helpline.fraud.refusal.generic');
}

interface OpenForm {
  readonly claimCaseId: string;
  readonly stepId: string;
}

export function HelplineFraudFlag({
  pariwarId,
  memberId,
  identityConfirmed,
}: {
  pariwarId: string;
  /** The member the operator SELECTED on this page, or `null`. */
  memberId: string | null;
  /** The caller's identity was read back and confirmed for THAT member (the page's script). */
  identityConfirmed: boolean;
}): ReactElement {
  const ready = memberId !== null && identityConfirmed;
  const listQ = useMemberFraudClaims(pariwarId, memberId, ready);
  const claims = listQ.data?.claims ?? [];
  const flag = useFlagClaimForFraud(pariwarId, memberId);
  const [form, setForm] = useState<OpenForm | null>(null);
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [flaggedClaim, setFlaggedClaim] = useState<string | null>(null);

  // A member switch closes the form and forgets the outcome.
  useEffect(() => {
    setForm(null);
    setNote('');
    setIncomplete(false);
    setFlaggedClaim(null);
    flag.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `flag.reset` is stable; only the member matters here
  }, [memberId]);

  const submit = (claimCaseId: string, stepId: string) => {
    if (note.trim() === '') {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    flag.mutate(
      { claimCaseId, body: { step_id: stepId, note } },
      {
        onSuccess: () => {
          setFlaggedClaim(claimCaseId);
          setForm(null);
          setNote('');
        },
      },
    );
  };

  let body: ReactElement;
  if (!ready) {
    body = (
      <p className="text-sm" data-testid="helpline-fraud-need-member">
        {resolveEn('helpline.fraud.needMember')}
      </p>
    );
  } else if (listQ.isLoading) {
    body = (
      <p className="text-sm" data-testid="helpline-fraud-loading">
        {resolveEn('helpline.fraud.loading')}
      </p>
    );
  } else if (listQ.isError) {
    body = (
      <div role="alert" className="text-sm" data-testid="helpline-fraud-error">
        <p>{resolveEn('helpline.fraud.error')}</p>
        <button type="button" className="underline" disabled={listQ.isFetching} onClick={() => void listQ.refetch()}>
          {resolveEn('helpline.fraud.retry')}
        </button>
      </div>
    );
  } else if (claims.length === 0) {
    body = (
      <p className="text-sm" data-testid="helpline-fraud-none">
        {resolveEn('helpline.fraud.none')}
      </p>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {claims.map((c) => {
          const open = form?.claimCaseId === c.claim_case_id;
          return (
            <li key={c.claim_case_id} className="flex flex-col gap-1 text-sm" data-testid={`helpline-fraud-claim-${c.claim_case_id}`}>
              <span className="font-medium">{certificateClaimOption(stateWords(c.claim_state), formatIst(c.filed_at))}</span>
              <span data-testid={`helpline-fraud-status-${c.claim_case_id}`}>{resolveEn(`helpline.fraud.status.${c.investigation}`)}</span>
              {c.investigation === 'none' && !open ? (
                <button
                  type="button"
                  className="self-start rounded border px-3 py-1"
                  disabled={form !== null || flag.isPending}
                  onClick={() => {
                    flag.reset();
                    setNote('');
                    setIncomplete(false);
                    setForm({ claimCaseId: c.claim_case_id, stepId: crypto.randomUUID() });
                  }}
                  data-testid={`helpline-fraud-open-${c.claim_case_id}`}
                >
                  {resolveEn('helpline.fraud.flag')}
                </button>
              ) : null}
              {open && form ? (
                <form
                  className="flex flex-col gap-2 rounded border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(form.claimCaseId, form.stepId);
                  }}
                  data-testid="helpline-fraud-form"
                >
                  <label htmlFor="helpline-fraud-note" className="font-medium">
                    {resolveEn('helpline.fraud.noteLabel')}
                  </label>
                  <textarea
                    id="helpline-fraud-note"
                    className="rounded border p-2"
                    rows={3}
                    maxLength={2000}
                    value={note}
                    aria-describedby="helpline-fraud-note-help"
                    onChange={(e) => setNote(e.target.value)}
                    data-testid="helpline-fraud-note"
                  />
                  <p id="helpline-fraud-note-help" className="text-xs text-gray-600">
                    {resolveEn('helpline.fraud.noteHelp')}
                  </p>
                  {incomplete ? (
                    <p role="alert" className="text-red-700" data-testid="helpline-fraud-incomplete">
                      {resolveEn('helpline.fraud.noteRequired')}
                    </p>
                  ) : null}
                  {flag.isError ? (
                    <p role="alert" className="text-red-700" data-testid="helpline-fraud-refused">
                      {flagRefusal(flag.error)}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button type="submit" className="rounded border px-3 py-1" disabled={flag.isPending} data-testid="helpline-fraud-submit">
                      {resolveEn(flag.isPending ? 'helpline.fraud.submitting' : 'helpline.fraud.submit')}
                    </button>
                    <button type="button" className="underline" disabled={flag.isPending} onClick={() => setForm(null)}>
                      {resolveEn('helpline.fraud.cancel')}
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-label={resolveEn('helpline.fraud.heading')} className="flex flex-col gap-2 rounded border p-4" data-testid="helpline-fraud">
      <h2 className="text-sm font-semibold">{resolveEn('helpline.fraud.heading')}</h2>
      <p className="text-xs text-gray-600">{resolveEn('helpline.fraud.intro')}</p>
      {body}
      {/* Always mounted, so a screen reader hears the outcome when it lands (6.38 R4 P1). */}
      <p role="status" className="text-sm" data-testid="helpline-fraud-status">
        {flaggedClaim !== null ? resolveEn('helpline.fraud.flagged') : ''}
      </p>
    </section>
  );
}
