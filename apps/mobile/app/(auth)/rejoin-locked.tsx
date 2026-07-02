// Signup rejoin-block — the dignified date-block screen (Story 3.10, Task 8; AC3 / Pattern-4 recovery,
// ux-design-specification.md:2369). Reached when `signupCreate` returns `auth.rejoin_locked` (a
// withdrawn identity inside its 12-month rejoin window). Lives in the (auth) group because there is NO
// member session during signup — the root auth guard would otherwise bounce a non-(auth) route to login.
//
// A calm explanation surface, NOT a generic error toast: it states plainly WHEN the identity withdrew
// and WHEN rejoin becomes available. NO scarcity/blame framing (AC2). Dates arrive as ISO params from
// the 403 `error.details.{withdrawn_at,rejoin_permitted_at}`.

import { useLocale, useT } from '@twt/i18n/react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { formatWithdrawalDate } from '../../components/withdrawal/format-date'

export default function RejoinLockedScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const { withdrawnDate, rejoinDate } = useLocalSearchParams<{
    withdrawnDate?: string
    rejoinDate?: string
  }>()

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('withdrawal.rejoin_locked_title')}</H2>
      <Paragraph color="$colorPress">
        {t('withdrawal.rejoin_locked_body', {
          withdrawnDate: withdrawnDate ? formatWithdrawalDate(withdrawnDate, locale) : '',
          rejoinDate: rejoinDate ? formatWithdrawalDate(rejoinDate, locale) : '',
        })}
      </Paragraph>
      <Button
        theme="accent"
        height={56}
        accessibilityRole="button"
        accessibilityLabel={t('withdrawal.rejoin_locked_home')}
        onPress={() => router.replace('/(auth)/login')}
      >
        {t('withdrawal.rejoin_locked_home')}
      </Button>
    </YStack>
  )
}
