// One partner offer — Story 12.2 (Task 8.2; AC7, AC12; `2026-11-01-433` QE9, QE10, QE15).
//
// Shows the state, the manifest in plain language, the author, the publication, and that members cannot see offers yet.
// PUBLISH (a draft only): three required ticks; DISABLED with the reason when the viewer wrote the offer
// (`authored_by_viewer` — the server fails it closed for an unknown author), since the server would refuse it (409
// `tone_review.required`) after an OTP. A 403 `auth.step_up_required` holds the write behind the reused `StepUpPanel`
// (`MODULE_PUBLISH_STEP_UP_CONTEXT`), which retries it ONCE. WITHDRAW needs no step-up (the safe direction) and sends `{}`.
// "Start a corrected copy" opens the wizard pre-filled; both it and Withdraw are preceded by the C10 warning when members
// registered interest. ⛔ Partner colour anywhere (C5).
//
// Each write's Idempotency-Key is minted once per user intent and REUSED by its retry (the held step-up retry included).

import { MODULE_PUBLISH_STEP_UP_CONTEXT, type ModuleDetailResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { newIdempotencyKey, useModuleDetail, usePublishModule, useWithdrawModule } from '../../api/hooks.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import {
  describeEligibility,
  describePlaces,
  describeScope,
  describeWindow,
  formatIst,
  leadWarning,
  moduleErrorGuidance,
} from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface ModuleDetailPageProps {
  pariwarId: string;
  moduleId: string;
  onBack: () => void;
  onStartCorrectedCopy: (moduleId: string) => void;
}

function stateLabel(m: ModuleDetailResponse): string {
  return t(`module.state.${m.current_state}`);
}

