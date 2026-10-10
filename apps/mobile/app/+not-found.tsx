// The dignified "not found" (Story 6.30, `2026-10-10-312` AL14; architecture §4.7 — "Never hard 404").
//
// A link the app cannot place lands here: the page could not be opened, "Go to home", and the shared
// helpline CTA — ⛔ no crash, ⛔ no blame, ⛔ nothing about any member. ⚠ Only a MULTI-segment unknown path
// reaches this screen: a ONE-segment path is caught by the two root-level catch-alls that exist today
// (`(helpdesk)/[ticketId]`, `(polls)/[surveyId]`) — which is why every app-link path ships with its own
// real route (AL16). The Hindi is agent-authored; a person reviews it before go-live (roster Row 28).

import { useT } from '@twt/i18n/react'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../components/common/CallHelplineCTA'

export default function NotFoundScreen(): React.ReactElement {
  const t = useT()
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ title: t('not_found.title') }} />
      <YStack flex={1} p="$4" gap="$4" justify="center">
        <H2>{t('not_found.title')}</H2>
        <Paragraph>{t('not_found.body')}</Paragraph>
        <Button theme="accent" onPress={() => router.replace('/(tabs)')}>
          {t('not_found.go_home')}
        </Button>
        <CallHelplineCTA />
      </YStack>
    </>
  )
}
