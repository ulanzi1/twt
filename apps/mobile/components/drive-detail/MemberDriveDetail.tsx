// <MemberDriveDetail> — ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE (Story 11b.17; AC1, AC2, AC4, AC8,
// AC9, AC10, AC11). Everything the PUBLIC Sahyog Vivran page shows for that drive, ⭐ **plus the
// nominee's complete, UNMASKED banking coordinates** — which the public page has carried ⛔ NONE of
// since story A (`11b-11`).
//
// ── ⭐⭐ WHY THE COORDINATES ARE HERE AT ALL, IN ONE SENTENCE ────────────────────────────────────
// `2026-09-04-190` **cl.3** as scoped by **`-199`** (option (a), scope (i)): *"any authenticated
// member may access the member-facing Sahyog Vivran detail for **any** Trust Pariwar drive, including
// its full nominee banking coordinates."* ⇒ in the member's own terms: **"Any member of your Pariwar
// can see the bank account details of every family your Pariwar has supported — ⛔ not only the drives
// you were asked to contribute to, and ⛔ not only while a drive is still collecting."**
// ⚠⛔⛔ **AND THAT IS A WIDER EXPOSURE THAN THE ONE THIS PROGRAMME JUST REMOVED.** The public page was
// reachable by anyone with a link but **revocable by changing the page**; this is reachable by anyone
// with an account, **and it persists on devices, where it cannot be taken back**. ⭐ BigDev's call, and
// it is made — the Panel disclosure note was written and committed (`468d43c1`).
//
// ── ⛔ UNMASKED IS THE POINT, ⛔ NOT AN OVERSIGHT (Trap 4) ──────────────────────────────────────
// *"A masked account# cannot be transferred to."* ⛔ Do ⛔ not "improve" this with a masked display for
// safety — ⭐ that would break the ⛔ one thing the field exists for. ⚠ The safety question is **WHO
// SEES IT** (`-199`), ⛔ never **how much of it**.
//
// ── ⚠⛔ TRAP 3 — THIS SCREEN HAS THREE STATES AND THEY RENDER AS EARLY RETURNS ─────────────────
// New-Arch FlashList/FlatList red-box crossing **empty → populated IN PLACE**, and the rule is
// PRIMITIVE-INDEPENDENT ([[project_fabric_flatlist_empty_populated_crash]]). ⭐ This screen renders ⛔ no
// list at all — the two nominee accounts are bounded at TWO by the substrate's composite PK — so it
// maps them directly; ⛔ do ⛔ not "optimise" that into a virtualized list.
//
// ── ⭐ FAMILY 13 (AC11) — AND THE CHECKLIST'S OWN 13(a) IS WRONG ───────────────────────────────
// ⛔⛔ **⛔ Do ⛔ not put an `accessibilityLabel` on a container that WRAPS CONTROLS — label the
// LEAVES.** `MemberDriveList.tsx:233-240`: *"`accessible` USED TO SIT ON THE `<YStack>` ABOVE, which
// COLLAPSES THE WHOLE SUBTREE INTO ONE ELEMENT ⇒ the retry `<Button>`'s own `accessible={true}`, role,
// label and handler were ⛔ UNREACHABLE."* ⚠ The checklist's 13(a) still reads, unqualified, *"a
// container carrying `accessibilityLabel` is explicitly `accessible={true}`"* — ⭐ story E's THIRD pass
// **disproved** it, and following it here would have made **AC8's control UNREACHABLE**.
// ⇒ ⭐ `accessible` on **leaf text / leaf-only groups**; every **control** carries `accessible={true}` +
// role + label and is a **SIBLING**, ⛔ never a descendant, of a labelled container.
// ⚠ A tamagui `<Button>` is `styled(View, …)` and `@tamagui/web`'s `createComponent.native.js` sets
// `accessible` ⛔ NOWHERE ⇒ it is a plain RN `View`, and an RN `View` is ⛔ not an accessibility element
// unless it says so. ⛔ Do ⛔ not assume `Pressable` semantics.

