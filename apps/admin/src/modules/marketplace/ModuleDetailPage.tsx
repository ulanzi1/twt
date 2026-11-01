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
// Each CLICK is a new intent and mints a new Idempotency-Key. Only the held step-up retry reuses its click's key (the write it
// retries is the same request); a second click after a lost response is a new write and is told, by the server's 409, to
// reload (review RP34 — this header used to say every retry reuses the key). A synchronous in-flight guard stops a fast
// double activation from sending two writes before `busy` renders (RC11).
//
// The page's OWN actions do not leave focus on <body> (RC1, RC2, PT4 — family 13(d)): the step-up panel takes focus when it
// opens; Cancel, the held retry and every write's result return it to the heading. Arriving from "Create draft" (the admin's
// own draft) announces it and focuses the heading, unless the admin has already moved focus elsewhere (PT2, PT10). A change
// made elsewhere (another admin publishing, seen on a refresh) can still unmount the publish form under focus.

import { MODULE_PUBLISH_STEP_UP_CONTEXT, type ModuleDetailResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { newIdempotencyKey, useModuleDetail, usePublishModule, useWithdrawModule } from '../../api/hooks.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import {
  describeEligibility,
  describePlaces,
  describePublication,
  describeScope,
  describeWindow,
  eligibilityStatesOf,
  leadWarning,
  moduleErrorGuidance,
  reachesNoMemberYet,
} from './derive.js';
import { focusIfUnclaimed } from './focus.js';
import { resolveEn as t } from './i18n-en.js';

export interface ModuleDetailPageProps {
  pariwarId: string;
  moduleId: string;
  onBack: () => void;
  onStartCorrectedCopy: (moduleId: string) => void;
  /** The admin has just created this draft in the wizard: announce it and focus the heading once the offer has loaded (RC1). */
  created?: boolean;
  /** Called once "Draft created." has been shown, so the route can drop its flag (a reload does not announce it again). */
  onCreatedShown?: () => void;
}

function stateLabel(m: ModuleDetailResponse): string {
  return t(`module.state.${m.current_state}`);
}

