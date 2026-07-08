// Member-app claim-filing client instance (Story 6.2, Ravi-mode).
//
// Wires the `@twt/api-client` member-claim SDK to the app's API origin + the secure-store
// access-token getter (so the handover-OTP + intake calls auto-attach the member bearer).
// Mirrors lib/member-api.ts — the base URL comes from EXPO_PUBLIC_API_URL (per build profile
// in eas.json), defaulting to localhost for local dev.

import { createMemberClaimClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const claimApi = createMemberClaimClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
