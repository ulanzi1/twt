// "Find members in my contacts" (Story 6.36b, Task 4; AC9; 6.36a SW11–SW13; `-309`, `-310` CF5 A; Apple 5.1.1 / 5.1.2,
// Google Play User Data — the prominent disclosure, IN the app, BEFORE the system prompt, with an affirmative choice).
//
// The flow: the NOTE (BigDev's words, the Trust's name from config) → *"Continue"* → the system permission prompt →
//   · granted (or iOS 18 limited — *"Only the contacts you shared are checked."* + *"Share more contacts"*): the numbers
//     are read, normalised ON THE PHONE, de-duplicated, ≤ 1,000 (more ⇒ *"We checked 1,000 of your contacts"*), sent ONCE,
//     and the server answers with the matched POSITIONS — the matches are shown under the names the member SAVED, with a
//     search box; the member ticks up to `freeSlots` and asks each (one per-call `mutateAsync`); the checked contacts that
//     did ⛔ match are offered below, *"Not members yet — invite"*, ONE share sheet per tap with the member's own message
//     (Apple 5.1.2(v) — ⛔ "select all");
//   · denied / unavailable: iOS *"Choose a contact"* (the system picker — ⛔ permission, SF3); Android *"Type their mobile
//     number"* (SW13).
// ⛔ The contact list is held in this screen's MEMORY only (⛔ MMKV, ⛔ a query cache) and dropped when it unmounts; a
// non-member's number is ⛔ kept anywhere. The saved name of each new link is kept ON THIS PHONE (MMKV, ⛔ sent).
// Every 429 / 404 / 409 shows its own plain message (AC9). Empty / loading states render OUTSIDE the FlashList.

import { useState } from 'react'
import { Platform, ScrollView, Share } from 'react-native'

import { FlashList } from '@shopify/flash-list'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, H3, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { errorCodeOf, useKnownPeopleWrites, useMyKnownPeopleQuery } from '../../components/known-people/useKnownPeopleQueries'
import { applyMatches, fallbackFor, filterBySavedName, refusalCopyKey, toggleSelection, type ContactEntry } from '../../lib/known-people'
import { pickOneContact, readContactsForMatching, shareMoreContacts } from '../../lib/known-people-contacts'
import { knownPeopleApi } from '../../lib/known-people-api'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { saveSavedName } from '../../lib/known-people-saved-names'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { normalizeMobileOnPhone } from '../../lib/phone-normalize'
import { useSession } from '../../lib/session-context'
import { configuredTrustName } from '../../lib/trust-name'

type Phase =
  | { kind: 'note' }
  | { kind: 'checking' }
  | { kind: 'matches'; matched: ContactEntry[]; notMatched: ContactEntry[]; truncated: boolean; limited: boolean }
  | { kind: 'fallback'; via: 'picker' | 'typed' }

