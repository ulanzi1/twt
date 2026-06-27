// Signup medical-disclosure step — disclose IMA-listed illnesses + the mandatory concealment-
// denial acknowledgment (Story 3.5, Task 8; AC1, AC2, AC5).
//
// Bilingual (Hindi-default via @twt/i18n). The member selects any of the listed serious
// illnesses (multi-select; ZERO is valid — most members disclose nothing, R5), optionally adds
// free-text context, and MUST check the concealment-denial acknowledgment to continue. The IMA
// condition labels + the acknowledgment copy are NOT i18n keys — they come bilingual from the
// `niy.medical.ima-list` / `niy.concealment.r14` clauses via GET .../ima-list (Option A); only the
// screen chrome is in @twt/i18n. On submit the api-client posts to /member/medical-disclosure →
// records a consent + emits member.medical_disclosed.
//
// ── Accessibility (AC5 / P0-2c) ─────────────────────────────────────────────────────────────
// Every control carries accessibilityLabel + accessibilityHint; the conditions are checkboxes
// (accessibilityRole=checkbox + accessibilityState.checked); the FULL acknowledgment text is
// announced (accessibilityLiveRegion) BEFORE the ack checkbox; the zero-selection state is
// conveyed in plain language; validation messages are announced (role=alert). The submit CTA is
// disabled until the ack is checked. Mobile build/test are repo no-ops → verified by typecheck +
// lint (the 3.4 precedent).
//
// Reachability note (R2): a real signup user reaches this step once Story 3.6 wires member-
// creation-from-`signup_continuation` + the wizard chrome (kyc → nominees → medical → payment).
// 3.5 ships the working screen + SDK; E2E reachability completes in 3.6.

import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import { useT, useLocale } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

interface ImaCondition {
  code: string
  labelEn: string
  labelHi: string
}

interface ImaCatalog {
  version: string
  conditions: ImaCondition[]
  ackText: { en: string; hi: string }
}

export default function MedicalScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()

  const [catalog, setCatalog] = useState<ImaCatalog | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [additionalContext, setAdditionalContext] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Load the IMA catalog + concealment-ack copy on mount (or retry). A 503 (registry
  // unprovisioned for the Pariwar) or any other failure renders the graceful "unavailable" state
  // (the screen cannot be rendered without the catalog + ack copy).
  useEffect(() => {
    let active = true
    setLoadFailed(false)
    void (async () => {
      try {
        const data = await memberAuth.medicalImaList()
        if (active) setCatalog(data)
      } catch {
        if (active) setLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount])

  function toggleCondition(code: string): void {
    setError(null)
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function conditionLabel(c: ImaCondition): string {
    return locale === 'hi' ? c.labelHi : c.labelEn
  }

  async function onSubmit(): Promise<void> {
    if (!catalog) return
    // Client-side gate (the server re-enforces per AC2/AC6): the ack is ALWAYS required.
    if (!acknowledged) {
      setError(t('medical.ack_required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.medicalDisclose({
        conditionCodes: selected,
        ...(additionalContext.trim() ? { additionalContext: additionalContext.trim() } : {}),
        imaListVersion: catalog.version,
        acknowledged: true,
        ackLocale: locale,
      })
      setDone(true)
    } catch {
      // A failed submit surfaces one dignified, plain-language line (Pattern 4). The server
      // already validated the shape; a 4xx/5xx here is transient or a session issue — retry.
      setError(t('medical.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  const errorBanner = error ? (
    <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {error}
    </Text>
  ) : null

  if (done) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('medical.done')}</H2>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('medical.done')}
          onPress={() => router.replace('/(tabs)')}
        >
          {t('medical.done')}
        </Button>
      </YStack>
    )
  }

  // The catalog could not be loaded (503 unprovisioned, or transient) — graceful unavailable state.
  if (loadFailed) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('medical.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('medical.unavailable')}
        </Paragraph>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('medical.retry')}
          onPress={() => setRetryCount((n) => n + 1)}
        >
          {t('medical.retry')}
        </Button>
      </YStack>
    )
  }

  // Still loading the catalog.
  if (!catalog) {
    return (
      <YStack flex={1} justify="center" items="center" gap="$4" px="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} />
      </YStack>
    )
  }

  const ackText = locale === 'hi' ? catalog.ackText.hi : catalog.ackText.en

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack gap="$4" px="$6" py="$6" bg="$background">
        <H2>{t('medical.title')}</H2>
        <Paragraph color="$colorPress" accessibilityRole="text">
          {t('medical.intro')}
        </Paragraph>

        {/* IMA condition multi-select — accessible checkboxes (bilingual labels from the clause). */}
        <Text fontWeight="600" accessibilityRole="header">
          {t('medical.conditions_label')}
        </Text>
        <Text accessibilityRole="text">{t('medical.conditions_help')}</Text>
        <YStack gap="$2">
          {catalog.conditions.map((c) => {
            const checked = selected.includes(c.code)
            return (
              <Button
                key={c.code}
                size="$3"
                theme={checked ? 'accent' : undefined}
                chromeless={!checked}
                justify="flex-start"
                accessibilityRole="checkbox"
                accessibilityLabel={conditionLabel(c)}
                accessibilityHint={t('medical.conditions_help')}
                accessibilityState={{ checked }}
                onPress={() => toggleCondition(c.code)}
              >
                {(checked ? '☑  ' : '☐  ') + conditionLabel(c)}
              </Button>
            )
          })}
        </YStack>

        {/* Zero-selection reassurance — conveyed in plain language when nothing is selected (R5). */}
        {selected.length === 0 ? (
          <Text color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
            {t('medical.no_conditions_reassurance')}
          </Text>
        ) : null}

        {/* Optional free-text additional context (Tier-1 encrypted server-side). */}
        <Text accessibilityRole="text">{t('medical.additional_context_label')}</Text>
        <Input
          value={additionalContext}
          onChangeText={setAdditionalContext}
          placeholder={t('medical.additional_context_placeholder')}
          multiline
          height={88}
          maxLength={2000}
          accessibilityLabel={t('medical.additional_context_label')}
          accessibilityHint={t('medical.additional_context_help')}
        />

        {/* The concealment-denial acknowledgment — the FULL clause copy is announced BEFORE the
            checkbox (AC5), then the member checks the box. The submit CTA is disabled until checked. */}
        <Text accessibilityRole="text">{t('medical.ack_help')}</Text>
        <Paragraph
          color="$colorPress"
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {ackText}
        </Paragraph>
        <Button
          size="$3"
          theme={acknowledged ? 'accent' : undefined}
          chromeless={!acknowledged}
          justify="flex-start"
          accessibilityRole="checkbox"
          accessibilityLabel={ackText}
          accessibilityHint={t('medical.ack_help')}
          accessibilityState={{ checked: acknowledged }}
          onPress={() => {
            setError(null)
            setAcknowledged((v) => !v)
          }}
        >
          {(acknowledged ? '☑  ' : '☐  ') + ackText}
        </Button>

        {errorBanner}

        <Button
          theme="accent"
          height={56}
          disabled={busy || !acknowledged}
          accessibilityRole="button"
          accessibilityLabel={t('medical.submit')}
          accessibilityState={{ disabled: busy || !acknowledged }}
          onPress={onSubmit}
        >
          {busy ? <Spinner /> : t('medical.submit')}
        </Button>
      </YStack>
    </ScrollView>
  )
}
