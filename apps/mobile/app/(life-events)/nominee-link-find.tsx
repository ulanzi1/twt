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
// Code review 2026-10-24: the note offers an affirmative DECLINE (*"Don't read my contacts"* ⇒ the picker / typed number, ⛔
// permission prompt); a limit / busy refusal and a check that finds nobody ALSO offer that fallback (it is resolved at save and
// ⛔ spends the match counter); iOS limited access offers *share more*; a late match response is dropped when the form
// session it belonged to was cleared (`nomineeLinkSessionEpoch`); the match call goes through `matchContactsForNominee`
// (the ONE place `purpose: 'nominee_link'` is set — pinned by a test). Fix-diff review 2026-10-24: the match call is BOUNDED
// (`withReadTimeout` — a call that never settled kept the in-flight guard shut for good), a response that arrives after the session
// moved on returns the screen to the note, ⛔ the spinner; the matches phase offers *"Not in this list?"* (the nominee may sign
// in on a number the member never saved); the decline and the fallback are SPOKEN.
// Round 3 (2026-10-24): a check that FAILS returns to the note — where *Continue* retries — except a daily / monthly limit
// (the check cannot succeed today ⇒ the fallback) and "not available for your account" (the save would refuse a mark too ⇒ a note
// with no way on); a failed RE-check (iOS *share more*) leaves the matches where they are; the metered call is shared per form
// session (`shareNomineeLinkCheck` — leaving and coming back mid-check, or retrying after the read bound gave up on a request that
// cannot be aborted, does ⛔ spend a second one: the RAW call stays shared until it settles, stores its OWN result in the session,
// and a first `check()` shows what the session already holds before it calls anything); each caller is bounded separately; the
// fallback is spoken ONCE, on the way in, ⛔ whenever a message clears.

import { useEffect, useRef, useState } from 'react'
import { Platform, ScrollView } from 'react-native'

import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { withReadTimeout } from '../../components/known-people/useKnownPeopleQueries'
import { errorCodeOf } from '../../components/nominee-links/useNomineeLinkQueries'
import { applyMatches, fallbackFor, filterBySavedName, type ContactEntry } from '../../lib/known-people'
import { pickOneContact, readContactsForMatching, shareMoreContacts } from '../../lib/known-people-contacts'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { matchContactsForNominee } from '../../lib/nominee-links-api'
import {
  findRefusalCopyKey,
  handNomineeLinkPick,
  nomineeLinkSessionEpoch,
  nomineeLinkSessionMatches,
  setNomineeLinkSessionMatches,
  shareNomineeLinkCheck,
  type FormMark,
  type NomineeRank,
} from '../../lib/nominee-links'
import { normalizeMobileOnPhone } from '../../lib/phone-normalize'
import { configuredTrustName } from '../../lib/trust-name'

type MatchesPhase = { kind: 'matches'; matched: readonly ContactEntry[]; truncated: boolean; limited: boolean }

