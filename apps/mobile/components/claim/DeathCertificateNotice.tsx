// <DeathCertificateNotice> — the shared death-certificate status notice (Story 6.21b, D3).
//
// Renders a `CertificateNoticeView` (already resolved through the marker precedence,
// `death-certificate-view.ts`) through the SAME copy-selection function the shepherd screen and the
// replacement screen both use. ⛔ No colour literal and ⛔ no status colour (C3 — apps/mobile has no
// semantic colour role); status is TEXT only. ⛔ No deadline, countdown or urgency copy ever renders
// here (invariant 2).

import { certificateNoticeCopy, type CertificateNoticeView } from '../../lib/death-certificate-view'
import { useClaimT } from '../../lib/claim-i18n'
import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { Button, Paragraph, YStack } from 'tamagui'

export interface DeathCertificateNoticeProps {
  readonly notice: CertificateNoticeView
  /** `null` ⇒ never render an upload button, even when the copy would otherwise show one (the
   *  replacement screen's own "you can no longer upload here" row). */
  readonly onUploadPress: (() => void) | null
  readonly testID?: string
}

export function DeathCertificateNotice({
  notice,
  onUploadPress,
  testID,
}: DeathCertificateNoticeProps): React.ReactElement | null {
  const t = useClaimT()
  const copy = certificateNoticeCopy(notice)
  if (copy.titleKey === null && copy.bodyKey === null) return null

  return (
    <YStack gap="$2" testID={testID ?? 'death-certificate-notice'}>
      {copy.titleKey ? <Paragraph fontWeight="700">{t(copy.titleKey)}</Paragraph> : null}
      {copy.bodyKey ? <Paragraph>{t(copy.bodyKey)}</Paragraph> : null}
      {copy.reassuranceKey ? <Paragraph color="$colorPress">{t(copy.reassuranceKey)}</Paragraph> : null}
      {copy.uploadLabelKey && onUploadPress ? (
        <Button
          theme="accent"
          accessibilityRole="button"
          accessibilityLabel={t(copy.uploadLabelKey)}
          testID="death-certificate-upload-button"
          onPress={onUploadPress}
        >
          {t(copy.uploadLabelKey)}
        </Button>
      ) : null}
      {copy.helplineLabelKey ? <CallHelplineCTA label={t(copy.helplineLabelKey)} /> : null}
    </YStack>
  )
}
