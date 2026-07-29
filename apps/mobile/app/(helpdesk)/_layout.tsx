// The (helpdesk) route GROUP — the member help & support surface (Story 10.2, Task 7).
//
// A plain Stack (headers hidden, like the sibling member groups); the screens render their own
// dignified chrome. `index` is the inbox, `new` the filing form, `[ticketId]` the detail (the
// pre-wired `helpdesk_reply` deep-link destination). Bilingual via the `helpdesk` i18n namespace.

import { Stack } from 'expo-router'

export default function HelpdeskLayout(): React.ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />
}
