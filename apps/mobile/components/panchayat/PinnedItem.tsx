import { X } from '@tamagui/lucide-icons-2'
import { StyleSheet } from 'react-native'
import { Button, Text, View, XStack, YStack, type ColorTokens } from 'tamagui'
import { PINNED_NOTICE_A11Y_SEPARATOR, derivePinnedNoticeViewModel } from '@twt/ui'
import type { NoticeboardRowDescriptor } from '@twt/ui'

import { useNoticeboardT } from '../../lib/noticeboard-i18n'
import { CATEGORY_TOKENS, PINNED_ROW_OPACITY } from './tokens'

// `<PinnedNotice>` — the noticeboard ROW (Story 11a.6; Decision 2026-08-22-153). Per
// `ux-design-specification.md:1817`: 4pt colored left-stub · title · meta line.
//
// ── ⭐ THE ROW, ⛔ NOT A BANNER (D1(a)) ─────────────────────────────────────────────────────────────
// The epic's 11a.6 AC prose asks for a "persistent pinned banner above the fold with title, body,
// severity, dismiss-with-ack". Every one of those words already describes `<BannerHost>` (Story 10.9),
// mounted at `app/(tabs)/_layout.tsx:21` above EVERY authenticated tab. Four ratified sources say ROW —
// the AC's own `Given` anchor UX-DR16 (`epics.md:406`: "Noticeboard ROW primitive with left colored
// stub"), UX `:680`, UX `:1222`, and the component contract at `:1814-1821` ("a single notice ROW …
// Surfaces: Inside `<NoticeboardStrip>`"). ⇒ the `Then` prose is a DEFECTIVE AC SENTENCE, and building
// it would have made a THIRD banner — recreating, deliberately, the one-banner-twice bug Story 11a.5
// spent a whole ruling (D7(a)) fixing. ⛔ No new surface, ⛔ no sticky behaviour, ⛔ no second mount point.
//
// The epic's four field names, reconciled explicitly against `:1817` (the `view-model.ts:133-163`
// precedent — ⛔ do not re-derive this):
//   · `title`            → `title`.
//   · `body`             → `meta`, ONE field. §1817's row anatomy has exactly one secondary line.
//   · `severity`         → MAPPED INTO `category` in the strip presenter (D2(a) of `-152`). ⛔ NEVER a
//                          second axis here: ⛔ no severity prop, tint, icon or badge. The row anatomy
//                          has exactly ONE colour slot and `category` owns it.
//   · `dismiss-with-ack` → the affordance below, POSTed by the SCREEN through Story 10.9's EXISTING
//                          endpoint. ⛔ No new endpoint, ⛔ no new mutation, ⛔ no new persistence.
//
// ── ⭐ D6(a): THE ROW IS NON-INTERACTIVE CONTENT, and this REMOVES A LIE ────────────────────────────
// The shipped prototype announced `accessibilityRole="button"` + "Tap to open … notice detail" over an
// EMPTY `onPress` body. There is no detail screen and the row descriptor carries no link CTA (left out
// and ROUTED), so a screen-reader user was told there was a destination, activated the control, and
// nothing happened. D6(a) removes the claim rather than inventing a destination — ⛔ inventing one is
// scope invention and pre-empts the routed item's trigger. The CATEGORY moves from the hint into the
// LABEL, which is what `ux-design-specification.md:1820` asked for in the first place.
//
// ⚠ ⭐ THE GROUPING BELOW IS DELIBERATE AND HAS NO IN-REPO PRECEDENT — ⛔ do not "simplify" it away.
// RN sets `accessible={true}` on `Pressable` by DEFAULT, and that is the ONLY reason UX `:1820`'s
// "title and meta read as a unit" held before this story. Dropping the `Pressable` drops the mechanism,
// so the unit is re-established EXPLICITLY, around title+meta ONLY.
//
// ⚠ ⛔ AND THE DISMISS CONTROL IS A SIBLING OF THAT WRAPPER, ⛔ NEVER A CHILD. A control nested inside an
// `accessible` container is not individually focusable to a screen reader — which would make the row's
// only remaining action unreachable, trading one a11y defect for a worse one.
//
// ── ⛔ What this component does NOT do ──────────────────────────────────────────────────────────────
// ⛔ It does not filter by tier. The Story 11a.1 matrix rule shipped in the strip presenter at 11a.5
// (`presenter.ts:63-100`); a row only reaches here having ALREADY passed it, so a second filter could
// only ever disagree with the first (AC5). ⛔ It holds no query, no mutation and no dismissal identity —
// the SCREEN owns those (D5(a)). ⛔ It never posts `{kind:'shown'}`: `<BannerHost>` already reports that
// on this tab and its once-guard is not shared, so a second reporter is a genuine double-post.

