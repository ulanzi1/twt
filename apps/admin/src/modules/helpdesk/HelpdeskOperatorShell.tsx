// `<HelpdeskOperatorShell>` — the two-pane helpdesk operator console (Story 10.3, Task 5; AC1/AC5).
//
// Pure presentational (all state via props → unit-testable without hooks/router/query). Mirrors the
// 6.3 `<HelplineConsoleShell>` layout: a sticky call-status header; a LEFT pane for member lookup (the
// page injects the shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>` via `lookupSlot` —
// search is NOT re-implemented); a RIGHT pane for the registry-driven category picker + verbal-issue
// body capture + submit + the "filed" confirmation (routing target + SLA).
//
// THE FILING GATE lives here, in ONE place: submit is enabled only once a member is selected, a category
// is chosen, and an issue body is captured. Categories are REGISTRY-DRIVEN (props, from the in-force
// policy) — the shell never hardcodes the v1 category set (AC5). Operator-facing wording may be precise
// (raw category keys, SLA labels) per UX-DR54/DR55; the dignified member-facing header renders in the
// mobile app, not here. NO step-up leg (helpdesk create is not freeze-firing / not in AR-24 — unlike 6.3).

import {
  DPDPA_DATA_RIGHTS_SUBCATEGORY,
  type HelpdeskCategoryListItem,
  type HelpdeskGrantScope,
  type MemberSearchResultItem,
} from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';

import { resolveEn } from './i18n-en.js';

/** The routed-ticket outcome the page hands the shell for the "filed" confirmation (mapped from the
 *  create response — kept narrow so the shell stays decoupled from the full ticket DTO). */
export interface HelpdeskFiledResult {
  ticketId: string;
  routedToRole: string;
  routedToScope: HelpdeskGrantScope;
  slaFirstResponseDue: string;
  slaResolutionDue: string;
}

export interface HelpdeskOperatorShellProps {
  /** The lookup pane — the page injects the shipped `<MemberLookupForm>` + `<MemberSearchResults>`. */
  lookupSlot: ReactNode;
  selected: MemberSearchResultItem | null;
  // Registry-driven category picker (AC5). `categories` = the in-force policy's category set.
  categories: readonly HelpdeskCategoryListItem[];
  categoriesLoading: boolean;
  categoriesError?: string;
  category: string | null;
  onCategoryChange: (c: string | null) => void;
  subCategory: string | null;
  onSubCategoryChange: (s: string | null) => void;
  /**
   * Story 10.29 (Decision `2026-08-15-120` cl.2) — element 1 of the ratified three-part gate: the
   * MEMBER asked for staff-mediated delivery of their data export, captured HERE at intake.
   * ⛔ PRESENTATIONAL COUPLING ONLY: the control renders only under the DPDPA subcategory, but the
   * SERVER accepts the boolean on any ticket. Enforcing "subcategory ⇒ field" in the contract would
   * put a routing token into a second enforcement site.
   * ⚠ On this (helpline) surface the value is OPERATOR-TRANSCRIBED — see `2026-08-15-120` cl.6.
   */
  memberRequestedStaffMediation: boolean;
  onMemberRequestedStaffMediationChange: (v: boolean) => void;
  // The caller's stated issue.
  body: string;
  onBodyChange: (v: string) => void;
  // Submit + result.
  onSubmit: () => void;
  submitPending: boolean;
  submitError?: string;
  result: HelpdeskFiledResult | null;
  onFileAnother: () => void;
}

