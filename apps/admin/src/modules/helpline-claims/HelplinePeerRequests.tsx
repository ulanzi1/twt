// `<HelplinePeerRequests>` — "Requests to confirm a death": the helpline records the answers of a neighbour who phones
// (Story 6.27a PM12, PM25 (b); `2026-10-10-311`).
//
// The SELECTED member is the CALLER — one of the members the Trust asked about a reported death. The panel lists THEIR open
// requests (the server lists ONLY requests the Trust has TEXTED — ⇒ EMPTY until 6.27c texts anyone, so the helpline can
// ⛔ never name a reported death to a member the Trust has ⛔ not texted), renders the SAME served questionnaire the app does
// (English words — the admin console is English-only), and records each answer as the caller gives it (`saved_via =
// 'helpline'`; the operator is the saver). ⭐ The operator sees ONLY that neighbour's answers — ⛔ another neighbour's,
// ⛔ the warning lines, ⛔ the counts — and every write is BOUND to the caller (the server 404s another neighbour's ping —
// second-pass review S12). Submit locks the reply for the app too.
// 6.3's chain: every call needs the operator's fresh `claim_file` step-up — a 403 opens the page's step-up panel, and a
// successful step-up re-reads the list (review S34).
// ⭐ Second-pass review: the operator is ⛔ never stuck — a failed load can be retried, a refused answer DISCARDED (S34);
// a request that finishes (sent / no longer open) leaves its OUTCOME line behind when it leaves the list (S34); a typed but
// unsaved date is an unresolved edit, ⛔ silently dropped (S35); Submit waits for the version's REQUIRED questions (S36);
// single choices are a labelled radio group, multi choices checkboxes (S30); the copy is the module catalog's (S41).
// ⚠ Per-row state comes from each call's OWN promise (`mutateAsync`) — TanStack's per-`mutate` callbacks fire for the LATEST
// call only ([[project_tanstack_mutate_callbacks_latest_only]]).

import type { PeerRequestAnswerValue, PeerRequestDetailResponse, PeerRequestLiveAnswer, PeerRequestQuestion } from '@twt/contracts';
import { PEER_REQUEST_STALE_CODE } from '@twt/contracts';
import { PeerAnswerEditor } from '@twt/api-client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import { useRouter } from '@tanstack/react-router';

import { ApiError } from '../../api/client.js';
import { useHelplinePeerRequests, useHelplineSavePeerAnswer, useHelplineSubmitPeerReply } from '../../api/hooks.js';
import { resolveEn } from './i18n-en.js';

/** The earliest date a neighbour may give (the server's `EARLIEST_ANSWER_DATE`). */
const EARLIEST_DATE = '1900-01-01';

/** Today in IST — a date answer is ⛔ never in the future (the server re-checks). */
function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Is `q` shown, given the caller's live answers? (The server re-checks every save.) */
export function isShownFor(q: PeerRequestQuestion, answers: ReadonlyMap<string, PeerRequestLiveAnswer['value']>): boolean {
  if (q.showIf === null) return true;
  const parent = answers.get(q.showIf.key);
  return parent !== undefined && 'codes' in parent && parent.codes.some((c) => q.showIf!.anyOf.includes(c));
}

/** A refusal that ENDS the request for this caller (it leaves the list). */
function isTerminal(err: unknown): boolean {
  return err instanceof ApiError && ['peer_request.no_longer_open', 'peer_request.submitted', 'peer_request.not_found'].includes(err.code ?? '');
}

function failureText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'peer_request.no_longer_open') return resolveEn('helpline.peer.failure.noLongerOpen');
    if (err.code === 'peer_request.submitted') return resolveEn('helpline.peer.failure.submitted');
    if (err.code === 'peer_request.not_found') return resolveEn('helpline.peer.failure.notFound');
    if (err.code === 'peer_request.invalid_answer') return resolveEn('helpline.peer.failure.invalid');
  }
  return resolveEn('helpline.peer.notSaved');
}

