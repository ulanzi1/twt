// The WhatsApp-code form's VIEW — Story 5.13 (Task 5.2; AC9, AC10; WC7, WC8; Decision 2026-10-21-376). Props from `useWaCode`
// (owned by `OtherPhoneCodeHint`, so a collapse hides only this view). Every key is a LITERAL `t('waCode.…')` (the copy test scans
// for them). The code field takes digits only, six at most — the HOOK keeps six, ⛔ native `maxLength` (React Native truncates
// BEFORE `onChangeText`, so a pasted "123 456" would become "12345" — code review P2) — and ⛔ `textContentType="oneTimeCode"` /
// `autoComplete` — iOS would offer the SMS LOGIN code this phone just received, and one tap spends half the tries (WC7). Errors
// are `AnnouncedText kind="error"`; `sent` / `sent_uncertain` are spoken on every send the member is told about (keyed on the send
// counter — the `useAnnounceOnChange` shape, which would ⛔ re-speak the same text twice), on BOTH platforms (a phase change);
// `resend_wait` the same way, keyed on the wait counter (a press answered by a wait — ⛔ each countdown tick — code review P2),
// QUEUED (iOS) so it follows a `send_failed` line spoken in the same render instead of cutting it off (code review round 2).

import { useEffect, useRef } from 'react'
import { AccessibilityInfo } from 'react-native'

import { useT } from '@twt/i18n/react'
import { Button, Input, Paragraph, Spinner, YStack } from 'tamagui'

import { AnnouncedText } from '../peer-request/announce'
import { OtherPhoneDetails } from './OtherPhoneDetails'
import type { WaCode } from './use-wa-code'

export function WaCodeEntry({
  form,
  displayPhoneNumber,
  verificationPhrase,
}: {
  readonly form: WaCode
  readonly displayPhoneNumber: string
  readonly verificationPhrase: string
}) {
  const t = useT()
  const sentLine = form.line === 'sent' ? t('waCode.sent') : form.line === 'sent_uncertain' ? t('waCode.sent_uncertain') : null
  // Spoken when a NEW send was told (the counter moves) — ⛔ on the mint-driven open (the screen reader reads the screen itself).
  const spokenFor = useRef(form.sendCount)
  useEffect(() => {
    if (form.sendCount === spokenFor.current) return
    spokenFor.current = form.sendCount
    if (sentLine) AccessibilityInfo.announceForAccessibility(sentLine)
  }, [form.sendCount, sentLine])
  const waitLine = t('waCode.resend_wait')
  const waitSpokenFor = useRef(form.waitCount)
  useEffect(() => {
    if (form.waitCount === waitSpokenFor.current) return
    waitSpokenFor.current = form.waitCount
    AccessibilityInfo.announceForAccessibilityWithOptions(waitLine, { queue: true })
  }, [form.waitCount, waitLine])

  const errorText =
    form.line === 'wrong_retry'
      ? t('waCode.wrong_retry')
      : form.line === 'wrong_final'
        ? t('waCode.wrong_final')
        : form.line === 'no_longer_valid'
          ? t('waCode.no_longer_valid')
          : form.line === 'send_failed'
            ? t('waCode.send_failed')
            : form.line === 'verify_failed'
              ? t('waCode.verify_failed')
              : form.line === 'no_more'
                ? t('waCode.no_more')
                : null
  const waiting = form.wait > 0

  return (
    <YStack gap="$3" testID="wa-code-form">
      {!form.told && !form.lapsed ? <Paragraph>{t('waCode.intro')}</Paragraph> : null}
      {form.showSend ? (
        <Button
          disabled={form.busy || waiting}
          accessibilityRole="button"
          accessibilityLabel={t('waCode.send')}
          accessibilityState={{ disabled: form.busy || waiting }}
          onPress={() => void form.send()}
          testID="wa-code-send"
        >
          {form.busy ? <Spinner /> : t('waCode.send')}
        </Button>
      ) : null}
      {sentLine ? (
        <Paragraph accessibilityRole="text" testID="wa-code-status">
          {sentLine}
        </Paragraph>
      ) : null}
      {form.field && !form.lapsed ? (
        <YStack gap="$2">
          <Paragraph color="$colorPress">{t('waCode.input_label')}</Paragraph>
          <Input
            value={form.code}
            onChangeText={form.setCode}
            keyboardType="number-pad"
            accessibilityLabel={t('waCode.input_label')}
            testID="wa-code-input"
          />
          <Button
            theme="accent"
            disabled={!form.canConfirm}
            accessibilityRole="button"
            accessibilityLabel={t('waCode.confirm')}
            accessibilityState={{ disabled: !form.canConfirm }}
            onPress={() => void form.confirm()}
            testID="wa-code-confirm"
          >
            {t('waCode.confirm')}
          </Button>
        </YStack>
      ) : null}
      {errorText ? <AnnouncedText kind="error" text={errorText} /> : null}
      {form.showResend ? (
        <Button
          disabled={form.busy || waiting}
          accessibilityRole="button"
          accessibilityLabel={t('waCode.resend')}
          accessibilityState={{ disabled: form.busy || waiting }}
          onPress={() => void form.send()}
          testID="wa-code-resend"
        >
          {t('waCode.resend')}
        </Button>
      ) : null}
      {waiting && (form.showSend || form.showResend) ? (
        <Paragraph color="$colorPress" testID="wa-code-wait">
          {waitLine}
        </Paragraph>
      ) : null}
      {form.closed && !form.lapsed ? (
        <OtherPhoneDetails displayPhoneNumber={displayPhoneNumber} verificationPhrase={verificationPhrase} />
      ) : null}
    </YStack>
  )
}
