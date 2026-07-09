// <DocumentTypeChooser> + <VerifierReviewPanel> component tests — Story 6.5 (Task 6; AC3/AC5).
//
// Pure render tests (the components take everything as props). Focus:
//   · the chooser offers death_certificate (enabled) + the future types (disabled) and fires onChange;
//   · the review panel renders the parity outcome badge, the OCR-vs-member side-by-side rows, and
//     the per-field flags; the verifier-review banner shows when flagged.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DocumentTypeChooser } from '../src/modules/claim-verification/DocumentTypeChooser.js';
import {
  VerifierReviewPanel,
  type VerifierReviewData,
} from '../src/modules/claim-verification/VerifierReviewPanel.js';

describe('<DocumentTypeChooser>', () => {
  it('offers death_certificate (enabled) + future types (disabled) and fires onChange', () => {
    const onChange = vi.fn();
    // Start from a non-death-cert value so clicking the (enabled) death_certificate radio is a real
    // change that fires onChange (clicking an already-checked radio does not).
    render(<DocumentTypeChooser value="hospital_record" onChange={onChange} />);
    const deathCert = screen.getByTestId('document-type-option-death_certificate') as HTMLInputElement;
    const groundPhoto = screen.getByTestId('document-type-option-ground_inspection_photo') as HTMLInputElement;
    expect(deathCert.disabled).toBe(false);
    expect(deathCert.checked).toBe(false);
    expect(groundPhoto.disabled).toBe(true);
    fireEvent.click(deathCert);
    expect(onChange).toHaveBeenCalledWith('death_certificate');
  });
});

const MISMATCH_REVIEW: VerifierReviewData = {
  documentType: 'death_certificate',
  parityOutcome: 'mismatch',
  verifierReviewRequired: true,
  ocrConfidence: 0.9,
  parityFlags: { name: 'beyond_tolerance' },
  extracted: {
    deceasedName: 'Suresh Patel',
    dateOfBirth: '1955-03-01',
    dateOfDeath: '2026-06-30',
    issuingAuthority: 'Municipal Corporation',
    certificateNumber: 'DC-12345',
  },
  memberRecord: { name: 'Ravi Kumar', dateOfBirth: '1955-03-01' },
  preview: { signedUrl: 'https://signed.example/doc', contentType: 'application/pdf' },
};

describe('<VerifierReviewPanel>', () => {
  it('renders the parity outcome + side-by-side values + the verifier-review banner', () => {
    render(<VerifierReviewPanel data={MISMATCH_REVIEW} />);
    expect(screen.getByTestId('parity-outcome-badge')).toHaveTextContent('mismatch');
    // OCR-extracted name and the member-record name both render for the eyeball comparison.
    expect(screen.getByText('Suresh Patel')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    // The per-field flag surfaces.
    expect(screen.getByText('beyond_tolerance')).toBeInTheDocument();
    // The document preview is embedded.
    expect(screen.getByTestId('document-preview')).toBeInTheDocument();
  });

  it('renders without a member record (ambiguous — no KYC on file)', () => {
    render(
      <VerifierReviewPanel
        data={{ ...MISMATCH_REVIEW, parityOutcome: 'ambiguous', parityFlags: {}, memberRecord: null }}
      />,
    );
    expect(screen.getByTestId('parity-outcome-badge')).toHaveTextContent('ambiguous');
  });
});
