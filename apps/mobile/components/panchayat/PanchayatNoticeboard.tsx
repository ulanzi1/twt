import { useLocale } from '@twt/i18n/react'
import { deriveNoticeboardViewModel } from '@twt/ui'
import type { NoticeboardSection, NoticeboardStripViewModel } from '@twt/ui'
import { useMemo } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'

import { useNoticeboardT } from '../../lib/noticeboard-i18n'
import { useSession } from '../../lib/session-context'
import { useMemberBannersQuery } from '../banners/useMemberBannersQuery'
import { PollsEntry } from '../polls/PollsEntry'
import { PinnedItem } from './PinnedItem'
import { toNoticeboardBannerNotice } from './banner-notice'
import { RULE_HAIRLINE_TOKEN } from './tokens'

// The Panchayat Noticeboard — `<NoticeboardStrip>`'s mobile render (Story 11a.5, Task 3).
//
// ⭐ PROMOTED, NOT AUTHORED. This screen shipped as a Story 0.14 P0-5 native-stack VALIDATION PROTOTYPE
// whose every row was a hardcoded fixture. Story 11a.5 makes it real:
//
//   · Its COMPOSITION now comes from the headless `@twt/ui` presenter — section identity, ORDER, the
//     tier filter, and all four ratified states (UX `:1808`) are properties of `deriveNoticeboardViewModel`,
//     ⛔ never of this file's JSX ordering. This component walks `vm.sections` and renders each arm.
//   · Its DATA now comes from one real source: the Story 10.9 banner lane, read through the EXISTING
//     `useMemberBannersQuery` — one fetch, one cache, one server-resolved winner (D7(a)).
//   · Its FABRICATED sections are gone. `SAMPLE_RECENT_CLOSINGS` published FIVE INVENTED
//     DECEASED-MEMBER NAMES on a live member tab; `SAMPLE_STATS` and `SAMPLE_NEXT_MEETING` invented an
//     operational stat line and a meeting date. All deleted (D3(a) / AC4) — ⛔ not relocated and ⛔ not
//     commented out. Those sections have NO PRODUCER, so they render NOTHING and say nothing.
//   · Its CHROME now resolves through `@twt/i18n` (`noticeboard` namespace, hi-primary + en parity).
//     ⛔ Notice CONTENT is not catalog copy — an operator's title and body arrive as DATA.
//
// ── Orientation is settled (⛔ do not re-derive it) ──────────────────────────────────────────────────
// `ux-design-specification.md:1806`: "Full-width VERTICAL stack" — ⛔ no orientation prop and ⛔ no
// horizontal variant, whatever the epic's "horizontal or vertical strip" says.
//
// ── Fail-soft, the house rule ───────────────────────────────────────────────────────────────────────
// A failed read renders as an EMPTY noticeboard, not an error surface — the `<BannerHost>` /
// `<PollsEntry>` posture ("a quiet noticeboard stays quiet"). ⚠ The same
// silent-on-a-PERSISTENT-failure question `PollsEntry` recorded as a deliberate deferral
// (`deferred-work.md:5993`) applies here; this story MATCHES the posture and ⛔ does not re-open it.
//
// ── Latin numerals ──────────────────────────────────────────────────────────────────────────────────
// UX `:1161` (v4): standalone counts and dates render LATIN, operational AND celebration framing alike.
// This surface currently renders no numeral at all (the two counting sections have no producer); the
// discipline itself survives as `lib/format-count.ts` for the producer story.

export function PanchayatNoticeboard() {
  const t = useNoticeboardT()
  const { locale } = useLocale()
  const { session } = useSession()
  const pariwarId = session?.pariwarId ?? null

  const { data, isLoading, isFetching } = useMemberBannersQuery(pariwarId)

  const bannerNotice = useMemo(
    () => toNoticeboardBannerNotice(data?.banner ?? null, locale),
    [data?.banner, locale],
  )

  const vm: NoticeboardStripViewModel = deriveNoticeboardViewModel(
    {
      // The three ratified load states, mapped from React Query. `isLoading` is the FIRST read only;
      // a background re-read with content already on screen is `refreshing`, which the presenter keeps
      // visually distinct from `loading` (UX `:1808`).
      status: isLoading ? 'loading' : isFetching ? 'refreshing' : 'ready',
      // The only viewer fact the tier filter reads. The member app has no signed-out render today; the
      // predicate ships in the presenter anyway so the rule exists before the surface does (D5(a)).
      viewer: { isAuthenticated: pariwarId !== null },
      bannerNotice,
    },
    // `now` is INJECTED at the render boundary — the presenter never reaches for the clock, so every
    // window boundary stays unit-testable and replay-deterministic.
    new Date(),
  )

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {vm.sections.map((section, index) => (
          <Section
            key={section.id}
            section={section}
            vm={vm}
            t={t}
            // A hairline separates sections that actually rendered something, per UX `:490-494`.
            isFirst={index === 0}
          />
        ))}
      </ScrollView>
    </YStack>
  )
}

