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

import type { HelpdeskCategoryListItem, HelpdeskGrantScope, MemberSearchResultItem } from '@twt/contracts';
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
  const subCategories = activeCategory?.sub_categories ?? [];

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
                        {s}
                      </option>
                    ))}
                  </select>
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
