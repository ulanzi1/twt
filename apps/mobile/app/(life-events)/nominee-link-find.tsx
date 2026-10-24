// "Is this nominee a TWT member? Find them in your contacts" (Story 6.36e, Task 5; AC5; `2026-10-24-397` NE3; Apple 5.1.1 /
// 5.1.2, Google Play User Data — the prominent disclosure, IN the app, BEFORE the system prompt).
//
// The flow: the NOTE — ITS OWN purpose (*"to check whether your nominee is a TWT member"* — ⛔ 6.36b's "find your
// colleagues", which names a different one; V12) → *"Continue"* → the system permission prompt →
//   · granted (or iOS 18 limited): the numbers are read, normalised ON THE PHONE, de-duplicated, ≤ 1,000, and sent ONCE with
//     `purpose: 'nominee_link'` — ⭐ ONCE PER FORM SESSION: the matches are held in memory (`lib/nominee-links.ts`) and serve
//     BOTH ranks (the shared 3-a-day budget, NE3); the member taps ONE match (shown under the name THEY saved) and goes back;
//   · denied / unavailable: iOS *"Choose a contact"* (the system picker — ⛔ permission); Android *"Type their mobile
//     number"*. A picked or typed number is ⛔ checked here — the SAVE resolves it (metered — NE5).
// ⛔ The contacts are stored anywhere; ⛔ an invite list of non-matches. Every state renders OUTSIDE any list; each refusal
// its own plain message. ⭐ The pick is HANDED to the form (`handNomineeLinkPick`), which applies it when it regains focus.

import { useEffect, useRef, useState } from 'react'
import { Platform, ScrollView } from 'react-native'

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { errorCodeOf } from '../../components/nominee-links/useNomineeLinkQueries'
import { applyMatches, fallbackFor, filterBySavedName, type ContactEntry } from '../../lib/known-people'
import { pickOneContact, readContactsForMatching } from '../../lib/known-people-contacts'
import { knownPeopleApi } from '../../lib/known-people-api'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import {
  findRefusalCopyKey,
  handNomineeLinkPick,
  nomineeLinkSessionMatches,
  setNomineeLinkSessionMatches,
  type FormMark,
  type NomineeRank,
} from '../../lib/nominee-links'
import { normalizeMobileOnPhone } from '../../lib/phone-normalize'
import { configuredTrustName } from '../../lib/trust-name'

type Phase =
  | { kind: 'note' }
  | { kind: 'checking' }
  | { kind: 'matches'; matched: readonly ContactEntry[]; truncated: boolean; limited: boolean }
  | { kind: 'fallback'; via: 'picker' | 'typed' }
  | { kind: 'numbers'; numbers: readonly ContactEntry[] }

