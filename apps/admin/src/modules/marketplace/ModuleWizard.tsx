// The partner-offer wizard — Story 12.2 (Task 8.2; AC11; `2026-11-01-433` QE1).
//
// Steps (a)–(f) and a summary. The answers live in ONE `useState<WizardState>` (the banners editor shape) and ⛔ in browser
// storage — the opening line tells the admin a reload loses them (QE1). "Create draft" authors an IMMUTABLE draft on the
// server; review and publish happen on the module's detail page, by another admin (QE9).
//
// ⭐ The Idempotency-Key is minted ONCE per wizard session and REUSED on every retry (a retried Create returns the same
// draft, never a second one — QE13). A 422 maps each issue back to the step that owns its field.
// ⭐ "Start a corrected copy" opens this wizard with `fromModuleId`: the answers are pre-filled once from that module.

import type { ModuleEligibilityMemberState } from '@twt/contracts';
import { MODULE_ELIGIBILITY_MEMBER_STATES } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { newIdempotencyKey, useAuthorModule, useModuleDetail, useModulePartners, useModuleScopeOptions } from '../../api/hooks.js';
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
  issueToStep,
  moduleErrorGuidance,
  reachesNoMemberYet,
  scopeFilterOf,
  statusLabel,
  SUMMARY_STEP,
  toAuthorRequest,
  toIsoOrNull,
  validateStep,
  WIZARD_STEPS,
  type WizardState,
} from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { PartnerPicker } from './PartnerPicker.js';
import { ScopePicker } from './ScopePicker.js';

export interface ModuleWizardProps {
  pariwarId: string;
  /** "Start a corrected copy" — pre-fill from this module. */
  fromModuleId?: string | null;
  onCreated: (moduleId: string) => void;
}

const input = 'rounded border px-2 py-1 text-sm';

