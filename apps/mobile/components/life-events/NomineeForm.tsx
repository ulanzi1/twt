// Shared nominee declaration form (Story 3.9, Task 8 — extracted from (signup)/nominees.tsx).
//
// The 1–2 nominee form body reused by BOTH the signup nominee step and the Life Events nominee
// update. It owns the nominee field state (name / relationship / mobile / optional address) + the
// dignified client-side validation (Pattern 4) + the fixed 75/25 split display; the PARENT owns the
// submit semantics (signup → nomineesDeclare → next wizard step; Life Events → step-up-gated
// lifeEventsUpdateNominees). The server derives the split (R4) — the form never sends a percentage.
//
// `onFormsChange` lets a parent persist the in-progress state (Life Events save-and-resume);
// `initialForms` restores it. `footer` slots parent-owned content (e.g. the step-up OTP input or the
// signup reassurance blocks) directly above the submit CTA. Bilingual + accessible (the (signup)
// screen's a11y posture: labels + hints, announced split + validation).

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

/** The nominee-relationship value set — value-aligned with the contracts NomineeRelationship. */
export const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'] as const
export type Relationship = (typeof RELATIONSHIPS)[number]

export interface NomineeFormEntry {
  name: string
  relationship: Relationship | ''
  mobile: string
  address: string
}

/** The server-bound nominee shape the parent submits (optional address omitted when blank). */
export interface NomineeSubmitEntry {
  name: string
  relationship: Relationship
  mobile: string
  address?: string
}

const EMPTY: NomineeFormEntry = { name: '', relationship: '', mobile: '', address: '' }

export interface NomineeFormProps {
  title: string
  intro: string
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: (nominees: NomineeSubmitEntry[]) => void
  /** Restore persisted in-progress state (Life Events save-and-resume). */
  initialForms?: NomineeFormEntry[]
  /** Called on every edit so a parent can persist the draft. */
  onFormsChange?: (forms: NomineeFormEntry[]) => void
  /** Parent-owned content rendered directly above the submit CTA (reassurance blocks / OTP input). */
  footer?: React.ReactNode
  /** Clears the parent-supplied error on any edit. */
  onEdit?: () => void
}

export function NomineeForm(props: NomineeFormProps) {
  const t = useT()
  const [inlineError, setInlineError] = useState<string | null>(null)
  // `initialForms` restores a persisted draft (Life Events save-and-resume). It is read ONCE here;
  // the parent forces a fresh read of a later-arriving draft by remounting via a changed `key` prop
  // (so this stays a simple uncontrolled form rather than syncing props→state on every render).
  const [forms, setForms] = useState<NomineeFormEntry[]>(
    props.initialForms && props.initialForms.length > 0 ? props.initialForms : [{ ...EMPTY }],
  )

  const hasSecond = forms.length === 2

  function commit(next: NomineeFormEntry[]): void {
    setForms(next)
    props.onFormsChange?.(next)
    props.onEdit?.()
  }

  function patch(index: number, field: keyof NomineeFormEntry, value: string): void {
    commit(forms.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  function addSecond(): void {
    if (forms.length === 1) commit([...forms, { ...EMPTY }])
  }

  function removeSecond(): void {
    commit(forms.slice(0, 1))
  }

  /** Dignified validation (Pattern 4) — every nominee needs name/relationship/mobile. */
  function firstValidationError(): string | null {
    for (const f of forms) {
      if (!f.name.trim()) return t('nominees.name_required')
      if (!f.relationship) return t('nominees.relationship_required')
      if (!f.mobile.trim()) return t('nominees.mobile_required')
    }
    return null
  }

  function onSubmit(): void {
    // Client-side dignified validation (Pattern 4) is rendered inline here; the parent's `error`
    // channel carries submit/transport failures. Both surface in the single alert region below.
    const validationError = firstValidationError()
    if (validationError) {
      setInlineError(validationError)
      return
    }
    setInlineError(null)
    const nominees: NomineeSubmitEntry[] = forms.map((f) => ({
      name: f.name.trim(),
      relationship: f.relationship as Relationship,
      mobile: f.mobile.trim(),
      ...(f.address.trim() ? { address: f.address.trim() } : {}),
    }))
    props.onSubmit(nominees)
  }

  const shownError = inlineError ?? props.error

  return (
    <YStack gap="$4" px="$6" py="$6" bg="$background">
      <H2 accessibilityRole="header">{props.title}</H2>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {props.intro}
      </Paragraph>

      {forms.map((f, index) => (
        <YStack key={index} gap="$3">
          <Text fontWeight="600" accessibilityRole="header">
            {index === 0 ? t('nominees.primary_label') : t('nominees.secondary_label')}
          </Text>

          <Input
            value={f.name}
            onChangeText={(v) => patch(index, 'name', v)}
            placeholder={t('nominees.name')}
            height={48}
            accessibilityLabel={t('nominees.name')}
            accessibilityHint={t('nominees.name_help')}
          />

          <Text accessibilityRole="text">{t('nominees.relationship')}</Text>
          <XStack gap="$2" flexWrap="wrap" accessibilityHint={t('nominees.relationship_help')}>
            {RELATIONSHIPS.map((rel) => {
              const selected = f.relationship === rel
              return (
                <Button
                  key={rel}
                  size="$3"
                  theme={selected ? 'accent' : undefined}
                  chromeless={!selected}
                  accessibilityRole="button"
                  accessibilityLabel={t(`nominees.relationship_${rel}`)}
                  accessibilityState={{ selected }}
                  onPress={() => patch(index, 'relationship', rel)}
                >
                  {t(`nominees.relationship_${rel}`)}
                </Button>
              )
            })}
          </XStack>

          <Input
            value={f.mobile}
            onChangeText={(v) => patch(index, 'mobile', v)}
            placeholder={t('nominees.mobile')}
            keyboardType="phone-pad"
            height={48}
            accessibilityLabel={t('nominees.mobile')}
            accessibilityHint={t('nominees.mobile_help')}
          />

          <Input
            value={f.address}
            onChangeText={(v) => patch(index, 'address', v)}
            placeholder={t('nominees.address')}
            height={48}
            accessibilityLabel={t('nominees.address')}
            accessibilityHint={t('nominees.address_help')}
          />
        </YStack>
      ))}

      {hasSecond ? (
        <Button
          chromeless
          height={48}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.remove_second')}
          onPress={removeSecond}
        >
          {t('nominees.remove_second')}
        </Button>
      ) : (
        <Button
          chromeless
          height={48}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.add_second')}
          onPress={addSecond}
        >
          {t('nominees.add_second')}
        </Button>
      )}

      <Text accessibilityRole="text" accessibilityLiveRegion="polite">
        {hasSecond ? t('nominees.split_75_25') : t('nominees.split_sole')}
      </Text>

      {props.footer}

      {shownError ? (
        <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
          {shownError}
        </Text>
      ) : null}

      <Button
        theme="accent"
        height={56}
        disabled={props.busy}
        accessibilityRole="button"
        accessibilityLabel={props.submitLabel}
        accessibilityState={{ disabled: props.busy }}
        onPress={onSubmit}
      >
        {props.busy ? <Spinner /> : props.submitLabel}
      </Button>
    </YStack>
  )
}
