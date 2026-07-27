// The `<StatusPill>` i18n KEY catalogue — Story 9.6 (Task 1; D4-A). The presenter emits KEYS (never
// resolved copy). Each key has a bilingual (en + Hindi) entry in `@twt/i18n` under the ALREADY-registered
// `common` namespace as `statusPill.*` — mirroring the `memberStatus.*` cross-cutting-component precedent
// (D2: no new `status-pill` namespace, which would ripple catalog.ts + classification.ts). Kept in sync
// BY VALUE with `packages/i18n/locales/{en,hi}/common.json`; the copy was migrated VERBATIM from
// `yogdaan.status.*` (tone-reviewed in Story 9.5), not rewritten.

import type { ContributionStatus } from '@twt/contracts';

/** The visible label key for a state: `statusPill.<state>` (default `common` namespace). */
export function statusPillLabelKey(status: ContributionStatus): string {
  return `statusPill.${status}`;
}

/** The ARIA-label key for a state: `statusPill.<state>_a11y` (full-prose, a11y register). */
export function statusPillA11yLabelKey(status: ContributionStatus): string {
  return `statusPill.${status}_a11y`;
}
