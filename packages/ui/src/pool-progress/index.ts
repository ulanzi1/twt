// @twt/ui `<PoolProgressCard>` shared logic — Story 9.12 (the Story 9.6 `status-pill` sibling).
//
// The framework-agnostic confirmed-only pool-progress presenter (pure view-model builder) every surface's
// progress meter shares: apps/mobile (the `<ActiveContributionCard>` region) today, the Epic-11b public
// Sahyog Vivran / Sahyog Drive web render later. NO react/react-native here — only the pure
// `(input) → view-model` function + its types + the i18n KEY catalogue + the token-role constant. The single
// source of the confirmed-only meter math + the `confirmedCount × fixedAmount` amount-raised derivation, so
// no two surfaces can drift (Decision 3). Confirmed-only is enforced STRUCTURALLY at the input boundary
// (Decision 2) — no yellow/pending/projected operand can enter.

export { derivePoolProgressCardViewModel } from './presenter.js';
export { COLOR_TOKEN_STATUS_CONFIRMED } from './constants.js';
export {
  POOL_PROGRESS_LABEL_KEY,
  POOL_PROGRESS_A11Y_KEY,
  POOL_PROGRESS_DAYS_KEY,
  POOL_PROGRESS_AMOUNT_RAISED_LABEL_KEY,
} from './i18n-keys.js';
export type {
  PoolProgressCardInput,
  PoolProgressCardViewModel,
  PoolProgressCardPoolIdentity,
} from './view-model.js';
