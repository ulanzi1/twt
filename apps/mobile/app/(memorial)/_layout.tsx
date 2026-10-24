// Story 11b.4 (AC2) — the family memorial route group. ⛔ Header: each screen owns its sticky header (*"Save and come
// back"*), as `(nominee)` and `(helpdesk)` do.

import { Stack } from 'expo-router'

export default function MemorialLayout(): React.ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />
}
