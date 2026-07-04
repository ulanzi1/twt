import { Stack } from 'expo-router'

// Membership-status route GROUP (Story 4.7, Task 6) — a plain Stack with the single member-facing
// `<MemberStatusPanel>` screen, reachable from the home tab (UX "Surfaces: Member profile; Sushil's
// home"). There is no profile tab today, so this is a Home-reachable surface rather than a new tab
// (D6-A). The root _layout.tsx sets headerShown for the group; the OS-chrome back returns to home.
export default function MembershipLayout() {
  return <Stack />
}
