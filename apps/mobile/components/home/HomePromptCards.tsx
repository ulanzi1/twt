// The home's reminder cards — ONE container, ONE card at a time (Story 6.36c, Task 6.2; AC6; RV7).
//
// Mounted after `<KnownPeopleRequestEntry/>`, before `<LockInClockWidget/>` — the My Pool card (Story 8.2) stays TOPMOST.
// It reads the server's prompts (`GET …/known-people/prompts` — every flag gated THERE, RV1) and shows the FIRST card that
// applies and is ⛔ dismissed (`chooseHomeCard`): (c) a suggested workplace → (a) add your workplace → (e) someone can no
// longer be asked → (d) a new workplace → (f) the campaign → (b) invite your colleagues.
// ⭐ It SELF-SUPPRESSES — renders ⛔ while loading, on a first-load error (⛔ data — code review round 2), or with ⛔ card
// (⛔ a list that starts empty and fills — the Fabric empty→populated trap). In the app only — ⛔ SMS, push, WhatsApp from any of it (`-307` §2 item 4).
//
// ⚠ Fix-review (two gaps in "Not now"):
//   · dismissing the SUGGESTION card does ⛔ resolve the question — it stays open on the Workplace screen. Unlike every
//     other card, its "Not now" is kept IN MEMORY for this app session only (⛔ the 30-day MMKV store), so Home asks
//     again next time rather than reading as "handled" for a month.
//   · "Not now" is blocked outright while the question's own `answer()` is in flight (`onBusyChange`) — it must ⛔
//     unmount a press that is already on its way to the server.
// The dismissal store itself is namespaced per signed-in account (`lib/home-card-dismissals.ts`).
//
// ⚠ Code review round 2:
//   · the suggestion's OUTCOME line (saved yes / thank-you no / every refusal) lives HERE (`outcome`), ⛔ in the
//     question: the prompts refetch the answer triggers drops the suggestion and unmounts the question, which took its
//     line with it — and after a "No" the very next card was the contradictory "Add your workplace". The line now
//     stays mounted (announced once by `AnnouncedText`, ⛔ cut off) ABOVE whichever card comes next, until the member
//     moves on: dismisses a card, presses the question again, or leaves Home (`useFocusEffect`'s blur).
//     (fix-diff review) Focus is tracked in a ref: an outcome that arrives while Home is BLURRED (a late settlement, a
//     press still out when the member left) is DROPPED — ⛔ set, ⛔ spoken over another screen, ⛔ waiting on the
//     return — and the line is cleared on focus GAIN as well as on blur.
//   · "Not now" on the suggestion card is DISABLED while its answer is in flight (`answering`), ⛔ an enabled no-op.
//   · the shared answer-key cache follows the prompts (`useEvictStaleAnswerKeys`).
//   · it hides only when there is ⛔ DATA (`q.data === undefined`) — a failed BACKGROUND refetch keeps the data it had,
//     and used to blank the cards (`q.isError`) for as long as the error lasted.
//   · the session-only suggestion dismissals moved to `lib/home-card-dismissals.ts`, so sign-out can clear them.

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { useFocusEffect } from 'expo-router'

import { dismissCard, dismissSuggestionForSession, isCardDismissed, isSuggestionDismissedForSession } from '../../lib/home-card-dismissals'
import { chooseHomeCard, type HomeCard } from '../../lib/home-cards'
import { useSession } from '../../lib/session-context'
import { CampaignCard } from '../known-people/CampaignCard'
import { ReplaceNamedCard } from '../known-people/ReplaceNamedCard'
import { TransferReviewCard } from '../known-people/TransferReviewCard'
import { useKnownPeoplePromptsQuery } from '../known-people/useKnownPeopleQueries'
import { AddWorkplaceCard } from '../workplace/AddWorkplaceCard'
import { InviteColleaguesCard } from '../workplace/InviteColleaguesCard'
import { WorkplaceSuggestionCard } from '../workplace/WorkplaceSuggestionCard'
import { SuggestionOutcomeLine, useEvictStaleAnswerKeys, type SuggestionOutcome } from '../workplace/WorkplaceSuggestionQuestion'

