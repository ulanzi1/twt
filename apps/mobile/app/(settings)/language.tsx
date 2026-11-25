// The app-language screen (Story 6.35, Task 4.3; AC7; LS6 (a), LS7, LS13; Decision 2026-10-23-387).
//
// Two options — the endonyms हिन्दी and English (names, the same in both catalogs) — in a radio group; the current one is
// checked. Selecting the OTHER one changes the whole app at once (`setLocale` — every `useT()` consumer re-renders), saves
// it on this phone and, for a signed-in member, records it on the account (`chooseLanguage` — the ONE serial PUT queue,
// `lib/app-language.ts`). Selecting the current one does nothing (I1: a PUT only on a CHANGE from the language shown) —
// unless the account, as last read, holds no choice or another one: then the tap records it (Decision 2026-10-23-388,
// item 1 — e.g. a login-screen choice dropped by an app restart before sign-in).
// A failed PUT keeps the new language on screen and the pending record (retried at the next start / foreground), and
// shows ONE inline alert line — PLAIN text (role `alert`; ⛔ a live region), and the failure of a tap is announced ONCE, on
// both platforms, in the language just chosen (Story 3.15c DL3, X2). ⚠ AMENDED for OVERLAPPING taps (Story 3.15d DL2, W1): a tap
// made while an earlier tap's outcome is still pending makes the earlier one STALE — `chooseLanguage` hands every tap its own
// promise over ONE shared write, so two taps in one window used to settle together and each spoke ITS language (a sentence in
// a language no longer shown, then the one on screen). A stale outcome sets nothing and says nothing; only the LATEST tap's
// outcome is announced, in the language now on screen. Sequential taps are unchanged (no tap is stale when its outcome
// arrives). As a live region the line spoke its NEW words at the
// switch itself (`setLocale` re-renders it before the PUT's outcome): a failure while it showed was then heard twice (the
// region + the direct announcement), and a switch that SUCCEEDED was heard as "not recorded" first. While a PUT is pending
// the line keeps showing, in the new language — silent now. A repeat of the same words is sent as different text by
// `announce()` (Story 3.15b).
// ⛔ `[t]` dependency anywhere here (`useT()` is a fresh closure every render — depend on `locale`).

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { t as translate } from '@twt/i18n'
import { useLocale, useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { H2, Paragraph, Text, XStack, YStack } from 'tamagui'

import { announce } from '../../lib/announce'
import { type AppLanguage, accountChoiceDiffers, chooseLanguage } from '../../lib/app-language'
import { useSession } from '../../lib/session-context'

function LanguageOption(props: {
  checked: boolean
  label: string
  onPress: () => void
  testID: string
}): React.ReactElement {
  return (
    <XStack
      gap="$3"
      items="center"
      py="$2"
      onPress={props.onPress}
      pressStyle={{ opacity: 0.7 }}
      accessible={true}
      accessibilityRole="radio"
      accessibilityState={{ checked: props.checked }}
      accessibilityLabel={props.label}
      testID={props.testID}
    >
      <YStack
        width={26}
        height={26}
        rounded={13}
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

export default function LanguageScreen(): React.ReactElement {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { session, currentMemberId } = useSession()
  const memberId = session?.memberId ?? null
  const [notRecorded, setNotRecorded] = useState(false)

  const mountedRef = useRef(true)
  // The id of the LATEST tap that reached `chooseLanguage` (Story 3.15d DL2): a tap whose outcome arrives after a later tap is stale.
  const tapSeq = useRef(0)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const choose = useCallback(
    (next: AppLanguage) => {
      if (next === locale && (memberId === null || !accountChoiceDiffers(memberId, next))) return
      // Minted AFTER the guard: a no-op tap (the shown language, nothing to record) must not make an earlier REAL failure stale and silent.
      const mine = ++tapSeq.current
      if (next !== locale) setLocale(next)
      void chooseLanguage(next, memberId, { currentMemberId }).then((outcome) => {
        if (!mountedRef.current || tapSeq.current !== mine) return
        if (outcome !== 'not_recorded') {
          setNotRecorded(false)
          return
        }
        setNotRecorded(true)
        // The words in the language just chosen (the package `t`, ⛔ the render's `useT()` closure — bound to the old one).
        announce(translate('language.error_not_recorded', undefined, { locale: next }))
      })
    },
    [locale, setLocale, memberId, currentMemberId],
  )

  return (
    <ScrollView>
      <Stack.Screen options={{ title: t('language.title') }} />
      <YStack gap="$3" px="$6" py="$6" bg="$background">
        <H2 accessible={true} accessibilityRole="header" testID="language-heading">{t('language.title')}</H2>
        <Paragraph color="$colorPress">{t('language.intro')}</Paragraph>
        {/* The heading above is an accessibility element; the group stays ungrouped so each radio remains reachable. */}
        <YStack gap="$2" accessible={false} accessibilityRole="radiogroup" testID="language-options">
          <LanguageOption
            checked={locale === 'hi'}
            label={t('language.option_hi')}
            onPress={() => choose('hi')}
            testID="language-option-hi"
          />
          <LanguageOption
            checked={locale === 'en'}
            label={t('language.option_en')}
            onPress={() => choose('en')}
            testID="language-option-en"
          />
        </YStack>
        {notRecorded ? (
          <Text accessibilityRole="alert" testID="language-not-recorded">
            {t('language.error_not_recorded')}
          </Text>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
