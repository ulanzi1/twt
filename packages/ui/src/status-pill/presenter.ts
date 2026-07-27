// The `<StatusPill>` presenter — Story 9.6 (Task 1; D4-A, AC1/AC2).
//
// STRICTLY PURE (the `member-status` precedent): `(status) → view-model` and NOTHING else. NO
// react/react-native import, NO API call, NO DB read, NO side-effecting i18n lookup (it emits KEYS; the
// render layer resolves them), NO palette (it emits a `@twt/tokens` role NAME; the render layer resolves
// the colour). Same input → same output. Because there is nothing to mock, it is asserted with pure unit
// tests (tests/status-pill/presenter.test.ts — the load-bearing un-extendable-taxonomy + a11y gate).
//
// The taxonomy is FROZEN: `status` is the already-derived answer from `deriveContributionStatus`
// (packages/domain) — the presenter NEVER re-derives, re-orders, or adds a 6th state; it only maps a
// frozen state to how it looks (STATUS_PILL_SPEC).

import type { ContributionStatus } from '@twt/contracts';

import { STATUS_PILL_SPEC } from './spec.js';
import type { StatusPillViewModel } from './view-model.js';

/**
 * Derive the `<StatusPill>` view-model for a canonical contribution status. Pure + synchronous +
 * dependency-free — same `status` in → same view-model out.
 */
export function deriveStatusPillViewModel(status: ContributionStatus): StatusPillViewModel {
  return { status, ...STATUS_PILL_SPEC[status] };
}
