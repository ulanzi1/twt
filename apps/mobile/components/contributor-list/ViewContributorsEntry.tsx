// <ViewContributorsEntry> — the ≥44pt "View contributors" affordance the My Pool card links to (Story 8.3,
// Task 4 / D8). Placed just BELOW <ActiveContributionCard> in the home stack — NOT rendered inside the card
// (8.2 owns the card body + its aggregate meter; this story adds only the navigation seam to the named-rows
// view). Self-suppresses to null unless the member has a live assigned pool.
//
// ── Precondition parity fix (Review) ────────────────────────────────────────────────────────────────────
// Gates on `usePoolContributorsQuery` — the SAME query the destination screen resolves — rather than the
// 8.2 card's `useActiveContributionQuery`. The card's query additionally requires the DECEASED member's KYC
// name to resolve (`resolveCard`'s `UNASSIGNED` on an empty/unresolvable name), which is unrelated to this
// list's own precondition (`resolveMemberLivePool` only). Reusing the card's query meant the CTA could
// vanish in a corrupt-deceased-KYC edge case even though the contributor list itself would render fine.
// Costs one extra fetch on the home screen (the list endpoint) in exchange for exact agreement with the
// screen it links to.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { usePoolContributorsQuery } from './usePoolContributorsQuery'

const NS = { namespace: 'contribution' } as const

export function ViewContributorsEntry() {
  const t = useT()
  const router = useRouter()
  const { data } = usePoolContributorsQuery()

  // Self-suppress unless the member is active + assigned to a live pool — the SAME precondition the
  // contributor-list screen itself resolves (no drift between the CTA and its destination).
  if (!data || !data.assigned) {
    return null
  }

  return (
    <Button
      height={44}
      chromeless
      justify="flex-start"
      accessibilityRole="button"
      accessibilityLabel={t('contributor_list.view_cta_a11y', undefined, NS)}
      accessibilityHint={t('contributor_list.view_cta_hint', undefined, NS)}
      onPress={() => router.push('/(contribution)/contributors')}
    >
      {t('contributor_list.view_cta', undefined, NS)}
    </Button>
  )
}
