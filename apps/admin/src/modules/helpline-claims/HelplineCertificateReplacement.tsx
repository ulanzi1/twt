// `<HelplineCertificateReplacement>` — the helpline operator sends a REPLACEMENT death certificate on
// the family's behalf (Story 6.21b, D5). ⚠ Death-certificate REPLACEMENT, ⛔ not the general
// `DocumentTypeChooser` (still unwired — the 6.5 deferral stays open).
//
// Mirrors `<HelplineNomineeCorrection>`'s pick pattern: one live claim ⇒ used as-is (remembered);
// several ⇒ the operator picks (locked while a send is in flight); none ⇒ "no open claim". Each
// claim's SAME D1 status the family sees (from `useDeathCertificateClaimsForMember`, the SAME
// server-side resolver — BW-J5); the upload control shows ONLY when `upload_allowed` (`-247` §2 — so
// a certificate put off at filing can also be sent here). ⛔ No `certificate_token` on the wire here
// (⛔ no marker on the helpline).
//
// After a send (D5, BW-J5): "sent, being processed" REPLACES both the D4 read-out line and the upload
// control (`-249` §6 — "after a send, until the job lands") until the chosen claim's server status
// CHANGES from what it was when the operator sent, the claim/member changes, or the operator presses
// Refresh (BigDev 2026-09-27, round-2 decision (a): a status that cycles back to its value at the send —
// sent → job landed → rejected again, all between two reads — or a job that never runs would otherwise
// hide the control for good; a second send is allowed, `-246`: a later upload replaces an unreviewed one).
// The list is re-read on every settle of a send and on Refresh.
//
// ⚠ DELIBERATE — the read-back gate is CLIENT-SIDE ONLY (D5: "⚠ client-side only"). The list route itself
// answers any `claim.file` holder at the Pariwar for any member (ids + status codes, ⛔ no PII), exactly as
// `<HelplineNomineeCorrection>`'s raisable-claims read does; the read-back is the operator's SCRIPT, not an
// authorization. Re-examine if the route ever returns anything beyond ids and status codes, or if a
// server-side "caller verified" session fact is introduced.

import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { useDeathCertificateClaimsForMember, useUploadHelplineDeathCertificate } from '../../api/hooks.js';
import { formatIst } from '../claim-verification/NomineeDeclarationPanel.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { resolveEn, certificateClaimOption } from './i18n-en.js';

const claimStateLabels = verifierConsoleEn.nomineeDeclaration.refusals.claimStateLabels;

/** Every upload refusal maps to its OWN line (C6) — never a raw code. */
function certificateRefusalKey(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'claim_document.certificate_accepted':
        return 'helpline.certificate.refusal.certificate_accepted';
      case 'claim_document.certificate_awaiting_review':
        return 'helpline.certificate.refusal.certificate_awaiting_review';
      case 'claim_document.upload_not_allowed':
        return 'helpline.certificate.refusal.upload_not_allowed';
      case 'claim_document.too_large':
      case 'claim_document.unsupported_media_type':
        return 'helpline.certificate.refusal.fileRejected';
      default:
        break;
    }
    // A proxy/ingress refusal carries no JSON code — the status alone still names the line (the mobile
    // mapper's fallback).
    if (err.status === 413 || err.status === 415) return 'helpline.certificate.refusal.fileRejected';
  }
  return 'helpline.certificate.refusal.generic';
}

/** The D4 read-out line for a claim's current status (`-249` §6, verbatim). */
function statusLineKey(item: { status: string; replacement_reason: string | null }): string {
  if (item.status === 'replacement_requested') {
    return item.replacement_reason === 'future_date' ? 'helpline.certificate.line.future_date' : 'helpline.certificate.line.unclear_date';
  }
  return `helpline.certificate.line.${item.status}`;
}

