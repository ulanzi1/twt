// Pool Engine Onboarding Tutorial — the 3-screen member-facing intro (Story 7.10, Task 3; AC1/AC3/AC5).
//
// A UX-DR79 Phase-1 launch-blocker. Self-contained, member-driven 3-step walkthrough:
//   Screen 1 — "What is a pool?" (pool-bound semantics: one pool per cycle, helps one nominee family).
//   Screen 2 — "Your pool's letter code" (the letter code, e.g. "Pool A", is EDUCATIONAL only — NOT a
//              live assignment fetch, which is Epic 8's My Pool card; explains the dual-identifier
//              CONCEPT — a curated name may additionally apply once assigned — WITHOUT naming an example,
//              since Story 7.2 ships TWT-Bihar's naming registry empty at launch).
//   Screen 3 — "If you accidentally pay outside the system" (UX-DR76 out-of-band policy: direct-to-family
//              gifts honored dignifiedly; a wrong-pool payment is recovered by the helpdesk WITHOUT
//              breaking the assignment — Story 7.6 facilitated-recovery invariant, no-blame framing).
//
// ── Accessibility discipline (Story 0.10 / P0-2c — AC3/AC5 load-bearing) ────────────────────────────
// Mirrors LockInClockWidget.tsx:22-25 across the 3 steps:
//   · Every control ≥44pt, accessibilityRole="button", an action-NAMING accessibilityLabel (WCAG 2.5.3
//     Label-in-Name) + an accessibilityHint. Body text carries role="text".
//   · Focus management: on each step change the screen-reader focus moves to the step heading (so
//     TalkBack reads the NEW screen, not stale content) via AccessibilityInfo.setAccessibilityFocus.
//   · The heading is a single accessible node with accessibilityLiveRegion="polite" (calm ambient —
//     never "assertive", which is for errors) carrying the "Screen two: …" progress announcement, so
//     the transition is also announced even when focus is elsewhere.
//   · Reduced-motion: there is NO auto-advancing carousel and NO per-frame animation — advancing is
//     member-driven Next/Back ONLY. With no motion to suppress, the platform reduce-motion setting is
//     honored by construction.
//
// ── Tone (UX spec / passbook register) ──────────────────────────────────────────────────────────────
// Calm, dignified, no urgency theater. Hindi-first (@twt/i18n default locale 'hi') with hi↔en parity.
//
// ── Outcome recording (AC4) ─────────────────────────────────────────────────────────────────────────
// The MMKV gate flag is set FIRST (authoritative, offline-resilient suppressor) via the shared
// usePoolOnboardingGate hook; the member-level analytics event is then fired best-effort / fire-and-
// forget (a failed POST NEVER blocks dismissal nor re-shows the tutorial). Completion and skip are
// distinct outcomes; skipping is permitted. Then the route is dismissed.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Alert, findNodeHandle, InteractionManager, ScrollView, View } from 'react-native'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, XStack, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { usePoolOnboardingGate } from './usePoolOnboardingGate'

/** The three screens, in order. `bodies` may hold one or two paragraphs. */
const STEPS = [
  { key: 'screen1', bodyKeys: ['screen1.body'] },
  { key: 'screen2', bodyKeys: ['screen2.body', 'screen2.body2'] },
  { key: 'screen3', bodyKeys: ['screen3.body', 'screen3.body2'] },
] as const

const TOTAL_STEPS = STEPS.length

/** All tutorial copy lives in the `pool-onboarding` i18n namespace (not the default `common`). */
const NS = { namespace: 'pool-onboarding' } as const

