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
  type MemorialReviewListItem,
  type MemorialReviewReason,
  type MemorialReviewVersion,
  type MemorialState,
  type MemorialWithdrawalActor,
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
import {
  bidiMarkerText,
  bidiVisible,
  bidiVisibleString,
  buildOmissions,
  memorialSentenceRanges,
  type SelectedPart,
  type TextRange,
} from './derive.js';
import { kinshipLabel, problemSentence, reasonLabel, resolveEn as t, withdrawAnswer } from './i18n-en.js';

type DecideMutation = ReturnType<typeof useDecideMemorialReview>;
type WithdrawMutation = ReturnType<typeof useWithdrawMemorialApproval>;

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

/**
 * Who withdrew a version — a TOTAL map (Story 11b.4a Trap 15): a two-way ternary read a `helpline` take-down as *"The Trust
 * withdrew its approval."* and nothing failed to compile. The take-down line carries its time (AC12).
 */
function withdrawalLine(w: { readonly withdrawnBy: MemorialWithdrawalActor; readonly withdrawnAt: string }): string {
  switch (w.withdrawnBy) {
    case 'family':
      return t('memorial.detail.withdrawnByFamily');
    case 'trust':
      return t('memorial.detail.withdrawnByTrust');
    case 'helpline':
      return `${t('memorial.detail.withdrawnByHelpline')} · ${new Date(w.withdrawnAt).toLocaleString('en-IN')}`;
    default: {
      const exhaustive: never = w.withdrawnBy;
      return String(exhaustive);
    }
  }
}

function stateLabel(state: MemorialState): string {
  return t(`memorial.state.${state}`);
}

/**
 * The word before a Decided-tab row's date (W9) — by the row's state: a family withdrawal is ⛔ a decision, and neither is the
 * Trust withdrawing its approval (that date is the withdrawal's — the T7 order uses the later of the two times).
 */
function decidedDateLabel(state: MemorialState): string {
  switch (state) {
    case 'withdrawn':
      return t('memorial.list.withdrawn');
    case 'approval_withdrawn':
      return t('memorial.list.approvalWithdrawn');
    // Story 11b.4a — the helpline's take-down at the nominee's request (the date is the withdrawal's).
    case 'taken_down':
      return t('memorial.list.takenDown');
    // `none` / `with_the_trust` carry no `decidedAt`, so the line is never drawn for them.
    case 'approved':
    case 'approved_with_omissions':
    case 'not_approved':
    case 'none':
    case 'with_the_trust':
      return t('memorial.list.decided');
    // X7 — a state a newer server adds (the wire is not re-validated here) falls back to the neutral "Decided", ⛔ an empty
    // label or `undefined` beside the date.
    default:
      return t('memorial.list.decided');
  }
}

/**
 * ANY of the family's words, inline, with every hidden bidi control shown as a visible marker (AC9). ⭐ The ONE way this
 * screen renders reviewer-read family text — the stored block, the sentence picker's labels (where the reviewer chooses what
 * to cut), the as-approved text and the omission quote all come through here, so an unterminated RLO cannot reorder what
 * the reviewer reads at the moment of decision (R13).
 */
function VisibleText({ text }: { text: string }): ReactElement {
  return (
    <>
      {bidiVisible(text).map((s, i) =>
        s.kind === 'text' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <mark key={i} title={s.codePoint} data-testid="memorial-bidi-marker">
            {bidiMarkerText(s.codePoint)}
          </mark>
        ),
      )}
    </>
  );
}

/** The family's text as stored, every bidi control shown as a visible marker (AC9). */
function StoredText({ text, testId }: { text: string; testId?: string }): ReactElement {
  return (
    <p className="whitespace-pre-wrap rounded border bg-white p-3" data-testid={testId}>
      <VisibleText text={text} />
    </p>
  );
}

function AsApproved({ paragraphs }: { paragraphs: readonly MemorialParagraph[] }): ReactElement {
  return (
    <div className="whitespace-pre-wrap" data-testid="memorial-as-approved">
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2">
          {p.segments.map((s, j) =>
            s.kind === 'text' ? <VisibleText key={j} text={s.text} /> : <em key={j}>{t('memorial.detail.omitted')}</em>,
          )}
        </p>
      ))}
    </div>
  );
}

