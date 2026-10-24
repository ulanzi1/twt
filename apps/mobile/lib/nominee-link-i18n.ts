// A nominee who is also a member — the i18n helper (Story 6.36e, Task 5). The copy lives in the `nominee_link` namespace
// (packages/i18n/locales/{en,hi}/nominee_link.json). Mirrors `useKnownPeopleT`. ⚠ This hook returns a FRESH closure every
// render (as `useT()` does) — ⛔ put it in a dependency array or a `useMemo`; depend on `locale` if you must
// ([[project_uset_fresh_closure_memo_trap]]).

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export const NOMINEE_LINK_NAMESPACE = 'nominee_link'

export function useNomineeLinkT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: NOMINEE_LINK_NAMESPACE })
}
