// The number + phrase to send by hand from the phone that holds the member's WhatsApp — Story 5.10 (SB12), EXTRACTED unchanged
// from `OtherPhoneHint` by Story 5.13 (Task 5.1; WC7): the signup step's WhatsApp-code form shows it as the CLOSED route (the
// code cannot be sent, both codes are spent, a code is no longer valid) and `OtherPhoneHint` keeps rendering it behind its link
// (the "WhatsApp notifications" screen is untouched). The same testIDs as before the extraction.

import { useT } from '@twt/i18n/react'
import { Paragraph, Text, YStack } from 'tamagui'

export function OtherPhoneDetails({
  displayPhoneNumber,
  verificationPhrase,
}: {
  readonly displayPhoneNumber: string
  readonly verificationPhrase: string
}) {
  const t = useT()
  return (
    <YStack gap="$2" testID="wa-other-phone-details">
      <Paragraph>{t('waOtherPhone.desc')}</Paragraph>
      {/* The number on its OWN selectable line, like the phrase: iOS copies a selectable Text whole, so a number inside
          the sentence could not be copied alone (second review D2 (b)). Each value carries a label (BigDev: "add Number:
          and Message: labels") — a SEPARATE line, so copying the value copies only the value. */}
      <Paragraph color="$colorPress" testID="wa-other-phone-number-label">
        {t('waOtherPhone.number_label')}
      </Paragraph>
      <Text selectable fontWeight="600" fontSize="$6" testID="wa-other-phone-number">
        {displayPhoneNumber}
      </Text>
      <Paragraph color="$colorPress" testID="wa-other-phone-phrase-label">
        {t('waOtherPhone.message_label')}
      </Paragraph>
      <Text selectable fontWeight="600" fontSize="$6" testID="wa-other-phone-phrase">
        {verificationPhrase}
      </Text>
      <Paragraph color="$colorPress">{t('waOtherPhone.note')}</Paragraph>
    </YStack>
  )
}
