// The partner-offer wizard — Story 12.2 (Task 8.2; AC11; `2026-11-01-433` QE1).
//
// Steps (a)–(f) and a summary. The answers live in ONE `useState<WizardState>` (the banners editor shape) and ⛔ in browser
// storage — the opening line tells the admin a reload loses them (QE1). "Create draft" authors an IMMUTABLE draft on the
// server; review and publish happen on the module's detail page, by another admin (QE9).
//
// ⭐ The Idempotency-Key belongs to the current Create ATTEMPT (QE13): the same answers keep their key, so a retried Create
// whose first response was lost returns the same draft, never a second one; an EDIT mints a new key (review RP18 — the
// server replays the first recorded result for a key, so a kept key would silently drop the edit). A 422 maps each issue
// back to the step that owns its field, names the field, and marks it `aria-invalid`.
// ⭐ "Start a corrected copy" opens this wizard with `fromModuleId`: the answers are pre-filled once from that module, and stay
// LOCKED until it has loaded — a failed load offers Try again rather than a blank wizard a later read would overwrite (RC7);
// a source that does not exist here (404, or a 400 for a malformed id) offers a blank offer instead, since retrying cannot help
// (PT7, PU2) — and stays said through later window-focus refetches (PU3). However the source finally loads after a failure, focus
// goes to the step heading (PT8, PU3). A wizard opened by "Start a blank offer" focuses that heading on mount (PU1).
// A Create that resolves after the admin has left the wizard does not navigate them (RC6); a failed Create leaves focus on the
// step heading, never on <body> (RC2).

import type { ModuleEligibilityMemberState } from '@twt/contracts';
import { MODULE_ELIGIBILITY_MEMBER_STATES } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { attemptKey, useAuthorModule, useModuleDetail, useModulePartners, useModuleScopeOptions, type AttemptKey } from '../../api/hooks.js';
import {
  codeToStep,
  describeEligibility,
  describeInstant,
  describePlaces,
  describeScope,
  describeWindow,
  eligibilityFilterOf,
  emptyWizardState,
  firstInvalidStep,
  fromModule,
  issueFieldName,
  issueMessage,
  issueToStep,
  moduleErrorGuidance,
  reachesNoMemberYet,
  scopeFilterOf,
  scopeUnknownMessage,
  statusLabel,
  SUMMARY_STEP,
  toAuthorRequest,
  toIsoOrNull,
  validateStep,
  WIZARD_STEPS,
  type WizardState,
} from './derive.js';
import { focusIfUnclaimed } from './focus.js';
import { resolveEn as t } from './i18n-en.js';
import { PartnerPicker } from './PartnerPicker.js';
import { ScopePicker } from './ScopePicker.js';

export interface ModuleWizardProps {
  pariwarId: string;
  /** "Start a corrected copy" — pre-fill from this module. */
  fromModuleId?: string | null;
  onCreated: (moduleId: string) => void;
  /** The corrected copy's source was not found: open a blank wizard instead (PT7). */
  onStartBlank?: () => void;
  /** Opened by "Start a blank offer": the button that was pressed has gone, so focus the step heading on mount (PU1). */
  focusOnMount?: boolean;
  /** Called once that focus has been handled, so the route can drop its one-shot flag. */
  onMountFocused?: () => void;
}

const input = 'rounded border px-2 py-1 text-sm';

