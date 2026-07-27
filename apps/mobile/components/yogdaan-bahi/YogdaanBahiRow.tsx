import { memo } from 'react'
import { StyleSheet } from 'react-native'
import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import { formatInr, type YogdaanRow } from './sample-data'

// Yogdaan Bahi passbook row — Story 8.6 (Task 4; productionized from the P0-5 prototype).
//
// The row keeps the passbook grammar (fixed 56pt height so `getItemLayout` stays cheap — D5; tabular
// numerics + Latin/Gregorian operational columns + Devanagari family names; heavier every-5th-row rule)
// but now carries the REAL read-model row + THREE additions the prototype lacked: the five-state STATUS
// tone (AC2), the CYCLE ref + pool letter/name, and the Contribution-Note LINK seam (AC3). There is no
// room for 3 more fixed columns at 56pt on a 360px viewport, so a SECOND compact line sits below the
// date/family/amount line (status pill + pool·cycle + Note link) — the 56pt height is unchanged (D5).
//
// Numeral discipline (UX line 1127): date, pool code, cycle ref, amount → Gregorian + Latin numerals
// (tabular). The family column carries Devanagari names. Status tone (UX :1087-1094): a mismatch uses a
// warm-UMBER (`$orange`), NOT the warm-red accent, so a single mismatch does not swamp the passbook.

const NS = { namespace: 'contribution' } as const

/** Status → design-system tone tokens (theme-aware light/dark). Mismatch = warm-umber, NOT warm-red. */
const STATUS_TONE = {
  yellow: { bg: '$yellow4', border: '$yellow8', color: '$yellow11' }, // attested / verifying
  green: { bg: '$green4', border: '$green8', color: '$green11' }, // confirmed (पुष्ट)
  red: { bg: '$orange4', border: '$orange8', color: '$orange11' }, // mismatch — warm-umber (UX :1087-1094)
  grey: { bg: '$gray4', border: '$gray8', color: '$gray11' }, // on record, unreconciled (neutral)
  // held — a confirmation trustee-walked-back (Story 9.5). MINIMAL neutral-blue stopgap purely to keep the
  // exhaustive `satisfies` compiling; the polished 5-state tone/copy/icon/ARIA system is Story 9.6.
  held: { bg: '$blue4', border: '$blue8', color: '$blue11' },
} as const satisfies Record<YogdaanRow['status'], { bg: string; border: string; color: string }>

type Props = {
  row: YogdaanRow
  /** 1-indexed row number across the list, used for "every 5th row" heavier rule. */
  rowIndex: number
}

function YogdaanBahiRowComponent({ row, rowIndex }: Props) {
  const t = useT()
  const router = useRouter()

  // Every 5th row (1-indexed) gets a heavier bottom rule per UX spec (0-indexed: rowIndex % 5 === 4).
  const isFifthRow = (rowIndex + 1) % 5 === 0
  const tone = STATUS_TONE[row.status]

  const family = row.deceasedLastInitial ? `${row.deceasedFirstName} ${row.deceasedLastInitial}` : row.deceasedFirstName
  const poolDisplay = row.poolName ?? row.poolLetterCode
  const dateDisplay = row.date.slice(0, 10) // YYYY-MM-DD (Gregorian, Latin)
  const statusLabel = t(`yogdaan.status.${row.status}`, undefined, NS)
  const statusA11y = t(`yogdaan.status.${row.status}_a11y`, undefined, NS)

  // The whole row is ONE screen-reader unit (date + family + pool + amount + status announced by TONE
  // NAME, not colour). The Note link is a SEPARATE focusable action beneath it.
  const rowA11y = t(
    'yogdaan.row_a11y',
    { date: dateDisplay, family, pool: poolDisplay, amount: formatInr(row.amountInr), status: statusLabel },
    NS,
  )

  // The Contribution-Note PDF affordance (8.6 AC3) — the route and this press handler are unchanged
  // from 8.6; Story 8.7 filled the screen behind them with the real Yogdaan Pratigya.
  //
  // Gated on the server's `noteAvailable`, which 8.7 made a RESOLVABILITY predicate (own contribution +
  // resolvable pool identity), NOT a status one: a yellow/red/grey row is just as Note-generatable as a
  // green one. In practice every RENDERED row carries `true` (an unresolvable row is omitted upstream),
  // so this hides nothing today — it exists so the affordance can never offer a Note that would 404.
  const noteAvailable = row.noteAvailable

  const onNotePress = () => {
    router.push(`/(contribution)/note/${row.contributionId}` as never)
  }

  return (
    <YStack
      height={56}
      justify="center"
      px={12}
      borderBottomWidth={isFifthRow ? 1 : StyleSheet.hairlineWidth}
      borderBottomColor="$borderColor"
      bg="$background"
    >
      {/* Line 1 — the primary passbook line (date | family | amount), one a11y unit. */}
      <XStack items="center" accessible accessibilityRole="text" accessibilityLabel={rowA11y}>
        <Text width={92} fontFamily="$tabular" fontSize="$2" color="$colorPress" style={styles.tabularNums}>
          {dateDisplay}
        </Text>
        <Text flex={1} fontFamily="$body" fontSize="$4" color="$color" numberOfLines={1} px={8}>
          {family}
        </Text>
        <Text
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

      {/* Line 2 — status tone pill + pool·cycle ref + the Contribution-Note link (AC2/AC3). */}
      <XStack items="center" gap={6} mt={2}>
        <XStack
          bg={tone.bg}
          borderColor={tone.border}
          borderWidth={StyleSheet.hairlineWidth}
          rounded="$2"
          px={6}
          py={1}
          accessible
          accessibilityRole="text"
          accessibilityLabel={statusA11y}
        >
          <Text fontFamily="$body" fontSize="$1" color={tone.color}>
            {statusLabel}
          </Text>
        </XStack>
        {/* poolDisplay may be a curated Devanagari name (D7: NOT a Latin-numeral run) or the Latin letter
            fallback — either way it renders in `$body`; only `cycleRef` (Gregorian YYYY-MM) is `$tabular`. */}
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          {poolDisplay}{' · '}
          <Text fontFamily="$tabular" fontSize="$1" color="$colorPress" style={styles.tabularNums}>
            {row.cycleRef}
          </Text>
        </Text>
        <XStack flex={1} />
        {noteAvailable ? (
        <Button
          size="$1"
          chromeless
          height={24}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('yogdaan.note.link_a11y', undefined, NS)}
          onPress={onNotePress}
        >
          <Text fontFamily="$body" fontSize="$1" color="$color">
            {t('yogdaan.note.link', undefined, NS)}
          </Text>
        </Button>
        ) : null}
      </XStack>
    </YStack>
  )
}

// fontVariant: ['tabular-nums'] applies the tnum OpenType feature (UX line 1114 + FM-2 fallback).
const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})

export const YogdaanBahiRow = memo(YogdaanBahiRowComponent)
