// `<HelplineFraudFlag>` — the helpline operator FLAGS a claim that may be about a member who is ALIVE (Story 6.22, DL5 /
// DL10 (ii); `2026-09-21-238` cl. 3 *"operator flags"*). The ONLY place a flag is raised.
//
// The list is EVERY claim naming the SELECTED member, in every state (a member locked by a `denied` false claim must be
// flaggable — the shipped helpline reads drop `settled` / `denied`), with where each one's investigation stands. ⛔ No
// claimant name, ⛔ no note on the list — ids, states and dates only.
//
// ⚠ DELIBERATE — the read-back gate is CLIENT-SIDE ONLY (the D5 precedent `<HelplineCertificateReplacement>` records). WHY it is safe:
// the gate protects the operator's SCRIPT (confirm who is on the phone before showing a member's claims), ⛔ the data — the server
// authorizes the list and the flag itself (`claim.flag_fraud`, Pariwar dimension) and AUDITS every list read (`fraud_claims_read`),
// so a bypassed gate widens nothing the operator's key does not already allow. RE-EXAMINE when the server learns the read-back (a
// session-bound member selection), at which point this gate should call it.
// The flag's `step_id` is minted when the form OPENS (an event handler, ⛔ render), so a retry of the same submission replays (⛔ a second flag).

