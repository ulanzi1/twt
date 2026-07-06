import { YStack } from 'tamagui'

import { DataExportEntry } from 'components/data-export/DataExportEntry'
import { LifeEventsEntry } from 'components/life-events/LifeEventsEntry'
import { NotificationSettingsEntry } from 'components/notifications/NotificationSettingsEntry'
import { MembershipStatusEntry } from 'components/member-status/MembershipStatusEntry'
import { LockInClockWidget } from 'components/lock-in/LockInClockWidget'
import { RenewalStatusWidget } from 'components/renewal/RenewalStatusWidget'
import { WithdrawalEntry } from 'components/withdrawal/WithdrawalEntry'
import { YogdaanBahi } from 'components/yogdaan-bahi/YogdaanBahi'

// Tab 1 — home. The lock-in clock widget (Story 3.7) is the TOPMOST element: for a member in `lock-in`
// it renders the countdown + clause ref + unlock date; for everyone else it returns null and the home
// content below shows unchanged (fail-soft — a failed status fetch simply renders nothing).
//
// Below it, the renewal-status widget (Story 3.8): for a PAID member whose renewal is due / in grace /
// lapsed it renders the renewal state + a UPI "Renew membership" CTA; for everyone else it self-suppresses
// (the two widgets are mutually exclusive in practice — lock-in is pre-active, renewal is post-lock-in).
//
// Below those: the Yogdaan Bahi pattern per UX spec §8 + lines 805 + 1156 (P0-5 measurement target —
// P1 Devanagari rendering + P5 list-performance baseline). The Epic-8 "My Pool" / Panchayat home
// stack eventually owns this surface (AC3 forward-compat).
export default function YogdaanTab() {
  return (
    <YStack flex={1}>
      <LockInClockWidget />
      <RenewalStatusWidget />
      <LifeEventsEntry />
      {/* Story 4.7 — the member-facing MemberStatusPanel entry (own status; Hindi-first, a11y). */}
      <MembershipStatusEntry />
      <YogdaanBahi />
      {/* Story 5.4 — understated notification-settings (WhatsApp opt-in) entry (a member choice). */}
      <NotificationSettingsEntry />
      {/* Story 3.11 — understated DPDPA data-export entry (a member right, framed neutrally). */}
      <DataExportEntry />
      {/* Story 3.10 — understated voluntary-withdrawal entry at the very bottom (deliberate, not encouraged). */}
      <WithdrawalEntry />
    </YStack>
  )
}