type Phase =
  /** `blocked` — the caller gate refused ("not available for your account"): the note offers ⛔ a way on (a mark would be refused at save). */
  | { kind: 'note'; blocked?: true }
  | { kind: 'checking' }
  | MatchesPhase
  /** `announce` — the screen CHANGED to this with no message of its own (the decline, *Not in this list?*): say what appeared, once. */
  | { kind: 'fallback'; via: 'picker' | 'typed'; announce: boolean }
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
  // A sequence, so a REPEATED identical message is spoken again (`AnnouncedText` is keyed by it).
  const [message, setMessage] = useState<{ text: string; seq: number } | null>(null)
  const seq = useRef(0)
  const say = (text: string | null): void => setMessage(text === null ? null : { text, seq: (seq.current += 1) })
  const checking = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const trustName = configuredTrustName()

  const matchesCount = (count: number): string => (count === 1 ? t('find.matches_count_one') : t('find.matches_count', { count }))

  useAnnounceOnChange(
    phase.kind === 'checking'
      ? t('find.checking')
      : phase.kind === 'fallback' && phase.announce
        ? // The decline and *Not in this list?* change the screen in silence otherwise — spoken once, ⛔ whenever a message clears.
          t(phase.via === 'picker' ? 'find.choose_contact' : 'find.type_number')
        : phase.kind === 'matches'
        ? [
            phase.matched.length === 0 ? t('find.no_matches') : matchesCount(phase.matched.length),
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

  /**
   * `held` — a RE-check from the matches on screen (iOS *share more*): a failure leaves them where they are and says why.
   * A first check that fails returns to the note (*Continue* retries), except a limit (the fallback) and the caller gate (no way on).
   */
  async function check(held?: MatchesPhase): Promise<void> {
    // ONE check at a time: a second tap before the screen re-renders would spend a second of the shared 3-a-day budget.
    if (checking.current) return
    // Matches the session already holds (a check that settled while the member was away, or after a bound that gave up on it) are
    // shown at once — ⛔ a second metered call for numbers it has answered. A RE-check (`held`) is the member asking for MORE.
    if (held === undefined) {
      const have = nomineeLinkSessionMatches()
      if (have !== null) {
        say(null)
        setQuery('')
        setPhase({ kind: 'matches', ...have })
        return
      }
    }
    checking.current = true
    const epoch = nomineeLinkSessionEpoch()
    setPhase({ kind: 'checking' })
    say(null)
    setQuery('')
    try {
      const read = await readContactsForMatching()
      if (!mounted.current) return
      if (read.kind !== 'read') {
        setPhase(held ?? { kind: 'fallback', via: fallbackFor(Platform.OS), announce: false })
        say(t(read.kind === 'unavailable' ? 'find.unavailable' : 'find.permission_denied'))
        return
      }
      const { checked, truncated } = read.prepared
      const numbers = checked.map((c) => c.number)
      const matchesOf = (positions: readonly number[]) => ({ matched: applyMatches(checked, positions).matched, truncated, limited: read.access === 'limited' })
      // The RAW call is SHARED (a retry after the bound, or a screen opened again mid-check, attaches to it — ⛔ a second charge)
      // and stores its OWN result in the session when it lands, if the session it was made for is still the form's; each CALLER is
      // BOUNDED separately — a call that never settles fails at the read bound (the generic message; *Continue* tries again).
      const call = () =>
        matchContactsForNominee(numbers).then((r) => {
          const made = matchesOf(r.matched)
          if (epoch === nomineeLinkSessionEpoch()) setNomineeLinkSessionMatches(made) // held for the form session ONLY (memory) — the other rank reuses it
          return made
        })
      const result = numbers.length === 0 ? matchesOf([]) : await withReadTimeout(undefined, () => shareNomineeLinkCheck(numbers.join(','), call))
      // The form (or the account) this check was made for is gone — ⛔ refill a session it has left, and ⛔ leave the screen on the spinner.
      if (epoch !== nomineeLinkSessionEpoch()) {
        if (mounted.current) setPhase({ kind: 'note' })
        return
      }
      if (numbers.length === 0) setNomineeLinkSessionMatches(result)
      if (mounted.current) setPhase({ kind: 'matches', ...result })
    } catch (err) {
      if (!mounted.current) return
      const code = errorCodeOf(err)
      if (held) {
        setPhase(held)
      } else if (code === 'known_people.not_available') {
        // The caller gate: the save would refuse a mark too — the note stays, with ⛔ Continue and ⛔ decline (no way on).
        setPhase({ kind: 'note', blocked: true })
      } else if (code === 'known_people.daily_limit' || code === 'known_people.monthly_limit') {
        // The check cannot succeed today: the picker / typed number stays open (resolved at SAVE, spending ⛔ the match counter).
        setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS), announce: false })
      } else {
        // Busy / a failed or timed-out call: the note, where *Continue* tries again and *Don't read my contacts* is still one tap away.
        setPhase({ kind: 'note' })
      }
      say(t(findRefusalCopyKey(code)))
    } finally {
      checking.current = false
    }
  }

  async function pick(): Promise<void> {
    setBusy(true)
    say(null)
    try {
      const picked = await pickOneContact()
      if (picked === null || !mounted.current) return
      if (picked.checked.length === 0) {
        say(t('find.no_mobile'))
        return
      }
      if (picked.checked.length === 1) {
        const only = picked.checked[0]!
        choose({ kind: 'new', mobile: only.number, foundBy: 'picker', savedName: only.savedName === only.number ? null : only.savedName })
        return
      }
      setPhase({ kind: 'numbers', numbers: picked.checked })
    } catch {
      if (mounted.current) say(t('error.generic'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function submitTyped(): void {
    const number = normalizeMobileOnPhone(typed)
    if (number === null) {
      say(t('find.bad_number'))
      return
    }
    choose({ kind: 'new', mobile: number, foundBy: 'typed', savedName: null })
  }

  const shown = phase.kind === 'matches' ? filterBySavedName(phase.matched, query) : []

  /** The picker (iOS) / typed number (Android) — resolved at SAVE, ⛔ the match counter. A render FUNCTION, ⛔ a nested component. */
  function fallbackControls(via: 'picker' | 'typed'): React.ReactElement {
    return via === 'picker' ? (
      <Button height={56} disabled={busy} accessibilityRole="button" accessibilityLabel={t('find.choose_contact')} accessibilityState={{ disabled: busy, busy }} onPress={() => void pick()}>
        {t('find.choose_contact')}
      </Button>
    ) : (
      <>
        <Input
          value={typed}
          onChangeText={(v) => {
            setTyped(v)
            say(null) // a stale "not a mobile number" must not outlive the edit that answers it
          }}
          keyboardType="phone-pad"
          placeholder={t('find.type_number')}
          height={48}
          accessibilityLabel={t('find.type_number')}
        />
        <Button height={56} accessibilityRole="button" accessibilityLabel={t('find.use_number')} onPress={submitTyped}>
          {t('find.use_number')}
        </Button>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: t('find.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$3" px="$6" py="$6" bg="$background">
          {phase.kind === 'note' ? (
            <>
              <H2 accessibilityRole="header">{t('note.title')}</H2>
              {/* "Not available for your account": the note's body describes a check that cannot be made — only the reason is shown. */}
              {phase.blocked ? null : <Paragraph accessibilityRole="text">{trustName ? t('note.body', { trust_name: trustName }) : t('note.body_no_name')}</Paragraph>}
              {phase.blocked ? null : (
                <>
                  <Button theme="accent" height={56} accessibilityRole="button" accessibilityLabel={t('note.continue')} onPress={() => void check()}>
                    {t('note.continue')}
                  </Button>
                  {/* The affirmative DECLINE: ⛔ the contacts are read, ⛔ the system prompt — the member picks or types a number. */}
                  <Button
                    height={56}
                    accessibilityRole="button"
                    accessibilityLabel={t('note.decline')}
                    onPress={() => {
                      say(null)
                      setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS), announce: true })
                    }}
                  >
                    {t('note.decline')}
                  </Button>
                </>
              )}
            </>
          ) : null}

          {phase.kind === 'checking' ? <Spinner accessibilityLabel={t('find.checking')} /> : null}

          {phase.kind === 'matches' ? (
            <>
              <H2 accessibilityRole="header">{t('find.matches_heading')}</H2>
              {phase.truncated ? <Text>{t('find.checked_limit')}</Text> : null}
              {phase.limited ? (
                <XStack gap="$2" items="center" flexWrap="wrap">
                  <Text flex={1}>{t('find.limited_access')}</Text>
                  <Button
                    height={48}
                    accessibilityRole="button"
                    accessibilityLabel={t('find.add_more')}
                    onPress={() => void shareMoreContacts().then((ok) => (ok ? check(phase) : undefined)).catch(() => undefined)}
                  >
                    {t('find.add_more')}
                  </Button>
                </XStack>
              ) : null}
              {/* ⭐ The empty states render OUTSIDE the list ([[project_fabric_flatlist_empty_populated_crash]]). */}
              {phase.matched.length === 0 ? (
                <>
                  <Text testID="nominee-find-no-matches">{t('find.no_matches')}</Text>
                  {/* Nobody found: the picker / typed number is still open — ⛔ a dead end. */}
                  {fallbackControls(fallbackFor(Platform.OS))}
                </>
              ) : (
                <>
                  <Text>{t('find.pick_hint')}</Text>
                  {/* The nominee may sign in on a number the member never saved (a family phone) — the other way is ⛔ closed to them. */}
                  <Button
                    chromeless
                    height={48}
                    accessibilityRole="button"
                    accessibilityLabel={t('find.not_listed')}
                    onPress={() => {
                      say(null)
                      setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS), announce: true })
                    }}
                  >
                    {t('find.not_listed')}
                  </Button>
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

          {phase.kind === 'fallback' ? fallbackControls(phase.via) : null}

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
          {message ? <AnnouncedText key={message.seq} text={message.text} kind="error" /> : null}
        </YStack>
      </ScrollView>
    </>
  )
}
