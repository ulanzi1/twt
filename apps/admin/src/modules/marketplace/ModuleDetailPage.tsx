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
//
// ⭐ Story 12.5b (`2026-11-22-489` QE6 (A), QE12 (A), QE13 (A); `-486` R1 A, R3 B): the page says how the offer reaches the partner and
// shows that route's fields. PUBLISH asks the publisher to choose the route again, with ⛔ default (it must be the one the offer was
// written with — the server answers 409 `module.lead_route_mismatch` otherwise, with ⛔ write). An offer that uses the partner's own
// page shows its FIGURES — the Trust's own counts and the partner's totals, every figure below 5 as "fewer than 5" (the server never
// sends one) — and a form to enter the partner's totals for a period. ⛔ A member anywhere on this page.

import {
  MODULE_PARTNER_FORM_STAGES_MAX as TOTALS_STAGES_MAX,
  MODULE_PUBLISH_STEP_UP_CONTEXT,
  type ModuleDetailResponse,
  type ModuleLeadRoute,
} from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { newIdempotencyKey, useModuleDetail, usePublishModule, useRecordPartnerFormTotals, useWithdrawModule } from '../../api/hooks.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import {
  describeEligibility,
  describePlacesFor,
  describePublication,
  describeRoute,
  describeScope,
  describeWindow,
  eligibilityStatesOf,
  emptyTotalsDraft,
  figureText,
  formatIst,
  leadWarning,
  moduleErrorGuidance,
  reachesNoMemberYet,
  toTotalsRequest,
  validateTotalsDraft,
  type TotalsDraft,
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

