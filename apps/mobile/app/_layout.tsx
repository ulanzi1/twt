import '../tamagui.generated.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { LocaleProvider } from '@twt/i18n/react'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router'
import { Provider } from 'components/Provider'
import { useTheme } from 'tamagui'
import { SessionProvider, useSession } from '../lib/session-context'
import { recordLinkTarget } from '../lib/link-target'
import { markLoopPhase } from '../lib/loop-timing-session'
import { readStoredLanguage } from '../lib/app-language'

// Devanagari font roles per UX spec lines 712-714 + 1108-1114
// Display (Tiro Devanagari Hindi): memorial names, claim titles, ceremonial copy
// Body (Noto Sans Devanagari): body copy, navigation, buttons, forms
// Tabular numerics (IBM Plex Sans Devanagari + tnum): FM-2 substitute for
//   IBM Plex Mono Devanagari (which is not a published font) per UX spec line 714
//   fallback path. tnum applied per-component via font-feature-settings.
import { TiroDevanagariHindi_400Regular } from '@expo-google-fonts/tiro-devanagari-hindi'
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
} from '@expo-google-fonts/noto-sans-devanagari'
import {
  IBMPlexSansDevanagari_400Regular,
  IBMPlexSansDevanagari_500Medium,
} from '@expo-google-fonts/ibm-plex-sans-devanagari'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Tamagui defaults (Latin — needed for English UI chrome + Latin numerals)
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),

    // Devanagari display
    TiroDevanagariHindi_400Regular,

    // Devanagari body
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,

    // Devanagari tabular numerics (FM-2 substitute for IBM Plex Mono Devanagari
    // per UX spec line 714 — published IBM Plex family has no Mono Devanagari)
    IBMPlexSansDevanagari_400Regular,
    IBMPlexSansDevanagari_500Medium,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  // Story 8.12 — the cold-start `app_open` mark for the 90-second-loop measurement (AC1). Mount-once
  // (empty deps + `once`) so no re-render can re-stamp it. Debug-gated → inert in production member builds.
  useEffect(() => {
    markLoopPhase('app_open', { once: true })
  }, [])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  )
}

// Hindi-default (Epic 3 intro line 1575) — LocaleProvider's initialLocale defaults to
// DEFAULT_LOCALE ('hi'). SessionProvider loads the persisted member session so the
// auth guard can redirect; both sit outside Tamagui so screens can use useT/useSession.
// Story 6.35 (2026-10-23, LS3 / T4) — the language the member last chose (or adopted) on THIS phone is read
// SYNCHRONOUSLY from MMKV here, because `initialLocale` is read on mount only; nothing stored ⇒ `undefined` ⇒ Hindi.
// A later change goes through `setLocale` (the language screen, the login switch, `syncAppLanguage`).
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <LocaleProvider initialLocale={readStoredLanguage() ?? undefined}>
      <SessionProvider>
        <Provider>{children}</Provider>
      </SessionProvider>
    </LocaleProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const theme = useTheme()
  const { session, isLoading, terminationNotice, clearTerminationNotice } = useSession()
  const segments = useSegments()
  // Story 6.30 AL6 (ii) — `useSegments()` carries ⛔ no query and keeps group names, so the screen a link
  // asked for is read from the pathname + the GLOBAL search params (this layout is above the leaf).
  const pathname = usePathname()
  const searchParams = useGlobalSearchParams()
  const router = useRouter()

  // Expo Router auth guard: redirect unauthenticated users into the (auth) group,
  // and authenticated users out of it. The (auth) group is NOT inherently protected
  // — this guard, in the root layout, is what enforces the login wall.
  useEffect(() => {
    if (isLoading) return
    // Story 10.19 (AC5) — a background token refresh discovered the member was terminated. Routes to
    // the SAME termination surface the OTP-verify path reaches (`otp.tsx`), carrying the same AC4
    // payload fields, instead of falling through to the bare `/(auth)/login` redirect below.
    if (terminationNotice) {
      router.replace({
        pathname: '/(auth)/terminated',
        params: {
          ...(terminationNotice.groundLabelKey ? { groundLabelKey: terminationNotice.groundLabelKey } : {}),
          ...(terminationNotice.effectiveAt ? { effectiveAt: terminationNotice.effectiveAt } : {}),
          ...(terminationNotice.hasFurtherCommunication ? { hasFurtherCommunication: 'true' } : {}),
        },
      })
      clearTerminationNotice()
      return
    }
    const inAuthGroup = segments[0] === '(auth)'
    // Read as a plain array: without generated typed routes (`.expo/types` — absent in CI) `useSegments()` is typed `[string]`.
    const onOtpScreen = inAuthGroup && (segments as readonly string[])[1] === 'otp'
    if (!session && !inAuthGroup) {
      // Story 6.30 AL6 (ii) — record the requested screen IN MEMORY (an app-link path + its `c` only;
      // anything else records ⛔ no target) so `otp.tsx` can return to it after the login.
      recordLinkTarget(pathname, searchParams)
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup && !onOtpScreen) {
      // ⛔ Never reads the link-target holder — `otp.tsx` is its ONE consumer (AL6 (iii)). ⛔ Skipped on
      // `(auth)/otp` (code review 2026-10-11): `otp.tsx` routes itself on EVERY success branch (the target,
      // `/(tabs)`, `/(signup)/tc`), and its `signIn` → `router.replace(…)` commit in ONE render while
      // `useSegments()` still says `(auth)` (the router store updates in the navigation container's effect,
      // which runs AFTER this one) — so a replace from here would land LAST and send the member home.
      router.replace('/(tabs)')
    }
  }, [session, isLoading, segments, pathname, searchParams, router, terminationNotice, clearTerminationNotice])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(renewal)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(life-events)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(withdrawal)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(data-export)"
          options={{
            headerShown: false,
          }}
        />

        {/* Story 5.4 — notification settings (WhatsApp opt-in) route group. */}
        <Stack.Screen
          name="(settings)"
          options={{
            headerShown: false,
          }}
        />

        {/* Story 8.3 — the Live Contributor List route group (the member-facing live-pool view the My Pool
            card links to). */}
        <Stack.Screen
          name="(contribution)"
          options={{
            headerShown: false,
          }}
        />

        {/* Story 9.1 — the Nominee Console route group (Sunita's reconciliation surface). */}
        <Stack.Screen
          name="(nominee)"
          options={{
            headerShown: false,
          }}
        />

        {/* Story 7.10 — pool-engine onboarding tutorial route group. Presented modally (no sibling
            group uses modal presentation today, so it is wired explicitly here). */}
        <Stack.Screen
          name="(pool-onboarding)"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />

        {/* Story 10.2 — the member helpdesk route group (file + view support tickets). The
            tickets/:ticketId deep-link destination (the pre-wired helpdesk_reply target). */}
        <Stack.Screen
          name="(helpdesk)"
          options={{
            headerShown: false,
          }}
        />

        {/* Story 6.30 (AL16) — the app-link route shell for `/peer-request` (6.27a fills it). */}
        <Stack.Screen
          name="(peer-request)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            title: 'Tamagui + Expo',
            presentation: 'modal',
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            contentStyle: {
              backgroundColor: theme.background.val,
            },
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