export function ModuleDetailPage({
  pariwarId,
  moduleId,
  onBack,
  onStartCorrectedCopy,
  created = false,
  onCreatedShown,
}: ModuleDetailPageProps): ReactElement {
  const detail = useModuleDetail(pariwarId, moduleId);
  const publish = usePublishModule(pariwarId, moduleId);
  const withdraw = useWithdrawModule(pariwarId, moduleId);
  const [ticks, setTicks] = useState({ tone: false, hindi: false, partner: false });
  const [pending, setPending] = useState<PendingWrite<'publish'>>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const holdSeq = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepUpRef = useRef<HTMLDivElement>(null);
  // Set synchronously on a Publish / Withdraw click and cleared when that write settles (RC11).
  const inFlight = useRef(false);
  const createdShown = useRef(false);
  // A write has succeeded and its refresh has not landed: the page still shows the OLD state, so the write buttons stay off (a
  // second press would only meet a 409). The result no longer waits for that refresh (RC15). The write's own `onSuccess` starts
  // the refresh BEFORE `mutateAsync` resolves, so "the refresh has landed" is simply "the detail read is no longer fetching" —
  // a success or a failure, and only one that comes after the write (an error from before the write is ignored — PT3). ⛔ Wall-clock
  // timestamps: a refresh can settle in the same millisecond as the write's result (PU4).
  const [awaitingRefresh, setAwaitingRefresh] = useState(false);
  useEffect(() => {
    if (awaitingRefresh && !detail.isFetching) setAwaitingRefresh(false);
  }, [awaitingRefresh, detail.isFetching]);

  useEffect(() => {
    if (!created || createdShown.current || detail.data === undefined) return;
    createdShown.current = true;
    // Only the admin's own new draft is announced: `?created=true` typed or kept on another offer says nothing (PT10). The flag
    // is dropped either way.
    if (detail.data.current_state === 'draft' && detail.data.authored_by_viewer) {
      setMessage({ kind: 'ok', text: t('module.detail.created') });
      focusIfUnclaimed(headingRef.current);
    }
    onCreatedShown?.();
  }, [created, detail.data, onCreatedShown]);

  // The pressed Publish button is disabled while the write is held, so the panel takes focus when it opens (RC2) — its first
  // ENABLED control (PT5).
  useEffect(() => {
    if (pending === null) return;
    stepUpRef.current?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type=hidden])')?.focus();
  }, [pending]);

  if (detail.isLoading) return <p role="status">{t('module.loading')}</p>;
  // The error REPLACES the page only when there is nothing to show: a failed background refetch (window focus — the admin
  // leaves the tab to read the OTP — or the refresh after a write) keeps the loaded page, the step-up panel and the result (RP19).
  if (detail.data === undefined) {
    return (
      <p role="alert" data-testid="module-detail-error">
        {detail.error instanceof ApiError ? moduleErrorGuidance(detail.error.code, 'detail') : t('module.detail.loadError')}
      </p>
    );
  }
  const m = detail.data;
  const warning = leadWarning(m.lead_count);
  const refreshing = awaitingRefresh && detail.isFetching;
  const busy = publish.isPending || withdraw.isPending || pending !== null || refreshing;
  const canWithdraw = m.current_state !== 'archived';

  const runPublish = async (idempotencyKey: string, retried: boolean): Promise<void> => {
    setMessage(null);
    try {
      await publish.mutateAsync({ idempotencyKey });
      setAwaitingRefresh(true);
      setMessage({ kind: 'ok', text: t('module.detail.published') });
      headingRef.current?.focus(); // the form that held focus is about to unmount (RP32)
    } catch (err) {
      if (needsStepUp(err)) {
        if (retried) {
          // The held retry is run ONCE; a second step-up demand is an error, ⛔ another hold.
          setMessage({ kind: 'error', text: t('module.detail.stepUpAgain') });
          headingRef.current?.focus(); // the panel that held focus has unmounted (RC2)
          return;
        }
        holdSeq.current += 1;
        setPending(
          holdOnce({ owner: 'publish', id: holdSeq.current, label: t('module.detail.stepUpLabel'), retry: () => void runPublish(idempotencyKey, true) }),
        );
        return;
      }
      setMessage({ kind: 'error', text: err instanceof ApiError ? moduleErrorGuidance(err.code, 'detail') : t('module.error.generic') });
      headingRef.current?.focus(); // the pressed button (or the panel) was disabled or unmounted under focus (RC2)
    }
  };

  const runWithdraw = async (): Promise<void> => {
    setMessage(null);
    try {
      await withdraw.mutateAsync({ idempotencyKey: newIdempotencyKey() });
      setAwaitingRefresh(true);
      setMessage({ kind: 'ok', text: t('module.detail.withdrawn') });
      headingRef.current?.focus(); // the Withdraw button that held focus is about to unmount (RP32)
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ApiError ? moduleErrorGuidance(err.code, 'detail') : t('module.error.generic') });
      headingRef.current?.focus(); // the pressed button was disabled under focus (RC2)
    }
  };

  // ONE write per activation: the ref is set before any render can disable the button (RC11).
  const once = (run: () => Promise<void>) => (): void => {
    if (inFlight.current) return;
    inFlight.current = true;
    void run().finally(() => {
      inFlight.current = false;
    });
  };

  const allTicked = ticks.tone && ticks.hindi && ticks.partner;

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="module-detail">
      <button type="button" className="w-fit text-sm underline" onClick={onBack} data-testid="module-detail-back">
        {t('module.detail.back')}
      </button>
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {m.name_en}
      </h1>
      {detail.isError ? (
        <p role="alert" className="text-sm" data-testid="module-detail-refresh-error">
          {t('module.detail.refreshError')}
        </p>
      ) : null}
      <p className="text-sm" data-testid="module-detail-members-cannot-see">
        {t('module.detail.membersCannotSee')}
      </p>
      <p className="text-sm" data-testid="module-detail-state">
        {t('module.detail.state', { state: stateLabel(m) })}
      </p>
      <p className="text-sm" data-testid="module-detail-author">
        {t('module.detail.author', { name: m.author_display_name })}
      </p>
      <p className="text-sm" data-testid="module-detail-partner">
        {t('module.detail.partner', { en: m.partner_display_name_en })} <span lang="hi">{m.partner_display_name_hi}</span>
      </p>

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
      {/* The publisher never sees wizard step (b), so the G18 warning is repeated here (RP28 — checklist family 11). */}
      {reachesNoMemberYet(eligibilityStatesOf(m.eligibility_filter)) ? (
        <p role="note" className="text-sm text-status-fail-fg" data-testid="module-detail-reaches-no-member">
          {t('module.eligibility.reachesNoMember')}
        </p>
      ) : null}
      <p className="text-sm">{describeWindow(m.valid_from, m.valid_until)}</p>
      <p className="text-sm">{describePlaces(m.slot_capacity)}</p>
      <p className="text-xs break-all">{t('module.detail.leadUrl', { url: m.lead_handoff_url })}</p>
      <p className="text-xs">{t('module.detail.secretName', { name: m.lead_handoff_signing_key_secret_name })}</p>

      <p className="text-sm" data-testid="module-detail-publication">
        {describePublication(m.publication, m.current_state)}
      </p>

      {m.current_state === 'draft' ? (
        <div className="flex flex-col gap-2 rounded border p-3" data-testid="module-publish">
          <h2 className="font-medium">{t('module.detail.publishHeading')}</h2>
          {m.authored_by_viewer ? (
            <>
              <p className="text-sm" role="note" id="module-publish-author" data-testid="module-publish-author">
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
            aria-describedby={m.authored_by_viewer ? 'module-publish-author' : undefined}
            onClick={once(() => runPublish(newIdempotencyKey(), false))}
            data-testid="module-publish-button"
          >
            {publish.isPending ? t('module.detail.publishing') : t('module.detail.publish')}
          </button>
        </div>
      ) : null}

      {pending !== null ? (
        <div ref={stepUpRef}>
          <StepUpPanel
            key={holdKey(pending)}
            context={MODULE_PUBLISH_STEP_UP_CONTEXT}
            pending={pending}
            onDone={() => {
              setPending(null);
              headingRef.current?.focus(); // the Verify button unmounts with the panel while the held write is retried (PT4)
            }}
            onCancel={() => {
              setPending(null);
              headingRef.current?.focus(); // the Cancel button unmounts with the panel (RC2)
            }}
            testId="module-step-up"
          />
        </div>
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
            <button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50" disabled={busy} onClick={once(runWithdraw)} data-testid="module-withdraw">
              {withdraw.isPending ? t('module.detail.withdrawing') : t('module.detail.withdraw')}
            </button>
          ) : null}
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => onStartCorrectedCopy(m.module_id)} data-testid="module-corrected-copy">
            {t('module.detail.correctedCopy')}
          </button>
        </div>
      </div>

      {/* An ALWAYS-mounted live region: a `role="status"` node that arrives already holding its text is announced unreliably (RP32). */}
      <div role="status" aria-live="polite" data-testid="module-detail-live">
        {message !== null && message.kind === 'ok' ? (
          <p className="text-sm" data-testid="module-detail-message">
            {message.text}
          </p>
        ) : null}
      </div>
      {message !== null && message.kind === 'error' ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="module-detail-message">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