export function HelplineCertificateReplacement({
  pariwarId,
  memberId,
  identityConfirmed,
}: {
  pariwarId: string;
  /** The deceased member the operator SELECTED on this page, or `null`. */
  memberId: string | null;
  /** The caller's identity was read back and confirmed for THAT member (the page's script). */
  identityConfirmed: boolean;
}): ReactElement {
  const ready = memberId !== null && identityConfirmed;
  const claimsQ = useDeathCertificateClaimsForMember(pariwarId, memberId, ready);
  const claims = claimsQ.data?.member_id === memberId ? claimsQ.data.claims : [];
  const [picked, setPicked] = useState<string | null>(null);
  const lone = claims.length === 1 ? claims[0]!.claim_case_id : null;
  useEffect(() => {
    if (lone !== null) setPicked(lone);
  }, [lone]);
  const chosen = claims.some((c) => c.claim_case_id === picked) ? picked : lone;
  const chosenItem = claims.find((c) => c.claim_case_id === chosen) ?? null;

  const upload = useUploadHelplineDeathCertificate(pariwarId, memberId);
  /** The claim the operator sent for, and its server status AT THE MOMENT of the send. */
  const [sentFor, setSentFor] = useState<{ claimCaseId: string; statusAtSend: string } | null>(null);
  const resetUpload = upload.reset;
  useEffect(() => {
    resetUpload();
    setSentFor(null);
  }, [chosen, memberId, resetUpload]);
  useEffect(() => {
    setPicked(null);
  }, [memberId]);
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;

  function onFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !chosen || !chosenItem) return;
    const sentClaim = chosen;
    const statusAtSend = chosenItem.status;
    upload.mutate(
      { claimCaseId: sentClaim, file },
      {
        onSuccess: () => {
          if (chosenRef.current === sentClaim) setSentFor({ claimCaseId: sentClaim, statusAtSend });
        },
      },
    );
  }

  // The server's status moved on since the send ⇒ the "being processed" line has done its job: the
  // fresh D4 line (and, if the server offers it again, the upload control) takes over.
  const chosenStatus = chosenItem?.status ?? null;
  useEffect(() => {
    if (sentFor !== null && sentFor.claimCaseId === chosen && chosenStatus !== null && chosenStatus !== sentFor.statusAtSend) {
      setSentFor(null);
    }
  }, [sentFor, chosen, chosenStatus]);
  const sentPending = sentFor !== null && chosenItem !== null && sentFor.claimCaseId === chosenItem.claim_case_id;

  let source: ReactElement | null = null;
  if (!ready) {
    source = (
      <p className="text-sm" data-testid="helpline-certificate-need-member">
        {resolveEn('helpline.certificate.needMember')}
      </p>
    );
  } else if (claimsQ.isLoading) {
    source = (
      <p role="status" className="text-sm" data-testid="helpline-certificate-claims-loading">
        {resolveEn('helpline.certificate.claimsLoading')}
      </p>
    );
  } else if (claimsQ.isError) {
    source = (
      <div role="alert" className="text-sm" data-testid="helpline-certificate-claims-error">
        <p>{resolveEn('helpline.certificate.claimsError')}</p>
        <button type="button" className="underline" onClick={() => void claimsQ.refetch()}>
          {resolveEn('helpline.certificate.retry')}
        </button>
      </div>
    );
  } else if (claims.length === 0) {
    source = (
      <p className="text-sm" data-testid="helpline-certificate-no-claim">
        {resolveEn('helpline.certificate.noClaim')}
      </p>
    );
  } else if (claims.length > 1) {
    source = (
      <fieldset className="text-sm" data-testid="helpline-certificate-pick">
        <legend>{resolveEn('helpline.certificate.pickClaim')}</legend>
        {claims.map((c) => (
          <label key={c.claim_case_id} className="flex items-center gap-2">
            <input
              type="radio"
              name="helpline-certificate-claim"
              value={c.claim_case_id}
              checked={picked === c.claim_case_id}
              disabled={upload.isPending}
              onChange={() => setPicked(c.claim_case_id)}
              data-testid={`helpline-certificate-claim-${c.claim_case_id}`}
            />
            {/* An unknown state reads as a dash (the refusal list's posture) — ⛔ never guessed. */}
            {certificateClaimOption(claimStateLabels[c.claim_state] ?? '—', formatIst(c.created_at))}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <section className="mt-6 border-t pt-4" aria-label={resolveEn('helpline.certificate.heading')} data-testid="helpline-certificate-replacement">
      <h3>{resolveEn('helpline.certificate.heading')}</h3>
      {source}
      {ready && chosenItem !== null ? (
        <div className="mt-2 flex flex-col gap-2" data-testid="helpline-certificate-status">
          {sentPending ? null : <p>{resolveEn(statusLineKey(chosenItem))}</p>}
          {sentPending ? (
            <div className="flex items-center gap-2">
              <p role="status" data-testid="helpline-certificate-sent-processing">
                {resolveEn('helpline.certificate.sentProcessing')}
              </p>
              <button
                type="button"
                className="underline"
                disabled={claimsQ.isFetching}
                onClick={() => {
                  setSentFor(null);
                  void claimsQ.refetch();
                }}
                data-testid="helpline-certificate-refresh"
              >
                {resolveEn('helpline.certificate.refresh')}
              </button>
            </div>
          ) : chosenItem.upload_allowed ? (
            <label className="flex flex-col gap-1">
              <span>{resolveEn('helpline.certificate.upload')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                disabled={upload.isPending}
                onChange={onFileChange}
                data-testid="helpline-certificate-upload-input"
              />
            </label>
          ) : null}
          {upload.isPending ? (
            <p role="status" data-testid="helpline-certificate-uploading">
              {resolveEn('helpline.certificate.uploading')}
            </p>
          ) : null}
          {upload.isError ? (
            <p role="alert" className="text-status-fail-fg" data-testid="helpline-certificate-upload-error">
              {resolveEn(certificateRefusalKey(upload.error))}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