import type { MemberDriveDetailResponse } from '@twt/contracts'
import { NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '@twt/contracts'
import { formatCount, formatSahyogContributedAmount, formatSahyogTargetAmount } from '@twt/i18n'
import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { Linking, ScrollView } from 'react-native'
import { Button, Paragraph, Separator, Text, XStack, YStack } from 'tamagui'

import { sahyogVivranUrl } from '../../lib/public-site'
import {
  accountHasUnavailableField,
  detailOutcomeFramingKey,
  formatClosedAtIst,
  selectMessageBlockHeadline,
  selectMessageBlockTableColumns,
  selectZeroDayLine,
} from './format'
import { useMemberDriveDetailQuery } from './useMemberDriveDetailQuery'

/** This surface's OWN chrome copy. ⛔ The shared Sahyog vocabulary is ⛔ NOT here — see `SHARED_NS`. */
const NS = { namespace: 'member-drive-detail' } as const

/**
 * ⭐⭐ STORY B's SHARED SOURCE — the ⛔ ONE definition of the three stage words, the zero-day line, the
 * लक्ष्य line and the Panel's five-paragraph MESSAGE BLOCK (`2026-09-04-193` cl.3). ⛔ This surface
 * CONSUMES these keys by name and may ⛔ not mint its own.
 */
const SHARED_NS = { namespace: 'sahyog-shared' } as const

/**
 * ⭐ The nominee's holder label — **`sahyog-vivran`**'s `label.account_holder`, whose VALUE is the
 * Trustee-ratified *"Nominee Name"* (`2026-09-04-190` **cl.2**).
 *
 * ⚠⛔⛔ **⛔ NOT `member-drive-list`'s `nominee.label`, WHICH RENDERS `"Nominee"`** — its own
 * `$comment.nominee` claimed to carry the ruled wording and that claim was **FALSE**; following it
 * would ship a label that fails AC4's own first sentence. ⛔ And ⛔ NOT
 * `contribution`'s `upi_intent.account_holder_label`, whose value is literally *"Account holder"* —
 * the string cl.2 forbids.
 * ⚠ Its KEY name says `account_holder` and its VALUE is the ruled *"Nominee Name"* — ⛔ do ⛔ not "fix"
 * the key.
 */
const VIVRAN_NS = { namespace: 'sahyog-vivran' } as const

/** The three ruled stage words, keyed by the WIRE TOKEN. ⛔ `t()` THROWS on a miss. */
const STAGE_KEY = {
  live: 'stage.live',
  closed: 'stage.closed',
  verified: 'stage.verified',
} as const

/**
 * ⭐⭐ The Panel's five paragraphs, in order, **after** the headline. ⚠ All four are **TOKEN-FREE BY
 * DESIGN** — `{family_name}` is the ⛔ ONLY omittable token in the whole block and it appears ⛔ only in
 * the headline. ⛔ Do ⛔ not interpolate into these.
 */
const MESSAGE_BLOCK_BODY_KEYS = [
  'message_block.solidarity',
  'message_block.gratitude',
  'message_block.tagline',
  'message_block.join',
] as const

export function MemberDriveDetail({ driveToken }: { driveToken: string | undefined }) {
  const t = useT()
  // ⚠ `useLocale()` — the house hook. ⛔ NOT a value derived from `useT()`: `useT()` returns a FRESH
  // CLOSURE on every render, so depending on `t` for anything but calling it defeats memoization
  // ([[project_uset_fresh_closure_memo_trap]]).
  const { locale } = useLocale()
  const router = useRouter()
  const { data, isLoading, isError, error, refetch } = useMemberDriveDetailQuery(driveToken)

  const handleRetry = useCallback(() => {
    // ⚠ `refetch()` returns a promise that REJECTS on failure; a bare `void` would leave an unhandled
    // rejection on the member's screen. ⭐ The house shape is `LockInClockWidget.tsx`'s: await inside
    // try/catch and fail QUIETLY — the error state is already on screen.
    void (async () => {
      try {
        await refetch()
      } catch {
        // Already rendering an error state; ⛔ never a red box.
      }
    })()
  }, [refetch])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // ── STATE 1: LOADING — an early return ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          accessible
          accessibilityRole="text"
          // ⭐ ANNOUNCED, ⛔ not merely reflected in a prop. A member using a screen reader must hear
          // that the surface is working, or silence reads as an empty drive.
          accessibilityLiveRegion="polite"
        >
          {t('loading', undefined, NS)}
        </Text>
      </YStack>
    )
  }

  // ── STATE 2: ERROR (including the 404) — an early return ──────────────────────────────────────
  // ⚠⛔⛔ **THE 404 IS REPORTED EXACTLY LIKE ITS FOUR SIBLINGS, AND THAT IS THE POINT.** It collapses
  // *"no such drive"* · *"not visible at this surface's predicate"* · *"malformed token"* · *"a REAL
  // drive addressed with a WRONG token"* · ⭐ *"ANOTHER PARIWAR'S DRIVE"*. ⛔⛔ Do ⛔ NOT distinguish
  // them in the copy, and ⛔ do ⛔ not add a *"you don't have access"* branch — a surface that separated
  // them would be an **ENUMERATION ORACLE**, which is exactly what the opaque token exists to close.
  // ⭐ A 404 gets its own dignified copy (⛔ not "try again", because there is nothing to retry) while
  // every other failure gets the retry affordance.
  if (isError || data === undefined) {
    const isNotFound =
      typeof error === 'object' && error !== null && (error as { status?: number }).status === 404
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$4">
        <Text
          fontFamily="$body"
          fontSize="$4"
          color="$colorPress"
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {isNotFound ? t('not_found', undefined, NS) : t('error', undefined, NS)}
        </Text>
        {/* ⭐ The control is a SIBLING of the labelled text above, ⛔ never a descendant — see the
            header's family-13 note. ⛔ Without the EXPLICIT `accessible` the role and label below are
            ⛔ NEVER announced. */}
        {isNotFound ? null : (
          <Button
            height={56}
            chromeless
            justify="flex-start"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('error.retry', undefined, NS)}
            onPress={handleRetry}
          >
            <Text fontFamily="$body" fontSize="$4">
              {t('error.retry', undefined, NS)}
            </Text>
          </Button>
        )}
        <Button
          height={56}
          chromeless
          justify="flex-start"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('back_a11y', undefined, NS)}
          onPress={handleBack}
        >
          <Text fontFamily="$body" fontSize="$4">
            {t('back', undefined, NS)}
          </Text>
        </Button>
      </YStack>
    )
  }

  return <DriveDetailBody detail={data} t={t} locale={locale} onBack={handleBack} />
}

