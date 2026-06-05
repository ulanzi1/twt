import { View } from 'tamagui'

// Centered square portrait wrapped in a black border with a white inset per
// UX spec line 471: "the classic black-border-on-white funeral frame,
// rendered as nested borders — not box-shadow".
//
// Implementation: outer View (black bg + padding) → inset View (white bg +
// padding) → portrait area (gray placeholder for prototype; production will
// render an opt-in DPDPA-consented photo per UX spec §1 line 79).
//
// P1 measurement surface: tests whether nested borders render at subpixel
// crispness on Mali GPU (Redmi 10) vs Adreno baseline (Snapdragon target).

type Props = {
  /** Portrait edge length in dp; default 160 per UX spec restrained reading-width discipline */
  size?: number
}

const OUTER_BORDER_WIDTH = 6
const WHITE_INSET_WIDTH = 4

export function MemorialPortrait({ size = 160 }: Props) {
  return (
    <View
      width={size}
      height={size}
      backgroundColor="#000000"
      alignItems="center"
      justifyContent="center"
      padding={WHITE_INSET_WIDTH}
    >
      <View
        flex={1}
        width="100%"
        backgroundColor="#FFFFFF"
        alignItems="center"
        justifyContent="center"
        padding={OUTER_BORDER_WIDTH}
      >
        {/* Portrait area — gray placeholder for prototype.
            Production will render opt-in DPDPA-consented photo. */}
        <View
          flex={1}
          width="100%"
          backgroundColor="#D8D6D3"
        />
      </View>
    </View>
  )
}
