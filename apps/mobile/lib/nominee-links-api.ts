// Member-app nominee-links client instance (Story 6.36e, Task 5; AC2). Mirrors `lib/known-people-api.ts`: the `@twt/api-client`
// SDK bound to the app's API origin and the secure-store access-token getter. ⛔ Never called before the session has loaded
// (the hooks are disabled until it has).

import { createMemberNomineeLinksClient } from '@twt/api-client'

import { knownPeopleApi } from './known-people-api'
import { getAccessToken } from './session'

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const nomineeLinksApi = createMemberNomineeLinksClient({
  baseUrl,
  getAccessToken: () => getAccessToken(),
})

/**
 * The contact-match call for a NOMINEE mark — 6.36b's endpoint and counters, ⭐ with `purpose: 'nominee_link'`: the ONE thing
 * that makes the audit line (`contact_match_nominee`) name the second purpose `-396` Q2 A ruled (NE3 / V12). The find screen
 * calls THIS, ⛔ `knownPeopleApi.contactMatches` — `tests/unit/nominee-link-match-purpose.test.ts` pins it.
 */
export const NOMINEE_LINK_MATCH_PURPOSE = 'nominee_link' as const

export function matchContactsForNominee(numbers: string[]) {
  return knownPeopleApi.contactMatches(numbers, NOMINEE_LINK_MATCH_PURPOSE)
}
