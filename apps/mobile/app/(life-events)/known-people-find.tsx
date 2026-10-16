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
// ⭐ Every outcome is SHOWN AND SPOKEN (review round 2, P2; checklist 13 (d)): the messages through `AnnouncedText` (a bare
// `accessibilityRole="alert"` is ⛔ reliably announced on iOS — `announce.tsx`), the phase changes through
// `useAnnounceOnChange`, and the contacts path's success — which goes BACK at once — is handed to the people screen
// (`handKnownPeopleNotice`), which shows and speaks it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'

import { FlashList } from '@shopify/flash-list'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, H3, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { errorCodeOf, useKnownPeopleWrites, useMyKnownPeopleQuery } from '../../components/known-people/useKnownPeopleQueries'
import { AnnouncedText, useAnnounceOnChange } from '../../components/peer-request/announce'
import { applyMatches, fallbackFor, filterBySavedName, isDenied, refusalCopyKey, toggleSelection, type ContactEntry } from '../../lib/known-people'
import { pickOneContact, readContactsForMatching, shareMoreContacts } from '../../lib/known-people-contacts'
import { knownPeopleApi } from '../../lib/known-people-api'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { handKnownPeopleNotice } from '../../lib/known-people-notice'
import { saveSavedNameIfCurrent, savedNamesGeneration } from '../../lib/known-people-saved-names'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { shareInvite } from '../../lib/invite-share'
import { normalizeMobileOnPhone } from '../../lib/phone-normalize'
import { useSession } from '../../lib/session-context'
import { configuredTrustName } from '../../lib/trust-name'

type Phase =
  | { kind: 'note' }
  | { kind: 'checking' }
  | { kind: 'matches'; matched: ContactEntry[]; notMatched: ContactEntry[]; truncated: boolean; limited: boolean }
  | { kind: 'fallback'; via: 'picker' | 'typed' }

/**
 * One ask's outcome: `asked` (a new request, or one already open), `listed` (a link that was already there, `accepted` or
 * `unavailable` — ⛔ *"Asked."*: nothing was asked; `2026-10-15-333` call 2 (b) now answers it 200, fix-diff review round
 * 1), or `refused` with its copy key (a link that ENDED while the reply was in flight — `not_accepted` — reads "changed").
 * ⭐ The success words are true for EVERY person asked — one in renewal grace included, whose request waits unseen until
 * they renew (`-333` call 2): *"Your request is waiting for them"* (`2026-10-15-337` — ⛔ *"They will see your request"*).
 */
type AskOutcome = { readonly kind: 'asked' } | { readonly kind: 'listed' } | { readonly kind: 'refused'; readonly key: string }

