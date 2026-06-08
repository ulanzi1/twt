import '../tamagui.generated.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Provider } from 'components/Provider'
import { useTheme } from 'tamagui'

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

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const theme = useTheme()
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
