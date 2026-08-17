// Member-app survey/poll client instance (Story 10.15, Task 9).
//
// Wires the `@twt/api-client` member-survey SDK to the app's API origin + the secure-store
// access-token getter (so every call auto-attaches the member bearer). Mirrors lib/banner-api.ts.
// The base URL comes from EXPO_PUBLIC_API_URL (per build profile in eas.json), defaulting to
// localhost for local dev. The survey routes are Pariwar-scoped in the path, so callers pass the
// pariwarId read from the session context (`lib/session-context`).
//
// ⚠ `submitResponse` requires a Turnstile token AND an `Idempotency-Key`, both HEADERS. Reusing the
// SAME idempotency key REPLAYS the original 201 rather than 409-ing, so a retry over a flaky network
// is safe; a member's SECOND genuine submission correctly conflicts (one response per member, final).

import { createMemberSurveyClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const pollApi = createMemberSurveyClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
