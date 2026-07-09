// `<VerifierReviewPanel>` — the side-by-side document-review panel section (Story 6.5, Task 6;
// AC5). Pure presentational. Shows the OCR-extracted values ALONGSIDE the deceased member's record
// for a verifier's eyeball comparison, plus the parity outcome + per-field flags + the
// `<DocumentPreview>` of the original. 6.5 ships this panel SECTION + the compound read that feeds
// it (`claim.getClaimDocumentReview`); the verifier console (Story 6.10) embeds it and the verdict
// actions (approve/deny — Story 6.11) live there, NOT here. 6.5 NEVER auto-rejects: a `mismatch` /
// `ambiguous` is surfaced for a human, never acted on.
//
// The decrypted identity fields are PII the AUTHORIZED verifier is entitled to see; the caller
// decrypts server-side and passes plaintext in. Non-PII metadata (outcome/flags/confidence) is safe.

import type { ReactElement } from 'react';

import { DocumentPreview } from './DocumentPreview.js';

export type ParityOutcome = 'match' | 'mismatch' | 'ambiguous';

/** The decrypted extracted fields + the member record + the non-PII verdict, as the console assembles them. */
export interface VerifierReviewData {
  documentType: string;
  parityOutcome: ParityOutcome;
  verifierReviewRequired: boolean;
  ocrConfidence: number;
  /** Per-field mismatch reasons (non-PII), e.g. `{ name: 'beyond_tolerance', dob: 'mismatch' }`. */
  parityFlags: Record<string, string>;
  /** OCR-extracted values (decrypted by the caller; null = not extracted). */
  extracted: {
    deceasedName: string | null;
    dateOfBirth: string | null;
    dateOfDeath: string | null;
    issuingAuthority: string | null;
    certificateNumber: string | null;
  };
  /** The deceased member's record (decrypted by the caller; null = no KYC profile on file). */
  memberRecord: { name: string | null; dateOfBirth: string | null } | null;
  /** The short-lived signed READ URL + content type for the original document preview. */
  preview: { signedUrl: string; contentType: string; filename?: string };
}

export interface VerifierReviewPanelProps {
  data: VerifierReviewData;
  onRequestBetter?: () => void;
  onMarkIllegible?: () => void;
}

const OUTCOME_BADGE: Record<ParityOutcome, string> = {
  match: 'bg-status-ok-bg text-status-ok-fg',
  mismatch: 'bg-status-danger-bg text-status-danger-fg',
  ambiguous: 'bg-status-warn-bg text-status-warn-fg',
};

function Row({
  label,
  extracted,
  onFile,
  flag,
}: {
  label: string;
  extracted: string | null;
  onFile?: string | null;
  flag?: string;
}): ReactElement {
  return (
    <tr className={flag ? 'bg-status-warn-bg' : undefined}>
      <th scope="row" className="py-1 pr-3 text-left align-top text-xs font-medium opacity-70">
        {label}
      </th>
      <td className="py-1 pr-3 align-top text-sm">{extracted ?? <span className="opacity-40">—</span>}</td>
      {onFile !== undefined ? (
        <td className="py-1 pr-3 align-top text-sm">{onFile ?? <span className="opacity-40">—</span>}</td>
      ) : (
        <td className="py-1 pr-3 align-top text-sm opacity-40">n/a</td>
      )}
      <td className="py-1 align-top text-xs text-status-danger-fg">{flag ?? ''}</td>
    </tr>
  );
}

export function VerifierReviewPanel({
  data,
  onRequestBetter,
  onMarkIllegible,
}: VerifierReviewPanelProps): ReactElement {
  const { extracted, memberRecord, parityFlags } = data;
  return (
    <section
      aria-label="Document parity review"
      data-testid="verifier-review-panel"
      className="grid gap-4 md:grid-cols-2"
    >
      <DocumentPreview
        signedUrl={data.preview.signedUrl}
        contentType={data.preview.contentType}
        filename={data.preview.filename}
        onRequestBetter={onRequestBetter}
        onMarkIllegible={onMarkIllegible}
      />

      <div className="flex flex-col gap-3 rounded border p-3">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Parity check</h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${OUTCOME_BADGE[data.parityOutcome]}`}
            data-testid="parity-outcome-badge"
          >
            {data.parityOutcome}
          </span>
        </header>

        {data.verifierReviewRequired ? (
          <p className="rounded bg-status-warn-bg px-2 py-1 text-xs text-status-warn-fg">
            Flagged for verifier review — confirm before this claim proceeds.
          </p>
        ) : null}

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-xs opacity-60">
              <th className="py-1 pr-3 text-left font-medium">Field</th>
              <th className="py-1 pr-3 text-left font-medium">From certificate</th>
              <th className="py-1 pr-3 text-left font-medium">Member record</th>
              <th className="py-1 text-left font-medium">Flag</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Name" extracted={extracted.deceasedName} onFile={memberRecord?.name ?? null} flag={parityFlags['name']} />
            <Row label="Date of birth" extracted={extracted.dateOfBirth} onFile={memberRecord?.dateOfBirth ?? null} flag={parityFlags['dob']} />
            <Row label="Date of death" extracted={extracted.dateOfDeath} flag={parityFlags['date']} />
            <Row label="Issuing authority" extracted={extracted.issuingAuthority} />
            <Row label="Certificate number" extracted={extracted.certificateNumber} />
          </tbody>
        </table>

        <p className="text-xs opacity-60">OCR confidence: {Math.round(data.ocrConfidence * 100)}%</p>
      </div>
    </section>
  );
}
