// `<FraudInvestigationPanel>` — the verifier console's investigation section (Story 6.22, DL7 / DL10 (i); `2026-11-01-438`).
//
// Behind a disclosure: opening it is the read (a District Admin's read DECRYPTS the notes and is audited, so ⛔ a background
// fetch), and closing it FORGETS what was read. It shows the flag (who, when), then — for a viewer the SERVER judged may record
// it (`viewer.can_record_finding`) — the FINDING form in `DeathCertificateReviewControl`'s shape: the outcome and the proof of
// life as radios with ⛔ pre-selected, a required note, `role="alert"` refusals in words, and an always-mounted
// `role="status"`. The write needs a fresh step-up: a 403 `auth.step_up_required` HOLDS it and the shared `StepUpPanel`
// re-runs it with the SAME ids (a retry replays, ⛔ a second finding).
//
// ⛔ It shows the other claims that still keep the member's death recorded only AFTER a finding, from the write's answer.
//
// Code review 2026-11-02 (chunk C): the wording is honest about what a finding does (it does ⛔ close an approved or paid claim,
// and a GUILTY finding keeps the member locked — the result names the outcome it recorded); the ids are minted on the first
// SUBMIT, ⛔ at render (`crypto.randomUUID` is secure-context-gated — a throw at render would take down the whole console);
// the success line takes focus; a refresh that fails keeps what is on screen.
//
// Code review round 2 (2026-11-02): an untyped failure (a lost response, a 5xx) offers ONE "check" action that re-sends the
// last body under the same ids, and ⛔ "could not be recorded" once the refresh shows a finding (R2-3); any other 403 says a
// retry cannot succeed (R2-7).

