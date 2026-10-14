// Life Events — WORKPLACE (Story 6.36a, Task 5; AC6; `2026-10-14-330` SW8). Replaces Story 3.9's free-text "Posting"
// screen. The member sees where they work NOW, their HISTORY (every posting, newest first — each with its workplace and
// kind, or *"Not listed yet"* / *"Retired"*, its district and start date; an open *"isn't listed"* request shows where the
// Pariwar Admin's search stands), and *"I have been transferred"* — the SAME picker as the signup step — which writes a NEW
// posting (the history is kept, `-306` §2 item 2). A successful save shows the new row at the top.
// ⛔ No confirm question here — the member's answer to a Pariwar Admin's suggestion is Story 6.36c's, with its route.
//
// ── ⚠⛔ the history list starts empty and fills: loading · error · empty render as SIBLINGS, ⛔ in place. It is a short
//   list (a few transfers in a career) inside a ScrollView — a plain map, ⛔ a virtualised list nested in a scroll view.

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { Stack } from 'expo-router'
import { Button, H2, H4, Text, YStack } from 'tamagui'

import { AnnouncedText } from '../../components/peer-request/announce'
import { usePostingHistoryQuery } from '../../components/workplace/useWorkplaceQueries'
import { WorkplacePicker } from '../../components/workplace/WorkplacePicker'
import { historyRowView, type HistoryRowView } from '../../lib/workplace'
import { useWorkplaceT } from '../../lib/workplace-i18n'

export default function WorkplaceScreen() {
  const t = useWorkplaceT()
  const history = usePostingHistoryQuery()
  const [transferring, setTransferring] = useState(false)
  const [saved, setSaved] = useState(false)

  if (transferring) {
    return (
      <>
        <Stack.Screen options={{ title: t('screen_title') }} />
        <WorkplacePicker
          submitLabel={t('save')}
          onSaved={() => {
            setTransferring(false)
            setSaved(true)
          }}
          onCancel={() => setTransferring(false)}
        />
      </>
    )
  }

  const rows = (history.data?.items ?? []).map(historyRowView)
  const current = rows[0]

  return (
    <>
      <Stack.Screen options={{ title: t('screen_title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('screen_title')}</H2>
          {saved ? <AnnouncedText text={t('saved')} /> : null}

          <H4 accessibilityRole="header">{t('current_label')}</H4>
          {history.isLoading ? (
            <AnnouncedText text={t('history_loading')} />
          ) : history.isError ? (
            <YStack gap="$2">
              <AnnouncedText text={t('history_error')} kind="error" color="#C0392B" />
              <Button accessibilityRole="button" onPress={() => void history.refetch()}>
                {t('retry')}
              </Button>
            </YStack>
          ) : current ? (
            <HistoryRow view={current} />
          ) : (
            <Text accessible accessibilityRole="text" color="$colorPress">
              {t('current_none')}
            </Text>
          )}

          <Button
            theme="accent"
            height={56}
            accessibilityRole="button"
            accessibilityLabel={t('transferred')}
            onPress={() => {
              setSaved(false)
              setTransferring(true)
            }}
          >
            {t('transferred')}
          </Button>

          {rows.length > 1 ? (
            <YStack gap="$3">
              <H4 accessibilityRole="header">{t('history_label')}</H4>
              {rows.slice(1).map((v, i) => (
                <HistoryRow key={history.data!.items[i + 1]!.postingId} view={v} />
              ))}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  )
}

function HistoryRow({ view }: { view: HistoryRowView }) {
  const t = useWorkplaceT()
  const title = view.titleText ?? (view.titleKey ? t(view.titleKey) : '')
  const lines = [
    view.kindKey ? t(view.kindKey) : null,
    view.district,
    view.dateKey && view.date ? t(view.dateKey, { date: view.date }) : null,
    view.statusKey ? t(view.statusKey, view.statusParams) : null,
  ].filter((l): l is string => Boolean(l))
  return (
    <YStack accessible accessibilityRole="text" accessibilityLabel={[title, ...lines].join(', ')} gap="$1" py="$2" borderBottomWidth={1} borderColor="$borderColor">
      <Text fontWeight="600">{title}</Text>
      {lines.map((l) => (
        <Text key={l} fontSize="$2" color="$colorPress">
          {l}
        </Text>
      ))}
    </YStack>
  )
}
