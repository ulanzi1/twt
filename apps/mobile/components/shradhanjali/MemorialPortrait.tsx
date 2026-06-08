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
  /** Memorial subject name for accessibility label */
  subjectName?: string
}

const OUTER_BORDER_WIDTH = 6
const WHITE_INSET_WIDTH = 4

export function MemorialPortrait({ size = 160, subjectName }: Props) {
  const a11yLabel = subjectName
    ? `Memorial portrait of ${subjectName}`
    : 'Memorial portrait placeholder'
  return (
    <View
      width={size}
      height={size}
      bg="#000000"
      items="center"
      justify="center"
      p={WHITE_INSET_WIDTH}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <View
        flex={1}
        width="100%"
        bg="#FFFFFF"
        items="center"
        justify="center"
        p={OUTER_BORDER_WIDTH}
      >
        {/* Portrait area — gray placeholder for prototype.
            Production will render opt-in DPDPA-consented photo. */}
        <View
          flex={1}
          width="100%"
          bg="#D8D6D3"
        />
      </View>
    </View>
  )
}
