// Member-auth API client instance (Story 3.2, Task 10).
//
// Wires the `@twt/api-client` member-auth SDK to the app's API origin + the
// secure-store access-token getter (so authenticated calls — step-up, logout —
// auto-attach the bearer token). The base URL comes from the public Expo env var
// EXPO_PUBLIC_API_URL (set per build profile in eas.json); defaults to localhost for
// local dev.

import { createMemberAuthClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const memberAuth = createMemberAuthClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
