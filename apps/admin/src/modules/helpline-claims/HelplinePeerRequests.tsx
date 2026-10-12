// `<HelplinePeerRequests>` — "Requests to confirm a death": the helpline records the answers of a neighbour who phones
// (Story 6.27a PM12, PM25 (b); `2026-10-10-311`).
//
// The SELECTED member is the CALLER — one of the members the Trust asked about a reported death. The panel lists THEIR open
// requests (the server lists ONLY requests the Trust has TEXTED — ⇒ EMPTY until 6.27c texts anyone, so the helpline can
// ⛔ never name a reported death to a member the Trust has ⛔ not texted), renders the SAME served questionnaire the app does
// (English words — the admin console is English-only), and records each answer as the caller gives it (`saved_via =
// 'helpline'`; the operator is the saver). ⭐ The operator sees ONLY that neighbour's answers — ⛔ another neighbour's,
// ⛔ the warning lines, ⛔ the counts. Submit locks the reply for the app too.
// 6.3's chain: every call needs the operator's fresh `claim_file` step-up — a 403 opens the page's step-up panel.
// ⚠ Per-row state comes from each call's OWN promise (`mutateAsync`) — TanStack's per-`mutate` callbacks fire for the LATEST
// call only ([[project_tanstack_mutate_callbacks_latest_only]]).

import type { PeerRequestAnswerValue, PeerRequestDetailResponse, PeerRequestQuestion } from '@twt/contracts';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useHelplinePeerRequests, useHelplineSavePeerAnswer, useHelplineSubmitPeerReply } from '../../api/hooks.js';

/** Is `q` shown, given the caller's live answers? (The server re-checks every save.) */
export function isShownFor(q: PeerRequestQuestion, answers: ReadonlyMap<string, PeerRequestAnswerValue>): boolean {
  if (q.showIf === null) return true;
  const parent = answers.get(q.showIf.key);
  return parent !== undefined && 'codes' in parent && parent.codes.some((c) => q.showIf!.anyOf.includes(c));
}

function failureText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'peer_request.no_longer_open') return 'This request is no longer open.';
    if (err.code === 'peer_request.submitted') return 'These answers were already sent.';
    if (err.code === 'peer_request.not_found') return 'This request could not be opened.';
    if (err.code === 'peer_request.invalid_answer') return 'That answer could not be saved — please choose again.';
  }
  return 'Not saved — please try again.';
}

export function HelplinePeerRequests({
  pariwarId,
  memberId,
  identityConfirmed,
  onStepUpRequired,
}: {
  pariwarId: string;
  /** The CALLER the operator selected on this page (a neighbour), or `null`. */
  memberId: string | null;
  identityConfirmed: boolean;
  onStepUpRequired: () => void;
}): ReactElement | null {
  const ready = memberId !== null && identityConfirmed;
  const listQ = useHelplinePeerRequests(pariwarId, memberId, ready);
  if (!ready) return null;
  if (listQ.isError) {
    if (listQ.error instanceof ApiError && listQ.error.code === 'auth.step_up_required') {
      return (
        <section aria-label="Requests to confirm a death" className="rounded border p-4">
          <h2 className="text-sm font-semibold">Requests to confirm a death</h2>
          <p className="mt-2 text-sm">Confirm with your step-up code to see this caller&apos;s requests.</p>
          <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={onStepUpRequired}>
            Confirm with a code
          </button>
        </section>
      );
    }
    return (
      <section aria-label="Requests to confirm a death" className="rounded border p-4">
        <h2 className="text-sm font-semibold">Requests to confirm a death</h2>
        <p role="alert" className="mt-2 text-sm">
          The requests could not be loaded just now.
        </p>
      </section>
    );
  }
  const items = listQ.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <section aria-label="Requests to confirm a death" className="flex flex-col gap-4 rounded border p-4">
      <h2 className="text-sm font-semibold">Requests to confirm a death</h2>
      <p className="text-xs opacity-70">
        Read each question to the caller and record their answer. Every answer is saved as you go. Only staff who check the
        claim see these answers — never the family.
      </p>
      {items.map((item) => (
        <PeerRequestCard key={item.pingId} pariwarId={pariwarId} memberId={memberId} item={item} onStepUpRequired={onStepUpRequired} />
      ))}
    </section>
  );
}

function PeerRequestCard({
  pariwarId,
  memberId,
  item,
  onStepUpRequired,
}: {
  pariwarId: string;
  memberId: string | null;
  item: PeerRequestDetailResponse;
  onStepUpRequired: () => void;
}): ReactElement {
  const save = useHelplineSavePeerAnswer(pariwarId, memberId);
  const submit = useHelplineSubmitPeerReply(pariwarId, memberId);
  const [status, setStatus] = useState<string | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const answers = new Map(item.answers.map((a) => [a.questionKey, a.value] as const));

  const record = (questionKey: string, value: PeerRequestAnswerValue): void => {
    setStatus('Saving…');
    void save
      .mutateAsync({ pingId: item.pingId, questionKey, value })
      .then(() => setStatus('Saved'))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === 'auth.step_up_required') onStepUpRequired();
        setStatus(failureText(err));
      });
  };

  const questions = item.questionnaire.pages.flatMap((p) => p.questions).filter((q) => isShownFor(q, answers));
  return (
    <article aria-label={`Request about ${item.memberName || 'a member'}`} className="rounded border p-3">
      <h3 className="font-semibold">About {item.memberName || 'a member'}</h3>
      <div className="mt-2 flex flex-col gap-3">
        {questions.map((q) => {
          const current = answers.get(q.key);
          const codes = current !== undefined && 'codes' in current ? current.codes : [];
          return (
            <fieldset key={q.key} className="flex flex-col gap-1">
              <legend className="text-sm font-medium">{q.words.en}</legend>
              {q.kind === 'date' && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    aria-label={q.words.en}
                    className="rounded border px-2 py-1 text-sm"
                    value={dates[q.key] ?? (current !== undefined && 'date' in current ? current.date : '')}
                    onChange={(e) => setDates((d) => ({ ...d, [q.key]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-sm"
                    disabled={!dates[q.key]}
                    onClick={() => record(q.key, { date: dates[q.key]! })}
                  >
                    Save the date
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const selected = codes.includes(o.code);
                  return (
                    <button
                      key={o.code}
                      type="button"
                      aria-pressed={selected}
                      className={`rounded border px-2 py-1 text-sm ${selected ? 'font-semibold' : ''}`}
                      onClick={() => {
                        if (q.kind !== 'multi') return record(q.key, { codes: [o.code] });
                        const next = o.exclusive
                          ? [o.code]
                          : selected
                            ? codes.filter((c) => c !== o.code)
                            : [...codes.filter((c) => !q.options.find((x) => x.code === c)?.exclusive), o.code];
                        if (next.length > 0) record(q.key, { codes: next });
                      }}
                    >
                      {o.words.en}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
      <p className="mt-3 text-xs opacity-80">{item.questionnaire.closingNote.en}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          disabled={!answers.has('has_died') || submit.isPending}
          onClick={() =>
            void submit
              .mutateAsync(item.pingId)
              .then(() => setStatus('Sent — the answers are locked.'))
              .catch((err: unknown) => {
                if (err instanceof ApiError && err.code === 'auth.step_up_required') onStepUpRequired();
                setStatus(failureText(err));
              })
          }
        >
          Submit
        </button>
        {status !== null && (
          <span role="status" className="text-sm">
            {status}
          </span>
        )}
      </div>
    </article>
  );
}
