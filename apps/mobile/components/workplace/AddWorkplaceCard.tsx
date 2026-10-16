// Home card (a) — *"Add your workplace"* (Story 6.36c, AC6; `noWorkplace` — the Pariwar has a list and the member's latest
// posting names ⛔ workplace, `-342` call 2). → Life Events → Workplace.

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { useWorkplaceT } from '../../lib/workplace-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'

export function AddWorkplaceCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useWorkplaceT()
  const router = useRouter()
  return (
    <HomeReminderCard title={t('card.add_title')} body={t('card.add_body')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      <Button theme="accent" height={56} accessibilityRole="button" onPress={() => router.push('/(life-events)/posting')}>
        {t('card.add_action')}
      </Button>
    </HomeReminderCard>
  )
}
