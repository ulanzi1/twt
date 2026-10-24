// Home card (e) — *"Someone who knows you is no longer available — add someone else."* (`2026-10-24-403`; it said "can no longer be asked") (Story 6.36c, AC6; `replaceNeeded`).
// ⛔ Never who, ⛔ never why — ONE line for a person who left the Trust and a person reported dead (SW16 (4)). → the
// people-who-know-me screen. Only for a member who may name people (the server gates the flag — RV1 (ii)).

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'

export function ReplaceNamedCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useKnownPeopleT()
  const router = useRouter()
  return (
    <HomeReminderCard title={t('card.replace_title')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      <Button theme="accent" height={56} accessibilityRole="button" onPress={() => router.push('/(life-events)/known-people')}>
        {t('card.open')}
      </Button>
    </HomeReminderCard>
  )
}
