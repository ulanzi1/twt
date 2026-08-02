// Member-app banner client instance (Story 10.9).
//
// Wires the `@twt/api-client` member-banner SDK to the app's API origin + the secure-store
// access-token getter (so every call auto-attaches the member bearer). Mirrors lib/helpdesk-api.ts.
// The base URL comes from EXPO_PUBLIC_API_URL (per build profile in eas.json), defaulting to
// localhost for local dev. The banner routes are Pariwar-scoped in the path, so callers pass the
// pariwarId read from the session context (`lib/session-context`).

import { createMemberBannerClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const bannerApi = createMemberBannerClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
