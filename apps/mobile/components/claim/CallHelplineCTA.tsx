// CallHelplineCTA — "Call us — we'll help" (Story 6.2, Task 5; AC5 / AR-61).
//
// The cross-cutting staff-fallback affordance: a one-tap-to-live-help CTA present at EVERY node of
// the claim flow (AR-61). The helpline-mediated path (Story 6.3) can complete the claim on Ravi's
// behalf; the two intakes converge at ICP (Story 6.4). Story 0.7's fallback-handler ledger is
// REFERENCED, not re-implemented here (epic cross-cutting note) — this is only the entry affordance.
//
// Tenant-agnostic internal name (`CallHelplineCTA`, per UX §component-naming); the UX label lives in
// the bilingual copy. The helpline number resolves from EXPO_PUBLIC_HELPLINE_TEL (per build profile),
// defaulting to a placeholder for local dev.

import * as Linking from 'expo-linking'
import { Button } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'

const HELPLINE_TEL = process.env.EXPO_PUBLIC_HELPLINE_TEL ?? '+911800000000'

export interface CallHelplineCTAProps {
  /** Override the default "Call us — we'll help" copy (e.g. nominee-review's "details look
   * wrong? Call us") while reusing the same tappable dial-out behavior. */
  label?: string
}

export function CallHelplineCTA({ label }: CallHelplineCTAProps = {}): React.ReactElement {
  const t = useClaimT()
  const text = label ?? t('shell.call_help')
  return (
    <Button
      chromeless
      size="$4"
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={() => {
        void Linking.openURL(`tel:${HELPLINE_TEL}`)
      }}
    >
      {text}
    </Button>
  )
}
