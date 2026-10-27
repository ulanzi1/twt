// Story 11b.4 (AC2 / AC3 / MA8) — the PHOTO, optional. One photo, picked from the gallery (the `(helpdesk)/new.tsx`
// precedent, `quality: 0.8` — the re-encode is expected to bake rotation in; ⚠ UNVERIFIED until the Task 6.6 device check)
// and COPIED into the document directory at once (picker URIs are transient — MA3). Alt text is REQUIRED with a photo
// (the server refuses without it). *"Use the photo I sent before"* sends no bytes again — the server reuses the earlier
// version's object (`keepPreviousPhoto`); it CLEARS a photo picked in this draft (R8 — one photo at a time, the same
// clean-up as *"Continue without a photo"*) and the screen shows the kept photo.
// R20 — the saved draft is loaded in an EFFECT once the view and the member are known (a cold mount — a deep link, a restore —
// has neither at first render), and every handler reads the draft fresh from the phone's storage.
// T6 — and RE-read every time the screen comes back to the front, so a Photo screen left behind a newer one in the stack
// never saves its stale copy of the draft over the newer words, alt text or photo choice.
// T8 — crossing INTO over the limit is announced ONCE (the plan's error kind); while over, the over-limit line is LINKED to
// the alt-text box through its hint (the handover-code precedent). ⭐ TalkBack device session 2026-10-27 (T2): the alt-text
// counter is ⛔ a live region any more (Write's counter, even polite, was spoken on most keystrokes) — a plain line.
// T1 (the same session) — the screen's heading is SPOKEN on arrival (the stack has no title).
// V8 — alt text ALREADY over the limit when the draft is loaded is not announced: only a crossing after the draft is read.
// V9 (a) — while this screen's last save FAILED (full storage), the focus re-read is skipped: the screen's state is newer
// than the stored draft, and must not be replaced by it. W5 — and a change made then is merged into the SCREEN's state;
// X1 — and the next save after a failed one writes the screen's choices, not the change alone.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Platform, ScrollView } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, YStack } from 'tamagui'

import { MEMORIAL_ALT_TEXT_MAX_CODE_POINTS, memorialCodePointLength } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialKeptPhoto } from '../../components/memorial-authorship/MemorialKeptPhoto'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import {
  useMemorialAnnounce,
  useMemorialOverLimitAnnounce,
  useMemorialScreenAnnounce,
} from '../../components/memorial-authorship/useMemorialAnnounce'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import {
  copyMemorialPhoto,
  deleteMemorialPhotoCopy,
  loadMemorialDraft,
  memorialPhotoUri,
  saveMemorialDraft,
  type MemorialDraft,
} from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'

