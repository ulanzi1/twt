import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Text, View, XStack, YStack } from 'tamagui'
import { MemorialPortrait } from './MemorialPortrait'
import { KinshipLattice } from './KinshipLattice'
import { MemoryInput } from './MemoryInput'
import { ContributorRow } from './ContributorRow'
import {
  SAMPLE_CONTRIBUTORS,
  SAMPLE_MEMORIAL,
  formatBirthDeath,
  type Contributor,
} from './sample-data'
import {
  generateTransactionRef,
  launchUpiIntent,
  type UpiLaunchOutcome,
} from '../../lib/upi-intent'

// Shradhanjali Sahyog Vivran (per-claim memorial page) per UX spec §8 +
// lines 464-481 + 806 + 1157.
//
// Visual grammar per UX spec lines 468-481:
//   - Memorial surfaces preserve restrained reading width: 360pt mobile,
//     480pt desktop (UX spec line 469 + story file line 154)
//   - Full-bleed black rule at top
//   - Centered square portrait wrapped in nested black/white borders
//   - Name in serif Devanagari display weight
//   - Dates muted, en-dash separator
//   - Parichay block: left-aligned, three short sentences max
//   - Kinship lattice as simple two-column key-value list
//   - Bhavpurna shraddhanjali line, centered, italic, letter-spaced
//   - दो शब्द स्मृति में field
//   - Vertical scroll of contributor entries (200+ — FlashList per
//     architecture line 2669)
//   - योगदान दें action as text link in ledger footer rule
//
// P5 list-performance measurement-load-bearing surface for the
// contributor scroll (250 entries; 60 fps target / 30 fps minimum per
// UX spec line 824). Per Story 0.14 §4 FM-2 disposition: the substitute
// entry-level Android (Redmi Note 8 3GB+ RAM) does NOT exercise the 2GB-
// RAM floor; P5 verdict will carry `not-measured-on-2GB-floor` caveat.

const MAX_WIDTH_MOBILE = 360

const CONTRIBUTOR_ROW_ESTIMATED_HEIGHT = 56