import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useFlagClaimForFraud, useMemberFraudClaims } from '../../api/hooks.js';
import { newUuid } from '../../api/new-uuid.js';
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
  if (err instanceof ApiError) {
    if (err.code === 'fraud_investigation.already_flagged') return resolveEn('helpline.fraud.refusal.already_flagged');
    if (err.code === 'fraud_investigation.missing_note') return resolveEn('helpline.fraud.noteRequired');
    if (err.code === 'fraud_investigation.claim_not_found') return resolveEn('helpline.fraud.refusal.claim_not_found');
    if (err.code === 'fraud_investigation.concurrent') return resolveEn('helpline.fraud.refusal.concurrent');
    // The open form's step id is already spent: resending it can never succeed. Cancel + re-open mints a new one (PD6).
    if (err.code === 'fraud_investigation.step_conflict') return resolveEn('helpline.fraud.refusal.step_conflict');
    // PERMANENT (a retry cannot succeed) — said so, ⛔ "just now".
    if (err.code === 'admin.display_name_missing') return resolveEn('helpline.fraud.refusal.display_name_missing');
    // Any other 403 (the key revoked since the page loaded): a retry cannot succeed, so ⛔ "just now" (R2-7). The flag route
    // takes no step-up; the guard keeps a step-up 403, were one ever sent, out of this line.
    if (err.status === 403 && err.code !== 'auth.step_up_required') return resolveEn('helpline.fraud.refusal.forbidden');
  }
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
  // WHICH claim was flagged, in words: the status line changes with every flag, so a second one is announced again.
  const [flagged, setFlagged] = useState<{ readonly claimCaseId: string; readonly label: string } | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // R2-8 — the refusal that closed a row's form (below), kept on THAT row so the operator sees why the form went.
  const [rowRefusal, setRowRefusal] = useState<{ readonly claimCaseId: string; readonly words: string } | null>(null);
  // The LAST refusal, recorded in the write's own `onError` (patch-diff PT7) — ⛔ read from `flag.isError` when the refreshed list
  // lands, which would depend on which of the two settled first.
  const lastRefusalRef = useRef<{ readonly claimCaseId: string; readonly words: string } | null>(null);

  // A member switch — or losing the read-back for the SAME member (R2-9) — closes the form and forgets the note and the outcome;
  // ⛔ a re-confirm brings them back.
  useEffect(() => {
    setForm(null);
    setNote('');
    setIncomplete(false);
    setFlagged(null);
    setRowRefusal(null);
    lastRefusalRef.current = null;
    flag.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `flag.reset` is stable; only the member and the read-back matter here
  }, [memberId, ready]);

  // R2-8 — a row that is no longer `none` (the refresh after a 409 `already_flagged`, or another operator's flag) takes ⛔ flag:
  // its form closes (every resend would be the same 409), and the refusal stays on the row.
  const formClaim = form === null ? undefined : claims.find((x) => x.claim_case_id === form.claimCaseId);
  const formStale = formClaim !== undefined && formClaim.investigation !== 'none';
  useEffect(() => {
    if (!formStale || form === null) return;
    const last = lastRefusalRef.current;
    setRowRefusal(last !== null && last.claimCaseId === form.claimCaseId ? last : null);
    setForm(null);
    setNote(''); // the typed caller note is ⛔ kept once the form is gone
    setIncomplete(false);
    headingRef.current?.focus(); // the form that held the focus unmounts: focus lands on the section, ⛔ the page body (PD7)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the row turns stale; `form` is read at that moment
  }, [formStale]);

  const submit = (claimCaseId: string, stepId: string) => {
    if (note.trim() === '') {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    lastRefusalRef.current = null;
    flag.mutate(
      { claimCaseId, body: { step_id: stepId, note } },
      {
        onError: (err) => {
          lastRefusalRef.current = { claimCaseId, words: flagRefusal(err) };
        },
        onSuccess: () => {
          const c = claims.find((x) => x.claim_case_id === claimCaseId);
          setFlagged({ claimCaseId, label: c ? certificateClaimOption(stateWords(c.claim_state), formatIst(c.filed_at)) : '' });
          setForm(null);
          setNote('');
        },
      },
    );
  };

  // The form that held the focus unmounts on success: move focus to the line that says what happened (family 13 (d)).
  useEffect(() => {
    if (flagged !== null) statusRef.current?.focus();
  }, [flagged]);

  // Opening the form hides the Flag button that was just pressed: move focus to the note, so the next keystroke is the caller's words (PD7).
  useEffect(() => {
    if (form !== null) noteRef.current?.focus();
  }, [form]);

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
          const rowLabel = certificateClaimOption(stateWords(c.claim_state), formatIst(c.filed_at));
          return (
            <li key={c.claim_case_id} className="flex flex-col gap-1 text-sm" data-testid={`helpline-fraud-claim-${c.claim_case_id}`}>
              <span className="font-medium">{rowLabel}</span>
              <span data-testid={`helpline-fraud-status-${c.claim_case_id}`}>{resolveEn(`helpline.fraud.status.${c.investigation}`)}</span>
              {c.investigation === 'none' && !open ? (
                <button
                  type="button"
                  className="self-start rounded border px-3 py-1"
                  disabled={form !== null || flag.isPending}
                  aria-label={`${resolveEn('helpline.fraud.flag')}: ${rowLabel}`}
                  onClick={() => {
                    flag.reset();
                    setFlagged(null);
                    setRowRefusal(null);
                    lastRefusalRef.current = null;
                    setNote('');
                    setIncomplete(false);
                    setForm({ claimCaseId: c.claim_case_id, stepId: newUuid() });
                  }}
                  data-testid={`helpline-fraud-open-${c.claim_case_id}`}
                >
                  {resolveEn('helpline.fraud.flag')}
                </button>
              ) : null}
              {rowRefusal?.claimCaseId === c.claim_case_id ? (
                <p role="alert" className="text-red-700" data-testid={`helpline-fraud-row-refused-${c.claim_case_id}`}>
                  {rowRefusal.words}
                </p>
              ) : null}
              {/* Only while the row can still be flagged (R2-8): a stale `open` is closed by the effect above. */}
              {open && form && c.investigation === 'none' ? (
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
                    ref={noteRef}
                    value={note}
                    aria-describedby="helpline-fraud-note-help"
                    aria-invalid={incomplete && note.trim() === ''}
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
                    <button type="button" className="underline" disabled={flag.isPending} onClick={() => {
                        setForm(null);
                        setNote(''); // the typed caller note is ⛔ kept once the form is abandoned
                        setIncomplete(false);
                        flag.reset();
                        headingRef.current?.focus(); // the Cancel button unmounts with the form: focus lands on the section, ⛔ the page body (PD7)
                      }}
                    >
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
      <h2 tabIndex={-1} ref={headingRef} className="text-sm font-semibold">
        {resolveEn('helpline.fraud.heading')}
      </h2>
      <p className="text-xs text-gray-600">{resolveEn('helpline.fraud.intro')}</p>
      {body}
      {/* Always mounted, so a screen reader hears the outcome when it lands (6.38 R4 P1). */}
      <p role="status" tabIndex={-1} ref={statusRef} className="text-sm" data-testid="helpline-fraud-status">
        {flagged !== null ? `${resolveEn('helpline.fraud.flagged')} ${flagged.label}`.trim() : ''}
      </p>
    </section>
  );
}
