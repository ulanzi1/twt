// Story 11b.4 (AC2 / AC3 / AC10 / Trap 3 / Trap 7) — WRITE. The box starts EMPTY (⛔ pre-filled — Trap 3); *"Start from
// what I sent"* fills it with the family's OWN ORIGINAL text (⛔ the as-approved text, which the Trust shaped). Saved on
// EVERY change (MA3). ⛔ `maxLength` (it silently cuts a paste and counts UTF-16 units): a gentle remaining-length line
// instead, and the server refuses (AC7). `autoCorrect={false}` with an EXPLICIT `spellCheck` (iOS inherits it from
// autoCorrect — Trap 7) and `accessibilityLanguage` on iOS (React Native has ⛔ `lang`; Android ⛔ equivalent — N/A).

import { useState } from 'react'
import { Platform, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, YStack } from 'tamagui'

import { MEMORIAL_BODY_MAX_CODE_POINTS, memorialCodePointLength } from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { loadMemorialDraft, saveMemorialDraft } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'

export default function MemorialWriteScreen(): React.ReactElement | null {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const view = useMemorialViewQuery().data?.memorial ?? null
  const memberId = session?.memberId ?? null
  const [body, setBody] = useState<string>(() => (view && memberId ? (loadMemorialDraft(memberId, view.driveId).body ?? '') : ''))
  if (!view || !memberId) return null

  const change = (next: string): void => {
    setBody(next)
    saveMemorialDraft(memberId, view.driveId, { body: next })
  }
  const remaining = MEMORIAL_BODY_MAX_CODE_POINTS - memorialCodePointLength(body)
  // The family's own ORIGINAL text — offered only when they sent before and the box is empty.
  const original = view.body !== null && body === '' && view.memorialState !== 'none' ? view.body : null

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
            style={{ minHeight: 220 }}
            value={body}
            onChangeText={change}
            autoCorrect={false}
            spellCheck
            autoCapitalize="sentences"
            accessibilityLabel={t('write.label')}
            accessibilityHint={t('write.hint')}
            {...(Platform.OS === 'ios' ? { accessibilityLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN' } : {})}
          />
          <Paragraph size="$2" accessibilityLiveRegion="polite">
            {remaining >= 0 ? t('write.remaining', { count: String(remaining) }) : t('write.over_limit', { count: String(-remaining) })}
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
