// Home card (b) — *"Invite your colleagues to join"* (Story 6.36c, AC6; `hasWorkplace`; RV5). NEUTRAL: ⛔ a word about
// whether other members are at the workplace (SW16 (2) — ⛔ a disclosure). *"Invite"* opens ONE share sheet per tap with
// the member's own message (`shareInvite` — ⛔ a link, ⛔ "invite all"); *"Add people who know you"* ONLY when the member
// may name people (`canNamePeople` — `-333` call 1).

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { shareInvite } from '../../lib/invite-share'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { configuredTrustName } from '../../lib/trust-name'
import { useWorkplaceT } from '../../lib/workplace-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'

export function InviteColleaguesCard({ canNamePeople, onDismiss }: { canNamePeople: boolean; onDismiss: () => void }) {
  const t = useWorkplaceT()
  const kt = useKnownPeopleT()
  const router = useRouter()
  return (
    <HomeReminderCard title={t('card.invite_title')} body={t('card.invite_body')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      <Button theme="accent" height={56} accessibilityRole="button" onPress={() => void shareInvite(kt, configuredTrustName())}>
        {t('card.invite_action')}
      </Button>
      {canNamePeople ? (
        <Button height={56} accessibilityRole="button" onPress={() => router.push('/(life-events)/known-people')}>
          {kt('card.add_people')}
        </Button>
      ) : null}
    </HomeReminderCard>
  )
}
