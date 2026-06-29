import { YStack } from 'tamagui'

import { LockInClockWidget } from 'components/lock-in/LockInClockWidget'
import { YogdaanBahi } from 'components/yogdaan-bahi/YogdaanBahi'

// Tab 1 — home. The lock-in clock widget (Story 3.7) is the TOPMOST element: for a member in `lock-in`
// it renders the countdown + clause ref + unlock date; for everyone else it returns null and the home
// content below shows unchanged (fail-soft — a failed status fetch simply renders nothing).
//
// Below it: the Yogdaan Bahi pattern per UX spec §8 + lines 805 + 1156 (P0-5 measurement target —
// P1 Devanagari rendering + P5 list-performance baseline). The Epic-8 "My Pool" / Panchayat home
// stack eventually owns this surface (AC3 forward-compat).
export default function YogdaanTab() {
  return (
    <YStack flex={1}>
      <LockInClockWidget />
      <YogdaanBahi />
    </YStack>
  )
}
