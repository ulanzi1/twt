// The FAMILY's nominee CORRECTION request — Story 6.20 (Task 8; AC7, AC8; D7, CC2).
//
// Once a claim is filed the nominee declaration is LOCKED (`2026-09-20-233` / `-234` V). A detail entered
// incorrectly can still be corrected — `-234` W — through ONE request the District Admin approves first
// and the Pariwar Admin second (`-236` Z). This screen RAISES that request from the app (CC2, `-237`
// cl.3); the helpline can raise the same request on the family's behalf.
//
//   · Ravi-mode: the session IS the deceased member's, so the claim id comes from the member's own claim
//     draft (stamped at intake) — ⭐ or, once intake is acknowledged and the draft CLEARED, the filed-claim
//     pointer `acknowledgement.tsx` stamps first (code review 2026-09-24: reading the draft alone sent every
//     finished claim to "no claim"). No claim on this device (e.g. the helpline filed it) ⇒ a dignified
//     "call the helpline" state.
//   · The relationship picker offers only KNOWN relationships — `other` FORECLOSES a correction
//     (`-237` cl.2); the server refuses it at the raise with a typed 409, which this screen explains.
//   · Behind the `nominee_change` step-up (AR-24), exactly like the Life Events nominee update.
//   · The draft persists in MMKV (the life-events draft store — cleared on sign-out).
//   · ⚠ Not 6.18's BANK "correction" — this changes WHO the nominee is on record, not an account.

import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import { isEnglishScriptName } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, TextArea, XStack, YStack } from 'tamagui'

import { KNOWN_RELATIONSHIPS, type Relationship } from '../../components/life-events/NomineeForm'
import { clearDraft, loadDraft, saveDraft } from '../../components/life-events/draft-store'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { claimApi } from '../../lib/claim-api'
import { loadClaimDraft } from '../../lib/claim-draft'
import { getFiledClaimCaseId } from '../../lib/filed-claim'
import { correctionErrorKey } from '../../lib/nominee-correction'
import { useSession } from '../../lib/session-context'

const DRAFT_KEY = 'nominee-correction'

export interface CorrectionDraft {
  rank: 1 | 2
  name: string
  relationship: Relationship | ''
  mobile: string
  address: string
  note: string
}

const EMPTY: CorrectionDraft = { rank: 1, name: '', relationship: '', mobile: '', address: '', note: '' }

