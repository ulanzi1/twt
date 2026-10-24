// Story 11b.4 — the family memorial's member client (the `lib/claim-api.ts` shape: a `@twt/api-client` factory).

import { createMemberMemorialClient } from '@twt/api-client'

import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const memorialApi = createMemberMemorialClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})
