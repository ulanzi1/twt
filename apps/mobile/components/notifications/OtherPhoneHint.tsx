// "WhatsApp on another phone?" — Story 5.10 (SB12, Decision 2026-10-21-375 decision 12; AC12).
//
// A member whose WhatsApp is on a different phone from the one they are using cannot finish through the deep link: it opens
// WhatsApp on THIS phone, so the message comes from another number and matches nothing. Collapsed until tapped (BigDev: ask
// "later"), the link reveals the Pariwar's WhatsApp number and the verification phrase, each as its own SELECTABLE line, to
// send by hand from the phone that holds the member's WhatsApp — the member's own message from the registered number still
// switches it on (ADR-0029, unchanged; the phrase extractor folds case and dash variants). Used by the signup step's `sent`
// stage (values from the mint response) and the "WhatsApp notifications" screen's waiting state (values from the status
// response). Renders nothing unless BOTH values are present. Story 5.13 (`-374`; Decision 2026-10-21-376 WC7): on the SIGNUP step
// this hint is REPLACED by `OtherPhoneCodeHint` (a WhatsApp code) ONLY when the mint says the code route can work
// (`codeAvailable || liveCode`); otherwise — and always on the "WhatsApp notifications" screen — it renders exactly as before. Its
// details body moved, unchanged, to `OtherPhoneDetails` (the code form's closed route shows it too).

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { Button, YStack } from 'tamagui'

import { OtherPhoneDetails } from './OtherPhoneDetails'

export function OtherPhoneHint({
  displayPhoneNumber,
  verificationPhrase,
}: {
  readonly displayPhoneNumber: string | null
  readonly verificationPhrase: string | null
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  if (displayPhoneNumber === null || verificationPhrase === null) return null
  return (
    <YStack gap="$2" testID="wa-other-phone">
      <Button
        chromeless
        height={40}
        justify="flex-start"
        accessibilityRole="button"
        accessibilityLabel={t('waOtherPhone.link')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        testID="wa-other-phone-link"
      >
        {t('waOtherPhone.link')}
      </Button>
      {open ? <OtherPhoneDetails displayPhoneNumber={displayPhoneNumber} verificationPhrase={verificationPhrase} /> : null}
    </YStack>
  )
}
