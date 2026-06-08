import { memo } from 'react'
import { StyleSheet } from 'react-native'
import { Text, XStack } from 'tamagui'
import { formatInr, type YogdaanRow } from './sample-data'

// Yogdaan Bahi passbook row per UX spec line 1156:
//   56pt fixed height + column structure date 100pt + sahyog flex
//   + pool 64pt + amount 96pt + hairline rule (heavier on every 5th row).
//
// Hindi-numerals discipline per UX spec line 1127: ALL numeric columns
// render Latin numerals only (Gregorian dates, Latin pool codes, Latin
// amounts). Sahyog column carries Devanagari beneficiary names.

type Props = {
  row: YogdaanRow
  /** 1-indexed row number across the list, used for "every 5th row" heavier rule */
  rowIndex: number
}

function YogdaanBahiRowComponent({ row, rowIndex }: Props) {
  // Every 5th row (1-indexed) gets a heavier bottom rule per UX spec.
  // 0-indexed math: rowIndex % 5 === 4 (5th, 10th, 15th, ...)
  const isFifthRow = (rowIndex + 1) % 5 === 0

  // Accessibility label combines all four columns in a screen-reader-
  // friendly sentence per UX spec lines 1199-1201 (RN Accessibility props
  // for P1 visual-inspection level; deep audit Story 0.10 territory).
  const a11yLabel = `${row.date}, ${row.sahyog}, pool ${row.pool}, ${formatInr(row.amountInr)}`

  return (
    <XStack
      height={56}
      items="center"
      px={12}
      borderBottomWidth={isFifthRow ? 1 : StyleSheet.hairlineWidth}
      borderBottomColor="$borderColor"
      bg="$background"
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      {/* Date column — 100pt, Latin numerals, tabular font */}
      <Text
        width={100}
        fontFamily="$tabular"
        fontSize="$3"
        color="$color"
        style={styles.tabularNums}
      >
        {row.date}
      </Text>

      {/* Sahyog (beneficiary) column — flex, body Devanagari font */}
      <Text
        flex={1}
        fontFamily="$body"
        fontSize="$4"
        color="$color"
        numberOfLines={1}
        px={8}
      >
        {row.sahyog}
      </Text>

      {/* Pool code column — 64pt, Latin tabular */}
      <Text
        width={64}
        fontFamily="$tabular"
        fontSize="$3"
        color="$colorPress"
        text="right"
        style={styles.tabularNums}
      >
        {row.pool}
      </Text>

      {/* Amount column — 96pt, Latin tabular, right-aligned on decimal per UX spec line 1114 */}
      <Text
        width={96}
        fontFamily="$tabular"
        fontSize="$4"
        fontWeight="500"
        color="$color"
        text="right"
        style={styles.tabularNums}
      >
        {formatInr(row.amountInr)}
      </Text>
    </XStack>
  )
}

// fontVariant: ['tabular-nums'] applies the tnum OpenType feature per
// UX spec line 1114 + line 714 FM-2 fallback discipline (IBM Plex Sans
// Devanagari + tnum substitutes for unavailable IBM Plex Mono Devanagari).
const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})

export const YogdaanBahiRow = memo(YogdaanBahiRowComponent)
