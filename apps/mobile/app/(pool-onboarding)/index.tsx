// Pool-onboarding tutorial route (Story 7.10, Task 4) — renders the self-contained 3-screen tutorial.
// Reached two ways: the LIVE settings re-view entry (PoolOnboardingSettingsEntry → router.push) that
// this story wires, and — forward-compat only — Epic 8's My Pool card via usePoolOnboardingGate (that
// live auto-launch call site is NOT wired here; the My Pool card does not exist yet).

import { Stack } from 'expo-router'

import { PoolOnboardingTutorial } from '../../components/pool-onboarding/PoolOnboardingTutorial'

export default function PoolOnboardingScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PoolOnboardingTutorial />
    </>
  )
}
