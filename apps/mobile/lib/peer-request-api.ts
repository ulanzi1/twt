// Member-app peer-request client instance (Story 6.27a PM11, Task 5).
//
// Wires the `@twt/api-client` peer-request SDK to the app's API origin + the secure-store access-token getter (every call
// auto-attaches the member bearer). Mirrors lib/poll-api.ts. The routes are Pariwar-scoped in the path, so callers pass
// the pariwarId read from the session context — and ⛔ never call before the session has loaded (the hooks are disabled
// until it has). ⛔ No Turnstile on these routes (F34).

import { createMemberPeerRequestClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const peerRequestApi = createMemberPeerRequestClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