export function ModuleDetailPage({ pariwarId, moduleId, onBack, onStartCorrectedCopy }: ModuleDetailPageProps): ReactElement {
  const detail = useModuleDetail(pariwarId, moduleId);
  const publish = usePublishModule(pariwarId, moduleId);
  const withdraw = useWithdrawModule(pariwarId, moduleId);
  const [ticks, setTicks] = useState({ tone: false, hindi: false, partner: false });
  const [pending, setPending] = useState<PendingWrite<'publish'>>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const holdSeq = useRef(0);

  if (detail.isLoading) return <p role="status">…</p>;
  if (detail.isError || detail.data === undefined) {
    return (
      <p role="alert" data-testid="module-detail-error">
        {detail.error instanceof ApiError ? moduleErrorGuidance(detail.error.code) : t('module.detail.loadError')}
      </p>
    );
  }
  const m = detail.data;
  const warning = leadWarning(m.lead_count);
  const busy = publish.isPending || withdraw.isPending || pending !== null;
  const canWithdraw = m.current_state !== 'archived';

  const runPublish = async (idempotencyKey: string, retried: boolean): Promise<void> => {
    setMessage(null);
    try {
      await publish.mutateAsync({ idempotencyKey });
      setMessage({ kind: 'ok', text: t('module.detail.published') });
    } catch (err) {
      if (needsStepUp(err)) {
        if (retried) {
          // The held retry is run ONCE; a second step-up demand is an error, ⛔ another hold.
          setMessage({ kind: 'error', text: t('module.detail.stepUpAgain') });
          return;
        }
        holdSeq.current += 1;
        setPending(
          holdOnce({ owner: 'publish', id: holdSeq.current, label: t('module.detail.stepUpLabel'), retry: () => void runPublish(idempotencyKey, true) }),
        );
        return;
      }
      setMessage({ kind: 'error', text: err instanceof ApiError ? moduleErrorGuidance(err.code) : t('module.error.generic') });
    }
  };

  const runWithdraw = async (): Promise<void> => {
    setMessage(null);
    try {
      await withdraw.mutateAsync({ idempotencyKey: newIdempotencyKey() });
      setMessage({ kind: 'ok', text: t('module.detail.withdrawn') });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? moduleErrorGuidance(err.code) : t('module.error.generic') });
    }
  };

  const allTicked = ticks.tone && ticks.hindi && ticks.partner;

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="module-detail">
      <button type="button" className="w-fit text-sm underline" onClick={onBack} data-testid="module-detail-back">
        {t('module.detail.back')}
      </button>
      <h1 className="text-xl font-semibold">{m.name_en}</h1>
      <p className="text-sm" data-testid="module-detail-members-cannot-see">
        {t('module.detail.membersCannotSee')}
      </p>
      <p className="text-sm" data-testid="module-detail-state">
        {t('module.detail.state', { state: stateLabel(m) })}
      </p>
      <p className="text-sm" data-testid="module-detail-author">
        {t('module.detail.author', { name: m.author_display_name })}
      </p>
      <p className="text-sm">{t('module.detail.partner', { en: m.partner_display_name_en, hi: m.partner_display_name_hi })}</p>

      <div className="flex flex-col gap-1 rounded border p-3">
        <p className="font-semibold">{m.name_en}</p>
        <p className="whitespace-pre-line text-sm">{m.description_en}</p>
      </div>
      <div className="flex flex-col gap-1 rounded border p-3" lang="hi" data-testid="module-detail-hi">
        <p className="font-semibold">{m.name_hi}</p>
        <p className="whitespace-pre-line text-sm">{m.description_hi}</p>
      </div>

      <ul className="text-sm" data-testid="module-detail-audience">
        {describeScope(m.scope_filter).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <ul className="text-sm" data-testid="module-detail-eligibility">
        {describeEligibility(m.eligibility_filter).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-sm">{describeWindow(m.valid_from, m.valid_until)}</p>
      <p className="text-sm">{describePlaces(m.slot_capacity)}</p>
      <p className="text-xs break-all">{t('module.detail.leadUrl', { url: m.lead_handoff_url })}</p>
      <p className="text-xs">{t('module.detail.secretName', { name: m.lead_handoff_signing_key_secret_name })}</p>

      <p className="text-sm" data-testid="module-detail-publication">
        {m.publication === null
          ? t('module.detail.notPublished')
          : t(m.publication.published_event_type === 'module.scheduled' ? 'module.detail.publishedScheduled' : 'module.detail.publishedActive', {
              name: m.publication.reviewer_display_name,
              at: formatIst(m.publication.reviewed_at),
            })}
      </p>

      {m.current_state === 'draft' ? (
        <div className="flex flex-col gap-2 rounded border p-3" data-testid="module-publish">
          <h2 className="font-medium">{t('module.detail.publishHeading')}</h2>
          {m.authored_by_viewer ? (
            <>
              <p className="text-sm" role="note" data-testid="module-publish-author">
                {t('module.detail.authorCannotPublish')}
              </p>
              <p className="text-sm" data-testid="module-publish-single-admin">
                {t('module.detail.singleAdmin')}
              </p>
            </>
          ) : null}
          {(['tone', 'hindi', 'partner'] as const).map((k) => (
            <label key={k} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={ticks[k]}
                disabled={m.authored_by_viewer || busy}
                onChange={() => setTicks((x) => ({ ...x, [k]: !x[k] }))}
                data-testid={`module-tick-${k}`}
              />
              <span>{t(`module.detail.tick.${k}`)}</span>
            </label>
          ))}
          <button
            type="button"
            className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={m.authored_by_viewer || !allTicked || busy}
            onClick={() => void runPublish(newIdempotencyKey(), false)}
            data-testid="module-publish-button"
          >
            {publish.isPending ? t('module.detail.publishing') : t('module.detail.publish')}
          </button>
        </div>
      ) : null}

      {pending !== null ? (
        <StepUpPanel
          key={holdKey(pending)}
          context={MODULE_PUBLISH_STEP_UP_CONTEXT}
          pending={pending}
          onDone={() => setPending(null)}
          onCancel={() => setPending(null)}
          testId="module-step-up"
        />
      ) : null}

      <div className="flex flex-col gap-2 rounded border p-3" data-testid="module-correct">
        <p className="text-xs">{t('module.detail.correctedCopyHint')}</p>
        {warning !== null ? (
          <p role="note" className="text-sm text-status-fail-fg" data-testid="module-lead-warning">
            {warning}
          </p>
        ) : null}
        <div className="flex gap-2">
          {canWithdraw ? (
            <button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50" disabled={busy} onClick={() => void runWithdraw()} data-testid="module-withdraw">
              {withdraw.isPending ? t('module.detail.withdrawing') : t('module.detail.withdraw')}
            </button>
          ) : null}
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => onStartCorrectedCopy(m.module_id)} data-testid="module-corrected-copy">
            {t('module.detail.correctedCopy')}
          </button>
        </div>
      </div>

      {message !== null ? (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'text-sm text-status-fail-fg' : 'text-sm'} data-testid="module-detail-message">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