export default function NomineeCorrectionScreen() {
  const t = useT()
  const router = useRouter()
  const { session, isLoading: sessionLoading } = useSession()
  const memberId = session?.memberId ?? ''
  const claimCaseId = memberId ? (loadClaimDraft(memberId).claimCaseId ?? getFiledClaimCaseId(memberId) ?? undefined) : undefined
  const stepUp = useStepUpGate('nominee_change')

  const [form, setForm] = useState<CorrectionDraft>(() => (memberId ? loadDraft<CorrectionDraft>(memberId, DRAFT_KEY) : null) ?? EMPTY)
  // ⭐ The session can resolve AFTER the first render (it starts loading) — restore the member's saved
  // draft then, rather than never (the lazy initializer above ran once, with no member).
  useEffect(() => {
    if (!memberId) return
    // ⛔ Never another member's typed draft (code review 2026-09-24b): no saved draft ⇒ a clean form.
    setForm(loadDraft<CorrectionDraft>(memberId, DRAFT_KEY) ?? EMPTY)
  }, [memberId])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function patch<K extends keyof CorrectionDraft>(key: K, value: CorrectionDraft[K]): void {
    const next = { ...form, [key]: value }
    setForm(next)
    saveDraft(memberId, DRAFT_KEY, next)
    setError(null)
  }

  function validationError(): string | null {
    if (!form.name.trim()) return t('nominees.name_required')
    if (!isEnglishScriptName(form.name)) return t('nominees.name_english')
    if (!form.relationship) return t('nominees.relationship_required')
    if (!form.mobile.trim()) return t('nominees.mobile_required')
    if (!form.note.trim()) return t('nominee_correction.note_required')
    return null
  }

  function request() {
    return claimApi.raiseNomineeCorrection(claimCaseId!, {
      rank: form.rank,
      proposed: {
        name: form.name.trim(),
        relationship: form.relationship as Relationship,
        mobile: form.mobile.trim(),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      },
      note: form.note.trim(),
    })
  }

  async function run(fn: () => Promise<unknown>, onFailure?: (err: unknown) => void): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const result = await fn()
      if (result !== undefined) {
        clearDraft(memberId, DRAFT_KEY)
        setDone(true)
      }
    } catch (err) {
      setError(t(correctionErrorKey(err)))
      onFailure?.(err)
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(): Promise<void> {
    const v = validationError()
    if (v) {
      setError(v)
      return
    }
    await run(() => stepUp.guard(request))
  }

  // ⭐ While the session is still loading there is no member yet — ⛔ never render (and announce) the "no
  // claim, call the helpline" dead end in the meantime (code review 2026-09-24b).
  if (sessionLoading) {
    return (
      <YStack flex={1} items="center" justify="center" bg="$background" testID="nominee-correction-loading">
        <Stack.Screen options={{ title: t('nominee_correction.title') }} />
        <Spinner accessibilityLabel={t('nominee_correction.title')} />
      </YStack>
    )
  }

  if (!claimCaseId) {
    return (
      // Text only — grouping it as ONE accessible element reads it as a single announcement.
      <YStack gap="$4" px="$6" py="$6" bg="$background" accessible={true}>
        <Stack.Screen options={{ title: t('nominee_correction.title') }} />
        <H2 accessibilityRole="header">{t('nominee_correction.title')}</H2>
        <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('nominee_correction.no_claim')}
        </Paragraph>
      </YStack>
    )
  }

  if (done) {
    return (
      // ⛔ NOT `accessible={true}` (family 13(a), code review 2026-09-24): a grouped container is ONE
      // element to a screen reader, which swallowed the Button — the screen's only way back.
      <YStack gap="$4" px="$6" py="$6" bg="$background" testID="nominee-correction-done">
        <Stack.Screen options={{ title: t('nominee_correction.title') }} />
        <H2 accessibilityRole="header">{t('nominee_correction.submitted_title')}</H2>
        <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('nominee_correction.submitted_body')}
        </Paragraph>
        <Button
          height={48}
          accessibilityRole="button"
          accessibilityLabel={t('lifeEvents.nominees_label')}
          onPress={() => router.back()}
        >
          {t('lifeEvents.nominees_label')}
        </Button>
      </YStack>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: t('nominee_correction.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('nominee_correction.title')}</H2>
          <Paragraph color="$colorPress" accessibilityRole="text">
            {t('nominee_correction.intro')}
          </Paragraph>

          <Text accessibilityRole="text">{t('nominee_correction.rank_label')}</Text>
          <XStack gap="$2">
            {([1, 2] as const).map((rank) => {
              const selected = form.rank === rank
              const label = rank === 1 ? t('nominee_correction.rank_primary') : t('nominee_correction.rank_secondary')
              return (
                <Button
                  key={rank}
                  size="$3"
                  theme={selected ? 'accent' : undefined}
                  chromeless={!selected}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => patch('rank', rank)}
                >
                  {label}
                </Button>
              )
            })}
          </XStack>

          <Input
            value={form.name}
            onChangeText={(v) => patch('name', v)}
            placeholder={t('nominees.name')}
            height={48}
            accessibilityLabel={t('nominees.name')}
            accessibilityHint={t('nominees.name_help')}
          />

          {/* The hint sits on an ACCESSIBLE element (the label) — on the XStack, which is not one, it was
              never announced (family 13(a)). */}
          <Text accessibilityRole="text" accessibilityHint={t('nominees.relationship_help')}>
            {t('nominees.relationship')}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {KNOWN_RELATIONSHIPS.map((rel) => {
              const selected = form.relationship === rel
              return (
                <Button
                  key={rel}
                  size="$3"
                  theme={selected ? 'accent' : undefined}
                  chromeless={!selected}
                  accessibilityRole="button"
                  accessibilityLabel={t(`nominees.relationship_${rel}`)}
                  accessibilityState={{ selected }}
                  onPress={() => patch('relationship', rel)}
                >
                  {t(`nominees.relationship_${rel}`)}
                </Button>
              )
            })}
          </XStack>

          <Input
            value={form.mobile}
            onChangeText={(v) => patch('mobile', v)}
            placeholder={t('nominees.mobile')}
            keyboardType="phone-pad"
            height={48}
            accessibilityLabel={t('nominees.mobile')}
            accessibilityHint={t('nominees.mobile_help')}
          />
          <Input
            value={form.address}
            onChangeText={(v) => patch('address', v)}
            placeholder={t('nominees.address')}
            height={48}
            accessibilityLabel={t('nominees.address')}
            accessibilityHint={t('nominees.address_help')}
          />
          <TextArea
            value={form.note}
            onChangeText={(v) => patch('note', v)}
            placeholder={t('nominee_correction.note_label')}
            accessibilityLabel={t('nominee_correction.note_label')}
            accessibilityHint={t('nominee_correction.note_help')}
          />
          <Paragraph color="$colorPress" accessibilityRole="text">
            {t('nominee_correction.note_help')}
          </Paragraph>

          {stepUp.needsOtp ? (
            <YStack gap="$3">
              <Text accessibilityRole="text" accessibilityLiveRegion="polite">
                {t('lifeEvents.step_up_required')}
              </Text>
              <Input
                value={stepUp.otp}
                onChangeText={stepUp.setOtp}
                keyboardType="number-pad"
                maxLength={6}
                height={48}
                accessibilityLabel={t('lifeEvents.step_up_required')}
                accessibilityHint={t('lifeEvents.step_up_hint')}
              />
              <Button
                theme="accent"
                height={56}
                disabled={busy || !stepUp.otp.trim()}
                accessibilityRole="button"
                accessibilityLabel={t('auth.verify')}
                accessibilityState={{ disabled: busy || !stepUp.otp.trim() }}
                onPress={() => {
                  const v = validationError()
                  if (v) {
                    setError(v)
                    return
                  }
                  // ⭐ The code VERIFIED but the request then failed (`concurrent`, `version_conflict` — "try
                  // again"): close the prompt, or the main submit stayed disabled with ⛔ no new code sent and
                  // only an unmentioned Cancel as a way out (code review 2026-09-24b). The elevation is now
                  // fresh, so a retry needs no second code. ⭐ "Verified" is KNOWN, ⛔ not guessed from an error
                  // code (adversarial review 2026-09-24b): `verifyAndRetry` calls the request only AFTER the code
                  // verified, so the flag is set exactly then — a wrong code, an expired one, a rate limit or a
                  // dropped network on the VERIFY all keep the prompt open.
                  let verified = false
                  run(
                    () =>
                      stepUp.verifyAndRetry(() => {
                        verified = true
                        return request()
                      }),
                    () => {
                      if (verified) stepUp.reset()
                    },
                  )
                }}
              >
                {busy ? <Spinner /> : t('auth.verify')}
              </Button>
              {/* ⭐ A way out of the prompt, like the Life Events nominee footer. */}
              <Button
                chromeless
                height={40}
                accessibilityRole="button"
                accessibilityLabel={t('lifeEvents.step_up_cancel')}
                onPress={stepUp.reset}
              >
                {t('lifeEvents.step_up_cancel')}
              </Button>
            </YStack>
          ) : null}

          {error ? (
            <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          ) : null}

          {/* ⛔ Disabled while the code prompt is open: pressing it re-ran the step-up, sending a NEW code
              that invalidated the one being typed. */}
          <Button
            theme="accent"
            height={56}
            disabled={busy || stepUp.needsOtp}
            accessibilityRole="button"
            accessibilityLabel={t('nominee_correction.submit')}
            accessibilityState={{ disabled: busy || stepUp.needsOtp }}
            onPress={onSubmit}
          >
            {busy ? <Spinner /> : t('nominee_correction.submit')}
          </Button>
        </YStack>
      </ScrollView>
    </>
  )
}