export function ModuleWizard({
  pariwarId,
  fromModuleId = null,
  onCreated,
  onStartBlank,
  focusOnMount = false,
  onMountFocused,
}: ModuleWizardProps): ReactElement {
  const [state, setState] = useState<WizardState>(emptyWizardState);
  const [step, setStep] = useState(0);
  const [issue, setIssue] = useState<string | null>(null);
  // The request field the last 422 pointed at (for `aria-invalid`); cleared with the banner.
  const [issueField, setIssueField] = useState<string | null>(null);
  // The current Create attempt's key (QE13 / RP18): unchanged answers keep it, an edit mints a new one.
  const attempt = useRef<AttemptKey | null>(null);
  const prefilled = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(0);
  const mounted = useRef(true);
  const mountFocusDone = useRef(false);
  const sourceArrived = useRef(false);
  // Once the source has answered "not found" it stays not found: a window-focus refetch (staleTime 0) would otherwise flip the
  // block to "Loading…" and unmount the focused Start-a-blank-offer button (PU3).
  const [fromGone, setFromGone] = useState(false);

  const from = useModuleDetail(pariwarId, fromModuleId);
  const scopeOptions = useModuleScopeOptions(pariwarId);
  const partners = useModulePartners(pariwarId);
  const author = useAuthorModule(pariwarId);

  useEffect(() => {
    if (prefilled.current || from.data === undefined) return;
    prefilled.current = true;
    setState(fromModule(from.data));
  }, [from.data]);

  // However the source finally arrives after a failure (Try again, or a window-focus refetch), the block that held focus has
  // unmounted, so focus goes to the step heading — unless the admin has moved it elsewhere (PT8, PU3, PT2). A first-time load
  // moves nothing.
  useEffect(() => {
    if (from.data === undefined || sourceArrived.current) return;
    sourceArrived.current = true;
    if (from.errorUpdateCount > 0) focusIfUnclaimed(headingRef.current);
  }, [from.data, from.errorUpdateCount]);

  const sourceMissing = from.isError && from.error instanceof ApiError && (from.error.status === 404 || from.error.status === 400);
  useEffect(() => {
    if (sourceMissing) setFromGone(true);
  }, [sourceMissing]);

  useEffect(() => {
    if (!focusOnMount || mountFocusDone.current) return;
    mountFocusDone.current = true;
    focusIfUnclaimed(headingRef.current);
    onMountFocused?.();
  }, [focusOnMount, onMountFocused]);

  // A Create still in flight when the admin leaves must not navigate them to the draft from wherever they went (RC6, TR5).
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Every step change takes focus to the step's heading, so a keyboard or screen-reader user is told where they are and is
  // not left on a button that has just become disabled (RP30).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    headingRef.current?.focus();
  }, [step]);

  const set = (patch: Partial<WizardState>): void => {
    // The admin's first edit wins: no later read of a corrected copy's source pre-fills over it (RC7).
    prefilled.current = true;
    setIssue(null);
    setIssueField(null);
    setState((s) => ({ ...s, ...patch }));
  };
  // Back / Next clear a stale banner (a 422's own step change goes through `setStep` and keeps it).
  const goTo = (n: number): void => {
    setIssue(null);
    setIssueField(null);
    setStep(n);
  };
  const bad = (field: string): { 'aria-invalid'?: true; 'aria-describedby'?: string } =>
    issueField === field ? { 'aria-invalid': true, 'aria-describedby': 'wizard-issue' } : {};
  // A refusal's step: a step change focuses its heading (RP30); staying on the same step focuses it here, since the pressed
  // Create button was disabled under focus while the request ran (RC2).
  const showStep = (n: number): void => {
    if (n === step) headingRef.current?.focus();
    else setStep(n);
  };

  const reason = step < SUMMARY_STEP ? validateStep(step, state) : null;
  const complete = firstInvalidStep(state) === null;

  const onCreate = async (): Promise<void> => {
    setIssue(null);
    setIssueField(null);
    const body = toAuthorRequest(state);
    try {
      const created = await author.mutateAsync({ body, idempotencyKey: attemptKey(attempt, body) });
      if (!mounted.current) return;
      attempt.current = null;
      onCreated(created.module_id);
    } catch (err) {
      if (!mounted.current) return;
      if (!(err instanceof ApiError)) {
        setIssue(t('module.error.generic'));
        headingRef.current?.focus();
        return;
      }
      const issues = (err.details as { issues?: { path: (string | number)[]; message: string }[] } | undefined)?.issues;
      if (err.status === 422 && issues !== undefined && issues.length > 0) {
        const first = issues[0]!;
        showStep(issueToStep(first.path));
        setIssue(issueMessage(first.path, first.message));
        setIssueField(issueFieldName(first.path));
        return;
      }
      const back = codeToStep(err.code);
      if (back !== null) showStep(back);
      else headingRef.current?.focus();
      if (err.code === 'module.scope_value_unknown') {
        // The places changed under the admin: re-read them, so the refused ones show as "not in the list" with Remove
        // buttons (RP21), and name them in the banner (RC8).
        void scopeOptions.refetch();
        setIssue(scopeUnknownMessage(err.details));
        return;
      }
      setIssue(moduleErrorGuidance(err.code));
    }
  };

  const partnerName = partners.data?.items.find((p) => p.partner_id === state.partnerId);
  // The source does not exist in this Pariwar (an unknown id, another Pariwar's, or a malformed one): Try again cannot help (PT7,
  // PU2). Sticky once seen (PU3).
  const fromNotFound = fromGone || sourceMissing;

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="module-wizard">
      <h1 className="text-xl font-semibold">{fromModuleId === null ? t('module.wizard.title') : t('module.wizard.correctedTitle')}</h1>
      <p className="text-sm" data-testid="wizard-opening">
        {t('module.wizard.opening')}
      </p>
      {fromModuleId !== null && from.data === undefined ? (
        <div className="flex flex-col gap-2" data-testid="wizard-from-unavailable">
          {fromNotFound ? (
            <p role="alert">{t('module.wizard.fromNotFound')}</p>
          ) : from.isError ? (
            <p role="alert">{t('module.wizard.loadFromError')}</p>
          ) : (
            <p role="status">{t('module.wizard.loadingFrom')}</p>
          )}
          {/* The answers stay locked until the source loads (RC7), so a failed load needs a way on without a reload. Mounted
              (disabled) while the retry runs — v5 clears `isError` as soon as a data-less refetch starts (PU3). */}
          {fromNotFound && onStartBlank !== undefined ? (
            <button type="button" className="w-fit rounded border px-3 py-1 text-sm" onClick={onStartBlank} data-testid="wizard-start-blank">
              {t('module.wizard.startBlank')}
            </button>
          ) : from.errorUpdateCount > 0 ? (
            <button
              type="button"
              className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={from.isFetching}
              onClick={() => void from.refetch()}
              data-testid="wizard-from-retry"
            >
              {t('module.retry')}
            </button>
          ) : null}
        </div>
      ) : null}

      <ol className="flex flex-wrap gap-2 text-xs" aria-label={t('module.wizard.stepOf', { n: step + 1, total: WIZARD_STEPS.length })}>
        {WIZARD_STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={i === step ? 'font-semibold underline' : ''}>
            {t(`module.wizard.step.${s}`)}
          </li>
        ))}
      </ol>
      <p className="text-xs" data-testid="wizard-step-of">
        {t('module.wizard.stepOf', { n: step + 1, total: WIZARD_STEPS.length })}
      </p>

      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-medium outline-none" data-testid="wizard-step-heading">
        {t(`module.wizard.step.${WIZARD_STEPS[step]}`)}
      </h2>

      {/* Disabled while Create runs AND until a corrected copy's source has loaded — loading (RP20 — the prefill replaces the
          state) or failed (RC7 — a blank wizard would be pre-filled over by a later read). */}
      <fieldset
        disabled={author.isPending || (fromModuleId !== null && from.data === undefined)}
        className="flex flex-col gap-3"
        data-testid={`wizard-step-${WIZARD_STEPS[step]}`}
      >
        {WIZARD_STEPS[step] === 'a' ? (
          <>
            <PartnerPicker pariwarId={pariwarId} value={state.partnerId} onChange={(partnerId) => set({ partnerId })} />
            <label className="flex flex-col text-sm">
              {t('module.field.nameEn')}
              <input className={input} value={state.nameEn} onChange={(e) => set({ nameEn: e.target.value })} data-testid="field-name-en" {...bad('name_en')} />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.nameHi')}
              <input lang="hi" className={input} value={state.nameHi} onChange={(e) => set({ nameHi: e.target.value })} data-testid="field-name-hi" {...bad('name_hi')} />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.descriptionEn')}
              <textarea className={input} rows={4} value={state.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} data-testid="field-description-en" {...bad('description_en')} />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.descriptionHi')}
              <textarea lang="hi" className={input} rows={4} value={state.descriptionHi} onChange={(e) => set({ descriptionHi: e.target.value })} data-testid="field-description-hi" {...bad('description_hi')} />
            </label>
          </>
        ) : null}

        {WIZARD_STEPS[step] === 'b' ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{t('module.wizard.step.b')}</legend>
            {/* ⛔ default: neither option is pre-selected (AC11). */}
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="eligibility" checked={state.eligibilityMode === 'all'} onChange={() => set({ eligibilityMode: 'all', eligibilityStates: [] })} data-testid="eligibility-all" />
              {t('module.eligibility.all')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="eligibility" checked={state.eligibilityMode === 'only'} onChange={() => set({ eligibilityMode: 'only' })} data-testid="eligibility-only" />
              {t('module.eligibility.only')}
            </label>
            {state.eligibilityMode === 'only' ? (
              <>
                <p className="text-xs" role="note" id="eligibility-no-member-yet" data-testid="eligibility-no-member-yet">
                  {t('module.eligibility.noMemberYet')}
                </p>
                {/* The G18 note describes the list it is about (RC17). */}
                <ul className="flex flex-col gap-1" aria-label={t('module.eligibility.statusesLabel')} aria-describedby="eligibility-no-member-yet">
                  {MODULE_ELIGIBILITY_MEMBER_STATES.map((s: ModuleEligibilityMemberState) => (
                    <li key={s}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={state.eligibilityStates.includes(s)}
                          onChange={() =>
                            set({
                              eligibilityStates: state.eligibilityStates.includes(s)
                                ? state.eligibilityStates.filter((x) => x !== s)
                                : [...state.eligibilityStates, s],
                            })
                          }
                          data-testid={`eligibility-state-${s}`}
                        />
                        {statusLabel(s)}
                      </label>
                    </li>
                  ))}
                </ul>
                {reachesNoMemberYet(state.eligibilityStates) ? (
                  <p role="alert" className="text-sm text-status-fail-fg" data-testid="eligibility-reaches-no-member">
                    {t('module.eligibility.reachesNoMember')}
                  </p>
                ) : null}
              </>
            ) : null}
            {/* ⛔ "Only members in these statuses: " with nothing after it — the sentence waits for the first tick (RC16). */}
            {state.eligibilityMode === 'all' || (state.eligibilityMode === 'only' && state.eligibilityStates.length > 0) ? (
              <ul className="text-xs" data-testid="eligibility-sentence">
                {describeEligibility(eligibilityFilterOf(state)).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        ) : null}

        {WIZARD_STEPS[step] === 'c' ? (
          scopeOptions.data !== undefined ? (
            <ScopePicker
              options={scopeOptions.data}
              kind={state.scopeKind}
              values={state.scopeValues}
              onChange={({ kind, values }) => set({ scopeKind: kind, scopeValues: values })}
            />
          ) : (
            <div className="flex flex-col gap-2" data-testid="scope-unavailable">
              {scopeOptions.isError ? <p role="alert">{t('module.scope.loadError')}</p> : <p role="status">{t('module.loading')}</p>}
              {/* Without the options not even "every member" can be chosen, and a reload would lose every answer (RP23). The button
                  stays MOUNTED (disabled) while the retry runs: v5 clears `isError` the moment a data-less refetch starts, and a
                  button that unmounts under focus drops it to <body> (PU3). */}
              {scopeOptions.errorUpdateCount > 0 ? (
                <button
                  type="button"
                  className="w-fit rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={scopeOptions.isFetching}
                  onClick={() => void scopeOptions.refetch()}
                  data-testid="scope-retry"
                >
                  {t('module.retry')}
                </button>
              ) : null}
            </div>
          )
        ) : null}

        {WIZARD_STEPS[step] === 'd' ? (
          <div className="flex flex-col gap-2">
            {(['validFrom', 'validUntil'] as const).map((field) => {
              const iso = toIsoOrNull(state[field]);
              const shown = iso === null ? null : describeInstant(iso);
              const invalid = bad(field === 'validFrom' ? 'valid_from' : 'valid_until');
              // The India-time line describes its input (RC17), alongside a 422 banner that names the field.
              const describedBy = [invalid['aria-describedby'], shown !== null ? `wizard-${field}-ist` : undefined].filter(Boolean).join(' ');
              return (
                <div key={field} className="flex flex-col gap-1">
                  <label className="flex flex-col text-sm">
                    {t(field === 'validFrom' ? 'module.field.validFrom' : 'module.field.validUntil')}
                    <input type="datetime-local" className={input} value={state[field]} onChange={(e) => set({ [field]: e.target.value })} data-testid={`field-${field}`} {...invalid} aria-describedby={describedBy === '' ? undefined : describedBy} />
                  </label>
                  {shown !== null ? (
                    <p className="text-xs" id={`wizard-${field}-ist`} data-testid={`field-${field}-ist`}>
                      {shown.ist} · {shown.browser}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {WIZARD_STEPS[step] === 'e' ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{t('module.wizard.step.e')}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="places" checked={state.placesMode === 'unlimited'} onChange={() => set({ placesMode: 'unlimited', places: '' })} data-testid="places-unlimited" />
              {t('module.places.unlimited')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="places" checked={state.placesMode === 'fixed'} onChange={() => set({ placesMode: 'fixed' })} data-testid="places-fixed" />
              {t('module.places.fixed')}
            </label>
            {state.placesMode === 'fixed' ? (
              <label className="flex flex-col text-sm">
                {t('module.field.places')}
                <input inputMode="numeric" className={input} value={state.places} onChange={(e) => set({ places: e.target.value })} data-testid="field-places" {...bad('slot_capacity')} />
              </label>
            ) : null}
          </fieldset>
        ) : null}

        {WIZARD_STEPS[step] === 'f' ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col text-sm">
              {t('module.field.leadUrl')}
              <input className={input} value={state.leadHandoffUrl} onChange={(e) => set({ leadHandoffUrl: e.target.value })} data-testid="field-lead-url" {...bad('lead_handoff_url')} />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.secretName')}
              <input className={input} value={state.secretName} onChange={(e) => set({ secretName: e.target.value })} data-testid="field-secret-name" {...bad('lead_handoff_signing_key_secret_name')} />
            </label>
            <p className="text-xs" data-testid="secret-copy">
              {t('module.secret.copy')}
            </p>
          </div>
        ) : null}

        {WIZARD_STEPS[step] === 'summary' ? (
          <div className="flex flex-col gap-3" data-testid="wizard-summary">
            {/* TWT chrome only — ⛔ partner colour anywhere (C5, I10). */}
            <div className="flex flex-col gap-1 rounded border p-3">
              <p className="text-xs font-medium">{t('module.summary.previewEn')}</p>
              {/* A chosen partner the list does not show is still named as chosen, never dropped (RC5). */}
              {partnerName !== undefined ? (
                <p className="text-xs">{t('module.summary.partner', { name: partnerName.display_name_en })}</p>
              ) : state.partnerId !== null ? (
                <p className="text-xs">{t('module.summary.partner', { name: t('module.partner.notListed') })}</p>
              ) : null}
              <p className="font-semibold" data-testid="preview-name-en">{state.nameEn}</p>
              <p className="whitespace-pre-line text-sm">{state.descriptionEn}</p>
            </div>
            <div className="flex flex-col gap-1 rounded border p-3" lang="hi" data-testid="preview-hi">
              <p className="text-xs font-medium" lang="en">{t('module.summary.previewHi')}</p>
              {partnerName !== undefined ? (
                <p className="text-xs">{partnerName.display_name_hi}</p>
              ) : state.partnerId !== null ? (
                <p className="text-xs" lang="en" data-testid="preview-hi-partner-not-listed">
                  {t('module.partner.notListed')}
                </p>
              ) : null}
              <p className="font-semibold">{state.nameHi}</p>
              <p className="whitespace-pre-line text-sm">{state.descriptionHi}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t('module.summary.audience')}</p>
              <ul className="text-sm" data-testid="summary-audience">
                {describeScope(scopeFilterOf(state)).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium">{t('module.summary.eligibility')}</p>
              <ul className="text-sm" data-testid="summary-eligibility">
                {describeEligibility(eligibilityFilterOf(state)).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            {toIsoOrNull(state.validFrom) !== null && toIsoOrNull(state.validUntil) !== null ? (
              <p className="text-sm" data-testid="summary-window">
                {t('module.summary.window')}: {describeWindow(toIsoOrNull(state.validFrom)!, toIsoOrNull(state.validUntil)!)}
              </p>
            ) : null}
            <p className="text-sm" data-testid="summary-places">
              {t('module.summary.places')}: {describePlaces(state.placesMode === 'fixed' ? Number(state.places.trim()) : null)}
            </p>
            {/* Step (f) as it will be SENT (trimmed): a typo here goes into an immutable draft, so it is reviewed too (RC10). */}
            <div data-testid="summary-handoff">
              <p className="text-sm font-medium">{t('module.wizard.step.f')}</p>
              <p className="text-sm break-all">{t('module.detail.leadUrl', { url: state.leadHandoffUrl.trim() })}</p>
              <p className="text-sm">{t('module.detail.secretName', { name: state.secretName.trim() })}</p>
            </div>
          </div>
        ) : null}
      </fieldset>

      {reason !== null ? (
        <p className="text-sm" role="status" id="wizard-reason" data-testid="wizard-reason">
          {reason}
        </p>
      ) : null}
      {issue !== null ? (
        <p role="alert" id="wizard-issue" className="text-sm text-status-fail-fg" data-testid="wizard-issue">
          {issue}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50" disabled={step === 0 || author.isPending} onClick={() => goTo(step - 1)} data-testid="wizard-back">
          {t('module.wizard.back')}
        </button>
        {step < SUMMARY_STEP ? (
          <button type="button" className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={reason !== null} aria-describedby={reason !== null ? 'wizard-reason' : undefined} onClick={() => goTo(step + 1)} data-testid="wizard-next">
            {t('module.wizard.next')}
          </button>
        ) : (
          <button
            type="button"
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={!complete || author.isPending}
            onClick={() => void onCreate()}
            data-testid="wizard-create"
          >
            {author.isPending ? t('module.wizard.creating') : t('module.wizard.create')}
          </button>
        )}
      </div>
    </section>
  );
}