function DriveDetailBody({
  detail,
  t,
  locale,
  onBack,
}: {
  detail: MemberDriveDetailResponse
  t: ReturnType<typeof useT>
  locale: 'en' | 'hi'
  onBack: () => void
}) {
  // ⚠⛔ `isLive` IS A **WIRE-TOKEN** TEST — `live` | `closed` | **`verified`**. ⛔ A comparison against
  // `settled` (a POOL STATE) matches ⛔ NOTHING on this side of the boundary (AC1).
  const isLive = detail.status === 'live'
  const stageWord = t(STAGE_KEY[detail.status], undefined, SHARED_NS)

  // ⭐ OPERATIONAL FIGURES — LATIN numerals in BOTH locales (amendment-A2 / UX-DR73). ⛔ never
  // `toHindiNumeral`. ⚠ `formatCount` takes ⛔ NO locale, deliberately — a count renders LATIN in both,
  // so a `locale` argument would imply a per-locale difference that does ⛔ not exist.
  const confirmedCount = formatCount(detail.confirmedContributionCount)
  // ⛔⛔ THE RULED FORM, FROM THE ⛔ ONE SHARED PRODUCER (`@twt/i18n`) — ⛔ do ⛔ not re-derive it here.
  const amount = formatSahyogContributedAmount(detail.amountRaisedInr, locale, isLive)

  // ── ⭐⭐ AC9 — THE ZERO-DAY LINE. THE VARIANT IS THE SAFETY PROPERTY ────────────────────────────
  // ⚠⛔ A `live` drive with ZERO confirmed contributions must ⛔ NOT render a *"₹ 0 contributed · 0
  // confirmed"*-shaped sentence: the Panel GAVE the replacement wording, in BOTH languages, when a
  // code review showed them what a drive renders on its first day (`2026-09-07-206` cl.4).
  // ⚠⛔ `t()` THROWS on an unsupplied token ⇒ `.full` on a nameless drive would take down the WHOLE
  // PAGE. ⭐ The selector is a pure function so a test can CALL it (`./format`).
  const zeroDay = selectZeroDayLine(detail)
  const summaryLine =
    zeroDay === null
      ? t('raised', { amount }, NS)
      : zeroDay.key === 'zero_line.full'
        ? t('zero_line.full', { family_name: zeroDay.familyName }, SHARED_NS)
        : t('zero_line.no_family', undefined, SHARED_NS)

  // ⭐⭐ लक्ष्य — present where, and ⛔ ONLY where, the Pariwar has revealed it TO MEMBERS
  // (`-211` cl.2) **and** the drive is `live` (`-212` cl.1, Trustee-ratified). ⚠ The key is **ABSENT**
  // rather than `null` when withheld, so `=== undefined` is the correct test. ⛔ Fail-closed ⇒
  // ⛔ nothing renders at launch, for any Pariwar — ⭐ and that is CORRECT, ⛔ never a bug to "fix".
  // ⚠⛔ ITS NUMBER FORM IS ⛔ NOT THE AMOUNT'S — the target is exact only below ₹1 lakh, the contributed
  // amount below ₹10 lakh. ⛔ TWO RULES ON ONE SCREEN, deliberately (`-206` cl.3; `-211` cl.5 — the
  // clause that exists because **₹300 once rendered as `₹ 0 lakh`**).
  // ⭐ The copy is `drive_target` from `sahyog-shared`, consumed BY NAME (`-193` cl.3) — ⛔ never a
  // second key. ⚠ `{amount}` arrives ALREADY FORMATTED.
  const targetLine =
    detail.driveTargetInr === undefined
      ? null
      : t('drive_target', { amount: formatSahyogTargetAmount(detail.driveTargetInr, locale) }, SHARED_NS)

  // ⭐ The public page's meter figure. ⚠⛔ `null` off-`live` BY CONTRACT (`2026-09-08-207` cl.1), and
  // ⛔ **NOT** suppressed at zero — the public meter renders at 0 too, so hiding it would put the
  // member BELOW the public.
  const progressLine =
    detail.confirmedPercentage === null
      ? null
      : t('progress', { percent: String(detail.confirmedPercentage) }, NS)

  // ⭐ The public page's close-of-cycle framing. ⚠⛔ GATED ON `!isLive`, ⛔ not on `fundingOutcome ===
  // null` alone — *"the cycle closed"* on a still-collecting drive would be false.
  const outcomeLine =
    detail.fundingOutcome === null || isLive
      ? null
      : t(detailOutcomeFramingKey(detail.fundingOutcome), undefined, NS)

  // ⚠ `formatClosedAtIst` returns `null` for an unparseable instant — checked HERE too, ⛔ not only
  // inside the formatter, so a malformed date renders NOTHING rather than the literal word "null".
  const closedIst = detail.closedAt === null ? null : formatClosedAtIst(detail.closedAt)

  // ── ⭐⭐ AC10 — THE PANEL'S MESSAGE BLOCK AND ITS TABLE ────────────────────────────────────────
  // ⭐ Ratified 2026-09-05, DR + KB (§8.1, routed at §9.1 row 3); recorded at `-214` cl.4(b).
  // ⛔⛔ The eight keys are CONSUMED BY NAME from `sahyog-shared` — ⛔ never authored, re-derived or
  // translated at this render site. ⚠ If a key were absent that is a **STOP**, ⛔ not a licence.
  // ⚠⛔⛔ **THE SELECTOR RETURNS EARLY RATHER THAN RESOLVING A KEY WITH AN UNSUPPLIED TOKEN** — that is
  // the exact property the narrowed dark-copy fence now asserts about this file
  // (`packages/i18n/tests/sahyog-shared-dark-copy.test.ts`), and it is why this block is PAGE-safe:
  // `t()` THROWS on a missing token and the block is PAGE-shaped (§8.3(2)) ⇒ a wrong variant is a
  // WHOLE-PAGE failure, ⛔ not one blank line.
  const messageHeadline = selectMessageBlockHeadline(detail)
  const messageTableColumns = selectMessageBlockTableColumns(detail)

  // ⭐⭐ THE SCREEN'S ACCESSIBLE SUMMARY — built from the SAME strings rendered below, ⛔ never a fixed
  // sentence. ⚠ Each line is computed ONCE, rendered, and joined here ⇒ ⛔ a future field cannot be
  // rendered without being announced unless a later author deliberately breaks this shape. ⭐ That is
  // the parity story E's third pass had to retrofit; it is structural here from the start.
  // ⚠ AC9's softening travels: on a zero-day row the head carries ⛔ no count/amount figures, exactly
  // as the sighted copy does.
  const headA11y =
    detail.deceasedMemberName === null
      ? `${detail.poolLetterCode}, ${stageWord}.`
      : `${detail.deceasedMemberName}, ${stageWord}.`
  const screenA11y = [
    headA11y,
    summaryLine,
    zeroDay === null ? t('value.contributions_count', { count: confirmedCount }, NS) : null,
    targetLine,
    progressLine,
    outcomeLine,
  ]
    .filter((line): line is string => line !== null)
    .join(' ')

  return (
    <ScrollView>
      <YStack flex={1} bg="$background" pb="$8">
        {/* Header. ⭐ The back control is a SIBLING of the labelled heading, ⛔ never a descendant. */}
        <YStack px="$5" pt="$5" pb="$3" gap="$2" borderBottomWidth={1} borderColor="$borderColor">
          <Button
            height={44}
            chromeless
            justify="flex-start"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('back_a11y', undefined, NS)}
            onPress={onBack}
          >
            <Text fontFamily="$body" fontSize="$3" color="$colorPress">
              {t('back', undefined, NS)}
            </Text>
          </Button>

          <Text fontFamily="$body" fontSize="$7" color="$color" accessibilityRole="header">
            {/* ⭐ `deceasedMemberName` is `null` when unresolvable — the screen still carries the DRIVE.
                ⛔ NULL OMITS THE NAME, ⛔ NEVER THE DRIVE. ⚠ And `ANONYMIZED_SENTINEL` never reaches
                here: the API resolves it to `null` (AC11), so this same fallback carries it. */}
            {detail.deceasedMemberName ?? detail.poolLetterCode}
          </Text>

          {/* ⭐ The whole fact block announces ONCE, from the strings rendered below it. ⚠ It wraps
              ⛔ NO controls — the back button above and the public-page link below are both SIBLINGS
              of it (family 13; the checklist's own 13(a) would have collapsed them). */}
          <YStack gap="$1" accessible accessibilityRole="text" accessibilityLabel={screenA11y}>
            <XStack gap="$2" items="center">
              <Text fontFamily="$body" fontSize="$3" color="$colorPress">
                {stageWord}
              </Text>
            </XStack>

            <Text fontFamily="$body" fontSize="$4" color="$colorPress">
              {summaryLine}
            </Text>

            {/* ⚠ On a zero-day drive the Panel's softened line REPLACES the figures; repeating the
                count beneath it would put back exactly what `-206` cl.4 removed. */}
            {zeroDay === null ? (
              <Text fontFamily="$body" fontSize="$3" color="$colorPress">
                {t('value.contributions_count', { count: confirmedCount }, NS)}
              </Text>
            ) : null}

            {targetLine === null ? null : (
              <Text fontFamily="$body" fontSize="$3" color="$colorPress">
                {targetLine}
              </Text>
            )}

            {progressLine === null ? null : (
              <Text fontFamily="$body" fontSize="$2" color="$colorPress">
                {progressLine}
              </Text>
            )}

            {outcomeLine === null ? null : (
              <Text fontFamily="$body" fontSize="$2" color="$colorPress">
                {outcomeLine}
              </Text>
            )}
          </YStack>
        </YStack>

        {/* ── ⭐⭐ AC10 — THE TABLE SITS **ABOVE** THE MESSAGE (§8.1) ───────────────────────────── */}
        {messageHeadline === null ? null : (
          <YStack px="$5" py="$5" gap="$3">
            {messageTableColumns.length === 0 ? null : (
              <XStack gap="$5" accessible accessibilityRole="text">
                {messageTableColumns.map((column) => (
                  <YStack key={column.labelKey} gap="$1" flex={1}>
                    <Text fontFamily="$body" fontSize="$2" color="$colorPress">
                      {t(column.labelKey, undefined, SHARED_NS)}
                    </Text>
                    <Text fontFamily="$body" fontSize="$4" color="$color">
                      {column.value}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            )}

            <YStack gap="$3" accessible accessibilityRole="text">
              {/* ⚠⛔ `{amount}` ARRIVES ALREADY FORMATTED AND CARRIES ITS OWN ₹ ⇒ ⛔ adding a literal
                  one here ships **₹₹**. ⭐ The headline is the ⛔ ONLY paragraph carrying a token. */}
              <Paragraph fontFamily="$body" fontSize="$5" color="$color">
                {messageHeadline.key === 'message_block.headline.full'
                  ? t(
                      'message_block.headline.full',
                      { family_name: messageHeadline.familyName, amount },
                      SHARED_NS,
                    )
                  : t('message_block.headline.no_family', { amount }, SHARED_NS)}
              </Paragraph>
              {MESSAGE_BLOCK_BODY_KEYS.map((key) => (
                <Paragraph key={key} fontFamily="$body" fontSize="$3" color="$colorPress">
                  {t(key, undefined, SHARED_NS)}
                </Paragraph>
              ))}
            </YStack>
          </YStack>
        )}

        <Separator />

        {/* ── ⭐ AC2's FLOOR — the public page's own labelled facts ──────────────────────────────── */}
        <YStack px="$5" py="$5" gap="$2" accessible accessibilityRole="text">
          <Text fontFamily="$body" fontSize="$5" color="$color">
            {t('facts.group_label', undefined, NS)}
          </Text>
          {/* ⭐⭐ AC8 — `pool_canonical_identifier` RENDERS HERE. Story E carries it on the member wire
              and renders it ⛔ nowhere; the public DETAIL page renders it, so a member seeing it
              nowhere was `-189` cl.3's inversion in miniature. */}
          <FactRow label={t('label.drive_code', undefined, NS)} value={detail.poolCanonicalIdentifier} />
          <FactRow label={t('label.pool_letter', undefined, NS)} value={detail.poolLetterCode} />
          <FactRow label={t('label.status', undefined, NS)} value={stageWord} />
          <FactRow
            label={t('label.district', undefined, NS)}
            value={detail.district ?? t('value.district_unknown', undefined, NS)}
          />
          {closedIst === null ? null : (
            <FactRow label={t('label.closed_on', undefined, NS)} value={closedIst} />
          )}
          <FactRow
            label={t('label.contributions', undefined, NS)}
            value={t('value.contributions_count', { count: confirmedCount }, NS)}
          />
        </YStack>

        <Separator />

        {/* ── ⭐⭐ AC4 — THE COORDINATES. THIS IS WHAT THE STORY IS FOR ─────────────────────────── */}
        <NomineeAccountsSection detail={detail} t={t} />

        <Separator />

        {/* ── ⭐⭐ AC8 — THE DRIVE IS REACHABLE. `drive_href` IS `publicToken` ON THE MEMBER WIRE ──
            ⚠⛔ ⛔ There is ⛔ no key literally named `drive_href`; it is the PUBLIC map's *name for the
            field* (`member-drive-list-field-floor.test.ts`: `drive_href: ['publicToken']`) ⇒ ⭐ ONE
            value, TWO names, and ⛔ the field-id is ⛔ never rendered as a label.
            ⚠⛔⛔ **A DELIBERATE ASYMMETRY WITH AC5, RECORDED SO IT IS ⛔ NOT RE-DISCOVERED:** AC5 keeps
            this token OUT of the durable audit chain because that *"would additionally write a live
            public ADDRESS"* there — while this control puts it on a member's SCREEN, where Trap 2's
            screenshottable/forwardable logic applies. ⭐ The rule fenced there is *"⛔ not in the
            DURABLE AUDIT CHAIN"*, ⛔ not *"⛔ nowhere"*; survivable because `rotatePoolPublicToken`
            exists and `publicToken` is the ⛔ ONLY address form. ⛔ Do ⛔ not "fix" one to satisfy the
            other. */}
        <PublicPageLink detail={detail} t={t} locale={locale} />
      </YStack>
    </ScrollView>
  )
}

/** One labelled fact. ⭐ A leaf-only group — it wraps ⛔ no control, so `accessible` on the parent is safe. */
function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack gap="$2" items="baseline">
      <Text fontFamily="$body" fontSize="$2" color="$colorPress">
        {label}
      </Text>
      <Text fontFamily="$body" fontSize="$3" color="$color">
        {value}
      </Text>
    </XStack>
  )
}