export default function KnownPeopleFindScreen() {
  const t = useKnownPeopleT()
  const router = useRouter()
  const { session } = useSession()
  const mine = useMyKnownPeopleQuery()
  const { ask, refresh } = useKnownPeopleWrites()
  const [phase, setPhase] = useState<Phase>({ kind: 'note' })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const trustName = configuredTrustName()
  const freeSlots = mine.data?.freeSlots ?? 0
  const memberId = session?.memberId

  /**
   * Ask ONE number; keep the SAVED name on the phone. ⛔ A number is ever kept as a "name" (a typed ask, or a contact saved
   * without a name, keeps none — its row shows the neutral fallback). Returns the refusal copy key, or null on success.
   */
  async function askOne(entry: { number: string; savedName: string | null }, foundBy: 'contacts' | 'picker' | 'typed'): Promise<string | null> {
    try {
      const { link } = await ask.mutateAsync({ mobile: entry.number, foundBy, idempotencyKey: newIdempotencyKey() })
      const name = entry.savedName
      if (memberId && name !== null && name !== entry.number) saveSavedName(memberId, link.linkId, name)
      return null
    } catch (err) {
      return refusalCopyKey(errorCodeOf(err))
    }
  }

  async function check(): Promise<void> {
    setPhase({ kind: 'checking' })
    setMessage(null)
    try {
      const read = await readContactsForMatching()
      if (read.kind !== 'read') {
        setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS) })
        if (read.kind === 'denied') setMessage(t('find.permission_denied'))
        return
      }
      const { checked, truncated } = read.prepared
      const positions = checked.length === 0 ? [] : (await knownPeopleApi.contactMatches(checked.map((c) => c.number))).matched
      const { matched, notMatched } = applyMatches(checked, positions)
      setSelected(new Set())
      setPhase({ kind: 'matches', matched, notMatched, truncated, limited: read.access === 'limited' })
    } catch (err) {
      setPhase({ kind: 'note' })
      setMessage(t(refusalCopyKey(errorCodeOf(err))))
    }
  }

  async function sendSelected(matched: readonly ContactEntry[]): Promise<void> {
    setBusy(true)
    setMessage(null)
    const failures: string[] = []
    for (const entry of matched.filter((m) => selected.has(m.key))) {
      const refused = await askOne(entry, 'contacts')
      if (refused) failures.push(refused)
    }
    await refresh()
    setBusy(false)
    if (failures.length === 0) {
      setMessage(t('find.sent'))
      router.back()
    } else {
      setMessage([...new Set(failures)].map((k) => t(k)).join(' '))
    }
  }

  async function pickAndAsk(): Promise<void> {
    setBusy(true)
    setMessage(null)
    try {
      const picked = await pickOneContact()
      if (picked === null || picked.checked.length === 0) return
      // A picked contact may hold several numbers: ask with each in turn until one is a member.
      let refused: string | null = 'error.not_a_member'
      for (const entry of picked.checked) {
        refused = await askOne(entry, 'picker')
        if (refused !== 'error.not_a_member') break
      }
      await refresh()
      setMessage(refused === null ? t('find.sent') : t(refused))
    } finally {
      setBusy(false)
    }
  }

  async function typeAndAsk(): Promise<void> {
    const number = normalizeMobileOnPhone(typed)
    setMessage(null)
    if (number === null) {
      setMessage(t('error.not_a_member'))
      return
    }
    setBusy(true)
    try {
      const refused = await askOne({ number, savedName: null }, 'typed')
      await refresh()
      setMessage(refused === null ? t('find.sent') : t(refused))
      if (refused === null) setTyped('')
    } finally {
      setBusy(false)
    }
  }

  /** ONE share sheet per tap, the member's own (editable) message — ⛔ the Trust sends anything (Apple 5.1.2(v)). */
  async function invite(): Promise<void> {
    const text = trustName === null ? t('invite.message_no_name') : t('invite.message', { trust_name: trustName })
    try {
      await Share.share({ message: text })
    } catch {
      // the member closed the share sheet
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('find.title') }} />
      {phase.kind === 'matches' ? (
        <YStack flex={1} gap="$3" px="$6" py="$4" bg="$background">
          <H2 accessibilityRole="header">{t('find.matches_heading')}</H2>
          {phase.truncated ? <Text accessibilityLiveRegion="polite">{t('find.checked_limit')}</Text> : null}
          {phase.limited ? (
            <XStack gap="$3" items="center">
              <Text flex={1}>{t('find.limited_access')}</Text>
              <Button
                size="$3"
                accessibilityRole="button"
                onPress={() => void shareMoreContacts().then((ok) => (ok ? check() : undefined))}
              >
                {t('find.add_more')}
              </Button>
            </XStack>
          ) : null}
          {message ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {message}
            </Text>
          ) : null}
          {phase.matched.length === 0 ? (
            <Text>{t('find.no_matches')}</Text>
          ) : (
            <>
              <Input
                value={query}
                onChangeText={setQuery}
                height={44}
                placeholder={t('find.search')}
                accessibilityLabel={t('find.search')}
              />
              <Text color="$colorPress" fontSize="$2">
                {freeSlots > 0 ? t('find.select_hint', { count: freeSlots }) : t('list.full')}
              </Text>
              <YStack flex={1} minH={160}>
                <FlashList
                  data={filterBySavedName(phase.matched, query)}
                  keyExtractor={(e) => e.key}
                  renderItem={({ item }) => {
                    const on = selected.has(item.key)
                    return (
                      <Button
                        chromeless={!on}
                        theme={on ? 'accent' : undefined}
                        justify="flex-start"
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={on ? t('find.selected_a11y', { name: item.savedName }) : t('find.not_selected_a11y', { name: item.savedName })}
                        onPress={() => setSelected((s) => toggleSelection(s, item.key, freeSlots))}
                      >
                        {(on ? '☑  ' : '☐  ') + item.savedName}
                      </Button>
                    )
                  }}
                />
              </YStack>
              <Button
                theme="accent"
                height={56}
                disabled={busy || selected.size === 0}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || selected.size === 0 }}
                onPress={() => void sendSelected(phase.matched)}
              >
                {busy ? <Spinner /> : t('find.send')}
              </Button>
            </>
          )}
          {phase.notMatched.length > 0 ? (
            <YStack gap="$2" maxH={220}>
              <H3 accessibilityRole="header">{t('invite.heading')}</H3>
              <FlashList
                data={phase.notMatched}
                keyExtractor={(e) => e.key}
                renderItem={({ item }) => (
                  <XStack gap="$3" items="center" py="$1">
                    <Text flex={1}>{item.savedName}</Text>
                    <Button size="$2" accessibilityRole="button" accessibilityLabel={t('invite.action_a11y', { name: item.savedName })} onPress={() => void invite()}>
                      {t('invite.action')}
                    </Button>
                  </XStack>
                )}
              />
            </YStack>
          ) : null}
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <YStack gap="$4" px="$6" py="$6" bg="$background">
            <H2 accessibilityRole="header">{t('find.title')}</H2>
            {message ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="assertive">
                {message}
              </Text>
            ) : null}

            {phase.kind === 'note' ? (
              <>
                <Paragraph>{trustName === null ? t('note.find_body_no_name') : t('note.find_body', { trust_name: trustName })}</Paragraph>
                <Paragraph>{t('note.not_kept')}</Paragraph>
                <Button theme="accent" height={56} accessibilityRole="button" onPress={() => void check()}>
                  {t('note.continue')}
                </Button>
                <Button chromeless accessibilityRole="button" onPress={() => router.back()}>
                  {t('note.cancel')}
                </Button>
              </>
            ) : null}

            {phase.kind === 'checking' ? <Spinner accessibilityLabel={t('find.checking')} /> : null}

            {phase.kind === 'fallback' && phase.via === 'picker' ? (
              <Button theme="accent" height={56} disabled={busy} accessibilityRole="button" onPress={() => void pickAndAsk()}>
                {busy ? <Spinner /> : t('action.choose_contact')}
              </Button>
            ) : null}

            {phase.kind === 'fallback' && phase.via === 'typed' ? (
              <YStack gap="$3">
                <Text>{t('type.label')}</Text>
                <Input
                  value={typed}
                  onChangeText={(v) => {
                    setMessage(null)
                    setTyped(v)
                  }}
                  keyboardType="phone-pad"
                  maxLength={20}
                  height={48}
                  accessibilityLabel={t('type.label')}
                />
                <Button theme="accent" height={56} disabled={busy || typed.trim() === ''} accessibilityRole="button" onPress={() => void typeAndAsk()}>
                  {busy ? <Spinner /> : t('type.submit')}
                </Button>
              </YStack>
            ) : null}
          </YStack>
        </ScrollView>
      )}
    </>
  )
}
