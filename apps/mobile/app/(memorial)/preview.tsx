// Story 11b.4 (AC2 / AC4 / AC7 / AC7a / AC11) — PREVIEW AND SEND, ONE screen.
//
// ⭐ At its TOP, `-393` M3′ (`preview.before_publish`, BigDev's words) — ⛔ stacked with the permission. The words render
// through the SHARED presenter (`@twt/ui` — preview == outcome == the later public page). ⭐ IMMEDIATELY ABOVE Send, the
// permission the SERVER returned (`-162` cl.3 — given AT SEND, in this surface), in the language the app is showing; the
// client sends ONLY `{ authorisationCopyVersion, authorisationLocale }`. ⛔ Checkbox, ⛔ take-down button.

import { Image, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, H2, H3, Paragraph, YStack } from 'tamagui'

import type { MemorialMemberView } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'
import { reconstructMemorial } from '@twt/ui'

import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { HandoverCodePanel } from '../../components/memorial-authorship/HandoverCodePanel'
import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialText } from '../../components/memorial-authorship/MemorialText'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { loadMemorialDraft, memorialPhotoUri } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'
import { useMemorialSend } from '../../lib/use-memorial-send'

export default function MemorialPreviewScreen(): React.ReactElement | null {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const view = useMemorialViewQuery().data?.memorial ?? null
  const memberId = session?.memberId ?? null
  if (!view || !memberId) return null
  return (
    <Preview
      view={view}
      memberId={memberId}
      locale={locale === 'en' ? 'en' : 'hi'}
      t={t}
      onSent={() => router.replace('/(memorial)/outcome')}
      onChangeWords={() => router.push('/(memorial)/write')}
      onChangePhoto={() => router.push('/(memorial)/photo')}
    />
  )
}

function Preview(props: {
  readonly view: MemorialMemberView
  readonly memberId: string
  readonly locale: 'hi' | 'en'
  readonly t: (key: string, params?: Record<string, string>) => string
  readonly onSent: () => void
  readonly onChangeWords: () => void
  readonly onChangePhoto: () => void
}): React.ReactElement {
  const { view, memberId, locale, t } = props
  const draft = loadMemorialDraft(memberId, view.driveId)
  const sender = useMemorialSend({ memberId, view, locale, onSent: props.onSent })
  const photoUri = memorialPhotoUri(draft.photoFileName)
  const rendered = reconstructMemorial({ body: draft.body ?? '', altText: draft.altText ?? null }, null)
  const busy = sender.phase === 'sending' || sender.handover.busy

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
          <MemorialText paragraphs={rendered.asApproved} testID="memorial-preview-text" />
          {photoUri !== null ? (
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 240 }} resizeMode="contain" accessibilityLabel={draft.altText ?? t('photo.chosen_a11y')} />
          ) : null}
          {rendered.altText !== null && (photoUri !== null || draft.keepPreviousPhoto) ? (
            <YStack gap="$1">
              <H3>{t('preview.photo_alt_heading')}</H3>
              <MemorialText paragraphs={rendered.altText.original} />
            </YStack>
          ) : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={props.onChangeWords}>
            {t('preview.change_words')}
          </Button>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={props.onChangePhoto}>
            {t('preview.change_photo')}
          </Button>

          {sender.phase === 'need_code' ? (
            <HandoverCodePanel state={sender.handover} onConfirm={(code) => void sender.confirmCode(code)} />
          ) : null}

          {sender.refusalKey !== null ? (
            <YStack gap="$2" testID="memorial-refusal" accessibilityLiveRegion="polite" accessibilityLabel={t('send.error_a11y')}>
              <Paragraph theme="yellow">{t(sender.refusalKey)}</Paragraph>
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
            disabled={busy || sender.phase === 'need_code'}
            onPress={() => void sender.send()}
          >
            {busy ? t('preview.sending') : t('preview.send')}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
