// Helpdesk ticket detail — status + routing target + SLA + read-only thread (Story 10.2, Task 7;
// AC2/AC3/AC4). This IS the `tickets/:ticketId` deep-link destination (the pre-wired helpdesk_reply
// target — `deepLinkTargetForAlert` routes here). A not-owned/absent ticket surfaces as a dignified
// not-found (the server returns 404 — no enumeration oracle). The SLA countdown is a CLIENT-SIDE
// relative render (no server-clock dependence, AC2). The routing target is a ROLE description only,
// never a named individual (AC2).

import { useState } from 'react'
import { Linking, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Button, Separator, Spinner, Text, XStack, YStack } from 'tamagui'

import { ApiError } from '@twt/api-client'

import { helpdeskApi } from '../../lib/helpdesk-api'
import { useHelpdeskT } from '../../lib/helpdesk-i18n'
import { useSession } from '../../lib/session-context'
import { useHelpdeskTicketQuery } from '../../components/helpdesk/useHelpdeskQueries'

/** Resolve the member-friendly routing copy from the raw role (never a named individual — AC2). */
const KNOWN_ROLES = new Set(['pariwar_admin', 'helpline_operator', 'finance_officer', 'it_cell'])

/**
 * The first-response SLA line, as a CLIENT-SIDE relative countdown (AC2 — "a countdown", not an
 * absolute date; review-hardening). No server-clock dependence: `dueDate` is the ISO instant the
 * server already returned, `Date.now()` is the only clock read. Buckets: overdue / "very soon"
 * (&lt;1h) / N hour(s) / N day(s) — the `_plural` keys mirror the `new.attach_added_plural`
 * convention elsewhere in this namespace. Operational figures render in Latin numerals always (the
 * `{count}` interpolation, never `toHindiNumeral` — the Amendment-A2 numeral discipline), so this
 * needs no locale-specific formatting.
 */
function slaCountdownLine(t: (key: string, params?: Record<string, string | number>) => string, dueDate: Date): string {
  const diffMs = dueDate.getTime() - Date.now()
  if (diffMs <= 0) return t('sla.overdue')
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 1) return t('sla.expected_reply_soon')
  if (diffHours < 24) {
    const hours = Math.max(1, Math.round(diffHours))
    return hours === 1 ? t('sla.expected_reply_hours', { count: hours }) : t('sla.expected_reply_hours_plural', { count: hours })
  }
  const days = Math.max(1, Math.round(diffHours / 24))
  return days === 1 ? t('sla.expected_reply_days', { count: days }) : t('sla.expected_reply_days_plural', { count: days })
}

