// The QUESTIONNAIRES page — Story 6.33 (`2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE7 / QE9 / QE10 / QE11 / QE16).
//
// ONE page, both kinds: the version IN FORCE for this Pariwar (own, for every Pariwar, or the Panel's code version — and,
// when the resolver skipped one, "In force: X — failed validation / out of date, serving Y" — R8); every version with its
// history (a step outside this Pariwar's view reads "Proposed and approved in another Pariwar" — QE11); a read-only render
// (the English line, the Hindi line beneath) with badges and the change against the base; the editor (from the version in
// force; the Panel's questions shown LOCKED; the C12 guidance); the acts by key — propose, approve (both ticks), return (a
// note), withdraw (the author), make live (this Pariwar / all — the Pariwars keeping their own version listed; the base-moved
// acknowledgement; the counsel warning for the kind), direct, revert. A 403 `auth.step_up_required` opens the step-up and
// re-runs the act (the `ApprovalWarningReasonsPage` precedent). The Super Admin reads the GLOBAL list / detail. The server is
// the boundary for every act — this page only hides what its reader can never do.
// ⚠ Each act runs on its OWN promise (`mutateAsync`) — TanStack's per-`mutate` callbacks fire for the LATEST call only, so a
// second click would drop the first one's step-up prompt / `onDone` ([[project_tanstack_mutate_callbacks_latest_only]]).

import type {
  QuestionnaireDraftPage,
  QuestionnaireQuestionView,
  QuestionnaireStepResponse,
  QuestionnaireVersionDetailResponse,
  QuestionnaireVersionKind,
  QuestionnaireVersionSummary,
} from '@twt/contracts';
import { useEffect, useState, type ReactElement } from 'react';

