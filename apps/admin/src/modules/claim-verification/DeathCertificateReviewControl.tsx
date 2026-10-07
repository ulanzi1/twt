// The District Admin's DEATH-CERTIFICATE REVIEW on the verifier console — Story 6.21a (Task 6; D10, AC1, AC5).
//
// `2026-09-20-235` Y: only a certificate with a clear date is acceptable. `2026-09-20-236` BB: a rejection asks
// the family for another, and the claim is ⛔ never refused for it.
//   · <DeathCertificateReviewStatus> — the item's review status, reason, who and when. ⛔ Never colour alone:
//     every state is WORDS.
//   · <DeathCertificateReviewControl> — ACCEPT (the District Admin TYPES the date: the input starts EMPTY and
//     the OCR reading sits beside it, labelled as a machine reading — invariant 1) or REJECT (one of three
//     reasons). A note is required either way. The parent mounts it ONLY for `viewer.canReview` (judged
//     server-side); the route's key stays the boundary.
//   · <DeathCertificateHistory> — every certificate sent, newest first, with its reviews — the dates and notes
//     DECRYPTED on demand. ⭐ Tier-1 shipped with ⛔ no reader is a defect: this is the notes' reader.
// PURE presentational components — the route owns the queries, the forget-on-close and the claim keying.

