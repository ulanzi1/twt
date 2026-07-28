// The `<PoolProgressCard>` i18n KEY catalogue — Story 9.12 (Task 2; the Story 9.6 `status-pill` sibling).
// The presenter emits KEYS (never resolved copy); each has a bilingual (hi-primary + en parity) entry in
// `@twt/i18n` under the already-registered `contribution` namespace. Per Task 2, REUSE the existing
// `active_contribution.*` keys wherever they fit (the meter label / a11y / days label are identical strings
// to the 8.2 card) and introduce a `pool_progress.*` key ONLY for genuinely new copy (the amount-raised
// label the epic adds). Kept in sync BY VALUE with `packages/i18n/locales/{hi,en}/contribution.json`.

/**
 * The visible meter label key — `{confirmed} of {total} contributions confirmed`. Reused verbatim from the
 * Story 8.2 card (same confirmed-only meter copy); the render layer interpolates `{ confirmed, total }`.
 */
export const POOL_PROGRESS_LABEL_KEY = 'active_contribution.progress';

/** The meter ARIA-label key (full-prose, a11y register). Reused from the 8.2 card. */
export const POOL_PROGRESS_A11Y_KEY = 'active_contribution.progress_a11y';

/** The days-remaining label key — `{days} days left in this cycle`. Reused from the 8.2 card. */
export const POOL_PROGRESS_DAYS_KEY = 'active_contribution.days_a11y';

/**
 * The amount-raised label key — the ONE genuinely new string Story 9.12 adds (the epic's "amount raised
 * (confirmed amounts only)"). The amount itself is `formatInr(amountRaisedInr)` at the render boundary; this
 * key is the label only (like `active_contribution.amount_label` is the fixed-amount label only).
 */
export const POOL_PROGRESS_AMOUNT_RAISED_LABEL_KEY = 'pool_progress.amount_raised';