export function ModuleWizard({ pariwarId, fromModuleId = null, onCreated }: ModuleWizardProps): ReactElement {
  const [state, setState] = useState<WizardState>(emptyWizardState);
  const [step, setStep] = useState(0);
  const [issue, setIssue] = useState<string | null>(null);
  // ONE key for the whole wizard session (QE13) — reused by every retry of Create.
  const idempotencyKey = useRef<string>(newIdempotencyKey());
  const prefilled = useRef(false);

  const from = useModuleDetail(pariwarId, fromModuleId);
  const scopeOptions = useModuleScopeOptions(pariwarId);
  const partners = useModulePartners(pariwarId);
  const author = useAuthorModule(pariwarId);

  useEffect(() => {
    if (prefilled.current || from.data === undefined) return;
    prefilled.current = true;
    setState(fromModule(from.data));
  }, [from.data]);

  const set = (patch: Partial<WizardState>): void => {
    setIssue(null);
    setState((s) => ({ ...s, ...patch }));
  };

  const reason = step < SUMMARY_STEP ? validateStep(step, state) : null;
  const complete = firstInvalidStep(state) === null;

  const onCreate = async (): Promise<void> => {
    setIssue(null);
    try {
      const created = await author.mutateAsync({ body: toAuthorRequest(state), idempotencyKey: idempotencyKey.current });
      onCreated(created.module_id);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setIssue(t('module.error.generic'));
        return;
      }
      const issues = (err.details as { issues?: { path: (string | number)[]; message: string }[] } | undefined)?.issues;
      if (err.status === 422 && issues !== undefined && issues.length > 0) {
        const first = issues[0]!;
        setStep(issueToStep(first.path));
        setIssue(t('module.wizard.issue', { message: first.message }));
        return;
      }
      const back = codeToStep(err.code);
      if (back !== null) setStep(back);
      setIssue(moduleErrorGuidance(err.code));
    }
  };

  const partnerName = partners.data?.items.find((p) => p.partner_id === state.partnerId);

  return (
    <section className="flex max-w-3xl flex-col gap-4 p-4" data-testid="module-wizard">
      <h1 className="text-xl font-semibold">{fromModuleId === null ? t('module.wizard.title') : t('module.wizard.correctedTitle')}</h1>
      <p className="text-sm" data-testid="wizard-opening">
        {t('module.wizard.opening')}
      </p>
      {fromModuleId !== null && from.isLoading ? <p role="status">{t('module.wizard.loadingFrom')}</p> : null}
      {fromModuleId !== null && from.isError ? <p role="alert">{t('module.wizard.loadFromError')}</p> : null}

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

      <fieldset disabled={author.isPending} className="flex flex-col gap-3" data-testid={`wizard-step-${WIZARD_STEPS[step]}`}>
        {WIZARD_STEPS[step] === 'a' ? (
          <>
            <PartnerPicker pariwarId={pariwarId} value={state.partnerId} onChange={(partnerId) => set({ partnerId })} />
            <label className="flex flex-col text-sm">
              {t('module.field.nameEn')}
              <input className={input} value={state.nameEn} onChange={(e) => set({ nameEn: e.target.value })} data-testid="field-name-en" />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.nameHi')}
              <input lang="hi" className={input} value={state.nameHi} onChange={(e) => set({ nameHi: e.target.value })} data-testid="field-name-hi" />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.descriptionEn')}
              <textarea className={input} rows={4} value={state.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} data-testid="field-description-en" />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.descriptionHi')}
              <textarea lang="hi" className={input} rows={4} value={state.descriptionHi} onChange={(e) => set({ descriptionHi: e.target.value })} data-testid="field-description-hi" />
            </label>
          </>
        ) : null}

        {WIZARD_STEPS[step] === 'b' ? (
          <div className="flex flex-col gap-2">
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
                <p className="text-xs" role="note" data-testid="eligibility-no-member-yet">
                  {t('module.eligibility.noMemberYet')}
                </p>
                <ul className="flex flex-col gap-1">
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
            {state.eligibilityMode !== null ? (
              <ul className="text-xs" data-testid="eligibility-sentence">
                {describeEligibility(eligibilityFilterOf(state)).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {WIZARD_STEPS[step] === 'c' ? (
          scopeOptions.data !== undefined ? (
            <ScopePicker
              options={scopeOptions.data}
              kind={state.scopeKind}
              values={state.scopeValues}
              onChange={({ kind, values }) => set({ scopeKind: kind, scopeValues: values })}
            />
          ) : scopeOptions.isError ? (
            <p role="alert">{t('module.scope.loadError')}</p>
          ) : (
            <p role="status">…</p>
          )
        ) : null}

        {WIZARD_STEPS[step] === 'd' ? (
          <div className="flex flex-col gap-2">
            {(['validFrom', 'validUntil'] as const).map((field) => {
              const iso = toIsoOrNull(state[field]);
              const shown = iso === null ? null : describeInstant(iso);
              return (
                <div key={field} className="flex flex-col gap-1">
                  <label className="flex flex-col text-sm">
                    {t(field === 'validFrom' ? 'module.field.validFrom' : 'module.field.validUntil')}
                    <input type="datetime-local" className={input} value={state[field]} onChange={(e) => set({ [field]: e.target.value })} data-testid={`field-${field}`} />
                  </label>
                  {shown !== null ? (
                    <p className="text-xs" data-testid={`field-${field}-ist`}>
                      {shown.ist} · {shown.browser}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {WIZARD_STEPS[step] === 'e' ? (
          <div className="flex flex-col gap-2">
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
                <input inputMode="numeric" className={input} value={state.places} onChange={(e) => set({ places: e.target.value })} data-testid="field-places" />
              </label>
            ) : null}
          </div>
        ) : null}

        {WIZARD_STEPS[step] === 'f' ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col text-sm">
              {t('module.field.leadUrl')}
              <input className={input} value={state.leadHandoffUrl} onChange={(e) => set({ leadHandoffUrl: e.target.value })} data-testid="field-lead-url" />
            </label>
            <label className="flex flex-col text-sm">
              {t('module.field.secretName')}
              <input className={input} value={state.secretName} onChange={(e) => set({ secretName: e.target.value })} data-testid="field-secret-name" />
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
              {partnerName !== undefined ? <p className="text-xs">{t('module.summary.partner', { name: partnerName.display_name_en })}</p> : null}
              <p className="font-semibold" data-testid="preview-name-en">{state.nameEn}</p>
              <p className="whitespace-pre-line text-sm">{state.descriptionEn}</p>
            </div>
            <div className="flex flex-col gap-1 rounded border p-3" lang="hi" data-testid="preview-hi">
              <p className="text-xs font-medium" lang="en">{t('module.summary.previewHi')}</p>
              {partnerName !== undefined ? <p className="text-xs">{partnerName.display_name_hi}</p> : null}
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
          </div>
        ) : null}
      </fieldset>

      {reason !== null ? (
        <p className="text-sm" role="status" data-testid="wizard-reason">
          {reason}
        </p>
      ) : null}
      {issue !== null ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="wizard-issue">
          {issue}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="rounded border px-3 py-1 text-sm disabled:opacity-50" disabled={step === 0 || author.isPending} onClick={() => setStep((n) => n - 1)} data-testid="wizard-back">
          {t('module.wizard.back')}
        </button>
        {step < SUMMARY_STEP ? (
          <button type="button" className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={reason !== null} onClick={() => setStep((n) => n + 1)} data-testid="wizard-next">
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
