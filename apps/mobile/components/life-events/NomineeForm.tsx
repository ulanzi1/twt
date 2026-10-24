// Shared nominee declaration form (Story 3.9, Task 8 — extracted from (signup)/nominees.tsx).
//
// The 1–2 nominee form body reused by BOTH the signup nominee step and the Life Events nominee
// update. It owns the nominee field state (name / relationship / mobile / optional address) + the
// dignified client-side validation (Pattern 4) + the fixed 75/25 split display; the PARENT owns the
// submit semantics (signup → nomineesDeclare → next wizard step; Life Events → step-up-gated
// lifeEventsUpdateNominees). The server derives the split (R4) — the form never sends a percentage.
//
// `onFormsChange` lets a parent persist the in-progress state (Life Events save-and-resume);
// `initialForms` restores it. `footer` slots parent-owned content (e.g. the step-up OTP input or the
// signup reassurance blocks) directly above the submit CTA. Bilingual + accessible (the (signup)
// screen's a11y posture: labels + hints, announced split + validation).
//
// Story 6.36e (AC5; `2026-10-24-397` NE2–NE4) — `link` (Life Events ONLY — the signup screen passes ⛔ it, and the signup
// route refuses a mark): each slot may carry a MARK — "this nominee is also a member". A kept mark shows its label (asked /
// confirmed — the registered name / said it is not them) and is re-sent as a `keep`; *Remove mark* sends ⛔ mark (the live
// one ENDS); the find screen sets a new one. Editing a marked slot's name or mobile asks *"Is this still …?"* BEFORE the
// save — a swap of the two nominees must ⛔ silently carry a mark onto the wrong person (V3). The marks ride the slot state,
// so the parent's draft keeps them — and so does the QUESTION: it is DERIVED from the mark (`markNeedsQuestion` — the slot no
// longer matches what the mark was confirmed for), ⛔ held in this component, because a remount (a pick on the other slot, a
// stale reload, a resumed draft) used to reset it (code review 2026-10-24).

import { useState } from 'react'
// Story 6.18 (AC12) — the SHARED English-script predicate from `@twt/contracts`.
// ⚠⚠ `isEnglishScriptName(x)`, ⛔ NOT `ENGLISH_NAME_REGEX.test(x.trim())` (code review 2026-09-20).
// Three clients each hand-rolled that call. It gives the same answer today, but only by coincidence
// of the current implementation: the moment the schema gains a rule the bare regex does not carry,
// a name the SERVER accepts starts being refused in the app (or worse, the reverse). One predicate,
// used by the schema and by every form, is the only way the two cannot drift.
import {
  CLAIMANT_NOMINEE_RELATIONSHIP_CODES,
  NOMINEE_RELATIONSHIP_CODES,
  isEnglishScriptName,
} from '@twt/contracts'

import type { NomineeMemberLink } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { acceptMark, completeMarkName, markName, markNeedsQuestion, markToSubmit, type FormMark, type NomineeRank } from '../../lib/nominee-links'
import { AnnouncedText } from '../peer-request/announce'

/**
 * The nominee-relationship value set — the Trustee-ratified TWENTY (`2026-09-27-257`, Story 6.19a
 * AC13; the fifteen of `2026-09-21-237` cl.1 at Story 6.20), IMPORTED from the contracts enum rather
 * than re-spelled here, so the picker can ⛔ never offer a code the server refuses. Codes are
 * snake_case; the ratified wording is the en/hi label at `nominees.relationship_${code}`.
 */
export const RELATIONSHIPS = NOMINEE_RELATIONSHIP_CODES
export type Relationship = (typeof RELATIONSHIPS)[number]

/**
 * Every relationship except `other` — the ones a later correction can be made for (`-237` cl.2). ⭐ The
 * contracts' DERIVED nineteen (Story 6.19a AC13 — the same list `-255` F8 gives the claimant-to-nominee
 * question), ⛔ never a third copy.
 */
export const KNOWN_RELATIONSHIPS: readonly Relationship[] = CLAIMANT_NOMINEE_RELATIONSHIP_CODES

export interface NomineeFormEntry {
  name: string
  relationship: Relationship | ''
  mobile: string
  address: string
  /** Story 6.36e — the slot's member mark (`null` — removed / none; ABSENT — a draft from before the mark existed). */
  memberLink?: FormMark | null
}

/** The server-bound nominee shape the parent submits (optional address omitted when blank). */
export interface NomineeSubmitEntry {
  name: string
  relationship: Relationship
  mobile: string
  address?: string
  memberLink?: NomineeMemberLink
}

