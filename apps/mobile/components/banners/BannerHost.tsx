// <BannerHost> — the member-app banner + popup surface (Story 10.9, Task 7; AC3/AC8).
//
// Mounted at the AUTHENTICATED layout level, it renders (a) a full-width strip at the top of the
// surface and (b) a modal popup overlay, each with a dismiss affordance that POSTs the acknowledgement.
//
// ── Where it mounts, and why not the root layout ──────────────────────────────────────────────────
// `architecture.md:4215` reserves `app/_layout.tsx  # Banner rendering at layout level`. The ROOT
// layout also wraps the `(auth)` group and runs the login-wall redirect guard, so a host there would
// mount before any member session exists and no-op through the entire unauthenticated flow. This
// mounts in `app/(tabs)/_layout.tsx` — the authenticated layout level, where every member-facing
// surface actually lives. Recorded as a deliberate substitution in the Dev Agent Record (the
// [[project_mmkv_asyncstorage_equivalent]] "note-the-substitution" discipline).
//
// ── Self-suppression + fail-soft (the house rule) ─────────────────────────────────────────────────
// Renders `null` on no session, no visible banner, a loading read, OR a failed read — the
// `ActiveContributionCard` / `LockInClockWidget` posture. A banner is ambient chrome: it must never
// take a screen down, and a fetch failure must never manufacture an error surface of its own.
//
// ── The client resolves NOTHING (AC5) ─────────────────────────────────────────────────────────────
// The server returns an already-resolved `{ banner, popup }` pair. Both may be present at once — the
// two display modes are INDEPENDENT LANES, so a popup never suppresses the strip. This component
// renders what it is given and re-implements no precedence rule.
//
// ── Hindi-first (AC8) ─────────────────────────────────────────────────────────────────────────────
// The banner's OWN copy is AUTHORED bilingual content on the row, not an i18n catalog key: under the
// default `hi` locale it renders `title_hi`/`body_hi`, under `en` it renders `title`/`body`, with a
// fall-back to the other language rather than a blank banner. The dismiss/close CHROME goes through
// `packages/i18n` (`banners` namespace) with en/hi parity.
//
// ── No JS alert/confirm, no Alert.alert (AC8) ─────────────────────────────────────────────────────
// The popup is a rendered Tamagui overlay inside this host — self-contained, keeps the tab bar
// intact, and (unlike a native dialog) cannot block the JS bridge.

import { useLocale, useT } from '@twt/i18n/react'
import type { MemberBannerResponse } from '@twt/contracts'
import { X } from '@tamagui/lucide-icons-2'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Paragraph, Text, View, XStack, YStack, type ColorTokens } from 'tamagui'

import { useSession } from '../../lib/session-context'
import { bannerDismissalKey, selectBannerCopy } from './copy'
import { useDismissBannerMutation, useMemberBannersQuery } from './useMemberBannersQuery'

/** The banner chrome i18n namespace (the `banners` catalog — dismiss/close labels only). */
const NS = { namespace: 'banners' } as const

/** The ≥44pt minimum touch target the UX spec requires for a dismiss affordance (AC8). */
const MIN_TOUCH_TARGET = 44

/**
 * The mobile-palette bridge for banner severity — the ONLY place severity → Tamagui theme token
 * lives (the `StatusPill` `TONE_TOKENS` precedent; FM-14 #2 — colours come from a token authority,
 * never a magic literal). Severity is ALSO signalled by the copy itself and by the a11y label, so
 * the treatment is never colour-only.
 */
const SEVERITY_TOKENS = {
  info: { bg: '$blue3', border: '$blue8', color: '$blue11' },
  warning: { bg: '$yellow3', border: '$yellow8', color: '$yellow11' },
  critical: { bg: '$red3', border: '$red8', color: '$red11' },
} as const satisfies Record<
  MemberBannerResponse['severity'],
  { bg: ColorTokens | string; border: ColorTokens | string; color: ColorTokens | string }
>

interface BannerBodyProps {
  banner: MemberBannerResponse
  locale: string
  onDismiss: () => void
  dismissA11y: string
  testIDPrefix: string
}

/** The shared copy + dismiss-affordance block, used by both the strip and the popup. */
function BannerContent({
  banner,
  locale,
  onDismiss,
  dismissA11y,
  testIDPrefix,
}: BannerBodyProps) {
  const { title, body } = selectBannerCopy(banner, locale)
  const tone = SEVERITY_TOKENS[banner.severity]

  return (
    <XStack gap="$3" items="flex-start" justify="space-between">
      <YStack flex={1} gap="$1">
        {title !== '' && (
          <Text fontWeight="700" color={tone.color as ColorTokens} testID={`${testIDPrefix}-title`}>
            {title}
          </Text>
        )}
        {body !== '' && (
          <Paragraph size="$3" color={tone.color as ColorTokens} testID={`${testIDPrefix}-body`}>
            {body}
          </Paragraph>
        )}
      </YStack>
      {/* AC4 in the render: the affordance exists iff the banner is dismissible. A popup is ALWAYS
          dismissible (enforced by a domain 422 AND a DB CHECK), so this is never absent on a popup.
          `dismissLabel` reaches the screen reader via `accessibilityLabel` alone — no visually-hidden
          text child, which risked a double or conflicting announcement depending on how the
          underlying platform view merges an accessible parent's label with accessible children. */}
      {banner.dismissible && (
        <Button
          size="$2"
          chromeless
          circular
          icon={X}
          onPress={onDismiss}
          testID={`${testIDPrefix}-dismiss`}
          accessibilityRole="button"
          accessibilityLabel={dismissA11y}
          // ≥44pt touch target (AC8). Applied via the raw-style escape hatch: Tamagui's shorthand
          // set has no min-width/min-height prop, and the target size is a hard a11y floor rather
          // than a themeable token.
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
        />
      )}
    </XStack>
  )
}

