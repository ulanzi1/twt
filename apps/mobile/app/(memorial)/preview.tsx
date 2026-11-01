// Story 11b.4 (AC2 / AC4 / AC7 / AC7a / AC11) — PREVIEW AND SEND, ONE screen.
//
// ⭐ At its TOP, `-393` M3′ (`preview.before_publish`, BigDev's words) — ⛔ stacked with the permission. The words render
// through the SHARED presenter (`@twt/ui` — preview == outcome == the later public page). ⭐ IMMEDIATELY ABOVE Send, the
// permission the SERVER returned (`-162` cl.3 — given AT SEND, in this surface), in the language the app is showing; the
// client sends ONLY `{ authorisationCopyVersion, authorisationLocale }`. ⛔ Checkbox, ⛔ take-down button.
// R5 — a refusal is SPOKEN, not only drawn (its container keeps the Android live region; iOS is told through
// `announceForAccessibility`). The container carries no `accessibilityLabel`: it is not an accessibility element, and
// grouping it would hide the helpline button inside it from focus.
// R8 — when the family chose *"Use the photo I sent before"* the preview shows THAT photo (or says it will be used); a
// picked photo is shown only when it is the one the Send will carry (`keepPreviousPhoto` wins, as in `attempt()`).
// P1 (d) — the words shown are ALWAYS the words `attempt()` will send: the draft is re-read every time this screen comes back
// into focus (403 → the code is asked for → "Change the words" → edit → back to this still-mounted screen would otherwise
// show the old words above a Send button that sends the new ones). The edit buttons stay on in that state.
// T6 — after a landed Send the memorial STACK is reset to the outcome (`dismissAll` to the group's first screen, then
// `replace` it): back must not reach a Write or Photo screen still showing the words that were just sent (a keystroke there
// would re-create a draft from them). A Send that landed while this screen was behind another one sends the family to the
// outcome when it comes back to the front (`use-memorial-send.ts`, `outcomeOwed`).
// Y — Send is enabled exactly when the handover state machine allows a press (`handover-gate.ts`): ⛔ not while a request
// runs, ⛔ not while the nominee's code is asked for, checked or retried; the code panel stays up through its check and its
// retry (Confirm off then — X3).
// Story 11b.5a (KL9) — the family list is shown EXACTLY as the public page will draw it: the Send's own rows
// (`memorialKinshipForSend` — what the Send carries), grouped by the ONE helper (`groupMemorialKinship`), labelled from the ONE
// home (`memorial.kinship.<code>`, English plurals for two or more names), each name through `isolateMemorialBidi` (per
// name — the API does the same before the public wire; it wraps only a name holding a direction CONTROL — RD19). ⛔ Styled beyond the existing preview (11b.5 MV6). When the draft has
// ⛔ list but the version before had one, a line says so — else a re-send to fix one word would take the list off the page.

import { useCallback, useRef, useState } from 'react'
import { Image, ScrollView } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, H3, Paragraph, YStack } from 'tamagui'

import { groupMemorialKinship, memorialKinshipLabelKey, type MemorialMemberView } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'
import { isolateMemorialBidi, reconstructMemorial } from '@twt/ui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { HandoverCodePanel } from '../../components/memorial-authorship/HandoverCodePanel'
import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialKeptPhoto } from '../../components/memorial-authorship/MemorialKeptPhoto'
import { MemorialText } from '../../components/memorial-authorship/MemorialText'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import { memorialKinshipForSend } from '../../components/memorial-authorship/memorial-kinship'
import { useMemorialAnnounce, useMemorialScreenAnnounce } from '../../components/memorial-authorship/useMemorialAnnounce'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { loadMemorialDraft, memorialPhotoUri } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'
import { useMemorialSend } from '../../lib/use-memorial-send'

export default function MemorialPreviewScreen(): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const query = useMemorialViewQuery()
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  if (!view || !memberId)
    return (
      <MemorialViewMissing
        loading={query.isPending}
        fetching={query.isError && query.isFetching}
        onRetry={() => query.refetch()}
      />
    )
  return (
    <Preview
      view={view}
      memberId={memberId}
      locale={locale === 'en' ? 'en' : 'hi'}
      t={t}
      onRefetchView={() => void query.refetch()}
      onSent={() => {
        if (router.canDismiss()) router.dismissAll()
        router.replace('/(memorial)/outcome')
      }}
      onChangeWords={() => router.push('/(memorial)/write')}
      onChangePhoto={() => router.push('/(memorial)/photo')}
      onChangeFamily={() => router.push('/(memorial)/family')}
    />
  )
}

