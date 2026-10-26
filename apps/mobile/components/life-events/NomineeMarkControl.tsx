// One nominee's MEMBER MARK control — Story 6.36e (AC5; `2026-10-24-397` NE2–NE4), EXTRACTED from `NomineeForm.tsx` by Story 6.36f
// (MK8, `2026-10-26-407`) so the full form and the marks-only mode render ONE control (⛔ a fork). It shows the mark's label (asked /
// confirmed — the registered name / said it is not them), the pre-save disclosure for a NEW mark (`form.will_ask*` — `-396` Q2 A;
// REQUIRED in marks mode too), the open "Is this still …?" question (the full form only — marks mode passes `questionOpen: false`:
// ⛔ editable details), *Find…* / *Pick a different member* and *Remove mark*. The PARENT owns the state: it passes the mark and is
// told what the member did (`onFind`, `onRemove`, `onKeep`); the spoken *"Mark removed."* / *"Mark kept."* are the parent's notice,
// rendered OUTSIDE this control.
// A component declared at MODULE level (a stable type — its buttons keep focus across renders; ⛔ declared inside a parent's render).
// Every control is 48 dp tall (device run 2026-10-24: they were 36 dp): *Keep the mark* / *Remove it* answer a question about WHO a
// mark is for, and the members who read it are not young. Each button's accessible name begins with its visible text, then says
// WHICH nominee (two slots share the words — WCAG 2.5.3).

import { useT } from '@twt/i18n/react'
import { Button, Paragraph, Text, XStack, YStack } from 'tamagui'

import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { markName, type FormMark } from '../../lib/nominee-links'
import { AnnouncedText } from '../peer-request/announce'

export interface NomineeMarkControlProps {
  /** The slot's position (0 = the primary nominee) — the testIDs and the "which nominee" of each label. */
  readonly index: number
  readonly mark: FormMark | null
  /** The caller may FIND a member (an `active` member, ⛔ named by a claim — V11); a mark shows and can be removed either way. */
  readonly canFind: boolean
  /** The V3 question "Is this still …?" is open (the full form only). */
  readonly questionOpen: boolean
  readonly onFind: () => void
  readonly onRemove: () => void
  readonly onKeep: () => void
}

export function NomineeMarkControl(props: NomineeMarkControlProps): React.ReactElement | null {
  const t = useT()
  const lt = useNomineeLinkT()
  const { index, mark } = props
  if (mark === null && !props.canFind) return null
  const name = mark ? markName(mark) : null
  const which = index === 0 ? t('nominees.primary_label') : t('nominees.secondary_label')
  const labelled = (text: string) => `${text} — ${which}`
  return (
    <YStack gap="$2" testID={`nominee-mark-${index}`}>
      {mark === null ? null : (
        <>
          <Text accessibilityRole="text">
            {mark.kind === 'new'
              ? name
                ? lt('form.marked', { name })
                : lt('form.marked_no_name')
              : mark.label === 'confirmed'
                ? name
                  ? lt('label.confirmed', { name })
                  : lt('label.confirmed_no_name')
                : lt(`label.${mark.label}`)}
          </Text>
          {mark.kind === 'keep' && mark.label === 'not_me' ? <Text accessibilityRole="text">{lt('label.not_me_note')}</Text> : null}
        </>
      )}
      {mark !== null && mark.kind === 'new' ? (
        <Paragraph accessibilityRole="text">{name ? lt('form.will_ask', { name }) : lt('form.will_ask_no_name')}</Paragraph>
      ) : null}
      {/* ⛔ A line saying WHY a mark matters or what the Trust does with it: it would describe how the five are chosen (`2026-10-24-401`). */}
      {mark !== null && props.questionOpen ? (
        <YStack gap="$2" testID={`nominee-mark-question-${index}`}>
          {/* SHOWN and SPOKEN (family 13(d)): a bare live region is Android-only — `AnnouncedText` speaks it on iOS too. */}
          <AnnouncedText text={name ? lt('edit.question', { name }) : lt('edit.question_no_name')} color="$color" />
          <XStack gap="$2">
            <Button height={48} accessibilityRole="button" accessibilityLabel={labelled(lt('edit.keep'))} onPress={props.onKeep}>
              {lt('edit.keep')}
            </Button>
            <Button height={48} accessibilityRole="button" accessibilityLabel={labelled(lt('edit.remove'))} onPress={props.onRemove}>
              {lt('edit.remove')}
            </Button>
          </XStack>
        </YStack>
      ) : null}
      <XStack gap="$2" flexWrap="wrap">
        {props.canFind ? (
          <Button
            height={48}
            chromeless
            accessibilityRole="button"
            accessibilityLabel={labelled(mark === null ? lt('form.find') : lt('form.find_again'))}
            onPress={props.onFind}
          >
            {mark === null ? lt('form.find') : lt('form.find_again')}
          </Button>
        ) : null}
        {mark !== null ? (
          <Button height={48} chromeless accessibilityRole="button" accessibilityLabel={labelled(lt('form.remove'))} onPress={props.onRemove}>
            {lt('form.remove')}
          </Button>
        ) : null}
      </XStack>
    </YStack>
  )
}
