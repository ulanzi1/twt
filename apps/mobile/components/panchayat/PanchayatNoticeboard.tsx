import { useLocale } from '@twt/i18n/react'
import { deriveNoticeboardViewModel } from '@twt/ui'
import type { NoticeboardSection, NoticeboardStripViewModel } from '@twt/ui'
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'

import { useNoticeboardT } from '../../lib/noticeboard-i18n'
import { useSession } from '../../lib/session-context'
import { bannerDismissalKey } from '../banners/copy'
import { useDismissBannerMutation, useMemberBannersQuery } from '../banners/useMemberBannersQuery'
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
// silent-on-a-PERSISTENT-failure question `PollsEntry` recorded as a deliberate deferral applies here
// (`deferred-work.md`, the item beginning "`PollsEntry` ignores `usePollsQuery`'s `isError`/`isLoading`");
// this story MATCHES the posture, adds a second data point to that item, and ⛔ does not re-open it.
//
// ── Latin numerals ──────────────────────────────────────────────────────────────────────────────────
// UX `:1161` (v4): standalone counts and dates render LATIN, operational AND celebration framing alike.
// This surface currently renders no numeral at all (the two counting sections have no producer); the
// discipline itself survives as `lib/format-count.ts` for the producer story.
//
// ── Story 11a.6 adds ONE thing to this file: the acknowledgement wiring ─────────────────────────────
// ⛔ Section order, the four states, the skeleton, the masthead, the hairlines and `<PollsEntry>`'s
// position are Story 11a.5's and do not move. What is new is dismiss-with-ack (Decision 2026-08-22-153):
//
//   · D5(a) — ⭐ THE SCREEN OWNS THE DISMISSAL IDENTITY, which is why the row descriptor was NOT widened.
//     `NoticeboardRowDescriptor.id` is the bare `banner_id`, but a dismissal is keyed by
//     `bannerDismissalKey(banner_id, revision)` — a COPY REVISION bumps `revision` precisely so the
//     banner RE-SURFACES for members who dismissed the previous wording, and a bare-id key would let a
//     stale in-session dismissal swallow it. This screen already holds `data.banner` (it must, to build
//     the presenter input), so it composes the key here. ⛔ The key FORMAT is not re-implemented and
//     `components/banners/copy.ts` is not edited — there stays exactly ONE implementation.
//   · D3(a) — ONE explicit activation, POSTed through 10.9's EXISTING idempotent endpoint via the
//     EXISTING `useDismissBannerMutation`. ⛔ No confirmation modal, ⛔ no bottom sheet, ⛔ no two-step
//     confirm, ⛔ no swipe-only path, ⛔ no auto-dismiss on scroll or timer. `:2318` reserves confirmation
//     for IRREVERSIBLE actions and a dismissal is reversible by a copy revision.
//   · D4(a) — the optimistic write ROLLS BACK on failure. A failed write must never permanently hide a
//     notice the server did not suppress (the `BannerHost.tsx:162-170` posture).
//   · ⛔ TRAP 4 — `{kind:'shown'}` is NOT posted from here. `<BannerHost>` already reports it on this
//     tab (its route suppression is placed AFTER that effect, deliberately), its `useRef` once-guard is
//     NOT shared, and `shown` suppresses IDENTICALLY to `dismissed` — so a second reporter would be a
//     genuine double-post racing the first on the same suppression.
//   · D7(a) — ⛔ NONE of `components/banners/{BannerHost,copy,route-suppression,useMemberBannersQuery}`
//     is edited. The duplicated optimistic-set + rollback shape is ROUTED, declined on blast radius.

export function PanchayatNoticeboard() {
  const t = useNoticeboardT()
  const { locale } = useLocale()
  const { session } = useSession()
  const pariwarId = session?.pariwarId ?? null

  const { data, isLoading, isFetching } = useMemberBannersQuery(pariwarId)
  const dismiss = useDismissBannerMutation(pariwarId)

  const banner = data?.banner ?? null

  const bannerNotice = useMemo(
    () => toNoticeboardBannerNotice(banner, locale),
    [banner, locale],
  )

  // The optimistic acknowledgement window, keyed by `bannerId:revision` (D5(a)). ⚠ Its LIFETIME is the
  // server's business, not this set's: the mutation invalidates `onSettled`, 10.9's dismissal join
  // suppresses the banner on the re-read, and the row is simply gone. ⛔ Nothing here is persisted to
  // MMKV and ⛔ there is no client-side expiry.
  const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(new Set())

  const onDismiss = useCallback(() => {
    if (!banner) return
    const key = bannerDismissalKey(banner.banner_id, banner.revision)
    setAcknowledged((prev) => new Set(prev).add(key))
    dismiss.mutate(
      { bannerId: banner.banner_id, kind: 'dismissed' },
      {
        // Roll back: a failed write must never permanently hide a notice the server did not suppress.
        onError: () =>
          setAcknowledged((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          }),
      },
    )
  }, [banner, dismiss])

  // ⭐ The row is `dismissed` only while the optimistic window is open. There is at most ONE row (the
  // banner lane is the noticeboard's only producer), so the correlation is a direct id match rather than
  // a lookup table — and it is an EXPLICIT match, so a future second producer cannot silently inherit
  // this banner-specific state.
  const isAcknowledged = (rowId: string): boolean =>
    banner !== null &&
    rowId === banner.banner_id &&
    acknowledged.has(bannerDismissalKey(banner.banner_id, banner.revision))

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
            isAcknowledged={isAcknowledged}
            onDismiss={onDismiss}
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
  isAcknowledged,
  onDismiss,
}: {
  section: NoticeboardSection
  vm: NoticeboardStripViewModel
  t: Translate
  isFirst: boolean
  isAcknowledged: (rowId: string) => boolean
  onDismiss: () => void
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
                <PinnedItem
                  key={row.id}
                  item={row}
                  acknowledged={isAcknowledged(row.id)}
                  onDismiss={onDismiss}
                />
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
