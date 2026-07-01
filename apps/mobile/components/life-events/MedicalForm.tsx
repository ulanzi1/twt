// Shared medical-disclosure form (Story 3.9, Task 8 — extracted from (signup)/medical.tsx).
//
// The IMA-condition multi-select + free-text context + mandatory concealment-denial ack, reused by
// BOTH the signup medical step and the Life Events medical update. It loads the bilingual IMA catalog
// + ack copy itself (memberAuth.medicalImaList), owns the selection/ack state, and enforces the
// client-side ack gate; the PARENT owns the submit semantics (signup → medicalDisclose → next step;
// Life Events → step-up-gated lifeEventsUpdateMedical). Append-only history — every submit preserves
// a row (Epic 4 walks the full history).
//
// `onDraftChange` lets a parent persist the in-progress selection (Life Events save-and-resume);
// `initialSelected` / `initialContext` restore it. `footer` slots parent content (step-up OTP input).
// Bilingual + accessible (the (signup) screen's a11y posture).

import { useEffect, useState } from 'react'

import { useLocale, useT } from '@twt/i18n/react'
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

/** The server-bound disclosure payload the parent submits. */
export interface MedicalSubmitPayload {
  conditionCodes: string[]
  additionalContext?: string
  imaListVersion: string
  ackLocale: 'en' | 'hi'
}

export interface MedicalFormProps {
  title: string
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: (payload: MedicalSubmitPayload) => void
  initialSelected?: string[]
  initialContext?: string
  onDraftChange?: (draft: { selected: string[]; additionalContext: string }) => void
  footer?: React.ReactNode
  onEdit?: () => void
}

export function MedicalForm(props: MedicalFormProps) {
  const t = useT()
  const { locale } = useLocale()

  const [catalog, setCatalog] = useState<ImaCatalog | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [selected, setSelected] = useState<string[]>(props.initialSelected ?? [])
  const [additionalContext, setAdditionalContext] = useState(props.initialContext ?? '')
  const [acknowledged, setAcknowledged] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

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
    setInlineError(null)
    props.onEdit?.()
    setSelected((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      props.onDraftChange?.({ selected: next, additionalContext })
      return next
    })
  }

  function onContextChange(v: string): void {
    setAdditionalContext(v)
    props.onDraftChange?.({ selected, additionalContext: v })
  }

  function conditionLabel(c: ImaCondition): string {
    return locale === 'hi' ? c.labelHi : c.labelEn
  }

  function onSubmit(): void {
    if (!catalog) return
    if (!acknowledged) {
      setInlineError(t('medical.ack_required'))
      return
    }
    setInlineError(null)
    props.onSubmit({
      conditionCodes: selected,
      ...(additionalContext.trim() ? { additionalContext: additionalContext.trim() } : {}),
      imaListVersion: catalog.version,
      ackLocale: locale,
    })
  }

  if (loadFailed) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" py="$6" bg="$background">
        <H2 accessibilityRole="header">{props.title}</H2>
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

  if (!catalog) {
    return (
      <YStack flex={1} justify="center" items="center" gap="$4" px="$6" py="$6" bg="$background">
        <Spinner accessibilityLabel={t('loading')} />
      </YStack>
    )
  }

  const ackText = locale === 'hi' ? catalog.ackText.hi : catalog.ackText.en
  const shownError = inlineError ?? props.error

  return (
    <YStack gap="$4" px="$6" py="$6" bg="$background">
      <H2 accessibilityRole="header">{props.title}</H2>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('medical.intro')}
      </Paragraph>

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

      {selected.length === 0 ? (
        <Text color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('medical.no_conditions_reassurance')}
        </Text>
      ) : null}

      <Text accessibilityRole="text">{t('medical.additional_context_label')}</Text>
      <Input
        value={additionalContext}
        onChangeText={onContextChange}
        placeholder={t('medical.additional_context_placeholder')}
        multiline
        height={88}
        maxLength={2000}
        accessibilityLabel={t('medical.additional_context_label')}
        accessibilityHint={t('medical.additional_context_help')}
      />

      <Text accessibilityRole="text">{t('medical.ack_help')}</Text>
      <Paragraph color="$colorPress" accessibilityRole="text" accessibilityLiveRegion="polite">
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
          setInlineError(null)
          props.onEdit?.()
          setAcknowledged((v) => !v)
        }}
      >
        {(acknowledged ? '☑  ' : '☐  ') + ackText}
      </Button>

      {props.footer}

      {shownError ? (
        <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {shownError}
        </Text>
      ) : null}

      <Button
        theme="accent"
        height={56}
        disabled={props.busy || !acknowledged}
        accessibilityRole="button"
        accessibilityLabel={props.submitLabel}
        accessibilityState={{ disabled: props.busy || !acknowledged }}
        onPress={onSubmit}
      >
        {props.busy ? <Spinner /> : props.submitLabel}
      </Button>
    </YStack>
  )
}
