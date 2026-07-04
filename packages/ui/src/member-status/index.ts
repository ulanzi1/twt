// @twt/ui `<MemberStatusPanel>` shared logic — Story 4.7 (D4-A).
//
// The framework-agnostic presenter (pure view-model builder) both variants render: apps/admin (Radix/
// Tailwind web) + apps/mobile (Tamagui RN). NO react/react-native here — only the pure `(payload, opts)
// → view-model` function + its types + the i18n KEY catalogue.

export { buildMemberStatusViewModel, deriveHeadlineState, type PresenterOptions } from './presenter.js';
export type {
  HeadlineState,
  MemberStatusViewModel,
  PanelSection,
  RuleExplanation,
  SectionId,
  SectionStatus,
  ValidityWindow,
} from './view-model.js';
export {
  HEADLINE_KEYS,
  SECTION_TITLE_KEYS,
  DETAIL_KEYS,
  ruleExplanationKey,
  CONCEALMENT_REVIEW_FLAG,
} from './i18n-keys.js';
