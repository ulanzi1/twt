// The Trustee Panel's family-memorial review — the queue, the history view, the decision and the withdrawal of an
// approval (Story 11b.4, Task 7 — AC9 / MA6 / MA7 / MA16; the moderation-appeals queue-and-decision precedent).
//
// ── ⭐ WHY THE QUEUE IS LINKED FROM THE NAV ─────────────────────────────────────────────────────────────────────────────
// `trustee_panel` holds ⛔ helpdesk capability, so nothing else would surface a memorial waiting for review: *"a decide
// endpoint reachable only by direct link would be a technically complete appeal that nobody can find"* (the moderation-
// appeals header). The nav link is ⛔ key-gated (a Pariwar grant is ⛔ in `nationalGrants`); the server's `memorial.review`
// check is the boundary, and this page shows its own "no access" on a 403.
//
// ── ⛔ WHAT THIS PAGE NEVER DOES ───────────────────────────────────────────────────────────────────────────────────────
// It never edits the family's words: ⛔ no control is bound to, or pre-filled with, the body or the photo description; they
// are shown as stored (with any hidden bidi control made visible). A part is left out by choosing whole SENTENCES (a UI aid —
// the server validates offsets) each with ONE of the four reasons. The internal note starts EMPTY and is ⛔ shown to the
// family. ⛔ No take-down: removing a published memorial is the helpline's, on the nominee's request (row 11b-4a).

import { Link } from '@tanstack/react-router';
import {
  MEMORIAL_REVIEW_REASONS,
  validateMemorialDecision,
  type MemorialDecisionCandidate,
  type MemorialReviewAction,
  type MemorialReviewDecisionInput,
  type MemorialReviewReason,
  type MemorialReviewVersion,
  type MemorialState,
} from '@twt/contracts';
import { reconstructMemorial, type MemorialParagraph } from '@twt/ui';
import { useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useDecideMemorialReview,
  useMemorialReview,
  useMemorialReviews,
  useWithdrawMemorialApproval,
} from '../../api/hooks.js';
import { bidiVisible, buildOmissions, memorialSentenceRanges, type SelectedPart, type TextRange } from './derive.js';
import { reasonLabel, resolveEn as t } from './i18n-en.js';

function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

function NoAccess(): ReactElement {
  return (
    <p role="status" data-testid="memorial-no-access">
      {t('memorial.noAccess')}
    </p>
  );
}

function stateLabel(state: MemorialState): string {
  return t(`memorial.state.${state}`);
}

/** The family's text as stored, every bidi control shown as a visible marker (AC9). */
function StoredText({ text, testId }: { text: string; testId?: string }): ReactElement {
  return (
    <p className="whitespace-pre-wrap rounded border bg-white p-3" data-testid={testId}>
      {bidiVisible(text).map((s, i) =>
        s.kind === 'text' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <mark key={i} title={s.codePoint} data-testid="memorial-bidi-marker">
            ⟦BIDI {s.codePoint}⟧
          </mark>
        ),
      )}
    </p>
  );
}

function AsApproved({ paragraphs }: { paragraphs: readonly MemorialParagraph[] }): ReactElement {
  return (
    <div className="whitespace-pre-wrap" data-testid="memorial-as-approved">
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2">
          {p.segments.map((s, j) =>
            s.kind === 'text' ? <span key={j}>{s.text}</span> : <em key={j}>{t('memorial.detail.omitted')}</em>,
          )}
        </p>
      ))}
    </div>
  );
}

// ── The queue ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface MemorialReviewListPageProps {
  pariwarId: string;
}