/**
 * ⭐⭐ **THE NOMINEE'S COMPLETE, UNMASKED BANKING COORDINATES (AC4).**
 *
 * ⛔⛔ **BOTH ACCOUNTS RENDER, EQUALLY** (`2026-09-10-213` **cl.1**). ⚠ `rank` is composite-PK
 * IDENTITY — ⛔ not a priority, ⛔ not a nominee rank, ⛔ not primary/secondary. ⛔ Nothing here may
 * present one as preferred, and the copy says so in terms.
 *
 * ⚠⛔ **TWO DIFFERING HOLDER NAMES ARE A LEGITIMATE STATE** (`#decision-2026-09-13-215`: the schema
 * carries ⛔ no FK, ⛔ no `nominee_rank`, ⛔ no match rule) ⇒ ⭐ **SURFACE BOTH, PICK NEITHER**, and
 * ⛔ encode ⛔ no assumption either way (`-213` cl.2). ⛔ And ⛔ do ⛔ not assert that either name IS the
 * nominee: the column is `account_holder_name_ciphertext` and **the SCHEMA is the authority**.
 *
 * ⛔⛔ **THERE IS ⛔ NO UPI-ID ROW HERE, ON ⛔ ANY DRIVE, IN ⛔ ANY STAGE** — `2026-09-10-212` **cl.2**
 * ruled the nominee's UPI ID onto the **PAYMENT screen** (story `8-17`, `done`). ⭐ The wire does not
 * even carry it, so the exclusion is **STRUCTURAL**, ⛔ not remembered.
 *
 * ⚠ **FIVE fields per account** — holder name · account number · IFSC · bank · branch — and ⭐ an
 * absent `branch` **OMITS ITS ROW**: the column is genuinely nullable, so a `null` is an ORDINARY
 * ABSENT OPTIONAL, ⛔ not a fault and ⛔ never a placeholder. ⚠⛔ `bankName` is ⛔ **NOT** its twin: that
 * column is `NOT NULL` with no non-empty CHECK, so an empty value is a FAULT and arrives as the
 * DISTINCT sentinel. ⛔ Do ⛔ not write one guard for both.
 */
