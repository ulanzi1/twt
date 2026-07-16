// AppealStatusCard — the member-facing appeal surface (Story 6.16, Task 9; AC7).
//
// Shows a denied claimant their appeal eligibility (no deadline, D-E) + a "file appeal" affordance, and the
// appeal's stage/outcome as it progresses. On an exhausted (Stage-3-uphold) outcome it surfaces the D-G
// external-remedy disclosure (exhausting the internal appeal does NOT waive external legal/consumer-forum
// recourse). Bilingual + tone-guide compliant (the dignified "fursat" register), copy in claim.json. The
// AR-61 helpline fallback rides the existing <CallHelplineCTA>. Filing an appeal has no OTP/step-up (a denied
// family's right to appeal must be low-friction — see the friction-budget ledger).

import { Button, Paragraph, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { type MemberAppealStatus, deriveAppealView } from '../../lib/appeal-status'
import { CallHelplineCTA } from './CallHelplineCTA'

export interface AppealStatusCardProps {
  status: MemberAppealStatus
  /** Fired when the claimant taps "file appeal" (the container POSTs the initiate route). */
  onFileAppeal: () => void
  /** True while the initiate request is in flight. */
  filing?: boolean
}

export function AppealStatusCard({ status, onFileAppeal, filing }: AppealStatusCardProps): React.ReactElement {
  const t = useClaimT()
  const view = deriveAppealView(status)

  // Nothing appeal-relevant to show (e.g. the claim is not denied and no appeal exists) — the AR-61 helpline
  // CTA still renders unconditionally below (a claimant in an unmapped state must not silently lose it, the
  // 6.16 review finding).

  return (
    <YStack gap="$3" testID="appeal-status-card">
      {view.showFileAffordance ? (
        <YStack gap="$2" testID="appeal-file-affordance">
          <Paragraph>{t('appeal.eligible')}</Paragraph>
          <Paragraph size="$2" opacity={0.7}>
            {t('appeal.no_deadline')}
          </Paragraph>
          <Button
            accessibilityRole="button"
            accessibilityLabel={t('appeal.file_button')}
            disabled={filing}
            onPress={onFileAppeal}
            testID="appeal-file-button"
          >
            {t('appeal.file_button')}
          </Button>
        </YStack>
      ) : null}

      {view.statusKey ? (
        <Paragraph testID="appeal-status-line">{t(view.statusKey)}</Paragraph>
      ) : null}

      {view.showReversed ? <Paragraph testID="appeal-reversed">{t('appeal.reversed')}</Paragraph> : null}

      {view.showExhausted ? (
        <YStack gap="$2" testID="appeal-exhausted">
          <Paragraph>{t('appeal.upheld_final')}</Paragraph>
          {view.showExternalRemedy ? (
            <Paragraph size="$2" testID="appeal-external-remedy">
              {t('appeal.external_remedy')}
            </Paragraph>
          ) : null}
        </YStack>
      ) : null}

      <CallHelplineCTA />
    </YStack>
  )
}
