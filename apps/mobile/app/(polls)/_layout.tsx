// The (polls) route GROUP — the member survey/poll surface (Story 10.15, Task 9).
//
// A plain Stack (headers hidden, like the sibling member groups); the screens render their own
// chrome. `index` is the list of open polls, `[surveyId]` the answer screen. Bilingual via the
// `polls` i18n namespace.
//
// ⚠ DECLARED SUBSTITUTION (Escalation 3): `architecture.md:4234` names
// `apps/mobile/app/p/[pariwarId]/polls/`. This repo's member app uses ROUTE GROUPS — `(helpdesk)`,
// `(claim)`, `(nominee)` — and never a `p/[pariwarId]/` path segment: the pariwarId comes from
// `lib/session-context`, not the URL. Shipping `(polls)` follows the app; the substitution is
// DECLARED here rather than smuggled ([[project_mmkv_asyncstorage_equivalent]] discipline).
// `apps/admin/src/modules/surveys/` and `apps/api/src/modules/surveys/` follow architecture exactly.

import { Stack } from 'expo-router'

export default function PollsLayout(): React.ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />
}