function NomineeAccountsSection({
  detail,
  t,
}: {
  detail: MemberDriveDetailResponse
  t: ReturnType<typeof useT>
}) {
  return (
    <YStack px="$5" py="$5" gap="$4">
      <Text fontFamily="$body" fontSize="$5" color="$color" accessible accessibilityRole="text">
        {t('bank.title', undefined, NS)}
      </Text>

      {detail.nomineeAccounts.length === 0 ? (
        /* ⭐ `[]` IS A FIRST-CLASS STATE — the claim's bank details were ⛔ never collected (6.8 AC3's
           absence signal). ⛔ Never a throw, and ⛔ never a placeholder row of empty fields. */
        <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessible accessibilityRole="text">
          {t('bank.none', undefined, NS)}
        </Text>
      ) : (
        <>
          {detail.nomineeAccounts.map((account) => {
            const unavailable = accountHasUnavailableField(account, NOMINEE_BANK_DECRYPT_FAILED_SENTINEL)
            // ⭐ The account's accessible name is built from the SAME strings rendered below — the
            // structural parity the header uses. ⚠ It announces the DEGRADE once rather than reading
            // the bracketed sentinel three times.
            const accountA11y = [
              t('bank.account_label', { rank: String(account.rank) }, NS),
              `${t('label.account_holder', undefined, VIVRAN_NS)}: ${account.accountHolderName}`,
              `${t('label.account_number', undefined, NS)}: ${account.accountNumber}`,
              `${t('label.ifsc', undefined, NS)}: ${account.ifsc}`,
              `${t('label.bank_name', undefined, NS)}: ${account.bankName}`,
              account.branch === null ? null : `${t('label.branch', undefined, VIVRAN_NS)}: ${account.branch}`,
              unavailable ? t('bank.unavailable_a11y', undefined, NS) : null,
            ]
              .filter((line): line is string => line !== null)
              .join(' ')

            return (
              <YStack
                key={account.rank}
                gap="$1"
                py="$2"
                accessible
                accessibilityRole="text"
                accessibilityLabel={accountA11y}
              >
                <Text fontFamily="$body" fontSize="$3" color="$color">
                  {t('bank.account_label', { rank: String(account.rank) }, NS)}
                </Text>
                {/* ⭐⭐ THE HOLDER LABEL IS THE RULED *"Nominee Name"* — `sahyog-vivran`'s
                    `label.account_holder`. ⛔⛔ ⛔ NOT `member-drive-list`'s `nominee.label` (which
                    renders *"Nominee"*) and ⛔ NOT `upi_intent.account_holder_label` (literally
                    *"Account holder"*, the string `-190` cl.2 forbids). */}
                <FactRow
                  label={t('label.account_holder', undefined, VIVRAN_NS)}
                  value={account.accountHolderName}
                />
                {/* ⭐ THE FULL NUMBER, UNMASKED — Trap 4. ⛔ Do ⛔ not mask it "for safety". */}
                <FactRow
                  label={t('label.account_number', undefined, NS)}
                  value={account.accountNumber}
                />
                <FactRow label={t('label.ifsc', undefined, NS)} value={account.ifsc} />
                <FactRow label={t('label.bank_name', undefined, NS)} value={account.bankName} />
                {/* ⚠⛔ AN ABSENT BRANCH **OMITS THE ROW** — ⛔ never "Not recorded", ⛔ never a
                    placeholder. It is a nullable column, so `null` is an ordinary absent optional. */}
                {account.branch === null ? null : (
                  <FactRow label={t('label.branch', undefined, VIVRAN_NS)} value={account.branch} />
                )}
              </YStack>
            )
          })}
          {/* ⛔⛔ THE TWO ACCOUNTS ARE EQUAL — the copy says so, and ⛔ nothing above orders them by
              preference. ⭐ Rendered ⛔ only when there ARE two: with one account the sentence would
              describe a choice the member does not have. */}
          {detail.nomineeAccounts.length > 1 ? (
            <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessible accessibilityRole="text">
              {t('bank.equal_accounts', undefined, NS)}
            </Text>
          ) : null}
        </>
      )}
    </YStack>
  )
}

