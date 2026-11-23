// apps/mobile re-exports the shared @twt/eslint-config-twt baseline with
// mobile-specific ignores + a relaxation block for prototype patterns.
//
// Per Story 1.1 review patch "apps/mobile: add missing lint script (Turbo
// was silently skipping mobile lint)" — the review added the lint script
// but did not author this config or wire the dep; Story 1.2 dev-story
// closes that gap.
//
// The relaxation block disables four rules that the Story 0.14 ported
// prototype code currently violates. Substantive lint-posture tightening
// (any-removal, RN-static-asset require imports → static `import`, Tamagui
// type-extension hygiene) is deferred to Story 1.17 design-system
// formalization where the mobile production codebase is hardened end-to-end.

import twtConfig from '@twt/eslint-config-twt';

export default [
  {
    ignores: [
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      'web-build/**',
      'node_modules/**',
    ],
  },
  ...twtConfig,
  {
    // Prototype-port relaxation. See header comment for rationale + the
    // Story 1.17 hardening trigger.
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      // Tamagui icon prop types + RN navigation prop pipes use `any` in the
      // ported prototype. Replace with proper types in Story 1.17.
      '@typescript-eslint/no-explicit-any': 'off',
      // RN static-asset loading + metro.config.js use require(); the static
      // `import` migration lands in Story 1.17.
      '@typescript-eslint/no-require-imports': 'off',
      // Tamagui declaration-merging pattern (`interface TamaguiCustomConfig
      // extends typeof config`) triggers no-empty-object-type. Tamagui v5
      // typings — keep as-is.
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // Story 3.15b (DL5) — every direct screen-reader announcement goes through `lib/announce.ts`, so a repeat of the same
    // text is SENT as different text on Android and TalkBack speaks it again (deferred-work V4: TalkBack does not speak an
    // announcement identical to one it was already sent). The entries name the PROPERTY only, not the receiver (code review):
    // a rule on `AccessibilityInfo.<method>` misses an aliased import, a namespace import (`RN.AccessibilityInfo.…`), a
    // variable alias (`const AI = AccessibilityInfo`) and `require('react-native').AccessibilityInfo.…`, while a property-only
    // rule reports every receiver. It also reports the destructured form (`const { announceForAccessibility } = …`) and the
    // computed string-literal one (`AccessibilityInfo['…']`). Verified at review: over app / components / lib / tests the
    // only reports are the two calls in the carve-out file below. Blind spot left: a computed key built at run time.
    // ⛔ Widen this with `no-restricted-imports` / `@typescript-eslint/no-restricted-imports` here: the shared config sets
    // both, and a later flat-config entry for the same rule REPLACES its options (the cross-package import bans would go).
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          property: 'announceForAccessibility',
          message: 'Use announce() from lib/announce.ts — a repeat must be sent as different text on Android (Story 3.15b, V4).',
        },
        {
          property: 'announceForAccessibilityWithOptions',
          message: 'Use announce(text, options) from lib/announce.ts — a repeat must be sent as different text on Android (Story 3.15b, V4).',
        },
      ],
    },
  },
  {
    // The ONE file that may call the two methods (cwd-relative glob — [[project_eslint_config_per_package_cwd]]).
    files: ['lib/announce.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
];
