// <UPIIntentButton> — the ≥56pt "Pay via UPI" touch target (Story 8.4, Task 5; AC1/AC6/UX-DR26).
//
// A thin presentational button: it opens the SERVER-authoritative `upi://pay` URL (built entirely by the
// api — the client never names the payee/amount/tr; R4) via Linking.openURL. The ≥56pt height is the
// UX-DR26 gate (a first-class touch target for a load-bearing money action). The parent (pay.tsx) owns the
// intent fetch, the return-with-UTR handling, and the failure/no-app fail-soft — this is just the launcher.

import { useT } from '@twt/i18n/react'
import { Linking } from 'react-native'
import { Button } from 'tamagui'

import { markLoopPhase } from '../../lib/loop-timing-session'

const NS = { namespace: 'contribution' } as const

export interface UPIIntentButtonProps {
  /** The server-built `upi://pay?…` URL (never client-constructed — R4). */
  readonly upiUrl: string
  /** Called after a successful launch (the parent reveals the UTR-paste step). */
  readonly onLaunched: () => void
  /** Called when `Linking.canOpenURL` reports no app can handle `upi://` (the parent shows per-app
   * guidance + the 8.5 seam). Determined PROACTIVELY, before attempting to open — review finding: the
   * pre-fix code inferred "no app" from a rejected `openURL`, which also fires for a genuine launch error
   * (malformed URL, OS restriction) and can't tell those apart from a user simply cancelling an app
   * chooser (which resolves, not rejects). */
  readonly onNoUpiApp: () => void
  /** Called when `canOpenURL` said an app CAN handle it but the actual `openURL` still failed — a genuine
   * launch error, distinct from "no app installed" (review finding). Falls back to `onNoUpiApp` if the
   * parent doesn't distinguish (backward-compatible default). */
  readonly onLaunchError?: () => void
  readonly disabled?: boolean
}

export function UPIIntentButton({
  upiUrl,
  onLaunched,
  onNoUpiApp,
  onLaunchError,
  disabled,
}: UPIIntentButtonProps) {
  const t = useT()

  async function onPress(): Promise<void> {
    const canOpen = await Linking.canOpenURL(upiUrl).catch(() => false)
    if (!canOpen) {
      onNoUpiApp()
      return
    }
    try {
      await Linking.openURL(upiUrl)
      // Story 8.12 — the `intent_fire` mark (AC1): the last TWT-controlled instant before the UPI app takes
      // over. Segment (b) ends here; the EXCLUDED round-trip starts here. Debug-gated → inert in prod.
      markLoopPhase('intent_fire')
      onLaunched()
    } catch {
      // canOpenURL said yes but the open itself failed — a genuine launch error, never silently relabeled
      // as "no UPI app installed" (that copy would tell an honest user to install an app they already have).
      ;(onLaunchError ?? onNoUpiApp)()
    }
  }

  return (
    <Button
      height={56}
      theme="red"
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t('upi_intent.pay_cta_a11y', undefined, NS)}
      accessibilityHint={t('upi_intent.pay_cta_hint', undefined, NS)}
      onPress={onPress}
    >
      {t('upi_intent.pay_cta', undefined, NS)}
    </Button>
  )
}
