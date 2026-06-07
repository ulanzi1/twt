import { Text, XStack, YStack } from 'tamagui'
import type { MemorialSubject } from './sample-data'

// Kinship lattice per UX spec line 475: "simple two-column key-value list
// (NOT a family-tree diagram): `पत्नी` · सुनीता देवी | `पुत्र` · अमित, राहुल".
//
// Implementation: vertical YStack of XStack rows; relation label left,
// names right. Both columns in $body Devanagari (Noto Sans 400).

type Props = {
  kinship: MemorialSubject['kinship']
}

export function KinshipLattice({ kinship }: Props) {
  return (
    <YStack gap="$1" accessibilityRole="list" accessibilityLabel="दुःखी परिवार — kinship lattice">
      {kinship.map(({ relation, names }, i) => (
        <XStack
          key={`${relation}-${i}`}
          gap="$3"
          items="baseline"
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${relation}: ${names}`}
        >
          <Text
            width={64}
            fontFamily="$body"
            fontSize="$3"
            color="$colorPress"
            text="right"
          >
            {relation}
          </Text>
          <Text
            flex={1}
            fontFamily="$body"
            fontSize="$4"
            color="$color"
          >
            {names}
          </Text>
        </XStack>
      ))}
    </YStack>
  )
}
