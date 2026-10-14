// Workplace i18n helper (Story 6.36a, Task 6). The picker and the Workplace screen live in the `workplace` namespace
// (`packages/i18n/locales/{en,hi}/workplace.json`). `useT()` resolves against `common` by default AND THROWS on a missing
// key, so this thin hook binds the `workplace` namespace (the `usePollT` / `useHelpdeskT` precedent).
// ⚠ `useT()` returns a FRESH closure every render — depend on `locale`, ⛔ on the returned `t`, in a memo
// ([[project_uset_fresh_closure_memo_trap]]).

import type { TranslateParams } from '@twt/i18n'
import { useT } from '@twt/i18n/react'

export function useWorkplaceT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'workplace' })
}
