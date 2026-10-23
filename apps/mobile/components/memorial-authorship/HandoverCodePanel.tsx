// Story 11b.4 (AC7a) — the NOMINEE's handover code, asked only after a 403 at Send or Withdraw. All copy is `memorial`
// (⛔ `hook.error`, which carries claim keys — *"…help you file"*). The no-nominee and send-failed results route to the
// helpline with Pattern-4 copy; a code that does not match asks again (⛔ a second SMS round trip).

import { useState } from 'react'
import { Button, H3, Input, Paragraph, Spinner, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { useMemorialT } from '../../lib/memorial-i18n'

export interface HandoverPanelState {
  readonly masked: string | null
  readonly sendFailed: boolean
  readonly noNominee: boolean
  readonly notVerified: boolean
  readonly busy: boolean
}

export function HandoverCodePanel({
  state,
  onConfirm,
}: {
  state: HandoverPanelState
  onConfirm: (code: string) => void
}): React.ReactElement {
  const t = useMemorialT()
  const [code, setCode] = useState('')
  return (
    <YStack gap="$2" testID="memorial-handover">
      <H3>{t('handover.title')}</H3>
      {state.noNominee ? (
        <Paragraph theme="yellow" accessibilityLiveRegion="polite" testID="memorial-handover-no-nominee">
          {t('handover.no_nominee')}
        </Paragraph>
      ) : state.sendFailed ? (
        <Paragraph theme="yellow" accessibilityLiveRegion="polite" testID="memorial-handover-send-failed">
          {t('handover.send_failed')}
        </Paragraph>
      ) : state.masked !== null ? (
        <YStack gap="$2">
          <Paragraph>{t('handover.body', { masked: state.masked })}</Paragraph>
          <Paragraph fontWeight="600">{t('handover.code_label')}</Paragraph>
          <Input
            testID="memorial-handover-code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            accessibilityLabel={t('handover.code_label')}
          />
          {state.notVerified ? (
            <Paragraph theme="yellow" accessibilityLiveRegion="polite">
              {t('handover.not_verified')}
            </Paragraph>
          ) : null}
          <Button
            style={{ minHeight: 44 }}
            accessibilityRole="button"
            testID="memorial-handover-confirm"
            disabled={state.busy || code.trim() === ''}
            onPress={() => onConfirm(code.trim())}
          >
            {t('handover.confirm')}
          </Button>
        </YStack>
      ) : (
        <Spinner />
      )}
      <CallHelplineCTA />
    </YStack>
  )
}
