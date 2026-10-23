// Story 11b.4 — the `memorial` namespace hook (the `lib/workplace-i18n.ts` shape).
// ⚠ The returned closure is FRESH each render (`useT()`): ⛔ never put it in an effect's deps — depend on the locale.

import type { TranslateParams } from '@twt/i18n'
import { useT } from '@twt/i18n/react'

export function useMemorialT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'memorial' })
}
