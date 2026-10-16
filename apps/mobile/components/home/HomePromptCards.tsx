// The home's reminder cards — ONE container, ONE card at a time (Story 6.36c, Task 6.2; AC6; RV7).
//
// Mounted after `<KnownPeopleRequestEntry/>`, before `<LockInClockWidget/>` — the My Pool card (Story 8.2) stays TOPMOST.
// It reads the server's prompts (`GET …/known-people/prompts` — every flag gated THERE, RV1) and shows the FIRST card that
// applies and is ⛔ dismissed (`chooseHomeCard`): (c) a suggested workplace → (a) add your workplace → (e) someone can no
// longer be asked → (d) a new workplace → (f) the campaign → (b) invite your colleagues.
// ⭐ It SELF-SUPPRESSES — renders ⛔ while loading, on an error, or with ⛔ card (⛔ a list that starts empty and fills — the
// Fabric empty→populated trap). In the app only — ⛔ SMS, push, WhatsApp from any of it (`-307` §2 item 4).
//
// ⚠ Fix-review (two gaps in "Not now"):
//   · dismissing the SUGGESTION card does ⛔ resolve the question — it stays open on the Workplace screen. Unlike every
//     other card, its "Not now" is kept IN MEMORY for this app session only (⛔ the 30-day MMKV store), so Home asks
//     again next time rather than reading as "handled" for a month.
//   · "Not now" is blocked outright while the question's own `answer()` is in flight (`onBusyChange`) — it must ⛔
//     unmount a press that is already on its way to the server.
// The dismissal store itself is namespaced per signed-in account (`lib/home-card-dismissals.ts`).

import { useState } from 'react'

import { dismissCard, isCardDismissed } from '../../lib/home-card-dismissals'
import { chooseHomeCard } from '../../lib/home-cards'
import { useSession } from '../../lib/session-context'
import { CampaignCard } from '../known-people/CampaignCard'
import { ReplaceNamedCard } from '../known-people/ReplaceNamedCard'
import { TransferReviewCard } from '../known-people/TransferReviewCard'
import { useKnownPeoplePromptsQuery } from '../known-people/useKnownPeopleQueries'
import { AddWorkplaceCard } from '../workplace/AddWorkplaceCard'
import { InviteColleaguesCard } from '../workplace/InviteColleaguesCard'
import { WorkplaceSuggestionCard } from '../workplace/WorkplaceSuggestionCard'

/** A SUGGESTION card's "Not now", for this app session only — module-level, ⛔ MMKV (fix-review above). */
const sessionDismissedSuggestions = new Set<string>()

export function HomePromptCards(): React.ReactElement | null {
  const { session } = useSession()
  const q = useKnownPeoplePromptsQuery()
  // A dismissal lives in MMKV (or the in-session set, for a suggestion); bumping this re-reads it so the next card (if
  // any) shows at once.
  const [, setDismissals] = useState(0)
  // The confirm question's own answer() is in flight — "Not now" must ⛔ dismiss a press already under way.
  const [answering, setAnswering] = useState(false)
  if (q.isError || q.data === undefined) return null
  const accountId = session?.memberId
  if (accountId === undefined) return null
  const p = q.data
  const now = new Date()
  const card = chooseHomeCard(p, (key) => sessionDismissedSuggestions.has(key) || isCardDismissed(key, accountId, now))
  if (card === null) return null
  const onDismiss = () => {
    if (answering) return
    if (card.kind === 'suggestion') sessionDismissedSuggestions.add(card.key)
    else dismissCard(card.key, accountId, new Date())
    setDismissals((n) => n + 1)
  }
  switch (card.kind) {
    case 'suggestion':
      return <WorkplaceSuggestionCard suggestion={card.suggestedWorkplace} onDismiss={onDismiss} onBusyChange={setAnswering} />
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
