import { Stack } from 'expo-router'

// Voluntary-withdrawal route GROUP (Story 3.10, Task 8) — a plain Stack: the staged withdrawal flow
// (acknowledgment → optional reason → step-up → final confirm, all in `index`) + the withdrawn
// confirmation view (`done`). Dignified Pattern-4 register throughout (UX-DR55) — NO retention theater,
// NO scarcity framing. The root _layout.tsx sets headerShown:false for this group so this inner Stack
// owns its own headers. Deliberately reached from an understated entry point (not a prominent CTA).
export default function WithdrawalLayout() {
  return <Stack />
}
