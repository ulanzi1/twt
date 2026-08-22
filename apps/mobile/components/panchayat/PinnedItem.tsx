import { Pressable, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack, type ColorTokens } from 'tamagui'
import type { NoticeboardRowDescriptor } from '@twt/ui'

import { useNoticeboardT } from '../../lib/noticeboard-i18n'
import { CATEGORY_HINT_KEYS, CATEGORY_TOKENS } from './tokens'

// Pinned section row per `ux-design-specification.md:1817`:
//   4pt colored left-stub · title · meta line; tap → detail.
//
// ⛔ THIS COMPONENT IS STORY 11a.6's (`<PinnedNotice>`). Story 11a.5 owns the STRIP — which sections
// exist, their order, which sources feed them, the tier filter, the empty/loading behaviour — and 11a.6
// owns the ROW. 11a.5 touched exactly TWO things here, both downstream of the CATEGORY CONTRACT it owns
// (Decision 2026-08-22-152):
//
//   1. D2(a) — the category VOCABULARY and its colour MECHANISM. `ux-design-specification.md:491`
//      (saffron/green/black) is SUPERSEDED by `:1819` (terracotta/green/black/ink). ⛔ `saffron` is dead,
//      not aliased. The raw `STUB_COLOR` hexes became ONE named semantic→Tamagui map in `./tokens.ts`
//      (D6(a); FM-14 #2), exhaustive by type so a new category cannot compile without a colour.
//   2. ⚠ THE ACCESSIBILITY HINT, which was WRONG rather than merely re-keyed: `black` meant BEREAVEMENT
//      under §491 and means SCHEDULED MEETING under §1819, so the old "memorial" hint would have told a
//      screen-reader user the wrong thing about a meeting notice.
//
// ⛔ Everything else is 11a.6's and untouched: stub width, layout, press behaviour, `numberOfLines`, the
// meta line's typography, and dismiss-with-ack (`dismissible` is a FLAG on the descriptor here and
// NOTHING else — this story wires no dismiss call).

type Props = {
  item: NoticeboardRowDescriptor
}

const STUB_WIDTH = 4

export function PinnedItem({ item }: Props) {
  const t = useNoticeboardT()
  const a11yLabel = item.meta ? `${item.title}. ${item.meta}` : item.title
  return (
    <Pressable
      onPress={() => {
        // Production wires this to the corresponding detail screen. ⛔ Story 11a.6's, not 11a.5's — which
        // is also why the row descriptor deliberately carries no link-CTA field (AC6).
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t(CATEGORY_HINT_KEYS[item.category])}
    >
      <XStack
        py={10}
        pr={16}
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor="$borderColor"
        bg="$background"
      >
        <View width={STUB_WIDTH} bg={CATEGORY_TOKENS[item.category].stub as ColorTokens} />
        <YStack flex={1} pl={12} gap={2}>
          <Text fontFamily="$body" fontSize="$4" color="$color" numberOfLines={2}>
            {item.title}
          </Text>
          {item.meta && (
            <Text fontFamily="$body" fontSize="$2" color="$colorPress">
              {item.meta}
            </Text>
          )}
        </YStack>
      </XStack>
    </Pressable>
  )
}
