// Live Contributor List route (Story 8.3, Task 4) — renders the member-facing <PoolContributorList> view.
// Reached from the My Pool card's "View contributors" affordance (<ViewContributorsEntry> → router.push).
// The view self-suppresses to a calm placeholder unless the member has a live assigned pool.

import { Stack } from 'expo-router'

import { PoolContributorList } from '../../components/contributor-list/PoolContributorList'

export default function ContributorsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PoolContributorList />
    </>
  )
}
