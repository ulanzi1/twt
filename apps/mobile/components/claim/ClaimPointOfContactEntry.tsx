// ClaimPointOfContactEntry — the persistent post-filing point-of-contact entry (Story 6.12, Task 5; R3).
//
// R3 requires that the <ShepherdContactCard> be RE-REACHABLE after the filing wizard completes (the
// acknowledgement screen is a one-shot terminal). This understated home-surface entry surfaces ONLY when
// the member has a filed claim on record (the filed-claim pointer, stamped at acknowledgement), and opens
// the dedicated (claim)/shepherd re-entry screen. It self-suppresses (renders null) otherwise — no filed
// claim, no entry.

import { useRouter } from 'expo-router'
import { Button } from 'tamagui'

import { getFiledClaimCaseId } from '../../lib/filed-claim'
import { useClaimT } from '../../lib/claim-i18n'
import { useSession } from '../../lib/session-context'

export function ClaimPointOfContactEntry(): React.ReactElement | null {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const claimCaseId = session?.memberId ? getFiledClaimCaseId(session.memberId) : null

  if (!claimCaseId) return null

  return (
    <Button
      chromeless
      size="$4"
      accessibilityRole="button"
      accessibilityLabel={t('shepherd.entry')}
      onPress={() => router.push(`/(claim)/shepherd?claimCaseId=${encodeURIComponent(claimCaseId)}`)}
    >
      {t('shepherd.entry')}
    </Button>
  )
}