import { DeathCertificateRegisterCheck } from '@twt/contracts';
import type { DeathCertificateHistoryResponse, VerifierReviewItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.deathCertificate;

export type DeathCertificateReview = NonNullable<VerifierReviewItem['review']>;
export type DeathCertificateRejectionReason = 'no_date_of_death' | 'date_of_death_unclear' | 'date_of_death_in_future';
const REASONS: readonly DeathCertificateRejectionReason[] = ['no_date_of_death', 'date_of_death_unclear', 'date_of_death_in_future'];
/** Story 6.26b (GI8) — the government death-register check, from `@twt/contracts` (code review 2026-10-07: was a
 *  hand-redeclared literal union; lockstep now holds structurally, not by a separate test). LOCKSTEP remains with
 *  `@twt/domain`'s `DEATH_CERTIFICATE_REGISTER_CHECKS` and migration 0149's CHECK. */
export type RegisterCheck = DeathCertificateRegisterCheck;
const REGISTER_CHECKS: readonly RegisterCheck[] = DeathCertificateRegisterCheck.options;

export interface DeathCertificateReviewSubmit {
  verdict: 'accepted' | 'rejected';
  accepted_date?: string;
  rejection_reason?: DeathCertificateRejectionReason;
  /** ACCEPT only (Story 6.26b GI8). */
  register_check?: RegisterCheck;
  note: string;
}

/** Story 6.26b (GI8; RD31) — an accepted review's register check in WORDS; an accepted review with ⛔ check (recorded
 *  before 6.26b) says so; a rejected review shows nothing. */
function registerCheckWords(verdict: string, check: RegisterCheck | null): string | null {
  if (verdict !== 'accepted') return null;
  return check === null ? t.registerCheckNotRecorded : t.registerChecks[check]!;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

/** The item's review status in WORDS (⛔ never colour alone): status, reason, who and when. */
export function DeathCertificateReviewStatus({ review }: { review: DeathCertificateReview }): ReactElement {
  return (
    <p className="text-sm" data-testid="death-certificate-review-status" data-status={review.status}>
      <span className="font-medium">{t.statusLabel}:</span> {t.status[review.status]}
      {review.rejectionReason ? <> — {t.reasons[review.rejectionReason]}</> : null}
      {registerCheckWords(review.status, review.registerCheck) !== null ? (
        <span data-testid="death-certificate-register-check">
          {' '}
          · {t.registerCheckLabel}: {registerCheckWords(review.status, review.registerCheck)}
        </span>
      ) : null}
      {review.decidedByDisplay ? (
        <>
          {' '}
          {t.decidedBy} {review.decidedByDisplay}
        </>
      ) : null}
      {review.decidedAt ? (
        <>
          {' '}
          {t.decidedAt} {fmt(review.decidedAt)}
        </>
      ) : null}
    </p>
  );
}

export interface DeathCertificateReviewControlProps {
  review: DeathCertificateReview;
  /** The OCR's reading of the date of death — shown BESIDE the empty input, labelled, ⛔ never pre-filled. */
  ocrDateOfDeath: string | null;
  /** Which form is open. Controlled, so the preview's "Request a better document" can open the reject form. */
  mode: 'accept' | 'reject' | null;
  onModeChange: (mode: 'accept' | 'reject' | null) => void;
  /** Resolves `true` when the review was recorded — the form clears ONLY then. */
  onSubmit: (input: DeathCertificateReviewSubmit) => Promise<boolean>;
  processing?: boolean;
  error?: string | null;
  recorded?: boolean;
}

export function DeathCertificateReviewControl(props: DeathCertificateReviewControlProps): ReactElement {
  const { review, mode } = props;
  const [date, setDate] = useState('');
  const [reason, setReason] = useState<DeathCertificateRejectionReason | null>(null);
  // Story 6.26b (GI8) — ⛔ nothing pre-selected (the reject-reason radio's pattern).
  const [registerCheck, setRegisterCheck] = useState<RegisterCheck | null>(null);
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  // `onSubmit`'s contract is to resolve `false`, never reject (its real caller never does) — this is a
  // defensive fallback ONLY for a future caller that breaks that contract, so the form still says SOMETHING.
  const [submitError, setSubmitError] = useState(false);

  // ⭐ A different certificate (a replacement) or a different live review is a different judgement: start again.
  const fingerprint = `${review.certificateToken ?? '-'}|${review.liveReviewId ?? '-'}|${mode ?? '-'}`;
  useEffect(() => {
    setDate('');
    setReason(null);
    setRegisterCheck(null);
    setNote('');
    setIncomplete(false);
    setSubmitError(false);
  }, [fingerprint]);

  const ready =
    mode === 'accept'
      ? /^\d{4}-\d{2}-\d{2}$/.test(date) && registerCheck !== null && note.trim() !== ''
      : reason !== null && note.trim() !== '';

  // The refusal clears itself once the form becomes valid — ⛔ not only on the next submit attempt.
  // ⚠ MUST stay above the `certificateToken === null` early return below: `certificateToken` can flip on
  // the SAME mounted instance (the OCR job creating the upload row after mount) — a hook after a
  // conditional return would then change the hook count mid-life and crash (Rules of Hooks).
  useEffect(() => {
    if (ready) setIncomplete(false);
  }, [ready]);

  // Family 13(d) — a form opened from ELSEWHERE (the preview's "Request a better document" opens the reject
  // form further down the page) must be announced: focus moves into the opened fieldset, whose legend is read.
  // ⛔ Only then: when the District Admin used this control's OWN Accept / Reject toggle, focus is already here
  // and is ⛔ not moved (adversarial review 2026-09-26). ⚠ Also above the early return (Rules of Hooks, as above).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFieldSetElement | null>(null);
  useEffect(() => {
    if (mode === null) return;
    const active = typeof document === 'undefined' ? null : document.activeElement;
    if (active && rootRef.current?.contains(active)) return;
    formRef.current?.focus();
  }, [mode]);

  if (review.certificateToken === null) {
    return (
      <p className="text-sm" data-testid="death-certificate-no-token">
        {t.noToken}
      </p>
    );
  }

  async function submit(): Promise<void> {
    if (!ready || mode === null) {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    setSubmitError(false);
    let ok = false;
    try {
      ok = await props.onSubmit(
        mode === 'accept'
          ? { verdict: 'accepted', accepted_date: date, register_check: registerCheck!, note: note.trim() }
          : { verdict: 'rejected', rejection_reason: reason!, note: note.trim() },
      );
    } catch {
      // A caller that breaks the "resolve `false`, never reject" contract must ⛔ not leave the form with
      // no feedback at all — `props.error` won't be set for a THROWN rejection, so this fills the gap.
      ok = false;
      setSubmitError(true);
    }
    if (ok) props.onModeChange(null);
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2" data-testid="death-certificate-review-control">
      <p className="text-xs">{t.intro}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          aria-pressed={mode === 'accept'}
          disabled={props.processing}
          data-testid="death-certificate-accept"
          onClick={() => props.onModeChange(mode === 'accept' ? null : 'accept')}
        >
          {t.accept}
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          aria-pressed={mode === 'reject'}
          disabled={props.processing}
          data-testid="death-certificate-reject"
          onClick={() => props.onModeChange(mode === 'reject' ? null : 'reject')}
        >
          {t.reject}
        </button>
      </div>

      {mode === 'accept' ? (
        <fieldset ref={formRef} tabIndex={-1} className="flex flex-col gap-2 rounded border p-3" data-testid="death-certificate-accept-form">
          <legend className="text-sm font-semibold">{t.acceptHeading}</legend>
          <label className="flex flex-col text-sm">
            {t.dateLabel}
            {/* ⭐ Invariant 1 — EMPTY until the District Admin types it; ⛔ never the OCR's value. */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="death-certificate-date"
              aria-describedby="death-certificate-date-help death-certificate-ocr"
            />
          </label>
          <p id="death-certificate-date-help" className="text-xs">
            {t.dateHelp}
          </p>
          <p id="death-certificate-ocr" className="text-xs" data-testid="death-certificate-ocr">
            {t.ocrLabel}: {props.ocrDateOfDeath ?? t.ocrNone}
          </p>
          {/* Story 6.26b (GI8; `-262` FQ8 B) — the government register check, its OWN group named by the question. */}
          <fieldset className="flex flex-col gap-2" data-testid="death-certificate-register-checks" aria-describedby="death-certificate-register-help">
            <legend className="text-sm">{t.registerCheckLegend}</legend>
            {REGISTER_CHECKS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="death-certificate-register-check"
                  value={c}
                  checked={registerCheck === c}
                  onChange={() => setRegisterCheck(c)}
                  data-testid={`death-certificate-register-check-${c}`}
                />
                {t.registerChecks[c]}
              </label>
            ))}
          </fieldset>
          <p id="death-certificate-register-help" className="text-xs">
            {t.registerCheckHelp}
          </p>
        </fieldset>
      ) : null}

      {mode === 'reject' ? (
        <fieldset ref={formRef} tabIndex={-1} className="flex flex-col gap-2 rounded border p-3" data-testid="death-certificate-reject-form">
          <legend className="text-sm font-semibold">{t.rejectHeading}</legend>
          {/* The reasons are their OWN group, named by the question — ⛔ not a bare paragraph beside them. */}
          <fieldset className="flex flex-col gap-2" data-testid="death-certificate-reasons">
            <legend className="text-sm">{t.reasonLegend}</legend>
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="death-certificate-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  data-testid={`death-certificate-reason-${r}`}
                />
                {t.reasons[r]}
              </label>
            ))}
          </fieldset>
        </fieldset>
      ) : null}

      {mode !== null ? (
        <>
          <label className="flex flex-col text-sm">
            {t.note}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby="death-certificate-note-help"
              data-testid="death-certificate-note"
            />
          </label>
          <p id="death-certificate-note-help" className="text-xs">
            {t.noteHelp}
          </p>
          {incomplete ? (
            <p role="alert" data-testid="death-certificate-incomplete">
              {mode === 'accept' ? t.incompleteAccept : t.incompleteReject}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white aria-disabled:opacity-50"
              disabled={props.processing}
              aria-disabled={!ready || Boolean(props.processing)}
              data-testid="death-certificate-submit"
              onClick={() => void submit()}
            >
              {mode === 'accept' ? t.submitAccept : t.submitReject}
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm"
              disabled={props.processing}
              onClick={() => props.onModeChange(null)}
            >
              {t.cancel}
            </button>
          </div>
        </>
      ) : null}

      {props.error || submitError ? (
        <p role="alert" data-testid="death-certificate-error">
          {props.error ?? t.refusedGeneric}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="death-certificate-recorded">
        {props.recorded && !props.error ? `${t.recorded} ${t.redetermineHint}` : ''}
      </p>
    </div>
  );
}

type ReadableValue = { state: 'readable'; value: string } | { state: 'unreadable' } | { state: 'anonymized' } | null;

/** A decrypted value in WORDS: erased (RTBF — permanent) is ⛔ not "could not be read" (`2026-09-26-246` §2). */
function Value({ v }: { v: ReadableValue }): ReactElement | null {
  if (!v) return null;
  if (v.state === 'readable') return <span>{v.value}</span>;
  return <span className="italic">{v.state === 'anonymized' ? t.history.anonymized : t.history.unreadable}</span>;
}

export interface DeathCertificateHistoryProps {
  history?: DeathCertificateHistoryResponse | undefined;
  loading?: boolean;
  error?: string | null;
}

/** Every certificate sent, newest first, with its reviews — the dates and notes decrypted (on demand). */
export function DeathCertificateHistory({ history, loading, error }: DeathCertificateHistoryProps): ReactElement {
  if (loading) {
    return (
      <p role="status" data-testid="death-certificate-history-loading">
        {t.history.loading}
      </p>
    );
  }
  if (error || !history) {
    return (
      <p role="alert" data-testid="death-certificate-history-error">
        {error ?? t.history.error}
      </p>
    );
  }
  if (history.uploads.length === 0) return <p data-testid="death-certificate-history-empty">{t.history.empty}</p>;
  return (
    <>
      <ol className="flex flex-col gap-3" data-testid="death-certificate-history">
        {history.uploads.map((u) => (
          <li key={u.upload_id} className="rounded border p-2 text-sm" data-testid="death-certificate-history-upload">
            <p className="font-medium">
              {u.current ? t.history.current : t.history.earlier} · {t.history.channel[u.channel]} · {t.history.uploadedAt}{' '}
              {fmt(u.uploaded_at)} ·{' '}
              {u.preview.signed_url ? (
                <a href={u.preview.signed_url} target="_blank" rel="noreferrer" className="underline">
                  {t.history.open}
                </a>
              ) : (
                <span className="italic" data-testid="death-certificate-preview-unavailable">
                  {t.history.previewUnavailable}
                </span>
              )}
            </p>
            {u.reviews.length === 0 ? (
              <p className="text-xs">{t.history.notReviewed}</p>
            ) : (
              <ul className="ml-4 flex flex-col gap-1">
                {u.reviews.map((r) => (
                  <li key={r.review_id} data-testid="death-certificate-history-review">
                    {t.status[r.verdict]}
                    {r.rejection_reason ? <> — {t.reasons[r.rejection_reason]}</> : null}
                    {registerCheckWords(r.verdict, r.register_check) !== null ? (
                      <span data-testid="death-certificate-history-register-check">
                        {' '}
                        · {t.registerCheckLabel}: {registerCheckWords(r.verdict, r.register_check)}
                      </span>
                    ) : null}
                    {r.accepted_date ? (
                      <>
                        {' '}
                        · {t.history.acceptedDate}: <Value v={r.accepted_date} />
                      </>
                    ) : null}{' '}
                    · {t.decidedBy} {r.decided_by_display} {t.decidedAt} {fmt(r.decided_at)}
                    {r.superseded_reason ? <> · {t.history.superseded[r.superseded_reason]}</> : null}
                    <p className="text-xs">
                      {t.note}: <Value v={r.note} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      {/* The caller's ONLY signal that older certificates were left out — ⛔ never let the list read as complete. */}
      {history.truncated ? (
        <p className="text-xs" data-testid="death-certificate-history-truncated">
          {t.history.truncated}
        </p>
      ) : null}
    </>
  );
}
