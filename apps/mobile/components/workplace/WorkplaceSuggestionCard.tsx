// Home card (c) — a Pariwar Admin's suggested workplace, with the ONE confirm question (Story 6.36c, AC4, AC6; RV10).
// Dismissed per `(requestId, workplaceId)` for this APP SESSION only (round 1 — ⛔ the 30-day MMKV store; the comment
// corrected by code review round 2); the question stays on the Workplace screen meanwhile (RV7). Its "Not now" is
// DISABLED while the answer is in flight (`answering` — round 2), and the answer's outcome line is the PARENT's
// (`onOutcome` — `HomePromptCards` shows it, so it outlives this card).

import type { Dispatch, SetStateAction } from 'react'

import { useWorkplaceT } from '../../lib/workplace-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'
import { WorkplaceSuggestionQuestion, type SuggestedWorkplace, type SuggestionOutcome } from './WorkplaceSuggestionQuestion'

export function WorkplaceSuggestionCard({
  suggestion,
  onDismiss,
  onBusyChange,
  answering = false,
  onOutcome,
}: {
  suggestion: SuggestedWorkplace
  onDismiss: () => void
  /** Fix-review — forwarded from `<WorkplaceSuggestionQuestion>` so Home can block "Not now" while an answer is in flight. */
  onBusyChange?: (busy: boolean) => void
  /** Code review round 2 — an answer is in flight: "Not now" is disabled (⛔ an enabled no-op). */
  answering?: boolean
  /** Code review round 2 — forwarded from `<WorkplaceSuggestionQuestion>`: the outcome line is Home's to show. */
  onOutcome: Dispatch<SetStateAction<SuggestionOutcome | null>>
}) {
  const t = useWorkplaceT()
  return (
    <HomeReminderCard title={t('card.suggestion_title')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss} dismissDisabled={answering}>
      {/* `key` — a new suggestion is a new question (its Idempotency-Key is shared by `requestId`, not per-mount — Task 6.5b). */}
      <WorkplaceSuggestionQuestion
        key={`${suggestion.requestId}:${suggestion.workplaceId}`}
        suggestion={suggestion}
        onBusyChange={onBusyChange}
        onOutcome={onOutcome}
      />
    </HomeReminderCard>
  )
}