/**
 * ⭐⭐ **AC8 — THE DRIVE IS REACHABLE.** A REAL focusable control with a real handler, an accessible
 * name, and an `accessibilityRole` matching what it does.
 *
 * ⛔⛔ **`link`, ⛔ NOT `button`** — it LEAVES THE APP for the public site, and a screen reader should
 * say so before the member commits to the tap (the `SahyogVivranEntry` precedent, which this follows
 * deliberately and exactly).
 *
 * ⚠ AN OUTBOUND `Linking.openURL`, ⛔ not an in-app route: every route outside `(auth)` is behind the
 * root session guard, so an in-app view of PUBLIC trust content would put that content back behind a
 * gate.
 *
 * ⚠⛔⛔ **AND ⛔ DO ⛔ NOT "CONSOLIDATE" THIS WITH `SahyogVivranEntry`.** That component is
 * **Trustee-ratified** (`2026-09-05-200` **cl.4**, *"Phone-app member should reach the page"*) and its
 * own header forbids folding it into a generic outbound-links screen. ⚠ After this story a member has
 * **TWO** views of one drive — this one unredacted, that one carrying ⛔ no coordinates. ⭐ That
 * divergence is **EXPECTED AND RECORDED**, ⛔ not a defect to "fix"; removing either needs a **PANEL
 * decision**.
 */
