// The claim CONTACT step (Story 6.19a, AC1 / AC8a) — between `nominee-review` and `acknowledgement`.
//
// The family gives a POSTAL ADDRESS for each nominee they see, says whether the claimant is one of them — and
// if not, the claimant's name, mobile, address and relationship to each nominee — and AGREES that these people
// may be contacted (`2026-09-20-232` G, `2026-09-27-253`). If the claim is ever sent back for a bank-name
// correction, this is how the Trust reaches them (6.19b), and a claim is never closed without it (6.19c).
//
// ⭐ The nominee slots come from `memberAuth.nomineesStatus()` (rank + relationship) — what the family SEES; the
// server binds each rank to that version (W1). ⚠ `addressPresent` may be true: the step asks for the address
// ANYWAY (`-232` G) and ⛔ never copies the declared one silently.
// ⭐ No declared nominee: `nominee-review`'s empty state still continues here, so the step then asks only for
// the claimant's details — the family can finish filing.
// ⭐ The relationship question fixes its DIRECTION — "the claimant is the nominee's …" — because half the
// values are inverse pairs (son/father, son-in-law/father-in-law, grandchild/grandparent).
// ⛔ PII-FREE DRAFT: nothing typed here is cached on the device — only `lastStep: 'contact'` after a save.
// ⛔ D9: the claimant's name is ⛔ not English-gated.

import { useCallback, useEffect, useRef, useState } from 'react'

import type { NomineeStatusResponse } from '@twt/contracts'
import { CLAIMANT_NOMINEE_RELATIONSHIP_CODES } from '@twt/contracts'
import { ApiError } from '@twt/api-client'
import { useLocale, useT } from '@twt/i18n/react'
import { useFocusEffect, useRouter } from 'expo-router'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'
import { Button, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { CallHelplineCTA } from '../../components/claim/CallHelplineCTA'
import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { claimApi } from '../../lib/claim-api'
import { type ClaimantChoice, type ClaimantNomineeRelationshipCode, buildMemberContactBody } from '../../lib/claim-contact'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft } from '../../lib/claim-draft'
import { memberAuth } from '../../lib/member-api'
import { useSession } from '../../lib/session-context'

type NomineeSummary = NomineeStatusResponse['nominees'][number]
/** Every reachable state is ANNOUNCED (AC8a — family 13). */
type Phase = 'idle' | 'saving' | 'saved' | 'incomplete' | 'agreement_required' | 'not_writable' | 'error'

// Time for the `saved` announcement before the screen navigates away beneath it (the nominee-review precedent).
const SAVED_ANNOUNCEMENT_DELAY_MS = 1200

/** A pressable choice announced with its role and state (family 13(a): `accessible` is explicit). */
function ChoiceRow(props: {
  checked: boolean
  onPress: () => void
  label: string
  role: 'radio' | 'checkbox'
  testID: string
  disabled?: boolean
}): React.ReactElement {
  return (
    <XStack
      gap="$3"
      items="flex-start"
      onPress={props.disabled ? undefined : props.onPress}
      pressStyle={props.disabled ? undefined : { opacity: 0.7 }}
      opacity={props.disabled ? 0.5 : 1}
      accessible={true}
      accessibilityRole={props.role}
      accessibilityState={{ checked: props.checked, disabled: !!props.disabled }}
      accessibilityLabel={props.label}
      testID={props.testID}
    >
      <YStack
        width={26}
        height={26}
        rounded={props.role === 'radio' ? 13 : '$2'}
        borderWidth={1.5}
        borderColor={props.checked ? '$accentBackground' : '$borderColor'}
        bg={props.checked ? '$accentBackground' : 'transparent'}
        items="center"
        justify="center"
      >
        {props.checked ? (
          <Text color="white" fontWeight="800" fontSize="$4">
            ✓
          </Text>
        ) : null}
      </YStack>
      <Paragraph flex={1}>{props.label}</Paragraph>
    </XStack>
  )
}

