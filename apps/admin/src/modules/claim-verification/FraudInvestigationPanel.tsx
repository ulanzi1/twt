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

import { FRAUD_FINDING_STEP_UP_CONTEXT, type FraudFindingResponse, type FraudInvestigationNote } from '@twt/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { fraudInvestigationKey, useFraudInvestigation, useRecordFraudFinding } from '../../api/hooks.js';
import { holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import { formatIst } from './NomineeDeclarationPanel.js';
import { fraudInvestigationEn as t, verifierConsoleEn } from './i18n-en.js';

const OUTCOMES = ['innocent', 'guilty'] as const;
const ALIVE = ['in_person', 'video_call', 'ground_inspection'] as const;

function NoteText({ note }: { note: FraudInvestigationNote }): ReactElement {
  if (note.state === 'readable') return <span>{note.value}</span>;
  const words = note.state === 'withheld' ? t.noteWithheld : note.state === 'anonymized' ? t.noteAnonymized : t.noteUnreadable;
  return <span className="italic">{words}</span>;
}

/** A finding refusal in words — ⛔ never a raw code. */
function refusalWords(err: unknown): string {
  if (err instanceof ApiError && t.refusal[err.code] !== undefined) return t.refusal[err.code]!;
  return t.refusalGeneric;
}

function resultWords(r: FraudFindingResponse): string {
  if (r.closed) return t.result.closed;
  return r.not_closed_reason === 'committed' ? t.result.committed : t.result.alreadyClosed;
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
  // Minted ONCE per form: a retry (after a step-up, or a lost response) sends the same ids and REPLAYS.
  const [ids] = useState(() => ({ stepId: crypto.randomUUID(), findingId: crypto.randomUUID() }));
  const [pending, setPending] = useState<PendingWrite>(null);
  const [result, setResult] = useState<FraudFindingResponse | null>(null);

  const send = (body: { outcome: (typeof OUTCOMES)[number]; alive: (typeof ALIVE)[number]; note: string }) => {
    record.mutate(
      { step_id: ids.stepId, finding_id: ids.findingId, outcome: body.outcome, alive_confirmation: body.alive, note: body.note },
      {
        onSuccess: (r) => setResult(r),
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
  const formLocked = record.isPending || pending !== null || result !== null;
  const shownError = record.isError && !needsStepUp(record.error) ? refusalWords(record.error) : null;

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
      ) : read.isError || !data ? (
        <p role="alert" data-testid="fraud-investigation-error">
          {t.loadError}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3 text-sm">
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
          {flag && data.viewer.is_flagger ? <p data-testid="fraud-investigation-you-flagged">{t.youFlagged}</p> : null}
          {data.viewer.can_record_finding && result === null ? (
            <fieldset className="flex flex-col gap-2 rounded border p-3" data-testid="fraud-finding-form" disabled={formLocked}>
              <legend className="font-semibold">{t.form.legend}</legend>
              <p className="text-xs">{t.form.intro}</p>
              <fieldset className="flex flex-col gap-1" data-testid="fraud-finding-outcomes">
                <legend>{t.form.outcomeLegend}</legend>
                {OUTCOMES.map((o) => (
                  <label key={o} className="flex items-center gap-2">
                    <input type="radio" name="fraud-finding-outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} data-testid={`fraud-finding-outcome-${o}`} />
                    {t.form.outcome[o]}
                  </label>
                ))}
              </fieldset>
              <fieldset className="flex flex-col gap-1" data-testid="fraud-finding-alive">
                <legend>{t.form.aliveLegend}</legend>
                {ALIVE.map((a) => (
                  <label key={a} className="flex items-center gap-2">
                    <input type="radio" name="fraud-finding-alive" value={a} checked={alive === a} onChange={() => setAlive(a)} data-testid={`fraud-finding-alive-${a}`} />
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
                {record.isPending ? t.form.submitting : t.form.submit}
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
          {result !== null ? (
            <div data-testid="fraud-finding-other-claims">
              {result.other_standing_claims.length === 0 ? (
                <p>{t.result.noOtherClaims}</p>
              ) : (
                <>
                  <p>{t.result.otherClaims}</p>
                  <ul className="ml-4 list-disc">
                    {result.other_standing_claims.map((c) => {
                      const labels: Record<string, string> = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;
                      return (
                        <li key={c.claim_case_id}>
                          {labels[c.claim_state] ?? '—'} · {formatIst(c.filed_at)}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
      {/* Always mounted, so a screen reader hears the outcome when it lands (6.38 R4 P1). */}
      <p role="status" className="text-sm" data-testid="fraud-finding-status">
        {result !== null ? resultWords(result) : ''}
      </p>
    </section>
  );
}
