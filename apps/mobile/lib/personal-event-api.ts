// Member-app personal-event assertion client instance (Story 10.26).
//
// Wires the `@twt/api-client` personal-event SDK to the app's API origin + the secure-store
// access-token getter (so every call auto-attaches the member bearer). Mirrors lib/helpdesk-api.ts.
// The route is Pariwar-scoped in the path, so callers pass the pariwarId read from the session
// context (`lib/session-context`).

import { createPersonalEventClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const personalEventApi = createPersonalEventClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