export default function ContactScreen(): React.ReactElement {
  const t = useClaimT()
  const tCommon = useT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const name = t('member_fallback')
  const memberId = session?.memberId
  const claimCaseId = memberId ? loadClaimDraft(memberId).claimCaseId : undefined

  const [nominees, setNominees] = useState<NomineeSummary[] | 'error' | null>(null)
  const [addresses, setAddresses] = useState<Record<number, string>>({})
  const [claimant, setClaimant] = useState<ClaimantChoice>(null)
  const [block, setBlock] = useState({ name: '', mobile: '', address: '' })
  const [relationships, setRelationships] = useState<Record<number, ClaimantNomineeRelationshipCode | undefined>>({})
  const [agreed, setAgreed] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // A fast double-tap can fire a second `onSave` before the `busy`-derived disable commits on the next
  // render — this is a SYNCHRONOUS guard, checked before that render happens.
  const savingRef = useRef(false)

  // Clear a stale `incomplete`/`agreement_required` message as soon as the field that caused it changes —
  // otherwise the last error keeps announcing itself as still true after the family fixes it. ⭐ Review
  // 2026-09-29: split by CAUSE, not one effect for both — editing an address must never clear
  // `agreement_required` when the checkbox itself is still untouched, and vice versa.
  useEffect(() => {
    setPhase((prev) => (prev === 'incomplete' ? 'idle' : prev))
  }, [addresses, claimant, block, relationships])
  useEffect(() => {
    setPhase((prev) => (prev === 'agreement_required' ? 'idle' : prev))
  }, [agreed])

  useEffect(() => {
    let active = true
    memberAuth
      .nomineesStatus()
      .then((res) => {
        if (active) setNominees(res.nominees)
      })
      .catch(() => {
        if (active) setNominees('error')
      })
    return () => {
      active = false
    }
  }, [])

  // `saved` ends when the family comes back (the nominee-review precedent) — a typo can still be fixed.
  useFocusEffect(
    useCallback(() => {
      setPhase((prev) => (prev === 'saved' ? 'idle' : prev))
    }, []),
  )

  const list = Array.isArray(nominees) ? nominees : []
  const noNominees = Array.isArray(nominees) && nominees.length === 0
  const someoneElse = noNominees || claimant?.kind === 'someone_else'

  function announce(text: string): void {
    // `accessibilityLiveRegion` is Android-only; iOS needs the explicit call (and only iOS — TalkBack would
    // speak it twice).
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text)
  }

  const phaseText: Partial<Record<Phase, string>> = {
    saved: t('contact.saved'),
    incomplete: t('contact.incomplete'),
    agreement_required: t('contact.agreement_required'),
    not_writable: t('contact.not_writable'),
    error: t('contact.error'),
  }

  async function onSave(): Promise<void> {
    if (savingRef.current) return
    savingRef.current = true
    try {
      if (!claimCaseId || !Array.isArray(nominees)) {
        setPhase('error')
        announce(t('contact.error'))
        return
      }
      const built = buildMemberContactBody({
        nominees,
        addresses,
        claimant,
        block,
        relationships,
        agreed,
        locale: locale === 'en' ? 'en' : 'hi',
      })
      if (!built.ok) {
        setPhase(built.reason)
        announce(phaseText[built.reason]!)
        return
      }
      setPhase('saving')
      try {
        await claimApi.recordClaimContact(claimCaseId, built.body)
      } catch (e) {
        if (!mountedRef.current) return
        const next: Phase =
          e instanceof ApiError && e.code === 'claim_contact.not_writable'
            ? 'not_writable'
            : e instanceof ApiError && e.status === 400
              ? 'incomplete'
              : 'error'
        setPhase(next)
        announce(phaseText[next]!)
        return
      }
      if (!mountedRef.current) return
      setPhase('saved')
      // ⛔ PII-free: only the step marker is remembered on the device.
      if (memberId) saveClaimDraft(memberId, { lastStep: 'contact' })
      announce(t('contact.saved'))
      await new Promise((r) => setTimeout(r, SAVED_ANNOUNCEMENT_DELAY_MS))
      if (!mountedRef.current) return
      router.push('/(claim)/acknowledgement')
    } finally {
      savingRef.current = false
    }
  }

  const busy = phase === 'saving' || phase === 'saved'
  // `not_writable` is a server-confirmed refusal (from the write's own response — no extra read needed): the
  // form must not stay editable/resubmittable against a claim state that will always refuse it.
  const locked = busy || phase === 'not_writable'
  const relLabel = (code: string): string => tCommon(`nominees.relationship_${code}`)

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700" accessibilityRole="header">
          {t('contact.title')}
        </Text>
        <Paragraph color="$colorPress">{t('contact.help')}</Paragraph>

        {nominees === null ? <Spinner /> : null}
        {nominees === 'error' ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
            {t('contact.error')}
          </Text>
        ) : null}
        {noNominees ? <Paragraph testID="contact-no-nominees">{t('contact.no_nominees')}</Paragraph> : null}

        {list.map((n) => (
          // ⚠ ⛔ No label on this container: an `accessible` container swallows its children, and the address
          // field inside must stay reachable. The heading is plain text; the field carries its own label.
          <YStack key={n.rank} gap="$2">
            <Text fontWeight="600" accessibilityRole="header">{t('contact.nominee_heading', { rank: n.rank, relationship: relLabel(n.relationship) })}</Text>
            <Input
              value={addresses[n.rank] ?? ''}
              onChangeText={(v) => setAddresses((a) => ({ ...a, [n.rank]: v }))}
              placeholder={t('contact.address_label')}
              accessibilityLabel={t('contact.address_label')}
              accessibilityHint={t('contact.address_help')}
              multiline
              maxLength={500}
              disabled={locked}
              testID={`contact-address-${n.rank}`}
            />
          </YStack>
        ))}

        {list.length > 0 ? (
          <YStack gap="$2" accessibilityRole="radiogroup" accessibilityLabel={t('contact.claimant_question')}>
            <Text fontWeight="600">{t('contact.claimant_question')}</Text>
            {list.map((n) => (
              <ChoiceRow
                key={n.rank}
                role="radio"
                checked={claimant?.kind === 'rank' && claimant.rank === n.rank}
                onPress={() => setClaimant({ kind: 'rank', rank: n.rank })}
                label={t('contact.claimant_is_nominee', { rank: n.rank, relationship: relLabel(n.relationship) })}
                testID={`contact-claimant-rank-${n.rank}`}
                disabled={locked}
              />
            ))}
            <ChoiceRow
              role="radio"
              checked={claimant?.kind === 'someone_else'}
              onPress={() => setClaimant({ kind: 'someone_else' })}
              label={t('contact.claimant_is_someone_else')}
              testID="contact-claimant-someone-else"
              disabled={locked}
            />
          </YStack>
        ) : null}

        {someoneElse ? (
          <YStack gap="$2">
            <Text fontWeight="600">{t('contact.claimant_heading')}</Text>
            <Input
              value={block.name}
              onChangeText={(v) => setBlock((b) => ({ ...b, name: v }))}
              placeholder={t('contact.claimant_name')}
              accessibilityLabel={t('contact.claimant_name')}
              maxLength={200}
              disabled={locked}
              testID="contact-claimant-name"
            />
            <Input
              value={block.mobile}
              onChangeText={(v) => setBlock((b) => ({ ...b, mobile: v.replace(/[^0-9]/g, '') }))}
              placeholder={t('contact.claimant_mobile')}
              accessibilityLabel={t('contact.claimant_mobile')}
              keyboardType="phone-pad"
              maxLength={20}
              disabled={locked}
              testID="contact-claimant-mobile"
            />
            <Input
              value={block.address}
              onChangeText={(v) => setBlock((b) => ({ ...b, address: v }))}
              placeholder={t('contact.claimant_address')}
              accessibilityLabel={t('contact.claimant_address')}
              multiline
              maxLength={500}
              disabled={locked}
              testID="contact-claimant-address"
            />
            {list.map((n) => (
              <YStack key={n.rank} gap="$2">
                {/* ⭐ The DIRECTION is fixed: "the claimant is the nominee's …". */}
                <Text>{t('contact.relationship_question', { rank: n.rank })}</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {CLAIMANT_NOMINEE_RELATIONSHIP_CODES.map((rel) => {
                    const selected = relationships[n.rank] === rel
                    return (
                      <Button
                        key={rel}
                        size="$3"
                        theme={selected ? 'accent' : undefined}
                        chromeless={!selected}
                        disabled={locked}
                        accessibilityRole="button"
                        accessibilityLabel={relLabel(rel)}
                        accessibilityState={{ selected, disabled: locked }}
                        onPress={() => setRelationships((r) => ({ ...r, [n.rank]: rel }))}
                        testID={`contact-relationship-${n.rank}-${rel}`}
                      >
                        {relLabel(rel)}
                      </Button>
                    )
                  })}
                </XStack>
              </YStack>
            ))}
          </YStack>
        ) : null}

        <ChoiceRow
          role="checkbox"
          checked={agreed}
          onPress={() => setAgreed((v) => !v)}
          label={t('contact.agreement')}
          testID="contact-agreement"
          disabled={locked}
        />

        {phaseText[phase] ? (
          <Text
            accessibilityRole={phase === 'saved' ? 'text' : 'alert'}
            accessibilityLiveRegion="polite"
            color={phase === 'saved' ? undefined : '#C0392B'}
            testID={`contact-phase-${phase}`}
          >
            {phaseText[phase]}
          </Text>
        ) : null}

        <Button
          theme="accent"
          disabled={locked || nominees === null || nominees === 'error'}
          onPress={() => void onSave()}
          testID="contact-save"
        >
          {phase === 'saving' ? <Spinner /> : t('contact.continue')}
        </Button>

        <CallHelplineCTA />
      </YStack>
      </ScrollView>
    </ClaimProxyFlowShell>
  )
}
