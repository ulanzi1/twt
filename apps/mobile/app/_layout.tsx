import '../tamagui.generated.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { LocaleProvider } from '@twt/i18n/react'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router'
import { Provider } from 'components/Provider'
import { useTheme } from 'tamagui'
import { SessionProvider, useSession } from '../lib/session-context'

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
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <LocaleProvider>
      <SessionProvider>
        <Provider>{children}</Provider>
      </SessionProvider>
    </LocaleProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const theme = useTheme()
  const { session, isLoading } = useSession()
  const segments = useSegments()
  const router = useRouter()

  // Expo Router auth guard: redirect unauthenticated users into the (auth) group,
  // and authenticated users out of it. The (auth) group is NOT inherently protected
  // — this guard, in the root layout, is what enforces the login wall.
  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [session, isLoading, segments, router])

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

        {/* Story 7.10 — pool-engine onboarding tutorial route group. Presented modally (no sibling
            group uses modal presentation today, so it is wired explicitly here). */}
        <Stack.Screen
          name="(pool-onboarding)"
          options={{
            headerShown: false,
            presentation: 'modal',
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
