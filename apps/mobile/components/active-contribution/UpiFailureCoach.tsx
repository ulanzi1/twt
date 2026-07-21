// <UpiFailureCoach> — the UPI Failure Coach diagnostic surface (Story 8.5; AC1/AC2/AC4/AC5).
//
// The seam Story 8.4's D9 deliberately left as a bare affordance. When a UPI payment doesn't go through
// (no UPI app, a launch error, a return without a UTR, or an invalid UTR), this surface helps the member
// NAME what went wrong and guides them to a next step. It is DIAGNOSTIC ONLY (AC4): it emits no
// `contribution.utr-attested` event and creates no yellow pill — the parent (pay.tsx) keeps the UTR-paste
// escape hatch so a member who actually paid can still attest.
//
// ── Member-DECLARED, not app-detected (D1) ──────────────────────────────────────────────────────────
// UPI Intent returns no trustworthy structured failure reason on return, so the coach ASKS rather than
// diagnoses: a 5-mode self-classification chooser (never an inferred verdict). `suggestedMode` may
// pre-HIGHLIGHT a likely mode (e.g. a no-app / launch-error → "app issue") but the member still confirms.
//
// ── "Anonymous" analytics, fire-and-forget (AC3) ────────────────────────────────────────────────────
// On select, the chosen mode is reported best-effort via `memberAuth.reportUpiFailure(mode)` — fire-and-
// forget (`void … .catch(() => undefined)`, the PoolOnboardingTutorial idiom): a failed POST never blocks
// the UI. The request carries the mode enum and nothing else (no free-text, no UTR/amount) — the server
// keys the audit line on the mode alone (the contract's no-free-text `.strict()` shape is the teeth).
//
// ── Reuse, don't reinvent (D3) ──────────────────────────────────────────────────────────────────────
// Retry = re-launching the SAME <UPIIntentButton> with the current server-authoritative `upiUrl`; the
// helpline step reuses the shipped <CallHelplineCTA>; "switch app" / "contact bank" are text guidance.

