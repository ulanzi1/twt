import { Stack } from 'expo-router'

// Pool-onboarding route GROUP (Story 7.10, Task 4) — a plain Stack owning the 3-screen pool-engine
// onboarding tutorial (`index`). Presented modally (registered in the root _layout.tsx Stack with
// presentation:'modal', headerShown:false); this inner Stack owns the group. Calm/neutral register —
// the tutorial is re-viewable and skippable, never nagged.
export default function PoolOnboardingLayout() {
  return <Stack />
}
