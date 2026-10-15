// Member-app people-who-know-me client instance (Story 6.36b, Task 4). Mirrors lib/peer-request-api.ts: the
// `@twt/api-client` SDK bound to the app's API origin and the secure-store access-token getter. ⛔ Never called before
// the session has loaded (the hooks are disabled until it has).

import { createMemberKnownPeopleClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const knownPeopleApi = createMemberKnownPeopleClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
