// Ravi-mode claim i18n helper (Story 6.2, Task 8).
//
// The claim copy lives in the dedicated `claim` i18n namespace (packages/i18n/locales/{en,hi}/
// claim.json). `useT()` resolves against `common` by default, so this thin hook binds the active
// locale + the `claim` namespace so every claim screen calls `t('otp.title', params)` without
// repeating `{ namespace: 'claim' }`. All member-facing copy is bilingual (en/hi parity gate).

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export function useClaimT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'claim' })
}
