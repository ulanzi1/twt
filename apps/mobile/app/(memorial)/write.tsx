// Story 11b.4 (AC2 / AC3 / AC10 / Trap 3 / Trap 7) — WRITE. The box starts EMPTY (⛔ pre-filled — Trap 3); *"Start from
// what I sent"* fills it with the family's OWN ORIGINAL text (⛔ the as-approved text, which the Trust shaped). Saved on
// EVERY change (MA3). ⛔ `maxLength` (it silently cuts a paste and counts UTF-16 units): a gentle remaining-length line
// instead, and the server refuses (AC7). `autoCorrect={false}` with an EXPLICIT `spellCheck` (iOS inherits it from
// autoCorrect — Trap 7) and `accessibilityLanguage` on iOS (React Native has ⛔ `lang`; Android ⛔ equivalent — N/A).
// R20 — the saved draft is read in an EFFECT once the view and the member are known (a cold mount — a deep link, a restore —
// has neither at first render); until then the box takes no input, so a keystroke can never overwrite a saved draft that
// has not been loaded yet.
// T6 — and RE-read every time the screen comes back to the front: Preview → "Change the words" pushes a SECOND Write, so a
// first Write left behind it would otherwise show (and, on a keystroke, save) the words from before the edit.
// T8 — the counter is a POLITE status line as the family types; crossing INTO over the limit is announced ONCE (the plan's
// error kind, through `useMemorialAnnounce`), never on every keystroke past it; and while over, the over-limit line is
// LINKED to the box — the box's own hint reads it (React Native has no `aria-describedby`; the handover-code precedent).
// V8 — a draft that is ALREADY over the limit when it is loaded (restored, or a pushed second Write) is not announced: only a
// crossing the family makes after the draft is read.
// V9 (a) — while this screen's last save FAILED (full storage), the stored draft is older than the box: the focus re-read is
// skipped, so it never replaces the family's newer words with the older stored ones.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, ScrollView } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, YStack } from 'tamagui'

import { MEMORIAL_BODY_MAX_CODE_POINTS, memorialCodePointLength } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import { memorialLiveRegion, useMemorialOverLimitAnnounce } from '../../components/memorial-authorship/useMemorialAnnounce'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { loadMemorialDraft, saveMemorialDraft } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'

export default function MemorialWriteScreen(): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const query = useMemorialViewQuery()
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  // `null` ⇒ the saved draft has not been read yet.
  const [saved, setSaved] = useState<string | null>(null)
  const driveId = view?.driveId ?? null
  useEffect(() => {
    if (saved !== null || driveId === null || memberId === null) return
    setSaved(loadMemorialDraft(memberId, driveId).body ?? '')
  }, [saved, driveId, memberId])
  // T6 — the ids through a ref, so the focus callback stays stable and reads the CURRENT ones.
  const ids = useRef({ driveId, memberId })
  ids.current = { driveId, memberId }
  // V9 (a) — did this screen's last save fail to reach the phone's storage?
  const lastSaveFailed = useRef(false)
  useFocusEffect(
    useCallback(() => {
      const { driveId: d, memberId: m } = ids.current
      if (d === null || m === null) return // a cold mount: the effect above loads it once the view arrives
      if (lastSaveFailed.current) return // V9 (a) — the box holds words the storage does not: keep them
      setSaved(loadMemorialDraft(m, d).body ?? '')
    }, []),
  )
  const body = saved ?? ''
  const remaining = MEMORIAL_BODY_MAX_CODE_POINTS - memorialCodePointLength(body)
  const overText = remaining < 0 ? t('write.over_limit', { count: String(-remaining) }) : null
  useMemorialOverLimitAnnounce(overText, saved !== null)
  // W7 — a Retry TAP shows progress until its fetch settles (a flag inside `MemorialViewMissing`, whatever the last result);
  // `loading` here is only the FIRST load (`isPending`) — a background refetch (`isFetching`) must not flip the line (V11).
  if (!view || !memberId)
    return (
      <MemorialViewMissing
        loading={query.isPending}
        fetching={query.isError && query.isFetching}
        onRetry={() => query.refetch()}
      />
    )

  const change = (next: string): void => {
    if (saved === null) return // ⛔ never save over a draft that has not been loaded
    setSaved(next)
    lastSaveFailed.current = !saveMemorialDraft(memberId, view.driveId, { body: next }).saved
  }
  // T8 — POLITE always (a status as the family types); the crossing is announced once by the hook above.
  const counterLive = memorialLiveRegion('status')
  // The family's own ORIGINAL text — offered only when they sent before and the box is empty.
  const original = view.body !== null && saved !== null && body === '' && view.memorialState !== 'none' ? view.body : null

  return (
    <YStack flex={1}>
      <MemorialHeader />
      <ScrollView keyboardShouldPersistTaps="handled">
        <YStack px="$4" py="$4" gap="$3">
          <H2 accessibilityRole="header">{t('write.title')}</H2>
          <Paragraph fontWeight="600">{t('write.label')}</Paragraph>
          <Paragraph size="$2">{t('write.hint')}</Paragraph>
          {original !== null ? (
            <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => change(original)}>
              {t('write.start_from_sent')}
            </Button>
          ) : null}
          <Input
            testID="memorial-body"
            multiline
            // Android centres a multiline box's text vertically by default (found on the device): start at the top.
            textAlignVertical="top"
            style={{ minHeight: 220 }}
            value={body}
            disabled={saved === null}
            onChangeText={change}
            autoCorrect={false}
            spellCheck
            autoCapitalize="sentences"
            accessibilityLabel={t('write.label')}
            // T8 — the over-limit error is LINKED to its field: while over, the box's hint reads it first.
            accessibilityHint={overText !== null ? `${overText} ${t('write.hint')}` : t('write.hint')}
            {...(Platform.OS === 'ios' ? { accessibilityLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN' } : {})}
          />
          {/* Over the limit the line says so (S8); it stays a polite status — the crossing itself is announced once (T8). */}
          <Paragraph size="$2" accessibilityLiveRegion={counterLive} testID="memorial-body-counter">
            {overText ?? t('write.remaining', { count: String(remaining) })}
          </Paragraph>
          <Paragraph size="$2">{t('draft.kept_on_phone')}</Paragraph>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.push('/(memorial)/photo')}>
            {t('write.next')}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
