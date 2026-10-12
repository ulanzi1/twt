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

import type { PeerRequestAnswerValue, PeerRequestDetailResponse, PeerRequestLiveAnswer, PeerRequestQuestion } from '@twt/contracts';
import { PeerAnswerEditor } from '@twt/api-client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useRouter } from '@tanstack/react-router';

import { ApiError } from '../../api/client.js';
import { useHelplinePeerRequests, useHelplineSavePeerAnswer, useHelplineSubmitPeerReply } from '../../api/hooks.js';

/** Is `q` shown, given the caller's live answers? (The server re-checks every save.) */
export function isShownFor(q: PeerRequestQuestion, answers: ReadonlyMap<string, PeerRequestLiveAnswer['value']>): boolean {
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
  onBusyChange,
}: {
  pariwarId: string;
  /** The CALLER the operator selected on this page (a neighbour), or `null`. */
  memberId: string | null;
  identityConfirmed: boolean;
  onStepUpRequired: () => void;
  onBusyChange?: (busy: boolean) => void;
}): ReactElement | null {
  const ready = memberId !== null && identityConfirmed;
  const listQ = useHelplinePeerRequests(pariwarId, memberId, ready);
  const dirtyReplies = useRef(new Set<string>());
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  const reportBusy = useCallback((pingId: string, busy: boolean) => {
    if (busy) dirtyReplies.current.add(pingId);
    else dirtyReplies.current.delete(pingId);
    busyCallback.current?.(dirtyReplies.current.size > 0);
  }, []);
  if (!ready) return null;
  // A failed background refresh must not dispose already loaded editors and their queued choices.
  // Authentication / permission refusals still replace the sensitive surface.
  const retainLoaded = listQ.data !== undefined && (!(listQ.error instanceof ApiError) ||
    listQ.error.status >= 500 || listQ.error.status === 429 || listQ.error.code === 'auth.step_up_required');
  if (listQ.isError && !retainLoaded) {
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
      {listQ.isError && <p role="alert" className="text-sm">The requests could not be loaded just now.</p>}
      {listQ.isError && listQ.error instanceof ApiError && listQ.error.code === 'auth.step_up_required' && (
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onStepUpRequired}>Confirm with a code</button>
      )}
      <p className="text-xs opacity-70">
        Read each question to the caller and record their answer. Every answer is saved as you go. Only staff who check the
        claim see these answers — never the family.
      </p>
      {items.map((item) => (
        <PeerRequestCard key={item.pingId} pariwarId={pariwarId} memberId={memberId} item={item} onStepUpRequired={onStepUpRequired} onBusyChange={reportBusy} />
      ))}
    </section>
  );
}