import * as api from '../../api/client.js';
import { ApiError } from '../../api/client.js';
import {
  usePariwarsKeepingOwnQuestionnaire,
  useQuestionnaireChainAct,
  useQuestionnaireVersion,
  useQuestionnaireVersions,
  useRequestStepUp,
  useSession,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { formatIst } from '../correction-chase/ist.js';
import { questionnaireVersionsEn as t, type CounselScope } from './i18n-en.js';

export const QUESTIONNAIRE_PUBLISH_KEY = 'questionnaire.publish';
const STEP_UP_CONTEXT = 'questionnaire_publish';
const KINDS: readonly QuestionnaireVersionKind[] = ['peer_mesh', 'ground_inspection'];

const newKey = (): string => crypto.randomUUID();

/** RV21 — one failing field of the API's zod refusal (`instancePath` "/pages/1/questions/0/key" + its `message`). */
function issueLine(issue: unknown): string | null {
  if (typeof issue !== 'object' || issue === null) return null;
  const { instancePath, message } = issue as { instancePath?: unknown; message?: unknown };
  const field = typeof instancePath === 'string' ? instancePath.replace(/^\//, '').split('/').filter((p) => p !== '').join(' › ') : '';
  const why = typeof message === 'string' ? message : '';
  if (field === '' && why === '') return null;
  return field === '' ? why : why === '' ? field : `${field} — ${why}`;
}

function errorLines(err: unknown): string[] {
  if (err instanceof ApiError) {
    const head = t.errors[err.code ?? ''] ?? t.genericError;
    const details = err.details as { problems?: unknown; issues?: unknown } | undefined;
    const problems = details?.problems;
    if (Array.isArray(problems)) return [head, ...problems.map(String)];
    // A 400 `request.validation` names the failing field(s) (the first few — a malformed page can fail dozens).
    const issues = details?.issues;
    if (err.code === 'request.validation' && Array.isArray(issues)) {
      return [head, ...issues.slice(0, 5).map(issueLine).filter((l): l is string => l !== null)];
    }
    return [head];
  }
  return [t.genericError];
}

/** The step-up block — mounts on a 403 `auth.step_up_required`; on verify it re-runs the act it was given. */
function StepUp({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }): ReactElement {
  const request = useRequestStepUp();
  const verify = useVerifyStepUp();
  const [otp, setOtp] = useState('');
  return (
    <div className="flex flex-col gap-2 rounded border border-dashed p-3" data-testid="qv-step-up">
      <p role="alert" className="text-sm">{t.stepUpIntro}</p>
      <button type="button" className="w-fit rounded border px-3 py-1 text-sm" disabled={request.isPending} onClick={() => request.mutate(STEP_UP_CONTEXT)}>
        {t.stepUpSend}
      </button>
      {request.isError && <p role="alert" className="text-xs text-status-fail-fg">{t.stepUpSendError}</p>}
      {request.isSuccess && (
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs">
            {t.stepUpCode}
            <input className="rounded border px-2 py-1 text-sm" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </label>
          <button
            type="button"
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={verify.isPending || otp.trim() === ''}
            onClick={() => verify.mutate(otp.trim(), { onSuccess: onVerified })}
          >
            {t.stepUpVerify}
          </button>
        </div>
      )}
      {verify.isError && <p role="alert" className="text-xs text-status-fail-fg">{t.stepUpVerifyError}</p>}
      <button type="button" className="w-fit text-xs underline" onClick={onCancel}>
        {t.cancel}
      </button>
    </div>
  );
}

/** One question, read-only: the English line, the Hindi line beneath, its badges and its change marker (QE16). */
function QuestionView({ q, outOfDate }: { q: QuestionnaireQuestionView; outOfDate: boolean }): ReactElement {
  return (
    <li className="flex flex-col gap-1 rounded border p-2" data-testid={`qv-question-${q.key}`}>
      <div className="flex flex-wrap gap-1 text-xs">
        <span className="rounded bg-gray-100 px-1">{q.ruled ? t.badge.ruled : t.badge.staff}</span>
        {q.health && q.counselPending && <span className="rounded bg-amber-100 px-1">{t.badge.healthPending}</span>}
        {q.sensitive && <span className="rounded bg-gray-100 px-1">{t.badge.encrypted}</span>}
        {outOfDate && <span className="rounded bg-amber-100 px-1">{t.badge.outOfDate}</span>}
        {q.change !== null && <span className="rounded bg-blue-50 px-1" data-testid={`qv-change-${q.key}`}>{t.change[q.change]}</span>}
      </div>
      <p className="font-medium">{q.words.en}</p>
      <p lang="hi" className="text-xs opacity-80">
        <span className="sr-only">{t.hindi} </span>
        {q.words.hi}
      </p>
      <ul className="ml-4 list-disc text-xs">
        {q.options.map((o) => (
          <li key={o.code}>
            {o.words.en} <span lang="hi" className="opacity-70">/ {o.words.hi}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function History({ v, pariwarId }: { v: QuestionnaireVersionSummary; pariwarId: string }): ReactElement {
  return (
    <ul className="text-xs" data-testid={`qv-history-${v.versionId}`}>
      {v.historyElsewhere && <li data-testid="qv-history-elsewhere">{t.historyElsewhere}</li>}
      {v.direct && <li>{t.direct}{v.reason !== null ? ` — ${t.reason(v.reason)}` : ''}</li>}
      {v.steps.map((s, i) => (
        <li key={i}>
          {t.step[s.step]} — {s.actorDisplay}, {formatIst(s.at)}
          {s.step === 'made_live' || s.step === 'pariwar_reverted' ? ` ${t.forTarget(s.targetPariwarId, pariwarId)}` : ''}
          {s.note !== null ? ` — “${s.note}”` : ''}
        </li>
      ))}
    </ul>
  );
}

/** Which block asked for the acknowledgement: the make-live of a version, or the editor's direct path (RV5 / RV14). */
type MovedVia = 'make_live' | 'direct';

/** The newest Panel (code) version of `kind` in the list — the one whose ruled questions are the CURRENT ones (QE5). */
function newestCodeVersionId(versions: readonly QuestionnaireVersionSummary[], kind: QuestionnaireVersionKind): string | null {
  let newest: QuestionnaireVersionSummary | null = null;
  for (const v of versions) if (v.kind === kind && v.stage === 'code' && (newest === null || v.version > newest.version)) newest = v;
  return newest?.versionId ?? null;
}

export function QuestionnaireVersionsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const session = useSession();
  const isSuperAdmin = session.data?.nationalGrants.includes(QUESTIONNAIRE_PUBLISH_KEY) ?? false;
  const list = useQuestionnaireVersions(pariwarId, isSuperAdmin);
  const act = useQuestionnaireChainAct();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: QuestionnaireVersionKind; baseVersionId: string } | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [warnings, setWarnings] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState(false);
  // The base-moved acknowledgement belongs to ONE block (the version's make-live, or the editor's direct path) and to ONE
  // version / editor: it is cleared when another version is viewed and when the editor opens or closes (RV14).
  const [baseMovedVia, setBaseMovedVia] = useState<MovedVia | null>(null);

  /** Run one act: on a step-up 403 keep it for after the verify; on base-moved ask for the acknowledgement. */
  const run: Run = (fn, onDone, via) => {
    // The previous act's outcome — its error, its C9 warnings, its "Saved" — is not this act's (RP14).
    setError(null);
    setWarnings([]);
    setSaved(false);
    void act.mutateAsync(fn).then(
      (r) => {
        setWarnings(r.warnings);
        setSaved(true);
        setBaseMovedVia(null);
        onDone?.(r);
      },
      (err: unknown) => {
        if (err instanceof ApiError && err.code === 'auth.step_up_required') setPending(() => () => run(fn, onDone, via));
        else if (err instanceof ApiError && err.code === 'questionnaire.base_moved' && via !== undefined) setBaseMovedVia(via);
        else setError(err);
      },
    );
  };
  const openEditor = (next: { kind: QuestionnaireVersionKind; baseVersionId: string }): void => {
    setBaseMovedVia(null);
    setEditing(next);
  };
  const closeEditor = (): void => {
    setBaseMovedVia(null);
    setEditing(null);
  };

  if (session.isLoading || list.isLoading) return <p role="status">{t.loading}</p>;
  if (list.isError && !list.data) {
    return <p role="alert">{list.error instanceof ApiError && list.error.isForbidden ? t.forbidden : t.loadError}</p>;
  }
  // A paused (offline) query has NO data and is not loading either (RV19).
  if (!list.data) return <p role="status">{t.loading}</p>;
  const data = list.data;

  return (
    <div className="flex flex-col gap-4" data-testid="questionnaire-versions-page">
      <h1 className="text-lg font-semibold">{t.heading}</h1>
      <p className="text-sm">{t.intro}</p>
      {pending !== null && (
        <StepUp
          onVerified={() => {
            const retry = pending;
            setPending(null);
            retry();
          }}
          onCancel={() => setPending(null)}
        />
      )}
      {error !== null && (
        <div role="alert" className="text-sm text-status-fail-fg" data-testid="qv-error">
          {errorLines(error).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
      {/* RV29 — ONE live region, always present: the act's confirmation and the validator's C9 warnings are said when they arrive. */}
      <div role="status" data-testid="qv-status">
        {saved && <p className="text-sm" data-testid="qv-saved">{t.saved}</p>}
        {warnings.length > 0 && (
          <div className="text-sm text-amber-700" data-testid="qv-warnings">
            <p>{t.warningsHeading}</p>
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
      </div>
      {KINDS.map((kind) => {
        const inForce = data.inForce.find((x) => x.kind === kind);
        const versions = data.versions.filter((v) => v.kind === kind && v.stage !== 'code');
        // QE7 (d) — a skipped OWN version is still revertable (the page says "out of date, serving Y" for exactly that case).
        const hasOwn = inForce?.source === 'own' || (inForce?.skipped.some((s) => s.level === 'own') ?? false);
        return (
          <section key={kind} className="flex flex-col gap-2 rounded border p-3" aria-label={t.kinds[kind]} data-testid={`qv-kind-${kind}`}>
            <h2 className="font-semibold">{t.kinds[kind]}</h2>
            <p className="text-sm" data-testid={`qv-in-force-${kind}`}>{t.inForce(inForce?.versionId ?? null, inForce?.source ?? null)}</p>
            {inForce?.skipped.map((s) => (
              <p key={s.versionId} role="alert" className="text-sm text-amber-700" data-testid={`qv-skipped-${s.versionId}`}>
                {t.skipped(s.versionId, s.reason, inForce.versionId)}
              </p>
            ))}
            <div className="flex flex-wrap gap-2">
              {inForce?.versionId && (
                <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => openEditor({ kind, baseVersionId: inForce.versionId! })}>
                  {t.newVersion}
                </button>
              )}
              {isSuperAdmin && hasOwn && (
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  data-testid={`qv-revert-${kind}`}
                  disabled={act.isPending}
                  onClick={() => run(() => api.revertQuestionnairePariwar({ kind, targetPariwarId: pariwarId }, newKey()))}
                >
                  {t.revert}
                </button>
              )}
            </div>
            <h3 className="text-sm font-medium">{t.versions}</h3>
            {versions.length === 0 ? (
              <p className="text-sm opacity-70">{t.noVersions}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {versions.map((v) => (
                  <li key={v.versionId} className="rounded border p-2 text-sm" data-testid={`qv-version-${v.versionId}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{v.versionId}</span>
                      <span>{t.stage[v.stage]}</span>
                      {v.outOfDate && <span className="rounded bg-amber-100 px-1 text-xs">{t.badge.outOfDate}</span>}
                      <button
                        type="button"
                        className="text-xs underline"
                        aria-label={t.viewVersion(v.versionId)}
                        onClick={() => {
                          setBaseMovedVia(null);
                          setSelected(v.versionId);
                        }}
                      >
                        {t.view}
                      </button>
                    </div>
                    <History v={v} pariwarId={pariwarId} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {selected !== null && (
        <VersionPanel
          key={selected}
          pariwarId={pariwarId}
          versionId={selected}
          isSuperAdmin={isSuperAdmin}
          run={run}
          baseMoved={baseMovedVia === 'make_live'}
          busy={act.isPending}
          onEdit={(kind) => openEditor({ kind, baseVersionId: selected })}
        />
      )}
      {editing !== null && (
        <Editor
          key={`${editing.kind}:${editing.baseVersionId}`}
          pariwarId={pariwarId}
          isSuperAdmin={isSuperAdmin}
          kind={editing.kind}
          baseVersionId={editing.baseVersionId}
          codeVersionId={newestCodeVersionId(data.versions, editing.kind)}
          run={run}
          baseMoved={baseMovedVia === 'direct'}
          busy={act.isPending}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

type Run = (fn: () => Promise<QuestionnaireStepResponse>, onDone?: (r: QuestionnaireStepResponse) => void, via?: MovedVia) => void;

/** One version: the render, and the acts its stage admits. */
function VersionPanel(props: {
  pariwarId: string;
  versionId: string;
  isSuperAdmin: boolean;
  run: Run;
  baseMoved: boolean;
  busy: boolean;
  onEdit: (kind: QuestionnaireVersionKind) => void;
}): ReactElement {
  const { pariwarId, versionId, isSuperAdmin, run, baseMoved, busy } = props;
  const detail = useQuestionnaireVersion(pariwarId, isSuperAdmin, versionId);
  const [hindiReviewed, setHindiReviewed] = useState(false);
  const [classificationAttested, setClassificationAttested] = useState(false);
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<CounselScope>('this');
  const [ack, setAck] = useState(false);
  // The tick belongs to the warning it was given for: once the warning is gone (another version viewed, the editor opened or
  // closed, an unrelated success), a LATER base_moved raises a fresh, unticked box (RP12).
  useEffect(() => {
    if (!baseMoved) setAck(false);
  }, [baseMoved]);
  /** The tick belongs to the scope it was given for (RV14). */
  const chooseScope = (next: CounselScope): void => {
    setScope(next);
    setAck(false);
  };
  const d = detail.data;
  const keeping = usePariwarsKeepingOwnQuestionnaire(d?.kind ?? 'peer_mesh', isSuperAdmin && d !== undefined && scope === 'every');
  const keepingReady = isKeepingReady(keeping);
  if (detail.isLoading) return <p role="status">{t.loading}</p>;
  // A paused (offline) query has no data and is not loading either — it is ⛔ an error (RV19).
  if (d === undefined) return detail.isError ? <p role="alert">{errorLines(detail.error)[0]}</p> : <p role="status">{t.loading}</p>;
  const counselPending = (d.questions ?? []).some((q) => q.health && q.counselPending);
  const canMakeLive = isSuperAdmin && (d.stage === 'approved' || d.stage === 'published');

  return (
    <section className="flex flex-col gap-3 rounded border p-3" aria-label={d.versionId} data-testid="qv-detail">
      <h2 className="font-semibold">
        {d.versionId} — {t.stage[d.stage]}
      </h2>
      <History v={d} pariwarId={pariwarId} />
      {d.problems.length > 0 && (
        <div role="alert" className="text-sm text-status-fail-fg" data-testid="qv-problems">
          <p>{t.problemsHeading}</p>
          {d.problems.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {d.warnings.length > 0 && (
        <div role="status" className="text-sm text-amber-700" data-testid="qv-detail-warnings">
          {d.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {(d.questions ?? []).map((q) => (
          <QuestionView key={q.key} q={q} outOfDate={d.outOfDate} />
        ))}
        {d.removedKeys.map((k) => (
          <li key={k} className="text-xs opacity-70" data-testid={`qv-removed-${k}`}>
            {k} — {t.change.removed}
          </li>
        ))}
      </ul>
      {/* The Super Admin's editor has only the DIRECT path, whose base must be a code version or one approved / made live (RT7,
          QE7 (b)) — so ⛔ offered from a version it would refuse (review round 4, RF1). */}
      {(!isSuperAdmin || d.stage === 'code' || d.stage === 'approved' || d.stage === 'published') && (
        <button type="button" className="w-fit text-sm underline" onClick={() => props.onEdit(d.kind)}>
          {t.newVersion}
        </button>
      )}

      {/* The tenant acts — ⛔ for the Super Admin, whose page reads the GLOBAL list: the tenant routes 404 a Super Admin with no
          grant row here, and another Pariwar's proposal on any (review RT2). Their acts are QE7's: make live, direct, revert. */}
      {d.stage === 'proposed' && !isSuperAdmin && (
        <div className="flex flex-col gap-2 rounded border p-2" data-testid="qv-approve">
          <label className="text-sm">
            <input type="checkbox" checked={hindiReviewed} onChange={(e) => setHindiReviewed(e.target.checked)} /> {t.hindiTick}
          </label>
          <label className="text-sm">
            <input type="checkbox" checked={classificationAttested} onChange={(e) => setClassificationAttested(e.target.checked)} /> {t.classificationTick}
          </label>
          <button
            type="button"
            className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => run(() => api.approveQuestionnaireVersion(pariwarId, versionId, { hindiReviewed, classificationAttested }, newKey()))}
          >
            {t.approve}
          </button>
          <label className="flex flex-col text-sm">
            {t.returnNote}
            <textarea className="rounded border px-2 py-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            type="button"
            className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={busy || note.trim() === ''}
            onClick={() => run(() => api.returnQuestionnaireVersion(pariwarId, versionId, note.trim(), newKey()))}
          >
            {t.returnIt}
          </button>
        </div>
      )}
      {d.authoredByMe && (d.stage === 'proposed' || d.stage === 'approved') && !isSuperAdmin && (
        <button
          type="button"
          className="w-fit rounded border px-3 py-1 text-sm"
          disabled={busy}
          onClick={() => run(() => api.withdrawQuestionnaireVersion(pariwarId, versionId, newKey()))}
        >
          {t.withdraw}
        </button>
      )}
      {canMakeLive && (
        <div className="flex flex-col gap-2 rounded border p-2" data-testid="qv-make-live">
          <fieldset className="flex gap-3 text-sm">
            <legend className="sr-only">{t.scopeLegend}</legend>
            <label>
              <input type="radio" name="qv-scope" checked={scope === 'this'} onChange={() => chooseScope('this')} /> {t.scopeThis}
            </label>
            <label>
              <input type="radio" name="qv-scope" checked={scope === 'every'} onChange={() => chooseScope('every')} /> {t.scopeAll}
            </label>
          </fieldset>
          {/* QE7 (a) — the screen LISTS the Pariwars keeping their own version BEFORE the confirm; the confirm waits for it (RV13). */}
          {scope === 'every' && <KeepingOwn keeping={keeping} testId="qv-keeping-own" />}
          {counselPending && (
            <p role="alert" className="text-sm text-amber-700" data-testid="qv-counsel-warning">
              {t.counselWarning(d.kind, scope)}
            </p>
          )}
          {baseMoved && (
            <div className="text-sm" data-testid="qv-base-moved">
              <p role="alert">{t.baseMoved}</p>
              <label>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> {t.baseMovedAck}
              </label>
            </div>
          )}
          <button
            type="button"
            className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={busy || (scope === 'every' && !keepingReady) || (baseMoved && !ack)}
            onClick={() =>
              run(
                () =>
                  api.makeQuestionnaireVersionLive(
                    versionId,
                    // Only an acknowledgement given for THIS warning counts — never a stale tick (RV14).
                    { targetPariwarId: scope === 'this' ? pariwarId : null, acknowledgeBaseMoved: baseMoved && ack },
                    newKey(),
                  ),
                () => setAck(false),
                'make_live',
              )
            }
          >
            {t.makeLive}
          </button>
        </div>
      )}
    </section>
  );
}

type KeepingOwnQuery = ReturnType<typeof usePariwarsKeepingOwnQuestionnaire>;

/** The list counts only when it is FRESH: a cached list that is being read again (an act just invalidated it) is not the
 *  one the confirm may rest on (RP13). */
const isKeepingReady = (keeping: KeepingOwnQuery): boolean => keeping.isSuccess && !keeping.isFetching;

/** QE7 (a) — "N Pariwars keep their own version: [names]", before an all-Pariwar confirm: the make-live AND the direct path,
 *  which writes the same default-level step (review RT3). A read that failed is `error` only once nothing is in flight. */
function KeepingOwn({ keeping, testId }: { keeping: KeepingOwnQuery; testId: string }): ReactElement {
  if (isKeepingReady(keeping) && keeping.data !== undefined) {
    return (
      <p role="status" className="text-sm" data-testid={testId}>
        {t.keepingOwn(keeping.data.pariwars.length, keeping.data.pariwars.map((p) => p.name ?? p.pariwarId).join(', '))}
      </p>
    );
  }
  if (keeping.isError && !keeping.isFetching) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p role="alert" className="text-sm text-status-fail-fg" data-testid={`${testId}-error`}>
          {t.keepingError}
        </p>
        <button type="button" className="rounded border px-2 py-1 text-sm" data-testid={`${testId}-retry`} onClick={() => void keeping.refetch()}>
          {t.keepingRetry}
        </button>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm" data-testid={`${testId}-loading`}>
      {t.keepingLoading}
    </p>
  );
}

type DraftChain = Extract<QuestionnaireDraftPage['questions'][number], { kind: string }>;

/** A staff question of `d` back into its draft form (its words ARE its stored text — `{member}` is left in place). */
function toDraft(q: QuestionnaireQuestionView): DraftChain {
  return {
    key: q.key,
    kind: q.kind === 'multi' ? 'multi' : q.kind === 'yes_no' ? 'yes_no' : 'single',
    text: { en: q.words.en, hi: q.words.hi },
    options: q.options.map((o) => ({ code: o.code, text: { en: o.words.en, hi: o.words.hi }, ...(o.exclusive ? { exclusive: true } : {}) })),
    showIf: q.showIf,
    health: q.health,
  };
}

const blankQuestion = (): DraftChain => ({
  key: '',
  kind: 'single',
  text: { en: '', hi: '' },
  options: [
    { code: '', text: { en: '', hi: '' } },
    { code: '', text: { en: '', hi: '' } },
  ],
  showIf: null,
  health: false,
});

/** The draft pages: the RULED questions in their own layout (by key — the server puts the Panel's words back), then each staff
 *  question on its own page. `ruledFrom` is the version the screen SHOWS as locked — the newest Panel version when it loaded, the
 *  base only on the same fallback as the display (RP7): a proposal that names other ruled keys than the screen locks would be
 *  refused by the validator for a key the editor can neither see nor fix. */
function draftPages(ruledFrom: QuestionnaireVersionDetailResponse, staff: readonly DraftChain[]): QuestionnaireDraftPage[] {
  const ruled = new Set((ruledFrom.questions ?? []).filter((q) => q.ruled).map((q) => q.key));
  const ruledPages = (ruledFrom.pages ?? [])
    .map((keys) => keys.filter((k) => ruled.has(k)).map((key) => ({ ruled: true as const, key })))
    .filter((p) => p.length > 0)
    .map((questions) => ({ questions }));
  return [...ruledPages, ...staff.map((q) => ({ questions: [q] }))];
}

/** An option without its `exclusive` flag — only a "several choices" question shows (and can clear) one (RV21). */
const plainOption = (o: DraftChain['options'][number]): DraftChain['options'][number] => (o.exclusive === undefined ? o : { code: o.code, text: o.text });

const parseCodes = (text: string): string[] => text.split(',').map((c) => c.trim()).filter((c) => c !== '');

/** The showIf codes, typed as text: a trailing comma stays while the next code is typed (RV21); the draft holds the parsed list. */
function CodesInput({ codes, onChange }: { codes: readonly string[]; onChange: (codes: string[]) => void }): ReactElement {
  const [text, setText] = useState(codes.join(','));
  // The text is the person's own until it no longer stands for the draft's codes (a move / remove shows another question here).
  const shown = parseCodes(text).join(',') === codes.join(',') ? text : codes.join(',');
  return (
    <input
      className="rounded border px-1"
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseCodes(e.target.value));
      }}
    />
  );
}

function Editor(props: {
  pariwarId: string;
  isSuperAdmin: boolean;
  kind: QuestionnaireVersionKind;
  baseVersionId: string;
  /** The newest Panel (code) version of this kind, or `null` — its RULED questions are the CURRENT ones (QE5, RV18). */
  codeVersionId: string | null;
  run: Run;
  /** The server answered 409 `base_moved` to this editor's direct path: the acknowledgement is asked for (RV5). */
  baseMoved: boolean;
  busy: boolean;
  onClose: () => void;
}): ReactElement {
  const { pariwarId, isSuperAdmin, kind, baseVersionId, codeVersionId, run, baseMoved, busy } = props;
  const base = useQuestionnaireVersion(pariwarId, isSuperAdmin, baseVersionId);
  const code = useQuestionnaireVersion(pariwarId, isSuperAdmin, codeVersionId);
  const [staff, setStaff] = useState<DraftChain[] | null>(null);
  const [reason, setReason] = useState('');
  const [hindiReviewed, setHindiReviewed] = useState(false);
  const [classificationAttested, setClassificationAttested] = useState(false);
  const [scope, setScope] = useState<CounselScope>('this');
  const [ack, setAck] = useState(false);
  // The tick belongs to the warning it was given for (RP12) — see `VersionPanel`.
  useEffect(() => {
    if (!baseMoved) setAck(false);
  }, [baseMoved]);
  const keeping = usePariwarsKeepingOwnQuestionnaire(kind, isSuperAdmin && scope === 'every');
  if (base.isLoading || code.isLoading) return <p role="status">{t.loading}</p>;
  // A paused (offline) query has no data and is not loading either — it is ⛔ an error (RV19).
  if (base.data === undefined) return base.isError ? <p role="alert">{errorLines(base.error)[0]}</p> : <p role="status">{t.loading}</p>;
  if (codeVersionId !== null && code.data === undefined && !code.isError) return <p role="status">{t.loading}</p>;
  const b = base.data;
  // QE5 — "the editor always shows the CURRENT ruled questions locked": the newest Panel version's, ⛔ the base's (a base on an
  // older ruled base would show the old words while the server puts the new ones back). The base's when they cannot be read.
  // The SAME source builds the proposal's ruled pages (RP7): what is locked on screen is what the request names.
  const ruledFrom = code.data !== undefined && code.data.questions !== null ? code.data : b;
  const ruledQuestions = (ruledFrom.questions ?? []).filter((q) => q.ruled);
  const questions = staff ?? (b.questions ?? []).filter((q) => !q.ruled).map(toDraft);
  const update = (i: number, next: Partial<DraftChain>): void => setStaff(questions.map((q, j) => (j === i ? { ...q, ...next } : q)));
  const move = (i: number, by: -1 | 1): void => {
    const next = [...questions];
    const [q] = next.splice(i, 1);
    next.splice(i + by, 0, q!);
    setStaff(next);
  };
  const pages = draftPages(ruledFrom, questions);
  // QE10 — the hold warning fires for a pending RULED health question of the version too (the make-live panel's predicate),
  // not only for a staff question ticked as health (RV17).
  const counselPending = ruledQuestions.some((q) => q.health && q.counselPending) || questions.some((q) => q.health);
  const chooseScope = (next: CounselScope): void => {
    setScope(next);
    setAck(false);
  };

  return (
    <section className="flex flex-col gap-3 rounded border p-3" aria-label={t.editorHeading} data-testid="qv-editor">
      <h2 className="font-semibold">{t.editorHeading}</h2>
      <p className="text-sm">{t.editorFrom(baseVersionId)}</p>
      <p className="text-sm font-medium" data-testid="qv-guidance">{t.guidance}</p>
      {code.isError && (
        <p role="alert" className="text-sm text-amber-700" data-testid="qv-ruled-unavailable">
          {t.ruledUnavailable}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {ruledQuestions.map((q) => (
          <QuestionView key={q.key} q={{ ...q, change: null }} outOfDate={false} />
        ))}
      </ul>
      {questions.map((q, i) => (
        <fieldset key={i} className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid={`qv-edit-${i}`}>
          <legend className="sr-only">{t.questionLegend(i + 1, q.key)}</legend>
          <label className="flex flex-col">
            {t.key}
            <input className="rounded border px-1" value={q.key} onChange={(e) => update(i, { key: e.target.value })} />
          </label>
          <label className="flex flex-col">
            {t.kindLabel}
            <select
              className="rounded border"
              value={q.kind}
              onChange={(e) => {
                const nextKind = e.target.value as DraftChain['kind'];
                // Away from "several choices" the "stands alone" checkboxes are gone — so are the flags they set (RV21).
                update(i, nextKind === 'multi' ? { kind: nextKind } : { kind: nextKind, options: q.options.map(plainOption) });
              }}
            >
              {(['single', 'multi', 'yes_no'] as const).map((k) => (
                <option key={k} value={k}>
                  {t.kindOption[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            {t.questionEn}
            <input className="rounded border px-1" value={q.text.en} onChange={(e) => update(i, { text: { ...q.text, en: e.target.value } })} />
          </label>
          <label className="flex flex-col">
            {t.questionHi}
            <input lang="hi" className="rounded border px-1" value={q.text.hi} onChange={(e) => update(i, { text: { ...q.text, hi: e.target.value } })} />
          </label>
          {q.options.map((o, oi) => (
            <div key={oi} className="flex flex-wrap gap-1">
              <input aria-label={t.optionCode(i + 1, oi + 1)} className="w-24 rounded border px-1" value={o.code} onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? { ...x, code: e.target.value } : x)) })} />
              <input aria-label={t.optionEn(i + 1, oi + 1)} className="rounded border px-1" value={o.text.en} onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? { ...x, text: { ...x.text, en: e.target.value } } : x)) })} />
              <input aria-label={t.optionHi(i + 1, oi + 1)} lang="hi" className="rounded border px-1" value={o.text.hi} onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? { ...x, text: { ...x.text, hi: e.target.value } } : x)) })} />
              {q.kind === 'multi' && (
                <label className="text-xs">
                  <input
                    type="checkbox"
                    aria-label={t.standsAloneFor(i + 1, oi + 1)}
                    checked={o.exclusive === true}
                    onChange={(e) => update(i, { options: q.options.map((x, k) => (k === oi ? { ...x, exclusive: e.target.checked } : x)) })}
                  />{' '}
                  {t.standsAlone}
                </label>
              )}
            </div>
          ))}
          <button type="button" className="w-fit text-xs underline" onClick={() => update(i, { options: [...q.options, { code: '', text: { en: '', hi: '' } }] })}>
            {t.addOption}
          </button>
          <label className="flex flex-col">
            {t.showAfter}
            <input
              className="rounded border px-1"
              value={q.showIf?.key ?? ''}
              onChange={(e) => update(i, { showIf: e.target.value === '' ? null : { key: e.target.value, anyOf: q.showIf?.anyOf ?? [] } })}
            />
          </label>
          {q.showIf !== null && (
            <label className="flex flex-col">
              {t.showAfterCodes}
              <CodesInput codes={q.showIf.anyOf} onChange={(anyOf) => update(i, { showIf: { key: q.showIf!.key, anyOf } })} />
            </label>
          )}
          <label>
            <input type="checkbox" checked={q.health} onChange={(e) => update(i, { health: e.target.checked })} /> {t.healthLabel}
          </label>
          <div className="flex gap-2 text-xs">
            {i > 0 && <button type="button" className="underline" onClick={() => move(i, -1)}>{t.moveUp}</button>}
            {i < questions.length - 1 && <button type="button" className="underline" onClick={() => move(i, 1)}>{t.moveDown}</button>}
            <button type="button" className="underline" onClick={() => setStaff(questions.filter((_, j) => j !== i))}>
              {t.remove}
            </button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="w-fit rounded border px-2 py-1 text-sm" onClick={() => setStaff([...questions, blankQuestion()])}>
        {t.addQuestion}
      </button>
      <div className="flex flex-wrap gap-2">
        {/* Propose is a tenant act — ⛔ for the Super Admin, who adds through the direct path below (review RT2). */}
        {!isSuperAdmin && (
          <button
            type="button"
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => run(() => api.proposeQuestionnaireVersion(pariwarId, { kind, baseVersionId, pages }, newKey()), props.onClose)}
          >
            {t.propose}
          </button>
        )}
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={props.onClose}>
          {t.cancel}
        </button>
      </div>
      {isSuperAdmin && (
        <div className="flex flex-col gap-2 rounded border p-2" data-testid="qv-direct">
          <fieldset className="flex gap-3 text-sm">
            <legend className="sr-only">{t.directScopeLegend}</legend>
            <label>
              <input type="radio" name="qv-direct-scope" checked={scope === 'this'} onChange={() => chooseScope('this')} /> {t.scopeThis}
            </label>
            <label>
              <input type="radio" name="qv-direct-scope" checked={scope === 'every'} onChange={() => chooseScope('every')} /> {t.scopeAll}
            </label>
          </fieldset>
          {scope === 'every' && <KeepingOwn keeping={keeping} testId="qv-direct-keeping-own" />}
          {counselPending && (
            <p role="alert" className="text-sm text-amber-700" data-testid="qv-direct-counsel-warning">
              {t.counselWarning(kind, scope)}
            </p>
          )}
          {/* QE7 (b) — the named base is not the one in force: the same warning and acknowledgement as the make-live (RV5). */}
          {baseMoved && (
            <div className="text-sm" data-testid="qv-direct-base-moved">
              <p role="alert">{t.baseMoved}</p>
              <label>
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> {t.baseMovedAck}
              </label>
            </div>
          )}
          <label className="flex flex-col text-sm">
            {t.directReason}
            <textarea className="rounded border px-2 py-1" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="text-sm">
            <input type="checkbox" checked={hindiReviewed} onChange={(e) => setHindiReviewed(e.target.checked)} /> {t.hindiTick}
          </label>
          <label className="text-sm">
            <input type="checkbox" checked={classificationAttested} onChange={(e) => setClassificationAttested(e.target.checked)} /> {t.classificationTick}
          </label>
          <button
            type="button"
            className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={busy || reason.trim() === '' || (scope === 'every' && !isKeepingReady(keeping)) || (baseMoved && !ack)}
            onClick={() =>
              run(
                () =>
                  api.directQuestionnaireVersion(
                    {
                      kind,
                      targetPariwarId: scope === 'this' ? pariwarId : null,
                      baseVersionId,
                      pages,
                      reason: reason.trim(),
                      hindiReviewed,
                      classificationAttested,
                      // Only an acknowledgement given for THIS warning counts — never a stale tick (RV14).
                      acknowledgeBaseMoved: baseMoved && ack,
                    },
                    newKey(),
                  ),
                props.onClose,
                'direct',
              )
            }
          >
            {t.makeLiveDirect}
          </button>
        </div>
      )}
    </section>
  );
}
