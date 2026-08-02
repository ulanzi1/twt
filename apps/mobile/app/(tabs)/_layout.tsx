import { Tabs } from 'expo-router'
import { useTheme, YStack } from 'tamagui'
import { Book, FileText, Megaphone } from '@tamagui/lucide-icons-2'

import { BannerHost } from '../../components/banners/BannerHost'

// Story 10.9 — `<BannerHost>` mounts HERE, at the AUTHENTICATED layout level, and not in the root
// `app/_layout.tsx` that `architecture.md:4215` names. The root layout also wraps the `(auth)` group
// and runs the login-wall redirect guard, so a host there would mount before any member session
// exists and would have to no-op through the entire unauthenticated flow. A deliberate, recorded
// substitution (the [[project_mmkv_asyncstorage_equivalent]] note-the-substitution discipline).
//
// It renders ABOVE the tab navigator so the strip is a full-width band at the top of the surface
// (UX Pattern 9), and it SELF-SUPPRESSES to `null` whenever there is no session, no visible banner,
// or the read fails — so this wrapper adds no layout when there is nothing to show.
export default function TabLayout() {
  const theme = useTheme()

  return (
    <YStack flex={1} bg="$background">
      <BannerHost />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.red10.val,
          tabBarStyle: {
            backgroundColor: theme.background.val,
            borderTopColor: theme.borderColor.val,
          },
          headerStyle: {
            backgroundColor: theme.background.val,
            borderBottomColor: theme.borderColor.val,
          },
          headerTintColor: theme.color.val,
        }}
      >
        {/* Home tab — the "My Pool" home surface (the My Pool card is its topmost element). Story 8.6 moved
            the Yogdaan Bahi passbook to its OWN screen (app/(contribution)/yogdaan), so this tab is retitled
            from "Yogdaan Bahi" to "My Pool" to stay coherent — the passbook is reached via its home entry. */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Pool',
            tabBarIcon: ({ color }) => <Book color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="shradhanjali"
          options={{
            title: 'Shradhanjali',
            tabBarIcon: ({ color }) => <FileText color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="panchayat"
          options={{
            title: 'Panchayat',
            tabBarIcon: ({ color }) => <Megaphone color={color as any} />,
          }}
        />
      </Tabs>
    </YStack>
  )
}
