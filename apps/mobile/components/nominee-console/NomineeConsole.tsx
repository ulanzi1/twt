// <NomineeConsole> — Sunita's reconciliation surface (Story 9.1; the FIRST Epic-9 SURFACE).
//
// A member-app SHELL that COMPOSES the surfaces reconciliation needs and renders honestly with the unbuilt
// sub-surfaces ABSENT (first-class `{available:false}` placeholders, never a faked uploader/pill). It
// renders ONLY for a signed-in validated nominee with an active pool and SELF-SUPPRESSES to null otherwise
// (the 8.3 self-suppress discipline). It NEVER parses a statement, NEVER runs the matcher, NEVER flips a pill.
//
// Composes: the BUILT Story 8.3 <PoolContributorList> (confirmed-contributors-so-far, honestly empty until
// 9.5) + the BUILT Story 8.11 <CallHelplineCTA>. Leaves first-class placeholders in the Story 9.3 (upload
// queue) + Story 9.6 (<StatusPill>) slots. Renders the grey staff-takeover state (AC3, neutral "on record")
// when the server marks the nominee disengaged ≥ N days.
//
// ── The "fursat" register (AC2, the load-bearing commitment) ────────────────────────────────────────────
// All copy is grief-paced/unhurried — no gamification, no urgency, no "you're behind", no pre-threshold
// escalation. The `nominee-console` copy is gated by the microcopy.yaml `fursat-pressure` tone rule + the
// Story 2.2 human tone-review (docs/tone-review-checklist.md). This component holds NO literal member copy
// — every string routes through `useT('nominee-console')` so the gate + parity guard cover it.
//
// ── Render decisions live in the PURE resolver (console-view.ts) ────────────────────────────────────────
// The mobile app has no render-test harness; the suppress/grey/active decisions are pure functions the
// unit tests pin. This component is a thin projection of them + the UX-DR50 save-and-resume store.

import { useT } from '@twt/i18n/react'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { ScrollView } from 'react-native'
import { Paragraph, Text, View, YStack } from 'tamagui'

import { BankStatementUpload } from './BankStatementUpload'
import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { PoolContributorList } from '../contributor-list/PoolContributorList'
import { recordNomineeConsoleVisit } from './console-resume'
import { formatLastUpdated, resolveNomineeConsoleView } from './console-view'
import { useNomineeConsoleQuery } from './useNomineeConsoleQuery'

const NS = { namespace: 'nominee-console' } as const

/**
 * A first-class `{available:false}` placeholder card — a dignified "being prepared", NEVER a faked widget
 * (the 8.4 nominee-VPA resolver-seam precedent). Used for the Story 9.3 upload-queue + Story 9.6 status-pill
 * slots. Calm/neutral register; a `summary` role with a labeled, non-alarming body.
 */
function ComingSoonCard({
  title,
  body,
  a11y,
  hint,
}: {
  title: string
  body: string
  a11y: string
  hint: string
}) {
  return (
    <YStack
      px="$5"
      py="$4"
      gap="$2"
      borderWidth={StyleSheet.hairlineWidth}
      borderColor="$borderColor"
      rounded="$4"
      bg="$background"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y}
      accessibilityHint={hint}
    >
      <Text fontFamily="$body" fontSize="$5" color="$color" accessibilityRole="header">
        {title}
      </Text>
      <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
        {body}
      </Paragraph>
    </YStack>
  )
}

