// `<DocumentTypeChooser>` — the document-TYPE chooser that drives OCR parser selection (Story
// 6.5, Task 5; AC3). Pure presentational (no hooks/router/query) so it is unit-testable in
// isolation. The operator/uploader picks which document type is being uploaded; the choice drives
// which OCR parser/profile the engine applies (the parser-selection seam). v1 enables the
// death-certificate parser only; ground-inspection photo (Story 6.7) + later types are shown as
// disabled options so the chooser + the parser-selection seam already accept them without a new
// dispatch path.
//
// ┌─ Decision D2 — component named <DocumentTypeChooser>, NOT <DocPathChooser> ───────────────┐
// │ The epic AC (epics.md line ~2381) calls this the "<DocPathChooser>", but the UX spec (ux-  │
// │ design-specification.md line ~2105) ALREADY uses "<DocPathChooser>" for a DIFFERENT thing: │
// │ the UX-DR47 Email / SMS / Field-Visit dispatch-PATH picker in the helpline doc-REQUEST      │
// │ flow. 6.5 resolves the naming collision by naming THIS (the document-type→parser chooser)   │
// │ <DocumentTypeChooser> and RESERVING <DocPathChooser> exclusively for that dispatch picker.  │
// │ Do not rename this to <DocPathChooser>.                                                     │
// └────────────────────────────────────────────────────────────────────────────────────────────┘

import type { ReactElement } from 'react';

/** The document types the chooser offers. Value-aligned with the `@twt/contracts` OcrDocumentType
 *  enum + the `@twt/domain` claim_document_type pgEnum (re-declared locally so this presentational
 *  component carries no cross-package runtime import). */
export type DocumentTypeValue = 'death_certificate' | 'ground_inspection_photo' | 'hospital_record';

interface DocumentTypeOption {
  value: DocumentTypeValue;
  label: string;
  /** v1: only the death-certificate parser ships; the rest are seams (disabled until their story). */
  enabled: boolean;
  hint?: string;
}

const OPTIONS: readonly DocumentTypeOption[] = [
  { value: 'death_certificate', label: 'Death certificate', enabled: true },
  { value: 'ground_inspection_photo', label: 'Ground-inspection photo', enabled: false, hint: 'Story 6.7' },
  { value: 'hospital_record', label: 'Hospital record', enabled: false, hint: 'Coming later' },
];

export interface DocumentTypeChooserProps {
  value: DocumentTypeValue;
  onChange: (value: DocumentTypeValue) => void;
  /** Disable the whole chooser (e.g. while an upload is in flight). */
  disabled?: boolean;
}

export function DocumentTypeChooser({
  value,
  onChange,
  disabled = false,
}: DocumentTypeChooserProps): ReactElement {
  return (
    <fieldset
      aria-label="Document type"
      data-testid="document-type-chooser"
      className="flex flex-col gap-2 rounded border p-4"
    >
      <legend className="text-sm font-semibold">Document type</legend>
      <p className="text-xs opacity-70">
        The selected type chooses the OCR parser. Death certificate is the only type parsed today.
      </p>
      {OPTIONS.map((opt) => {
        const optionDisabled = disabled || !opt.enabled;
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-2 text-sm ${optionDisabled ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="document-type"
              value={opt.value}
              checked={value === opt.value}
              disabled={optionDisabled}
              onChange={() => onChange(opt.value)}
              data-testid={`document-type-option-${opt.value}`}
            />
            <span>{opt.label}</span>
            {opt.hint ? <span className="text-xs opacity-60">({opt.hint})</span> : null}
          </label>
        );
      })}
    </fieldset>
  );
}
