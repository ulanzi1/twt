// Appeal stage controls — Story 6.16 (Task 8). A PURE, prop-driven admin component (the
// VerificationDecisionStrip precedent — everything is a prop, so it renders + tests without a router/network).
//
// Renders the stage-appropriate control for a claim's current appeal state:
//   · appeal_stage_1 → the Stage-1 reverse/advance form (disposition picker shown ONLY on reverse; the
//     reviewer-conflict read-only state surfaced when `conflict` is set, D-D).
//   · appeal_stage_2 → the panel: open form (roster ≥2) when no live session; else vote + finalize + cancel.
//   · appeal_stage_3 → the Stage-3 reverse/uphold form (+ the external-remedy disclosure, AC4/AC7).
//   · reversed / denied → the terminal outcome summary (+ the external-remedy disclosure on an uphold).
// An SLA "overdue" badge (D-H) renders when `sla.breached`.

import type { AdminAppealCaseResponse, AppealPanelSessionView, AppealPanelTally, AppealSlaStatus, AppealDispositionCategory } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { appealEn as t } from './i18n-en.js';

const DISPOSITIONS: AppealDispositionCategory[] = ['new_evidence_presented', 'procedural_correction', 'reconsideration_on_merits'];

export interface AppealStageControlsProps {
  claimState: string;
  /** The appeal journey anchor, or null when no appeal has been filed — gates the upheld/exhausted terminal
   *  banner so it never renders for a `denied` claim that was simply never appealed (6.16 review finding). */
  journey: AdminAppealCaseResponse['journey'];
  session: AppealPanelSessionView | null;
  tally: AppealPanelTally | null;
  sla: AppealSlaStatus | null;
  /** D-D: surface the "you already adjudicated this claim" read-only state on Stage 1. */
  conflict?: boolean;
  busy?: boolean;
  error?: string;
  onStage1?: (decision: 'reversed' | 'advance', rationale: string, disposition?: AppealDispositionCategory) => void;
  onOpenPanel?: (panelActorIds: string[]) => void;
  onVote?: (vote: 'reverse' | 'deny', rationale: string) => void;
  onFinalize?: (rationale: string, disposition?: AppealDispositionCategory) => void;
  onCancel?: (reasonCode: string, rationale: string) => void;
  onStage3?: (decision: 'reversed' | 'upheld', rationale: string, disposition?: AppealDispositionCategory) => void;
}

function DispositionPicker({ value, onChange }: { value: AppealDispositionCategory | ''; onChange: (v: AppealDispositionCategory | '') => void }): ReactElement {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{t.disposition.label}</span>
      <select data-testid="disposition-picker" value={value} onChange={(e) => onChange(e.target.value as AppealDispositionCategory | '')} className="rounded border p-1">
        <option value="">—</option>
        {DISPOSITIONS.map((d) => (
          <option key={d} value={d}>
            {t.disposition[d]}
          </option>
        ))}
      </select>
    </label>
  );
}

function RationaleField({ value, onChange }: { value: string; onChange: (v: string) => void }): ReactElement {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{t.rationaleLabel}</span>
      <textarea data-testid="rationale" value={value} maxLength={500} onChange={(e) => onChange(e.target.value)} className="rounded border p-1" rows={2} />
    </label>
  );
}

function SlaBadge({ sla }: { sla: AppealSlaStatus | null }): ReactElement | null {
  if (!sla || sla.elapsed_days === null) return null;
  if (sla.breached) {
    return (
      <span data-testid="sla-overdue" className="inline-block rounded bg-status-fail-bg px-2 py-0.5 text-xs text-status-fail-fg">
        {t.sla.overdue.replace('{elapsed}', String(sla.elapsed_days)).replace('{sla}', String(sla.sla_days))}
      </span>
    );
  }
  return <span data-testid="sla-ok" className="text-xs opacity-60">{t.sla.withinLabel.replace('{elapsed}', String(sla.elapsed_days)).replace('{sla}', String(sla.sla_days))}</span>;
}

