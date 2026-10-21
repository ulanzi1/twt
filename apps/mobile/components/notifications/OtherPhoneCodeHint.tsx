// "WhatsApp on another phone?" with a WhatsApp CODE — Story 5.13 (Task 5.2; AC1, AC9, AC13; WC6, WC7; Decision 2026-10-21-374
// option A, Trustee-ratified — *"Only after the member ticks the box and taps "WhatsApp on another phone?"; one code per request,
// to the registered number only; WhatsApp is switched on when the code is typed back in the app"*; build decisions -376).
//
// The SIGNUP step only (WC6 (a)) — rendered in place of `OtherPhoneHint` when the mint said the code route can work
// (`codeAvailable || liveCode`); the "WhatsApp notifications" screen keeps the phrase hint. The same link label as 5.10, its OWN
// testID; collapsed by default — or EXPANDED at the code field when a code is already live. It OWNS the form's state
// (`useWaCode`), so collapsing hides the view only. The code goes to the member's REGISTERED number (the server's rule — ⛔ a number
// is sent from here). Whenever the code route closes, 5.10's number + phrase show below (`OtherPhoneDetails`); signup never waits
// on any of it (Continue is the step's own).

import { useState } from 'react'

import type { CreateWaOptInResponse } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { Button, YStack } from 'tamagui'

import { WaCodeEntry } from './WaCodeEntry'
import { useWaCode } from './use-wa-code'

export function OtherPhoneCodeHint({
  minted,
  onActivated,
}: {
  readonly minted: CreateWaOptInResponse
  readonly onActivated: () => void
}) {
  const t = useT()
  const form = useWaCode(minted, onActivated)
  const [open, setOpen] = useState(minted.liveCode)
  return (
    <YStack gap="$2" testID="wa-code">
      <Button
        chromeless
        height={40}
        justify="flex-start"
        accessibilityRole="button"
        accessibilityLabel={t('waOtherPhone.link')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        testID="wa-code-link"
      >
        {t('waOtherPhone.link')}
      </Button>
      {open ? (
        <WaCodeEntry form={form} displayPhoneNumber={minted.displayPhoneNumber} verificationPhrase={minted.verificationPhrase} />
      ) : null}
    </YStack>
  )
}