const EMPTY: NomineeFormEntry = { name: '', relationship: '', mobile: '', address: '' }

export interface NomineeFormProps {
  title: string
  intro: string
  submitLabel: string
  busy: boolean
  error: string | null
  onSubmit: (nominees: NomineeSubmitEntry[]) => void
  /** Restore persisted in-progress state (Life Events save-and-resume). */
  initialForms?: NomineeFormEntry[]
  /** Called on every edit so a parent can persist the draft. */
  onFormsChange?: (forms: NomineeFormEntry[]) => void
  /** Parent-owned content rendered directly above the submit CTA (reassurance blocks / OTP input). */
  footer?: React.ReactNode
  /** Clears the parent-supplied error on any edit. */
  onEdit?: () => void
  /**
   * Story 6.36e — the member-mark control (Life Events ONLY). `canFind` — the caller may FIND a member (an `active` member,
   * ⛔ named by a claim — V11); a kept mark shows and can be removed either way. `onFind` opens the find screen for a rank.
   */
  link?: { readonly canFind: boolean; readonly onFind: (rank: NomineeRank) => void }
}

export function NomineeForm(props: NomineeFormProps) {
  const t = useT()
  const lt = useNomineeLinkT()
  const [inlineError, setInlineError] = useState<string | null>(null)
  // A sequence, so a REPEATED identical refusal is spoken again (the `AnnouncedText` key — see the error line below).
  const [errorSeq, setErrorSeq] = useState(0)
  const fail = (text: string): void => {
    setInlineError(text)
    setAnswerFirst(false)
    setErrorSeq((n) => n + 1)
  }
  // "Answer the question about the member mark first" is ⛔ stored as text: it is SHOWN only while a question is still open (a
  // refusal that outlived the question — the edit reverted, the slot removed — stood red and spoken over a form that was fine).
  const [answerFirst, setAnswerFirst] = useState(false)
  // Story 6.36e — a status the form SPEAKS (a mark removed): the buttons vanish with it, so a screen reader needs the words.
  const [notice, setNotice] = useState<{ text: string; seq: number } | null>(null)
  // `initialForms` restores a persisted draft (Life Events save-and-resume). It is read ONCE here;
  // the parent forces a fresh read of a later-arriving draft by remounting via a changed `key` prop
  // (so this stays a simple uncontrolled form rather than syncing props→state on every render).
  const [forms, setForms] = useState<NomineeFormEntry[]>(
    props.initialForms && props.initialForms.length > 0 ? props.initialForms : [{ ...EMPTY }],
  )

  const hasSecond = forms.length === 2
  function commit(next: NomineeFormEntry[]): void {
    // "Answer the question … first" belongs to the Save that produced it: ANY edit, *Keep the mark* or *Remove it* ends it — it must
    // ⛔ come back, unspoken-for, when a later edit reopens the question.
    setAnswerFirst(false)
    setForms(next)
    props.onFormsChange?.(next)
    props.onEdit?.()
  }

  function patch(index: number, field: 'name' | 'relationship' | 'mobile' | 'address', value: string): void {
    setNotice(null) // "Mark removed." said what happened — ⛔ left standing once the member edits on
    commit(
      forms.map((f, i) => {
        if (i !== index) return f
        const next = { ...f, [field]: value }
        // A pick made on a slot with no name is COMPLETED by the name typed next — ⛔ asked about (see `completeMarkName`).
        return field === 'name' ? completeMarkName(f, next) : next
      }),
    )
  }

  /** Story 6.36e — *Remove mark* (or *Remove it* on the question): the slot carries ⛔ mark; a live one ENDS at save. */
  function removeMark(index: number): void {
    setInlineError(null)
    setNotice({ text: lt('form.removed'), seq: Date.now() })
    commit(forms.map((f, i) => (i === index ? { ...f, memberLink: null } : f)))
  }

  /** Story 6.36e — *Keep the mark*: the member said it is still the same person; the mark is confirmed for the slot as it is. */
  function keepMark(index: number): void {
    setInlineError(null)
    setNotice({ text: lt('form.kept'), seq: Date.now() }) // the question closes with ⛔ words otherwise — SPOKEN, like a removal
    commit(forms.map((f, i) => (i === index ? acceptMark(f) : f)))
  }

  function addSecond(): void {
    // Life Events: a slot the form ADDS carries `null` (⛔ mark) — ⛔ `undefined`, which a reload would read as "a draft from
    // before this story" and give the rank's OLD live mark to the new person (code review 2026-10-24).
    if (forms.length === 1) commit([...forms, props.link ? { ...EMPTY, memberLink: null } : { ...EMPTY }])
  }

  function removeSecond(): void {
    commit(forms.slice(0, 1))
  }

  /** Dignified validation (Pattern 4) — every nominee needs name/relationship/mobile. */
  function firstValidationError(): string | null {
    for (const f of forms) {
      if (!f.name.trim()) return t('nominees.name_required')
      // Story 6.18 (AC12), `-227` cl.9 — captured in ENGLISH script, so the District Admin's later
      // name check is a comparison and ⛔ not an ad-hoc transliteration. The boundary refuses a
      // non-Latin name, so this form refuses it FIRST — ⛔ never a silent server-only 400.
      // Follows the file's first-error-only, dignified-validation shape (Pattern 4).
      if (!isEnglishScriptName(f.name)) return t('nominees.name_english')
      if (!f.relationship) return t('nominees.relationship_required')
      if (!f.mobile.trim()) return t('nominees.mobile_required')
    }
    return null
  }

  function onSubmit(): void {
    // Client-side dignified validation (Pattern 4) is rendered inline here; the parent's `error`
    // channel carries submit/transport failures. Both surface in the single alert region below.
    const validationError = firstValidationError()
    if (validationError) {
      fail(validationError)
      return
    }
    // Story 6.36e (V3) — ⛔ a save while a mark's "Is this still …?" is unanswered.
    if (props.link && forms.some(markNeedsQuestion)) {
      setInlineError(null)
      setAnswerFirst(true)
      setErrorSeq((n) => n + 1)
      return
    }
    setInlineError(null)
    setAnswerFirst(false)
    const nominees: NomineeSubmitEntry[] = forms.map((f) => {
      const memberLink = props.link ? markToSubmit(f.memberLink) : undefined
      return {
        name: f.name.trim(),
        relationship: f.relationship as Relationship,
        mobile: f.mobile.trim(),
        ...(f.address.trim() ? { address: f.address.trim() } : {}),
        ...(memberLink ? { memberLink } : {}),
      }
    })
    props.onSubmit(nominees)
  }

  const questionOpen = !!props.link && forms.some(markNeedsQuestion)
  const shownError = inlineError ?? (answerFirst && questionOpen ? lt('edit.answer_first') : null) ?? props.error

  /**
   * Story 6.36e — one slot's member mark: its label, *Remove mark*, the find entry, and the open edit question. A render
   * FUNCTION, ⛔ a component declared in here (a new component type each render would remount its buttons — focus lost).
   * Every control here is 48 dp tall (device run 2026-10-24: they were 36 dp, like the relationship chips): *Keep the mark* /
   * *Remove it* answer a question about WHO a mark is for, and the members who read it are not young.
   */
  function markControl(index: number, slot: NomineeFormEntry): React.ReactElement | null {
    const link = props.link!
    const mark: FormMark | null = slot.memberLink ?? null
    if (mark === null && !link.canFind) return null
    const name = mark ? markName(mark) : null
    const rank = (index + 1) as NomineeRank
    // Two slots share these words: each button also says WHICH nominee (it begins with its visible text — WCAG 2.5.3).
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
        {mark !== null && markNeedsQuestion(slot) ? (
          <YStack gap="$2" testID={`nominee-mark-question-${index}`}>
            {/* SHOWN and SPOKEN (family 13(d)): a bare live region is Android-only — `AnnouncedText` speaks it on iOS too. */}
            <AnnouncedText text={name ? lt('edit.question', { name }) : lt('edit.question_no_name')} color="$color" />
            <XStack gap="$2">
              <Button height={48} accessibilityRole="button" accessibilityLabel={labelled(lt('edit.keep'))} onPress={() => keepMark(index)}>
                {lt('edit.keep')}
              </Button>
              <Button height={48} accessibilityRole="button" accessibilityLabel={labelled(lt('edit.remove'))} onPress={() => removeMark(index)}>
                {lt('edit.remove')}
              </Button>
            </XStack>
          </YStack>
        ) : null}
        <XStack gap="$2" flexWrap="wrap">
          {link.canFind ? (
            <Button
              height={48}
              chromeless
              accessibilityRole="button"
              accessibilityLabel={labelled(mark === null ? lt('form.find') : lt('form.find_again'))}
              onPress={() => link.onFind(rank)}
            >
              {mark === null ? lt('form.find') : lt('form.find_again')}
            </Button>
          ) : null}
          {mark !== null ? (
            <Button height={48} chromeless accessibilityRole="button" accessibilityLabel={labelled(lt('form.remove'))} onPress={() => removeMark(index)}>
              {lt('form.remove')}
            </Button>
          ) : null}
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack gap="$4" px="$6" py="$6" bg="$background">
      <H2 accessibilityRole="header">{props.title}</H2>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {props.intro}
      </Paragraph>
      {/* Story 6.20 (AC8) — changes stop at a claim: what happens, what to do, and the helpline. */}
      <Paragraph accessibilityRole="text" testID="nominees-changes-stop-notice">
        {t('nominees.changes_stop_notice')}
      </Paragraph>

      {forms.map((f, index) => (
        <YStack key={index} gap="$3">
          <Text fontWeight="600" accessibilityRole="header">
            {index === 0 ? t('nominees.primary_label') : t('nominees.secondary_label')}
          </Text>

          <Input
            value={f.name}
            onChangeText={(v) => patch(index, 'name', v)}
            placeholder={t('nominees.name')}
            height={48}
            accessibilityLabel={t('nominees.name')}
            accessibilityHint={t('nominees.name_help')}
          />

          <Text accessibilityRole="text">{t('nominees.relationship')}</Text>
          <XStack gap="$2" flexWrap="wrap" accessibilityHint={t('nominees.relationship_help')}>
            {RELATIONSHIPS.map((rel) => {
              const selected = f.relationship === rel
              return (
                <Button
                  key={rel}
                  size="$3"
                  theme={selected ? 'accent' : undefined}
                  chromeless={!selected}
                  accessibilityRole="button"
                  accessibilityLabel={t(`nominees.relationship_${rel}`)}
                  accessibilityState={{ selected }}
                  onPress={() => patch(index, 'relationship', rel)}
                >
                  {t(`nominees.relationship_${rel}`)}
                </Button>
              )
            })}
          </XStack>
          {f.relationship === 'other' ? (
            // Story 6.20 (AC12, `-237` cl.2) — the ONE place the ruling's cost reaches a member: choosing
            // "Other" forecloses a later correction. Said at the moment of choice, and ANNOUNCED.
            <Text
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              testID={`nominees-other-warning-${index}`}
            >
              {t('nominees.relationship_other_warning')}
            </Text>
          ) : null}

          <Input
            value={f.mobile}
            onChangeText={(v) => patch(index, 'mobile', v)}
            placeholder={t('nominees.mobile')}
            keyboardType="phone-pad"
            height={48}
            accessibilityLabel={t('nominees.mobile')}
            accessibilityHint={t('nominees.mobile_help')}
          />

          <Input
            value={f.address}
            onChangeText={(v) => patch(index, 'address', v)}
            placeholder={t('nominees.address')}
            height={48}
            accessibilityLabel={t('nominees.address')}
            accessibilityHint={t('nominees.address_help')}
          />

          {props.link ? markControl(index, f) : null}
        </YStack>
      ))}

      {hasSecond ? (
        <Button
          chromeless
          height={48}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.remove_second')}
          onPress={removeSecond}
        >
          {t('nominees.remove_second')}
        </Button>
      ) : (
        <Button
          chromeless
          height={48}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.add_second')}
          onPress={addSecond}
        >
          {t('nominees.add_second')}
        </Button>
      )}

      <Text accessibilityRole="text" accessibilityLiveRegion="polite">
        {hasSecond ? t('nominees.split_75_25') : t('nominees.split_sole')}
      </Text>

      {props.footer}

      {props.link && notice ? <AnnouncedText key={notice.seq} text={notice.text} color="$color" /> : null}

      {shownError ? (
        props.link ? (
          // Life Events: SHOWN and SPOKEN on iOS too (a bare `alert` role / live region is Android-only — `announce.tsx`).
          <AnnouncedText key={`${errorSeq}:${shownError}`} text={shownError} kind="error" color="#C0392B" />
        ) : (
          <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {shownError}
          </Text>
        )
      ) : null}

      <Button
        theme="accent"
        height={56}
        disabled={props.busy}
        accessibilityRole="button"
        accessibilityLabel={props.submitLabel}
        accessibilityState={{ disabled: props.busy }}
        onPress={onSubmit}
      >
        {props.busy ? <Spinner /> : props.submitLabel}
      </Button>
    </YStack>
  )
}
