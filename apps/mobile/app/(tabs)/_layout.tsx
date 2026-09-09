import { useT } from '@twt/i18n/react'
import { Tabs } from 'expo-router'
import { useTheme, YStack } from 'tamagui'
import { Book, FileText, HandHeart, Megaphone } from '@tamagui/lucide-icons-2'

import { BannerHost } from '../../components/banners/BannerHost'

// ⭐ Story 11b.15 — the fourth tab's OWN chrome namespace. ⛔ NOT `sahyog-shared`: that namespace is
// story B's shared STAGE copy (`2026-09-04-193` cl.3) and its own header forbids widening it with
// app chrome. ⚠ `t()` defaults to `common` and THROWS on a miss, so the namespace is explicit.
const DRIVE_LIST_NS = { namespace: 'member-drive-list' } as const

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
  // ⚠ The locale-bound hook, ⛔ not the raw `t` — this is a React component, and `useT()` is what
  // re-renders the bar when the member switches language. ⛔ Do ⛔ not hand-thread `locale` here;
  // the raw `t(key, undefined, { locale, namespace })` form is for NON-React callers and tests.
  const t = useT()

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
        {/* ⭐⭐ TAB 4 — the member's drive list (Story 11b.15, AC1). A PEER of My Pool
            (`2026-09-04-194` cl.2), ⛔ deliberately NOT a route buried inside it.

            ⚠⛔⛔ **IT SUPERSEDES A RECORDED REJECTION, AND THE REJECTION IS NAMED RATHER THAN
            OVERWRITTEN** ([[feedback_supersede_never_reinterpret]]). Story **10.15** (`done`)
            records, in its load-bearing-decisions table (`10-15-survey-poll.md:134`), the rejected
            alternative: *"A dedicated 4th bottom tab → the tab bar is at three and the UX spec does
            not add one. Enter from Panchayat."*
            ⭐ `-194` cl.2 is the ruling that CHANGES that, and 10.15's ground was **negative
            evidence only** — ⚠ verified live: `ux-design-specification.md` fixes ⛔ NO tab count,
            and its single *"tab bar"* mention (`:481`) is unrelated (it is the Shradhanjali
            three-second test). ⇒ ⛔ do ⛔ NOT read 10.15 and revert this tab; 10.15's own entry
            point from Panchayat is untouched and stays correct for SURVEYS.

            ⚠⛔ **AND THE TITLE IS `t()`-RESOLVED WHILE ITS THREE SIBLINGS ARE HARDCODED ENGLISH
            LITERALS — a DELIBERATE, RECORDED departure** (BigDev, 2026-09-09; Story 11b.15 Trap 4).
            ⭐ The ground: ⛔ new member-facing copy is ⛔ never minted untranslated in a bilingual
            app. ⛔ The three existing literals above are **PRE-EXISTING** and are ⛔ NOT swept here
            — a tab-bar i18n sweep is a whole-bar decision, ⛔ not this story's to take unasked.
            ⚠ Checked first, ⛔ not assumed: the repo's i18n CI gate (`i18n:check-parity`) is an
            **en/hi key-parity** gate and would ⛔ not have caught a fourth hardcoded title — so this
            was a genuine choice rather than a gate-forced one. */}
        <Tabs.Screen
          name="sahyog"
          options={{
            title: t('tab.title', undefined, DRIVE_LIST_NS),
            tabBarIcon: ({ color }) => <HandHeart color={color as any} />,
          }}
        />
      </Tabs>
    </YStack>
  )
}
