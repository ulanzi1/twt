// CallHelplineCTA — "Call us — we'll help" (Story 6.2; RELOCATED here in Story 8.11, AC5).
//
// The cross-cutting staff-fallback affordance: a one-tap-to-live-help CTA present at EVERY node of
// BOTH the claim loop (AR-61, where it first shipped) AND the contribution loop (UX-DR49 — the
// fallback reachable from every user-facing component). It was homed under `components/claim/` when
// Story 6.2 first shipped it; Story 8.11 moves it to `components/common/` to match its genuinely
// cross-cutting role, leaving a thin re-export at the old `claim/` path so all shipped claim call
// sites import unchanged and render byte-identically (the 8.8 relocation-with-re-export precedent).
//
// ── Do NOT re-implement the dial-out to restyle a button ────────────────────────────────────────────
// The `label`/`chromeless`/`theme`/`height` props exist PRECISELY so a caller gets a different button
// style without re-writing the `tel:` `Linking` call (a prior review finding). Pass `chromeless=false`
// + `theme` + `height` for a prominent primary-CTA rendering; keep the default chromeless treatment
// for the low-emphasis third-tier recovery-ladder placement (UX-DR62).
//
// Tenant-agnostic internal name (`CallHelplineCTA`, per UX §component-naming); the UX label lives in
// the bilingual copy. The default label resolves from the NAMESPACE-NEUTRAL `common` catalog
// (`common.call_helpline.label`) so a contribution surface rendering the bare component gets
// appropriate copy — Story 8.11 decoupled it from the `claim` namespace (AC5). Callers passing an
// explicit `label` are unaffected. The helpline number resolves from EXPO_PUBLIC_HELPLINE_TEL (per
// build profile), defaulting to a placeholder for local dev; per-Pariwar resolution is Epic 10.

import * as Linking from 'expo-linking'
import { useT } from '@twt/i18n/react'
import { Button, type ThemeName } from 'tamagui'

const HELPLINE_TEL = process.env.EXPO_PUBLIC_HELPLINE_TEL ?? '+911800000000'

export interface CallHelplineCTAProps {
  /** Override the default "Call us — we'll help" copy (e.g. nominee-review's "details look
   * wrong? Call us") while reusing the same tappable dial-out behavior. */
  label?: string
  /** Visual weight — defaults to the standard low-emphasis chromeless treatment. Pass `false` + `theme` +
   * `height` for a prominent primary-CTA rendering (e.g. contribution/pay.tsx's "not available yet" empty
   * state) while still reusing the same dial-out logic — review finding: don't re-implement the tel:
   * Linking call just to get a different button style. */
  chromeless?: boolean
  theme?: ThemeName
  height?: number
}

export function CallHelplineCTA({
  label,
  chromeless = true,
  theme,
  height,
}: CallHelplineCTAProps = {}): React.ReactElement {
  // `useT()` defaults to the `common` namespace (resolver.ts) — the default label is now namespace-
  // neutral (Story 8.11, AC5), so a contribution surface rendering the bare component no longer gets
  // claim-namespace copy. The string is byte-identical to the former `claim shell.call_help` value, so
  // every existing bare claim call site renders unchanged.
  const t = useT()
  const text = label ?? t('call_helpline.label')
  return (
    <Button
      chromeless={chromeless}
      theme={theme}
      height={height}
      size={height ? undefined : '$4'}
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