function PeerRequestCard({
  pariwarId,
  memberId,
  item,
  onStepUpRequired,
  onBusyChange,
}: {
  pariwarId: string;
  memberId: string | null;
  item: PeerRequestDetailResponse;
  onStepUpRequired: () => void;
  onBusyChange: (pingId: string, busy: boolean) => void;
}): ReactElement {
  const save = useHelplineSavePeerAnswer(pariwarId, memberId);
  const submit = useHelplineSubmitPeerReply(pariwarId, memberId);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const router = useRouter({ warn: false });
  const [dates, setDates] = useState<Record<string, string>>({});
  const saveRef = useRef(save.mutateAsync);
  saveRef.current = save.mutateAsync;
  const stepUpRef = useRef(onStepUpRequired);
  stepUpRef.current = onStepUpRequired;
  const initialAnswers = useRef(item.answers);
  const [editor] = useState(() => new PeerAnswerEditor(item.answers, {
    save: (task) => saveRef.current({ pingId: item.pingId, questionKey: task.questionKey, value: task.value }),
    newKey: () => crypto.randomUUID(),
    shouldRetry: () => false,
    wait: () => Promise.resolve(),
    questions: item.questionnaire.pages.flatMap((p) => p.questions),
  }));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const answers = state.answers;
  useEffect(() => {
    editor.activate(initialAnswers.current);
    return () => editor.dispose();
  }, [editor]);
  useEffect(() => editor.replaceFromServer(item.answers), [editor, item.answers]);
  useEffect(() => {
    const notify = () => {
      const current = editor.getSnapshot();
      onBusyChange(item.pingId, submitting.current || current.pending > 0 || current.failed.size > 0);
    };
    notify();
    const unsubscribe = editor.subscribe(notify);
    return () => { unsubscribe(); onBusyChange(item.pingId, false); };
  }, [editor, item.pingId, onBusyChange]);
  useEffect(() => {
    if (!router) return;
    const busy = () => {
      const current = editor.getSnapshot();
      return submitting.current || current.pending > 0 || current.failed.size > 0;
    };
    return router.history.block({
      blockerFn: ({ nextLocation }) => {
        // Authentication redirects must clear the sensitive screen even if a save is unresolved.
        if (nextLocation.pathname === '/login' || !busy()) return false;
        setStatus('Please finish saving these answers before leaving.');
        return true;
      },
      enableBeforeUnload: busy,
    });
  }, [editor, router]);
  useEffect(() => {
    if (state.error === null) {
      if (!locked) setStatus(null);
      return;
    }
    if (state.error instanceof ApiError && state.error.code === 'auth.step_up_required') stepUpRef.current();
    setStatus(failureText(state.error));
  }, [state.error, state.pending, locked]);

  const record = (questionKey: string, value: PeerRequestAnswerValue): void => {
    if (locked || submitting.current) return;
    setStatus(null);
    editor.save(questionKey, value);
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
              {current !== undefined && 'unavailable' in current && <p role="alert">Could not be shown just now.</p>}
              {q.kind === 'date' && (
                <div className="flex gap-2">
                  <input
                    disabled={locked || isSubmitting}
                    type="date"
                    aria-label={q.words.en}
                    className="rounded border px-2 py-1 text-sm"
                    value={dates[q.key] ?? (current !== undefined && 'date' in current ? current.date : '')}
                    onChange={(e) => setDates((d) => ({ ...d, [q.key]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-sm"
                    disabled={locked || isSubmitting || !dates[q.key]}
                    onClick={() => {
                      record(q.key, { date: dates[q.key]! });
                      setDates(d => { const next = { ...d }; delete next[q.key]; return next; });
                    }}
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
                      disabled={locked || isSubmitting}
                      aria-pressed={selected}
                      className={`rounded border px-2 py-1 text-sm ${selected ? 'font-semibold' : ''}`}
                      onClick={() => {
                        if (q.kind !== 'multi') return record(q.key, { codes: [o.code] });
                        const latest = editor.getSnapshot().answers.get(q.key);
                        const liveCodes = latest !== undefined && 'codes' in latest ? latest.codes : [];
                        const next = o.exclusive
                          ? [o.code]
                          : liveCodes.includes(o.code)
                            ? liveCodes.filter((c) => c !== o.code)
                            : [...liveCodes.filter((c) => !q.options.find((x) => x.code === c)?.exclusive), o.code];
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
          disabled={locked || !answers.has('has_died') || state.pending > 0 || state.failed.size > 0 || isSubmitting}
          onClick={() => {
            const current = editor.getSnapshot();
            if (current.pending > 0 || current.failed.size > 0 || locked || submitting.current) return;
            submitting.current = true;
            setIsSubmitting(true);
            onBusyChange(item.pingId, true);
            void submit
              .mutateAsync(item.pingId)
              .then(() => { setLocked(true); setStatus('Sent — the answers are locked.'); })
              .catch((err: unknown) => {
                if (err instanceof ApiError && err.code === 'auth.step_up_required') onStepUpRequired();
                setStatus(failureText(err));
              })
              .finally(() => {
                submitting.current = false;
                setIsSubmitting(false);
                const current = editor.getSnapshot();
                onBusyChange(item.pingId, current.pending > 0 || current.failed.size > 0);
              });
          }}
        >
          Submit
        </button>
        <span role="status" className="text-sm">
          {status ?? (state.pending > 0 ? 'Saving…' : state.saveLine === 'saved' ? 'Saved' : state.saveLine === 'failed' ? 'Not saved — please try again.' : '')}
        </span>
        {state.failed.size > 0 && <button type="button" onClick={() => { setStatus(null); editor.retryFailed(); }}>Retry saving</button>}
      </div>
    </article>
  );
}
