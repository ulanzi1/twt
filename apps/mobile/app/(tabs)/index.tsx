import { YStack } from 'tamagui'

import { ActiveContributionCard } from 'components/active-contribution/ActiveContributionCard'
import { ViewContributorsEntry } from 'components/contributor-list/ViewContributorsEntry'
import { ClaimProxyFlowEntry } from 'components/claim/ClaimProxyFlowEntry'
import { ClaimPointOfContactEntry } from 'components/claim/ClaimPointOfContactEntry'
import { DataExportEntry } from 'components/data-export/DataExportEntry'
import { LifeEventsEntry } from 'components/life-events/LifeEventsEntry'
import {
  NotificationSettingsEntry,
  TelegramNotificationSettingsEntry,
} from 'components/notifications/NotificationSettingsEntry'
import { MembershipStatusEntry } from 'components/member-status/MembershipStatusEntry'
import { PoolOnboardingSettingsEntry } from 'components/pool-onboarding/PoolOnboardingSettingsEntry'
import { LockInClockWidget } from 'components/lock-in/LockInClockWidget'
import { RenewalStatusWidget } from 'components/renewal/RenewalStatusWidget'
import { WithdrawalEntry } from 'components/withdrawal/WithdrawalEntry'
import { YogdaanBahiEntry } from 'components/yogdaan-bahi/YogdaanBahiEntry'

// Tab 1 — home. The My Pool card (Story 8.2 — the first Epic-8 SURFACE) is now the TOPMOST element:
// for an `active` member assigned to a pool whose cycle alert is `live` it renders the contribution
// card (pool + deceased-member family + amount + days-remaining + confirmed progress + tone gradient +
// ≥56pt contribute CTA); for everyone else it self-suppresses (renders null) and the stack below shows
// unchanged (fail-soft). It sits ABOVE the lock-in / renewal widgets (they apply to different lifecycle
// phases and are mutually exclusive with an active-contribution member in practice).
//
// Below it, the lock-in clock widget (Story 3.7): for a member in `lock-in`
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
      {/* Story 8.2 — the My Pool card, TOPMOST. Self-suppresses unless the member is active + assigned
          to a pool whose cycle alert is live. The Epic-8 home anchor of the 90-second contribution loop. */}
      <ActiveContributionCard />
      {/* Story 8.3 — the "View contributors" affordance (just below the card, NOT inside it — D8). Navigates
          to the Live Contributor List view; self-suppresses in lock-step with the card. */}
      <ViewContributorsEntry />
      <LockInClockWidget />
      <RenewalStatusWidget />
      <LifeEventsEntry />
      {/* Story 6.2 — Ravi-mode claim-filing entry (understated; opens the (claim) proxy flow). The
          ONLY entry surface in 6.2 (the helpline deep-link handover is Story 6.3). */}
      <ClaimProxyFlowEntry />
      {/* Story 6.12 — the persistent post-filing point-of-contact entry (self-suppresses when the member
          has no filed claim on record). Re-opens the named-human shepherd view (R3). */}
      <ClaimPointOfContactEntry />
      {/* Story 4.7 — the member-facing MemberStatusPanel entry (own status; Hindi-first, a11y). */}
      <MembershipStatusEntry />
      {/* Story 7.10 — LIVE re-view entry into the pool-engine onboarding tutorial (re-viewable anytime). */}
      <PoolOnboardingSettingsEntry />
      {/* Story 8.6 — the Yogdaan Bahi (contribution passbook) now lives on its OWN full-height screen
          (app/(contribution)/yogdaan) so its FlatList owns the scroll (AC4/D5). This understated entry
          navigates in; the inline home mount (the P0-5 measurement scaffold) is retired. */}
      <YogdaanBahiEntry />
      {/* Story 5.4 — understated notification-settings (WhatsApp opt-in) entry (a member choice). */}
      <NotificationSettingsEntry />
      {/* Story 5.5 — understated Telegram opt-in entry (a member choice; the mirror side-channel). */}
      <TelegramNotificationSettingsEntry />
      {/* Story 3.11 — understated DPDPA data-export entry (a member right, framed neutrally). */}
      <DataExportEntry />
      {/* Story 3.10 — understated voluntary-withdrawal entry at the very bottom (deliberate, not encouraged). */}
      <WithdrawalEntry />
    </YStack>
  )
}