type Props = {
  item: NoticeboardRowDescriptor
  /**
   * Whether the member has acknowledged THIS notice — the optimistic window only. The screen owns the
   * identity behind it (`bannerDismissalKey(banner_id, revision)`), because the row descriptor is
   * source-agnostic and 10.9's `revision` is source-specific (D5(a)).
   */
  acknowledged: boolean
  /** The member's ONE explicit acknowledgement. ⛔ No confirm step, no sheet, no swipe (D3(a)). */
  onDismiss: () => void
}

const STUB_WIDTH = 4

/**
 * The ≥44pt touch-target floor (`ux-design-specification.md:2310`) — the `BannerHost.tsx:57`
 * `MIN_TOUCH_TARGET` precedent, as a NAMED constant rather than an anonymous `44`.
 *
 * ⚠ It is named for a second reason worth stating: the mobile harness is pure Vitest with NO component
 * renderer, so this floor can only be asserted by a SOURCE SCAN. An inline literal would be unassertable.
 */
const MIN_TOUCH_TARGET = 44

export function PinnedItem({ item, acknowledged, onDismiss }: Props) {
  const t = useNoticeboardT()
  const vm = derivePinnedNoticeViewModel({ row: item, acknowledged })

  // The label's COMPOSITION — which parts, in what order, and the separator between them — is the
  // presenter's pure, tested property (AC6). This resolves the keys and nothing more; ⛔ there is no
  // string concatenation decision left here, which is what keeps the empty-title case fixed in ONE place.
  const a11yLabel = vm.labelParts
    .map((part) => (part.kind === 'key' ? t(part.key) : part.text))
    .join(PINNED_NOTICE_A11Y_SEPARATOR)

  return (
    <XStack
      py={10}
      pr={16}
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderBottomColor="$borderColor"
      bg="$background"
      // The RATIFIED `dismissed` state (UX `:1818`), faded rather than removed (D4(a)). The STATE is the
      // presenter's; the emphasis VALUE comes from the token bridge — ⛔ never an inline literal.
      opacity={PINNED_ROW_OPACITY[vm.state]}
    >
      {/* Decorative (§1820) — the category also reaches the label, so colour is never the sole channel. */}
      <View width={STUB_WIDTH} bg={CATEGORY_TOKENS[vm.category].stub as ColorTokens} />

      {/* ⭐ THE EXPLICIT a11y UNIT (UX `:1820`), replacing the one the `Pressable` provided by default.
          It wraps title+meta ONLY, and the dismiss control below is its SIBLING — see the header. */}
      <YStack flex={1} pl={12} gap={2} accessible={true} accessibilityLabel={a11yLabel}>
        {vm.title !== null && (
          <Text fontFamily="$body" fontSize="$4" color="$color" numberOfLines={2}>
            {vm.title}
          </Text>
        )}
        {vm.meta !== null && (
          <Text fontFamily="$body" fontSize="$2" color="$colorPress">
            {vm.meta}
          </Text>
        )}
      </YStack>

      {/* The row's ONLY control, and only when the presenter says there is one: absent for a
          NON-dismissible notice (legal and reachable — `packages/domain/src/banners/errors.ts:84-86`)
          and absent once acknowledged, so it cannot be double-fired. */}
      {vm.dismiss !== null && (
        <Button
          size="$2"
          chromeless
          circular
          // Vertically centred against a 1- or 2-line row; the XStack's default `stretch` is what keeps
          // the 4pt stub full-height, so the control opts out of it rather than the row opting out.
          self="center"
          icon={X}
          onPress={onDismiss}
          testID="pinned-notice-dismiss"
          accessibilityRole="button"
          accessibilityLabel={t(vm.dismiss.labelKey)}
          // The raw-style escape hatch, per the `BannerHost.tsx:122-125` precedent: Tamagui's shorthand
          // set has no min-width/min-height prop, and the target size is a hard a11y floor rather than a
          // themeable token.
          style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
        />
      )}
    </XStack>
  )
}
