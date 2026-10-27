// `2026-10-27-409` — the name the claim-filing screens address the person filing with: the SESSION member's registered name
// (GET …/member/claims/member-name, in the Pariwar's member-facing form), else the existing `member_fallback`
// (*"your family member"* / *"आपके परिजन"*) — until the read answers, when it answers `null`, or when it fails.
// ⭐ `gcTime: 0` — the Provider's "⛔ persist this" marker (`PEER_REQUEST_DEHYDRATE_OPTIONS`): the name is ⛔ written to the
// phone's storage. The claim screens are one stack, so the entry screen's observer keeps the answer for the screens above it.

import { useQuery } from '@tanstack/react-query'

import { claimApi } from './claim-api'
import { useClaimT } from './claim-i18n'
import { useSession } from './session-context'

/** The query's cache options, exported for the "⛔ persisted" pin. */
export const CLAIM_MEMBER_NAME_QUERY_OPTIONS = { gcTime: 0, staleTime: 5 * 60 * 1000, retry: false } as const

export function useClaimMemberName(): string {
  const t = useClaimT()
  const { session } = useSession()
  const memberId = session?.memberId ?? null
  const query = useQuery({
    ...CLAIM_MEMBER_NAME_QUERY_OPTIONS,
    queryKey: ['claims', 'member-name', memberId],
    queryFn: () => claimApi.getMemberName(),
    enabled: memberId !== null,
  })
  return query.data?.name ?? t('member_fallback')
}