export default function HelpdeskDetailScreen(): React.ReactElement {
  const t = useHelpdeskT()
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>()
  const { data, isLoading, isError, error } = useHelpdeskTicketQuery(pariwarId, ticketId)

  const [openingIndex, setOpeningIndex] = useState<number | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  async function openAttachment(index: number): Promise<void> {
    if (!pariwarId || !ticketId) return
    setAttachmentError(null)
    setOpeningIndex(index)
    try {
      const { url } = await helpdeskApi.attachmentUrl(pariwarId, ticketId, index)
      await Linking.openURL(url)
    } catch {
      setAttachmentError(t('detail.attachment_error'))
    } finally {
      setOpeningIndex(null)
    }
  }

  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Stack.Screen options={{ headerShown: false }} />
        <Spinner accessibilityLabel={t('detail.loading_a11y')} />
      </YStack>
    )
  }

  // A 404 (not owned / absent) or any load error → the dignified not-found branch.
  const notFound = isError && error instanceof ApiError && error.status === 404
  if (!data || notFound || isError) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" px="$6" gap="$2">
        <Stack.Screen options={{ headerShown: false }} />
        <Text fontSize="$5" fontWeight="600">
          {t('detail.not_found_title')}
        </Text>
        <Text color="$colorPress" text="center">
          {t('detail.not_found_body')}
        </Text>
      </YStack>
    )
  }

  const routingKey = KNOWN_ROLES.has(data.routed_to_role) ? `routing.${data.routed_to_role}` : 'routing.default'
  const dueDate = new Date(data.sla_first_response_due)
  const slaLine = slaCountdownLine(t, dueDate)

  return (
    <YStack flex={1} bg="$background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <YStack gap="$1">
          <Text fontSize="$2" color="$colorPress">
            {t(`category.${data.category}.label`)}
          </Text>
          <Text fontSize="$7" fontWeight="600">
            {data.subject}
          </Text>
          <Text fontSize="$2" color="$colorPress">
            {t('detail.filed_on', { date: new Date(data.created_at).toLocaleDateString() })}
          </Text>
        </YStack>

        {/* Story 10.3 (AC3) — the dignified "We filed this for you — Operator [Name]" header, shown ONLY
            for an operator-filed (helpline_call) ticket that carries an operator name. Absent for a
            self-filed (member_app) ticket. Surfaces the FILING operator's controlled display name (the
            caller consented to the operator filing on their behalf); the routing/responder target stays
            role-only (below). */}
        {data.created_via === 'helpline_call' && data.operator_attribution && (
          <YStack
            gap="$1"
            bg="$backgroundPress"
            p="$3"
            rounded="$4"
            accessibilityRole="header"
            data-testid="helpdesk-filed-for-you"
          >
            <Text fontWeight="600">
              {t('detail.filed_for_you', { name: data.operator_attribution })}
            </Text>
          </YStack>
        )}

        {/* Status + routing target + SLA */}
        <YStack gap="$2" bg="$backgroundPress" p="$3" rounded="$4">
          <XStack items="center" justify="space-between">
            <Text color="$colorPress">{t('routing.label')}</Text>
            <Text fontWeight="500">{t(`status.${data.current_state}`)}</Text>
          </XStack>
          <Text>{t(routingKey)}</Text>
          <Text fontSize="$2" color="$colorPress">
            {slaLine}
          </Text>
        </YStack>

        {/* Body */}
        <Text>{data.body}</Text>

        {/* Attachments */}
        {data.attachments.length > 0 && (
          <YStack gap="$2">
            <Text fontWeight="500">{t('detail.attachments_title')}</Text>
            {data.attachments.map((a, i) => (
              <XStack key={`${a.filename}-${i}`} items="center" justify="space-between" gap="$2">
                <Text flex={1} numberOfLines={1}>
                  {a.filename}
                </Text>
                <Button
                  size="$2"
                  onPress={() => void openAttachment(i)}
                  disabled={openingIndex !== null}
                  accessibilityLabel={t('detail.open_attachment')}
                >
                  {openingIndex === i ? t('detail.attachment_opening') : t('detail.open_attachment')}
                </Button>
              </XStack>
            ))}
            {attachmentError && (
              <Text color="$red10" accessibilityRole="alert">
                {attachmentError}
              </Text>
            )}
          </YStack>
        )}

        <Separator />

        {/* Read-only reply thread (AC3). 10.2 shows the opening entry; staff/member replies append in 10.4. */}
        <YStack gap="$3">
          <Text fontWeight="500">{t('detail.thread_title')}</Text>
          {data.thread.length <= 1 ? (
            <Text color="$colorPress">{t('detail.no_replies')}</Text>
          ) : null}
          {data.thread.map((entry, i) => (
            <YStack key={i} gap="$1" borderLeftWidth={2} borderLeftColor="$borderColor" pl="$3">
              <Text fontSize="$2" fontWeight="500" color="$colorPress">
                {entry.author === 'member' ? t('detail.you') : t('detail.team')}
              </Text>
              <Text>{entry.body}</Text>
              <Text fontSize="$1" color="$colorPress">
                {new Date(entry.occurred_at).toLocaleDateString()}
              </Text>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
