// Ravi-mode entry gate (Story 6.2, Task 5; AC1).
//
// The first claim-flow screen. On a valid session (Ravi is on the deceased's phone), it asks
// "Are you family of [member name]? … We need to verify it's you." with a "No — continue as
// [member]" escape that returns to the normal member experience. On "Yes, I am family", it enters
// the proxy flow at the handover-trust OTP step. NOT a numbered step (the progress header
// self-suppresses here).
//
// ── Deceased name ─────────────────────────────────────────────────────────────────────────────
// The session stores memberId/pariwarId but no display name (session.ts) — and we deliberately do
// NOT fetch the member's Tier-1 name here (PII, gated). Until a non-PII display-name seam exists,
// the copy uses a dignified generic ("your family member"); a later story can thread the real name
// via a param. Recorded in the Dev Agent Record.

import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { loadClaimDraft } from '../../lib/claim-draft'
import { useClaimT } from '../../lib/claim-i18n'
import { nextClaimStep } from '../../lib/claim-steps'
import { useSession } from '../../lib/session-context'

export default function ClaimEntryScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')

  // Resume just past the last COMPLETED step in the saved draft (AC6 save-and-resume), instead
  // of always restarting at handover-OTP. expo-router typedRoutes rejects a COMPUTED Href, so
  // the branches below each push a route LITERAL (the (claim)/relationship.tsx precedent) —
  // only the step lookup that decides WHICH literal to push is dynamic.
  function enterClaimFlow(): void {
    const lastStep = session?.memberId ? loadClaimDraft(session.memberId).lastStep : undefined
    const next = lastStep ? nextClaimStep(lastStep) : undefined
    if (next === 'relationship') {
      router.push('/(claim)/relationship')
    } else if (next === 'document') {
      router.push('/(claim)/document')
    } else if (next === 'nominee-review') {
      router.push('/(claim)/nominee-review')
    } else {
      router.push('/(claim)/handover-otp')
    }
  }

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('entry.question', { name })}</H2>
      <Paragraph color="$colorPress">{t('shell.saved')}</Paragraph>
      <Button
        theme="accent"
        size="$5"
        accessibilityLabel={t('entry.yes')}
        onPress={enterClaimFlow}
        disabled={!session}
      >
        {t('entry.yes')}
      </Button>
      <Button
        chromeless
        accessibilityLabel={t('entry.no', { name })}
        onPress={() => router.replace('/(tabs)')}
        disabled={!session}
      >
        {t('entry.no', { name })}
      </Button>
    </YStack>
  )
}
