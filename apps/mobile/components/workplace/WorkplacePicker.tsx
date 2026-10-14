// <WorkplacePicker> — WHERE THE MEMBER WORKS, picked from the Pariwar's list (Story 6.36a, Task 5; AC5, AC6; `2026-10-14-330`
// SW4–SW9). Shared by the signup step (`app/(signup)/workplace.tsx`) and Life Events → Workplace's *"I have been
// transferred"* (`app/(life-events)/posting.tsx`).
//
// ── THE FLOW (SW4 — district → type-to-search, ⛔ district → block → school) ────────────────────────────────────────────
//   1. the DISTRICT (the Pariwar's listed spellings);
//   2. the ANSWER — *"At a school"* · *"At an office"* · *"My workplace isn't listed"* · *"I have retired"* (each valid —
//      the step ⛔ never blocks a signup, SW7);
//   3. a school / an office: the SERVER-side search (debounced; a superseded request is cancelled), rows showing the name,
//      the village and the cluster — UDISE names are mostly English upper-case and are shown AS THEY ARE (`-307` §2 item 2);
//      *"isn't listed"*: the name (and optionally the village or block) typed — ⛔ a phone number;
//   4. the DATE — *"When did you start working here?"* (or *"When did you retire?"*), `DD-MM-YYYY`;
//   5. SAVE — ONE posting through `POST …/posting` with an `Idempotency-Key` (a retry of the SAME answer reuses it).
// A Pariwar with ⛔ list yet (`hasList: false`) shows today's free-text district box + *"I have retired"* instead (SW7).
//
// ── ⚠⛔ THE LIST STARTS EMPTY AND FILLS — loading · error · empty render OUTSIDE the FlashList, as a SIBLING ⛔ a
//   `ListEmptyComponent` swapped in place: New-Arch FlashList red-boxes crossing empty → populated IN PLACE
//   (`components/drive-list/MemberDriveList.tsx`'s Trap 3).
// ── ⛔ The workplace is ⛔ never shown to anyone else; this screen names ⛔ a death, a claim or the people asked about one.

import { useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'

import { FlashList } from '@shopify/flash-list'
import { useQueryClient } from '@tanstack/react-query'
import type { WorkplaceSummaryWire } from '@twt/contracts'
import { Button, H2, Input, Paragraph, Spinner, Text, View, XStack, YStack } from 'tamagui'

import { newIdempotencyKey } from '../../lib/idempotency-key'
import { memberAuth } from '../../lib/member-api'
import { todayInIst } from '../../lib/peer-request'
import {
  buildDistrictOnlyRequest,
  buildListedRequest,
  EMPTY_ANSWER,
  isPlausibleTypedText,
  parseStartDate,
  refusalCopyKey,
  type WorkplaceAnswer,
  type WorkplaceAnswerKind,
} from '../../lib/workplace'
import { useWorkplaceT } from '../../lib/workplace-i18n'
import { AnnouncedText, useAnnounceOnChange } from '../peer-request/announce'
import { useWorkplaceDistrictsQuery, useWorkplaceSearchQuery, workplaceKeys } from './useWorkplaceQueries'

type Phase = 'district' | 'kind' | 'search' | 'typed' | 'date'

export interface WorkplacePickerProps {
  /** The save button's words (signup: *"Continue"*; a transfer: *"Save"*). */
  readonly submitLabel: string
  /** Called once the posting is saved (signup → the next step; a transfer → back to the history). */
  readonly onSaved: () => void
  /** A transfer can be cancelled; the signup step cannot (AC5 — ⛔ skippable). */
  readonly onCancel?: () => void
}

/** `value`, settled for `ms` (the search box's debounce). */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return settled
}

const ERROR_COLOR = '#C0392B'

