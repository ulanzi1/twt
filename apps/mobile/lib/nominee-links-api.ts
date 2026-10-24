// Member-app nominee-links client instance (Story 6.36e, Task 5; AC2). Mirrors `lib/known-people-api.ts`: the `@twt/api-client`
// SDK bound to the app's API origin and the secure-store access-token getter. ⛔ Never called before the session has loaded
// (the hooks are disabled until it has).

import { createMemberNomineeLinksClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const nomineeLinksApi = createMemberNomineeLinksClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