type Outcome = { readonly memberId: string; readonly pingId: string; readonly text: string };

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
  // The OUTCOME of a request that finished on this call — kept after the request leaves the list (review S34).
  const [outcomes, setOutcomes] = useState<readonly Outcome[]>([]);
  const onFinished = useCallback((pingId: string, memberName: string, text: string) => {
    if (memberId === null) return;
    const line = resolveEn('helpline.peer.outcome', { member: memberName || resolveEn('helpline.peer.about.fallback'), outcome: text });
    setOutcomes((prev) => [...prev.filter((o) => o.pingId !== pingId), { memberId, pingId, text: line }]);
  }, [memberId]);
  if (!ready) return null;
  const title = resolveEn('helpline.peer.title');
  const finished = outcomes.filter((o) => o.memberId === memberId);
  const outcomeLines = finished.length > 0 && (
    <ul role="status" className="text-sm">
      {finished.map((o) => <li key={o.pingId}>{o.text}</li>)}
    </ul>
  );
  // A failed background refresh must not dispose already loaded editors and their queued choices.
  // Authentication / permission refusals still replace the sensitive surface.
  const retainLoaded = listQ.data !== undefined && (!(listQ.error instanceof ApiError) ||
    listQ.error.status >= 500 || listQ.error.status === 429 || listQ.error.code === 'auth.step_up_required');
  if (listQ.isError && !retainLoaded) {
    if (listQ.error instanceof ApiError && listQ.error.code === 'auth.step_up_required') {
      return (
        <section aria-label={title} className="rounded border p-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          {outcomeLines /* ⛔ lost when the post-Submit re-read asks for a step-up (third-pass review U13 (b)) */}
          <p className="mt-2 text-sm">{resolveEn('helpline.peer.stepup.prompt')}</p>
          <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={onStepUpRequired}>
            {resolveEn('helpline.peer.stepup.button')}
          </button>
        </section>
      );
    }
    return (
      <section aria-label={title} className="rounded border p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {outcomeLines}
        <p role="alert" className="mt-2 text-sm">{resolveEn('helpline.peer.load.failed')}</p>
        <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={() => void listQ.refetch()}>
          {resolveEn('helpline.peer.load.retry')}
        </button>
      </section>
    );
  }
  const items = listQ.data?.items ?? [];
  if (items.length === 0 && !outcomeLines) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {outcomeLines}
      {listQ.isError && <p role="alert" className="text-sm">{resolveEn('helpline.peer.load.failed')}</p>}
      {listQ.isError && listQ.error instanceof ApiError && listQ.error.code === 'auth.step_up_required' && (
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onStepUpRequired}>{resolveEn('helpline.peer.stepup.button')}</button>
      )}
      {items.length > 0 && <p className="text-xs opacity-70">{resolveEn('helpline.peer.intro')}</p>}
      {items.map((item) => (
        <PeerRequestCard
          key={item.pingId}
          pariwarId={pariwarId}
          memberId={memberId}
          item={item}
          onStepUpRequired={onStepUpRequired}
          onBusyChange={reportBusy}
          onFinished={onFinished}
        />
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
  onFinished,
}: {
  pariwarId: string;
  memberId: string | null;
  item: PeerRequestDetailResponse;
  onStepUpRequired: () => void;
  onBusyChange: (pingId: string, busy: boolean) => void;
  onFinished: (pingId: string, memberName: string, text: string) => void;
}): ReactElement {
  const save = useHelplineSavePeerAnswer(pariwarId, memberId);
  const submit = useHelplineSubmitPeerReply(pariwarId, memberId);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  // ONE key for this reply's Submit: a retry after a lost response is a replay (200), ⛔ "already sent" (review S18).
  const submitKey = useRef<string | null>(null);
  const router = useRouter({ warn: false });
  const [dates, setDates] = useState<Record<string, string>>({});
  const datesRef = useRef(dates);
  datesRef.current = dates;
  const saveRef = useRef(save.mutateAsync);
  saveRef.current = save.mutateAsync;
  const stepUpRef = useRef(onStepUpRequired);
  stepUpRef.current = onStepUpRequired;
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const initialAnswers = useRef(item.answers);
  const allQuestions = item.questionnaire.pages.flatMap((p) => p.questions);
  // A 409 STALE (the save raced a change, or a parent could ⛔ be read just now) retries ITSELF, up to 3 times with a short
  // backoff — the value is usually already live (fourth-pass review V7). Anything else waits for the operator's Retry.
  // The budget is PER TASK (fifth-pass review W4 — one card-wide counter, reset only on a success, let one exhausted
  // stale disable every later retry): an automatic retry reuses its task's key, so a NEW key (a new edit, or the
  // operator's Retry, which mints one — W6) starts a fresh budget.
  const staleRetries = useRef(0);
  const staleFor = useRef<string | null>(null);
  const [editor] = useState(() => new PeerAnswerEditor(item.answers, {
    save: async (task) => {
      if (task.idempotencyKey !== staleFor.current) {
        staleFor.current = task.idempotencyKey;
        staleRetries.current = 0;
      }
      return saveRef.current({ pingId: item.pingId, questionKey: task.questionKey, value: task.value, idempotencyKey: task.idempotencyKey });
    },
    newKey: () => crypto.randomUUID(),
    shouldRetry: (err) => err instanceof ApiError && err.code === PEER_REQUEST_STALE_CODE && (staleRetries.current += 1) <= 3,
    wait: (attempt) => new Promise((resolve) => setTimeout(resolve, 300 * attempt)),
    questions: allQuestions,
  }));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const answers = state.answers;
  // Busy = a save in flight / failed, a Submit running, or a date TYPED but ⛔ saved (review S35).
  const isBusy = useCallback(() => {
    const current = editor.getSnapshot();
    return submitting.current || current.pending > 0 || current.failed.size > 0 || Object.keys(datesRef.current).length > 0;
  }, [editor]);
  useEffect(() => {
    editor.activate(initialAnswers.current);
    return () => editor.dispose();
  }, [editor]);
  useEffect(() => {
    editor.replaceFromServer(item.answers);
  }, [editor, item.answers]);
  useEffect(() => {
    const notify = () => onBusyChange(item.pingId, isBusy());
    notify();
    const unsubscribe = editor.subscribe(notify);
    return () => { unsubscribe(); onBusyChange(item.pingId, false); };
  }, [editor, item.pingId, onBusyChange, isBusy]);
  // A typed date changes "busy" too — reported WITHOUT the unmount cleanup above (third-pass review U13 (c): with `dates`
  // in that effect's deps every keystroke reported "not busy" for a moment).
  useEffect(() => {
    onBusyChange(item.pingId, isBusy());
  }, [dates, item.pingId, onBusyChange, isBusy]);
  useEffect(() => {
    if (!router) return;
    return router.history.block({
      blockerFn: ({ nextLocation }) => {
        // Authentication redirects must clear the sensitive screen even if a save is unresolved.
        if (nextLocation.pathname === '/login' || !isBusy()) return false;
        setStatus(resolveEn('helpline.peer.leave.blocked'));
        return true;
      },
      enableBeforeUnload: isBusy,
    });
  }, [isBusy, router]);
  useEffect(() => {
    if (state.error === null) {
      if (!locked) setStatus(null);
      return;
    }
    if (state.error instanceof ApiError && state.error.code === 'auth.step_up_required') stepUpRef.current();
    if (isTerminal(state.error)) finishedRef.current(item.pingId, item.memberName, failureText(state.error));
    setStatus(failureText(state.error));
  }, [state.error, state.pending, locked, item.pingId, item.memberName]);

  const record = (questionKey: string, value: PeerRequestAnswerValue): void => {
    if (locked || submitting.current) return;
    setStatus(null);
    editor.save(questionKey, value);
  };
  // The date inputs themselves (fifth-pass review W5): a native date input reads '' for a PARTIAL date AND fires ⛔ change
  // event while its value stays '' (empty → half-typed, or deleting a segment at a time) — so the field is also read on
  // BLUR and at Submit, and Clear resets the field itself (React rewrites ⛔ a DOM value it already thinks is '').
  const dateInputs = useRef(new Map<string, HTMLInputElement>());
  const clearDate = (key: string) => {
    const el = dateInputs.current.get(key);
    if (el && el.validity?.badInput) el.value = '';
    setDates((d) => { const next = { ...d }; delete next[key]; return next; });
  };
  /** Read ONE date input as it stands: partial ⇒ an unsaved '' edit; truly empty, or still the SAVED date ⇒ ⛔ edit
   *  (X1 — tabbing through a field that shows the saved date made a phantom "unsaved" date and blocked Submit). */
  const syncDate = (key: string, el: HTMLInputElement) => {
    const saved = editor.getSnapshot().answers.get(key);
    const savedDate = saved !== undefined && 'date' in saved ? saved.date : null;
    if (el.validity?.badInput) setDates((d) => ({ ...d, [key]: '' }));
    else if (el.value === '' || el.value === savedDate) clearDate(key);
    else setDates((d) => ({ ...d, [key]: el.value }));
  };
  /** A partial date sitting in an input the change events never reported (W5). */
  const partialDateKey = (): string | null => {
    for (const [key, el] of dateInputs.current) if (el.validity?.badInput) return key;
    return null;
  };

  const questions = allQuestions.filter((q) => isShownFor(q, answers));
  // Submit waits for EVERY required question the caller is shown — ⛔ a hard-coded key (review S36).
  const requiredAnswered = questions.filter((q) => !q.optional).every((q) => answers.has(q.key));
  const dirtyDates = Object.keys(dates).length > 0;
  const about = item.memberName || resolveEn('helpline.peer.about.fallback');
  const today = todayIst();
  return (
    <article aria-label={resolveEn('helpline.peer.about', { member: about })} className="rounded border p-3">
      <h3 className="font-semibold">{resolveEn('helpline.peer.about', { member: about })}</h3>
      <div className="mt-2 flex flex-col gap-3">
        {questions.map((q) => {
          const current = answers.get(q.key);
          const codes = current !== undefined && 'codes' in current ? current.codes : [];
          const legendId = `peer-q-${item.pingId}-${q.key}`;
          const single = q.kind !== 'multi';
          return (
            <fieldset key={q.key} className="flex flex-col gap-1">
              <legend id={legendId} className="text-sm font-medium">{q.words.en}</legend>
              {current !== undefined && 'unavailable' in current && <p role="alert">{resolveEn('helpline.peer.unavailable')}</p>}
              {q.kind === 'date' && (
                <div className="flex gap-2">
                  <input
                    disabled={locked || isSubmitting}
                    type="date"
                    min={EARLIEST_DATE}
                    max={today}
                    aria-label={q.words.en}
                    className="rounded border px-2 py-1 text-sm"
                    value={dates[q.key] ?? (current !== undefined && 'date' in current ? current.date : '')}
                    // A TRULY emptied field is ⛔ an unsaved date (U13 (a)); a PARTIAL date also reads '' but flags
                    // `badInput` — it stays an unsaved edit (V6), and BLUR catches what change events miss (W5).
                    ref={(el) => {
                      if (el) dateInputs.current.set(q.key, el);
                      else dateInputs.current.delete(q.key);
                    }}
                    onChange={(e) => syncDate(q.key, e.target)}
                    onBlur={(e) => syncDate(q.key, e.target)}
                  />
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-sm"
                    disabled={locked || isSubmitting || !dates[q.key] || dates[q.key]! < EARLIEST_DATE || dates[q.key]! > today}
                    onClick={() => {
                      record(q.key, { date: dates[q.key]! });
                      clearDate(q.key);
                    }}
                  >
                    {resolveEn('helpline.peer.date.save')}
                  </button>
                  {dates[q.key] !== undefined && (
                    <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => clearDate(q.key)}>
                      {resolveEn('helpline.peer.date.clear')}
                    </button>
                  )}
                </div>
              )}
              <div role={single ? 'radiogroup' : 'group'} aria-labelledby={legendId} className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const selected = codes.includes(o.code);
                  return (
                    <button
                      key={o.code}
                      type="button"
                      role={single ? 'radio' : 'checkbox'}
                      aria-checked={selected}
                      disabled={locked || isSubmitting}
                      className={`rounded border px-2 py-1 text-sm ${selected ? 'font-semibold' : ''}`}
                      onClick={() => {
                        // "I don't know the date" replaces a typed date (review S36).
                        if (q.kind === 'date') clearDate(q.key);
                        if (single) return record(q.key, { codes: [o.code] });
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
      {dirtyDates && <p role="alert" className="mt-2 text-sm">{resolveEn('helpline.peer.date.unsaved')}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          disabled={locked || !requiredAnswered || dirtyDates || state.pending > 0 || state.failed.size > 0 || isSubmitting}
          onClick={() => {
            const current = editor.getSnapshot();
            if (current.pending > 0 || current.failed.size > 0 || locked || submitting.current || Object.keys(datesRef.current).length > 0) return;
            // A partial date the events never reported holds Submit too (W5).
            const partial = partialDateKey();
            if (partial !== null) {
              setDates((d) => ({ ...d, [partial]: '' }));
              return;
            }
            submitting.current = true;
            setIsSubmitting(true);
            onBusyChange(item.pingId, true);
            submitKey.current ??= crypto.randomUUID();
            void submit
              .mutateAsync({ pingId: item.pingId, idempotencyKey: submitKey.current })
              .then(() => {
                setLocked(true);
                setStatus(resolveEn('helpline.peer.submitted'));
                finishedRef.current(item.pingId, item.memberName, resolveEn('helpline.peer.submitted'));
              })
              .catch((err: unknown) => {
                if (err instanceof ApiError && err.code === 'auth.step_up_required') onStepUpRequired();
                if (isTerminal(err)) finishedRef.current(item.pingId, item.memberName, failureText(err));
                setStatus(failureText(err));
              })
              .finally(() => {
                submitting.current = false;
                setIsSubmitting(false);
                onBusyChange(item.pingId, isBusy());
              });
          }}
        >
          {resolveEn('helpline.peer.submit')}
        </button>
        <span role="status" className="text-sm">
          {status ??
            (state.pending > 0
              ? resolveEn('helpline.peer.saving')
              : state.saveLine === 'saved'
                ? resolveEn('helpline.peer.saved')
                : state.saveLine === 'failed'
                  ? resolveEn('helpline.peer.notSaved')
                  : '')}
        </span>
        {state.failed.size > 0 && (
          <>
            <button type="button" onClick={() => { setStatus(null); editor.retryFailed(); }}>{resolveEn('helpline.peer.retry')}</button>
            <button type="button" onClick={() => { setStatus(null); editor.discardFailed(); }}>{resolveEn('helpline.peer.discard')}</button>
          </>
        )}
      </div>
    </article>
  );
}