import type { UpiFailureModeSchema } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useRef, useState } from 'react'
import { Button, Paragraph, Text, View, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { CallHelplineCTA } from '../claim/CallHelplineCTA'
import { UPIIntentButton } from './UPIIntentButton'

type UpiFailureMode = UpiFailureModeSchema

const NS = { namespace: 'contribution' } as const

/** The chooser order (AC1). `other` is a bounded catch-all, LAST — never a free-text escape hatch. */
const MODES: readonly UpiFailureMode[] = [
  'insufficient_balance',
  'wrong_pin',
  'app_issue',
  'network_issue',
  'other',
]

/**
 * The mode-appropriate next-step guidance (AC2). `retry` re-launches the UPI Intent; `switchApp` / bank
 * are text. The helpline is offered on EVERY mode (the universal fallback). E.g. insufficient balance →
 * contact bank + retry later; network → retry; app issue → switch app; wrong PIN → retry.
 */
const GUIDANCE: Record<UpiFailureMode, { retry: boolean; switchApp: boolean; contactBank: boolean }> = {
  insufficient_balance: { retry: true, switchApp: false, contactBank: true },
  wrong_pin: { retry: true, switchApp: false, contactBank: false },
  app_issue: { retry: true, switchApp: true, contactBank: false },
  network_issue: { retry: true, switchApp: false, contactBank: false },
  other: { retry: true, switchApp: true, contactBank: true },
}

export interface UpiFailureCoachProps {
  /** The current server-authoritative `upi://pay` URL, when one exists — enables the "try again" retry
   * (re-launching <UPIIntentButton>). Absent on the no-VPA/unassigned paths (no live intent to retry). */
  readonly upiUrl?: string
  /** Called when a retry successfully re-launches the UPI app — lets the parent reveal the UTR-paste step. */
  readonly onRetryLaunched?: () => void
  /** An optional pre-HIGHLIGHT hint (D1/D3) — e.g. a no-app / launch error suggests "app issue". The member
   * still confirms by tapping; this only styles the suggested button, it never auto-selects. */
  readonly suggestedMode?: UpiFailureMode
  /** Fires whenever the chooser/guidance state flips (a mode gets picked, or "change answer" resets to
   * null) — lets the parent hide its own outer helpline/retry affordances while the coach's own guidance
   * (which offers the same helpline + retry) is showing, avoiding two "Call us" / "pay again" CTAs at once
   * (review finding). */
  readonly onModeSelected?: (mode: UpiFailureMode | null) => void
}

export function UpiFailureCoach({
  upiUrl,
  onRetryLaunched,
  suggestedMode,
  onModeSelected,
}: UpiFailureCoachProps): React.ReactElement {
  const t = useT()
  const [mode, setMode] = useState<UpiFailureMode | null>(null)
  const [retryFailedAgain, setRetryFailedAgain] = useState(false)
  // Guards a rapid double-tap on two different mode buttons before the chooser unmounts on re-render —
  // without it, two `reportUpiFailure` calls could fire for one failure event (review finding).
  const selectingRef = useRef(false)

  function onSelect(selected: UpiFailureMode): void {
    if (selectingRef.current) return
    selectingRef.current = true
    setMode(selected)
    onModeSelected?.(selected)
    // Fire-and-forget analytics — NEVER block the UI on telemetry (the PoolOnboardingTutorial idiom).
    void memberAuth.reportUpiFailure(selected).catch(() => undefined)
  }

  function onChangeAnswer(): void {
    selectingRef.current = false
    setRetryFailedAgain(false)
    setMode(null)
    onModeSelected?.(null)
  }

  // ── The mode chooser (AC1) — 5 accessible ≥44pt buttons; the member self-classifies. ────────────────
  if (mode === null) {
    return (
      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$4" color="$color" accessibilityRole="header">
          {t('upi_failure.prompt', undefined, NS)}
        </Text>
        {MODES.map((m) => (
          <Button
            key={m}
            height={48}
            theme={m === suggestedMode ? 'yellow' : undefined}
            onPress={() => onSelect(m)}
            accessibilityRole="button"
            accessibilityLabel={t(`upi_failure.mode.${m}.a11y`, undefined, NS)}
          >
            {t(`upi_failure.mode.${m}`, undefined, NS)}
          </Button>
        ))}
      </YStack>
    )
  }

  // ── The mode-specific empathy copy + next-step guidance (AC2) — announced polite (AC5). ─────────────
  const g = GUIDANCE[mode]
  return (
    <View accessibilityLiveRegion="polite">
      <YStack gap="$3">
        <Paragraph accessibilityRole="text">{t(`upi_failure.body.${mode}`, undefined, NS)}</Paragraph>

        {g.contactBank ? (
          <Paragraph accessibilityRole="text">
            {t('upi_failure.guidance.contact_bank', undefined, NS)}
          </Paragraph>
        ) : null}
        {g.switchApp ? (
          <Paragraph accessibilityRole="text">
            {t('upi_failure.guidance.switch_app', undefined, NS)}
          </Paragraph>
        ) : null}

        {g.retry && upiUrl ? (
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {t('upi_failure.guidance.retry_text', undefined, NS)}
            </Text>
            <UPIIntentButton
              upiUrl={upiUrl}
              onLaunched={() => {
                setRetryFailedAgain(false)
                onRetryLaunched?.()
              }}
              onNoUpiApp={() => setRetryFailedAgain(true)}
              onLaunchError={() => setRetryFailedAgain(true)}
            />
            {retryFailedAgain ? (
              <Paragraph accessibilityRole="alert" color="$red10">
                {t('upi_failure.retry_failed_again', undefined, NS)}
              </Paragraph>
            ) : null}
          </YStack>
        ) : null}
        {g.retry && !upiUrl ? (
          <Paragraph accessibilityRole="text">{t('upi_failure.retry_unavailable', undefined, NS)}</Paragraph>
        ) : null}

        <CallHelplineCTA
          label={t('upi_failure.guidance.helpline_label', undefined, NS)}
          chromeless={false}
          theme="red"
          height={48}
        />

        <Button
          chromeless
          height={44}
          onPress={onChangeAnswer}
          accessibilityRole="button"
          accessibilityLabel={t('upi_failure.change_answer_a11y', undefined, NS)}
        >
          {t('upi_failure.change_answer', undefined, NS)}
        </Button>
      </YStack>
    </View>
  )
}