function Preview(props: {
  readonly view: MemorialMemberView
  readonly memberId: string
  readonly locale: 'hi' | 'en'
  readonly t: (key: string, params?: Record<string, string>) => string
  readonly onRefetchView: () => void
  readonly onSent: () => void
  readonly onChangeWords: () => void
  readonly onChangePhoto: () => void
  readonly onChangeFamily: () => void
}): React.ReactElement {
  const { view, memberId, locale, t } = props
  // T1 (TalkBack device session 2026-10-27) — the heading is SPOKEN on arrival and on every return (the stack has no title).
  useMemorialScreenAnnounce(t('preview.title'))
  // A render on every return to this screen — the draft below is read from the phone's storage on every render.
  const [, setFocusTick] = useState(0)
  const firstFocus = useRef(true)
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false // the first focus IS the mount: that render already read the draft
        return
      }
      setFocusTick((n) => n + 1)
    }, []),
  )
  const draft = loadMemorialDraft(memberId, view.driveId)
  const sender = useMemorialSend({ memberId, view, locale, onSent: props.onSent })
  const keepingPrevious = draft.keepPreviousPhoto === true
  // The photo the Send will CARRY as a file: `attempt()` attaches the picked file only when keepPreviousPhoto is not set.
  const photoUri = keepingPrevious ? null : memorialPhotoUri(draft.photoFileName)
  const rendered = reconstructMemorial({ body: draft.body ?? '', altText: draft.altText ?? null }, null)
  // KL9 — the rows the Send will carry, grouped as the page groups them (`inPhoto` is dropped by the helper — ⛔ public).
  const kinshipRows = groupMemorialKinship(memorialKinshipForSend(draft.kinship, photoUri !== null || keepingPrevious))
  const noFamilyList = kinshipRows.length === 0 && view.memorialState !== 'none' && view.kinship !== null
  // The edit buttons are off while a request is in flight or the typed code is being checked (an edit would drop the kept
  // Idempotency-Key — R6 — under a request that is still running). They stay ON while the code is asked for (P1 (d)).
  const editsLocked = sender.inFlight || sender.phase === 'verifying'
  const refusalText = sender.refusalKey !== null ? t(sender.refusalKey) : null
  // A refusal is an error the family must act on: the plan says `assertive` (never a hard-coded value).
  const refusalLive = useMemorialAnnounce(refusalText, { hasLiveRegion: true, kind: 'error' })

  return (
    <YStack flex={1}>
      <MemorialHeader />
      <ScrollView keyboardShouldPersistTaps="handled">
        <YStack px="$4" py="$4" gap="$4">
          {/* ⭐ M3′ — at the TOP (⛔ stacked with the permission text above Send). */}
          <Paragraph testID="memorial-before-publish" fontWeight="600">
            {t('preview.before_publish')}
          </Paragraph>
          <H2 accessibilityRole="header">{t('preview.title')}</H2>
          <MemorialText paragraphs={rendered.asApproved} testID="memorial-preview-text" guardianDeclaration={false} />
          {photoUri !== null ? (
            <Image
              accessible
              accessibilityRole="image"
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 240 }}
              resizeMode="contain"
              accessibilityLabel={draft.altText ?? t('photo.chosen_a11y')}
            />
          ) : null}
          {keepingPrevious ? <MemorialKeptPhoto photoUrl={view.photoUrl} onUrlFailed={props.onRefetchView} /> : null}
          {rendered.altText !== null && (photoUri !== null || keepingPrevious) ? (
            <YStack gap="$1">
              <H3>{t('preview.photo_alt_heading')}</H3>
              <MemorialText paragraphs={rendered.altText.original} guardianDeclaration={false} />
            </YStack>
          ) : null}
          {kinshipRows.length > 0 ? (
            <YStack gap="$1" testID="memorial-preview-kinship">
              <H3>{t('kinship.heading')}</H3>
              {kinshipRows.map((row) => (
                <Paragraph key={row.relation}>
                  {`${t(memorialKinshipLabelKey(row.relation, row.names.length))}: ${row.names.map((n) => isolateMemorialBidi(n)).join(', ')}`}
                </Paragraph>
              ))}
            </YStack>
          ) : null}
          {noFamilyList ? <Paragraph testID="memorial-preview-no-family-list">{t('preview.no_family_list')}</Paragraph> : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" disabled={editsLocked} onPress={props.onChangeWords}>
            {t('preview.change_words')}
          </Button>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" disabled={editsLocked} onPress={props.onChangePhoto}>
            {t('preview.change_photo')}
          </Button>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" disabled={editsLocked} onPress={props.onChangeFamily}>
            {t('preview.change_family')}
          </Button>

          {sender.codeAsked ? (
            <HandoverCodePanel
              state={sender.handover}
              onConfirm={(code) => void sender.confirmCode(code)}
              onResend={() => sender.resendCode()}
            />
          ) : null}

          {sender.refusalKey !== null ? (
            <YStack gap="$2" testID="memorial-refusal" accessibilityLiveRegion={refusalLive}>
              <Paragraph theme="yellow">{refusalText}</Paragraph>
              <CallHelplineCTA />
            </YStack>
          ) : null}

          {/* ⭐ The permission — IMMEDIATELY above Send, in the language the app is showing (AC4). */}
          <YStack gap="$2" testID="memorial-permission">
            <H3>{t('preview.permission_heading')}</H3>
            <Paragraph>{view.authorisation.text[locale]}</Paragraph>
          </YStack>
          <Button
            testID="memorial-send"
            style={{ minHeight: 44 }}
            accessibilityRole="button"
            disabled={!sender.canSend}
            onPress={() => void sender.send()}
          >
            {sender.inFlight ? t('preview.sending') : t('preview.send')}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
