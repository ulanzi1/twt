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
//
// ── [Review 2026-08-16] More than one appealable act at once ───────────────────────────────────
// `listAppealableActionIds` (domain) deliberately returns every act with no open appeal, ordered by
// recency, capped at 200 — a LIST by design (e.g. an older still-appealable suspension plus a newer
// termination). Reading only `[0]` silently stranded every other act. A member with more than one
// appealable act now picks which one before the filing form renders.
//
// ── [Review 2026-08-16] The idempotency key must survive a retry ───────────────────────────────
// Minting the key inline inside `submit()` (the `usePersonalEventAssertion` lesson, repeated here)
// meant a second tap after a lost response used a FRESH key, defeating the dedup the comment claimed.
// Keys are now cached per act in a ref, generated once, reused across retries.

import { useT } from '@twt/i18n/react'
import { useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { Button, H2, Paragraph, Text, TextArea, YStack } from 'tamagui'

import { useSession } from '../../lib/session-context'
import { moderationAppealApi } from '../../lib/moderation-appeal-api'
import { getTurnstileToken } from '../../lib/turnstile'

/** Mirrors `APPEAL_GROUNDS_MIN_CHARS` / `…MAX_CHARS` in `@twt/contracts`. The server is the
 *  authority; these bounds exist so the member is told before they submit, not after. */
const GROUNDS_MIN = 20
const GROUNDS_MAX = 5000

type AppealContext = Awaited<ReturnType<typeof moderationAppealApi.getAppealContext>>

/** A UUID for the idempotency key. `crypto.randomUUID` is available in Hermes via expo-crypto's
 *  polyfill — the `usePersonalEventAssertion` precedent. */
function newIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ModerationAppealScreen() {
  const t = useT()
  const { session } = useSession()
  const [grounds, setGrounds] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filed, setFiled] = useState(false)
  const [ctx, setCtx] = useState<AppealContext | null>(null)
  // The act under appeal. ⚠ READ from the server, never inferred: the validity payload derives the
  // member's moderation standing from `specialFlags` and carries no moderation-action id, and §8.8
  // identifies an appeal BY the act's §8.6 record. `null` before the member has picked one (or before
  // there is exactly one to auto-pick).
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [hasOpenAppeal, setHasOpenAppeal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const pariwarId = session?.pariwarId

  // Cached for the lifetime of this screen instance, one key per act — every retry against the SAME
  // act reuses the same key so the server's idempotency store dedupes it; a different act (picked via
  // the selector) gets its own key rather than colliding with the first.
  const idempotencyKeysRef = useRef<Map<string, string>>(new Map())
  function idempotencyKeyFor(actionId: string): string {
    const cached = idempotencyKeysRef.current.get(actionId)
    if (cached) return cached
    const key = newIdempotencyKey()
    idempotencyKeysRef.current.set(actionId, key)
    return key
  }

  useEffect(() => {
    let cancelled = false
    if (!pariwarId) return
    void moderationAppealApi
      .getAppealContext(pariwarId)
      .then((c) => {
        if (cancelled) return
        setCtx(c)
        // Auto-pick when there's exactly one act to appeal — the common case stays a single screen.
        setSelectedActionId(c.appealable_action_ids.length === 1 ? (c.appealable_action_ids[0] ?? null) : null)
        // §8.8 permits ONE open appeal per act at a time. If none is appealable but an open one
        // exists, that is the reason — ⛔ not an exhaustion of the right.
        setHasOpenAppeal(
          c.appealable_action_ids.length === 0 && c.appeals.some((a) => a.status === 'open'),
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

  // More than one act is appealable and the member hasn't picked yet — pick before filing.
  if (ctx && ctx.appealable_action_ids.length > 1 && selectedActionId === null) {
    return (
      <ScrollView>
        <YStack flex={1} px="$6" py="$6" bg="$background" gap="$3">
          <H2 accessibilityRole="header">{t('moderation.appeal.selectDecision.title')}</H2>
          {ctx.appealable_action_ids.map((id, i) => (
            <Button
              key={id}
              accessibilityRole="button"
              onPress={() => setSelectedActionId(id)}
            >
              {i === 0
                ? t('moderation.appeal.selectDecision.mostRecent')
                : t('moderation.appeal.selectDecision.earlier', { n: i })}
            </Button>
          ))}
        </YStack>
      </ScrollView>
    )
  }

  const moderationActionId = selectedActionId
  const showChangeDecision = (ctx?.appealable_action_ids.length ?? 0) > 1

  // A previous determination against THIS act, if any — §8.8 permits re-filing after a decision, so
  // the act stays appealable, but the member should see what happened last time rather than land
  // straight back on a blank form as if nothing had been decided.
  const previousDetermination =
    ctx && moderationActionId
      ? (ctx.appeals.find((a) => a.moderation_action_id === moderationActionId && a.status === 'decided') ?? null)
      : null

  const tooShort = grounds.trim().length < GROUNDS_MIN

  async function submit(): Promise<void> {
    if (!pariwarId || !moderationActionId || tooShort) return
    setSubmitting(true)
    setError(null)
    try {
      // ⚠ The Idempotency-Key rides a HEADER, never the body — the Story 10.2 member-surface
      // discipline. Minted ONCE per act (cached in `idempotencyKeysRef`), so a retry after a network
      // error replays the SAME key while two genuinely separate attempts against different acts stay
      // distinct. `x-turnstile-token` also rides a HEADER — the server unconditionally requires it.
      await moderationAppealApi.fileModerationAppeal(
        pariwarId,
        { moderation_action_id: moderationActionId, grounds: grounds.trim() },
        { idempotencyKey: idempotencyKeyFor(moderationActionId), turnstileToken: await getTurnstileToken() },
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

        {showChangeDecision ? (
          <Button
            chromeless
            size="$2"
            accessibilityRole="button"
            onPress={() => setSelectedActionId(null)}
          >
            {t('moderation.appeal.changeDecision')}
          </Button>
        ) : null}

        {previousDetermination ? (
          <YStack gap="$2" borderWidth={1} borderColor="$borderColor" rounded="$4" p="$3">
            <Text fontWeight="600" accessibilityRole="header">
              {t('moderation.appeal.previousDetermination.title')}
            </Text>
            <Paragraph fontSize="$2">
              {previousDetermination.outcome
                ? t(`moderation.appeal.outcome.${previousDetermination.outcome}`)
                : null}
            </Paragraph>
          </YStack>
        ) : null}

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