export function WorkplacePicker({ submitLabel, onSaved, onCancel }: WorkplacePickerProps) {
  const t = useWorkplaceT()
  const queryClient = useQueryClient()
  const districts = useWorkplaceDistrictsQuery()

  const [phase, setPhase] = useState<Phase>('district')
  const [answer, setAnswer] = useState<WorkplaceAnswer>(EMPTY_ANSWER)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query.trim(), 300)
  const [dateTouched, setDateTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // No-list Pariwar (SW7): the free-text box + the retirement toggle.
  const [freeDistrict, setFreeDistrict] = useState('')
  const [freeRetired, setFreeRetired] = useState(false)
  // ONE key per ANSWER: a retry of the same answer replays; a changed answer is a new save.
  const keyRef = useRef<{ body: string; key: string } | null>(null)

  const searchKind = answer.kind === 'school' || answer.kind === 'office' ? answer.kind : null
  const search = useWorkplaceSearchQuery(phase === 'search' ? answer.district : null, phase === 'search' ? searchKind : null, debouncedQuery)

  useAnnounceOnChange(phase === 'district' ? null : t(phaseTitleKey(phase, answer.kind), { district: answer.district ?? '' }), { skipInitial: true })

  const today = todayInIst(new Date())

  async function save(body: NonNullable<ReturnType<typeof buildListedRequest>>): Promise<void> {
    const serialized = JSON.stringify(body)
    if (keyRef.current?.body !== serialized) keyRef.current = { body: serialized, key: newIdempotencyKey() }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.lifeEventsUpdatePosting(body, { idempotencyKey: keyRef.current.key })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workplaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
      ])
      onSaved()
    } catch (e) {
      const key = refusalCopyKey(e)
      setError(t(key))
      // The list moved under the member (a delisting, a rename, the Pariwar's first import): drop the cached districts and
      // search so going back shows what the server now holds.
      if (key === 'refusal.not_found' || key === 'refusal.district_not_found' || key === 'refusal.choice_unavailable') {
        void queryClient.invalidateQueries({ queryKey: workplaceKeys.all })
      }
    } finally {
      setBusy(false)
    }
  }

  const errorLine = error ? <AnnouncedText text={error} kind="error" color={ERROR_COLOR} /> : null

  // ── the district list (loading / error / no list) ────────────────────────────────────────────────────────────────
  if (districts.isLoading) {
    return (
      <YStack flex={1} px="$6" py="$6" bg="$background">
        <AnnouncedText text={t('districts_loading')} />
      </YStack>
    )
  }
  if (districts.isError || !districts.data) {
    return (
      <YStack flex={1} px="$6" py="$6" gap="$4" bg="$background">
        <AnnouncedText text={t('districts_error')} kind="error" color={ERROR_COLOR} />
        <Button accessibilityRole="button" onPress={() => void districts.refetch()}>
          {t('retry')}
        </Button>
      </YStack>
    )
  }

  if (!districts.data.hasList) {
    const body = buildDistrictOnlyRequest(freeDistrict, freeRetired)
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('step_title')}</H2>
          <Paragraph color="$colorPress">{t('no_list_intro')}</Paragraph>
          <Text>{t('district_label')}</Text>
          <Input
            value={freeDistrict}
            onChangeText={(v) => {
              setError(null)
              setFreeDistrict(v)
            }}
            maxLength={200}
            height={48}
            accessibilityLabel={t('district_label')}
          />
          <Button
            size="$3"
            theme={freeRetired ? 'accent' : undefined}
            chromeless={!freeRetired}
            justify="flex-start"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: freeRetired }}
            accessibilityLabel={t('no_list_retired')}
            onPress={() => setFreeRetired((v) => !v)}
          >
            {(freeRetired ? '☑  ' : '☐  ') + t('no_list_retired')}
          </Button>
          {errorLine}
          <PickerActions
            primaryLabel={submitLabel}
            primaryDisabled={busy || body === null}
            busy={busy}
            onPrimary={() => body && void save(body)}
            cancelLabel={onCancel ? t('cancel') : undefined}
            onCancel={onCancel}
          />
        </YStack>
      </ScrollView>
    )
  }

  const choose = (patch: Partial<WorkplaceAnswer>, next: Phase): void => {
    setError(null)
    setAnswer((a) => ({ ...a, ...patch }))
    setPhase(next)
  }

  // ── 1. the district ────────────────────────────────────────────────────────────────────────────────────────────────
  if (phase === 'district') {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$3" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('step_title')}</H2>
          <Paragraph color="$colorPress">{t('step_intro')}</Paragraph>
          <Text fontWeight="500">{t('district_prompt')}</Text>
          {/* ⚠ ⛔ `accessible` on the group — it would hide its radios from VoiceOver (PeerQuestionnaire's note). */}
          <YStack gap="$2" accessibilityRole="radiogroup" accessibilityLabel={t('district_prompt')}>
            {districts.data.items.map(({ district }) => (
              <Button
                key={district}
                accessibilityRole="radio"
                accessibilityState={{ checked: answer.district === district }}
                accessibilityLabel={district}
                theme={answer.district === district ? 'accent' : undefined}
                justify="flex-start"
                onPress={() => choose({ ...EMPTY_ANSWER, district }, 'kind')}
              >
                {district}
              </Button>
            ))}
          </YStack>
          {onCancel ? (
            <Button chromeless accessibilityRole="button" onPress={onCancel}>
              {t('cancel')}
            </Button>
          ) : null}
        </YStack>
      </ScrollView>
    )
  }

  // ── 2. the answer ──────────────────────────────────────────────────────────────────────────────────────────────────
  if (phase === 'kind') {
    const options: { kind: WorkplaceAnswerKind; key: string; next: Phase }[] = [
      { kind: 'school', key: 'kind_school', next: 'search' },
      { kind: 'office', key: 'kind_office', next: 'search' },
      { kind: 'not_listed', key: 'not_listed', next: 'typed' },
      { kind: 'retired', key: 'retired', next: 'date' },
    ]
    const prompt = t('kind_prompt', { district: answer.district ?? '' })
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$3" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{prompt}</H2>
          <YStack gap="$2" accessibilityRole="radiogroup" accessibilityLabel={prompt}>
            {options.map((o) => (
              <Button
                key={o.kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: answer.kind === o.kind }}
                accessibilityLabel={t(o.key)}
                theme={answer.kind === o.kind ? 'accent' : undefined}
                justify="flex-start"
                height="auto"
                py="$3"
                onPress={() => {
                  setQuery('')
                  choose({ kind: o.kind, workplace: null, typedName: '', typedPlace: '' }, o.next)
                }}
              >
                {t(o.key)}
              </Button>
            ))}
          </YStack>
          <Button chromeless accessibilityRole="button" onPress={() => choose({ kind: null }, 'district')}>
            {t('back')}
          </Button>
        </YStack>
      </ScrollView>
    )
  }

  // ── 3a. the search (a school / an office) ──────────────────────────────────────────────────────────────────────────
  if (phase === 'search') {
    const label = t(answer.kind === 'office' ? 'search_label_office' : 'search_label_school')
    const rows = search.data?.pages.flatMap((p) => p.items) ?? []
    // FlashList v2 prop-typing wrinkle under React 19 + new arch — cast as any (the ratified `MemberDriveList` pattern).
    // ⚠⛔ Do ⛔ not add a sizing prop without checking it exists in the installed major (v2 removed `estimatedItemSize`).
    const FlashListAny = FlashList as any
    return (
      <YStack flex={1} bg="$background">
        <YStack gap="$2" px="$6" pt="$6" pb="$2">
          <H2 accessibilityRole="header">{label}</H2>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_hint')}
            accessibilityLabel={label}
            accessibilityHint={t('search_hint')}
            autoCorrect={false}
            height={48}
            maxLength={100}
          />
        </YStack>
        {search.isLoading ? (
          <YStack px="$6" py="$4">
            <AnnouncedText text={t('search_loading')} />
          </YStack>
        ) : search.isError ? (
          <YStack px="$6" py="$4" gap="$3">
            <AnnouncedText text={t('search_error')} kind="error" color={ERROR_COLOR} />
            <Button accessibilityRole="button" onPress={() => void search.refetch()}>
              {t('retry')}
            </Button>
          </YStack>
        ) : rows.length === 0 ? (
          <YStack px="$6" py="$4">
            <AnnouncedText text={t('search_empty')} />
          </YStack>
        ) : (
          <View flex={1}>
            <FlashListAny
              data={rows}
              keyExtractor={(w: WorkplaceSummaryWire) => w.workplaceId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: WorkplaceSummaryWire }) => {
                const place = [item.villageName, item.clusterName].filter((p): p is string => Boolean(p)).join(' · ')
                return (
                  <Button
                    mx="$6"
                    my="$1"
                    height="auto"
                    py="$3"
                    justify="flex-start"
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={place ? `${item.name}, ${place}` : item.name}
                    onPress={() => choose({ workplace: item }, 'date')}
                  >
                    <YStack>
                      <Text fontWeight="500">{item.name}</Text>
                      {place ? (
                        <Text fontSize="$2" color="$colorPress">
                          {place}
                        </Text>
                      ) : null}
                    </YStack>
                  </Button>
                )
              }}
            />
          </View>
        )}
        <XStack gap="$3" px="$6" py="$3">
          {search.hasNextPage ? (
            <Button flex={1} accessibilityRole="button" disabled={search.isFetchingNextPage} onPress={() => void search.fetchNextPage()}>
              {search.isFetchingNextPage ? <Spinner /> : t('search_more')}
            </Button>
          ) : null}
          <Button flex={1} chromeless accessibilityRole="button" onPress={() => choose({ kind: null, workplace: null }, 'kind')}>
            {t('back')}
          </Button>
        </XStack>
      </YStack>
    )
  }

  // ── 3b. the typed name (*"isn't listed"*) ──────────────────────────────────────────────────────────────────────────
  if (phase === 'typed') {
    // The server's rule, mirrored so *"Continue"* waits for a name it will take (⛔ a phone number — SW9).
    const placeText = answer.typedPlace.trim()
    const typedOk = isPlausibleTypedText(answer.typedName) && (placeText === '' || isPlausibleTypedText(placeText))
    const showTypedError = !typedOk && (answer.typedName.trim() !== '' || placeText !== '')
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <YStack gap="$3" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('not_listed')}</H2>
          <Text>{t('typed_name_label')}</Text>
          <Input
            value={answer.typedName}
            onChangeText={(v) => setAnswer((a) => ({ ...a, typedName: v }))}
            maxLength={120}
            height={48}
            accessibilityLabel={t('typed_name_label')}
            accessibilityHint={t('typed_hint')}
          />
          <Text>{t('typed_place_label')}</Text>
          <Input
            value={answer.typedPlace}
            onChangeText={(v) => setAnswer((a) => ({ ...a, typedPlace: v }))}
            maxLength={120}
            height={48}
            accessibilityLabel={t('typed_place_label')}
            accessibilityHint={t('typed_hint')}
          />
          <Paragraph color="$colorPress" fontSize="$2">
            {t('typed_hint')}
          </Paragraph>
          {showTypedError ? <AnnouncedText text={t('refusal.typed_name_invalid')} kind="error" color={ERROR_COLOR} /> : null}
          <PickerActions
            primaryLabel={t('continue')}
            primaryDisabled={!typedOk}
            busy={false}
            onPrimary={() => setPhase('date')}
            cancelLabel={t('back')}
            onCancel={() => choose({ kind: null }, 'kind')}
          />
        </YStack>
      </ScrollView>
    )
  }

  // ── 4. the date, and save ──────────────────────────────────────────────────────────────────────────────────────────
  const retired = answer.kind === 'retired'
  const dateLabel = t(retired ? 'retired_label' : 'started_label')
  const dateOk = parseStartDate(answer.dateText, today) !== null
  const body = buildListedRequest(answer, today)
  const chosen = retired ? t('retired') : (answer.workplace?.name ?? answer.typedName.trim())
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <YStack gap="$3" px="$6" py="$6" bg="$background">
        <Text color="$colorPress">{t('chosen_label')}</Text>
        <Text fontWeight="600" accessibilityRole="text">
          {chosen}
        </Text>
        <Text color="$colorPress">{answer.district}</Text>
        <H2 accessibilityRole="header">{dateLabel}</H2>
        <Input
          value={answer.dateText}
          onChangeText={(v) => {
            setError(null)
            setAnswer((a) => ({ ...a, dateText: v }))
          }}
          onBlur={() => setDateTouched(true)}
          placeholder={t('date_hint')}
          keyboardType="numbers-and-punctuation"
          height={48}
          accessibilityLabel={dateLabel}
          accessibilityHint={t('date_hint')}
        />
        {/* Shown once the member has left the field, or typed a whole DD-MM-YYYY — ⛔ while they are still typing it. */}
        {(dateTouched || answer.dateText.trim().length >= 10) && answer.dateText.trim() !== '' && !dateOk ? (
          <AnnouncedText text={t('date_invalid')} kind="error" color={ERROR_COLOR} />
        ) : null}
        {errorLine}
        <PickerActions
          primaryLabel={submitLabel}
          primaryDisabled={busy || body === null}
          busy={busy}
          onPrimary={() => body && void save(body)}
          cancelLabel={t('back')}
          onCancel={() => choose({ dateText: answer.dateText }, retired ? 'kind' : answer.kind === 'not_listed' ? 'typed' : 'search')}
        />
      </YStack>
    </ScrollView>
  )
}

