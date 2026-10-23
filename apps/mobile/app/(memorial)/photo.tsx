// Story 11b.4 (AC2 / AC3 / MA8) — the PHOTO, optional. One photo, picked from the gallery (the `(helpdesk)/new.tsx`
// precedent, `quality: 0.8` — the re-encode is expected to bake rotation in; ⚠ UNVERIFIED until the Task 6.6 device check)
// and COPIED into the document directory at once (picker URIs are transient — MA3). Alt text is REQUIRED with a photo
// (the server refuses without it). *"Use the photo I sent before"* sends ⛔ bytes again — the server reuses the earlier
// version's object (`keepPreviousPhoto`).

import { useState } from 'react'
import { Image, Platform, ScrollView } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, YStack } from 'tamagui'

import { MEMORIAL_ALT_TEXT_MAX_CODE_POINTS, memorialCodePointLength } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
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

export default function MemorialPhotoScreen(): React.ReactElement | null {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const view = useMemorialViewQuery().data?.memorial ?? null
  const memberId = session?.memberId ?? null
  const [draft, setDraft] = useState<MemorialDraft>(() => (view && memberId ? loadMemorialDraft(memberId, view.driveId) : {}))
  const [notice, setNotice] = useState<string | null>(null)
  if (!view || !memberId) return null
  const driveId = view.driveId
  const mid = memberId

  const patch = (p: Partial<MemorialDraft>): void => setDraft(saveMemorialDraft(mid, driveId, p))
  const photoUri = memorialPhotoUri(draft.photoFileName)
  // A file name kept in the draft whose file is gone degrades to "no photo" with a gentle line (⛔ an error).
  const photoMissing = draft.photoFileName !== undefined && photoUri === null
  const withPhoto = photoUri !== null || draft.keepPreviousPhoto === true
  const altRemaining = MEMORIAL_ALT_TEXT_MAX_CODE_POINTS - memorialCodePointLength(draft.altText ?? '')

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
    if (draft.photoFileName) deleteMemorialPhotoCopy(draft.photoFileName)
    patch({ photoFileName: name, photoMime: mime, keepPreviousPhoto: false })
  }

  function without(): void {
    if (draft.photoFileName) deleteMemorialPhotoCopy(draft.photoFileName)
    const { photoFileName: _f, photoMime: _m, keepPreviousPhoto: _k, ...rest } = draft
    void _f
    void _m
    void _k
    setDraft(saveMemorialDraft(mid, driveId, { ...rest, photoFileName: undefined, photoMime: undefined, keepPreviousPhoto: false }))
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
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 240 }} resizeMode="contain" accessibilityLabel={t('photo.chosen_a11y')} />
          ) : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => void pick()}>
            {photoUri !== null ? t('photo.choose_other') : t('photo.choose')}
          </Button>
          {view.hasPhoto && view.memorialState !== 'none' ? (
            <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => patch({ keepPreviousPhoto: true })}>
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
                accessibilityHint={t('photo.alt_hint')}
                {...(Platform.OS === 'ios' ? { accessibilityLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN' } : {})}
              />
              <Paragraph size="$2" accessibilityLiveRegion="polite">
                {t('photo.alt_remaining', { count: String(Math.max(altRemaining, 0)) })}
              </Paragraph>
            </YStack>
          ) : null}
          {notice !== null ? (
            <Paragraph theme="yellow" accessibilityLiveRegion="polite">
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
