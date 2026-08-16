// Member-app moderation-appeal client instance (Story 10.22 — Niyamavali §8.8).
//
// Wires the `@twt/api-client` member appeal SDK to the app's API origin + the secure-store
// access-token getter (so every call auto-attaches the member bearer). Mirrors
// `lib/personal-event-api.ts`. The route is Pariwar-scoped in the path, so callers pass the
// pariwarId read from the session context (`lib/session-context`).
//
// ⚠ IN-PORTAL ONLY. This client is unreachable to a member whose access termination has removed —
// which is exactly why §8.8 also has an OFF-PORTAL arm, taken by helpline and filed by an operator.
// ⛔ Do not add a "terminated member" branch here; there is no session to carry it.

import { createMemberModerationAppealClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const moderationAppealApi = createMemberModerationAppealClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