export function PoolOnboardingTutorial() {
  const rawT = useT()
  const t = useCallback((key: string, params?: Record<string, string | number>) => rawT(key, params, NS), [rawT])
  const router = useRouter()
  const { markCompleted, markSkipped } = usePoolOnboardingGate()

  // 0-indexed internal step state (member-driven; no auto-advance).
  const [stepIndex, setStepIndex] = useState(0)
  const headingRef = useRef<View>(null)

  const step = STEPS[stepIndex]!
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOTAL_STEPS - 1

  // Focus management (AC3): on each step change move the screen-reader focus to the step heading so
  // TalkBack reads the new screen. Runs on mount too (announces Screen 1 on open). Deferred via
  // InteractionManager so the focus call fires after the modal-presentation/re-render transition
  // settles — calling it synchronously risks the heading node not yet being registered in the native
  // accessibility tree, silently dropping the focus announcement.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const node = headingRef.current ? findNodeHandle(headingRef.current) : null
      if (node != null) {
        AccessibilityInfo.setAccessibilityFocus(node)
      }
    })
    return () => task.cancel()
  }, [stepIndex])

  const onBack = useCallback((): void => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const onNext = useCallback((): void => {
    setStepIndex((i) => Math.min(TOTAL_STEPS - 1, i + 1))
  }, [])

  // Guards recordAndDismiss against a double-tap (Done pressed twice, or the Skip-confirm alert button
  // double-fired) racing a second outcome POST / audit line before the first dismiss() completes.
  const hasRecordedRef = useRef(false)

  const dismiss = useCallback((): void => {
    if (router.canGoBack()) {
      router.back()
    } else {
      // No back stack to pop (e.g. the route was entered directly, not pushed) — fall back to home
      // rather than leaving the member stranded on a modal that already recorded its outcome.
      router.replace('/(tabs)')
    }
  }, [router])

  /** Record an outcome: MMKV flag FIRST (authoritative), analytics POST best-effort, then dismiss. */
  const recordAndDismiss = useCallback(
    (outcome: 'completed' | 'skipped'): void => {
      if (hasRecordedRef.current) return
      hasRecordedRef.current = true
      if (outcome === 'completed') {
        markCompleted()
      } else {
        markSkipped()
      }
      // Fire-and-forget: never block dismissal or re-show the tutorial on a failed POST. The MMKV flag
      // (set synchronously above) remains the authoritative suppressor.
      void memberAuth.recordPoolOnboardingOutcome(outcome).catch(() => undefined)
      dismiss()
    },
    [markCompleted, markSkipped, dismiss],
  )

  const onDone = useCallback((): void => {
    recordAndDismiss('completed')
  }, [recordAndDismiss])

  /** Persistent Skip → a confirm ("Skip for now? You can view this anytime from settings"). */
  const onSkip = useCallback((): void => {
    Alert.alert(t('skip_confirm.title'), t('skip_confirm.body'), [
      { text: t('skip_confirm.cancel'), style: 'cancel' },
      { text: t('skip_confirm.confirm'), onPress: () => recordAndDismiss('skipped') },
    ])
  }, [t, recordAndDismiss])

  return (
    <ScrollView>
      <YStack gap="$4" px="$6" py="$6" bg="$background" minH="100%">
        {/* Step heading — a single accessible node; focus lands here on step change (AC3). The
            live-region label carries the "Screen two: …" progress announcement (never assertive). */}
        <View
          ref={headingRef}
          accessible
          accessibilityRole="header"
          accessibilityLabel={t(`${step.key}.progress_a11y`)}
          accessibilityLiveRegion="polite"
        >
          <H2>{t(`${step.key}.title`)}</H2>
        </View>

        <YStack gap="$3">
          {step.bodyKeys.map((bodyKey) => (
            <Paragraph key={bodyKey} fontFamily="$body" color="$color" accessibilityRole="text">
              {t(bodyKey)}
            </Paragraph>
          ))}
        </YStack>

        {/* Controls — member-driven Next/Back, a persistent Skip, and Done on the last screen. All ≥44pt. */}
        <YStack gap="$3" mt="$4">
          <XStack gap="$3">
            {!isFirst ? (
              <Button
                flex={1}
                height={44}
                accessibilityRole="button"
                accessibilityLabel={t('button.back_a11y')}
                accessibilityHint={t('button.back_hint')}
                onPress={onBack}
              >
                {t('button.back')}
              </Button>
            ) : null}

            {!isLast ? (
              <Button
                flex={1}
                height={44}
                accessibilityRole="button"
                accessibilityLabel={t('button.next_a11y')}
                accessibilityHint={t('button.next_hint')}
                onPress={onNext}
              >
                {t('button.next')}
              </Button>
            ) : (
              <Button
                flex={1}
                height={44}
                accessibilityRole="button"
                accessibilityLabel={t('button.done_a11y')}
                accessibilityHint={t('button.done_hint')}
                onPress={onDone}
              >
                {t('button.done')}
              </Button>
            )}
          </XStack>

          {/* Persistent, low-prominence Skip (a member choice, never nagged). */}
          <Button
            chromeless
            height={44}
            justify="center"
            opacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('button.skip_a11y')}
            accessibilityHint={t('button.skip_hint')}
            onPress={onSkip}
          >
            {t('button.skip')}
          </Button>
        </YStack>
      </YStack>
    </ScrollView>
  )
}