export function AppealStageControls(props: AppealStageControlsProps): ReactElement {
  const { claimState, journey, session, tally, sla } = props;
  const [decision, setDecision] = useState<'reversed' | 'advance' | 'upheld'>('reversed');
  const [rationale, setRationale] = useState('');
  const [disposition, setDisposition] = useState<AppealDispositionCategory | ''>('');
  const [roster, setRoster] = useState('');
  const [vote, setVote] = useState<'reverse' | 'deny'>('reverse');
  const [reasonCode, setReasonCode] = useState('');

  const dispositionProp = disposition === '' ? undefined : disposition;

  return (
    <section aria-label="Appeal stage controls" className="flex flex-col gap-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
          {t.stage.state}: <span data-testid="claim-state">{claimState}</span>
        </h2>
        <SlaBadge sla={sla} />
      </div>
      {props.error ? (
        <p role="alert" className="text-sm text-status-fail-fg">{props.error}</p>
      ) : null}

      {claimState === 'appeal_stage_1' ? (
        props.conflict ? (
          <p role="alert" data-testid="stage1-conflict" className="text-sm text-status-fail-fg">{t.stage1.conflict}</p>
        ) : (
          <div className="flex flex-col gap-2" data-testid="stage1-form">
            <h3 className="font-semibold">{t.stage1.heading}</h3>
            <fieldset className="flex flex-col gap-1 text-sm">
              <label><input type="radio" name="s1" checked={decision === 'reversed'} onChange={() => setDecision('reversed')} /> {t.stage1.reverse}</label>
              <label><input type="radio" name="s1" checked={decision === 'advance'} onChange={() => setDecision('advance')} /> {t.stage1.advance}</label>
            </fieldset>
            <p className="text-xs opacity-70">{t.stage1.note}</p>
            {decision === 'reversed' ? <DispositionPicker value={disposition} onChange={setDisposition} /> : null}
            <RationaleField value={rationale} onChange={setRationale} />
            <button
              type="button"
              data-testid="stage1-submit"
              disabled={props.busy || rationale.trim() === '' || (decision === 'reversed' && dispositionProp === undefined)}
              onClick={() => props.onStage1?.(decision as 'reversed' | 'advance', rationale, dispositionProp)}
              className="self-start rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {t.submit}
            </button>
          </div>
        )
      ) : null}

      {claimState === 'appeal_stage_2' ? (
        !session || session.outcome !== null ? (
          <div className="flex flex-col gap-2" data-testid="stage2-open-form">
            <h3 className="font-semibold">{t.stage2.openHeading}</h3>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t.stage2.rosterLabel}</span>
              <textarea data-testid="roster" value={roster} onChange={(e) => setRoster(e.target.value)} rows={3} className="rounded border p-1" />
            </label>
            <button
              type="button"
              data-testid="open-submit"
              disabled={props.busy}
              onClick={() => props.onOpenPanel?.(roster.split('\n').map((s) => s.trim()).filter(Boolean))}
              className="self-start rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {t.stage2.open}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-testid="stage2-panel">
            {tally ? (
              <p data-testid="tally" className="text-sm">
                {t.stage2.tally
                  .replace('{reverse}', String(tally.reverse_count))
                  .replace('{deny}', String(tally.deny_count))
                  .replace('{panel}', String(tally.panel_size))
                  .replace('{quorum}', String(tally.quorum_required))
                  .replace('{met}', tally.quorum_met ? t.stage2.quorumMet : t.stage2.quorumNotMet)}
                {' · '}
                {t.stage2.provisional.replace('{outcome}', tally.provisional_outcome)}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold">{t.stage2.voteHeading}</h3>
              <fieldset className="flex gap-3 text-sm">
                <label><input type="radio" name="vote" checked={vote === 'reverse'} onChange={() => setVote('reverse')} /> {t.stage2.reverse}</label>
                <label><input type="radio" name="vote" checked={vote === 'deny'} onChange={() => setVote('deny')} /> {t.stage2.deny}</label>
              </fieldset>
              <RationaleField value={rationale} onChange={setRationale} />
              <button type="button" data-testid="vote-submit" disabled={props.busy || rationale.trim() === ''} onClick={() => props.onVote?.(vote, rationale)} className="self-start rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50">
                {t.stage2.castVote}
              </button>
            </div>
            <p className="text-xs opacity-70">{t.stage2.finalizeNote}</p>
            <div className="flex flex-col gap-1">
              {tally?.provisional_outcome === 'reversed' ? <DispositionPicker value={disposition} onChange={setDisposition} /> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="finalize-submit"
                  disabled={props.busy || rationale.trim() === '' || !tally?.quorum_met || (tally?.provisional_outcome === 'reversed' && dispositionProp === undefined)}
                  onClick={() => props.onFinalize?.(rationale, dispositionProp)}
                  className="rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  {t.stage2.finalize}
                </button>
                <button type="button" data-testid="cancel-submit" disabled={props.busy || reasonCode.trim() === '' || rationale.trim() === ''} onClick={() => props.onCancel?.(reasonCode, rationale)} className="rounded border px-3 py-1 text-sm disabled:opacity-50">
                  {t.stage2.cancel}
                </button>
                <input aria-label={t.stage2.reasonCodeLabel} placeholder={t.stage2.reasonCodeLabel} value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="rounded border p-1 text-sm" />
              </div>
            </div>
          </div>
        )
      ) : null}

      {claimState === 'appeal_stage_3' ? (
        <div className="flex flex-col gap-2" data-testid="stage3-form">
          <h3 className="font-semibold">{t.stage3.heading}</h3>
          <fieldset className="flex flex-col gap-1 text-sm">
            <label><input type="radio" name="s3" checked={decision === 'reversed'} onChange={() => setDecision('reversed')} /> {t.stage3.reverse}</label>
            <label><input type="radio" name="s3" checked={decision === 'upheld'} onChange={() => setDecision('upheld')} /> {t.stage3.uphold}</label>
          </fieldset>
          <p className="text-xs opacity-70">{t.stage3.note}</p>
          <p data-testid="external-remedy" className="rounded bg-status-warn-bg p-2 text-xs">{t.externalRemedy}</p>
          {decision === 'reversed' ? <DispositionPicker value={disposition} onChange={setDisposition} /> : null}
          <RationaleField value={rationale} onChange={setRationale} />
          <button
            type="button"
            data-testid="stage3-submit"
            disabled={props.busy || rationale.trim() === '' || (decision === 'reversed' && dispositionProp === undefined)}
            onClick={() => props.onStage3?.(decision as 'reversed' | 'upheld', rationale, dispositionProp)}
            className="self-start rounded bg-brand-primary px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {t.submit}
          </button>
        </div>
      ) : null}

      {claimState === 'reversed' ? <p data-testid="outcome-reversed" className="text-sm text-status-ok-fg">{t.outcome.reversed}</p> : null}
      {claimState === 'denied' && journey?.status === 'upheld_final' ? (
        <div data-testid="outcome-denied" className="flex flex-col gap-1">
          <p className="text-sm">{t.outcome.upheldFinal}</p>
          <p className="rounded bg-status-warn-bg p-2 text-xs">{t.externalRemedy}</p>
        </div>
      ) : null}
    </section>
  );
}
