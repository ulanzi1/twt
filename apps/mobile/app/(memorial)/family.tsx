// Story 11b.5a (KL8 / KL15 / AC2) — THE FAMILY LIST, optional, between the photo and the preview. The family may list the
// relatives the member leaves behind, as an obituary does (`-428` PQ1 A: relation + name, the fourteen relations, used for
// nothing else). ⛔ Never required; ⛔ never pre-filled — the rows start EMPTY (⛔ nothing from the nominee record or the claim).
//   · ONE person per row (KL4) — a relation chosen from the fourteen (each relative TO THE MEMBER WHO DIED) and a name kept
//     exactly as typed (⛔ trimmed, ⛔ normalised). At most 20 rows. An unfinished row blocks "Next" (copy 2.11); a wholly
//     empty row is simply dropped.
//   · Copy 2.4A sits under the body: a child may be named only by their parent or guardian, or with their agreement — the
//     declaration itself is sentence ③ of the permission at Send (KL16), ⛔ a second tick here.
//   · The "In the photo" tick (KL15) shows on each row ONLY when the Send will carry a photo (a new one, or the one sent
//     before) — it is ⛔ never public; the Send strips every tick when no photo goes.
//   · Re-send: the draft is cleared after a landed Send, so on a re-send *"Start from the list I sent"* fills the rows from the
//     family's OWN last-sent list (`view.kinship`, ⛔ as approved) — a tap, ⛔ never automatic, only while the rows are empty;
//     its ticks are copied only when the draft keeps the photo sent before.
// R20 / T6 / V9 (a) — as on Write and Photo: the saved draft is loaded in an EFFECT once the view and the member are known,
// re-read every time the screen comes back to the front, and that re-read is skipped while this screen's last save failed.
// T1 — the screen's heading is SPOKEN on arrival (the stack has no title).
// RP2 / T8 / V8 — the two states that APPEAR here with no live region beside them are SPOKEN too, once at the crossing and never
// on every keystroke (the Write / Photo counters' rule): a name going over its cap (copy 2.10, per row), and the 20th row
// replacing "Add someone" with the limit line (copy 2.16). A state the screen STARTS in (a restored draft) is the baseline, not
// announced.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, XStack, YStack } from 'tamagui'

import {
  MEMORIAL_KINSHIP_MAX_ENTRIES,
  MEMORIAL_KINSHIP_RELATIONS,
  isMemorialTextBlank,
  type MemorialKinshipRelation,
} from '@twt/contracts'
import { useLocale } from '@twt/i18n/react'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import {
  memorialKinshipNameOver,
  memorialKinshipRowsReady,
  memorialKinshipStartFromSent,
  type MemorialDraftKinshipRow,
} from '../../components/memorial-authorship/memorial-kinship'
import {
  MemorialRowOverLimitAnnouncer,
  useMemorialAnnounce,
  useMemorialOverLimitAnnounce,
  useMemorialScreenAnnounce,
} from '../../components/memorial-authorship/useMemorialAnnounce'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import { loadMemorialDraft, memorialPhotoUri, saveMemorialDraft, type MemorialDraft } from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { announcementPlan } from '../../lib/death-certificate-announce'
import { useSession } from '../../lib/session-context'