import { FRAUD_FINDING_STEP_UP_CONTEXT, type FraudFindingResponse, type FraudInvestigationNote } from '@twt/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { fraudInvestigationKey, useFraudInvestigation, useRecordFraudFinding } from '../../api/hooks.js';
import { newUuid } from '../../api/new-uuid.js';
import { holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import { formatIst } from './NomineeDeclarationPanel.js';
import { fraudInvestigationEn as t, verifierConsoleEn } from './i18n-en.js';

const OUTCOMES = ['innocent', 'guilty'] as const;
const ALIVE = ['in_person', 'video_call', 'ground_inspection'] as const;

/** An approved or settled claim is COMMITTED: a finding is recorded but does not stop it (N5, DL3 step 6). */
const COMMITTED_STATES: ReadonlySet<string> = new Set(['approved', 'settled']);

function NoteText({ note }: { note: FraudInvestigationNote }): ReactElement {
  // A note is free text of up to 2,000 characters: keep its line breaks.
  if (note.state === 'readable') return <span className="whitespace-pre-wrap">{note.value}</span>;
  const words = note.state === 'withheld' ? t.noteWithheld : note.state === 'anonymized' ? t.noteAnonymized : t.noteUnreadable;
  return <span className="italic">{words}</span>;
}

/**
 * A finding refusal in words — ⛔ never a raw code. An OWN property only: a code such as `constructor` is no copy. `null` = no
 * typed refusal: the failure says NOTHING about whether the finding was written (a lost response, a 5xx), so the caller shows
 * the generic line and the "check" action (R2-3). The step-up 403 never reaches here (`needsStepUp` is tested first).
 */
function refusalWords(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  if (Object.prototype.hasOwnProperty.call(t.refusal, err.code)) return t.refusal[err.code]!;
  // Any other 403 (a grant revoked, or the deceased's posting moved district, since the page loaded): a retry cannot succeed, so
  // ⛔ "just now" (R2-7).
  if (err.status === 403) return t.refusalForbidden;
  return null;
}

type FindingBody = { outcome: (typeof OUTCOMES)[number]; alive: (typeof ALIVE)[number]; note: string };

/** What the write did, in words: the OUTCOME recorded, whether the claim closed, and — for guilty — that the member stays locked. */
export function resultWords(r: FraudFindingResponse): string {
  const guilty = r.outcome === 'guilty';
  const base = r.closed
    ? guilty
      ? t.result.closedGuilty
      : t.result.closedInnocent
    : r.not_closed_reason === 'committed'
      ? guilty
        ? t.result.committedGuilty
        : t.result.committedInnocent
      : r.not_closed_reason === 'already_closed'
        ? guilty
          ? t.result.alreadyClosedGuilty
          : t.result.alreadyClosedInnocent
        : guilty
          ? t.result.notClosedGuilty
          : t.result.notClosedInnocent;
  return [base, guilty ? t.result.guiltyStaysLocked : null, r.replayed ? t.result.replayed : null].filter(Boolean).join(' ');
}

export function FraudInvestigationPanel({ pariwarId, claimCaseId }: { pariwarId: string; claimCaseId: string }): ReactElement {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const read = useFraudInvestigation(pariwarId, claimCaseId, open);
  const record = useRecordFraudFinding(pariwarId, claimCaseId);
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number] | null>(null);
  const [alive, setAlive] = useState<(typeof ALIVE)[number] | null>(null);
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  // Minted ONCE, on the first send (⛔ at render): a retry (after a step-up, or a lost response) sends the same ids and REPLAYS.
  const idsRef = useRef<{ stepId: string; findingId: string } | null>(null);
  // What was LAST sent with those ids: the "check" action re-sends exactly it (R2-3) — ⛔ what the form says now, which an edit
  // may have changed (a different body under the same ids is `step_conflict`).
  const lastSentRef = useRef<FindingBody | null>(null);
  const [pending, setPending] = useState<PendingWrite>(null);
  const [result, setResult] = useState<FraudFindingResponse | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // The form that held the focus unmounts on success: move focus to the line that says what happened (family 13 (d)).
  useEffect(() => {
    if (result !== null) statusRef.current?.focus();
  }, [result]);

  const send = (body: FindingBody) => {
    idsRef.current ??= { stepId: newUuid(), findingId: newUuid() };
    const ids = idsRef.current;
    lastSentRef.current = body;
    record.mutate(
      { step_id: ids.stepId, finding_id: ids.findingId, outcome: body.outcome, alive_confirmation: body.alive, note: body.note },
      {
        onSuccess: (r) => {
          setResult(r);
          setNote(''); // the Tier-1 note is ⛔ kept in state once it is written
          lastSentRef.current = null; // … ⛔ in the re-send ref either
        },
        onError: (err) => {
          if (!needsStepUp(err)) return;
          setPending(holdOnce({ owner: 'finding', id: Date.now(), label: t.form.submit, retry: () => send(body) }));
        },
      },
    );
  };

  const submit = () => {
    if (outcome === null || alive === null || note.trim() === '') {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    send({ outcome, alive, note });
  };

  const data = read.data;
  const flag = data?.steps.find((s) => s.step === 'flagged');
  const found = data?.steps.some((s) => s.step !== 'flagged') ?? false;
  const committed = data !== undefined && COMMITTED_STATES.has(data.claim_state);
  const failed = record.isError && !needsStepUp(record.error);
  const typedRefusal = failed ? refusalWords(record.error) : null;
  // R2-3 — an UNTYPED failure (a dropped response, a 502) may have been written: the refresh after it then shows a found step, the
  // form goes, and "could not be recorded just now" beside the recorded finding would be false. ONE action re-sends the SAME body
  // under the SAME ids — a finding already written answers 200 `replayed` with the other claims; one that was not is written now.
  const lastSent = lastSentRef.current;
  const canCheck = failed && typedRefusal === null && lastSent !== null && result === null;
  // … and while it is offered the FORM is locked (patch-diff PT1): if the refresh failed too, the form is still on screen, and an
  // edited outcome sent under the same ids would be `step_conflict` — a refusal that hides a finding already written.
  const formLocked = record.isPending || pending !== null || result !== null || canCheck;
  const shownError = !failed ? null : (typedRefusal ?? (found ? t.lostResponse.nowRecorded : t.refusalGeneric));
  const labels: Record<string, string> = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;

  return (
    <section className="mt-4 border-t pt-4" data-testid="fraud-investigation-section">
      <button
        type="button"
        className="text-sm underline"
        aria-expanded={open}
        data-testid="fraud-investigation-disclosure"
        onClick={() => {
          // ⭐ Closing FORGETS the decrypted notes; a reopen is a fresh, audited look.
          if (open) qc.removeQueries({ queryKey: fraudInvestigationKey(pariwarId, claimCaseId) });
          setOpen(!open);
        }}
      >
        {open ? t.hide : t.show} — {t.heading}
      </button>
      <p className="text-xs">{t.audited}</p>
      {!open ? null : read.isLoading ? (
        <p data-testid="fraud-investigation-loading">{t.loading}</p>
      ) : !data ? (
        // Only when there is NOTHING to show: a failed refresh with data in hand keeps the data (below).
        <p role="alert" data-testid="fraud-investigation-error">
          {t.loadError}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          {read.isError ? (
            <p role="alert" className="text-xs" data-testid="fraud-investigation-refresh-error">
              {t.refreshError}
            </p>
          ) : null}
          {data.steps.length === 0 ? <p data-testid="fraud-investigation-not-flagged">{t.notFlagged}</p> : null}
          <ol className="flex flex-col gap-2" data-testid="fraud-investigation-steps">
            {data.steps.map((s) => (
              <li key={s.step} className="rounded border p-2" data-testid={`fraud-investigation-step-${s.step}`}>
                <p className="font-medium">{t.step[s.step]}</p>
                <p className="text-xs">
                  {t.by} {s.actor_display} {t.on} {formatIst(s.acted_at)}
                  {s.alive_confirmation ? (
                    <>
                      {' '}
                      · {t.proof}: {t.aliveConfirmation[s.alive_confirmation]}
                    </>
                  ) : null}
                </p>
                <p className="text-xs">
                  {t.note}: <NoteText note={s.note} />
                </p>
              </li>
            ))}
          </ol>
          {flag && data.viewer.is_flagger && !found ? <p data-testid="fraud-investigation-you-flagged">{t.youFlagged}</p> : null}
          {data.viewer.can_record_finding && result === null ? (
            <fieldset className="flex flex-col gap-2 rounded border p-3" data-testid="fraud-finding-form" disabled={formLocked}>
              <legend className="font-semibold">{t.form.legend}</legend>
              <p className="text-xs">{t.form.intro}</p>
              {committed ? (
                <p role="note" className="text-xs font-medium" data-testid="fraud-finding-committed-warning">
                  {t.form.committedWarning}
                </p>
              ) : null}
              <fieldset className="flex flex-col gap-1" data-testid="fraud-finding-outcomes">
                <legend>{t.form.outcomeLegend}</legend>
                {OUTCOMES.map((o) => (
                  <label key={o} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="fraud-finding-outcome"
                      value={o}
                      checked={outcome === o}
                      aria-invalid={incomplete && outcome === null}
                      onChange={() => setOutcome(o)}
                      data-testid={`fraud-finding-outcome-${o}`}
                    />
                    {t.form.outcome[o]}
                  </label>
                ))}
              </fieldset>
              <fieldset className="flex flex-col gap-1" data-testid="fraud-finding-alive">
                <legend>{t.form.aliveLegend}</legend>
                {ALIVE.map((a) => (
                  <label key={a} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="fraud-finding-alive"
                      value={a}
                      checked={alive === a}
                      aria-invalid={incomplete && alive === null}
                      onChange={() => setAlive(a)}
                      data-testid={`fraud-finding-alive-${a}`}
                    />
                    {t.aliveConfirmation[a]}
                  </label>
                ))}
              </fieldset>
              <label htmlFor="fraud-finding-note" className="font-medium">
                {t.form.noteLabel}
              </label>
              <textarea
                id="fraud-finding-note"
                className="rounded border p-2"
                rows={3}
                maxLength={2000}
                value={note}
                aria-describedby="fraud-finding-note-help"
                aria-invalid={incomplete && note.trim() === ''}
                onChange={(e) => setNote(e.target.value)}
                data-testid="fraud-finding-note"
              />
              <p id="fraud-finding-note-help" className="text-xs">
                {t.form.noteHelp}
              </p>
              {incomplete ? (
                <p role="alert" className="text-red-700" data-testid="fraud-finding-incomplete">
                  {t.form.incomplete}
                </p>
              ) : null}
              <button type="button" className="self-start rounded border px-3 py-1" onClick={submit} data-testid="fraud-finding-submit">
                {record.isPending ? t.form.submitting : outcome !== null ? t.form.submitOutcome[outcome] : t.form.submit}
              </button>
            </fieldset>
          ) : null}
          {pending !== null ? (
            <StepUpPanel
              context={FRAUD_FINDING_STEP_UP_CONTEXT}
              pending={pending}
              onDone={() => setPending(null)}
              onCancel={() => setPending(null)}
              testId="fraud-finding-step-up"
            />
          ) : null}
          {shownError !== null ? (
            <p role="alert" className="text-red-700" data-testid="fraud-finding-refused">
              {shownError}
            </p>
          ) : null}
          {canCheck && lastSent !== null ? (
            <div className="flex flex-col gap-1" data-testid="fraud-finding-check">
              <p className="text-xs">{t.lostResponse.checkHelp}</p>
              <button
                type="button"
                className="self-start rounded border px-3 py-1"
                disabled={record.isPending || pending !== null}
                onClick={() => send(lastSent)}
                data-testid="fraud-finding-check-button"
              >
                {t.lostResponse.check}
              </button>
            </div>
          ) : null}
          {result !== null ? (
            <div data-testid="fraud-finding-other-claims">
              {result.other_standing_claims.length === 0 ? (
                <p>{t.result.noOtherClaims}</p>
              ) : (
                <>
                  <p>{t.result.otherClaims}</p>
                  <ul className="ml-4 list-disc">
                    {result.other_standing_claims.map((c) => (
                      <li key={c.claim_case_id}>
                        {/* ⛔ The trigger-blind staff label ("another claim … goes ahead", G9) — it is FALSE for a claim a guilty finding closed. */}
                        {c.claim_state === 'closed' ? t.result.closedPlain : (labels[c.claim_state] ?? '—')} · {formatIst(c.filed_at)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
      {/* Always mounted, so a screen reader hears the outcome when it lands (6.38 R4 P1); it takes focus on success (the form unmounts). */}
      <p role="status" tabIndex={-1} ref={statusRef} className="text-sm" data-testid="fraud-finding-status">
        {result !== null ? resultWords(result) : ''}
      </p>
    </section>
  );
}
