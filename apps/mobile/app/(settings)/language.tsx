// The app-language screen (Story 6.35, Task 4.3; AC7; LS6 (a), LS7, LS13; Decision 2026-10-23-387).
//
// Two options — the endonyms हिन्दी and English (names, the same in both catalogs) — in a radio group; the current one is
// checked. Selecting the OTHER one changes the whole app at once (`setLocale` — every `useT()` consumer re-renders), saves
// it on this phone and, for a signed-in member, records it on the account (`chooseLanguage` — the ONE serial PUT queue,
// `lib/app-language.ts`). Selecting the current one does nothing (I1: a PUT only on a CHANGE from the language shown).
// A failed PUT keeps the new language on screen and the pending record (retried at the next start / foreground), and
// shows ONE inline alert line. Its announcement: iOS only when the line MOUNTS on the failure (TalkBack already speaks a
// newly shown live region — `(claim)/contact.tsx`); on BOTH platforms when it was already showing and a second PUT fails
// (the live region does ⛔ re-fire — 3.3c `kyc.tsx`).
// ⛔ `[t]` dependency anywhere here (`useT()` is a fresh closure every render — depend on `locale`).

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'
import { t as translate } from '@twt/i18n'
import { useLocale, useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { H2, Paragraph, Text, XStack, YStack } from 'tamagui'

import { type AppLanguage, chooseLanguage } from '../../lib/app-language'
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
  const notRecordedRef = useRef(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const choose = useCallback(
    (next: AppLanguage) => {
      if (next === locale) return
      setLocale(next)
      void chooseLanguage(next, memberId, { currentMemberId }).then((outcome) => {
        if (!mountedRef.current) return
        if (outcome !== 'not_recorded') {
          notRecordedRef.current = false
          setNotRecorded(false)
          return
        }
        const alreadyShowing = notRecordedRef.current
        notRecordedRef.current = true
        setNotRecorded(true)
        // The words in the language just chosen (the package `t`, ⛔ the render's `useT()` closure — bound to the old one).
        const text = translate('language.error_not_recorded', undefined, { locale: next })
        if (alreadyShowing || Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text)
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
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" testID="language-not-recorded">
            {t('language.error_not_recorded')}
          </Text>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