/** The queue's rows, each chain head once — an offset page can repeat a row when a new decision lands between two loads. */
function distinctItems(pages: readonly { readonly items: readonly MemorialReviewListItem[] }[] | undefined): MemorialReviewListItem[] {
  const seen = new Map<string, MemorialReviewListItem>();
  for (const page of pages ?? []) for (const item of page.items) if (!seen.has(item.submissionId)) seen.set(item.submissionId, item);
  return [...seen.values()];
}

// ── The queue ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface MemorialReviewListPageProps {
  pariwarId: string;
}

export function MemorialReviewListPage({ pariwarId }: MemorialReviewListPageProps): ReactElement {
  const [view, setView] = useState<'pending' | 'decided'>('pending');
  const list = useMemorialReviews(pariwarId, view);
  const items = distinctItems(list.data?.pages);

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
      {list.data && items.length === 0 && (
        <p role="status" data-testid="memorial-queue-empty">
          {t(`memorial.list.empty.${view}`)}
        </p>
      )}
      {list.data && items.length > 0 && (
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
            {items.map((item) => (
              <tr key={item.submissionId} data-testid={`memorial-row-${item.submissionId}`}>
                <td>
                  {new Date(item.sentAt).toLocaleDateString('en-IN')}
                  {/* V12 — the Decided tab is ORDERED by the decision time (T7), so the row shows it; a pending row has none.
                      W9 — labelled by state: "Decided" / "Withdrawn" / "Approval withdrawn". */}
                  {view === 'decided' && item.decidedAt !== null && (
                    <span className="block text-xs opacity-70" data-testid="memorial-row-decided">
                      {decidedDateLabel(item.memorialState)} {new Date(item.decidedAt).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </td>
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
      {/* A failed "Load more" leaves the query in `error` WITH its pages, so the line above already says so — and the rows
          already loaded stay on screen. */}
      {list.hasNextPage && (
        <button
          type="button"
          className="self-start rounded border px-4 py-2"
          data-testid="memorial-load-more"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? t('memorial.list.loadingMore') : t('memorial.list.loadMore')}
        </button>
      )}
    </section>
  );
}

// ── One version and its history ──────────────────────────────────────────────────────────────────────────────────────

export interface MemorialReviewDetailPageProps {
  pariwarId: string;
  submissionId: string;
}

/** Keyed on the opened version, so a decision's or withdrawal's confirmation never follows the reviewer to another version. */
export function MemorialReviewDetailPage(props: MemorialReviewDetailPageProps): ReactElement {
  return <MemorialReviewDetail key={props.submissionId} {...props} />;
}

/** "Version 2 of 3 · Sent 21/10/2026, 3:30:00 pm" — which version of the chain, by its place in it (oldest first). */
function versionLabel(chain: readonly MemorialReviewVersion[], index: number): string {
  const v = chain[index]!;
  return `${t('memorial.detail.versionNo')} ${index + 1} ${t('memorial.detail.versionOf')} ${chain.length} · ${t('memorial.detail.version')} ${new Date(v.sentAt).toLocaleString('en-IN')}`;
}

/**
 * What the two actions answered. ⭐ It lives on the PAGE, ⛔ not inside either form: the refetch after a success flips
 * `canDecide` / `canWithdrawApproval`, the form unmounts, and a confirmation (or a "no longer open" refusal) held inside it
 * would vanish before the reviewer read it (R19). The status region is always in the DOM, so a screen reader announces
 * what appears in it.
 *
 * ⭐ A withdrawal's answer NAMES the version it was about (its place in `chain`, from the mutation's own `variables`). The
 * mutation is the page's, so its last answer outlives the form that raised it — and with two approved versions the form
 * beside it can already be the NEXT one (v2's approval withdrawn ⇒ the target moves to v1; or v2's failed because another
 * reviewer got there first, and the refetch moved the target to v1). An answer with no version in it would read as being
 * about the form next to it.
 *
 * ⭐ Only the LATEST action's answer shows (T12 (c)): with v1 approved and v2 open, both forms are on the page, and each
 * mutation keeps its last answer — so a failed decision's alert would stay beside a later successful withdrawal (or the
 * other way round). Starting either action resets the OTHER mutation first (the forms' `onStart`) — ⛔ but only when that
 * other one FAILED: resetting a pending mutation drops its answer when it arrives and unlocks its form for a second submit,
 * so while EITHER is pending, BOTH forms' submit buttons are disabled (`actionPending`) (V6); and resetting a SUCCEEDED one
 * unlocks its form before the refetch shows the new state — a second decision on a decided version, or a second withdrawal
 * of the same approval (W8). A success's confirmation is still true, so it stays beside the next action's answer; and the
 * decision form's lock is the page's own `decidedFor` (as the withdrawal's is `doneForThisTarget`), ⛔ the mutation's state.
 */
function ActionFeedback({
  decide,
  withdraw,
  chain,
}: {
  decide: DecideMutation;
  withdraw: WithdrawMutation;
  chain: readonly MemorialReviewVersion[];
}): ReactElement {
  const withdrawnAt = chain.findIndex((v) => v.submissionId === withdraw.variables?.targetSubmissionId);
  const withdrawnVersionNo = withdrawnAt < 0 ? null : withdrawnAt + 1;
  const decideErr = decide.error;
  const goneAway = decideErr instanceof ApiError && decideErr.status === 404;
  const invalidOnServer = decideErr instanceof ApiError && decideErr.code === 'memorial_review.invalid_omissions';
  const serverProblem =
    invalidOnServer && typeof decideErr.details === 'object' && decideErr.details !== null
      ? (decideErr.details as { problem?: unknown }).problem
      : undefined;
  return (
    <div data-testid="memorial-feedback">
      <div role="status" data-testid="memorial-feedback-status">
        {decide.isSuccess && <p>{t('memorial.decide.recorded')}</p>}
        {withdraw.isSuccess && <p>{withdrawAnswer('recorded', withdrawnVersionNo)}</p>}
      </div>
      {goneAway && <p role="alert">{t('memorial.decide.alreadyDone')}</p>}
      {invalidOnServer && <p role="alert">{problemSentence(serverProblem)}</p>}
      {decide.isError && !goneAway && !invalidOnServer && <p role="alert">{t('memorial.decide.error')}</p>}
      {withdraw.isError && <p role="alert">{withdrawAnswer('error', withdrawnVersionNo)}</p>}
    </div>
  );
}

function MemorialReviewDetail({ pariwarId, submissionId }: MemorialReviewDetailPageProps): ReactElement {
  const detail = useMemorialReview(pariwarId, submissionId);
  // The mutations are held HERE (see {@link ActionFeedback}); the forms only start them.
  const decide = useDecideMemorialReview(pariwarId, submissionId);
  const withdraw = useWithdrawMemorialApproval(pariwarId);
  // V6 — one action at a time: while either is in flight, neither form can submit (see {@link ActionFeedback}).
  const actionPending = decide.isPending || withdraw.isPending;
  // W8 — the version a decision SUCCEEDED for. Set from the decision's own success and ⛔ cleared by anything, so the form
  // stays locked until the refetch removes it (`canDecide` false) — whatever happens to the mutation's state meanwhile.
  const [decidedFor, setDecidedFor] = useState<string | null>(null);

  if (isForbidden(detail.error)) return <NoAccess />;

  const data = detail.data;
  // MA16 — the approval to withdraw is the chain's latest APPROVED version, which may be an EARLIER one than the version
  // open here (v1 approved, v2 pending): the form names it and posts to IT (R9).
  const withdrawTargetId = data !== undefined && data.canWithdrawApproval ? data.withdrawApprovalTargetId : null;
  const withdrawTargetAt = data !== undefined && withdrawTargetId !== null ? data.chain.findIndex((v) => v.submissionId === withdrawTargetId) : -1;

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
      {data && (
        <>
          <header>
            <h1 className="text-xl font-bold">{data.deceasedName ?? t('memorial.title')}</h1>
            <p className="text-sm opacity-70">{stateLabel(data.memorialState)}</p>
          </header>
          <h2 className="font-bold">{t('memorial.detail.history')}</h2>
          {data.chain.map((v, i) => (
            <VersionCard key={v.submissionId} version={v} current={v.submissionId === submissionId} label={versionLabel(data.chain, i)} />
          ))}
          <ActionFeedback decide={decide} withdraw={withdraw} chain={data.chain} />
          {data.canDecide && (
            <DecisionForm
              version={data.chain.find((v) => v.submissionId === submissionId)!}
              decide={decide}
              actionPending={actionPending}
              decided={decidedFor === submissionId}
              onDecided={() => setDecidedFor(submissionId)}
              onStart={() => {
                // Only a FAILED withdrawal's answer is cleared — ⛔ a pending one (V6) or a succeeded one (W8).
                if (withdraw.isError) withdraw.reset();
              }}
            />
          )}
          {/* Keyed on the target: after a withdrawal the chain's latest approved version can become an EARLIER one (v1 and v2
              both approved; v2's is withdrawn, the target flips to v1). The form for the new target must start fresh — its
              own empty reason and note, not the ones typed for the version just withdrawn. */}
          {withdrawTargetId !== null && (
            <WithdrawApprovalForm
              key={withdrawTargetId}
              targetSubmissionId={withdrawTargetId}
              targetLabel={withdrawTargetAt < 0 ? null : versionLabel(data.chain, withdrawTargetAt)}
              declared={withdrawTargetAt >= 0 && data.chain[withdrawTargetAt]!.guardianDeclaration}
              withdraw={withdraw}
              actionPending={actionPending}
              onStart={() => {
                // Only a FAILED decision's answer is cleared — ⛔ a pending one (V6) or a succeeded one (W8).
                if (decide.isError) decide.reset();
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

function VersionCard({
  version: v,
  current,
  label,
}: {
  version: MemorialReviewVersion;
  current: boolean;
  /** "Version 2 of 3 · Sent …" — the version's place in the chain, so the reviewer can tell which one an action names. */
  label: string;
}): ReactElement {
  const decided =
    v.body !== null && v.decision !== null && v.decision.action === 'approved_with_omissions'
      ? reconstructMemorial(
          { body: v.body, altText: v.altText },
          { omissions: v.decision.omissions, photoLeftOut: v.decision.photoLeftOutReason !== null },
        )
      : null;
  const hasBidi = [v.body, v.altText, ...(v.kinship ?? []).map((e) => e.name)].some(
    (x) => x !== null && bidiVisible(x).some((s) => s.kind === 'bidi'),
  );
  // Story 11b.5a (KL15) — the people the family ticked as in the photo, shown beside it (⛔ ever public).
  const inPhoto = (v.kinship ?? []).filter((e) => e.inPhoto === true);
  const declared = v.guardianDeclaration;
  return (
    <article
      className={`rounded border p-4 ${current ? 'border-2' : 'opacity-90'}`}
      data-testid={`memorial-version-${v.submissionId}`}
      aria-current={current ? 'true' : undefined}
    >
      <p className="text-sm opacity-70">
        {label}
        {current && <strong> — {t('memorial.detail.thisVersion')}</strong>}
      </p>
      <h3 className="mt-2 font-bold">{t('memorial.detail.words')}</h3>
      {v.body === null ? <p role="status">{t('memorial.detail.unavailable')}</p> : <StoredText text={v.body} testId="memorial-body" />}
      {/* `unavailable` is the API's word for ANY unreadable part (the words, the photo's description OR the family list). The
          words above are drawn when they did decrypt; this line says the version is not whole, and the form below is withheld —
          else a list-only failure would show the words, leave the list out and offer a form the API answers with a 500. */}
      {v.body !== null && v.unavailable !== null && <p role="status">{t('memorial.detail.partUnavailable')}</p>}
      {/* Story 11b.5a (KL12) — the family list, under the words and before the photo; each name shown with its hidden
          direction controls visible (R13's helper). */}
      {v.kinship !== null && (
        <div data-testid="memorial-kinship">
          <h3 className="mt-2 font-bold">{t('memorial.detail.kinship')}</h3>
          <p className="text-sm opacity-70">{t('memorial.detail.kinshipRelative')}</p>
          <ul className="list-disc pl-5">
            {v.kinship.map((e, i) => (
              <li key={i} data-testid="memorial-kinship-entry">
                {kinshipLabel(e.relation)} — <VisibleText text={e.name} />
                {e.inPhoto === true && <span className="text-sm opacity-70"> ({t('memorial.detail.inPhoto')})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {v.hasPhoto && (
        <>
          <h3 className="mt-2 font-bold">{t('memorial.detail.photo')}</h3>
          {/* A broken image shows its alt text RAW — so the alt goes through the same helper (R13). */}
          {v.photoUrl !== null && (
            <img src={v.photoUrl} alt={v.altText === null ? '' : bidiVisibleString(v.altText)} className="max-h-64 rounded" />
          )}
          {v.altText !== null && (
            <>
              <h4 className="text-sm font-bold">{t('memorial.detail.altText')}</h4>
              <StoredText text={v.altText} />
            </>
          )}
          {inPhoto.length > 0 && (
            <div data-testid="memorial-kinship-in-photo">
              <h4 className="text-sm font-bold">{t('memorial.detail.kinshipInPhoto')}</h4>
              <ul className="list-disc pl-5 text-sm">
                {inPhoto.map((e, i) => (
                  <li key={i}>
                    {kinshipLabel(e.relation)} — <VisibleText text={e.name} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {hasBidi && <p className="text-sm opacity-70">{t('memorial.detail.bidiNotice')}</p>}
      <p className="mt-2 text-xs opacity-70">
        {t('memorial.detail.permission')}: <code>{v.authorisationCopyVersion}</code> ({v.authorisationLocale})
      </p>
      {/* KL16 — keyed on the server's flag (`guardianDeclaration`), ⛔ on the version id; v1–v3 rows show ⛔ banner. */}
      {declared && (
        <p className="mt-1 rounded border p-2 text-sm" data-testid="memorial-declaration">
          {t('memorial.detail.declaration')}
        </p>
      )}
      {v.decision !== null && (
        <div className="mt-3" data-testid="memorial-decision">
          <h3 className="font-bold">{t('memorial.detail.decision')}: {t(`memorial.action.${v.decision.action}`)}</h3>
          {v.decision.reasonCode !== null && <p>{reasonLabel(v.decision.reasonCode, declared)}</p>}
          {v.decision.omissions.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {v.decision.omissions.map((o) => {
                const source = o.field === 'body' ? v.body : v.altText;
                return (
                  <li key={`${o.field}:${o.start}`} data-testid="memorial-omission">
                    “{source === null ? '…' : <VisibleText text={source.slice(o.start, o.end)} />}” — {reasonLabel(o.reason, declared)}
                  </li>
                );
              })}
            </ul>
          )}
          {v.decision.photoLeftOutReason !== null && (
            <p>
              {t('memorial.detail.photoLeftOut')} — {reasonLabel(v.decision.photoLeftOutReason, declared)}
            </p>
          )}
          {v.decision.kinshipLeftOut.length > 0 && (
            <div data-testid="memorial-kinship-left-out">
              <h4 className="mt-2 text-sm font-bold">{t('memorial.detail.kinshipLeftOut')}</h4>
              <ul className="list-disc pl-5 text-sm">
                {v.decision.kinshipLeftOut.map((k) => {
                  const e = v.kinship?.[k.index];
                  return (
                    <li key={k.index}>
                      {e === undefined ? '…' : <>{kinshipLabel(e.relation)} — <VisibleText text={e.name} /></>} — {reasonLabel(k.reason, declared)}
                    </li>
                  );
                })}
              </ul>
            </div>
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
            {withdrawalLine(v.withdrawal)}
            {v.withdrawal.reasonCode !== null && <> — {reasonLabel(v.withdrawal.reasonCode, declared)}</>}
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

/**
 * One of the four reasons. Story 11b.5a (KL16) — `declared` (the version's `guardianDeclaration`): the child reason reads as a
 * child the declaration cannot cover, and the reviewer guidance (`-432` R3 A) is shown with the select — on EVERY reason select
 * (sentences, the photo, a list entry, not approving, withdrawing an approval). ⛔ For v1–v3 rows.
 */
function ReasonSelect({
  id,
  label,
  value,
  onChange,
  declared,
}: {
  id: string;
  label: string;
  value: MemorialReviewReason | '';
  onChange: (v: MemorialReviewReason | '') => void;
  declared: boolean;
}): ReactElement {
  // The select's `aria-label` replaces the wrapping label as its name, so the guidance inside that label would never be
  // announced: it is attached as the select's DESCRIPTION (unique per select, as `id` already is).
  const guidanceId = `${id}-guidance`;
  return (
    <label htmlFor={id} className="ml-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as MemorialReviewReason | '')}
        aria-label={label}
        aria-describedby={declared ? guidanceId : undefined}
      >
        <option value="">{t('memorial.decide.chooseReason')}</option>
        {MEMORIAL_REVIEW_REASONS.map((r) => (
          <option key={r} value={r}>
            {reasonLabel(r, declared)}
          </option>
        ))}
      </select>
      {declared && (
        <span id={guidanceId} className="block text-xs opacity-70" data-testid="memorial-child-guidance">
          {t('memorial.reason.childGuidance')}
        </span>
      )}
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
  declared,
}: {
  declared: boolean;
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
                <span className="whitespace-pre-wrap">
                  <VisibleText text={text.slice(r.start, r.end)} />
                </span>
              </label>
              {choice.checked && (
                <ReasonSelect
                  id={`reason-${key}`}
                  label={t('memorial.decide.reasonFor')}
                  value={choice.reason}
                  onChange={(reason) => onChoose(key, { ...choice, reason })}
                  declared={declared}
                />
              )}
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

/**
 * The mutation is the PAGE's ({@link ActionFeedback}): this form only starts it, and its answer is shown outside it.
 * `onStart` runs just before the decision is posted (the page clears the withdrawal's last answer if it FAILED — T12 (c),
 * V6, W8); `actionPending` is true while EITHER action is in flight, and locks the submit. `onDecided` tells the page the
 * decision succeeded; `decided` (the page's `decidedFor` is this version) then keeps the submit locked (W8).
 */
function DecisionForm({
  version: v,
  decide,
  actionPending,
  decided,
  onDecided,
  onStart,
}: {
  version: MemorialReviewVersion;
  decide: DecideMutation;
  actionPending: boolean;
  decided: boolean;
  onDecided: () => void;
  onStart: () => void;
}): ReactElement {
  const [action, setAction] = useState<MemorialReviewAction>('approved');
  const [choices, setChoices] = useState<Map<string, SentenceChoice>>(new Map());
  const [photoOut, setPhotoOut] = useState<SentenceChoice>({ checked: false, reason: '' });
  // Story 11b.5a (KL6 / KL12) — one choice per family-list entry, by its index (modelled on the photo control).
  const [kinshipOut, setKinshipOut] = useState<ReadonlyMap<number, SentenceChoice>>(new Map());
  // KL15 — the confirm when a ticked entry is left out on the child reason while the photo is kept (a confirm, ⛔ a refusal).
  const [inPhotoConfirmed, setInPhotoConfirmed] = useState(false);
  const [reasonCode, setReasonCode] = useState<MemorialReviewReason | ''>('');
  // ⛔ Starts EMPTY — an internal note, never shown to the family, ⛔ pre-filled from anything.
  const [internalNote, setInternalNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  if (v.body === null) return <p role="status">{t('memorial.detail.unavailable')}</p>;
  if (v.unavailable !== null) return <p role="status">{t('memorial.detail.partUnavailableForm')}</p>;
  const body = v.body;
  const locale = v.authorisationLocale;
  const bodyRanges = memorialSentenceRanges(body, locale);
  const altRanges = v.altText === null ? [] : memorialSentenceRanges(v.altText, locale);
  const kinship = v.kinship ?? [];
  const declared = v.guardianDeclaration;

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
      const kinshipLeftOut: { index: number; reason: MemorialReviewReason }[] = [];
      for (const [index, c] of [...kinshipOut].sort(([a], [b]) => a - b)) {
        if (!c.checked) continue;
        if (c.reason === '') {
          setProblem(t('memorial.decide.chooseReason'));
          return;
        }
        kinshipLeftOut.push({ index, reason: c.reason });
      }
      if (kinshipLeftOut.length > 0) candidate.kinshipLeftOut = kinshipLeftOut;
      // KL15 — a ticked person left out on the child reason while the photo stays: confirm once (the photo still shows them).
      const tickedChild = kinshipLeftOut.some((k) => k.reason === 'identifies_a_child' && kinship[k.index]?.inPhoto === true);
      if (tickedChild && v.hasPhoto && !photoOut.checked && !inPhotoConfirmed) {
        setInPhotoConfirmed(true);
        setProblem(t('memorial.decide.kinshipInPhotoConfirm'));
        return;
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
    const verdict = validateMemorialDecision(candidate, {
      body,
      altText: v.altText,
      hasPhoto: v.hasPhoto,
      kinshipLength: v.kinship === null ? null : v.kinship.length,
    });
    if (!verdict.ok) {
      setProblem(problemSentence(verdict.problem));
      return;
    }
    const payload: MemorialReviewDecisionInput = {
      action: candidate.action,
      ...(candidate.omissions ? { omissions: [...candidate.omissions] } : {}),
      ...(candidate.photoLeftOut ? { photoLeftOut: candidate.photoLeftOut } : {}),
      // Indexes and reasons ONLY — ⛔ a name (the input is `.strict()`; the reviewer never edits the list).
      ...(candidate.kinshipLeftOut ? { kinshipLeftOut: candidate.kinshipLeftOut.map((k) => ({ index: k.index, reason: k.reason })) } : {}),
      ...(candidate.reasonCode ? { reasonCode: candidate.reasonCode } : {}),
      ...(internalNote.trim() !== '' ? { internalNote } : {}),
    };
    onStart();
    // The callback is the PAGE's mutation observer's (the page stays mounted when this form unmounts on the refetch).
    decide.mutate(payload, { onSuccess: onDecided });
  };

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
          <SentencePicker
            field="body"
            text={body}
            ranges={bodyRanges}
            choices={choices}
            onChoose={choose}
            legend={t('memorial.decide.sentencesBody')}
            declared={declared}
          />
          {v.altText !== null && (
            <SentencePicker
              field="altText"
              text={v.altText}
              ranges={altRanges}
              choices={choices}
              onChoose={choose}
              legend={t('memorial.decide.sentencesAlt')}
              declared={declared}
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
                  declared={declared}
                />
              )}
            </div>
          )}
          {kinship.length > 0 && (
            <fieldset className="mt-2" data-testid="memorial-kinship-choices">
              <legend className="text-sm font-bold">{t('memorial.decide.kinship')}</legend>
              <p className="text-xs opacity-70">{t('memorial.detail.kinshipRelative')}</p>
              <ol className="flex flex-col gap-1">
                {kinship.map((e, index) => {
                  const choice = kinshipOut.get(index) ?? { checked: false, reason: '' };
                  const set = (next: SentenceChoice): void => {
                    setInPhotoConfirmed(false);
                    setKinshipOut((prev) => new Map(prev).set(index, next));
                  };
                  return (
                    <li key={index} data-testid="memorial-kinship-choice">
                      <label>
                        <input type="checkbox" checked={choice.checked} onChange={(ev) => set({ ...choice, checked: ev.target.checked })} />{' '}
                        <span className="sr-only">{t('memorial.decide.kinshipLeaveOut')}: </span>
                        {kinshipLabel(e.relation)} — <VisibleText text={e.name} />
                        {e.inPhoto === true && <span className="text-xs opacity-70"> ({t('memorial.detail.inPhoto')})</span>}
                      </label>
                      {choice.checked && (
                        <ReasonSelect
                          id={`reason-kinship-${index}`}
                          label={t('memorial.decide.reasonFor')}
                          value={choice.reason}
                          onChange={(reason) => set({ ...choice, reason })}
                          declared={declared}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </fieldset>
          )}
        </>
      )}

      {action === 'not_approved' && (
        <div className="mt-2">
          <ReasonSelect
            id="reason-not-approved"
            label={t('memorial.decide.reasonCode')}
            value={reasonCode}
            onChange={setReasonCode}
            declared={declared}
          />
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

      <button type="button" className="mt-3 rounded border px-4 py-2" disabled={actionPending || decided} onClick={submit}>
        {t('memorial.decide.submit')}
      </button>
    </section>
  );
}

// ── The Trust withdraws its own approval (MA16) ──────────────────────────────────────────────────────────────────────

/**
 * Posts to `targetSubmissionId` — the chain's latest APPROVED version, ⛔ not the version the page has open — and says which
 * version that is, so the reviewer never withdraws an approval they cannot see (R9). The mutation is the PAGE's
 * ({@link ActionFeedback}); this form only starts it. `onStart` runs just before the withdrawal is posted (the page clears
 * the decision's last answer if it FAILED — T12 (c), V6, W8); `actionPending` is true while EITHER action is in flight,
 * and locks the submit.
 */
function WithdrawApprovalForm({
  targetSubmissionId,
  targetLabel,
  withdraw,
  actionPending,
  onStart,
  declared,
}: {
  /** KL16 — the TARGET version's `guardianDeclaration` (the label and the guidance on its reason select). */
  declared: boolean;
  targetSubmissionId: string;
  /** "Version 1 of 2 · Sent …" for the version being withdrawn; `null` if it is not in the chain (never expected). */
  targetLabel: string | null;
  withdraw: WithdrawMutation;
  actionPending: boolean;
  onStart: () => void;
}): ReactElement {
  const [reason, setReason] = useState<MemorialReviewReason | ''>('');
  // ⛔ Starts EMPTY.
  const [internalNote, setInternalNote] = useState('');
  // The page's mutation remembers its LAST call. Done is done only for THIS target: once the chain's target has moved on to
  // an earlier approved version, the success of the previous withdrawal must not lock the new one.
  const doneForThisTarget = withdraw.isSuccess && withdraw.variables?.targetSubmissionId === targetSubmissionId;
  return (
    <section aria-label={t('memorial.withdraw.title')} data-testid="memorial-withdraw-form" className="rounded border p-4">
      <h2 className="font-bold">{t('memorial.withdraw.title')}</h2>
      {targetLabel !== null && (
        <p className="text-sm font-bold" data-testid="memorial-withdraw-target">
          {t('memorial.withdraw.target')} {targetLabel}
        </p>
      )}
      <p className="text-sm opacity-70">{t('memorial.withdraw.hint')}</p>
      <ReasonSelect id="reason-withdraw" label={t('memorial.withdraw.reason')} value={reason} onChange={setReason} declared={declared} />
      <label className="mt-3 block">
        {t('memorial.withdraw.internalNote')}
        <textarea className="mt-1 w-full rounded border p-2" rows={3} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
      </label>
      <button
        type="button"
        className="mt-3 rounded border px-4 py-2"
        disabled={reason === '' || actionPending || doneForThisTarget}
        onClick={() => {
          if (reason === '') return;
          onStart();
          withdraw.mutate({
            targetSubmissionId,
            body: { reasonCode: reason, ...(internalNote.trim() !== '' ? { internalNote } : {}) },
          });
        }}
      >
        {t('memorial.withdraw.submit')}
      </button>
    </section>
  );
}