export default function NomineeLinkFindScreen() {
  const t = useNomineeLinkT()
  const router = useRouter()
  const params = useLocalSearchParams<{ rank?: string }>()
  const rank: NomineeRank = params.rank === '2' ? 2 : 1
  // ⭐ One match per form session (NE3): matches already made for THIS form are shown at once — ⛔ a second request.
  const [phase, setPhase] = useState<Phase>(() => {
    const held = nomineeLinkSessionMatches()
    return held ? { kind: 'matches', ...held } : { kind: 'note' }
  })
  const [query, setQuery] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const trustName = configuredTrustName()

  useAnnounceOnChange(
    phase.kind === 'checking'
      ? t('find.checking')
      : phase.kind === 'matches'
        ? [
            phase.matched.length === 0 ? t('find.no_matches') : t('find.matches_count', { count: phase.matched.length }),
            phase.truncated ? t('find.checked_limit') : null,
            phase.limited ? t('find.limited_access') : null,
          ]
            .filter((line): line is string => line !== null)
            .join(' ')
        : null,
  )

  /** The pick goes back to the form (it applies it on focus) — and this screen goes back. */
  function choose(mark: FormMark): void {
    handNomineeLinkPick(rank, mark)
    router.back()
  }

  async function check(): Promise<void> {
    setPhase({ kind: 'checking' })
    setMessage(null)
    setQuery('')
    try {
      const read = await readContactsForMatching()
      if (!mounted.current) return
      if (read.kind !== 'read') {
        setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS) })
        setMessage(t('find.permission_denied'))
        return
      }
      const { checked, truncated } = read.prepared
      const positions = checked.length === 0 ? [] : (await knownPeopleApi.contactMatches(checked.map((c) => c.number), 'nominee_link')).matched
      const held = { matched: applyMatches(checked, positions).matched, truncated, limited: read.access === 'limited' }
      // Held for the form session ONLY (memory) — the other rank reuses it.
      setNomineeLinkSessionMatches(held)
      if (mounted.current) setPhase({ kind: 'matches', ...held })
    } catch (err) {
      if (!mounted.current) return
      setPhase({ kind: 'note' })
      setMessage(t(findRefusalCopyKey(errorCodeOf(err))))
    }
  }

  async function pick(): Promise<void> {
    setBusy(true)
    setMessage(null)
    try {
      const picked = await pickOneContact()
      if (picked === null || !mounted.current) return
      if (picked.checked.length === 0) {
        setMessage(t('find.no_mobile'))
        return
      }
      if (picked.checked.length === 1) {
        const only = picked.checked[0]!
        choose({ kind: 'new', mobile: only.number, foundBy: 'picker', savedName: only.savedName === only.number ? null : only.savedName })
        return
      }
      setPhase({ kind: 'numbers', numbers: picked.checked })
    } catch {
      if (mounted.current) setMessage(t('error.generic'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function submitTyped(): void {
    const number = normalizeMobileOnPhone(typed)
    if (number === null) {
      setMessage(t('find.bad_number'))
      return
    }
    choose({ kind: 'new', mobile: number, foundBy: 'typed', savedName: null })
  }

  const shown = phase.kind === 'matches' ? filterBySavedName(phase.matched, query) : []

  return (
    <>
      <Stack.Screen options={{ title: t('find.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$3" px="$6" py="$6" bg="$background">
          {phase.kind === 'note' ? (
            <>
              <H2 accessibilityRole="header">{t('note.title')}</H2>
              <Paragraph accessibilityRole="text">{trustName ? t('note.body', { trust_name: trustName }) : t('note.body_no_name')}</Paragraph>
              <Button theme="accent" height={56} accessibilityRole="button" accessibilityLabel={t('note.continue')} onPress={() => void check()}>
                {t('note.continue')}
              </Button>
            </>
          ) : null}

          {phase.kind === 'checking' ? <Spinner accessibilityLabel={t('find.checking')} /> : null}

          {phase.kind === 'matches' ? (
            <>
              <H2 accessibilityRole="header">{t('find.matches_heading')}</H2>
              {phase.truncated ? <Text>{t('find.checked_limit')}</Text> : null}
              {phase.limited ? <Text>{t('find.limited_access')}</Text> : null}
              {/* ⭐ The empty states render OUTSIDE the list ([[project_fabric_flatlist_empty_populated_crash]]). */}
              {phase.matched.length === 0 ? (
                <Text testID="nominee-find-no-matches">{t('find.no_matches')}</Text>
              ) : (
                <>
                  <Text>{t('find.pick_hint')}</Text>
                  <Input value={query} onChangeText={setQuery} placeholder={t('find.search')} height={48} accessibilityLabel={t('find.search')} />
                  {shown.length === 0 ? <Text>{t('find.no_search_matches')}</Text> : null}
                  <YStack gap="$2" accessibilityRole="list">
                    {shown.map((m) => (
                      <Button
                        key={m.key}
                        height={48}
                        accessibilityRole="button"
                        accessibilityLabel={t('find.pick_a11y', { name: m.savedName })}
                        onPress={() => choose({ kind: 'new', mobile: m.number, foundBy: 'contacts', savedName: m.savedName === m.number ? null : m.savedName })}
                      >
                        {m.savedName}
                      </Button>
                    ))}
                  </YStack>
                </>
              )}
            </>
          ) : null}

          {phase.kind === 'fallback' && phase.via === 'picker' ? (
            <Button height={56} disabled={busy} accessibilityRole="button" accessibilityLabel={t('find.choose_contact')} accessibilityState={{ disabled: busy, busy }} onPress={() => void pick()}>
              {t('find.choose_contact')}
            </Button>
          ) : null}

          {phase.kind === 'fallback' && phase.via === 'typed' ? (
            <>
              <Input value={typed} onChangeText={setTyped} keyboardType="phone-pad" placeholder={t('find.type_number')} height={48} accessibilityLabel={t('find.type_number')} />
              <Button height={56} accessibilityRole="button" accessibilityLabel={t('find.use_number')} onPress={submitTyped}>
                {t('find.use_number')}
              </Button>
            </>
          ) : null}

          {phase.kind === 'numbers' ? (
            <>
              <Text accessibilityRole="header">{t('find.choose_number')}</Text>
              {phase.numbers.map((n) => (
                <Button
                  key={n.key}
                  height={48}
                  accessibilityRole="button"
                  accessibilityLabel={n.number}
                  onPress={() => choose({ kind: 'new', mobile: n.number, foundBy: 'picker', savedName: n.savedName === n.number ? null : n.savedName })}
                >
                  {n.number}
                </Button>
              ))}
            </>
          ) : null}

          {/* SHOWN and SPOKEN (a bare `alert` role is ⛔ reliably announced on iOS — `announce.tsx`). */}
          {message ? <AnnouncedText key={message} text={message} kind="error" /> : null}
        </YStack>
      </ScrollView>
    </>
  )
}