type Translate = (key: string) => string

/**
 * One section. The `id` chooses the LAYOUT; the presenter's `render` arm chooses WHETHER and WHAT.
 * ⛔ This function never decides section order — that is `vm.sections`' order, and only the presenter
 * sets it.
 */
function Section({
  section,
  vm,
  t,
  isFirst,
}: {
  section: NoticeboardSection
  vm: NoticeboardStripViewModel
  t: Translate
  isFirst: boolean
}) {
  const { render } = section

  // A section with no producer renders NOTHING and says nothing — ⛔ never a fabricated row and ⛔ never
  // a "coming soon" placeholder (AC4). ⛔ It does not borrow the pinned section's empty copy: "the
  // Pariwar has pinned nothing" is information; "this project has not built the read model" is not.
  if (render.kind === 'silent' && section.id !== 'pinned') return null

  switch (section.id) {
    case 'masthead':
      return <Masthead t={t} />

    case 'polls':
      // ⛔ Story 10.15 owns `<PollsEntry>`'s content AND its own render-nothing-when-empty behaviour.
      // This screen owns only its POSITION, which the presenter dictates — an ADDITION to the
      // noticeboard, never a restructuring of it.
      return <PollsEntry />

    case 'pinned':
      return (
        <>
          {!isFirst && <Hairline />}
          <SectionHeader title={t(section.headerKey!)} />
          {vm.state === 'loading' ? (
            <PinnedSkeleton rows={vm.skeleton?.noticeRows ?? 0} label={t('loading_a11y')} />
          ) : render.kind === 'rows' ? (
            <YStack accessibilityRole="list" accessibilityLabel={t('pinned_list_a11y')}>
              {render.rows.map((row) => (
                <PinnedItem key={row.id} item={row} />
              ))}
            </YStack>
          ) : render.kind === 'empty-with-copy' ? (
            // The RATIFIED empty copy (UX `:1808`) — a real source that is currently empty is
            // information a member is owed, and silence would say something different and wrong.
            <Text px={16} pb={12} fontFamily="$body" fontSize="$3" color="$colorPress">
              {t(render.copyKey)}
            </Text>
          ) : null}
        </>
      )

    // `stats`, `recent-closings` and `next-meeting` have no producer and are filtered out above. They
    // remain in the presenter's section list because they remain in the ratified anatomy — their
    // absence is ROUTED, not forgotten.
    default:
      return null
  }
}

/** Top strip per UX `:488` — Pariwar seal left, title centre. */
function Masthead({ t }: { t: Translate }) {
  return (
    <XStack px={16} py={16} items="center">
      {/* Pariwar seal stub — production uses the Stamp atom per UX spec line 679. */}
      <View
        width={32}
        height={32}
        borderWidth={1.5}
        borderColor="$color"
        rounded={16}
        items="center"
        justify="center"
        accessibilityLabel={t('seal_a11y')}
      >
        <Text fontFamily="$heading" fontSize="$2" color="$color">
          ट
        </Text>
      </View>
      <Text
        flex={1}
        fontFamily="$heading"
        fontSize="$6"
        color="$color"
        text="center"
        // Visual balance: seal width on the right side as a spacer.
        pr={32}
        accessibilityRole="header"
      >
        {t('masthead_title')}
      </Text>
    </XStack>
  )
}

/**
 * The ratified `loading` anatomy (UX `:1808`) — "top + first 2 notices skeleton". ⛔ NOT a spinner and
 * ⛔ NOT a blank screen; the row COUNT comes from the presenter, never from this file.
 */
function PinnedSkeleton({ rows, label }: { rows: number; label: string }) {
  return (
    <YStack accessibilityLabel={label} accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <XStack
          key={`skeleton-${String(i)}`}
          py={10}
          pr={16}
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
        >
          <View width={4} bg="$gray6" />
          <YStack flex={1} pl={12} gap={6}>
            <View height={14} width="70%" bg="$gray5" />
            <View height={10} width="40%" bg="$gray4" />
          </YStack>
        </XStack>
      ))}
    </YStack>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <XStack px={16} pt={16} pb={8}>
      <Text
        fontFamily="$body"
        fontSize="$2"
        color="$colorPress"
        letterSpacing={2}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </XStack>
  )
}

/** The section-separating rule. Colour comes from `./tokens.ts` — ⛔ never a hex here (FM-14 #2). */
function Hairline() {
  return <View height={StyleSheet.hairlineWidth} bg={RULE_HAIRLINE_TOKEN} width="100%" />
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
})