/** The totals save's refusal in words. An overlap names the period it clashes with (the 409 carries it — the admin's own entry). */
function totalsErrorText(err: ApiError): string {
  if (err.code === 'module.partner_form_totals_overlap') {
    const d = err.details as { existing_period_start?: unknown; existing_period_end?: unknown } | null | undefined;
    if (typeof d?.existing_period_start === 'string' && typeof d?.existing_period_end === 'string') {
      return t('module.error.partner_form_totals_overlap_dates', { from: d.existing_period_start, until: d.existing_period_end });
    }
  }
  return moduleErrorGuidance(err.code, 'detail');
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
  const recordTotals = useRecordPartnerFormTotals(pariwarId, moduleId);
  const [ticks, setTicks] = useState({ tone: false, hindi: false, partner: false });
  // Story 12.5b (QE6 (A)) — the publisher's route, ⛔ default.
  const [publishRoute, setPublishRoute] = useState<ModuleLeadRoute | null>(null);
  const [totals, setTotals] = useState<TotalsDraft>(emptyTotalsDraft);
  const [totalsMessage, setTotalsMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const totalsHeadingRef = useRef<HTMLHeadingElement>(null);
  const totalsFormRef = useRef<HTMLFieldSetElement>(null);
  // Review R2P14: what a removal changed, said in the always-mounted live region (the rows renumber under the reader).
  const [totalsNote, setTotalsNote] = useState<{ seq: number; text: string } | null>(null);
  const noteSeq = useRef(0);
  const totalsInFlight = useRef(false);
  // Review RP3: the label field of each step, and the step "Add a step" just made — focus moves there once it has rendered.
  const stageLabelRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusStage = useRef<number | null>(null);
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

  // Review RP3 (checklist family 13): "Add a step" moves focus to the NEW step's first field — the next thing to type — on every add.
  // On the twentieth the button itself unmounts under the keyboard, which would otherwise drop focus to <body>.
  useEffect(() => {
    const i = focusStage.current;
    if (i === null) return;
    focusStage.current = null;
    stageLabelRefs.current[i]?.focus();
  }, [totals.stages.length]);

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

  const runPublish = async (idempotencyKey: string, leadRoute: ModuleLeadRoute, retried: boolean): Promise<void> => {
    setMessage(null);
    try {
      await publish.mutateAsync({ idempotencyKey, leadRoute });
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
          holdOnce({ owner: 'publish', id: holdSeq.current, label: t('module.detail.stepUpLabel'), retry: () => void runPublish(idempotencyKey, leadRoute, true) }),
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
  const partnerForm = m.lead_route === 'partner_form';
  const totalsReason = validateTotalsDraft(totals);

  // Story 12.5b (QE12 (A)) — save the partner's totals; each click a new intent (a new key). Focus returns to the form's heading.
  const runTotals = async (): Promise<void> => {
    if (totalsInFlight.current) return;
    totalsInFlight.current = true;
    setTotalsMessage(null);
    setTotalsNote(null); // "Step 2 removed" is about the form as it WAS, ⛔ beside the result of saving it
    try {
      await recordTotals.mutateAsync({ body: toTotalsRequest(totals), idempotencyKey: newIdempotencyKey() });
      setTotals(emptyTotalsDraft());
      setTotalsMessage({ kind: 'ok', text: t('module.totals.saved') });
    } catch (err) {
      setTotalsMessage({ kind: 'error', text: err instanceof ApiError ? totalsErrorText(err) : t('module.error.generic') });
    } finally {
      totalsInFlight.current = false;
      // The Save button was disabled under focus while the write ran (RC2) — but only when focus is still there: an admin who has moved on
      // (the publish ticks, Withdraw) keeps it (review R2P7; `focusIfUnclaimed`, as the other handlers do).
      focusIfUnclaimed(totalsHeadingRef.current, totalsFormRef.current);
    }
  };
  // Any edit of the form retires the last result: "saved" (or the refusal) is about what was sent, ⛔ about the next period being typed (R2P7).
  const editTotals = (change: (d: TotalsDraft) => TotalsDraft): void => {
    setTotals(change);
    setTotalsMessage(null);
    setTotalsNote(null);
  };
  const setStage = (i: number, patch: Partial<TotalsDraft['stages'][number]>): void =>
    editTotals((d) => ({ ...d, stages: d.stages.map((st, j) => (j === i ? { ...st, ...patch } : st)) }));

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
      <div data-testid="module-detail-route">
        <p className="text-sm">{t('module.detail.route', { route: describeRoute(m.lead_route).name })}</p>
        <p className="text-xs">{describeRoute(m.lead_route).meaning}</p>
      </div>
      <p className="text-sm">{describePlacesFor(m.lead_route, m.slot_capacity)}</p>
      {partnerForm ? (
        <>
          <p className="text-xs break-all" data-testid="module-detail-partner-form-url">
            {t('module.detail.partnerFormUrl', { url: m.partner_form_url ?? '' })}
          </p>
          <p className="text-xs" data-testid="module-detail-leads-not-used">
            {t('module.detail.leadsNotUsed')}
          </p>
        </>
      ) : (
        <>
          <p className="text-xs break-all">{t('module.detail.leadUrl', { url: m.lead_handoff_url ?? '' })}</p>
          <p className="text-xs">{t('module.detail.secretName', { name: m.lead_handoff_signing_key_secret_name ?? '' })}</p>
        </>
      )}

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
          {/* Story 12.5b (QE6 (A); `-486` R1 A) — the publisher chooses the route, ⛔ default. */}
          <fieldset className="flex flex-col gap-1" data-testid="module-publish-route">
            <legend className="text-sm">{t('module.detail.publishRoute')}</legend>
            {(['trust_sends', 'partner_form'] as const).map((route) => (
              <label key={route} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="publish-route"
                  checked={publishRoute === route}
                  disabled={m.authored_by_viewer || busy}
                  onChange={() => setPublishRoute(route)}
                  data-testid={`module-publish-route-${route}`}
                />
                {describeRoute(route).name}
              </label>
            ))}
          </fieldset>
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
            disabled={m.authored_by_viewer || !allTicked || publishRoute === null || busy}
            aria-describedby={m.authored_by_viewer ? 'module-publish-author' : publishRoute === null ? 'module-publish-route-reason' : undefined}
            onClick={once(() => (publishRoute === null ? Promise.resolve() : runPublish(newIdempotencyKey(), publishRoute, false)))}
            data-testid="module-publish-button"
          >
            {publish.isPending ? t('module.detail.publishing') : t('module.detail.publish')}
          </button>
          <p className="text-xs empty:hidden" role="status" id="module-publish-route-reason" data-testid="module-publish-route-reason">
            {!m.authored_by_viewer && publishRoute === null ? t('module.detail.publishRouteReason') : ''}
          </p>
        </div>
      ) : null}

      {partnerForm && m.partner_form_figures !== null ? (
        <div className="flex flex-col gap-2 rounded border p-3" data-testid="module-figures">
          <h2 className="font-medium">{t('module.figures.heading')}</h2>
          <p className="text-xs">{t('module.figures.note')}</p>
          <table className="text-sm">
            <caption className="text-left text-xs">{t('module.figures.caption')}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">{t('module.figures.byDay')}</th>
                {(['card_shown', 'card_opened', 'went_to_partner', 'came_back'] as const).map((k) => (
                  <th key={k} scope="col" className="text-left">{t(`module.figures.kind.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr data-testid="module-figures-total">
                <th scope="row" className="text-left">{t('module.figures.total')}</th>
                {(['card_shown', 'card_opened', 'went_to_partner', 'came_back'] as const).map((k) => (
                  <td key={k}>{figureText(m.partner_form_figures!.counts[k])}</td>
                ))}
              </tr>
              {m.partner_form_figures.days.map((d) => (
                <tr key={d.day} data-testid={`module-figures-day-${d.day}`}>
                  <th scope="row" className="text-left">{d.day}</th>
                  {(['card_shown', 'card_opened', 'went_to_partner', 'came_back'] as const).map((k) => (
                    <td key={k}>{figureText(d.counts[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {m.partner_form_figures.days.length === 0 ? <p className="text-xs">{t('module.figures.noDays')}</p> : null}

          <h3 className="font-medium">{t('module.figures.partner.heading')}</h3>
          {m.partner_form_figures.partner_totals.length === 0 ? (
            <p className="text-xs" data-testid="module-partner-totals-none">{t('module.figures.partner.none')}</p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="module-partner-totals">
              {m.partner_form_figures.partner_totals.map((entry) => (
                <li key={entry.totals_id} className="text-sm">
                  <p className="font-medium">{t('module.figures.partner.period', { from: entry.period_start, until: entry.period_end })}</p>
                  <p className="text-xs">{t('module.figures.partner.entered', { at: formatIst(entry.entered_at) })}</p>
                  <ol className="list-decimal pl-5">
                    {entry.stages.map((st) => (
                      <li key={st.order}>
                        {st.label}: {figureText(st)}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}

          <h3 ref={totalsHeadingRef} tabIndex={-1} className="font-medium outline-none">{t('module.totals.heading')}</h3>
          <p className="text-xs" id="module-totals-hint">{t('module.totals.hint')}</p>
          <fieldset ref={totalsFormRef} disabled={recordTotals.isPending} className="flex flex-col gap-2" aria-describedby="module-totals-hint" data-testid="module-totals-form">
            <div className="flex gap-2">
              <label className="flex flex-col text-sm">
                {t('module.totals.periodStart')}
                <input type="date" className="rounded border px-2 py-1 text-sm" value={totals.periodStart} onChange={(e) => editTotals((d) => ({ ...d, periodStart: e.target.value }))} data-testid="totals-period-start" />
              </label>
              <label className="flex flex-col text-sm">
                {t('module.totals.periodEnd')}
                <input type="date" className="rounded border px-2 py-1 text-sm" value={totals.periodEnd} onChange={(e) => editTotals((d) => ({ ...d, periodEnd: e.target.value }))} data-testid="totals-period-end" />
              </label>
            </div>
            {totals.stages.map((st, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className="flex flex-col text-sm">
                  {t('module.totals.stageLabel', { n: i + 1 })}
                  <input
                    ref={(el) => {
                      stageLabelRefs.current[i] = el;
                    }}
                    className="rounded border px-2 py-1 text-sm"
                    value={st.label}
                    onChange={(e) => setStage(i, { label: e.target.value })}
                    data-testid={`totals-stage-label-${i}`}
                  />
                </label>
                <label className="flex flex-col text-sm">
                  {t('module.totals.stageFigure', { n: i + 1 })}
                  <input inputMode="numeric" className="rounded border px-2 py-1 text-sm" value={st.figure} onChange={(e) => setStage(i, { figure: e.target.value })} data-testid={`totals-stage-figure-${i}`} />
                </label>
                {totals.stages.length > 1 ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => {
                      // Focus goes to the label of the row that now sits where this one was (the one before it, for the last row) — ⛔ the heading
                      // above the whole form; the renumbering is announced (review R2P14).
                      focusStage.current = Math.min(i, totals.stages.length - 2);
                      editTotals((d) => ({ ...d, stages: d.stages.filter((_x, j) => j !== i) }));
                      // A fresh `seq` each time: the same sentence twice in a row must still be announced twice (a node REMOUNTS; identical text
                      // in place is not re-read). The "renumbered" half is only true when a later step exists.
                      noteSeq.current += 1;
                      setTotalsNote({
                        seq: noteSeq.current,
                        text: t(i + 1 < totals.stages.length ? 'module.totals.stageRemoved' : 'module.totals.lastStageRemoved', { n: i + 1 }),
                      });
                    }}
                    data-testid={`totals-stage-remove-${i}`}
                  >
                    {t('module.totals.removeStage', { n: i + 1 })}
                  </button>
                ) : null}
              </div>
            ))}
            <div className="flex gap-2">
              {totals.stages.length < TOTALS_STAGES_MAX ? (
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => {
                    focusStage.current = totals.stages.length; // the new step's index (RP3)
                    editTotals((d) => ({ ...d, stages: [...d.stages, { label: '', figure: '' }] }));
                  }}
                  data-testid="totals-stage-add"
                >
                  {t('module.totals.addStage')}
                </button>
              ) : null}
              <button
                type="button"
                className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                disabled={totalsReason !== null || recordTotals.isPending}
                aria-describedby={totalsReason !== null ? 'module-totals-reason' : undefined}
                onClick={() => void runTotals()}
                data-testid="totals-save"
              >
                {recordTotals.isPending ? t('module.totals.saving') : t('module.totals.save')}
              </button>
            </div>
          </fieldset>
          {/* ALWAYS mounted (review R2P14): a status region inserted together with its text is usually not announced. */}
          <p className="text-xs empty:hidden" role="status" id="module-totals-reason" data-testid="module-totals-reason">
            {totalsReason ?? ''}
          </p>
          <div role="status" aria-live="polite" data-testid="module-totals-live">
            {totalsMessage !== null && totalsMessage.kind === 'ok' ? <p className="text-sm">{totalsMessage.text}</p> : null}
            {totalsNote !== null ? <p key={totalsNote.seq} className="text-xs">{totalsNote.text}</p> : null}
            {/* Review RP3: why "Add a step" has gone — said in this ALWAYS-mounted region, so it is announced when the limit is reached. */}
            {totals.stages.length >= TOTALS_STAGES_MAX ? <p className="text-xs">{t('module.totals.stagesLimit', { n: TOTALS_STAGES_MAX })}</p> : null}
          </div>
          {totalsMessage !== null && totalsMessage.kind === 'error' ? (
            <p role="alert" className="text-sm text-status-fail-fg" data-testid="module-totals-error">
              {totalsMessage.text}
            </p>
          ) : null}
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
