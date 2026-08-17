// Poll i18n helper (Story 10.15, Task 9).
//
// The poll chrome lives in the dedicated `polls` i18n namespace (packages/i18n/locales/{en,hi}/
// polls.json). `useT()` resolves against `common` by default AND THROWS on a missing key
// ([[project_missed_cycle_visibility_substrate]]), so this thin hook binds the active locale + the
// `polls` namespace — a screen calling `t('title')` without it would look up `common.title` and
// throw at runtime, not at build. The `useHelpdeskT` / `useClaimT` precedent.
//
// ⚠ Only the CHROME goes through here. The survey's own title, body, questions and option labels are
// AUTHORED bilingual content on the row, selected Hindi-first by `components/polls/copy.ts`.

import { useT } from '@twt/i18n/react'
import type { TranslateParams } from '@twt/i18n'

export function usePollT(): (key: string, params?: TranslateParams) => string {
  const t = useT()
  return (key, params) => t(key, params, { namespace: 'polls' })
}