export function BannerHost() {
  const t = useT()
  const { locale } = useLocale()
  const { session } = useSession()
  const pariwarId = session?.pariwarId ?? null

  const { data, isLoading, isError } = useMemberBannersQuery(pariwarId)
  const dismiss = useDismissBannerMutation(pariwarId)

  // Optimistic local removal (AC8): the banner disappears on tap, and the next fetch reconciles.
  // Keyed by `bannerId:revision` so a COPY REVISION (which bumps `revision` and is meant to
  // re-surface the banner) is not swallowed by a stale local dismissal from the previous revision.
  const [locallyDismissed, setLocallyDismissed] = useState<ReadonlySet<string>>(new Set())

  /** Which display-once banners we have already reported as `shown` — guards a re-render double-post. */
  const shownReported = useRef<Set<string>>(new Set())

  const banner = data?.banner ?? null
  const popup = data?.popup ?? null

  const keyOf = (b: MemberBannerResponse): string => bannerDismissalKey(b.banner_id, b.revision)

  const onDismiss = useCallback(
    (b: MemberBannerResponse) => {
      const key = keyOf(b)
      setLocallyDismissed((prev) => new Set(prev).add(key))
      dismiss.mutate(
        { bannerId: b.banner_id, kind: 'dismissed' },
        {
          // A failed write must not permanently hide a banner the server never actually suppressed —
          // roll back the optimistic removal so the strip/popup reappears (the next poll would
          // otherwise be the only recovery, and this component has no polling interval).
          onError: () => setLocallyDismissed((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          }),
        },
      )
    },
    [dismiss],
  )

  // `display_once_per_member` (AC3): report `shown` on FIRST render so the banner never renders
  // twice. The ref guard makes this once-per-(banner, revision) even across re-renders; the server
  // upsert is idempotent, so a duplicate would be harmless anyway — this just avoids the round trip.
  useEffect(() => {
    if (!pariwarId) return
    for (const b of [banner, popup]) {
      if (!b || !b.display_once_per_member) continue
      const key = keyOf(b)
      if (shownReported.current.has(key)) continue
      shownReported.current.add(key)
      dismiss.mutate(
        { bannerId: b.banner_id, kind: 'shown' },
        {
          // A failed 'shown' write must be retryable — without this, a single network hiccup would
          // mark the key as "reported" forever, even though the server never recorded it.
          onError: () => shownReported.current.delete(key),
        },
      )
    }
    // Keyed off the RESOLVED PAIR's identity (id + revision), not the object references: React Query
    // hands back a fresh object each fetch, so depending on `banner`/`popup` themselves would re-run
    // this on every poll. `dismiss` is a stable mutation object. The ref guard above is the real
    // once-ness guarantee; these deps just avoid needless work.
  }, [pariwarId, banner?.banner_id, banner?.revision, popup?.banner_id, popup?.revision])

  // ── Self-suppression (AC8) ────────────────────────────────────────────────────────────────────
  // No session, a loading read, a FAILED read, or nothing visible → render nothing at all. A banner
  // is ambient chrome; it must never replace a screen or manufacture its own error surface.
  if (!pariwarId || isLoading || isError || !data) return null

  const visibleBanner = banner && !locallyDismissed.has(keyOf(banner)) ? banner : null
  const visiblePopup = popup && !locallyDismissed.has(keyOf(popup)) ? popup : null
  if (!visibleBanner && !visiblePopup) return null

  const dismissA11y = t('dismiss_a11y', NS)
  const closeA11y = t('close_a11y', NS)

  return (
    <>
      {/* (a) The strip — full-width, top of surface (UX Pattern 9), announced when it appears. */}
      {visibleBanner && (
        <View
          testID="banner-strip"
          accessibilityLiveRegion="polite"
          bg={SEVERITY_TOKENS[visibleBanner.severity].bg as ColorTokens}
          borderColor={SEVERITY_TOKENS[visibleBanner.severity].border as ColorTokens}
          px="$3"
          py="$2.5"
          width="100%"
          // The left accent bar is a raw style: Tamagui's shorthands cover the uniform border only.
          style={{ borderLeftWidth: 4 }}
        >
          <BannerContent
            banner={visibleBanner}
            locale={locale}
            onDismiss={() => onDismiss(visibleBanner)}
            dismissA11y={dismissA11y}
            testIDPrefix="banner-strip"
          />
        </View>
      )}

      {/* (b) The popup — a rendered Tamagui overlay, NOT Alert.alert / alert() / confirm() (AC8).
          Its dismiss affordance is always present and always enabled: a popup is structurally
          dismissible (the domain 422 + the DB CHECK), so no member can ever be trapped here. */}
      {visiblePopup && (
        <View
          testID="banner-popup-overlay"
          justify="center"
          items="center"
          p="$4"
          accessibilityViewIsModal
          accessibilityLabel={t('popup_a11y', NS)}
          // Scrim + stacking: raw styles, since neither an absolute-fill nor a z-index is a themeable
          // Tamagui token here.
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }]}
        >
          <View
            testID="banner-popup"
            accessibilityLiveRegion="polite"
            bg="$background"
            borderWidth={1}
            borderColor={SEVERITY_TOKENS[visiblePopup.severity].border as ColorTokens}
            rounded="$4"
            p="$4"
            width="100%"
            style={{ borderLeftWidth: 4, maxWidth: 420 }}
          >
            <BannerContent
              banner={visiblePopup}
              locale={locale}
              onDismiss={() => onDismiss(visiblePopup)}
              dismissA11y={closeA11y}
              testIDPrefix="banner-popup"
            />
          </View>
        </View>
      )}
    </>
  )
}