export function HomePromptCards(): React.ReactElement | null {
  const { session } = useSession()
  const q = useKnownPeoplePromptsQuery()
  // A dismissal lives in MMKV (or the in-session set, for a suggestion); bumping this re-reads it so the next card (if
  // any) shows at once.
  const [, setDismissals] = useState(0)
  // The confirm question's own answer() is in flight — "Not now" must ⛔ dismiss a press already under way.
  const [answering, setAnswering] = useState(false)
  // Code review round 2 — the answer's outcome line, kept HERE so the prompts refetch can ⛔ unmount it (header).
  const [outcome, setOutcome] = useState<SuggestionOutcome | null>(null)
  useEvictStaleAnswerKeys(q.data)
  // Fix-diff review — whether Home is focused NOW (a ref: read inside a late callback, ⛔ a stale render's value).
  const focused = useRef(false)
  // Leaving Home is "moving on" — the line does ⛔ greet the member again on their return; cleared both ways.
  useFocusEffect(
    useCallback(() => {
      focused.current = true
      setOutcome(null)
      return () => {
        focused.current = false
        setOutcome(null)
      }
    }, []),
  )
  // The question's setter, gated on focus — an outcome reported while Home is blurred is dropped (header).
  const reportOutcome = useCallback<Dispatch<SetStateAction<SuggestionOutcome | null>>>((next) => {
    if (focused.current) setOutcome(next)
  }, [])
  if (q.data === undefined) return null
  const accountId = session?.memberId
  if (accountId === undefined) return null
  const p = q.data
  const now = new Date()
  const card = chooseHomeCard(p, (key) => isSuggestionDismissedForSession(key) || isCardDismissed(key, accountId, now))
  if (card === null && outcome === null) return null
  const onDismiss = (shown: HomeCard) => () => {
    if (answering) return
    if (shown.kind === 'suggestion') dismissSuggestionForSession(shown.key)
    else dismissCard(shown.key, accountId, new Date())
    setOutcome(null)
    setDismissals((n) => n + 1)
  }
  // ⚠ ONE shape (a fragment: the line's slot, then the card's) whichever of the two is showing — the line ⛔ remounts
  // (and is ⛔ spoken twice) when the card under it goes away, and the card ⛔ remounts (its answer mid-flight) when
  // the line above it appears.
  return (
    <>
      {outcome !== null ? <SuggestionOutcomeLine outcome={outcome} /> : null}
      {card !== null ? (
        <OneCard
          card={card}
          canNamePeople={p.canNamePeople}
          onDismiss={onDismiss(card)}
          answering={answering}
          onBusyChange={setAnswering}
          onOutcome={reportOutcome}
        />
      ) : null}
    </>
  )
}

function OneCard({
  card,
  canNamePeople,
  onDismiss,
  answering,
  onBusyChange,
  onOutcome,
}: {
  card: HomeCard
  canNamePeople: boolean
  onDismiss: () => void
  answering: boolean
  onBusyChange: (busy: boolean) => void
  onOutcome: Dispatch<SetStateAction<SuggestionOutcome | null>>
}): React.ReactElement {
  switch (card.kind) {
    case 'suggestion':
      return (
        <WorkplaceSuggestionCard
          suggestion={card.suggestedWorkplace}
          onDismiss={onDismiss}
          onBusyChange={onBusyChange}
          answering={answering}
          onOutcome={onOutcome}
        />
      )
    case 'add_workplace':
      return <AddWorkplaceCard onDismiss={onDismiss} />
    case 'replace':
      return <ReplaceNamedCard onDismiss={onDismiss} />
    case 'transfer':
      return <TransferReviewCard onDismiss={onDismiss} />
    case 'campaign':
      return <CampaignCard onDismiss={onDismiss} />
    case 'invite':
      return <InviteColleaguesCard canNamePeople={canNamePeople} onDismiss={onDismiss} />
  }
}
