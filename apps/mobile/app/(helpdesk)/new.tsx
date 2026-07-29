// Helpdesk filing form — "Ask for help" (Story 10.2, Task 7; AC1/AC4/AC6).
//
// The dignified, no-time-pressure filing flow (UX-DR55): pick a category (+ an optional
// subcategory, when the in-force policy defines any for it), write a short subject + a
// description, optionally attach photos/PDFs, and send. The attachment LIMITS are surfaced BEFORE
// the picker; a failed submit is dignified (retry), never a hard error. Draft text is saved to MMKV
// so a member can leave and return without losing work. On success we invalidate the inbox and open
// the created ticket's detail.
//
// ── Review-hardening (Story 10.2 code review) ────────────────────────────────────────────────────
// The limits shown/enforced here come from `@twt/contracts` (not local magic numbers) so the client
// copy can never drift from what the server actually enforces. `idempotencyKey` is minted ONCE per
// screen instance and reused across retries of the SAME submission (never regenerated on a failed
// attempt) — it protects the double-tap/fast-retry race the `busy` state flag alone cannot close
// (a second tap that lands before React re-renders `disabled`), by letting the server collapse a
// duplicate request into the original ticket instead of creating a second one.

import { useMemo, useState } from 'react'
import { ScrollView } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { ApiError } from '@twt/api-client'
import { HELPDESK_ATTACHMENT_MAX_BYTES, HELPDESK_ATTACHMENT_MAX_COUNT, HELPDESK_MEMBER_BODY_MAX, HELPDESK_MEMBER_SUBJECT_MAX } from '@twt/contracts'

import { helpdeskApi } from '../../lib/helpdesk-api'
import { useHelpdeskT } from '../../lib/helpdesk-i18n'
import { getTurnstileToken } from '../../lib/turnstile'
import { useSession } from '../../lib/session-context'
import {
  clearHelpdeskDraft,
  loadHelpdeskDraft,
  saveHelpdeskDraft,
} from '../../lib/helpdesk-draft'
import { useHelpdeskCategoriesQuery } from '../../components/helpdesk/useHelpdeskQueries'

/** The RN file descriptor FormData accepts for a multipart upload (the claim/document.tsx pattern). */
interface PickedFile {
  uri: string
  name: string
  type: string
}

const MAX_FILES = HELPDESK_ATTACHMENT_MAX_COUNT
const MAX_FILE_MB = HELPDESK_ATTACHMENT_MAX_BYTES / (1024 * 1024)
const SUBJECT_MAX = HELPDESK_MEMBER_SUBJECT_MAX
const BODY_MAX = HELPDESK_MEMBER_BODY_MAX

/** A lightweight, dependency-free per-instance id (the `lib/session.ts` `dev-` id precedent) — not
 *  cryptographically unique, just practically unique for one screen instance's idempotency key. */
function generateIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export default function HelpdeskNewScreen(): React.ReactElement {
  const t = useHelpdeskT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const memberId = session?.memberId

  const draft = useMemo(() => (memberId ? loadHelpdeskDraft(memberId) : {}), [memberId])
  const categoriesQuery = useHelpdeskCategoriesQuery(pariwarId)
  // Minted once for the lifetime of this screen instance — see the header note.
  const [idempotencyKey] = useState(generateIdempotencyKey)

  const [category, setCategory] = useState<string | undefined>(draft.category)
  const [subCategory, setSubCategory] = useState<string | undefined>(draft.subCategory)
  const [subject, setSubject] = useState(draft.subject ?? '')
  const [body, setBody] = useState(draft.body ?? '')
  const [files, setFiles] = useState<PickedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function persist(patch: Partial<{ category: string; subCategory: string | undefined; subject: string; body: string }>): void {
    if (memberId) saveHelpdeskDraft(memberId, patch)
  }

  const categories = categoriesQuery.data?.categories ?? []
  const categoriesEmpty = !categoriesQuery.isLoading && !categoriesQuery.isError && categories.length === 0
  const subCategories = categories.find((c) => c.category === category)?.sub_categories ?? []
  const canSubmit = !!category && subject.trim().length > 0 && body.trim().length > 0 && !busy

  async function pickPhoto(): Promise<void> {
    if (files.length >= MAX_FILES) {
      setNotice(t('new.error_too_many', { maxFiles: MAX_FILES }))
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    setFiles((prev) => [
      ...prev,
      { uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, type: a.mimeType ?? 'image/jpeg' },
    ])
  }

  async function pickFile(): Promise<void> {
    if (files.length >= MAX_FILES) {
      setNotice(t('new.error_too_many', { maxFiles: MAX_FILES }))
      return
    }
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    })
    if (res.canceled || !res.assets[0]) return
    const a = res.assets[0]
    setFiles((prev) => [
      ...prev,
      { uri: a.uri, name: a.name ?? `document-${Date.now()}.pdf`, type: a.mimeType ?? 'application/pdf' },
    ])
  }

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit(): Promise<void> {
    if (!canSubmit || !pariwarId || !category) return
    setNotice(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.append('category', category)
      if (subCategory) form.append('sub_category', subCategory)
      form.append('subject', subject.trim())
      form.append('body', body.trim())
      for (const file of files) {
        // RN multipart: append the { uri, name, type } descriptor (cast — RN's FormData accepts it).
        form.append('attachment', file as unknown as Blob)
      }
      const ticket = await helpdeskApi.createTicket(pariwarId, form, {
        turnstileToken: await getTurnstileToken(),
        idempotencyKey,
      })
      if (memberId) clearHelpdeskDraft(memberId)
      await queryClient.invalidateQueries({ queryKey: ['helpdesk', 'tickets', pariwarId] })
      // Replace so Back returns to the inbox, not the (submitted) form.
      router.replace(`/(helpdesk)/${ticket.ticket_id}`)
    } catch (err) {
      // Dignified, code-keyed failure copy (the 3.9/3.10 lesson: key on error.code).
      if (err instanceof ApiError) {
        if (err.code === 'helpdesk.attachment_too_large' || err.code === 'helpdesk.attachments_too_large') {
          setNotice(t('new.error_too_large', { maxMb: MAX_FILE_MB }))
        } else if (err.code === 'helpdesk.attachment_unsupported_media_type') setNotice(t('new.error_unsupported'))
        else if (err.code === 'helpdesk.too_many_attachments') setNotice(t('new.error_too_many', { maxFiles: MAX_FILES }))
        else if (err.code === 'helpdesk.turnstile_failed') setNotice(t('new.verify_failed'))
        else if (err.code === 'helpdesk.idempotency_in_progress') setNotice(t('new.submitting'))
        else setNotice(t('new.error_generic'))
      } else {
        setNotice(t('new.error_generic'))
      }
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} bg="$background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <H2>{t('new.title')}</H2>
        <Paragraph color="$colorPress">{t('new.intro')}</Paragraph>

        {/* Category picker */}
        <YStack gap="$2">
          <Text fontWeight="500">{t('new.category_label')}</Text>
          <Text fontSize="$2" color="$colorPress">
            {t('new.category_help')}
          </Text>
          {categoriesQuery.isLoading ? (
            <Spinner />
          ) : categoriesEmpty ? (
            <Text color="$colorPress">{t('new.category_empty')}</Text>
          ) : (
            <XStack flexWrap="wrap" gap="$2">
              {categories.map((c) => {
                const selected = c.category === category
                return (
                  <Button
                    key={c.category}
                    size="$3"
                    theme={selected ? 'accent' : undefined}
                    onPress={() => {
                      setCategory(c.category)
                      setSubCategory(undefined)
                      persist({ category: c.category, subCategory: undefined })
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    {t(`category.${c.category}.label`)}
                  </Button>
                )
              })}
            </XStack>
          )}
        </YStack>

        {/* Subcategory picker — only when the in-force policy defines subcategories for this category. */}
        {subCategories.length > 0 && (
          <YStack gap="$2">
            <Text fontWeight="500">{t('new.subcategory_label')}</Text>
            <XStack flexWrap="wrap" gap="$2">
              {subCategories.map((sc) => {
                const selected = sc === subCategory
                return (
                  <Button
                    key={sc}
                    size="$3"
                    theme={selected ? 'accent' : undefined}
                    onPress={() => {
                      const next = selected ? undefined : sc
                      setSubCategory(next)
                      persist({ subCategory: next })
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    {sc}
                  </Button>
                )
              })}
            </XStack>
          </YStack>
        )}

        {/* Subject */}
        <YStack gap="$2">
          <Text fontWeight="500">{t('new.subject_label')}</Text>
          <Input
            value={subject}
            maxLength={SUBJECT_MAX}
            placeholder={t('new.subject_placeholder')}
            onChangeText={(v) => {
              setSubject(v)
              persist({ subject: v })
            }}
            accessibilityLabel={t('new.subject_label')}
          />
        </YStack>

        {/* Body */}
        <YStack gap="$2">
          <Text fontWeight="500">{t('new.body_label')}</Text>
          <Input
            value={body}
            multiline
            numberOfLines={5}
            maxLength={BODY_MAX}
            height={120}
            placeholder={t('new.body_placeholder')}
            onChangeText={(v) => {
              setBody(v)
              persist({ body: v })
            }}
            accessibilityLabel={t('new.body_label')}
          />
        </YStack>

        {/* Attachments — limits surfaced BEFORE the picker (AC4). */}
        <YStack gap="$2">
          <Text fontWeight="500">{t('new.attach_label')}</Text>
          <Text fontSize="$2" color="$colorPress">
            {t('new.attach_limits', { maxMb: MAX_FILE_MB, maxFiles: MAX_FILES })}
          </Text>
          {files.map((f, i) => (
            <XStack key={`${f.uri}-${i}`} items="center" justify="space-between" gap="$2">
              <Text flex={1} numberOfLines={1}>
                {f.name}
              </Text>
              <Button size="$2" chromeless onPress={() => removeFile(i)} accessibilityLabel={t('new.attach_remove')}>
                {t('new.attach_remove')}
              </Button>
            </XStack>
          ))}
          <XStack gap="$2">
            <Button size="$3" onPress={() => void pickPhoto()} disabled={files.length >= MAX_FILES}>
              {t('new.attach_button')}
            </Button>
            <Button size="$3" onPress={() => void pickFile()} disabled={files.length >= MAX_FILES}>
              {t('new.attach_button')}
            </Button>
          </XStack>
          {files.length > 0 && (
            <Text fontSize="$2" color="$colorPress">
              {files.length === 1 ? t('new.attach_added', { count: 1 }) : t('new.attach_added_plural', { count: files.length })}
            </Text>
          )}
        </YStack>

        {notice && (
          <Text color="$red10" accessibilityRole="alert">
            {notice}
          </Text>
        )}

        <Button theme="accent" disabled={!canSubmit} onPress={() => void submit()} accessibilityRole="button">
          {busy ? <Spinner /> : t('new.submit')}
        </Button>
      </ScrollView>
    </YStack>
  )
}