export function MemorialReviewListPage({ pariwarId }: MemorialReviewListPageProps): ReactElement {
  const [view, setView] = useState<'pending' | 'decided'>('pending');
  const list = useMemorialReviews(pariwarId, view);

  if (isForbidden(list.error)) return <NoAccess />;

  return (
    <section aria-label={t('memorial.title')} data-testid="memorial-review-queue" className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold">{t('memorial.title')}</h1>
        <p className="text-sm opacity-70">{t('memorial.subtitle')}</p>
      </header>

      <div role="group" aria-label="View" className="flex gap-3">
        {(['pending', 'decided'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            className={view === v ? 'font-bold underline' : 'underline'}
            onClick={() => setView(v)}
          >
            {t(`memorial.view.${v}`)}
          </button>
        ))}
      </div>

      {list.isLoading && <p role="status">{t('memorial.list.loading')}</p>}
      {list.isError && !isForbidden(list.error) && <p role="status">{t('memorial.list.error')}</p>}
      {list.data && list.data.items.length === 0 && (
        <p role="status" data-testid="memorial-queue-empty">
          {t(`memorial.list.empty.${view}`)}
        </p>
      )}
      {list.data && list.data.items.length > 0 && (
        <table className="w-full text-sm" data-testid="memorial-queue-table">
          <caption className="sr-only">{t('memorial.title')}</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">{t('memorial.list.sent')}</th>
              <th scope="col" className="text-left">{t('memorial.list.member')}</th>
              <th scope="col" className="text-left">{t('memorial.list.state')}</th>
              <th scope="col" className="text-left" />
            </tr>
          </thead>
          <tbody>
            {list.data.items.map((item) => (
              <tr key={item.submissionId} data-testid={`memorial-row-${item.submissionId}`}>
                <td>{new Date(item.sentAt).toLocaleDateString('en-IN')}</td>
                <td>{item.deceasedName ?? '—'}</td>
                <td>{stateLabel(item.memorialState)}</td>
                <td>
                  <Link
                    to="/p/$pariwarId/memorial-reviews/$submissionId"
                    params={{ pariwarId, submissionId: item.submissionId }}
                    className="underline"
                  >
                    {t('memorial.list.open')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── One version and its history ──────────────────────────────────────────────────────────────────────────────────────

export interface MemorialReviewDetailPageProps {
  pariwarId: string;
  submissionId: string;
}

export function MemorialReviewDetailPage({ pariwarId, submissionId }: MemorialReviewDetailPageProps): ReactElement {
  const detail = useMemorialReview(pariwarId, submissionId);

  if (isForbidden(detail.error)) return <NoAccess />;

  return (
    <section aria-label={t('memorial.title')} data-testid="memorial-review-detail" className="flex flex-col gap-5">
      <Link to="/p/$pariwarId/memorial-reviews" params={{ pariwarId }} className="text-sm underline">
        {t('memorial.detail.back')}
      </Link>
      {detail.isLoading && <p role="status">{t('memorial.detail.loading')}</p>}
      {detail.isError && !isForbidden(detail.error) && (
        <p role="status">
          {detail.error instanceof ApiError && detail.error.status === 404 ? t('memorial.detail.notFound') : t('memorial.detail.error')}
        </p>
      )}
      {detail.data && (
        <>
          <header>
            <h1 className="text-xl font-bold">{detail.data.deceasedName ?? t('memorial.title')}</h1>
            <p className="text-sm opacity-70">{stateLabel(detail.data.memorialState)}</p>
          </header>
          <h2 className="font-bold">{t('memorial.detail.history')}</h2>
          {detail.data.chain.map((v) => (
            <VersionCard key={v.submissionId} version={v} current={v.submissionId === submissionId} />
          ))}
          {detail.data.canDecide && <DecisionForm pariwarId={pariwarId} version={detail.data.chain.find((v) => v.submissionId === submissionId)!} />}
          {detail.data.canWithdrawApproval && <WithdrawApprovalForm pariwarId={pariwarId} submissionId={submissionId} />}
        </>
      )}
    </section>
  );
}

function VersionCard({ version: v, current }: { version: MemorialReviewVersion; current: boolean }): ReactElement {
  const decided =
    v.body !== null && v.decision !== null && v.decision.action === 'approved_with_omissions'
      ? reconstructMemorial(
          { body: v.body, altText: v.altText },
          { omissions: v.decision.omissions, photoLeftOut: v.decision.photoLeftOutReason !== null },
        )
      : null;
  const hasBidi = [v.body, v.altText].some((x) => x !== null && bidiVisible(x).some((s) => s.kind === 'bidi'));
  return (
    <article
      className={`rounded border p-4 ${current ? 'border-2' : 'opacity-90'}`}
      data-testid={`memorial-version-${v.submissionId}`}
      aria-current={current ? 'true' : undefined}
    >
      <p className="text-sm opacity-70">
        {t('memorial.detail.version')} {new Date(v.sentAt).toLocaleString('en-IN')}
        {current && <strong> — {t('memorial.detail.thisVersion')}</strong>}
      </p>
      <h3 className="mt-2 font-bold">{t('memorial.detail.words')}</h3>
      {v.body === null ? <p role="status">{t('memorial.detail.unavailable')}</p> : <StoredText text={v.body} testId="memorial-body" />}
      {v.hasPhoto && (
        <>
          <h3 className="mt-2 font-bold">{t('memorial.detail.photo')}</h3>
          {v.photoUrl !== null && <img src={v.photoUrl} alt={v.altText ?? ''} className="max-h-64 rounded" />}
          {v.altText !== null && (
            <>
              <h4 className="text-sm font-bold">{t('memorial.detail.altText')}</h4>
              <StoredText text={v.altText} />
            </>
          )}
        </>
      )}
      {hasBidi && <p className="text-sm opacity-70">{t('memorial.detail.bidiNotice')}</p>}
      <p className="mt-2 text-xs opacity-70">
        {t('memorial.detail.permission')}: <code>{v.authorisationCopyVersion}</code> ({v.authorisationLocale})
      </p>
      {v.decision !== null && (
        <div className="mt-3" data-testid="memorial-decision">
          <h3 className="font-bold">{t('memorial.detail.decision')}: {t(`memorial.action.${v.decision.action}`)}</h3>
          {v.decision.reasonCode !== null && <p>{reasonLabel(v.decision.reasonCode)}</p>}
          {v.decision.omissions.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {v.decision.omissions.map((o) => {
                const source = o.field === 'body' ? v.body : v.altText;
                return (
                  <li key={`${o.field}:${o.start}`}>
                    “{source?.slice(o.start, o.end) ?? '…'}” — {reasonLabel(o.reason)}
                  </li>
                );
              })}
            </ul>
          )}
          {v.decision.photoLeftOutReason !== null && (
            <p>
              {t('memorial.detail.photoLeftOut')} — {reasonLabel(v.decision.photoLeftOutReason)}
            </p>
          )}
          {decided !== null && (
            <>
              <h4 className="mt-2 text-sm font-bold">{t('memorial.detail.asApproved')}</h4>
              <AsApproved paragraphs={decided.asApproved} />
            </>
          )}
          <p className="text-sm opacity-70">
            {t('memorial.detail.decidedBy')} {v.decision.actorDisplay} · {new Date(v.decision.decidedAt).toLocaleString('en-IN')}
          </p>
          {v.decision.internalNote !== null && (
            <p className="text-sm" data-testid="memorial-decision-note">
              <strong>{t('memorial.detail.internalNote')}:</strong> {v.decision.internalNote}
            </p>
          )}
        </div>
      )}
      {v.withdrawal !== null && (
        <div className="mt-3" data-testid="memorial-withdrawal">
          <h3 className="font-bold">{t('memorial.detail.withdrawal')}</h3>
          <p>
            {v.withdrawal.withdrawnBy === 'family' ? t('memorial.detail.withdrawnByFamily') : t('memorial.detail.withdrawnByTrust')}
            {v.withdrawal.reasonCode !== null && <> — {reasonLabel(v.withdrawal.reasonCode)}</>}
          </p>
          {v.withdrawal.actorDisplay !== null && <p className="text-sm opacity-70">{v.withdrawal.actorDisplay}</p>}
          {v.withdrawal.internalNote !== null && (
            <p className="text-sm">
              <strong>{t('memorial.detail.internalNote')}:</strong> {v.withdrawal.internalNote}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

// ── The decision ─────────────────────────────────────────────────────────────────────────────────────────────────────

function ReasonSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: MemorialReviewReason | '';
  onChange: (v: MemorialReviewReason | '') => void;
}): ReactElement {
  return (
    <label htmlFor={id} className="ml-2 text-sm">
      <span className="sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as MemorialReviewReason | '')} aria-label={label}>
        <option value="">{t('memorial.decide.chooseReason')}</option>
        {MEMORIAL_REVIEW_REASONS.map((r) => (
          <option key={r} value={r}>
            {reasonLabel(r)}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SentenceChoice {
  readonly checked: boolean;
  readonly reason: MemorialReviewReason | '';
}

function SentencePicker({
  field,
  text,
  ranges,
  choices,
  onChoose,
  legend,
}: {
  field: 'body' | 'altText';
  text: string;
  ranges: readonly TextRange[];
  choices: ReadonlyMap<string, SentenceChoice>;
  onChoose: (key: string, choice: SentenceChoice) => void;
  legend: string;
}): ReactElement {
  return (
    <fieldset className="mt-2" data-testid={`memorial-sentences-${field}`}>
      <legend className="text-sm font-bold">{legend}</legend>
      <ol className="flex flex-col gap-1">
        {ranges.map((r) => {
          const key = `${field}:${r.start}:${r.end}`;
          const choice = choices.get(key) ?? { checked: false, reason: '' };
          return (
            <li key={key} data-testid="memorial-sentence">
              <label>
                <input type="checkbox" checked={choice.checked} onChange={(e) => onChoose(key, { ...choice, checked: e.target.checked })} />{' '}
                <span className="sr-only">{t('memorial.decide.leaveOut')}: </span>
                <span className="whitespace-pre-wrap">{text.slice(r.start, r.end)}</span>
              </label>
              {choice.checked && (
                <ReasonSelect
                  id={`reason-${key}`}
                  label={t('memorial.decide.reasonFor')}
                  value={choice.reason}
                  onChange={(reason) => onChoose(key, { ...choice, reason })}
                />
              )}
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function DecisionForm({ pariwarId, version: v }: { pariwarId: string; version: MemorialReviewVersion }): ReactElement {
  const decide = useDecideMemorialReview(pariwarId, v.submissionId);
  const [action, setAction] = useState<MemorialReviewAction>('approved');
  const [choices, setChoices] = useState<Map<string, SentenceChoice>>(new Map());
  const [photoOut, setPhotoOut] = useState<SentenceChoice>({ checked: false, reason: '' });
  const [reasonCode, setReasonCode] = useState<MemorialReviewReason | ''>('');
  // ⛔ Starts EMPTY — an internal note, never shown to the family, ⛔ pre-filled from anything.
  const [internalNote, setInternalNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  if (v.body === null) return <p role="status">{t('memorial.detail.unavailable')}</p>;
  const body = v.body;
  const locale = v.authorisationLocale;
  const bodyRanges = memorialSentenceRanges(body, locale);
  const altRanges = v.altText === null ? [] : memorialSentenceRanges(v.altText, locale);

  const choose = (key: string, choice: SentenceChoice): void => {
    setChoices((prev) => new Map(prev).set(key, choice));
  };

  const submit = (): void => {
    setProblem(null);
    const candidate: { -readonly [K in keyof MemorialDecisionCandidate]: MemorialDecisionCandidate[K] } = { action };
    if (action === 'approved_with_omissions') {
      const parts: SelectedPart[] = [];
      for (const [key, c] of choices) {
        if (!c.checked) continue;
        if (c.reason === '') {
          setProblem(t('memorial.decide.chooseReason'));
          return;
        }
        const [field, start, end] = key.split(':');
        parts.push({ field: field as 'body' | 'altText', start: Number(start), end: Number(end), reason: c.reason });
      }
      const omissions = buildOmissions(parts);
      if (omissions.length > 0) candidate.omissions = omissions;
      if (photoOut.checked) {
        if (photoOut.reason === '') {
          setProblem(t('memorial.decide.chooseReason'));
          return;
        }
        candidate.photoLeftOut = { reason: photoOut.reason };
      }
    }
    if (action === 'not_approved') {
      if (reasonCode === '') {
        setProblem(t('memorial.decide.chooseReason'));
        return;
      }
      candidate.reasonCode = reasonCode;
    }
    // Pre-check with the SAME validator the server runs (a UI aid — the server is the boundary).
    const verdict = validateMemorialDecision(candidate, { body, altText: v.altText, hasPhoto: v.hasPhoto });
    if (!verdict.ok) {
      setProblem(t('memorial.decide.invalid') + t(`memorial.problem.${verdict.problem}`));
      return;
    }
    const payload: MemorialReviewDecisionInput = {
      action: candidate.action,
      ...(candidate.omissions ? { omissions: [...candidate.omissions] } : {}),
      ...(candidate.photoLeftOut ? { photoLeftOut: candidate.photoLeftOut } : {}),
      ...(candidate.reasonCode ? { reasonCode: candidate.reasonCode } : {}),
      ...(internalNote.trim() !== '' ? { internalNote } : {}),
    };
    decide.mutate(payload);
  };

  const err = decide.error;
  const goneAway = err instanceof ApiError && err.status === 404;
  const invalidOnServer = err instanceof ApiError && err.code === 'memorial_review.invalid_omissions';

  return (
    <section aria-label={t('memorial.decide.title')} data-testid="memorial-decision-form" className="rounded border p-4">
      <h2 className="font-bold">{t('memorial.decide.title')}</h2>
      <fieldset>
        <legend className="sr-only">{t('memorial.decide.title')}</legend>
        {(['approved', 'approved_with_omissions', 'not_approved'] as const).map((a) => (
          <label key={a} className="mr-4">
            <input type="radio" name="memorial-action" checked={action === a} onChange={() => setAction(a)} /> {t(`memorial.action.${a}`)}
          </label>
        ))}
      </fieldset>

      {action === 'approved_with_omissions' && (
        <>
          <p className="mt-2 text-sm opacity-70">{t('memorial.decide.selectHint')}</p>
          <SentencePicker field="body" text={body} ranges={bodyRanges} choices={choices} onChoose={choose} legend={t('memorial.decide.sentencesBody')} />
          {v.altText !== null && (
            <SentencePicker
              field="altText"
              text={v.altText}
              ranges={altRanges}
              choices={choices}
              onChoose={choose}
              legend={t('memorial.decide.sentencesAlt')}
            />
          )}
          {v.hasPhoto && (
            <div className="mt-2">
              <label>
                <input type="checkbox" checked={photoOut.checked} onChange={(e) => setPhotoOut({ ...photoOut, checked: e.target.checked })} />{' '}
                {t('memorial.decide.photoLeftOut')}
              </label>
              {photoOut.checked && (
                <ReasonSelect
                  id="reason-photo"
                  label={t('memorial.decide.reasonFor')}
                  value={photoOut.reason}
                  onChange={(reason) => setPhotoOut({ ...photoOut, reason })}
                />
              )}
            </div>
          )}
        </>
      )}

      {action === 'not_approved' && (
        <div className="mt-2">
          <ReasonSelect id="reason-not-approved" label={t('memorial.decide.reasonCode')} value={reasonCode} onChange={setReasonCode} />
        </div>
      )}

      <label className="mt-3 block">
        {t('memorial.decide.internalNote')}
        <textarea
          className="mt-1 w-full rounded border p-2"
          rows={3}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          data-testid="memorial-internal-note"
        />
      </label>

      {problem !== null && (
        <p role="alert" data-testid="memorial-decision-problem">
          {problem}
        </p>
      )}
      {goneAway && <p role="alert">{t('memorial.decide.alreadyDone')}</p>}
      {invalidOnServer && <p role="alert">{t('memorial.decide.invalid')}</p>}
      {decide.isError && !goneAway && !invalidOnServer && <p role="alert">{t('memorial.decide.error')}</p>}
      {decide.isSuccess && <p role="status">{t('memorial.decide.recorded')}</p>}

      <button type="button" className="mt-3 rounded border px-4 py-2" disabled={decide.isPending} onClick={submit}>
        {t('memorial.decide.submit')}
      </button>
    </section>
  );
}

// ── The Trust withdraws its own approval (MA16) ──────────────────────────────────────────────────────────────────────

function WithdrawApprovalForm({ pariwarId, submissionId }: { pariwarId: string; submissionId: string }): ReactElement {
  const withdraw = useWithdrawMemorialApproval(pariwarId, submissionId);
  const [reason, setReason] = useState<MemorialReviewReason | ''>('');
  // ⛔ Starts EMPTY.
  const [internalNote, setInternalNote] = useState('');
  return (
    <section aria-label={t('memorial.withdraw.title')} data-testid="memorial-withdraw-form" className="rounded border p-4">
      <h2 className="font-bold">{t('memorial.withdraw.title')}</h2>
      <p className="text-sm opacity-70">{t('memorial.withdraw.hint')}</p>
      <ReasonSelect id="reason-withdraw" label={t('memorial.withdraw.reason')} value={reason} onChange={setReason} />
      <label className="mt-3 block">
        {t('memorial.withdraw.internalNote')}
        <textarea className="mt-1 w-full rounded border p-2" rows={3} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
      </label>
      {withdraw.isError && <p role="alert">{t('memorial.withdraw.error')}</p>}
      {withdraw.isSuccess && <p role="status">{t('memorial.withdraw.recorded')}</p>}
      <button
        type="button"
        className="mt-3 rounded border px-4 py-2"
        disabled={reason === '' || withdraw.isPending}
        onClick={() => {
          if (reason === '') return;
          withdraw.mutate({ reasonCode: reason, ...(internalNote.trim() !== '' ? { internalNote } : {}) });
        }}
      >
        {t('memorial.withdraw.submit')}
      </button>
    </section>
  );
}