export default function MemorialFamilyScreen(): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const query = useMemorialViewQuery()
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  // R20 — `null` until the saved draft has been loaded (in the effect below).
  const [loaded, setLoaded] = useState<MemorialDraft | null>(null)
  // Which row's relation options are open (one at a time), and whether "Next" was pressed over an unfinished row.
  const [openRow, setOpenRow] = useState<number | null>(null)
  const [incomplete, setIncomplete] = useState(false)
  // RP2 — bumped when a row is removed: the rows after it shift up an index, and each row's announcer (keyed on this) starts again
  // from its new baseline, so a name that was already over its cap is not announced afresh at its new position.
  const [removals, setRemovals] = useState(0)
  const driveId = view?.driveId ?? null
  useEffect(() => {
    if (loaded !== null || driveId === null || memberId === null) return
    setLoaded(loadMemorialDraft(memberId, driveId))
  }, [loaded, driveId, memberId])
  // T6 — the ids through a ref, so the focus callback stays stable and reads the CURRENT ones.
  const ids = useRef({ driveId, memberId })
  ids.current = { driveId, memberId }
  // V9 (a) — did this screen's last save fail to reach the phone's storage?
  const lastSaveFailed = useRef(false)
  useFocusEffect(
    useCallback(() => {
      const { driveId: d, memberId: m } = ids.current
      if (d === null || m === null) return // a cold mount: the effect above loads it once the view arrives
      if (lastSaveFailed.current) return // V9 (a) — the screen holds rows the storage does not: keep them
      setLoaded(loadMemorialDraft(m, d))
    }, []),
  )
  const incompleteText = incomplete ? t('family.row_incomplete') : null
  const incompleteLive = useMemorialAnnounce(incompleteText, { hasLiveRegion: true, kind: 'error' })
  useMemorialScreenAnnounce(view && memberId ? t('family.title') : null)
  // RP2 — copy 2.16 replaces the "Add someone" button in place: spoken once when the 20th row appears (and again after a removal
  // and a new 20th), silent when the draft was restored already at 20.
  const limitText =
    (loaded?.kinship?.length ?? 0) >= MEMORIAL_KINSHIP_MAX_ENTRIES ? t('family.limit_reached', { count: String(MEMORIAL_KINSHIP_MAX_ENTRIES) }) : null
  useMemorialOverLimitAnnounce(limitText, loaded !== null)
  if (!view || !memberId)
    return (
      <MemorialViewMissing
        loading={query.isPending}
        fetching={query.isError && query.isFetching}
        onRetry={() => query.refetch()}
      />
    )
  const mid = memberId
  const drive = view.driveId
  const draft: MemorialDraft = loaded ?? {}
  const rows: MemorialDraftKinshipRow[] = draft.kinship ?? []
  const keepsPrevious = draft.keepPreviousPhoto === true
  // The SAME photo test as the Send's FormData (`use-memorial-send.ts`): a picked file that is still there, or the one sent before.
  const withPhoto = keepsPrevious || memorialPhotoUri(draft.photoFileName) !== null

  const save = (next: MemorialDraftKinshipRow[] | undefined): void => {
    if (loaded === null) return // ⛔ never save over a draft that has not been loaded
    const result = saveMemorialDraft(mid, drive, { kinship: next })
    lastSaveFailed.current = !result.saved
    setLoaded(result.saved ? result.draft : { ...draft, kinship: next })
    setIncomplete(false)
  }
  const setRow = (i: number, row: MemorialDraftKinshipRow): void => save(rows.map((r, j) => (j === i ? row : r)))
  const label = (relation: MemorialKinshipRelation): string => t(`kinship.${relation}`)
  // The family's OWN last-sent list — offered only on a re-send, while the rows are empty.
  const sentList = view.memorialState !== 'none' && view.kinship !== null && loaded !== null && rows.length === 0 ? view.kinship : null

  function next(): void {
    if (!memorialKinshipRowsReady(rows)) {
      // RP30 — a SECOND press while the line already shows changes nothing on screen, so the hook (keyed on the text) does not
      // fire: on iOS the press would be silent — no navigation, no word. Spoken here on the platforms the plan announces a
      // live-region line on (iOS); ⛔ on Android, where TalkBack re-reads the standing live region at a press (the 6.36f D1
      // device session — [[project_android_live_region_reread_on_rerender]]) and a call here would be spoken twice. ⚠ Android's
      // repeat is ⛔ checked on a device (Row 41's TalkBack pass).
      if (incomplete && announcementPlan(Platform.OS, 'error').iosAnnounce) {
        AccessibilityInfo.announceForAccessibility(t('family.row_incomplete'))
      }
      setIncomplete(true)
      return
    }
    // A wholly empty row is dropped; an empty list is "no list".
    const kept = rows.filter((r) => !(r.relation === undefined && r.name === ''))
    save(kept.length > 0 ? kept : undefined)
    router.push('/(memorial)/preview')
  }

  function without(): void {
    save(undefined)
    router.push('/(memorial)/preview')
  }

  return (
    <YStack flex={1}>
      <MemorialHeader />
      <ScrollView keyboardShouldPersistTaps="handled">
        <YStack px="$4" py="$4" gap="$3">
          <H2 accessibilityRole="header">{t('family.title')}</H2>
          <Paragraph>{t('family.body')}</Paragraph>
          <Paragraph size="$2">{t('family.children_guardian')}</Paragraph>
          <Paragraph size="$2">{t('family.where_shown')}</Paragraph>
          <Paragraph fontWeight="600">{t('family.relation_question')}</Paragraph>
          <Paragraph size="$2">{t('family.name_hint')}</Paragraph>
          {withPhoto ? <Paragraph size="$2">{t('family.in_photo_hint')}</Paragraph> : null}
          {sentList !== null ? (
            <Button
              style={{ minHeight: 44 }}
              accessibilityRole="button"
              testID="memorial-family-start-from-sent"
              onPress={() => save(memorialKinshipStartFromSent(sentList, keepsPrevious))}
            >
              {t('family.start_from_sent')}
            </Button>
          ) : null}
          {rows.map((row, i) => {
            const over = memorialKinshipNameOver(row.name)
            const overText = over > 0 ? t('family.name_over_limit', { count: String(over) }) : null
            return (
              <YStack key={i} gap="$2" testID={`memorial-family-row-${i}`}>
                <MemorialRowOverLimitAnnouncer key={removals} text={overText} />
                <Paragraph fontWeight="600">{t('family.relation_label')}</Paragraph>
                <Button
                  style={{ minHeight: 44 }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: openRow === i }}
                  accessibilityLabel={`${t('family.relation_label')}: ${row.relation === undefined ? t('family.relation_choose') : label(row.relation)}`}
                  testID={`memorial-family-relation-${i}`}
                  onPress={() => setOpenRow(openRow === i ? null : i)}
                >
                  {row.relation === undefined ? t('family.relation_choose') : label(row.relation)}
                </Button>
                {openRow === i ? (
                  <YStack gap="$1">
                    {MEMORIAL_KINSHIP_RELATIONS.map((relation) => (
                      <Button
                        key={relation}
                        style={{ minHeight: 44 }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: row.relation === relation }}
                        testID={`memorial-family-relation-${i}-${relation}`}
                        onPress={() => {
                          setRow(i, { ...row, relation })
                          setOpenRow(null)
                        }}
                      >
                        {label(relation)}
                      </Button>
                    ))}
                  </YStack>
                ) : null}
                <Input
                  testID={`memorial-family-name-${i}`}
                  value={row.name}
                  onChangeText={(v: string) => setRow(i, { ...row, name: v })}
                  autoCorrect={false}
                  spellCheck={false}
                  accessibilityLabel={t('family.name_label')}
                  accessibilityHint={overText !== null ? `${overText} ${t('family.name_hint')}` : t('family.name_hint')}
                  {...(Platform.OS === 'ios' ? { accessibilityLanguage: locale === 'hi' ? 'hi-IN' : 'en-IN' } : {})}
                />
                {overText !== null ? <Paragraph size="$2">{overText}</Paragraph> : null}
                <XStack gap="$2" flexWrap="wrap">
                  {withPhoto ? (
                    <Button
                      style={{ minHeight: 44 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: row.inPhoto === true }}
                      accessibilityLabel={isMemorialTextBlank(row.name) ? t('family.in_photo') : t('family.in_photo_a11y', { name: row.name })}
                      testID={`memorial-family-in-photo-${i}`}
                      onPress={() =>
                        setRow(i, row.inPhoto === true ? { ...(row.relation === undefined ? {} : { relation: row.relation }), name: row.name } : { ...row, inPhoto: true })
                      }
                    >
                      {`${row.inPhoto === true ? '✓ ' : ''}${t('family.in_photo')}`}
                    </Button>
                  ) : null}
                  <Button
                    style={{ minHeight: 44 }}
                    accessibilityRole="button"
                    // RP31 — a BLANK name (spaces only, `isMemorialTextBlank` — the same test that makes the row unfinished) falls
                    // back to copy 2.15 too, ⛔ "Remove ␣␣ from the list".
                    accessibilityLabel={isMemorialTextBlank(row.name) ? t('family.remove_empty_a11y') : t('family.remove_a11y', { name: row.name })}
                    testID={`memorial-family-remove-${i}`}
                    onPress={() => {
                      setOpenRow(null)
                      setRemovals((n) => n + 1)
                      const left = rows.filter((_, j) => j !== i)
                      save(left.length > 0 ? left : undefined)
                    }}
                  >
                    {t('family.remove')}
                  </Button>
                </XStack>
              </YStack>
            )
          })}
          {rows.length >= MEMORIAL_KINSHIP_MAX_ENTRIES ? (
            <Paragraph size="$2" testID="memorial-family-limit">
              {limitText}
            </Paragraph>
          ) : (
            <Button
              style={{ minHeight: 44 }}
              accessibilityRole="button"
              testID="memorial-family-add"
              disabled={loaded === null}
              onPress={() => save([...rows, { name: '' }])}
            >
              {t('family.add')}
            </Button>
          )}
          {incompleteText !== null ? (
            <Paragraph theme="yellow" accessibilityLiveRegion={incompleteLive} testID="memorial-family-incomplete">
              {incompleteText}
            </Paragraph>
          ) : null}
          <Button style={{ minHeight: 44 }} accessibilityRole="button" testID="memorial-family-without" onPress={without}>
            {t('family.without')}
          </Button>
          <Button style={{ minHeight: 44 }} accessibilityRole="button" testID="memorial-family-next" onPress={next}>
            {t('family.next')}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
