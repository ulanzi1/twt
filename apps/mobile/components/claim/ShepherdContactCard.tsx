// ShepherdContactCard — "Your point of contact" (Story 6.12, Task 5; AC3 / R1 / R3).
//
// The member-facing surface that turns an opaque ₹50L state machine into a NAMED HUMAN: once a claim
// enters verification, a District Admin shepherd is assigned and their name + role + tappable contact
// (tel: / wa.me deep-links off the E.164 snapshot, R1) render here. Grief-mode copy — no countdowns, no
// pressure ("your point of contact"). Read-only.
//
// States (mirrors the server discriminated union + the AC3 defensive/offline paths):
//   · assigned, ≥1 channel  → name + role + Call / WhatsApp deep-links.
//   · assigned, no channel  → name + role + "contact being arranged" + the helpline CTA (AC3 defensive —
//                             never a dead "your point of contact" with no action).
//   · not_assigned          → the reassuring pre-verification copy (nothing to do).
//   · offline / error       → the last cached read (read-only) with an offline note, else an error + CTA.
//
// The contact snapshot is deliberately member-facing controlled staff-contact data (that IS the feature),
// so caching it locally for the offline view is intentional (NON-member-PII).

import { useEffect, useState } from 'react'

import { ApiError } from '@twt/api-client'
import * as Linking from 'expo-linking'
import { Button, H4, Paragraph, XStack, YStack } from 'tamagui'

import type { MemberShepherdResponse } from '@twt/contracts'

import { claimApi } from '../../lib/claim-api'
import { cacheShepherd, clearCachedShepherd, loadCachedShepherd } from '../../lib/filed-claim'
import { useClaimT } from '../../lib/claim-i18n'
import { CallHelplineCTA } from './CallHelplineCTA'

/** A genuine not-authorized/not-found response — never masked behind a stale cached read (Review
 *  Finding): the claim is not (or no longer) this member's to see, so serving a stale cached shepherd
 *  contact would be actively misleading. Only network/transient/server failures fall back to cache. */
function isAuthOrNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 404)
}

export interface ShepherdContactCardProps {
  claimCaseId: string
  /** Injectable fetcher (tests pass a fake); defaults to the live member-claim client. */
  fetchShepherd?: (claimCaseId: string) => Promise<MemberShepherdResponse>
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; data: MemberShepherdResponse; offline: boolean }
  | { phase: 'error' }

/** wa.me wants the E.164 number WITHOUT the leading '+' (digits only). */
function waLink(e164: string): string {
  return `https://wa.me/${e164.replace(/[^\d]/g, '')}`
}

export function ShepherdContactCard({
  claimCaseId,
  fetchShepherd,
}: ShepherdContactCardProps): React.ReactElement {
  const t = useClaimT()
  const [state, setState] = useState<LoadState>({ phase: 'loading' })

  useEffect(() => {
    let alive = true
    const fetcher = fetchShepherd ?? ((id: string) => claimApi.getShepherd(id))
    fetcher(claimCaseId)
      .then((data) => {
        if (!alive) return
        cacheShepherd(claimCaseId, data)
        setState({ phase: 'ready', data, offline: false })
      })
      .catch((err: unknown) => {
        if (!alive) return
        if (isAuthOrNotFoundError(err)) {
          // A genuine not-authorized/not-found response — never serve a stale cached read for a claim
          // the server says is not (or no longer) this member's to see.
          clearCachedShepherd(claimCaseId)
          setState({ phase: 'error' })
          return
        }
        // Offline / transient — fall back to the last cached read (read-only), else surface the error.
        const cached = loadCachedShepherd(claimCaseId)
        setState(cached ? { phase: 'ready', data: cached, offline: true } : { phase: 'error' })
      })
    return () => {
      alive = false
    }
  }, [claimCaseId, fetchShepherd])

  if (state.phase === 'loading') {
    return (
      <YStack borderWidth={1} borderColor="$borderColor" p="$4" testID="shepherd-card-loading">
        <Paragraph color="$colorPress">{t('shepherd.title')}</Paragraph>
      </YStack>
    )
  }

  if (state.phase === 'error') {
    return (
      <YStack borderWidth={1} borderColor="$borderColor" p="$4" gap="$3" testID="shepherd-card-error">
        <H4>{t('shepherd.title')}</H4>
        <Paragraph color="$colorPress">{t('shepherd.error')}</Paragraph>
        <CallHelplineCTA />
      </YStack>
    )
  }

  const { data, offline } = state

  if (data.status === 'not_assigned') {
    return (
      <YStack borderWidth={1} borderColor="$borderColor" p="$4" gap="$2" testID="shepherd-card-not-assigned">
        <H4>{t('shepherd.title')}</H4>
        <Paragraph color="$colorPress">{t('shepherd.not_assigned')}</Paragraph>
      </YStack>
    )
  }

  const hasChannel = data.contact.phone !== null || data.contact.whatsapp !== null

  return (
    <YStack borderWidth={1} borderColor="$borderColor" p="$4" gap="$3" testID="shepherd-card-assigned">
      <YStack gap="$1">
        <H4>{data.display_name}</H4>
        <Paragraph color="$colorPress">{data.role_label}</Paragraph>
      </YStack>
      <Paragraph>{t('shepherd.body')}</Paragraph>

      {hasChannel ? (
        <XStack gap="$3" flexWrap="wrap">
          {data.contact.phone !== null ? (
            <Button
              theme="accent"
              size="$4"
              accessibilityRole="button"
              accessibilityLabel={t('shepherd.call')}
              testID="shepherd-call"
              onPress={() => {
                void Linking.openURL(`tel:${data.contact.phone}`)
              }}
            >
              {t('shepherd.call')}
            </Button>
          ) : null}
          {data.contact.whatsapp !== null ? (
            <Button
              size="$4"
              accessibilityRole="button"
              accessibilityLabel={t('shepherd.whatsapp')}
              testID="shepherd-whatsapp"
              onPress={() => {
                void Linking.openURL(waLink(data.contact.whatsapp as string))
              }}
            >
              {t('shepherd.whatsapp')}
            </Button>
          ) : null}
        </XStack>
      ) : (
        // AC3 defensive — a live shepherd with no channel: never a dead CTA.
        <YStack gap="$2" testID="shepherd-contact-arranging">
          <Paragraph color="$colorPress">{t('shepherd.contact_being_arranged')}</Paragraph>
          <CallHelplineCTA />
        </YStack>
      )}

      {offline ? (
        <Paragraph size="$2" color="$colorPress" testID="shepherd-offline-note">
          {t('shepherd.offline')}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
