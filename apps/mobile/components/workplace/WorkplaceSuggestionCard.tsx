// Home card (c) — a Pariwar Admin's suggested workplace, with the ONE confirm question (Story 6.36c, AC4, AC6; RV10).
// Dismissed per `(requestId, workplaceId)`; the question stays on the Workplace screen meanwhile (RV7).

import { useWorkplaceT } from '../../lib/workplace-i18n'
import { HomeReminderCard } from '../home/HomeReminderCard'
import { WorkplaceSuggestionQuestion, type SuggestedWorkplace } from './WorkplaceSuggestionQuestion'

export function WorkplaceSuggestionCard({
  suggestion,
  onDismiss,
  onBusyChange,
}: {
  suggestion: SuggestedWorkplace
  onDismiss: () => void
  /** Fix-review — forwarded from `<WorkplaceSuggestionQuestion>` so Home can block "Not now" while an answer is in flight. */
  onBusyChange?: (busy: boolean) => void
}) {
  const t = useWorkplaceT()
  return (
    <HomeReminderCard title={t('card.suggestion_title')} dismissLabel={t('card.dismiss')} onDismiss={onDismiss}>
      {/* `key` — a new suggestion is a new question (its Idempotency-Key is shared by `requestId`, not per-mount — Task 6.5b). */}
      <WorkplaceSuggestionQuestion key={`${suggestion.requestId}:${suggestion.workplaceId}`} suggestion={suggestion} onBusyChange={onBusyChange} />
    </HomeReminderCard>
  )
}
