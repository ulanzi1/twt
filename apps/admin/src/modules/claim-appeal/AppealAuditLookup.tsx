// Appeal decisions-by-reviewer audit lookup — Story 6.16 (Task 8; AC6). PURE, prop-driven (the R9
// votes-by-trustee precedent). Renders the reviewer + optional-stage lookup form and the resulting decision
// list with the D-H SLA-breach badge per row. `onLookup` is the callback; `decisions` is the loaded data.

import type { AppealDecisionsByReviewerItem } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { appealEn as t } from './i18n-en.js';

export interface AppealAuditLookupProps {
  decisions: AppealDecisionsByReviewerItem[] | null;
  isLoading?: boolean;
  error?: string;
  onLookup?: (reviewerActorId: string, stage?: '1' | '2' | '3') => void;
}

export function AppealAuditLookup(props: AppealAuditLookupProps): ReactElement {
  const [reviewer, setReviewer] = useState('');
  const [stage, setStage] = useState<'' | '1' | '2' | '3'>('');

  return (
    <section aria-label="Appeal audit lookup" className="flex flex-col gap-2 rounded border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">{t.audit.heading}</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t.audit.reviewerLabel}</span>
          <input data-testid="audit-reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} className="rounded border p-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t.audit.stageLabel}</span>
          <select data-testid="audit-stage" value={stage} onChange={(e) => setStage(e.target.value as '' | '1' | '2' | '3')} className="rounded border p-1">
            <option value="">—</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <button type="button" data-testid="audit-lookup" disabled={reviewer.trim() === ''} onClick={() => props.onLookup?.(reviewer.trim(), stage === '' ? undefined : stage)} className="rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50">
          {t.audit.lookup}
        </button>
      </div>
      {props.error ? <p role="alert" className="text-sm text-status-fail-fg">{props.error}</p> : null}
      {props.isLoading ? <p role="status">…</p> : null}
      {props.decisions !== null ? (
        props.decisions.length === 0 ? (
          <p className="text-sm opacity-60">{t.audit.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1" data-testid="audit-results">
            {props.decisions.map((d) => (
              <li key={d.appeal_decision_id} className="flex items-center gap-2 text-sm">
                <span className="font-mono opacity-70">S{d.stage}</span>
                <span>{d.decision}</span>
                {d.disposition_category ? <span className="opacity-70">({d.disposition_category})</span> : null}
                <span className="opacity-50">{new Date(d.decided_at).toLocaleDateString()}</span>
                {d.sla_breached ? <span data-testid="audit-sla-breach" className="rounded bg-status-fail-bg px-1.5 text-xs text-status-fail-fg">{t.audit.overdueBadge}</span> : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
