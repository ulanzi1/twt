// Helpdesk i18n helper (Story 10.2, Task 5/6).
//
// The helpdesk copy lives in the dedicated `helpdesk` i18n namespace (packages/i18n/locales/{en,hi}/
// helpdesk.json). `useT()` resolves against `common` by default, so this thin hook binds the active
// locale + the `helpdesk` namespace so every helpdesk screen calls `t('inbox.title', params)` without
// repeating `{ namespace: 'helpdesk' }`. All member-facing copy is bilingual (en/hi parity gate).
// The `useClaimT` precedent.

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export function useHelpdeskT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'helpdesk' })
}
