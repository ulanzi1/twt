// Ravi-mode entry gate (Story 6.2, Task 5; AC1).
//
// The first claim-flow screen. On a valid session (Ravi is on the deceased's phone), it asks
// "Are you family of [member name]? … We need to verify it's you." with a "No — continue as
// [member]" escape that returns to the normal member experience. On "Yes, I am family", it enters
// the proxy flow at the handover-trust OTP step. NOT a numbered step (the progress header
// self-suppresses here).
//
// ── Deceased name ─────────────────────────────────────────────────────────────────────────────
// (Story 6.2 used a dignified generic, "your family member", and did NOT fetch the name — SUPERSEDED IN PART by `2026-10-27-409`.)
// The question and the "No" choice carry the member's REGISTERED name in the Pariwar's form (`useClaimMemberRegisteredName`);
// with no name (pending, none, or a failed read) they use their OWN no-name wording (`2026-10-27-410`) — ⛔ the generic inside
// the sentence, which read "Are you family of your family member?".

import { useEffect, useState } from 'react'

import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, Spinner, YStack } from 'tamagui'

import { resolveClaimEntryDecision } from '../../lib/claim-entry-gate'
import { loadClaimDraft } from '../../lib/claim-draft'
import { useClaimT } from '../../lib/claim-i18n'
import { useClaimMemberRegisteredName } from '../../lib/use-claim-member-name'
import { nextClaimStep } from '../../lib/claim-steps'
import { fetchClaimEntryReadOutcome } from '../../lib/fetch-claim-entry-outcome'
import { getFiledClaimCaseId } from '../../lib/filed-claim'
import { useSession } from '../../lib/session-context'

export default function ClaimEntryScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { session, isLoading: sessionLoading } = useSession()
  // `2026-10-27-409` / `-410` — the registered name (Pariwar form), else the no-name wording.
  const name = useClaimMemberRegisteredName()
  const question = name === null ? t('entry.question_no_name') : t('entry.question', { name })
  const notFamily = name === null ? t('entry.no_no_name') : t('entry.no', { name })

  // `-249` §2 (B2, narrowed) — a filed claim on record whose fresh D1 read says `claim_live: true`
  // skips straight to the shepherd screen; one CLOSED for no response that still needs a re-file confirmation goes to
  // the helpline state (Story 6.19c). A terminal claim (`-239` (b)'s Trustee-ratified refile),
  // an offline read, an error, or a 404 all fall through to today's wizard entry, UNCHANGED.
  const [gateChecked, setGateChecked] = useState(false)
  useEffect(() => {
    // ⛔ Never open the gate while the session is still loading (a cold-start deep link would flash the
    // wizard, then yank the family to the shepherd once the session lands).
    if (sessionLoading) return
    const claimCaseId = session?.memberId ? getFiledClaimCaseId(session.memberId) : null
    if (!claimCaseId) {
      setGateChecked(true)
      return
    }
    let cancelled = false
    void fetchClaimEntryReadOutcome(claimCaseId).then((outcome) => {
      if (cancelled) return
      const decision = resolveClaimEntryDecision(true, outcome)
      if (decision.kind === 'shepherd') {
        router.replace(`/(claim)/shepherd?claimCaseId=${encodeURIComponent(claimCaseId)}`)
        return
      }
      // Story 6.19c (`-273` §9) — a claim closed for no response with ⛔ no re-file confirmation: the calm helpline state.
      if (decision.kind === 'refile_helpline') {
        router.replace('/(claim)/refile-helpline')
        return
      }
      // ⭐ Story 6.24a (RF12 v1.3) — a CLOSED claim: the calm "please call the helpline" screen, ⛔ never the wizard.
      if (decision.kind === 'closed_helpline') {
        router.replace('/(claim)/closed-helpline')
        return
      }
      setGateChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [session?.memberId, sessionLoading])

  // Resume just past the last COMPLETED step in the saved draft (AC6 save-and-resume), instead
  // of always restarting at handover-OTP. expo-router typedRoutes rejects a COMPUTED Href, so
  // the branches below each push a route LITERAL (the (claim)/relationship.tsx precedent) —
  // only the step lookup that decides WHICH literal to push is dynamic.
  function enterClaimFlow(): void {
    const lastStep = session?.memberId ? loadClaimDraft(session.memberId).lastStep : undefined
    const next = lastStep ? nextClaimStep(lastStep) : undefined
    // ⭐ Story 6.19a — EVERY step resumes at `nextClaimStep` (the pre-existing gap: a `lastStep` of
    // `relationship` (→ consent) or `nominee-review` (→ acknowledgement, now → contact) fell through to the
    // handover OTP). A switch, so a step added to CLAIM_STEPS without a branch here is a typecheck error.
    switch (next) {
      case 'relationship':
        router.push('/(claim)/relationship')
        return
      case 'consent':
        router.push('/(claim)/consent')
        return
      case 'document':
        router.push('/(claim)/document')
        return
      case 'nominee-review':
        router.push('/(claim)/nominee-review')
        return
      case 'contact':
        router.push('/(claim)/contact')
        return
      case 'acknowledgement':
        router.push('/(claim)/acknowledgement')
        return
      case 'handover-otp':
      case undefined:
        router.push('/(claim)/handover-otp')
        return
      default: {
        const unhandled: never = next
        return unhandled
      }
    }
  }

  if (!gateChecked) {
    // Briefly held while the entry gate checks a filed claim's live-ness — never flash the "are you
    // family" question at someone who already filed and is simply being routed to their shepherd.
    return (
      <YStack flex={1} justify="center" px="$6" bg="$background" testID="claim-entry-gate-checking">
        <Spinner size="small" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{question}</H2>
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
        accessibilityLabel={notFamily}
        onPress={() => router.replace('/(tabs)')}
        disabled={!session}
      >
        {notFamily}
      </Button>
    </YStack>
  )
}
