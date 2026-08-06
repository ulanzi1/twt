// The personal-event ASSERTION surface — Story 10.26 (Task 5; AC1, AC7; D1, D3).
//
// ⚖ THE SURFACE'S JOB IS TO BE HONEST ABOUT ITS OWN FUTILITY. The ratified Niyamavali §3.1
// (`docs/legal/niyamavali.md:81`, Trustee Panel 2026-08-06) says personal events do not excuse a
// missed contribution; the assertion "is recorded on the member's own record but grants no
// restoration relief and carries no consequence of its own". Recording changes NOTHING.
//
// So why offer it at all? Because a bereaved member who misses a cycle currently has no channel that
// is ABOUT their contribution standing — the alternative is not "nothing happens", it is that they
// file a helpdesk ticket or say nothing and assume the system does not care. And because an
// un-evaluated R7(G) never told them what the rule was; evaluated, their own record states it plainly.
//
// ── ⭐ THE CONSEQUENCE IS DISCLOSED BEFORE THE MEMBER COMMITS (AC7) ─────────────────────────────
// The Niyamavali's answer is shown on the FORM, above the picker — not in the confirmation. Naming
// the consequence only after the member has acted is a dark pattern: they have already spent the
// effort, and the disclosure arrives as a let-down rather than as information they could act on.
// `personal_event.before_you_record` is therefore rendered UNCONDITIONALLY and before `submit`.
//
// ── NO FREE TEXT (D3) ────────────────────────────────────────────────────────────────────────────
// A bounded six-value picker, and nothing else. Free text here would be Tier-1 PII of the most
// sensitive kind landing in append-only `events_log`, and NOTHING would read it — R7(G) is
// declarative, there is no reviewer, and the engine fact is a boolean. A text box with no reader is a
// false promise that someone is listening. Members who need a human get a link to the Helpdesk, which
// has real people on the other end.
//
// Hindi-first via `@twt/i18n` `useT()` (freeze row 10) — every visible string is a KEY resolved here.

import { useT } from '@twt/i18n/react'
import type { PersonalEventKind } from '@twt/contracts'
import { useState } from 'react'
import { Button, Paragraph, Text, YStack } from 'tamagui'

import { usePersonalEventAssertion } from './usePersonalEventAssertion'

/** The bounded vocabulary, in the order the picker renders it. Value-aligned with the domain enum. */
const KINDS: readonly PersonalEventKind[] = [
  'bereavement',
  'illness',
  'caregiving',
  'displacement',
  'financial_hardship',
  'other',
]

export interface PersonalEventAssertionProps {
  /** The member's own Pariwar, from the session context. */
  pariwarId: string | undefined
  /** Opens the Helpdesk — the surface with real humans on it (D3). */
  onOpenHelpdesk?: () => void
}

export function PersonalEventAssertion({ pariwarId, onOpenHelpdesk }: PersonalEventAssertionProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PersonalEventKind | null>(null)
  const mutation = usePersonalEventAssertion(pariwarId)

  // ── (3) Recorded. The SAME statement the member already read before submitting — repeated, not
  // revealed. Nothing new is disclosed here, which is the point.
  if (mutation.isSuccess) {
    return (
      <YStack
        gap="$2"
        p="$3"
        borderWidth={1}
        borderColor="$borderColor"
        rounded="$4"
        testID="personal-event-recorded"
      >
        <Text fontWeight="600" accessibilityRole="header">
          {t('personal_event.recorded_title')}
        </Text>
        <Paragraph color="$colorPress" fontSize="$2" accessibilityRole="text">
          {t('personal_event.recorded_body')}
        </Paragraph>
        {onOpenHelpdesk ? (
          <Button size="$3" chromeless onPress={onOpenHelpdesk} accessibilityRole="button">
            {t('personal_event.talk_to_someone')}
          </Button>
        ) : null}
      </YStack>
    )
  }

  // ── (1) The affordance. Its LABEL states what it does — "record that…", never "request" / "apply"
  // (AC1). A member must be able to tell from the button alone that nothing is being asked for.
  if (!open) {
    return (
      <Button
        size="$3"
        chromeless
        accessibilityRole="button"
        accessibilityLabel={t('personal_event.entry_a11y')}
        onPress={() => setOpen(true)}
        testID="personal-event-entry"
        disabled={!pariwarId}
      >
        {t('personal_event.entry')}
      </Button>
    )
  }

  // ── (2) The form. Consequence FIRST, then the bounded picker, then submit.
  return (
    <YStack
      gap="$3"
      p="$3"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$4"
      testID="personal-event-form"
    >
      <Text fontWeight="600" accessibilityRole="header">
        {t('personal_event.title')}
      </Text>
      <Paragraph color="$colorPress" fontSize="$2" accessibilityRole="text">
        {t('personal_event.intro')}
      </Paragraph>

      {/*
        ⭐ AC7 — the Niyamavali's answer, BEFORE the member commits. Deliberately not collapsible and
        not behind a "learn more": the member must not be able to complete this flow without having
        been told that it changes nothing.
      */}
      <Paragraph
        fontSize="$2"
        accessibilityRole="text"
        testID="personal-event-before-you-record"
      >
        {t('personal_event.before_you_record')}
      </Paragraph>

      <YStack
        gap="$2"
        accessibilityRole="radiogroup"
        accessibilityLabel={t('personal_event.kind_label')}
      >
        <Text fontSize="$2" fontWeight="600">
          {t('personal_event.kind_label')}
        </Text>
        {KINDS.map((k) => (
          <Button
            key={k}
            size="$3"
            accessibilityRole="radio"
            accessibilityState={{ selected: kind === k }}
            // Selection is carried by the accessible state above AND a visible border weight — never
            // by colour alone (a11y: colour must not be the sole carrier of meaning).
            borderWidth={kind === k ? 2 : 1}
            onPress={() => setKind(k)}
            testID={`personal-event-kind-${k}`}
          >
            {t(`personal_event.kind.${k}`)}
          </Button>
        ))}
      </YStack>

      {mutation.isError ? (
        <Text color="$red11" fontSize="$2" accessibilityRole="alert">
          {t('personal_event.error')}
        </Text>
      ) : null}

      <Button
        accessibilityRole="button"
        disabled={kind === null || mutation.isPending || !pariwarId}
        onPress={() => {
          if (kind !== null) mutation.mutate({ kind })
        }}
        testID="personal-event-submit"
      >
        {t('personal_event.submit')}
      </Button>

      {onOpenHelpdesk ? (
        <Button size="$3" chromeless onPress={onOpenHelpdesk} accessibilityRole="button">
          {t('personal_event.talk_to_someone')}
        </Button>
      ) : null}
    </YStack>
  )
}
