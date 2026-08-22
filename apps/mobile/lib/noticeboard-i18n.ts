// Panchayat Noticeboard i18n helper (Story 11a.5, Task 3).
//
// The noticeboard chrome lives in the dedicated `noticeboard` i18n namespace
// (packages/i18n/locales/{en,hi}/noticeboard.json). `useT()` resolves against `common` by default AND
// THROWS on a missing key ([[project_missed_cycle_visibility_substrate]]), so this thin hook binds the
// active locale + the `noticeboard` namespace — a screen calling `t('pinned_header')` without it would
// look up `common.pinned_header` and throw at RUNTIME, on a live tab, not at build. The
// `usePollT` / `useHelpdeskT` / `useClaimT` precedent.
//
// ⚠ The namespace is also registered in BOTH literals of `packages/i18n/src/catalog.ts` — the `catalogs`
// map AND `KNOWN_NAMESPACES`. Registration and parity are two DIFFERENT gates: the parity gate walks the
// `locales/` directory and would stay green on an unregistered namespace while every `t()` call threw.
// That exact defect shipped once (Story 11a.2's `/members`); `catalog-registration.test.ts` is the gate.
//
// ⛔ Only the CHROME goes through here. A notice's own title and body are OPERATOR-AUTHORED content
// carried as DATA on the row descriptor and rendered as-is — no key is minted for notice text.

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export function useNoticeboardT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'noticeboard' })
}
