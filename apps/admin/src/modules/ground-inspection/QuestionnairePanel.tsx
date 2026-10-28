// `<QuestionnairePanel>` — the inspector's questions for the family at the ground inspection (Story 6.32, `2026-10-28-413`
// IQ8 (A) / IQ9 / IQ10 / IQ12; AC7). Rendered on a `scheduled`, ⛔ `certificate_check` assignment, BEFORE the completion.
//
//   · The QUESTIONS are the server's (`GET …/questionnaire` — the visit's pinned, else live, version): the English line and,
//     beneath it, the Hindi line for the inspector to read aloud. A 404 `ground_inspection.questionnaire_unavailable` ⇒ ⛔
//     panel at all (IQ12 — today's page, byte for byte).
//   · SAVED AS THEY GO (IQ8 (A) — "never lose what was typed to a momentary drop"): each answer saves on change through the
//     neighbours' `PeerAnswerEditor` (⛔ a fresh editor — FIFO, a later edit supersedes a queued one, dependants dropped when
//     their condition stops holding). A save that fails on the NETWORK or a 5xx is retried IN MEMORY (backoff, and at once
//     when the browser comes back `online`); a stale read is retried 3 times; anything else waits for "Try saving again".
//     Each answer shows `Saved` / `Saving…` / `Not saved — retrying`; leaving the tab with anything unsaved is warned.
//   · ⛔ BROWSER STORAGE of any kind (TR13): the cause and the illness are health information — Tier-1 at rest on the server;
//     a plaintext copy in `localStorage` / `sessionStorage` / IndexedDB on a staff laptop would defeat that. A grep pin
//     (`tests/ground-inspection-questionnaire.test.tsx`) keeps this module free of all three.
//   · ⛔ NOTHING here gates the completion (I1): every question is optional, and `CompleteAction` reads ⛔ of this.

import { PeerAnswerEditor } from '@twt/api-client';
import type { PeerRequestLiveAnswer, PeerRequestQuestion } from '@twt/contracts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { ApiError } from '../../api/client.js';
import * as api from '../../api/client.js';
import { resolveEn as t } from './i18n-en.js';

const QUESTIONNAIRE_ROOT = 'ground-inspection-questionnaire';
const UNAVAILABLE_CODE = 'ground_inspection.questionnaire_unavailable';
const STALE_CODE = 'ground_inspection.questionnaire_stale';
/** The longest wait between two automatic retries of a save that failed on the network. */
const MAX_BACKOFF_MS = 30_000;

type LiveValue = PeerRequestLiveAnswer['value'];

/** The GI wire's answer value in the editor's vocabulary (`{ codes }` / `{ unavailable: true }`). */
function toLive(answers: api.GroundInspectionQuestionnaireT['answers']): PeerRequestLiveAnswer[] {
  return answers.map((a) => ({
    questionKey: a.questionKey,
    value: a.value.kind === 'codes' ? { codes: a.value.codes } : { unavailable: true as const },
    savedAt: '',
  }));
}

/** Is `q` shown, given the live answers? (The server re-checks every save.) — the helpline screen's rule. */
export function isQuestionShown(q: PeerRequestQuestion, answers: ReadonlyMap<string, LiveValue>): boolean {
  if (q.showIf === null) return true;
  const parent = answers.get(q.showIf.key);
  return parent !== undefined && 'codes' in parent && parent.codes.some((c) => q.showIf!.anyOf.includes(c));
}

/** A failure worth retrying by itself, without limit: ⛔ an answer from the server (the network), or a 5xx. (A STALE read
 *  is retried too, but only 3 times per edit — the editor's caller counts it.) */
export function isRetryableSaveError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status >= 500;
}

/** Wait `attempt`'s backoff — or less: the browser coming back `online` ends the wait at once. */
function waitForRetry(attempt: number): Promise<void> {
  const ms = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(attempt - 1, 5));
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('online', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    window.addEventListener('online', done);
  });
}

function sameCodes(a: LiveValue | undefined, b: LiveValue | undefined): boolean {
  if (a === undefined || b === undefined || !('codes' in a) || !('codes' in b)) return a === b;
  return a.codes.length === b.codes.length && [...a.codes].sort().join(',') === [...b.codes].sort().join(',');
}

function saveErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'questionnaire.answer_invalid') return t('gi.questionnaire.error.answer_invalid');
    if (err.code === 'ground_inspection.not_active') return t('gi.questionnaire.error.not_active');
    if (err.code === 'ground_inspection.not_allowed') return t('gi.questionnaire.error.not_allowed');
  }
  return t('gi.questionnaire.state.failed');
}

export function QuestionnairePanel(props: { pariwarId: string; claimCaseId: string; groundInspectionId: string }): ReactElement | null {
  const { pariwarId, claimCaseId, groundInspectionId } = props;
  const query = useQuery({
    queryKey: [QUESTIONNAIRE_ROOT, pariwarId, claimCaseId, groundInspectionId] as const,
    queryFn: () => api.getGroundInspectionQuestionnaire(pariwarId, claimCaseId, groundInspectionId),
    // The answers are the server's — ⛔ refetched behind an edit (the editor is the source while the panel is open).
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isError && query.error instanceof ApiError && query.error.status === 404 && query.error.code === UNAVAILABLE_CODE) return null;
  if (query.isPending) return <p className="text-sm opacity-70">{t('gi.questionnaire.loading')}</p>;
  if (query.isError) {
    return (
      <div className="flex flex-col gap-1 text-sm" data-testid="gi-questionnaire-load-failed">
        <p role="alert" className="text-red-600">{t('gi.questionnaire.loadFailed')}</p>
        <button type="button" className="self-start rounded border px-2 py-1" onClick={() => void query.refetch()}>
          {t('gi.questionnaire.retryLoad')}
        </button>
      </div>
    );
  }
  if (!query.data.open) return null;
  return <QuestionnaireEditor {...props} data={query.data} />;
}

function QuestionnaireEditor(props: {
  pariwarId: string;
  claimCaseId: string;
  groundInspectionId: string;
  data: api.GroundInspectionQuestionnaireT;
}): ReactElement {
  const { pariwarId, claimCaseId, groundInspectionId, data } = props;
  const questions = data.questionnaire.pages.flatMap((p) => p.questions);
  // The server's last ACKNOWLEDGED value per question — what `Saved` means.
  const saved = useRef(new Map<string, LiveValue>(toLive(data.answers).map((a) => [a.questionKey, a.value])));
  // The stale budget is PER EDIT (the helpline screen's W4): an automatic retry reuses its task's key; a new edit or the
  // inspector's "Try saving again" mints a new one and starts afresh.
  const staleFor = useRef<string | null>(null);
  const staleCount = useRef(0);
  const nextKey = useRef(0);
  const [editor] = useState(
    () =>
      new PeerAnswerEditor(toLive(data.answers), {
        save: async (task) => {
          if (task.idempotencyKey !== staleFor.current) {
            staleFor.current = task.idempotencyKey;
            staleCount.current = 0;
          }
          const codes = 'codes' in task.value ? task.value.codes : [];
          const r = await api.saveGroundInspectionAnswer(pariwarId, claimCaseId, groundInspectionId, task.questionKey, codes);
          const next = new Map(saved.current);
          next.set(task.questionKey, { codes: [...codes] });
          for (const k of r.supersededDependants) next.delete(k);
          saved.current = next;
          return { answers: [...next].map(([questionKey, value]) => ({ questionKey, value, savedAt: '' })) };
        },
        // ⛔ an Idempotency-Key on the wire (last write wins — IQ10); the editor's task key only scopes the stale budget.
        newKey: () => String((nextKey.current += 1)),
        shouldRetry: (err) =>
          err instanceof ApiError && err.code === STALE_CODE ? (staleCount.current += 1) <= 3 : isRetryableSaveError(err),
        wait: waitForRetry,
        questions,
      }),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  // The helpline screen's pattern: activate ONCE (Strict Mode's cleanup / setup re-activates it), and take a later server
  // read through `replaceFromServer` — ⛔ a dispose (it drops the editor's listeners and every unsent edit).
  const initialAnswers = useRef(data.answers);
  useEffect(() => {
    editor.activate(toLive(initialAnswers.current));
    return () => editor.dispose();
  }, [editor]);
  useEffect(() => {
    editor.replaceFromServer(toLive(data.answers));
  }, [editor, data.answers]);

  const unsaved = state.pending > 0 || state.failed.size > 0;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const shown = questions.filter((q) => isQuestionShown(q, state.answers));
  const choose = (q: PeerRequestQuestion, code: string, checked: boolean): void => {
    const current = state.answers.get(q.key);
    const codes = current !== undefined && 'codes' in current ? current.codes : [];
    if (q.kind !== 'multi') {
      editor.save(q.key, { codes: [code] });
      return;
    }
    const option = q.options.find((o) => o.code === code);
    const exclusive = q.options.filter((o) => o.exclusive).map((o) => o.code);
    let next: string[];
    if (!checked) next = codes.filter((c) => c !== code);
    else if (option?.exclusive) next = [code];
    else next = [...codes.filter((c) => !exclusive.includes(c)), code];
    // A multi answer cannot be EMPTIED (every question is optional — an unticked list keeps its last saved choice).
    if (next.length > 0) editor.save(q.key, { codes: next });
  };
  const lineOf = (key: string): string | null => {
    const current = state.answers.get(key);
    if (current === undefined) return null;
    if (state.failed.has(key)) return null; // the error line says it
    if (sameCodes(current, saved.current.get(key))) return t('gi.questionnaire.state.saved');
    return state.saveLine === 'retrying' ? t('gi.questionnaire.state.retrying') : t('gi.questionnaire.state.saving');
  };

  return (
    <section aria-label={t('gi.questionnaire.region')} className="flex flex-col gap-3 rounded border p-3 text-sm" data-testid="gi-questionnaire">
      <p className="font-medium">{t('gi.questionnaire.region')}</p>
      <p className="text-xs opacity-80" data-testid="gi-questionnaire-optional">{t('gi.questionnaire.optional')}</p>
      {shown.map((q) => {
        const current = state.answers.get(q.key);
        const codes = current !== undefined && 'codes' in current ? current.codes : [];
        const line = lineOf(q.key);
        const name = `giq-${groundInspectionId}-${q.key}`;
        return (
          <fieldset key={q.key} className="flex flex-col gap-1" data-testid={`gi-questionnaire-${q.key}`}>
            <legend className="font-medium">{q.words.en}</legend>
            <p lang="hi" className="text-xs opacity-80" data-testid={`gi-questionnaire-${q.key}-hi`}>
              <span className="sr-only">{t('gi.questionnaire.hindi')} </span>
              {q.words.hi}
            </p>
            {current !== undefined && 'unavailable' in current && <p role="alert">{t('gi.questionnaire.unavailable')}</p>}
            {q.options.map((o) => (
              <label key={o.code} className="flex items-start gap-2">
                <input
                  type={q.kind === 'multi' ? 'checkbox' : 'radio'}
                  name={name}
                  checked={codes.includes(o.code)}
                  onChange={(e) => choose(q, o.code, e.target.checked)}
                />
                <span>
                  {o.words.en}
                  <span lang="hi" className="block text-xs opacity-70">{o.words.hi}</span>
                </span>
              </label>
            ))}
            {line !== null && (
              <span className="text-xs opacity-70" data-testid={`gi-questionnaire-${q.key}-state`}>{line}</span>
            )}
            {state.failed.has(q.key) && (
              <span role="alert" className="text-xs text-red-600">{saveErrorText(state.error)}</span>
            )}
          </fieldset>
        );
      })}
      {state.failed.size > 0 && (
        <button type="button" className="self-start rounded border px-2 py-1" onClick={() => editor.retryFailed()}>
          {t('gi.questionnaire.retry')}
        </button>
      )}
      {unsaved && <p role="status" className="text-xs text-amber-700" data-testid="gi-questionnaire-unsaved">{t('gi.questionnaire.unsaved')}</p>}
      <p className="text-xs opacity-80">
        {data.questionnaire.closingNote.en}
        <span lang="hi" className="block">{data.questionnaire.closingNote.hi}</span>
      </p>
    </section>
  );
}
