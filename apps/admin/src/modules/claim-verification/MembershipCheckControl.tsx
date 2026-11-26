// The District Admin's MEMBERSHIP CHECK on the verifier console — Story 6.39 (Task 6; DL8, DL12; AC12).
//
// `2026-10-31-424` Q1 (a) C: an identity nobody has checked *"is checked first, by staff, from the death documents and
// the details on record, before any drive opens."* `2026-10-31-430` Q1 B: *"staff compare the date of death on the
// certificate with the date the fee was paid."*
//   · The FEE half is the SYSTEM's: the two dates and the result are SHOWN — the staff member sees the comparison and
//     records the check, but types neither date and cannot change the result (N3).
//   · The IDENTITY half is the STAFF MEMBER's, and only when nobody has checked the identity: the death documents on
//     the claim beside the details on record, then `confirmed` or `not confirmed` (a reason and a note). ⛔ Nothing is
//     pre-selected. "Not confirmed" makes the claim WAIT — it is ⛔ never a refusal (N5).
// PURE presentational — the route owns the preview query, the mutation, the open state and the claim keying, and mounts
// this ONLY for `membershipCheckGate.viewer.canCheckMembership` (judged server-side); the route's key stays the boundary.
// ⛔ Never colour alone: every state is WORDS. English only (the admin console's posture).