export default function MemorialPhotoScreen(): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const query = useMemorialViewQuery()
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  // R20 — `null` until the saved draft has been loaded (in the effect below).
  const [loaded, setLoaded] = useState<MemorialDraft | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const driveId = view?.driveId ?? null
  useEffect(() => {
    if (loaded !== null || driveId === null || memberId === null) return
    setLoaded(loadMemorialDraft(memberId, driveId))
  }, [loaded, driveId, memberId])
  // T6 — the ids through a ref, so the focus callback stays stable and reads the CURRENT ones.
  const ids = useRef({ driveId, memberId })
  ids.current = { driveId, memberId }
  // V9 (a) — did this screen's last save fail to reach the phone's storage?
  const lastSaveFailed = useRef(false)
  // X1 — what the screen shows NOW, for a change made before the re-render (two quick changes build on each other).
  const shown = useRef<MemorialDraft | null>(loaded)
  shown.current = loaded
  useFocusEffect(
    useCallback(() => {
      const { driveId: d, memberId: m } = ids.current
      if (d === null || m === null) return // a cold mount: the effect above loads it once the view arrives
      if (lastSaveFailed.current) return // V9 (a) — the screen holds choices the storage does not: keep them
      setLoaded(loadMemorialDraft(m, d))
    }, []),
  )
  const noticeLive = useMemorialAnnounce(notice, { hasLiveRegion: true, kind: 'error' })
  const altRemaining = MEMORIAL_ALT_TEXT_MAX_CODE_POINTS - memorialCodePointLength(loaded?.altText ?? '')
  // The over-limit line exists only while a photo is chosen (the alt-text box is shown then) — see `withPhoto` below.
  const altOverText =
    altRemaining < 0 && loaded !== null && (loaded.keepPreviousPhoto === true || memorialPhotoUri(loaded.photoFileName) !== null)
      ? t('photo.alt_over_limit', { count: String(-altRemaining) })
      : null
  useMemorialOverLimitAnnounce(altOverText, loaded !== null)
  useMemorialScreenAnnounce(view && memberId ? t('photo.title') : null)
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
  const mid = memberId
  const drive = view.driveId
  const draft: MemorialDraft = loaded ?? {}

  const patch = (p: Partial<MemorialDraft>): void => {
    const onScreen: MemorialDraft = shown.current ?? {}
    // X1 — after a FAILED save the screen holds choices the storage does not (a photo picked, its description): the next save
    // writes THIS screen's choices merged with the change, ⛔ never the change alone over the older stored draft (which would
    // drop the earlier choice and orphan its photo copy). Only the fields this screen owns — the words are the Write screen's,
    // and the kept key is the storage's own business (R6 drops it when the content changes).
    const toSave: Partial<MemorialDraft> = lastSaveFailed.current
      ? {
          altText: onScreen.altText,
          photoFileName: onScreen.photoFileName,
          photoMime: onScreen.photoMime,
          keepPreviousPhoto: onScreen.keepPreviousPhoto,
          ...p,
        }
      : p
    const result = saveMemorialDraft(mid, drive, toSave)
    lastSaveFailed.current = !result.saved
    // W5 — a save that did NOT reach the storage: the change is merged into what the SCREEN holds (its earlier unsaved choices
    // included), ⛔ never into the older stored draft `result.draft` was built from — else a second change would drop the first.
    const next: MemorialDraft = result.saved ? result.draft : { ...onScreen, ...p }
    shown.current = next
    setLoaded(next)
  }
  // The picked photo's local copy, if any — read FRESH from the phone's storage (the state may not have loaded yet). W5 — a
  // copy picked while the saves FAILED is held by the screen alone (the stored draft never learned of it): it goes too.
  const deletePickedCopy = (): void => {
    const fileName = loadMemorialDraft(mid, drive).photoFileName
    if (fileName) deleteMemorialPhotoCopy(fileName)
    const unsaved = lastSaveFailed.current ? draft.photoFileName : undefined
    if (unsaved && unsaved !== fileName) deleteMemorialPhotoCopy(unsaved)
  }
  const keepingPrevious = draft.keepPreviousPhoto === true
  // `keepPreviousPhoto` WINS, as it does in the preview and in `attempt()`: a draft written by an older build can hold both a
  // picked file and the keep-previous choice, and the screen must show the one photo the Send will carry.
  const photoUri = keepingPrevious ? null : memorialPhotoUri(draft.photoFileName)
  // A file name kept in the draft whose file is gone degrades to "no photo" with a gentle line (not an error).
  const photoMissing = !keepingPrevious && draft.photoFileName !== undefined && photoUri === null
  const withPhoto = photoUri !== null || keepingPrevious
  // Over the limit the counter line says "shorten it by about N" (S8), not "room for about N more" — a plain line (T2): the
  // crossing is announced once by the hook above (T8).

  async function pick(): Promise<void> {
    setNotice(null)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setNotice(t('photo.permission_denied'))
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    const asset = res.canceled ? undefined : res.assets[0]
    if (!asset) return
    const mime = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
    const name = copyMemorialPhoto(asset.uri, mime)
    if (name === null) {
      setNotice(t('send.photo_unreadable'))
      return
    }
    deletePickedCopy() // the earlier pick, replaced
    patch({ photoFileName: name, photoMime: mime, keepPreviousPhoto: false })
  }

  // One photo at a time: *"Continue without a photo"* and *"Use the photo I sent before"* both let go of a photo picked in
  // this draft — its local copy is deleted and its name and type cleared (R8). Otherwise the screen and the preview would
  // keep showing the picked photo X while the Send carries `keepPreviousPhoto` and no file: the family approving one image
  // and sending another.
  function releasePicked(keepPrevious: boolean): void {
    deletePickedCopy()
    patch({ photoFileName: undefined, photoMime: undefined, keepPreviousPhoto: keepPrevious })
  }

  function without(): void {
    releasePicked(false)
    router.push('/(memorial)/preview')
  }

  return (
    <YStack flex={1}>
      <MemorialHeader />
      <ScrollView keyboardShouldPersistTaps="handled">
        <YStack px="$4" py="$4" gap="$3">
          <H2 accessibilityRole="header">{t('photo.title')}</H2>
          <Paragraph>{t('photo.body')}</Paragraph>
          {photoMissing ? <Paragraph size="$2">{t('draft.photo_missing')}</Paragraph> : null}
          {photoUri !== null ? (
            <Image
              accessible
              accessibilityRole="image"
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 240 }}
              resizeMode="contain"
              accessibilityLabel={t('photo.chosen_a11y')}
            />
          ) : null}
          {keepingPrevious ? <MemorialKeptPhoto photoUrl={view.photoUrl} onUrlFailed={() => void query.refetch()} /> : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => void pick()}>
            {photoUri !== null ? t('photo.choose_other') : t('photo.choose')}
          </Button>
          {view.hasPhoto && view.memorialState !== 'none' ? (
            <Button style={{ minHeight: 44 }} accessibilityRole="button" testID="memorial-use-previous-photo" onPress={() => releasePicked(true)}>
              {t('photo.use_previous')}
            </Button>
          ) : null}
          {withPhoto ? (
            <YStack gap="$2">
              <Paragraph fontWeight="600">{t('photo.alt_label')}</Paragraph>
              <Paragraph size="$2">{t('photo.alt_hint')}</Paragraph>
              <Input
                testID="memorial-alt-text"
                value={draft.altText ?? ''}
                onChangeText={(v: string) => patch({ altText: v })}
                autoCorrect={false}
                spellCheck
                accessibilityLabel={t('photo.alt_label')}
                // T8 — the over-limit error is LINKED to its field: while over, the box's hint reads it first.
                accessibilityHint={altOverText !== null ? `${altOverText} ${t('photo.alt_hint')}` : t('photo.alt_hint')}
                {...(Platform.OS === 'ios' ? { accessibilityLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN' } : {})}
              />
              <Paragraph size="$2" testID="memorial-alt-counter">
                {altOverText ?? t('photo.alt_remaining', { count: String(altRemaining) })}
              </Paragraph>
            </YStack>
          ) : null}
          {notice !== null ? (
            <Paragraph theme="yellow" accessibilityLiveRegion={noticeLive} testID="memorial-photo-notice">
              {notice}
            </Paragraph>
          ) : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={without}>
            {t('photo.without')}
          </Button>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.push('/(memorial)/preview')}>
            {t('photo.next')}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
