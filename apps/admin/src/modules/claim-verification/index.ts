// Claim-verification admin module (Story 6.5) — the death-cert OCR + parity review surface pieces.
//
// 6.5 ships the presentational components + the read model that feed the verifier console; the
// console itself + the approve/deny verdict actions are Story 6.10/6.11.
//   · <DocumentTypeChooser> — the document-type→OCR-parser chooser (AC3; Decision D2 — NOT
//     <DocPathChooser>, which is reserved for the UX-DR47 dispatch-path picker).
//   · <DocumentPreview> — the inline signed-URL document viewer (AC5, UX-DR42).
//   · <VerifierReviewPanel> — the side-by-side OCR-vs-member-record parity panel (AC5).

export { DocumentTypeChooser, type DocumentTypeChooserProps, type DocumentTypeValue } from './DocumentTypeChooser.js';
export { DocumentPreview, type DocumentPreviewProps } from './DocumentPreview.js';
export {
  VerifierReviewPanel,
  type VerifierReviewPanelProps,
  type VerifierReviewData,
  type ParityOutcome,
} from './VerifierReviewPanel.js';
// Story 6.10 — the READ-ONLY verifier console shell + signals panel + cross-Pariwar scope chrome.
export { VerificationConsoleShell, type VerificationConsoleShellProps } from './VerificationConsoleShell.js';
export { SignalsPanel, type SignalsPanelProps } from './SignalsPanel.js';
export {
  ScopeChrome,
  ScopeSwitcher,
  type ScopeChromeProps,
  type ScopeSwitcherProps,
  type PariwarOption,
} from './ScopeChrome.js';
// Story 6.11 — the verifier decision strip + reason-code dropdown + audit-trail entry (the FIRST WRITE).
export {
  VerificationDecisionStrip,
  type VerificationDecisionStripProps,
  type DecisionSubmit,
} from './VerificationDecisionStrip.js';
export { ReasonCodeDropdown, type ReasonCodeDropdownProps } from './ReasonCodeDropdown.js';
// Story 6.15 — the verifier concealment-linkage assessment capture control (tri-state + optional note).
export {
  ConcealmentAssessmentControl,
  type ConcealmentAssessmentControlProps,
  type ConcealmentAssessmentSubmit,
} from './ConcealmentAssessmentControl.js';
export {
  AuditTrail,
  AuditTrailEntry,
  type AuditTrailEntryData,
} from './AuditTrailEntry.js';
export { verifierConsoleEn } from './i18n-en.js';
