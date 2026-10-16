// Home card (d) — *"You have a new workplace — check the people who know you."* (Story 6.36c, AC6; `transferReview`: the
// latest posting names a workplace, an earlier one named a DIFFERENT one, recorded within 30 days). → the people-who-know-me
// screen. Only for a member who may name people (the server gates the flag — `knownPeopleCallerSql`, RV1 (ii)).

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'

export function TransferReviewCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useKnownPeopleT()
  const router = useRouter()
  return (
    <HomeReminderCard title={t('card.transfer_title')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      <Button theme="accent" height={56} accessibilityRole="button" onPress={() => router.push('/(life-events)/known-people')}>
        {t('card.open')}
      </Button>
    </HomeReminderCard>
  )
}