/** Refusals after which every further ask in a send is a sure refusal — the send stops (fix-diff review rounds 3–4). */
const SEND_STOPPERS: ReadonlySet<string> = new Set(['error.limit_reached', 'error.daily_limit', 'error.not_available'])

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
  // `seq` remounts the line, so the SAME words twice in a row are spoken twice (the people screen's rule).
  const [message, setMessage] = useState<{ text: string; kind: 'status' | 'error'; seq: number } | null>(null)
  const messageSeq = useRef(0)
  const say = (text: string, kind: 'status' | 'error') => setMessage({ text, kind, seq: (messageSeq.current += 1) })

  const trustName = configuredTrustName()
  // ⭐ `null` while the namer's list is loading, failed or denied — ⛔ 0, which said *"You have named three people"* and
  // refused every tick (review round 2, P8).
  const freeSlots = mine.data && !isDenied(mine.data) ? mine.data.freeSlots : null
  const memberId = session?.memberId
  // ⛔ Navigating or handing a notice from a screen that has gone: `router.back()` would pop whatever is on top NOW (the
  // people screen, or the sign-in stack) — fix-diff review round 1. Set on mount (a StrictMode / Fast Refresh remount
  // must set it back), cleared on unmount.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // A phase change has ⛔ live region — it is announced on both platforms (`announce.tsx`). ⭐ ONE announcement for the
  // matches phase, with its two notes folded in: on iOS each `announceForAccessibility` interrupts the one before, so
  // three in one commit left only the last heard (fix-diff review round 1).
  // ⭐ The slots' state (the free slots, or the namer's list failed or refused) is folded in too, and rendered as plain
  // text: as its own announcing line it mounted in the SAME commit as the phase and was cut off (fix-diff review round 2).
  /** The slots hint for a namer's-list answer (a refusal reads "not available"); `ticked` — more ticked than it allows. */
  const slotsHintFor = (data: typeof mine.data, ticked = 0): string => {
    if (data === undefined || isDenied(data)) return t('error.not_available')
    const free = (data as { freeSlots: number }).freeSlots
    if (free > 0 && ticked > free) return t('find.too_many', { count: free })
    return free > 0 ? t('find.select_hint', { count: free }) : t('list.full')
  }
  /** The slots' words for the namer's-list query as it stands (`null` while it first loads). */
  const slotsTextFor = (q: typeof mine): string | null =>
    q.data !== undefined
      ? // a refusal is spoken ALONE — the screen shows it without a Retry (round 7)
        [slotsHintFor(q.data), q.isError && !isDenied(q.data) ? t('error.load') : null].filter((line): line is string => line !== null).join(' ')
      : q.isError
        ? t('error.load')
        : null
  // ⭐ The slots' state is spoken ONCE, inside the phase's own announcement — as it stood when the matches appeared, or,
  // if the list was still loading then, as it FIRST settles (`slotsPending` — round 6: a load that failed or was refused
  // after entry was otherwise never spoken) — and ⛔ re-read after that: a background reload that changed it (after a
  // send, a refusal) re-announced the whole phase and cut off the outcome just spoken, and a Retry's success did the same
  // to the hint it brought (fix-diff reviews rounds 2–6). Later changes are SHOWN; a Retry speaks its own outcome.
  const latestMine = useRef(mine)
  latestMine.current = mine
  const [slotsAtEntry, setSlotsAtEntry] = useState<string | null>(null)
  const slotsPending = useRef(false)
  const settledSlots = slotsTextFor(mine)
  useEffect(() => {
    if (phase.kind !== 'matches' || !slotsPending.current || settledSlots === null) return
    slotsPending.current = false
    // The slots' words ALONE — ⛔ the whole phase again (its count and notes were spoken at entry, and something else may
    // have been said since, e.g. an empty search — round 7).
    if (mounted.current) AccessibilityInfo.announceForAccessibility(settledSlots)
  }, [phase, settledSlots])
  // A Retry of THIS screen is running: its row stays, busy — a refetch of a list with ⛔ data resets TanStack to `pending`
  // (⛔ `isError`), which unmounted the Retry into a spinner and took the screen reader's focus (round 6).
  const [retrying, setRetrying] = useState(false)
  const latestSelected = useRef(selected)
  latestSelected.current = selected
  const latestBusy = useRef(busy)
  latestBusy.current = busy
  const latestMessage = useRef(message)
  latestMessage.current = message
  const slotsPhaseRef = useRef(false)
  slotsPhaseRef.current = phase.kind === 'matches'
  // Bumped by every `check()` — a Retry that settles after a re-check (that may already have reached a NEW matches phase)
  // speaks ⛔ over it (round 7).
  const checkSeq = useRef(0)
  useAnnounceOnChange(
    phase.kind === 'checking'
      ? t('find.checking')
      : phase.kind === 'matches'
        ? [
            phase.matched.length === 0 ? t('find.no_matches') : t('find.matches_count', { count: phase.matched.length }),
            phase.truncated ? t('find.checked_limit') : null,
            phase.limited ? t('find.limited_access') : null,
            phase.matched.length > 0 ? slotsAtEntry : null,
          ]
            .filter((line): line is string => line !== null)
            .join(' ')
        : null,
  )

  /**
   * A Retry of the namer's list speaks its OWN outcome — on a screen still here, for the account still signed in, and ⛔
   * over anything said since it was pressed (an outcome line, a re-check's "Checking…" — round 6), ⛔ during a send. A
   * success says what the screen now shows (the hint, or "more are ticked than you can ask").
   */
  function retrySlots(): void {
    const since = savedNamesGeneration()
    const seqAtPress = messageSeq.current
    const checkAtPress = checkSeq.current
    setRetrying(true)
    void mine
      .refetch()
      .then((r) => {
        if (!mounted.current || savedNamesGeneration() !== since) return
        if (messageSeq.current !== seqAtPress || checkSeq.current !== checkAtPress || latestBusy.current || !slotsPhaseRef.current) return
        if (r.isError) {
          AccessibilityInfo.announceForAccessibility(t('error.load'))
          return
        }
        if (r.data === undefined) return
        // More ticked than the slots now allow, with ⛔ outcome line: the over-selection line mounts and speaks it — ⛔
        // twice (round 7).
        const free = isDenied(r.data) ? null : (r.data as { freeSlots: number }).freeSlots
        if (free !== null && latestSelected.current.size > free && latestMessage.current === null) return
        AccessibilityInfo.announceForAccessibility(slotsHintFor(r.data, latestSelected.current.size))
      })
      .finally(() => {
        if (mounted.current) setRetrying(false)
      })
  }

  /**
   * Ask ONE number; keep the SAVED name on the phone. ⛔ A number is ever kept as a "name" (a typed ask, or a contact saved
   * without a name, keeps none — its row shows the neutral fallback). ⭐ The name is saved ONLY if the saved names have ⛔
   * been cleared since the ask was sent (`savedNamesGeneration` — a sign-out or a rejected refresh bumps it): an ask that
   * lands after the screen has gone (an ordinary Back) still keeps its name; one that lands after a sign-out does ⛔
   * (review round 2, P12, and its fix-diff regression).
   */
  async function askOne(
    entry: { number: string; savedName: string | null },
    foundBy: 'contacts' | 'picker' | 'typed',
    since: number = savedNamesGeneration(),
  ): Promise<AskOutcome> {
    try {
      const { link } = await ask.mutateAsync({ mobile: entry.number, foundBy, idempotencyKey: newIdempotencyKey() })
      const name = entry.savedName
      if (link.label === 'asked' && memberId && name !== null && name !== entry.number) saveSavedNameIfCurrent(since, memberId, link.linkId, name)
      if (link.label === 'asked') return { kind: 'asked' }
      if (link.label === 'accepted' || link.label === 'unavailable') return { kind: 'listed' }
      return { kind: 'refused', key: 'error.changed' }
    } catch (err) {
      return { kind: 'refused', key: refusalCopyKey(errorCodeOf(err)) }
    }
  }

  /** The words for one ask's outcome. */
  const outcomeText = (o: AskOutcome) => (o.kind === 'asked' ? t('find.sent') : o.kind === 'listed' ? t('find.already_listed') : t(o.key))

  async function check(): Promise<void> {
    setPhase({ kind: 'checking' })
    setMessage(null)
    setQuery('') // a re-check starts unfiltered (⛔ an empty-search line announced in the same commit as the phase)
    checkSeq.current += 1
    try {
      const read = await readContactsForMatching()
      if (read.kind !== 'read') {
        setPhase({ kind: 'fallback', via: fallbackFor(Platform.OS) })
        say(t('find.permission_denied'), 'status') // denied OR unavailable — either way the fallback is offered
        return
      }
      const { checked, truncated } = read.prepared
      const positions = checked.length === 0 ? [] : (await knownPeopleApi.contactMatches(checked.map((c) => c.number))).matched
      const { matched, notMatched } = applyMatches(checked, positions)
      setSelected(new Set())
      const atEntry = slotsTextFor(latestMine.current)
      slotsPending.current = atEntry === null // still loading — spoken when it first settles
      setSlotsAtEntry(atEntry)
      setPhase({ kind: 'matches', matched, notMatched, truncated, limited: read.access === 'limited' })
    } catch (err) {
      setPhase({ kind: 'note' })
      say(t(refusalCopyKey(errorCodeOf(err))), 'error')
    }
  }

  async function sendSelected(matched: readonly ContactEntry[]): Promise<void> {
    setBusy(true)
    setMessage(null)
    const failures: string[] = []
    const done = new Set<string>()
    let askedCount = 0
    let listedCount = 0
    // ONE generation for the whole send: a sign-out (or a rejected refresh) mid-send stops it, and ⛔ later ask saves a
    // name under the generation it would otherwise capture after the clear (fix-diff review round 2).
    const since = savedNamesGeneration()
    let stopped = false
    for (const entry of matched.filter((m) => selected.has(m.key))) {
      // The member left (Back) or the account changed: ⛔ more asks spent on outcomes nobody will see.
      if (!mounted.current || savedNamesGeneration() !== since) break
      const outcome = await askOne(entry, 'contacts', since)
      if (outcome.kind === 'refused') {
        failures.push(outcome.key)
        // The slots are full (a stale `freeSlots` let more be ticked), today's asks are spent, or the caller lost access:
        // every further ask is a sure refusal — ⛔ spent (fix-diff review rounds 3–4).
        if (SEND_STOPPERS.has(outcome.key)) {
          stopped = true
          break
        }
      } else {
        done.add(entry.key)
        if (outcome.kind === 'asked') askedCount += 1
        else listedCount += 1
      }
    }
    // The lists reload in the background — the outcome is ⛔ held behind it (fix-diff review round 2).
    void refresh().catch(() => undefined)
    // ⛔ Setting state on a screen that has gone. ⛔ Navigating or handing a notice for an account that has changed — but a
    // screen still mounted is ⛔ left busy for ever (fix-diff review round 3).
    if (!mounted.current) return
    setBusy(false)
    if (savedNamesGeneration() !== since) return
    // Defensive — ⛔ reachable today (`check()` resets the ticks): ⛔ an "Asked." for nothing (fix-diff review round 3).
    if (askedCount + listedCount + failures.length === 0) return
    if (failures.length === 0 && listedCount === 0) {
      // ⭐ Handed to the people screen, which shows and speaks it on focus — set here, it vanished with this screen (P2).
      // The ticks go first: a reload landing during the pop would otherwise announce "more ticked than slots" (round 4).
      setSelected(new Set())
      handKnownPeopleNotice(t('find.sent'))
      router.back()
      return
    }
    // The ones already asked (or already on the list) are UNTICKED — sending again would spend asks on them (P8); after a
    // STOP every untried tick goes too (they cannot be asked now — and a reload's "more ticked than slots" line would
    // otherwise cut off this outcome on iOS — round 4).
    setSelected((s) => (stopped ? new Set() : new Set([...s].filter((key) => !done.has(key)))))
    // "Some … already on your list" beside an "Asked." — ⛔ "nothing new was asked", which read as the whole send (round 7)
    const lines = [
      ...(askedCount > 0 ? [t('find.sent')] : []),
      ...(listedCount > 0 ? [askedCount > 0 ? t('find.some_listed') : t('find.already_listed')] : []),
      ...[...new Set(failures)].map((k) => t(k)),
    ]
    say(lines.join(' '), failures.length > 0 ? 'error' : 'status')
  }

  async function pickAndAsk(): Promise<void> {
    setBusy(true)
    setMessage(null)
    // ONE generation, captured BEFORE the picker opens — a sign-out while it is open must stop this ask (round 4).
    const since = savedNamesGeneration()
    try {
      let picked: Awaited<ReturnType<typeof pickOneContact>>
      try {
        picked = await pickOneContact()
      } catch {
        if (mounted.current && savedNamesGeneration() === since) say(t('error.generic'), 'error') // ⛔ a silent tap (round 3)
        return
      }
      if (picked === null) return // the member closed the picker
      if (!mounted.current || savedNamesGeneration() !== since) return // the account changed while the picker was open (round 5)
      if (picked.checked.length === 0) {
        say(t('find.no_mobile'), 'error') // ⛔ a silent tap (review round 2, P10)
        return
      }
      // A picked contact may hold several numbers: ask with each in turn until one is a member — under ONE saved-names
      // generation, stopping on Back or an account change (sendSelected's rules — fix-diff review round 3).
      let outcome: AskOutcome = { kind: 'refused', key: 'error.not_a_member' }
      for (const entry of picked.checked) {
        if (!mounted.current || savedNamesGeneration() !== since) return
        outcome = await askOne(entry, 'picker', since)
        if (!(outcome.kind === 'refused' && outcome.key === 'error.not_a_member')) break
      }
      void refresh().catch(() => undefined)
      if (!mounted.current || savedNamesGeneration() !== since) return
      say(outcomeText(outcome), outcome.kind === 'refused' ? 'error' : 'status')
    } finally {
      setBusy(false)
    }
  }

  async function typeAndAsk(): Promise<void> {
    const number = normalizeMobileOnPhone(typed)
    setMessage(null)
    if (number === null) {
      say(t('error.not_a_member'), 'error')
      return
    }
    setBusy(true)
    const since = savedNamesGeneration()
    try {
      const outcome = await askOne({ number, savedName: null }, 'typed', since)
      void refresh().catch(() => undefined)
      // The other two paths' rule: ⛔ an outcome spoken on a gone screen, or for an account that has changed (round 4).
      if (!mounted.current || savedNamesGeneration() !== since) return
      say(outcomeText(outcome), outcome.kind === 'refused' ? 'error' : 'status')
      if (outcome.kind !== 'refused') setTyped('')
    } finally {
      setBusy(false)
    }
  }

  /** ONE share sheet per tap, the member's own (editable) message — ⛔ the Trust sends anything (Apple 5.1.2(v)). ⭐ The
   *  ONE invite helper (Story 6.36c RV5 — the home card shares it). */
  async function invite(): Promise<void> {
    await shareInvite(t, trustName)
  }

  const shownMatches = phase.kind === 'matches' ? filterBySavedName(phase.matched, query) : []
  const listExtra = useMemo(() => ({ selected, freeSlots, busy }), [selected, freeSlots, busy])

  // The namer's list failed (first load or a reload): the line, and a Retry that STAYS while it runs (busy — ⛔ a spinner
  // that took the screen reader's focus away; round 5) and speaks its own outcome.
  const slotsErrorRow = (
    <XStack gap="$3" items="center">
      <Text flex={1} color="#C0392B">
        {t('error.load')}
      </Text>
      <Button
        size="$3"
        disabled={retrying || mine.isFetching}
        accessibilityRole="button"
        accessibilityState={{ disabled: retrying || mine.isFetching, busy: retrying || mine.isFetching }}
        onPress={retrySlots}
      >
        {t('retry')}
      </Button>
    </XStack>
  )

  return (
    <>
      <Stack.Screen options={{ title: t('find.title') }} />
      {phase.kind === 'matches' ? (
        <YStack flex={1} gap="$3" px="$6" py="$4" bg="$background">
          <H2 accessibilityRole="header">{t('find.matches_heading')}</H2>
          {/* Both notes are SPOKEN with the phase's own announcement (one call — fix-diff review round 1). */}
          {phase.truncated ? <Text>{t('find.checked_limit')}</Text> : null}
          {phase.limited ? (
            <XStack gap="$3" items="center">
              <Text flex={1}>{t('find.limited_access')}</Text>
              <Button
                size="$3"
                disabled={busy || retrying}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || retrying }}
                onPress={() => void shareMoreContacts().then((ok) => (ok ? check() : undefined))}
              >
                {t('find.add_more')}
              </Button>
            </XStack>
          ) : null}
          {message ? <AnnouncedText key={message.seq} text={message.text} kind={message.kind} color={message.kind === 'error' ? '#C0392B' : '$color'} /> : null}
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
              {freeSlots === null ? (
                // Spoken with the phase's own announcement (`slotsAtEntry`) — ⛔ a second announcing line in that commit.
                mine.data && isDenied(mine.data) ? (
                  <Text color="#C0392B">{t('error.not_available')}</Text>
                ) : mine.isError || retrying || (mine.isFetching && mine.errorUpdatedAt > 0) ? (
                  // … and while ANY refetch of a list that failed runs (TanStack resets it to `pending` — round 7)
                  slotsErrorRow
                ) : (
                  <Spinner accessibilityLabel={t('loading')} />
                )
              ) : (
                <>
                  {selected.size > freeSlots && !busy ? (
                    // A reload lowered the slots below the ticks — "Ask them" is disabled, and this SAYS why (rounds 3–5).
                    // SPOKEN only when ⛔ outcome line is showing: mounting beside one cut it off on iOS.
                    message === null ? (
                      <AnnouncedText text={freeSlots > 0 ? t('find.too_many', { count: freeSlots }) : t('list.full')} kind="error" color="#C0392B" />
                    ) : (
                      <Text color="#C0392B">{freeSlots > 0 ? t('find.too_many', { count: freeSlots }) : t('list.full')}</Text>
                    )
                  ) : (
                    <Text color="$colorPress" fontSize="$2">
                      {freeSlots > 0 ? t('find.select_hint', { count: freeSlots }) : t('list.full')}
                    </Text>
                  )}
                  {/* A failed RELOAD keeps the last slots (TanStack keeps the data) — and SAYS so, with a Retry (round 5). */}
                  {mine.isError ? slotsErrorRow : null}
                </>
              )}
              {shownMatches.length === 0 ? (
                // ⛔ an empty list with ⛔ words: the empty state renders OUTSIDE the list, SHOWN and SPOKEN (round 2, P10).
                <AnnouncedText text={t('find.no_search_results')} color="$color" />
              ) : (
                <YStack flex={1} minH={160}>
                  <FlashList
                    data={shownMatches}
                    // `renderItem` reads the ticks, the slots and `busy` — what FlashList's `extraData` is for (its docs).
                    // (FlashList 2 also re-renders a cell when `renderItem` changes identity; this does ⛔ rely on that.)
                    extraData={listExtra}
                    keyExtractor={(e) => e.key}
                    renderItem={({ item }) => {
                      const on = selected.has(item.key)
                      return (
                        <Button
                          chromeless={!on}
                          theme={on ? 'accent' : undefined}
                          justify="flex-start"
                          accessibilityRole="checkbox"
                          // An UNticked box at the cap is disabled — ⛔ a tap that silently does nothing (round 4); every box
                          // while a send runs — a tick then was never asked, yet "Asked." was handed over (round 5).
                          disabled={busy || freeSlots === null || (!on && selected.size >= freeSlots)}
                          accessibilityState={{ checked: on, disabled: busy || freeSlots === null || (!on && selected.size >= freeSlots) }}
                          accessibilityLabel={on ? t('find.selected_a11y', { name: item.savedName }) : t('find.not_selected_a11y', { name: item.savedName })}
                          onPress={() => setSelected((s) => toggleSelection(s, item.key, freeSlots ?? 0))}
                        >
                          {(on ? '☑  ' : '☐  ') + item.savedName}
                        </Button>
                      )
                    }}
                  />
                </YStack>
              )}
              <Button
                theme="accent"
                height={56}
                disabled={busy || selected.size === 0 || freeSlots === null || selected.size > freeSlots}
                accessibilityRole="button"
                accessibilityLabel={t('find.send')}
                accessibilityState={{ disabled: busy || selected.size === 0 || freeSlots === null || selected.size > freeSlots, busy }}
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
            {message ? <AnnouncedText key={message.seq} text={message.text} kind={message.kind} color={message.kind === 'error' ? '#C0392B' : '$color'} /> : null}

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
              <Button
                theme="accent"
                height={56}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('action.choose_contact')}
                accessibilityState={{ disabled: busy, busy }}
                onPress={() => void pickAndAsk()}
              >
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
                <Button
                  theme="accent"
                  height={56}
                  disabled={busy || typed.trim() === ''}
                  accessibilityRole="button"
                  accessibilityLabel={t('type.submit')}
                  accessibilityState={{ disabled: busy || typed.trim() === '', busy }}
                  onPress={() => void typeAndAsk()}
                >
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
