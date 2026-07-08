// SaveAndResumeAffordance — "Save & continue later" (Story 6.2, Task 5; AC1/AC6).
//
// Always present in the claim shell. The claim draft is persisted continuously as Ravi moves
// through the flow (lib/claim-draft.ts), so this affordance simply confirms the work is safe and
// returns Ravi home — NO countdown, NO time-out, NO penalty (UX §7 grief register). Re-entry
// restores the draft. Tenant-agnostic internal name; the UX label lives in the bilingual copy.

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'

export function SaveAndResumeAffordance(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  return (
    <Button
      chromeless
      size="$4"
      accessibilityRole="button"
      accessibilityLabel={t('shell.save_resume')}
      onPress={() => {
        // The draft is already persisted; just leave the flow (resumable, no time pressure).
        router.replace('/(tabs)')
      }}
    >
      {t('shell.save_resume')}
    </Button>
  )
}
