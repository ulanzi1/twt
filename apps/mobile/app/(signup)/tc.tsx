// Signup Terms & Conditions step — read + accept the current effective T&C (Story 3.6a, Task 6; AC3/AC4).
//
// The FIRST wizard step (R6: accept terms first). Fetches GET /member/terms (the precomputed,
// server-sanitized T&C body — this screen does NOT run any markdown renderer; it adapts the ready
// HTML to plain text for RN display, since mobile has no DOM `set:html`). The member must scroll
// through the full terms before the accept CTA enables; accepting POSTs /member/terms/accept (records
// a tc_acceptance consent) and advances to the KYC step. A 503/unavailable state renders a graceful
// retry affordance (mirror 3.5's medical.tsx loadFailed pattern).
//
// ── Accessibility (AC4 / P0-2c) ───────────────────────────────────────────────────────────────
// Every control carries accessibilityLabel + accessibilityHint; the accept checkbox announces its
// state; validation/errors are announced (role=alert). The whole screen is ScrollView-wrapped
// (3.5 review patch: a bare flex container clips the CTA on small devices). Bilingual via @twt/i18n.

import { useEffect, useState } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { ScrollView } from 'react-native'

import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

interface EffectiveTerms {
  tcVersionId: string
  effectiveFrom: string
  html: string
  locale: 'en' | 'hi'
}

/**
 * Adapt the server's precomputed, sanitized T&C HTML to plain text for RN display (mobile has no
 * DOM). NOT a markdown renderer — a minimal tag-strip + entity-decode of an already-rendered,
 * allowlist-sanitized body. Block tags become line breaks so the legal text stays readable.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function TcScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()

  const [terms, setTerms] = useState<EffectiveTerms | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [viewed, setViewed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Load the current effective T&C on mount (or retry). A 503 (unprovisioned for the Pariwar) or any
  // other failure renders the graceful "unavailable" state.
  useEffect(() => {
    let active = true
    setLoadFailed(false)
    void (async () => {
      try {
        const data = await memberAuth.memberTerms(locale)
        if (active) setTerms(data)
      } catch {
        if (active) setLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount, locale])

  // Enable the accept CTA only once the member has scrolled to the end of the terms (read-in-full).
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      setViewed(true)
    }
  }

  async function onAccept(): Promise<void> {
    if (!terms || !accepted) {
      setError(t('tc.accept_hint'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.memberTermsAccept({ tcVersionId: terms.tcVersionId, locale })
      setDone(true)
      router.replace('/(signup)/kyc')
    } catch {
      setError(t('tc.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  // The terms could not be loaded (503 unprovisioned, or transient) — graceful unavailable state.
  if (loadFailed) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('tc.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('tc.unavailable')}
        </Paragraph>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('tc.retry')}
          onPress={() => setRetryCount((n) => n + 1)}
        >
          {t('tc.retry')}
        </Button>
      </YStack>
    )
  }

  // Still loading the terms.
  if (!terms) {
    return (
      <YStack flex={1} justify="center" items="center" gap="$4" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} />
      </YStack>
    )
  }

  const body = htmlToPlainText(terms.html)
  const canAccept = viewed && accepted && !busy && !done

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} onScroll={onScroll} scrollEventThrottle={64}>
      <YStack gap="$4" px="$6" py="$6" bg="$background">
        <H2>{t('tc.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text">
          {t('tc.intro')}
        </Paragraph>

        {/* The current effective T&C body (server-rendered + sanitized; shown as readable text). */}
        <Paragraph accessibilityRole="text">{body}</Paragraph>

        {/* Read-in-full hint until the member scrolls to the end (gates the accept checkbox). */}
        {!viewed ? (
          <Text color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
            {t('tc.read_more')}
          </Text>
        ) : null}

        {/* The accept checkbox — enabled once the terms have been scrolled through. */}
        <Button
          size="$3"
          theme={accepted ? 'accent' : undefined}
          chromeless={!accepted}
          justify="flex-start"
          disabled={!viewed}
          accessibilityRole="checkbox"
          accessibilityLabel={t('tc.accept_cta')}
          accessibilityHint={t('tc.accept_hint')}
          accessibilityState={{ checked: accepted, disabled: !viewed }}
          onPress={() => {
            setError(null)
            setAccepted((v) => !v)
          }}
        >
          {(accepted ? '☑  ' : '☐  ') + t('tc.accept_cta')}
        </Button>

        {error ? (
          <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {error}
          </Text>
        ) : null}

        <Button
          theme="accent"
          height={56}
          disabled={!canAccept}
          accessibilityRole="button"
          accessibilityLabel={t('tc.continue')}
          accessibilityState={{ disabled: !canAccept }}
          onPress={onAccept}
        >
          {busy ? <Spinner /> : t('tc.continue')}
        </Button>
      </YStack>
    </ScrollView>
  )
}
