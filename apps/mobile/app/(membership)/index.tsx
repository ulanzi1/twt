// Member-facing `<MemberStatusPanel>` (Story 4.7, Task 6; AC2 + AC3). The member's OWN status surface,
// reachable from Home (D6-A). Renders the SAME shared framework-agnostic view-model the admin panel does
// (`@twt/ui` `buildMemberStatusViewModel`, variant 'member') — so the two panels can never drift on
// eligibility — but:
//   · identity / Aadhaar / KYC are NOT re-displayed (AC2a — the presenter sets identitySuppressed) ;
//   · provenance is simplified to "what applies to you" (AC2b) — the section prose, NOT the admin
//     rule-by-rule clause-id audit trace;
//   · every visible string is Hindi-first via @twt/i18n (AC2c, freeze row 10) — the presenter emits KEYS,
//     this screen resolves them with `useT()`.
// Accessibility (AC3): a labelled header, sections as a labelled list with announced statuses, full-prose
// (never error-code) explanations, and an appeal CTA reachable from every failure state.

import { buildMemberStatusViewModel } from '@twt/ui'
import { useT } from '@twt/i18n/react'
import { ScrollView } from 'react-native'
import { Button, H2, Paragraph, Text, YStack } from 'tamagui'

import { useMemberValidityQuery } from '../../components/member-status/useMemberValidityQuery'

export default function MembershipStatusScreen() {
  const t = useT()
  const { data, isLoading, isError } = useMemberValidityQuery()

  if (isLoading) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background">
        <Text accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('memberStatus.loading')}
        </Text>
      </YStack>
    )
  }
  if (isError || !data) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background">
        <Text accessibilityRole="alert" color="$red10">
          {t('memberStatus.error')}
        </Text>
      </YStack>
    )
  }

  const vm = buildMemberStatusViewModel(data.validity, { variant: 'member' })
  const sections = vm.sections.filter((s) => s.id !== 'headline' && s.visible)

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack gap="$4" px="$6" py="$6" bg="$background">
        <H2 accessibilityRole="header">{t('memberStatus.title')}</H2>

        {/* Headline standing + validity window. */}
        <YStack gap="$1">
          <Text fontWeight="700" fontSize="$6" accessibilityRole="text">
            {t(vm.headlineKey)}
          </Text>
          {vm.validityWindow.validThrough ? (
            <Text color="$colorPress" fontSize="$2">
              {t('memberStatus.validThrough')}{' '}
              {new Date(vm.validityWindow.validThrough).toLocaleDateString()}
            </Text>
          ) : null}
        </YStack>

        {/* Sections (b)–(g) — simplified "what applies to you" (AC2b): prose only, no clause-id trace. */}
        <YStack gap="$3" accessibilityLabel={t('memberStatus.whatApplies')}>
          {sections.map((s) => (
            <YStack
              key={s.id}
              gap="$1"
              p="$3"
              borderWidth={1}
              borderColor="$borderColor"
              rounded="$4"
              accessibilityRole="summary"
            >
              <Text fontWeight="600">{t(s.titleKey)}</Text>
              {s.detailKeys.map((k) => (
                <Text key={k} color="$colorPress" fontSize="$2" accessibilityRole="text">
                  {t(k)}
                </Text>
              ))}
            </YStack>
          ))}
        </YStack>

        {/* Appeal CTA — reachable from every failure state (AC3 + UX). */}
        {vm.showAppealCta ? (
          <Button
            accessibilityRole="button"
            accessibilityLabel={t('memberStatus.appealCta')}
            theme="red"
          >
            {t('memberStatus.appealCta')}
          </Button>
        ) : null}

        <Paragraph color="$colorPress" fontSize="$1">
          {t('memberStatus.intro')}
        </Paragraph>
      </YStack>
    </ScrollView>
  )
}
