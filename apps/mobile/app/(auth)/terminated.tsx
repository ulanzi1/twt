// The termination surface — Story 10.19 (Task 8; AC10).
//
// Reached when `verifyOtp` or a token refresh returns 403 `auth.member_terminated`. It renders the
// STRUCTURED payload the API returns (AC4), not copy invented on the client.
//
// ── ⛔ THE DOMAIN VOCABULARY (Decision `2026-08-10-098` clause 3) ──────────────────────────────────
// This is NOT a failed login and must never be described as one. The member's OTP was CORRECT and
// their identity WAS verified; what was denied is authorization to establish a member session. The
// copy says so, because the alternative — telling someone their correct code was wrong — is the
// copy-truth defect this story exists to close, on the one surface where the AC promises honesty.
//
// ── Why it lives in the (auth) group ──────────────────────────────────────────────────────────────
// Same reason as `rejoin-locked.tsx`: there is NO session here, and the root guard
// (`app/_layout.tsx:112-117`) bounces any non-`(auth)` route to login when `session` is null. ⛔ It
// must NOT be moved into a tab or any authenticated navigator — that would drag a session-shaped
// context behind a screen whose whole premise is that no session exists, and it would contradict the
// AC12 invariant that this path establishes none.
//
// ── What it deliberately does NOT do ──────────────────────────────────────────────────────────────
// ⛔ No link into the member portal, and no CTA that would need a session — a link landing on a
// login wall is a worse dead end than no link at all. The two actions are: read public Trust
// content (an OUTBOUND link to the public site, no account needed), and go back to the login screen.

import { useLocale, useT } from '@twt/i18n/react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Linking } from 'react-native'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { formatWithdrawalDate } from '../../components/withdrawal/format-date'
import { publicSiteHomeUrl } from '../../lib/public-site'

export default function TerminatedScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const { groundLabelKey, effectiveAt } = useLocalSearchParams<{
    groundLabelKey?: string
    effectiveAt?: string
  }>()

  // ⚠ `t()` THROWS on an unknown key — it never returns the key
  // (`packages/i18n/src/resolver.ts:62-65`), the same trap that took down a whole notice batch in
  // `moderation-notify.ts`. The ground key is SERVER-supplied, so a reason code shipped ahead of its
  // copy would otherwise crash this screen — the one screen a terminated member has. Degrade to the
  // unspecified label, exactly as the notice worker does.
  let ground: string | null = null
  if (groundLabelKey) {
    try {
      ground = t(groundLabelKey)
    } catch {
      try {
        ground = t('memberStatus.moderationReason.unspecified')
      } catch {
        ground = null
      }
    }
  }

  // ⛔ SUMMARY IS STRUCTURALLY ABSENT until Story 10.20 lands (Q2 option (a), Decision `097`
  // clause 2). There is deliberately no element for it here — not a blank line, not an empty
  // paragraph, which a reader would parse as prose that failed to load.

  return (
    <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
      <H2>{t('auth.terminated_title')}</H2>

      {/* The decision, and — when the server supplied one — the ground, as a resolved LABEL. */}
      <Paragraph color="$colorPress">
        {ground ? t('auth.terminated_body_with_reason', { reason: ground }) : t('auth.terminated_body')}
      </Paragraph>

      {effectiveAt ? (
        <Paragraph color="$colorPress">
          {t('auth.terminated_effective', { date: formatWithdrawalDate(effectiveAt, locale) })}
        </Paragraph>
      ) : null}

      {/* Further communication. ⚠ Honest about what exists TODAY: the off-portal records route is
          Story 10.21 and is `backlog`, so this names the helpline — which does exist — and promises
          nothing else. */}
      <Paragraph color="$colorPress">{t('auth.terminated_further_communication')}</Paragraph>

      <Button
        theme="accent"
        height={56}
        accessibilityRole="link"
        accessibilityLabel={t('auth.terminated_public_site')}
        onPress={() => {
          void Linking.openURL(publicSiteHomeUrl(locale))
        }}
      >
        {t('auth.terminated_public_site')}
      </Button>

      <Button
        height={56}
        accessibilityRole="button"
        accessibilityLabel={t('auth.terminated_back')}
        onPress={() => router.replace('/(auth)/login')}
      >
        {t('auth.terminated_back')}
      </Button>
    </YStack>
  )
}
