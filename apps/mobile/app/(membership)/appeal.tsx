// The member's §8.8 moderation-appeal screen — Story 10.22 (AC7, in-portal arm).
//
// Niyamavali §8.8, ratified by Decision `2026-08-15-121`. This is the destination the appeal CTA on
// the membership-status screen never had.
//
// ── What this screen tells the member BEFORE they commit ────────────────────────────────────────
// Three things §8.8 states, surfaced rather than left to be discovered:
//   · the review is by a trustee who took NO PART in the original decision (the different-individual
//     requirement — Deed Clause 26 natural justice);
//   · asking for a review does NOT pause the decision (§8.8: no suspensive effect). A member who
//     believes filing lifts their suspension has been misled by silence;
//   · using this review does NOT give up any external recourse (Deed Clause 26, R10(E)).
//
// ── ⛔ Fabric FlatList discipline ───────────────────────────────────────────────────────────────
// Empty / loading / error states are rendered OUTSIDE any list. Under the New Architecture a
// FlatList red-boxes when it crosses empty→populated in place
// ([[project_fabric_flatlist_empty_populated_crash]]). This screen uses a ScrollView and renders the
// three states as sibling branches, so the hazard cannot arise here at all.

import { useT } from '@twt/i18n/react'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { Button, H2, Paragraph, Text, TextArea, YStack } from 'tamagui'

import { useSession } from '../../lib/session-context'
import { moderationAppealApi } from '../../lib/moderation-appeal-api'

/** Mirrors `APPEAL_GROUNDS_MIN_CHARS` / `…MAX_CHARS` in `@twt/contracts`. The server is the
 *  authority; these bounds exist so the member is told before they submit, not after. */
const GROUNDS_MIN = 20
const GROUNDS_MAX = 5000

export default function ModerationAppealScreen() {
  const t = useT()
  const { session } = useSession()
  const [grounds, setGrounds] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filed, setFiled] = useState(false)
  // The act under appeal. ⚠ READ from the server, never inferred: the validity payload derives the
  // member's moderation standing from `specialFlags` and carries no moderation-action id, and §8.8
  // identifies an appeal BY the act's §8.6 record.
  const [actionId, setActionId] = useState<string | null>(null)
  const [hasOpenAppeal, setHasOpenAppeal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const pariwarId = session?.pariwarId

  useEffect(() => {
    let cancelled = false
    if (!pariwarId) return
    void moderationAppealApi
      .getAppealContext(pariwarId)
      .then((ctx) => {
        if (cancelled) return
        setActionId(ctx.appealable_action_ids[0] ?? null)
        // §8.8 permits ONE open appeal per act at a time. If none is appealable but an open one
        // exists, that is the reason — ⛔ not an exhaustion of the right.
        setHasOpenAppeal(
          ctx.appealable_action_ids.length === 0 && ctx.appeals.some((a) => a.status === 'open'),
        )
      })
      .catch(() => {
        if (!cancelled) setIsError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pariwarId])

  // ⛔ Rendered as sibling branches, never as list states. See the header.
  if (isLoading) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background">
        <Text accessibilityRole="text" accessibilityLiveRegion="polite">
          {t('memberStatus.loading')}
        </Text>
      </YStack>
    )
  }
  if (isError) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background">
        <Text accessibilityRole="text">{t('memberStatus.error')}</Text>
      </YStack>
    )
  }
  if (filed) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background" gap="$3">
        <H2 accessibilityRole="header">{t('moderation.appeal.title')}</H2>
        <Paragraph accessibilityLiveRegion="polite">{t('moderation.appeal.pending')}</Paragraph>
        {/* §8.8, stated to the member rather than left as a surprise. */}
        <Paragraph color="$colorPress">{t('moderation.appeal.noSuspensiveEffect')}</Paragraph>
        <Paragraph color="$colorPress" fontSize="$1">
          {t('moderation.appeal.externalRecourse')}
        </Paragraph>
      </YStack>
    )
  }

  // §8.8: one open appeal per act at a time. Shown BEFORE the member writes anything, so the
  // "already open" state is never something they discover by being refused.
  if (hasOpenAppeal) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background" gap="$3">
        <H2 accessibilityRole="header">{t('moderation.appeal.title')}</H2>
        <Paragraph accessibilityLiveRegion="polite">{t('moderation.appeal.alreadyOpen')}</Paragraph>
        <Paragraph color="$colorPress" fontSize="$1">
          {t('moderation.appeal.externalRecourse')}
        </Paragraph>
      </YStack>
    )
  }

  const moderationActionId = actionId

  const tooShort = grounds.trim().length < GROUNDS_MIN

  async function submit(): Promise<void> {
    if (!pariwarId || !moderationActionId || tooShort) return
    setSubmitting(true)
    setError(null)
    try {
      // ⚠ The Idempotency-Key rides a HEADER, never the body — the Story 10.2 member-surface
      // discipline. Keyed on the ACT plus this attempt, so a retry after a network error cannot
      // double-file while two genuinely separate attempts stay distinct.
      await moderationAppealApi.fileModerationAppeal(
        pariwarId,
        { moderation_action_id: moderationActionId, grounds: grounds.trim() },
        { idempotencyKey: `${moderationActionId}:${Date.now()}` },
      )
      setFiled(true)
    } catch (err) {
      // ⚠ A 409 here means an appeal against this act is already OPEN — ⛔ NOT that the right is
      // exhausted. §8.8 permits another once this one is determined, and the copy says so.
      const already = (err as { status?: number } | null)?.status === 409
      setError(already ? t('moderation.appeal.alreadyOpen') : t('memberStatus.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView>
      <YStack flex={1} px="$6" py="$6" bg="$background" gap="$3">
        <H2 accessibilityRole="header">{t('moderation.appeal.title')}</H2>
        <Paragraph>{t('moderation.appeal.intro')}</Paragraph>

        {/* §8.8 has no suspensive effect. Told BEFORE the member commits, not after. */}
        <Paragraph color="$colorPress">{t('moderation.appeal.noSuspensiveEffect')}</Paragraph>

        <Text accessibilityRole="text">{t('moderation.appeal.groundsLabel')}</Text>
        <TextArea
          accessibilityLabel={t('moderation.appeal.groundsLabel')}
          value={grounds}
          onChangeText={setGrounds}
          maxLength={GROUNDS_MAX}
          numberOfLines={8}
        />

        {error ? (
          <Text accessibilityRole="text" accessibilityLiveRegion="polite" theme="red">
            {error}
          </Text>
        ) : null}

        <Button
          accessibilityRole="button"
          accessibilityLabel={t('moderation.appeal.submit')}
          theme="red"
          disabled={submitting || tooShort || moderationActionId === null}
          onPress={submit}
        >
          {t('moderation.appeal.submit')}
        </Button>

        {/* Deed Clause 26 + R10(E): the internal route is primary, it is not exclusive. */}
        <Paragraph color="$colorPress" fontSize="$1">
          {t('moderation.appeal.externalRecourse')}
        </Paragraph>

      </YStack>
    </ScrollView>
  )
}