export function NomineeConsole() {
  const t = useT()
  const { data, isLoading } = useNomineeConsoleQuery()
  const view = resolveNomineeConsoleView(data)

  // UX-DR50 save-and-resume (Task 4): auto-save the visit on mount so a returning nominee resumes rather
  // than being greeted cold. Best-effort; keyed per pool. Only once the console is actually rendering for
  // a validated nominee (a suppressed view has no pool to key on).
  const canonicalIdentifier = view.kind === 'console' ? view.pool.canonicalIdentifier : null
  useEffect(() => {
    if (canonicalIdentifier) {
      recordNomineeConsoleVisit(canonicalIdentifier, new Date().toISOString())
    }
  }, [canonicalIdentifier])

  // Loading is distinct from true absence — showing the (null) suppressed view is correct while the first
  // fetch is in flight, but a labeled neutral placeholder is kinder than a blank frame. Never an error wall.
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" accessibilityRole="summary">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          accessibilityRole="text"
          accessibilityLabel={t('loading_a11y', undefined, NS)}
        >
          {t('loading_a11y', undefined, NS)}
        </Text>
      </YStack>
    )
  }

  // Self-suppress (AC1) — not a validated nominee with an active pool. Render nothing (the 8.3 discipline).
  if (view.kind !== 'console') {
    return null
  }

  const lastUpdated = formatLastUpdated(view.lastUpdatedIso)

  return (
    <YStack flex={1} bg="$background">
      {/* Static, short content owns its own scroll — the FlashList below (Story 8.3 <PoolContributorList>)
          must NEVER nest inside a ScrollView (breaks its own virtualization / the documented Fabric
          empty→populated crash class, [[project_fabric_flatlist_empty_populated_crash]]). It gets its own
          bounded flex region below, mirroring how 8.3 renders it standalone (full-screen owner of its list). */}
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <YStack gap="$4">
          {/* Header — dignified, fursat register. Pool identity + the daily-delta "last updated" line. */}
          <YStack px="$5" pt="$6" pb="$2" gap="$2">
            <Text fontFamily="$body" fontSize="$8" color="$color" accessibilityRole="header">
              {t('title', undefined, NS)}
            </Text>
            <Paragraph fontFamily="$body" fontSize="$4" color="$colorPress">
              {t('intro', undefined, NS)}
            </Paragraph>
            <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
              {t('pool_label', { code: view.pool.letterCode }, NS)}
            </Text>
            {lastUpdated !== '' ? (
              <Text
                fontFamily="$body"
                fontSize="$2"
                color="$colorPress"
                accessibilityRole="text"
                accessibilityLabel={t('last_updated_a11y', { time: lastUpdated }, NS)}
              >
                {t('last_updated', { time: lastUpdated }, NS)}
              </Text>
            ) : null}
          </YStack>

          {/* Grey staff-takeover state (AC3) — strictly NEUTRAL "on record", never blame. A calm muted band,
              never red. Rendered when the nominee has disengaged ≥ N days (server-decided). */}
          {view.staffTakeover ? (
            <YStack
              mx="$5"
              px="$5"
              py="$4"
              gap="$2"
              borderWidth={StyleSheet.hairlineWidth}
              borderColor="$borderColor"
              rounded="$4"
              bg="$backgroundHover"
              accessible
              accessibilityRole="summary"
              accessibilityLabel={t('takeover.a11y', undefined, NS)}
              accessibilityHint={t('takeover.hint', undefined, NS)}
            >
              <Text fontFamily="$body" fontSize="$5" color="$color" accessibilityRole="header">
                {t('takeover.title', undefined, NS)}
              </Text>
              <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
                {t('takeover.body', undefined, NS)}
              </Paragraph>
            </YStack>
          ) : null}

          {/* Story 9.3 upload-queue slot — the REAL <BankStatementUpload> transport (fills the 9.1
              {available:false} placeholder). Rendered here in the static ScrollView region, OUTSIDE the
              FlashList below, so it never nests inside a virtualized list ([[project_fabric_flatlist_empty_populated_crash]]). */}
          <View px="$5">
            <BankStatementUpload poolCanonicalIdentifier={view.pool.canonicalIdentifier} />
          </View>

          {/* Story 9.6 <StatusPill> slot — a neutral text placeholder, NOT the unbuilt DS component. */}
          <View px="$5">
            <ComingSoonCard
              title={t('status_slot.title', undefined, NS)}
              body={t('status_slot.body', undefined, NS)}
              a11y={t('status_slot.a11y', undefined, NS)}
              hint={t('status_slot.hint', undefined, NS)}
            />
          </View>

          {/* Story 8.11 <CallHelplineCTA> — the BUILT cross-cutting helpline fallback, kept in the scrolling
              static region so it stays reachable without depending on the contributor list's own scroll. */}
          <YStack px="$5" gap="$2">
            <Paragraph fontFamily="$body" fontSize="$3" color="$colorPress">
              {t('helpline_intro', undefined, NS)}
            </Paragraph>
            <CallHelplineCTA />
          </YStack>

          <Text px="$5" fontFamily="$body" fontSize="$5" color="$color" accessibilityRole="header">
            {t('contributors_heading', undefined, NS)}
          </Text>
        </YStack>
      </ScrollView>

      {/* Story 8.3 <PoolContributorList> — the BUILT confirmed-contributors surface (honestly empty until
          9.5). Composed, NOT re-implemented. Rendered OUTSIDE the ScrollView above so its internal FlashList
          owns its own scroll viewport (never nested inside another scroller). Renders its own honest
          empty/loading/absence states. */}
      <View flex={1}>
        <PoolContributorList />
      </View>
    </YStack>
  )
}