export function ShradhanjaliSahyogVivran() {
  const { width: screenWidth } = useWindowDimensions()
  // Restrained reading-width discipline: cap content at 360pt mobile
  // (UX spec line 469); center on wider screens.
  const contentWidth = Math.min(screenWidth, MAX_WIDTH_MOBILE)

  const [upiOutcome, setUpiOutcome] = useState<UpiLaunchOutcome | null>(null)

  const handleSahyogTap = useCallback(async () => {
    // Prototype UPI Intent for P2 measurement per architecture line 90 +
    // UX-DR P2. Sample VPA / payee name — production reads from server.
    const outcome = await launchUpiIntent({
      payeeVpa: 'twt-test@upi',
      payeeName: 'Teachers Welfare Trust',
      transactionRef: generateTransactionRef('TWT'),
      amountInr: 251,
      note: `Sahyog · ${SAMPLE_MEMORIAL.name}`,
    })
    setUpiOutcome(outcome)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: Contributor }) => <ContributorRow contributor={item} />,
    [],
  )

  const keyExtractor = useCallback((item: Contributor) => item.id, [])

  return (
    <YStack flex={1} bg="$background">
      {/* Full-bleed black rule at top per UX spec line 470 */}
      <View height={4} bg="#000000" width="100%" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        <YStack
          width={contentWidth}
          self="center"
          px={16}
          pt={24}
          gap="$5"
        >
          {/* Portrait — centered square with nested black/white borders */}
          <YStack items="center">
            <MemorialPortrait size={160} subjectName={SAMPLE_MEMORIAL.name} />
          </YStack>

          {/* Name in serif Devanagari display weight per UX spec line 472.
              accessibilityRole=header so screen readers announce as a heading. */}
          <Text
            fontFamily="$heading"
            fontSize="$10"
            color="$color"
            text="center"
            lineHeight="$10"
            accessibilityRole="header"
          >
            {SAMPLE_MEMORIAL.name}
          </Text>

          {/* Dates muted, en-dash separator per UX spec line 473 */}
          <Text
            fontFamily="$tabular"
            fontSize="$3"
            color="$colorPress"
            text="center"
            mt={-12}
            style={styles.tabularNums}
          >
            {formatBirthDeath(SAMPLE_MEMORIAL.birthDate, SAMPLE_MEMORIAL.deathDate)}
          </Text>

          {/* Parichay block: left-aligned, three short sentences per UX spec line 474.
              Hindi numerals permitted per UX spec line 1127 amendment A2 (memorial prose). */}
          <Text
            fontFamily="$body"
            fontSize="$4"
            color="$color"
            lineHeight={26}
            text="left"
          >
            {SAMPLE_MEMORIAL.parichay}
          </Text>

          {/* Kinship lattice per UX spec line 475 */}
          <KinshipLattice kinship={SAMPLE_MEMORIAL.kinship} />

          {/* Bhavpurna shraddhanjali line, centered, italic, letter-spaced per UX spec line 476 */}
          <Text
            fontFamily="$heading"
            fontSize="$5"
            color="$color"
            text="center"
            letterSpacing={2}
            mt="$2"
          >
            {SAMPLE_MEMORIAL.bhavpurnaLine}
          </Text>

          {/* Memory input field per UX spec line 477 */}
          <MemoryInput />

          {/* Hairline before contributor scroll */}
          <View
            height={StyleSheet.hairlineWidth}
            bg="#000000"
            width="100%"
            mt="$4"
          />

          {/* स्मरण में header */}
          <Text
            fontFamily="$body"
            fontSize="$3"
            color="$colorPress"
            text="center"
            letterSpacing={1}
            mt={-8}
          >
            स्मरण में
          </Text>
        </YStack>

        {/* Contributor scroll: FlashList for 200+ entries per architecture line 2669.
            Full-width within reading-width container; height bounded so FlashList
            can virtualize within the parent ScrollView (estimateItemSize required).
            FlashList v2 prop-typing wrinkle under React 19 + new arch — cast as
            any (same pattern as FlatList in Yogdaan Bahi Day 3). Runtime behavior
            unchanged. */}
        <YStack width={contentWidth} self="center" minH={400}>
          {(() => {
            const FlashListAny = FlashList as any
            return (
              <FlashListAny
                data={SAMPLE_CONTRIBUTORS}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                estimatedItemSize={CONTRIBUTOR_ROW_ESTIMATED_HEIGHT}
                // FlashList inside ScrollView — disable nested scrolling so the
                // outer ScrollView owns the gesture (recommended pattern).
                scrollEnabled={false}
              />
            )
          })()}
        </YStack>

        {/* योगदान दें action as quiet text link per UX spec line 479 — NOT
            a primary-blue button. Placed in ledger footer rule. Wired to
            UPI Intent for P2 measurement per architecture line 90. */}
        <YStack
          width={contentWidth}
          self="center"
          px={16}
          py={24}
          gap="$3"
        >
          <View
            height={StyleSheet.hairlineWidth}
            bg="$borderColor"
            width="100%"
          />
          <XStack justify="center">
            <Pressable
              onPress={handleSahyogTap}
              accessibilityRole="link"
              accessibilityLabel="योगदान दें — UPI के माध्यम से सहयोग करें"
              accessibilityHint="Opens your UPI app to contribute to this memorial"
            >
              <Text
                fontFamily="$body"
                fontSize="$3"
                color="$colorPress"
                textDecorationLine="underline"
              >
                योगदान दें
              </Text>
            </Pressable>
          </XStack>

          {/* P2 measurement diagnostic — shows UPI launch outcome for
              measurement evidence capture at Task 10. Hidden until first tap. */}
          {upiOutcome && (
            <YStack
              px={12}
              py={8}
              bg="$backgroundHover"
              gap={4}
            >
              <Text fontFamily="$body" fontSize="$1" color="$colorPress">
                P2 UPI Intent outcome ({upiOutcome.kind})
              </Text>
              <Text fontFamily="$tabular" fontSize="$1" color="$colorPress" style={styles.tabularNums}>
                {upiOutcome.url}
              </Text>
              {upiOutcome.kind === 'launched' && (
                <Text fontFamily="$body" fontSize="$1" color="$colorPress">
                  Platform: {upiOutcome.platform}
                </Text>
              )}
              {upiOutcome.kind === 'unsupported' && (
                <Text fontFamily="$body" fontSize="$1" color="$colorPress">
                  {upiOutcome.reason}
                </Text>
              )}
              {upiOutcome.kind === 'error' && (
                <Text fontFamily="$body" fontSize="$1" color="$colorPress">
                  Error: {upiOutcome.error}
                </Text>
              )}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
