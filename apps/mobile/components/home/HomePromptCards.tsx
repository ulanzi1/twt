// The home's reminder cards — ONE container, ONE card at a time (Story 6.36c, Task 6.2; AC6; RV7).
//
// Mounted after `<KnownPeopleRequestEntry/>`, before `<LockInClockWidget/>` — the My Pool card (Story 8.2) stays TOPMOST.
// It reads the server's prompts (`GET …/known-people/prompts` — every flag gated THERE, RV1) and shows the FIRST card that
// applies and is ⛔ dismissed (`chooseHomeCard`): (c) a suggested workplace → (a) add your workplace → (e) someone can no
// longer be asked → (d) a new workplace → (f) the campaign → (b) invite your colleagues.
// ⭐ It SELF-SUPPRESSES — renders ⛔ while loading, on an error, or with ⛔ card (⛔ a list that starts empty and fills — the
// Fabric empty→populated trap). In the app only — ⛔ SMS, push, WhatsApp from any of it (`-307` §2 item 4).

import { useState } from 'react'

import { dismissCard, isCardDismissed } from '../../lib/home-card-dismissals'
import { chooseHomeCard } from '../../lib/home-cards'
import { CampaignCard } from '../known-people/CampaignCard'
import { ReplaceNamedCard } from '../known-people/ReplaceNamedCard'
import { TransferReviewCard } from '../known-people/TransferReviewCard'
import { useKnownPeoplePromptsQuery } from '../known-people/useKnownPeopleQueries'
import { AddWorkplaceCard } from '../workplace/AddWorkplaceCard'
import { InviteColleaguesCard } from '../workplace/InviteColleaguesCard'
import { WorkplaceSuggestionCard } from '../workplace/WorkplaceSuggestionCard'

export function HomePromptCards(): React.ReactElement | null {
  const q = useKnownPeoplePromptsQuery()
  // A dismissal lives in MMKV; bumping this re-reads it so the next card (if any) shows at once.
  const [, setDismissals] = useState(0)
  if (q.isError || q.data === undefined) return null
  const p = q.data
  const now = new Date()
  const card = chooseHomeCard(p, (key) => isCardDismissed(key, now))
  if (card === null) return null
  const onDismiss = () => {
    dismissCard(card.key, new Date())
    setDismissals((n) => n + 1)
  }
  switch (card.kind) {
    case 'suggestion':
      return p.suggestedWorkplace !== null ? <WorkplaceSuggestionCard suggestion={p.suggestedWorkplace} onDismiss={onDismiss} /> : null
    case 'add_workplace':
      return <AddWorkplaceCard onDismiss={onDismiss} />
    case 'replace':
      return <ReplaceNamedCard onDismiss={onDismiss} />
    case 'transfer':
      return <TransferReviewCard onDismiss={onDismiss} />
    case 'campaign':
      return <CampaignCard onDismiss={onDismiss} />
    case 'invite':
      return <InviteColleaguesCard canNamePeople={p.canNamePeople} onDismiss={onDismiss} />
  }
}
