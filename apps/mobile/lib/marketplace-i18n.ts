// Marketplace i18n helper (Story 12.5b, Task 8; `2026-11-22-489` QE14).
//
// The partner-offer member copy lives in the dedicated `marketplace` i18n namespace (packages/i18n/locales/{en,hi}/
// marketplace.json, registered in packages/i18n/src/catalog.ts). `useT()` resolves against `common` by default, so this thin
// hook binds the active locale + the `marketplace` namespace (the `helpdesk-i18n.ts` shape). Today it holds ONE key,
// `partnerForm.notice` — the Panel's sentence (`-486` R5), shown before `openPartnerForm`. ⛔ Production caller until Story 12.3.

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export function useMarketplaceT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'marketplace' })
}
