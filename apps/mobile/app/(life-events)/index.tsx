// Life Events panel index (Story 3.9, Task 8; AC1/AC3). The entry screen listing the four
// life-change sub-types a member can update (FR-5): nominees, address, posting (transfer-in/out),
// and health disclosure. Each card shows a calm "on record / not yet added" status derived from the
// summary read and navigates to its sub-type screen.
//
// Tone (UX-DR55 Pattern 4): calm register — no urgency, no scarcity. Bilingual via @twt/i18n.
// Accessibility: cards are role=button with label + hint; the status line is announced.

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { ScrollView } from 'react-native'
import { Button, H2, Paragraph, Text, YStack } from 'tamagui'

import { useLifeEventsSummaryQuery } from '../../components/life-events/useLifeEventsSummaryQuery'

export default function LifeEventsIndexScreen() {
  const t = useT()
  const router = useRouter()
  const { data } = useLifeEventsSummaryQuery()

  const status = (recorded: boolean | undefined): string =>
    recorded ? t('lifeEvents.recorded') : t('lifeEvents.not_recorded')

  const cards: { key: string; label: string; desc: string; recorded: boolean | undefined; to: string }[] = [
    {
      key: 'nominees',
      label: t('lifeEvents.nominees_label'),
      desc: t('lifeEvents.nominees_desc'),
      recorded: data?.nominees.declared,
      to: '/(life-events)/nominees',
    },
    {
      key: 'address',
      label: t('lifeEvents.address_label'),
      desc: t('lifeEvents.address_desc'),
      recorded: data?.address.recorded,
      to: '/(life-events)/address',
    },
    {
      key: 'posting',
      label: t('lifeEvents.posting_label'),
      desc: t('lifeEvents.posting_desc'),
      recorded: data?.posting.recorded,
      to: '/(life-events)/posting',
    },
    {
      key: 'medical',
      label: t('lifeEvents.medical_label'),
      desc: t('lifeEvents.medical_desc'),
      recorded: data?.medical.disclosed,
      to: '/(life-events)/medical',
    },
  ]

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack gap="$4" px="$6" py="$6" bg="$background">
        <H2 accessibilityRole="header">{t('lifeEvents.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text">
          {t('lifeEvents.intro')}
        </Paragraph>

        {cards.map((c) => (
          <Button
            key={c.key}
            height="auto"
            py="$4"
            justify="flex-start"
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityHint={c.desc}
            onPress={() => router.push(c.to)}
          >
            <YStack gap="$1" flex={1}>
              <Text fontWeight="600">{c.label}</Text>
              <Text color="$colorPress" fontSize="$2">
                {c.desc}
              </Text>
              <Text color="$colorPress" fontSize="$2" accessibilityLiveRegion="polite">
                {status(c.recorded)}
              </Text>
            </YStack>
          </Button>
        ))}
      </YStack>
    </ScrollView>
  )
}