function PublicPageLink({
  detail,
  t,
  locale,
}: {
  detail: MemberDriveDetailResponse
  t: ReturnType<typeof useT>
  locale: 'en' | 'hi'
}) {
  return (
    <YStack px="$5" py="$5">
      <Button
        // ≥56pt — the same touch target the card's contribute CTA uses (UX family 13).
        height={56}
        chromeless
        justify="flex-start"
        // ⭐⭐ EXPLICIT — ⛔ WITHOUT THIS THE THREE PROPS BELOW ARE ⛔ NEVER ANNOUNCED. A tamagui
        // `Button` is `styled(View, …)` and `@tamagui/web` sets `accessible` ⛔ NOWHERE, so it is a
        // plain RN `View`. ⛔ Do ⛔ not assume `Pressable` semantics.
        accessible={true}
        accessibilityRole="link"
        accessibilityLabel={t('public_page.cta_a11y', undefined, NS)}
        accessibilityHint={t('public_page.cta_hint', undefined, NS)}
        onPress={() => {
          // ⚠ `Linking.openURL` REJECTS when no handler can open the URL (⛔ it does not resolve
          // false), so a bare `void` leaves an unhandled rejection on a member's screen. ⭐ The house
          // shape is await-inside-try/catch, failing QUIETLY.
          // ⛔⛔ THE ADDRESS IS THE SERVER-RETURNED TOKEN — ⛔ nothing here derives it from
          // `poolCanonicalIdentifier`, which would re-create D2's guessability inside the client.
          void (async () => {
            try {
              await Linking.openURL(sahyogVivranUrl(detail.publicToken, locale))
            } catch {
              // Intentionally silent — see above.
            }
          })()
        }}
      >
        <Text fontFamily="$body" fontSize="$3" color="$colorPress">
          {t('public_page.cta', undefined, NS)}
        </Text>
      </Button>
    </YStack>
  )
}
