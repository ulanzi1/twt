// `<ReadBackCard>` — the operator's read-back-to-confirm card (Story 6.3, Task 5; AC2, UX-DR46).
//
// Pure presentational (no hooks/router/query) so it is unit-testable in isolation. Surfaces the
// suggested read-back text (bilingual en/hi — the operator voices it), a "Caller confirmed"
// checkbox, a "Caller corrected — update" affordance, and a running correction log. Two
// variants:
//   · identity  — the HARD gate on intake (the page disables submit until this is confirmed).
//   · nominee   — ADVISORY only (its confirmation state MUST NOT gate submit; AC2).
// The card itself does NOT own the submit control — it only reports confirm/correction state
// up; the page decides the gate. This keeps the "identity gates, nominee does not" rule in ONE
// place (the page) rather than smeared across the cards.

import type { ReactElement } from 'react';
import { useState } from 'react';

import { resolveEn } from './i18n-en.js';

export interface ReadBackCardProps {
  variant: 'identity' | 'nominee';
  /** The bilingual suggested read-back text the operator voices to the caller. */
  script: { en: string; hi: string; titleEn: string };
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  /** Append a caller correction to the running log (the page owns the log state). */
  corrections: readonly string[];
  onAddCorrection: (note: string) => void;
}

export function ReadBackCard({
  variant,
  script,
  confirmed,
  onConfirmedChange,
  corrections,
  onAddCorrection,
}: ReadBackCardProps): ReactElement {
  const [correctionDraft, setCorrectionDraft] = useState('');
  const advisory = variant === 'nominee';

  const addCorrection = (): void => {
    const note = correctionDraft.trim();
    if (note === '') return;
    onAddCorrection(note);
    setCorrectionDraft('');
  };

  return (
    <section
      aria-label={resolveEn(`helpline.readback.ariaLabel.${variant}`)}
      data-testid={`readback-card-${variant}`}
      className="flex flex-col gap-3 rounded border p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{script.titleEn}</h3>
        {advisory ? (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs opacity-70">advisory</span>
        ) : (
          <span className="rounded bg-status-warn-bg px-2 py-0.5 text-xs text-status-warn-fg">
            required to file
          </span>
        )}
      </header>

      {/* The suggested read-back text — bilingual so the operator can voice Hindi to a Hindi caller. */}
      <div className="flex flex-col gap-2 text-sm">
        <p data-testid={`readback-script-en-${variant}`} className="rounded bg-gray-50 p-2">
          {script.en}
        </p>
        <p lang="hi" data-testid={`readback-script-hi-${variant}`} className="rounded bg-gray-50 p-2">
          {script.hi}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          data-testid={`readback-confirm-${variant}`}
        />
        {resolveEn('helpline.readback.confirm')}
      </label>

      {/* "Caller corrected — update" affordance + running correction log. */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`correction-${variant}`} className="text-xs font-medium opacity-70">
          {resolveEn('helpline.readback.correct')}
        </label>
        <div className="flex gap-2">
          <input
            id={`correction-${variant}`}
            className="flex-1 rounded border px-2 py-1 text-sm"
            placeholder={resolveEn('helpline.readback.correctionPlaceholder')}
            value={correctionDraft}
            onChange={(e) => setCorrectionDraft(e.target.value)}
            data-testid={`readback-correction-input-${variant}`}
          />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={addCorrection}
            data-testid={`readback-correction-add-${variant}`}
          >
            {resolveEn('helpline.readback.addCorrection')}
          </button>
        </div>
        {corrections.length > 0 && (
          <ul
            aria-label={resolveEn('helpline.readback.correctionLog')}
            data-testid={`readback-correction-log-${variant}`}
            className="mt-1 list-disc pl-5 text-xs opacity-80"
          >
            {corrections.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
