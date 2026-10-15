// People-who-know-me i18n helper (Story 6.36b, Task 5). The copy lives in the `known_people` namespace
// (packages/i18n/locales/{en,hi}/known_people.json — ⛔ 6.36a's `workplace` files, `2026-10-14-332` call 5). Mirrors
// `useClaimT`. ⚠ `useT()` returns a FRESH closure every render — memoise on `locale`, ⛔ on `t`
// ([[project_uset_fresh_closure_memo_trap]]).

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export const KNOWN_PEOPLE_NAMESPACE = 'known_people'

export function useKnownPeopleT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: KNOWN_PEOPLE_NAMESPACE })
}
