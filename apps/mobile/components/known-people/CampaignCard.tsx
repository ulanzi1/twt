// Home card (f) — a Pariwar Admin's campaign: *"Add people who know you"* (Story 6.36c, AC6, AC7; `campaign`: a live
// campaign, a free slot, ⛔ ask since it began — `-342` call 1). Dismissed per `campaignId`. → the people-who-know-me
// screen. Only for a member who may name people (the server gates the flag — RV1 (ii)).

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'

export function CampaignCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useKnownPeopleT()
  const router = useRouter()
  return (
    <HomeReminderCard title={t('card.campaign_title')} body={t('card.campaign_body')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      <Button theme="accent" height={56} accessibilityRole="button" onPress={() => router.push('/(life-events)/known-people')}>
        {t('card.open')}
      </Button>
    </HomeReminderCard>
  )
}
