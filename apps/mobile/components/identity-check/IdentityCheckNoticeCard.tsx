// "We could not confirm your identity yet" — the home card (Story 3.13a, Task 3; AC4, AC5; DL1, DL3, DL6–DL8, DL10;
// `2026-11-25-502` item 4 (Q2 C), the words APPROVED by `-508`, the build `-509`).
//
// ⚠ RENDERS NOTHING unless the member's OWN read SUCCEEDED with a notice — while loading, on an error (a failed or timed-out
// re-read HIDES a card already shown — DL6), and on `notice: null` (⛔ checked yet, confirmed since, a death claim, ineligible).
// In the app ONLY — ⛔ SMS, ⛔ push, ⛔ WhatsApp (DL1). ⛔ the date, ⛔ who checked, ⛔ which ID was seen, ⛔ the note (N3): the
// wire carries the reason code only.
// ⭐ DL10 — the WHOLE card is ONE button (the `PeerRequestEntry` / `KnownPeopleRequestEntry` shape): its `accessibilityLabel` =
// title + reason + how + the action words REPLACES the children for TalkBack, so the text is read ONCE. The text is the card's own
// `Text` children (⛔ a Tamagui button text prop), so it wraps. ⛔ live region, ⛔ announcement (static content).
// Family 13 (a) — the labelled container is EXPLICITLY `accessible={true}` (R2-P1): a label on a container that is not an
// accessibility element is never announced. Tamagui 2.1.0's native default already supplies it for a `Button` (`tabIndex: 0`), so
// this names what a library default currently does. The test asserts only that the card PASSES the prop (to a stub of `Button`),
// ⛔ what Tamagui does with it; only AC9's TalkBack pass proves the reading on a device.
// ⭐ DL8 — pressing it opens the help form with `kyc-trouble` PRESELECTED (`new.tsx` applies it once its list has loaded).

import { useRouter } from 'expo-router'
import { useT } from '@twt/i18n/react'
import { Button, Text, YStack } from 'tamagui'

import { IDENTITY_CHECK_HOW_KEY_BY_REASON, IDENTITY_CHECK_REASON_KEY_BY_REASON } from './identity-check-notice-keys'
import { identityCheckNoticeReason, useIdentityCheckNoticeQuery } from './useIdentityCheckNoticeQuery'

/** The help-form route the card opens (DL8) — `kyc-trouble` is the helpdesk's "KYC or verification help" category. */
export const IDENTITY_CHECK_HELP_HREF = { pathname: '/(helpdesk)/new', params: { category: 'kyc-trouble' } } as const

export function IdentityCheckNoticeCard(): React.ReactElement | null {
  const t = useT()
  const router = useRouter()
  const q = useIdentityCheckNoticeQuery()
  const reason = identityCheckNoticeReason(q)
  if (reason === null) return null
  const title = t('identity_check.notice.title')
  const reasonLine = t(IDENTITY_CHECK_REASON_KEY_BY_REASON[reason])
  const how = t(IDENTITY_CHECK_HOW_KEY_BY_REASON[reason])
  const action = t('identity_check.notice.ask_help')
  return (
    <Button
      unstyled
      onPress={() => router.push(IDENTITY_CHECK_HELP_HREF)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${reasonLine} ${how} ${action}`}
      px={16}
      py={12}
      testID="identity-check-notice-card"
    >
      <YStack gap={4} width="100%">
        <Text fontFamily="$body" fontSize="$4" fontWeight="500" color="$color">
          {title}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$color">
          {reasonLine}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {how}
        </Text>
        <Text fontFamily="$body" fontSize="$3" fontWeight="500" color="$color" textDecorationLine="underline">
          {action}
        </Text>
      </YStack>
    </Button>
  )
}
