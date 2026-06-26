// Signup nominee step — declare 1–2 nominees with a fixed 75/25 split (Story 3.4, Task 7;
// AC1–AC3, AC6).
//
// Bilingual (Hindi-default via @twt/i18n). The member declares one nominee (100%) or adds a
// second (the split becomes a FIXED, read-only 75% / 25% — no override, R4; the server
// derives it). Two reassurance blocks make the scope explicit: NO nominee Aadhaar/KYC at
// signup (AC2) and NO nominee bank/IFSC at signup (AC3) — both collected only at claim time
// (Epic 6). On submit the api-client posts to /member/nominees → member.nominees_declared.
//
// ── Accessibility (AC6 / P0-2c) ─────────────────────────────────────────────────────────
// Every field carries accessibilityLabel + accessibilityHint; the fixed-split text and the
// two reassurance copy blocks are announced (accessibilityLiveRegion / role=text). Validation
// messages are announced (role=alert). Touch targets meet UX-DR65 (44pt default / 56pt CTA).
// Mobile build/test are repo no-ops → verified by typecheck + lint (the 3.3b precedent).
//
// Reachability note (R2): a real signup user reaches this step once Story 3.6 wires member-
// creation-from-`signup_continuation` + the wizard chrome (kyc → nominees → medical → payment).
// 3.4 ships the working screen + SDK; E2E reachability completes in 3.6.

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

/** The nominee-relationship value set — value-aligned with the contracts NomineeRelationship. */
const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'] as const
type Relationship = (typeof RELATIONSHIPS)[number]

interface NomineeForm {
  name: string
  relationship: Relationship | ''
  mobile: string
  address: string
}

const EMPTY: NomineeForm = { name: '', relationship: '', mobile: '', address: '' }

export default function NomineesScreen() {
  const t = useT()
  const router = useRouter()

  // forms[0] = primary; forms[1] (when present) = secondary. 1–2 entries (AC1).
  const [forms, setForms] = useState<NomineeForm[]>([{ ...EMPTY }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const hasSecond = forms.length === 2

  function patch(index: number, field: keyof NomineeForm, value: string): void {
    setForms((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)))
  }

  function addSecond(): void {
    setError(null)
    setForms((prev) => (prev.length === 1 ? [...prev, { ...EMPTY }] : prev))
  }

  function removeSecond(): void {
    setError(null)
    setForms((prev) => prev.slice(0, 1))
  }

  /** Client-side dignified validation (Pattern 4) — every nominee needs name/relationship/mobile. */
  function firstValidationError(): string | null {
    for (const f of forms) {
      if (!f.name.trim()) return t('nominees.name_required')
      if (!f.relationship) return t('nominees.relationship_required')
      if (!f.mobile.trim()) return t('nominees.mobile_required')
    }
    return null
  }

  async function onSubmit(): Promise<void> {
    const validationError = firstValidationError()
    if (validationError) {
      setError(validationError)
      return
    }
    setBusy(true)
    setError(null)
    try {
      // The 75/25 split is NOT sent — the server derives it from the count (R4). We send only
      // name/relationship/mobile + optional address per nominee.
      const nominees = forms.map((f) => ({
        name: f.name.trim(),
        relationship: f.relationship as Relationship,
        mobile: f.mobile.trim(),
        ...(f.address.trim() ? { address: f.address.trim() } : {}),
      }))
      await memberAuth.nomineesDeclare({ nominees })
      setDone(true)
    } catch {
      // A failed declare surfaces one dignified, plain-language line (Pattern 4). The server
      // already validated the shape; a 4xx/5xx here is transient or a session issue — the
      // member simply retries (unlike KYC, there is no provider-specific error branching).
      setError(t('nominees.error_generic'))
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
        <H2>{t('nominees.done')}</H2>
        <Text color="#1E8E3E" accessibilityLiveRegion="polite">
          {t('nominees.done')}
        </Text>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.done')}
          onPress={() => router.replace('/(tabs)')}
        >
          {t('nominees.done')}
        </Button>
      </YStack>
    )
  }

  return (
    <YStack flex={1} gap="$4" px="$6" py="$6" bg="$background">
      <H2>{t('nominees.title')}</H2>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('nominees.intro')}
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

          {/* Relationship picker — selectable chips (accessible buttons with selected state). */}
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

      {/* Add / remove the second nominee. */}
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

      {/* The fixed split — read-only, announced (AC1: no override when two nominees). */}
      <Text accessibilityRole="text" accessibilityLiveRegion="polite">
        {hasSecond ? t('nominees.split_75_25') : t('nominees.split_sole')}
      </Text>

      {/* AC2 — no nominee KYC at signup; AC3 — no nominee bank at signup. Both announced. */}
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('nominees.no_kyc_reassurance')}
      </Paragraph>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('nominees.no_bank_reassurance')}
      </Paragraph>

      {errorBanner}

      <Button
        theme="accent"
        height={56}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('nominees.submit')}
        onPress={onSubmit}
      >
        {busy ? <Spinner /> : t('nominees.submit')}
      </Button>
    </YStack>
  )
}
