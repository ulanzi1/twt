// @twt/ui `<StatusPill>` shared logic — Story 9.6 (D4-A).
//
// The framework-agnostic 5-state presenter (pure view-model builder) every surface's pill renders:
// apps/mobile (Tamagui RN) today, the PDF note-template (via the `@twt/tokens` role), a web variant
// seamed for Story 9.8. NO react/react-native here — only the pure `(status) → view-model` function +
// its types + the i18n KEY catalogue + the exhaustive spec (the compile-half of the un-extendable gate).

export { deriveStatusPillViewModel } from './presenter.js';
export { STATUS_PILL_SPEC } from './spec.js';
export { statusPillLabelKey, statusPillA11yLabelKey } from './i18n-keys.js';
export type {
  StatusPillSpec,
  StatusPillTone,
  StatusPillIconName,
  StatusPillViewModel,
} from './view-model.js';
