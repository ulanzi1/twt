// @twt/ui contribution-during-suspension disclosure — Story 10.16 (the Story 9.6 `status-pill` /
// Story 9.12 `pool-progress` sibling).
//
// The framework-agnostic disclosure presenter (pure view-model builder) a payment surface uses to tell a
// member who is contributing WITHOUT coverage what their payment does and does not buy. NO
// react/react-native here — only the pure `(payload) → view-model | null` derivation, its types, and the
// i18n KEY catalogue. The mobile `/pay` screen is the first consumer; a later web/public contribution
// surface can share it without either drifting on what the member is told.
//
// `[GATE]` — Story 10.17 (the moderation roster unblock) MUST NOT deploy without this
// (`epics.md:3681`). 10.17 is what makes a suspended member reachable on `/pay` at all; shipping it
// without this disclosure creates the exact harm the disclosure exists to prevent, for a bereaved family.

export {
  deriveContributionDisclosure,
  isUnderContributionPermittingSuspension,
  isUnderRestorationDisciplineLockIn,
} from './presenter.js';
export {
  CONTRIBUTION_DISCLOSURE_NAMESPACE,
  DISCLOSURE_GET_HELP_KEY,
  DISCLOSURE_REASON_LINE_KEY,
  RESTORATION_LOCK_IN_DISCLOSURE_KEYS,
  RESTORATION_PACKAGE_REMAINING_KEY,
  RESTORATION_PACKAGE_UNAVAILABLE_KEY,
  SUSPENSION_DISCLOSURE_KEYS,
} from './i18n-keys.js';
export type {
  ContributionDisclosureInstrument,
  ContributionDisclosureViewModel,
  RestorationPackageState,
} from './view-model.js';