/** The phase's spoken title (announced on a phase change — ⛔ a navigation event fires). */
function phaseTitleKey(phase: Phase, kind: WorkplaceAnswerKind | null): string {
  switch (phase) {
    case 'kind':
      return 'kind_prompt'
    case 'search':
      return kind === 'office' ? 'search_label_office' : 'search_label_school'
    case 'typed':
      return 'not_listed'
    case 'date':
      return kind === 'retired' ? 'retired_label' : 'started_label'
    default:
      return 'step_title'
  }
}

function PickerActions({
  primaryLabel,
  primaryDisabled,
  busy,
  onPrimary,
  cancelLabel,
  onCancel,
}: {
  primaryLabel: string
  primaryDisabled: boolean
  busy: boolean
  onPrimary: () => void
  cancelLabel?: string | undefined
  onCancel?: (() => void) | undefined
}) {
  return (
    <YStack gap="$2" pt="$2">
      <Button
        theme="accent"
        height={56}
        disabled={primaryDisabled}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        accessibilityState={{ disabled: primaryDisabled }}
        onPress={onPrimary}
      >
        {busy ? <Spinner /> : primaryLabel}
      </Button>
      {cancelLabel && onCancel ? (
        <Button chromeless accessibilityRole="button" onPress={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}
    </YStack>
  )
}