export function HelpdeskOperatorShell(props: HelpdeskOperatorShellProps): ReactElement {
  const {
    lookupSlot,
    selected,
    categories,
    categoriesLoading,
    categoriesError,
    category,
    onCategoryChange,
    subCategory,
    onSubCategoryChange,
    memberRequestedStaffMediation,
    onMemberRequestedStaffMediationChange,
    body,
    onBodyChange,
    onSubmit,
    submitPending,
    submitError,
    result,
    onFileAnother,
  } = props;

  // Subcategories available for the chosen category (from the registry, never hardcoded).
  const activeCategory = categories.find((c) => c.category === category) ?? null;
  const registrySubCategories = activeCategory?.sub_categories ?? [];

  // ── Story 10.21 (AC2) — the DPDPA data-rights subcategory, offered under `other` ─────────────────
  // ⚠ It is NOT in the registry and must not be. `HelpdeskSubcategory` is a FREE token
  // (`z.string().min(1).max(64)`, no allow-list), and the whole design of 10.21's intake is that
  // NOTHING in `DEFAULT_ROUTING_POLICY` changes: minting a real category would be absent from every
  // per-Pariwar override authored before today and would SILENTLY mis-route under the wrong SLA.
  // So the token is offered by the CLIENT under the `other` catch-all, which is validator-guaranteed
  // to exist in every published policy.
  // ⛔ Imported, never re-declared — a typo here routes just as cleanly to the same desk and nothing
  // anywhere complains (the source-scan gate in @twt/contracts enforces the single declaration).
  const subCategories =
    category === 'other' && !registrySubCategories.includes(DPDPA_DATA_RIGHTS_SUBCATEGORY)
      ? [...registrySubCategories, DPDPA_DATA_RIGHTS_SUBCATEGORY]
      : registrySubCategories;

  // THE GATE: a member selected + a category chosen (still present in the in-force policy — a
  // category selected before a mid-session policy refetch narrows the set must not ride through) +
  // a non-empty issue body. A present result hides submit (already filed). Nothing about
  // `helpline_call` special-cases this — it is just the create primitive with server-forced
  // attribution.
  const canSubmit =
    Boolean(selected) &&
    activeCategory !== null &&
    (subCategory === null || subCategories.includes(subCategory)) &&
    body.trim() !== '' &&
    !submitPending &&
    result === null;

  const routedScope = result
    ? result.routedToScope.value
      ? `${result.routedToScope.dimension}:${result.routedToScope.value}`
      : result.routedToScope.dimension
    : '';

  return (
    <div className="flex flex-col gap-6" data-testid="helpdesk-operator-shell">
      {/* Sticky call-status header (the 6.3 console pattern). */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white/90 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold">{resolveEn('helpdesk.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm opacity-70">{resolveEn('helpdesk.subtitle')}</p>
        </div>
        <span className="whitespace-nowrap rounded bg-status-warn-bg px-2 py-1 text-xs text-status-warn-fg">
          {resolveEn('helpdesk.call.sticky')}
        </span>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — member lookup (the shipped Story 4.7 search, injected). */}
        <section aria-label={resolveEn('helpdesk.pane.lookup')} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {resolveEn('helpdesk.pane.lookup')}
          </h2>
          {lookupSlot}
          <p className="text-xs opacity-60">{resolveEn('helpdesk.nomatch.hint')}</p>
        </section>

        {/* RIGHT — issue capture + filing. */}
        <section aria-label={resolveEn('helpdesk.pane.intake')} className="flex flex-col gap-4 rounded border p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70">
            {resolveEn('helpdesk.pane.intake')}
          </h2>

          {!selected && <p className="text-sm opacity-70">{resolveEn('helpdesk.select.prompt')}</p>}

          {selected && result === null && (
            <>
              {/* Category (registry-driven — AC5). */}
              <div className="flex flex-col gap-1">
                <label htmlFor="helpdesk-category" className="text-sm font-medium">
                  {resolveEn('helpdesk.category.label')}
                </label>
                {categoriesLoading && <p className="text-xs opacity-60">{resolveEn('helpdesk.category.loading')}</p>}
                {categoriesError && (
                  <p role="alert" className="text-sm text-status-fail-fg">
                    {resolveEn('helpdesk.category.error')}
                  </p>
                )}
                <select
                  id="helpdesk-category"
                  className="rounded border px-2 py-1"
                  value={category ?? ''}
                  disabled={categoriesLoading || Boolean(categoriesError)}
                  onChange={(e) => {
                    onCategoryChange(e.target.value === '' ? null : e.target.value);
                    // Reset the subcategory whenever the category changes — a stale subcategory from a
                    // prior category must never ride along.
                    onSubCategoryChange(null);
                  }}
                  data-testid="helpdesk-category"
                >
                  <option value="" disabled>
                    {resolveEn('helpdesk.category.placeholder')}
                  </option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory (optional; only when the chosen category defines some). */}
              {/* Keyed off the OFFERED list (registry + the 10.21 DPDPA token), not the registry list
                  alone — otherwise the `other` category, whose registry list is empty, would hide the
                  picker and make the data-rights subcategory unreachable from the console. */}
              {category !== null && subCategories.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="helpdesk-subcategory" className="text-sm font-medium">
                    {resolveEn('helpdesk.subcategory.label')}
                  </label>
                  <select
                    id="helpdesk-subcategory"
                    className="rounded border px-2 py-1"
                    value={subCategory ?? ''}
                    onChange={(e) => onSubCategoryChange(e.target.value === '' ? null : e.target.value)}
                    data-testid="helpdesk-subcategory"
                  >
                    <option value="">{resolveEn('helpdesk.subcategory.placeholder')}</option>
                    {subCategories.map((s) => (
                      <option key={s} value={s}>
                        {s === DPDPA_DATA_RIGHTS_SUBCATEGORY ? resolveEn('helpdesk.subcategory.dpdpa') : s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Story 10.29 — ELEMENT 1, CAPTURED AT INTAKE (Decision `2026-08-15-120` cl.1/cl.2) ──
                  ⛔ Rendered ONLY under the DPDPA subcategory — a checkbox on every `payment-failed`
                  ticket would be noise, and noise invites ticking without context. ⛔ The coupling is
                  PRESENTATIONAL: the server accepts the field on any ticket.
                  ⚠ The copy states the transcription limit (`2026-08-15-120` cl.6) rather than implying
                  the operator has verified anything — this records what the CALLER asked for. */}
              {subCategory === DPDPA_DATA_RIGHTS_SUBCATEGORY && (
                <div className="flex flex-col gap-1 rounded border border-gray-300 bg-gray-50 p-2">
                  <label className="flex items-start gap-2 text-sm" htmlFor="helpdesk-staff-mediation">
                    <input
                      id="helpdesk-staff-mediation"
                      type="checkbox"
                      className="mt-1"
                      checked={memberRequestedStaffMediation}
                      onChange={(e) => onMemberRequestedStaffMediationChange(e.target.checked)}
                      data-testid="helpdesk-staff-mediation"
                    />
                    <span>{resolveEn('helpdesk.staffMediation.label')}</span>
                  </label>
                  <p className="text-xs text-gray-600">{resolveEn('helpdesk.staffMediation.help')}</p>
                </div>
              )}

              {/* Verbal-issue body. */}
              <div className="flex flex-col gap-1">
                <label htmlFor="helpdesk-body" className="text-sm font-medium">
                  {resolveEn('helpdesk.body.label')}
                </label>
                <textarea
                  id="helpdesk-body"
                  className="min-h-24 rounded border px-2 py-1"
                  value={body}
                  onChange={(e) => onBodyChange(e.target.value)}
                  placeholder={resolveEn('helpdesk.body.placeholder')}
                  data-testid="helpdesk-body"
                />
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                aria-busy={submitPending}
                onClick={onSubmit}
                data-testid="helpdesk-submit"
                className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {submitPending ? resolveEn('helpdesk.submit.pending') : resolveEn('helpdesk.submit')}
              </button>
              {!canSubmit && !submitPending && (
                <p className="text-xs opacity-60" data-testid="helpdesk-gate-hint">
                  {resolveEn('helpdesk.submit.gateHint')}
                </p>
              )}
              {submitError && (
                <p role="alert" className="text-sm text-status-fail-fg">
                  {submitError}
                </p>
              )}
            </>
          )}

          {/* Post-filing confirmation (routing target + SLA). */}
          {result !== null && (
            <div
              role="status"
              data-testid="helpdesk-filed-result"
              className="flex flex-col gap-2 rounded border border-status-ok-border bg-status-ok-bg p-3 text-sm"
            >
              <p>{resolveEn('helpdesk.result.filed')}</p>
              <p className="text-xs opacity-80">
                {resolveEn('helpdesk.result.ticketId')}: <code>{result.ticketId}</code>
              </p>
              <p className="text-xs opacity-80" data-testid="helpdesk-routed-to">
                {resolveEn('helpdesk.result.routedTo')}: {result.routedToRole} · {routedScope}
              </p>
              <p className="text-xs opacity-70">
                {resolveEn('helpdesk.result.sla')}: {new Date(result.slaFirstResponseDue).toLocaleString()}
              </p>
              <p className="text-xs opacity-70">
                {resolveEn('helpdesk.result.slaResolution')}: {new Date(result.slaResolutionDue).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={onFileAnother}
                data-testid="helpdesk-file-another"
                className="self-start rounded border px-3 py-1 text-sm"
              >
                {resolveEn('helpdesk.result.fileAnother')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