import type { MembershipCheckGateStatus, MembershipCheckPreviewResponse } from '@twt/contracts';
import { MEMBERSHIP_CHECK_IDENTITY_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { DocumentPreview } from './DocumentPreview.js';
import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.membershipCheck;

type IdentityJudgment = 'confirmed' | 'not_confirmed';
type IdentityReason = (typeof MEMBERSHIP_CHECK_IDENTITY_REASONS)[number];
const JUDGMENTS: readonly IdentityJudgment[] = ['confirmed', 'not_confirmed'];

/** One death document on the claim, as the console packet already carries it (a short-lived signed URL). */
export interface MembershipCheckDocument {
  readonly key: string;
  /** `death_certificate` | `hospital_record` | `ground_inspection_photo` | `original_certificate_photo` | another type. */
  readonly kind: string;
  readonly signedUrl: string;
  readonly contentType: string;
  readonly filename?: string;
}

export interface MembershipCheckSubmit {
  identity_outcome: 'not_required' | IdentityJudgment;
  identity_reason?: IdentityReason;
  note?: string;
}

export interface MembershipCheckControlProps {
  /** The console packet's section — the gate's own answer, known WITHOUT opening the control. */
  gate: MembershipCheckGateStatus;
  /** The claim's current death certificate is accepted (and its determination is current). */
  certificateAccepted: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The audited preview — `undefined` until it has loaded. */
  preview: MembershipCheckPreviewResponse | undefined;
  loading?: boolean;
  loadError?: string | null;
  /** The details on record the console packet already carries (⛔ a second place that opens them). */
  memberRecord: { readonly name: string | null; readonly dateOfBirth: string | null };
  documents: readonly MembershipCheckDocument[];
  /** Resolves `true` when the check was recorded — the form clears ONLY then. */
  onSubmit: (input: MembershipCheckSubmit) => Promise<boolean>;
  processing?: boolean;
  error?: string | null;
  recorded?: boolean;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

/** The gate's state in WORDS — shown whether or not the control is open. */
export function membershipCheckGateWords(gate: MembershipCheckGateStatus): string {
  if (!gate.available) return t.approveBlocked.unavailable!;
  if (gate.passed) return t.passed;
  return t.approveBlocked[gate.reason ?? 'not_checked'] ?? t.approveBlocked.not_checked!;
}

export function MembershipCheckControl(props: MembershipCheckControlProps): ReactElement {
  const { gate, preview, open } = props;
  const [judgment, setJudgment] = useState<IdentityJudgment | null>(null);
  const [reason, setReason] = useState<IdentityReason | null>(null);
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);

  // ⭐ A different certificate review, or a different live check, is a different judgement: start again.
  // Story 6.39a — a different bank-date record too (the comparison it feeds changed).
  const fingerprint = `${preview?.expected_live_review_id ?? '-'}|${preview?.live_check?.check_id ?? '-'}|${preview?.fee_bank_date?.record_id ?? '-'}|${open ? 'open' : 'closed'}`;
  useEffect(() => {
    setJudgment(null);
    setReason(null);
    setNote('');
    setIncomplete(false);
  }, [fingerprint]);

  const identityRequired = preview?.identity_required === true;
  const ready = !identityRequired
    ? true
    : judgment === 'confirmed'
      ? true
      : judgment === 'not_confirmed'
        ? reason !== null && note.trim() !== ''
        : false;
  // The refusal clears itself once the form becomes valid — ⛔ only on the next submit attempt.
  useEffect(() => {
    if (ready) setIncomplete(false);
  }, [ready]);

  // The check can be recorded only against an accepted certificate, inside the window, with the joining fee's record identified.
  const recordable =
    preview !== undefined && preview.window_open && preview.expected_live_review_id !== null && preview.fee_receipt_found && preview.fee_outcome !== null;

  async function submit(): Promise<void> {
    if (!ready || !recordable) {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    const trimmed = note.trim();
    await props.onSubmit({
      identity_outcome: identityRequired ? judgment! : 'not_required',
      ...(identityRequired && judgment === 'not_confirmed' ? { identity_reason: reason! } : {}),
      ...(trimmed !== '' ? { note: trimmed } : {}),
    });
  }

  return (
    <div className="flex flex-col gap-2" data-testid="membership-check-control">
      <p className="text-xs">{t.intro}</p>
      <p className="text-sm" data-testid="membership-check-gate" data-passed={gate.available && gate.passed ? 'true' : 'false'}>
        {membershipCheckGateWords(gate)}
      </p>

      {!props.certificateAccepted ? (
        // ⭐ Disabled WITH A LINE until a certificate is accepted — the comparison needs its date.
        <p className="text-sm" data-testid="membership-check-needs-certificate">
          {t.needsCertificate}
        </p>
      ) : (
        <>
          <button
            type="button"
            className="self-start text-sm underline"
            aria-expanded={open}
            data-testid="membership-check-disclosure"
            onClick={() => props.onOpenChange(!open)}
          >
            {open ? t.hide : t.show}
          </button>
          <p className="text-xs">{t.audited}</p>
        </>
      )}

      {open && props.certificateAccepted ? (
        props.loading ? (
          <p role="status" data-testid="membership-check-loading">
            {t.loading}
          </p>
        ) : props.loadError ? (
          <p role="alert" data-testid="membership-check-load-error">
            {props.loadError}
          </p>
        ) : preview ? (
          <div className="flex flex-col gap-3 rounded border p-3" data-testid="membership-check-body">
            {/* ── The fee half — the SYSTEM's comparison, shown (N3). ── */}
            <section aria-labelledby="membership-check-fee-heading" className="flex flex-col gap-1">
              <h4 id="membership-check-fee-heading" className="text-sm font-semibold">
                {t.feeHeading}
              </h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                <dt>{t.dateOfDeath}</dt>
                <dd data-testid="membership-check-date-of-death">{preview.date_of_death ?? t.recordUnknown}</dd>
                <dt>{t.feePaidOn}</dt>
                <dd data-testid="membership-check-fee-paid-on">{preview.fee_paid_on ?? t.recordUnknown}</dd>
              </dl>
              {preview.fee_outcome !== null ? (
                <p className="text-sm font-medium" data-testid="membership-check-fee-outcome" data-outcome={preview.fee_outcome}>
                  {t.feeOutcome[preview.fee_outcome]}
                </p>
              ) : null}
              {!preview.fee_receipt_found ? (
                <p role="alert" data-testid="membership-check-no-joining-fee">
                  {t.noFeeReceipt}
                </p>
              ) : (
                <p className="text-xs">{t.feeComputed}</p>
              )}
              {/* Story 6.39a (DL11) — the bank's date, when the comparison used it (the SERVER says which date — DL6). */}
              {preview.fee_date_source === 'bank' && preview.fee_bank_date ? (
                <p className="text-sm" data-testid="membership-check-fee-bank-date">
                  {t.feeBankDateUsed
                    .replace('{date}', preview.fee_bank_date.bank_credit_date)
                    .replace('{name}', preview.fee_bank_date.recorded_by_display)}
                </p>
              ) : null}
              {/* `-473` Q1 B — a fee paid ON the day of death counts as after: the same note (`-474` item 3). The SERVER says
                  which outcomes stop the drive (N1 — ⛔ a second definition here; code review 2026-11-21). Story 6.39a (DL11):
                  from the RECORDED date the note is the amended, record-first one; from the BANK's date today's note stands. */}
              {preview.fee_blocks_approval ? (
                <p
                  className="text-sm"
                  data-testid="membership-check-fee-after-death-note"
                  data-source={preview.fee_date_source}
                >
                  {preview.fee_date_source === 'bank' ? t.feeAfterDeathNote : t.feeAfterDeathNoteRecorded}
                </p>
              ) : null}
            </section>

            {/* ── The details on record. ── */}
            <section aria-labelledby="membership-check-identity-heading" className="flex flex-col gap-1">
              <h4 id="membership-check-identity-heading" className="text-sm font-semibold">
                {t.identityHeading}
              </h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                <dt>{t.kycRouteLabel}</dt>
                <dd data-testid="membership-check-kyc-route" data-route={preview.kyc_route}>
                  {t.kycRoute[preview.kyc_route]}
                </dd>
                <dt>{t.recordName}</dt>
                <dd data-testid="membership-check-record-name">{props.memberRecord.name ?? t.recordUnknown}</dd>
                <dt>{t.recordDateOfBirth}</dt>
                <dd data-testid="membership-check-record-dob">{props.memberRecord.dateOfBirth ?? t.recordUnknown}</dd>
                <dt>{t.recordPosting}</dt>
                <dd data-testid="membership-check-record-posting">{preview.latest_posting_district ?? t.recordUnknown}</dd>
              </dl>
            </section>

            {/* ── The death documents on the claim (`-424`: "from the death documents and the details on record"). ── */}
            <section aria-labelledby="membership-check-documents-heading" className="flex flex-col gap-2" data-testid="membership-check-documents">
              <h4 id="membership-check-documents-heading" className="text-sm font-semibold">
                {t.documentsHeading}
              </h4>
              {props.documents.length === 0 ? (
                <p className="text-sm">{t.documentsNone}</p>
              ) : (
                props.documents.map((d) => (
                  <div key={d.key} data-testid="membership-check-document" data-kind={d.kind}>
                    <DocumentPreview
                      signedUrl={d.signedUrl}
                      contentType={d.contentType}
                      // A KNOWN kind always shows its words: the packet's `filename` is the raw document type
                      // (`death_certificate`) — found in the real-browser pass, ⛔ shown to staff as a code.
                      filename={t.documentLabel[d.kind] ?? d.filename ?? d.kind}
                    />
                  </div>
                ))
              )}
            </section>

            {preview.live_check ? (
              <p className="text-sm" data-testid="membership-check-live">
                <span className="font-medium">{t.liveHeading}:</span> {t.feeOutcome[preview.live_check.fee_outcome]} ·{' '}
                {t.liveIdentity[preview.live_check.identity_outcome]}
                {preview.live_check.identity_reason ? <> — {t.reasons[preview.live_check.identity_reason]}</> : null} {t.liveBy}{' '}
                {preview.live_check.decided_by_display} {t.liveOn} {fmt(preview.live_check.decided_at)}
              </p>
            ) : null}

            {/* ── The form. ── */}
            {!preview.window_open ? (
              <p className="text-sm" data-testid="membership-check-window-closed">
                {t.windowClosed}
              </p>
            ) : preview.expected_live_review_id === null ? (
              <p className="text-sm" data-testid="membership-check-needs-certificate">
                {t.needsCertificate}
              </p>
            ) : recordable ? (
              <div className="flex flex-col gap-2" data-testid="membership-check-form">
                {identityRequired ? (
                  <fieldset className="flex flex-col gap-2" data-testid="membership-check-identity" aria-describedby="membership-check-criterion">
                    <legend className="text-sm font-medium">{t.identityLegend}</legend>
                    <p id="membership-check-criterion" className="text-xs" data-testid="membership-check-criterion">
                      {t.identityCriterion}
                    </p>
                    {JUDGMENTS.map((j) => (
                      <label key={j} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="membership-check-identity"
                          value={j}
                          checked={judgment === j}
                          onChange={() => setJudgment(j)}
                          data-testid={`membership-check-identity-${j}`}
                        />
                        {t.identityOutcome[j]}
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="text-sm" data-testid="membership-check-identity-not-required">
                    {t.identityNotRequired}
                  </p>
                )}

                {identityRequired && judgment === 'not_confirmed' ? (
                  <>
                    <fieldset className="flex flex-col gap-2" data-testid="membership-check-reasons">
                      <legend className="text-sm">{t.reasonLegend}</legend>
                      {MEMBERSHIP_CHECK_IDENTITY_REASONS.map((r) => (
                        <label key={r} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="membership-check-reason"
                            value={r}
                            checked={reason === r}
                            onChange={() => setReason(r)}
                            data-testid={`membership-check-reason-${r}`}
                          />
                          {t.reasons[r]}
                        </label>
                      ))}
                    </fieldset>
                    <p className="text-xs" data-testid="membership-check-not-confirmed-help">
                      {t.notConfirmedHelp}
                    </p>
                  </>
                ) : null}

                <label className="flex flex-col text-sm">
                  {t.note}
                  <textarea
                    value={note}
                    maxLength={2000}
                    onChange={(e) => setNote(e.target.value)}
                    aria-describedby="membership-check-note-help"
                    data-testid="membership-check-note"
                  />
                </label>
                <p id="membership-check-note-help" className="text-xs">
                  {identityRequired && judgment === 'not_confirmed' ? t.noteHelpRequired : t.noteHelpOptional}
                </p>

                {incomplete ? (
                  <p role="alert" data-testid="membership-check-incomplete">
                    {judgment === 'not_confirmed' ? t.incompleteNotConfirmed : t.incompleteIdentity}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white aria-disabled:opacity-50"
                  disabled={props.processing}
                  aria-disabled={!ready || Boolean(props.processing)}
                  data-testid="membership-check-submit"
                  onClick={() => void submit()}
                >
                  {t.submit}
                </button>
              </div>
            ) : null}
          </div>
        ) : null
      ) : null}

      {props.error ? (
        <p role="alert" data-testid="membership-check-error">
          {props.error}
        </p>
      ) : null}
      {props.recorded && !props.error ? (
        <p role="status" data-testid="membership-check-recorded">
          {t.recorded}
        </p>
      ) : null}
    </div>
  );
}
