// ⭐⭐ THE MEMBER DRIVE-DETAIL RENDER FENCE — Story 11b.17 (Task 6; AC4, AC8, AC9, AC10, AC11).
// DB-free, RN-render-free.
//
// ⚠⛔ **THERE IS ⛔ NO RN MOUNT HARNESS IN THIS REPO.** ⛔ No `@testing-library/react-native`;
// `MemberDriveList.tsx` itself **cannot be imported** — `components/drive-list/format.ts:1-10`
// records it: *"confirmed by trying (`SyntaxError: Unexpected token 'typeof'`, from a transitive
// React Native dependency's Flow syntax)."* ⇒ ⭐ the two shipped idioms are:
//   **(1)** scan the `.tsx` **source as text**, driven by the REAL i18n catalog and the REAL contract;
//   **(2)** **extract pure logic into a plain `.ts` module** so a test can **CALL** it.
// ⚠⛔ **A SOURCE SCAN PROVES A FUNCTION IS *REFERENCED*, ⛔ NEVER THAT IT COMPUTES THE RIGHT ANSWER.**
// ⇒ ⭐ every rule with a checkable answer is asserted by CALLING `./format`; the scan is reserved for
// what only the `.tsx` can state (which token it resolves, which role it declares).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MemberDriveDetailResponse, NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '@twt/contracts'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import {
  accountHasUnavailableField,
  detailOutcomeFramingKey,
  selectMessageBlockHeadline,
  selectMessageBlockTableColumns,
  selectZeroDayLine,
} from '../../components/drive-detail/format'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')

const screen = read('apps/mobile/components/drive-detail/MemberDriveDetail.tsx')
const route = read('apps/mobile/app/(contribution)/drive/[driveToken].tsx')
const hook = read('apps/mobile/components/drive-detail/useMemberDriveDetailQuery.ts')

/**
 * ⭐⭐ THE SOURCE WITH ITS COMMENTS REMOVED — for assertions about what the code **DOES**.
 * ⚠⛔ **⛔ NOT A CONVENIENCE.** This file's own doc-blocks NAME the tokens they forbid (`vpa`,
 * `nominee.label`, `upi_intent.account_holder_label`) in order to forbid them ⇒ a raw-source scan
 * would make the repo's discipline indistinguishable from breaking it (the `drive-list-render.test.ts`
 * `codeOnly` lesson, paid for once already).
 */
const code = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n')

const screenCode = code(screen)
const NS = 'member-drive-detail'
const SHARED = 'sahyog-shared'
const VIVRAN = 'sahyog-vivran'
const LOCALES = ['en', 'hi'] as const

describe('⭐ AC4 — the coordinates: UNMASKED, COMPLETE, and the RULED label', () => {
  it('⭐ FIVE coordinate labels resolve in BOTH locales — ⛔ and the holder label is the RULED string', () => {
    for (const locale of LOCALES) {
      // ⭐⭐ THE HOLDER LABEL IS THE TRUSTEE-RATIFIED *"Nominee Name"* (`2026-09-04-190` **cl.2**),
      // carried by `sahyog-vivran`'s `label.account_holder`. ⚠ Its KEY name says `account_holder` and
      // its VALUE is the ruled string — ⛔ do ⛔ not "fix" the key.
      expect(t('label.account_holder', undefined, { locale, namespace: VIVRAN })).toBeTruthy()
      expect(t('label.account_number', undefined, { locale, namespace: NS })).toBeTruthy()
      expect(t('label.ifsc', undefined, { locale, namespace: NS })).toBeTruthy()
      expect(t('label.bank_name', undefined, { locale, namespace: NS })).toBeTruthy()
      // ⭐ MINTED at this story, at its OWN render site (the `8-17` `upi_intent.vpa_label` precedent).
      // ⛔ It is ⛔ NOT ratified copy: ⛔ no clause names `branch`; it was deleted as COLLATERAL when
      // story A withdrew the public banking tier (`45547a7b`).
      expect(t('label.branch', undefined, { locale, namespace: VIVRAN })).toBeTruthy()
    }
    // ⭐ EN's holder label is the ruled string itself — ⛔ asserted, ⛔ not assumed.
    expect(getCatalog('en', VIVRAN)?.['label.account_holder']).toBe('Nominee Name')
  })

  it('⛔⛔ the screen resolves `label.account_holder` — ⛔ NEVER `nominee.label`, ⛔ NEVER `upi_intent.account_holder_label`', () => {
    // ⚠⛔⛔ `member-drive-list`'s `nominee.label` renders **"Nominee"** (hi: "नॉमिनी") — ⛔ **NOT** the
    // ruled *"Nominee Name"* — and its own `$comment.nominee` CLAIMED to carry the ruled wording and
    // was **FALSE**. ⇒ following that instruction would have shipped a label failing AC4's own first
    // sentence. ⭐ The false half was story F's to correct and is corrected, BY NAME, in that catalog.
    expect(getCatalog('en', 'member-drive-list')?.['nominee.label']).toBe('Nominee')
    expect(screenCode).toContain("'label.account_holder'")
    expect(screenCode).not.toContain("'nominee.label'")
    // ⛔⛔ AND ⛔ NOT `contribution`'s `upi_intent.account_holder_label`, whose value is literally
    // *"Account holder"* — ⭐ the string `-190` cl.2 forbids, and the one this story records as
    // ⛔ **not** to be fixed by side effect (it is `-212` Consequence 6, routed, and UNHOMED).
    expect(getCatalog('en', 'contribution')?.['upi_intent.account_holder_label']).toBe('Account holder')
    expect(screenCode).not.toContain('upi_intent.account_holder_label')
  })

  it('⛔⛔ ⛔ NO `vpa` ANYWHERE ON THIS SCREEN — on ⛔ any drive, in ⛔ any stage (D3(D))', () => {
    // ⭐ `2026-09-10-212` **cl.2** (Trustee-ratified, DR + KB) ruled the nominee's UPI ID onto the
    // **PAYMENT screen** — option (D) — and story `8-17` (`done`) shipped that half.
    expect(screenCode).not.toMatch(/\bvpa\b/i)
    // ⭐ And the CONTRACT cannot carry it either — the structural half.
    const account = MemberDriveDetailResponse.shape.nomineeAccounts
    expect(JSON.stringify(Object.keys(account._def.type.shape))).not.toMatch(/vpa/i)
  })

  it('⛔ ⛔ NO MASKING — ⭐ unmasked is the POINT (Trap 4), ⛔ not an oversight', () => {
    // *"A masked account# cannot be transferred to."* ⚠ The safety question is **WHO SEES IT**, ⛔ never
    // **how much of it** — so a `.slice(-4)`, a `•` run or a `mask(` helper on this screen is the
    // defect, ⛔ not the protection.
    expect(screenCode).not.toMatch(/slice\(-4\)|last4|maskAccount|•{2,}|\*{4,}/i)
    // ⭐ The values render DIRECTLY from the wire.
    expect(screenCode).toContain('account.accountNumber')
    expect(screenCode).toContain('account.ifsc')
  })

  it('⭐ BOTH accounts render, EQUALLY — ⛔ no primary/secondary, ⛔ no ordering implied', () => {
    // ⭐ `2026-09-10-213` **cl.1**. ⚠ `rank` is composite-PK IDENTITY, ⛔ never a priority.
    expect(screenCode).toContain('detail.nomineeAccounts.map')
    expect(screenCode).not.toMatch(/nomineeAccounts\[0\]\s*[^.]/)
    expect(screenCode).not.toMatch(/\bprimary\b|\bisPreferred\b|\bdefaultAccount\b/i)
    // ⭐ The equality COPY renders — ⛔ and ⛔ only when there ARE two, because with one account the
    // sentence would describe a choice the member does not have.
    expect(screenCode).toContain('nomineeAccounts.length > 1')
    expect(screenCode).toContain("'bank.equal_accounts'")
    for (const locale of LOCALES) {
      expect(t('bank.equal_accounts', undefined, { locale, namespace: NS })).toBeTruthy()
    }
  })

  it('⚠⛔ `branch` ABSENT OMITS ITS ROW — ⛔ and `bankName` is ⛔ NOT its twin', () => {
    // ⭐ `branch` is GENUINELY NULLABLE ⇒ a `null` is an **ORDINARY ABSENT OPTIONAL**, ⛔ not a fault:
    // **OMIT THE ROW**, ⛔ never a placeholder. ⚠⛔ `bank_name` is `text NOT NULL` with ⛔ NO non-empty
    // CHECK ⇒ `''` is REACHABLE and is the value that once **500'd the whole public transparency
    // page** ⇒ it degrades to the DISTINCT sentinel. ⛔⛔ **ONE GUARD CANNOT SERVE BOTH.**
    expect(screenCode).toContain('account.branch === null ? null :')
    expect(screenCode).not.toMatch(/branch[^\n]*NOMINEE_BANK_DECRYPT_FAILED_SENTINEL/)
    expect(screenCode).not.toMatch(/branch[^\n]*value\.district_unknown|branch[^\n]*not_recorded/i)
  })

  it('⭐ a per-field decrypt failure is ANNOUNCED once — ⛔ never read out three times', () => {
    // ⭐ The sentinel is a DISTINCT string, ⛔ never a blank (a blank could masquerade as real data).
    // ⚠ It renders IN PLACE so a member sees WHICH field failed; the accessible name says so ONCE.
    expect(
      accountHasUnavailableField(
        { accountHolderName: 'A', accountNumber: NOMINEE_BANK_DECRYPT_FAILED_SENTINEL, ifsc: 'I', bankName: 'B' },
        NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
      ),
    ).toBe(true)
    expect(
      accountHasUnavailableField(
        { accountHolderName: 'A', accountNumber: '1', ifsc: 'I', bankName: 'B' },
        NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
      ),
    ).toBe(false)
    expect(screenCode).toContain("'bank.unavailable_a11y'")
  })

  it('⭐ `[]` accounts is a FIRST-CLASS STATE — ⛔ never a throw, ⛔ never a placeholder row', () => {
    // ⭐ 6.8 AC3's absence signal: the claim's bank details were ⛔ never collected.
    expect(screenCode).toContain('detail.nomineeAccounts.length === 0')
    expect(screenCode).toContain("'bank.none'")
    for (const locale of LOCALES) {
      expect(t('bank.none', undefined, { locale, namespace: NS })).toBeTruthy()
    }
  })
})

describe('⭐⭐ AC8 — the drive is REACHABLE, and the affordance is REAL', () => {
  it('⭐ `pool_canonical_identifier` RENDERS — ⛔ story E carried it and rendered it NOWHERE', () => {
    expect(screenCode).toContain('detail.poolCanonicalIdentifier')
    expect(screenCode).toContain("'label.drive_code'")
  })

  it('⭐⭐ `drive_href` IS `publicToken`, and it drives a REAL focusable control', () => {
    // ⚠⛔ There is ⛔ **no key literally named `drive_href`** — it is the PUBLIC map's *name for the
    // field* (`member-drive-list-field-floor.test.ts`: `drive_href: ['publicToken']`) ⇒ ⭐ ONE value,
    // TWO names, and ⛔ the field-id is ⛔ NEVER rendered as a label.
    expect(screenCode).not.toContain("'drive_href'")
    expect(screenCode).toContain('sahyogVivranUrl(detail.publicToken')
    // ⭐ A REAL control: a real handler, an accessible name, and a role MATCHING WHAT IT DOES.
    expect(screenCode).toContain('accessible={true}')
    expect(screenCode).toContain('accessibilityRole="link"')
    expect(screenCode).toContain("'public_page.cta_a11y'")
    expect(screenCode).toContain('Linking.openURL')
    // ⛔⛔ `link`, ⛔ NOT `button` — it LEAVES THE APP for the public site, and a screen reader should
    // say so BEFORE the member commits to the tap (the `SahyogVivranEntry` precedent).
    for (const locale of LOCALES) {
      expect(t('public_page.cta', undefined, { locale, namespace: NS })).toBeTruthy()
      expect(t('public_page.cta_a11y', undefined, { locale, namespace: NS })).toBeTruthy()
      expect(t('public_page.cta_hint', undefined, { locale, namespace: NS })).toBeTruthy()
    }
  })

  it('⛔⛔ the ADDRESS is the SERVER-RETURNED TOKEN — ⛔ never derived from the canonical identifier', () => {
    // ⭐ `2026-09-03-184` **(B)**: `P-YYYY-MM-###`'s sequence is MONOTONIC per (pariwar, month), so an
    // address built from it is **WALKABLE BY COUNTING** — and on THIS surface the walk reaches FIVE
    // decrypted Tier-1 fields per account, TWO accounts per drive.
    expect(code(route)).toContain('useLocalSearchParams')
    expect(code(route)).not.toContain('poolCanonicalIdentifier')
    expect(screenCode).not.toMatch(/sahyogVivranUrl\([^)]*poolCanonicalIdentifier/)
  })

  it('⛔⛔ ⛔ `SahyogVivranEntry` IS ⛔ NOT TOUCHED — Trustee-ratified `-200` cl.4', () => {
    // ⚠ After this story a member has **TWO** views of one drive — this one unredacted, that one
    // carrying ⛔ no coordinates. ⭐ That divergence is **EXPECTED AND RECORDED**, ⛔ not a defect to
    // "fix"; deleting or folding that entry needs a **PANEL decision**, ⛔ not a judgement call.
    const entry = read('apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx')
    expect(entry).toContain('2026-09-05-200')
    expect(entry).toContain('useActiveContributionQuery')
    // ⭐ And this story's screen is a SEPARATE component — ⛔ it did not absorb that one.
    expect(screenCode).not.toContain('SahyogVivranEntry')
  })
})

describe('⭐ AC9 — the ZERO-DAY drive renders the RATIFIED copy, ⛔ not a derived one', () => {
  const base = { status: 'live' as const, confirmedContributionCount: 0, deceasedMemberName: 'R K Sharma' }

  it('⭐⭐ the VARIANT IS CHOSEN ON NULLABILITY — ⛔ and that is a SAFETY property', () => {
    // ⚠⛔ `deceasedMemberName` is `.nullable()` on the wire and `t()` **THROWS** on an unsupplied
    // token ⇒ `.full` on a nameless drive would take down the **WHOLE PAGE**, ⛔ not one line.
    expect(selectZeroDayLine(base)).toEqual({ key: 'zero_line.full', familyName: 'R K Sharma' })
    expect(selectZeroDayLine({ ...base, deceasedMemberName: null })).toEqual({ key: 'zero_line.no_family' })
    // ⭐ ⛔ NOT a zero-day drive ⇒ `null`, and the surface renders its ordinary summary.
    expect(selectZeroDayLine({ ...base, confirmedContributionCount: 1 })).toBeNull()
    // ⚠⛔ **THE WIRE-TOKEN VOCABULARY** — `verified`, ⛔ never `settled` (a POOL STATE).
    expect(selectZeroDayLine({ ...base, status: 'verified' })).toBeNull()
    expect(selectZeroDayLine({ ...base, status: 'closed' })).toBeNull()
  })

  it('⭐ the keys are CONSUMED BY NAME from `sahyog-shared` — ⛔ never minted, ⛔ never translated', () => {
    // ⭐ `2026-09-07-206` **cl.4**: the Panel GAVE this wording, in BOTH languages, when a code review
    // showed them what a drive renders on its first day. ⛔ `-193` cl.3 — ONE shared source.
    expect(screenCode).toContain("'zero_line.full'")
    expect(screenCode).toContain("'zero_line.no_family'")
    for (const locale of LOCALES) {
      expect(getCatalog(locale, SHARED)?.['zero_line.full']).toBeTruthy()
      expect(getCatalog(locale, SHARED)?.['zero_line.no_family']).toBeTruthy()
      // ⛔ The no-family arm carries ⛔ NO `{family_name}` token left to throw on.
      expect(getCatalog(locale, SHARED)?.['zero_line.no_family']).not.toContain('{family_name}')
    }
    // ⛔⛔ AND THE SURFACE MINTS ⛔ NO SECOND SET — a zero-day key in its OWN namespace would be the
    // two-source defect `-193` cl.3 exists to close.
    const own = getCatalog('en', NS) ?? {}
    expect(Object.keys(own).filter((k) => k.startsWith('zero_line'))).toEqual([])
  })

  it('⛔ the PERCENTAGE is ⛔ NOT suppressed at zero', () => {
    // ⚠⛔ The public meter renders at 0 too ⇒ hiding it here would put the member **BELOW** the public
    // and break `-189` cl.3 in the OTHER direction.
    expect(screenCode).toContain('detail.confirmedPercentage === null')
    expect(screenCode).not.toMatch(/confirmedPercentage\s*(===|==)\s*0/)
    expect(screenCode).not.toMatch(/confirmedPercentage\s*(>|>=)\s*0\s*\?/)
  })

  it('⭐ the ACCESSIBLE NAME obeys the SAME softening the sighted copy does', () => {
    // ⚠⛔ Story E's FOURTH pass found a screen-reader member still hearing *"0 contributions
    // confirmed. ₹0 contributed so far."* on a row whose sighted copy the Panel had SOFTENED.
    // ⭐ **THE INVARIANT TRAVELS; THOSE KEYS DO ⛔ NOT** — `row.a11y.zero*` are
    // `member-drive-list`-namespaced ROW strings.
    expect(screenCode).not.toContain("'row.a11y")
    // ⭐ The accessible summary is BUILT FROM the same computed strings, and the count line is added
    // ⛔ ONLY off the zero-day path — so the softened copy is what a screen reader hears too.
    expect(screenCode).toContain('const screenA11y = [')
    expect(screenCode).toContain("zeroDay === null ? t('value.contributions_count'")
  })
})

describe('⭐⭐ AC10 — the Panel\'s message block and its table', () => {
  it('⭐ all EIGHT keys resolve in BOTH locales — ⛔ never authored at a render site', () => {
    const KEYS = [
      'message_block.headline.full',
      'message_block.headline.no_family',
      'message_block.solidarity',
      'message_block.gratitude',
      'message_block.tagline',
      'message_block.join',
      'message_block.table.nominee_name',
      'message_block.table.district',
    ]
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        expect(getCatalog(locale, SHARED)?.[key], `${locale}/${key}`).toBeTruthy()
      }
    }
    // ⭐ Shipped by `11b-19` (`done`); this surface CONSUMES them. ⚠ If a key were absent that is a
    // **STOP**, ⛔ not a licence to author copy at a render site.
    const own = getCatalog('en', NS) ?? {}
    expect(Object.keys(own).filter((k) => k.startsWith('message_block'))).toEqual([])
  })

  it('⭐⭐ (2) the HEADLINE VARIANT is chosen on NULLABILITY, and ⛔ ONLY the headline varies', () => {
    const live = { status: 'live' as const, amountRaisedInr: 19_45_000, deceasedMemberName: 'R K Sharma' }
    expect(selectMessageBlockHeadline(live)).toEqual({
      key: 'message_block.headline.full',
      familyName: 'R K Sharma',
    })
    expect(selectMessageBlockHeadline({ ...live, deceasedMemberName: null })).toEqual({
      key: 'message_block.headline.no_family',
    })
    // ⭐ The other four paragraphs are **TOKEN-FREE BY DESIGN** — ⛔ `{family_name}` is the ONLY
    // omittable token in the whole block, and it appears ⛔ only in the headline.
    for (const locale of LOCALES) {
      for (const key of ['message_block.solidarity', 'message_block.gratitude', 'message_block.tagline', 'message_block.join']) {
        expect(getCatalog(locale, SHARED)?.[key]).not.toMatch(/\{\w+\}/)
      }
    }
  })

  it('⭐⭐ (3) there is ⛔ NO `no_amount` VARIANT — where the amount is unavailable the block renders NOTHING', () => {
    // ⭐ `2026-09-08-207` **cl.2**, the ₹0-silence rule AC9 also carries. ⛔ It does ⛔ not fall back.
    const live = { status: 'live' as const, amountRaisedInr: 0, deceasedMemberName: 'R K Sharma' }
    expect(selectMessageBlockHeadline(live)).toBeNull()
    expect(selectMessageBlockHeadline({ ...live, status: 'verified' })).toBeNull()
    // ⛔ And ⛔ no such key exists to fall back TO.
    for (const locale of LOCALES) {
      expect(getCatalog(locale, SHARED)?.['message_block.headline.no_amount']).toBeUndefined()
    }
  })

  it('⭐⭐ (1) `{amount}` ARRIVES ALREADY FORMATTED — ⛔ the render adds ⛔ no literal ₹', () => {
    // ⚠⛔ Adding one ships **₹₹**. ⭐ Proven end-to-end: the resolved string carries EXACTLY ONE ₹.
    const rendered = t(
      'message_block.headline.full',
      { family_name: 'R K Sharma', amount: '₹19,45,000' },
      { locale: 'en', namespace: SHARED },
    )
    expect(rendered.match(/₹/g)).toHaveLength(1)
    expect(screenCode).not.toMatch(/['"`]₹\$\{/)
  })

  it('⭐⭐ (4) an ABSENT `district` DROPS ITS COLUMN — ⛔ never a placeholder, ⛔ never mis-attributed', () => {
    // ⭐ `-214` **Consequence 6** (§10.2 ruling 3 — an absent token DROPS ITS CLAUSE).
    const full = { nomineeName: 'Sunita Devi', district: 'Patna', deceasedMemberName: 'R K Sharma' }
    expect(selectMessageBlockTableColumns(full).map((c) => c.labelKey)).toEqual([
      'message_block.table.nominee_name',
      'message_block.table.district',
    ])
    expect(selectMessageBlockTableColumns({ ...full, district: null }).map((c) => c.labelKey)).toEqual([
      'message_block.table.nominee_name',
    ])
    // ⚠⛔⛔ **AND IT DROPS WHEN THE *DECEASED* IS ABSENT TOO** — ⭐ B's own non-obvious call, copied and
    // ⛔ not re-derived: *"who served in … district"* modifies the **DECEASED MEMBER**, so a District
    // column standing beside a NOMINEE's name with the deceased absent **MIS-ATTRIBUTES the posting**.
    expect(
      selectMessageBlockTableColumns({ ...full, deceasedMemberName: null }).map((c) => c.labelKey),
    ).toEqual(['message_block.table.nominee_name'])
    // ⭐ And with nothing to tabulate, `[]` — ⛔ never a table of placeholders.
    expect(selectMessageBlockTableColumns({ nomineeName: null, district: null, deceasedMemberName: null })).toEqual([])
  })

  it('⛔⛔ ⛔ NO KEY ASSERTS THE NOMINEE RELATIONSHIP — ⭐ they are LABELS, ⛔ not assertions', () => {
    // ⭐ `-214` **Consequence 8**. The value behind *"Nominee full name"* is
    // `account_holder_name_ciphertext`, and `D5-subject (i)` records that **the SCHEMA is the
    // authority** (⛔ no FK, ⛔ no `nominee_rank`, ⛔ no match rule — `#decision-2026-09-13-215`).
    // ⇒ ⛔ ⛔ nothing may say the person *"is the nominee of"* anyone.
    for (const locale of LOCALES) {
      for (const key of ['message_block.table.nominee_name', 'message_block.table.district']) {
        expect(getCatalog(locale, SHARED)?.[key]).not.toMatch(/nominee of|की नॉमिनी|के नॉमिनी/i)
      }
    }
    // ⭐ And the surface's own bank copy makes ⛔ no relationship claim either.
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(getCatalog(locale, NS) ?? {})) {
        if (key.startsWith('$comment')) continue
        expect(value, `${locale}/${key}`).not.toMatch(/nominee of/i)
      }
    }
  })

  it('⭐ the TABLE sits ABOVE the message (§8.1), and the block is a PAGE, ⛔ not an index cell', () => {
    const tableAt = screenCode.indexOf('messageTableColumns.map')
    const headlineAt = screenCode.indexOf('messageHeadline.key ===')
    expect(tableAt).toBeGreaterThan(-1)
    expect(headlineAt).toBeGreaterThan(-1)
    expect(tableAt).toBeLessThan(headlineAt)
  })
})

describe('⭐ AC11 — family 13, in full', () => {
  it('⛔⛔ every `accessibilityLabel` sits on an element that is EXPLICITLY `accessible`', () => {
    // ⚠ A tamagui `<Button>` is `styled(View, …)` and `@tamagui/web`'s `createComponent.native.js`
    // sets `accessible` ⛔ NOWHERE ⇒ it is a plain RN `View`, and an RN `View` is ⛔ not an
    // accessibility element unless it says so. ⛔ Do ⛔ not assume `Pressable` semantics.
    const lines = screen.split('\n')
    const labelLines = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /accessibilityLabel=/.test(l) && !/^\s*(\/\/|\*)/.test(l))
    expect(labelLines.length).toBeGreaterThan(2)
    for (const { i } of labelLines) {
      let open = -1
      for (let j = i; j >= 0; j -= 1) {
        if (/^\s*<[A-Z][A-Za-z]*/.test(lines[j] as string)) {
          open = j
          break
        }
      }
      expect(open, `no opening tag found above line ${String(i + 1)}`).toBeGreaterThanOrEqual(0)
      const attrBlock = lines.slice(open, i + 1).join('\n')
      expect(
        /\baccessible\b(\s*=\s*\{true\})?/.test(attrBlock),
        `line ${String(i + 1)} carries accessibilityLabel on an element with no explicit \`accessible\` — the label will never be announced`,
      ).toBe(true)
    }
  })

  it('⛔⛔ every CONTROL is a SIBLING of a labelled container, ⛔ never a descendant', () => {
    // ⚠⛔⛔ **THE CHECKLIST'S OWN 13(a) IS WRONG AND HAS ⛔ NOT BEEN SWEPT THERE.** It reads,
    // unqualified, *"a container carrying `accessibilityLabel` is explicitly `accessible={true}`"* —
    // ⭐ story E's THIRD pass **disproved** it at `MemberDriveList.tsx:233-240`: an `accessible`
    // container **COLLAPSES ITS WHOLE SUBTREE INTO ONE ELEMENT**, so a nested Button's own
    // `accessible`, role, label and handler become **UNREACHABLE**. ⛔ Following it would have made
    // **AC8's control unreachable**. ⇒ ⭐ label the **LEAVES**.
    // ⭐ ASSERTED STRUCTURALLY, BY ELEMENT EXTENT: for every element that carries an
    // `accessibilityLabel`, ⛔ no `<Button>` may appear between its opening tag and its matching
    // close.
    //
    // ⚠⛔⛔ **THE FIRST VERSION OF THIS ASSERTION WAS ⛔ VACUOUS, AND IT WAS FOUND BY A PLANTED PROBE
    // — ⛔ NOT BY READING A GREEN RUN.** It tracked a running `depth` and recorded `labelledDepth` at
    // the LINE carrying the label; ⛔ but this codebase formats JSX attributes across MULTIPLE LINES,
    // so the container's own `<YStack` had ALREADY incremented `depth` several lines earlier ⇒
    // `labelledDepth` was the depth INSIDE the container, a nested `<Button>` sat at that same depth,
    // and `depth > labelledDepth` was ⛔ never true. ⭐ A `<Button>` planted inside a labelled
    // container passed. ⛔ Recorded rather than quietly rewritten
    // ([[feedback_record_unattested_no_backfill]]) — it is the exact defect
    // [[feedback_gate_scope_semantic_coverage]] names: a green scan that asserts nothing.
    //
    // ⭐ **THE WORKING SHAPE** is the one the sibling assertion above already uses: walk UP to the
    // element's own opening tag, then bound the element by its **matching close at the same
    // indentation** — which this repo's formatter makes exact.
    const lines = screenCode.split('\n')
    const violations: string[] = []
    for (let i = 0; i < lines.length; i += 1) {
      if (!/accessibilityLabel=/.test(lines[i] as string)) continue
      // ⭐ The element's OPENING TAG — walking up, exactly as the `accessible`-presence check does.
      let open = -1
      for (let j = i; j >= 0; j -= 1) {
        if (/^\s*<[A-Z][A-Za-z]*/.test(lines[j] as string)) {
          open = j
          break
        }
      }
      if (open < 0) continue
      const openLine = lines[open] as string
      const tag = /^\s*<([A-Z][A-Za-z]*)/.exec(openLine)?.[1]
      const indent = /^(\s*)/.exec(openLine)?.[1]?.length ?? 0
      if (tag === undefined) continue
      // ⭐ A self-closing element has ⛔ no children to collapse — skip it rather than mis-bound it.
      let close = -1
      for (let j = open + 1; j < lines.length; j += 1) {
        const line = lines[j] as string
        const closeIndent = /^(\s*)/.exec(line)?.[1]?.length ?? 0
        if (new RegExp(`^\\s*</${tag}>`).test(line) && closeIndent === indent) {
          close = j
          break
        }
      }
      if (close < 0) continue
      for (let j = open + 1; j < close; j += 1) {
        if (/<Button\b/.test(lines[j] as string)) {
          violations.push(`<${tag}> opened at line ${String(open + 1)} wraps a <Button> at line ${String(j + 1)}`)
        }
      }
    }
    expect(
      violations,
      'a <Button> sits INSIDE an accessibilityLabel-bearing container — the container COLLAPSES its ' +
        "whole subtree into ONE element, so the button's own `accessible`, role, label and handler " +
        'become UNREACHABLE (story E\'s THIRD-pass finding at MemberDriveList.tsx:233-240, the one ' +
        "that disproves the checklist's own 13(a)). Label the LEAVES: " +
        violations.join('; '),
        ).toEqual([])
  })

  it('⛔⛔ `ANONYMIZED_SENTINEL` ⛔ NEVER renders — and the remedy is the DRIVE LIST\'s, ⛔ not the contributor list\'s', () => {
    // ⭐ The API resolves the sentinel to `null` (asserted live in
    // `apps/api/tests/integration/contributions/member-drive-detail.spec.ts`), and this screen's
    // nameless fallback carries it: the DRIVE STAYS, the NAME GOES.
    // ⚠⛔ **⛔ NOT the contributor list's remedy (omit the row)** — here the erased member ⭐ **IS** the
    // drive, so omitting it would hide a WHOLE DRIVE from every member of the Pariwar.
    expect(screenCode).toContain('detail.deceasedMemberName ?? detail.poolLetterCode')
    // ⛔ And the screen never hard-codes the sentinel string as something to display.
    expect(screenCode).not.toContain('[anonymized]')
  })

  it('⭐ the three states announce themselves — loading · error · not-found', () => {
    expect(screenCode).toContain('accessibilityLiveRegion="polite"')
    for (const key of ['loading', 'error', 'error.retry', 'not_found', 'back', 'back_a11y']) {
      for (const locale of LOCALES) {
        expect(t(key, undefined, { locale, namespace: NS }), `${locale}/${key}`).toBeTruthy()
      }
    }
    // ⚠⛔⛔ **THE 404 IS REPORTED EXACTLY LIKE ITS FOUR SIBLINGS** — no such drive · not visible at this
    // predicate · malformed token · real drive wrong token · ⭐ ANOTHER PARIWAR'S DRIVE. ⛔ The copy
    // must ⛔ NOT distinguish them, and there is ⛔ no "you don't have access" branch: a surface that
    // separated them would be an **ENUMERATION ORACLE**.
    for (const locale of LOCALES) {
      expect(t('not_found', undefined, { locale, namespace: NS })).not.toMatch(/permission|access|अनुमति|पहुँच/i)
    }
    expect(screenCode).not.toMatch(/statusCode === 403|status === 403/)
  })
})

describe('⭐ the outcome framing maps EXHAUSTIVELY — ⛔ a widened enum fails at BUILD time', () => {
  it('⭐ all three, and a fourth THROWS', () => {
    // ⚠⛔ `t()` THROWS on an unresolved key, which would crash the WHOLE page ⇒ the `never` guard is
    // the load-bearing half, ⛔ not the mapping.
    expect(detailOutcomeFramingKey('fully_funded')).toBe('outcome.fully_funded')
    expect(detailOutcomeFramingKey('partial')).toBe('outcome.partial')
    expect(detailOutcomeFramingKey('under_funded')).toBe('outcome.under_funded')
    expect(() => detailOutcomeFramingKey('mystery' as 'partial')).toThrow(/unhandled funding outcome/)
    for (const locale of LOCALES) {
      for (const o of ['fully_funded', 'partial', 'under_funded'] as const) {
        expect(t(detailOutcomeFramingKey(o), undefined, { locale, namespace: NS })).toBeTruthy()
      }
    }
  })

  it('⭐ the framing renders ⛔ ONLY off-`live` — ⛔ "the cycle closed" mid-window would be FALSE', () => {
    expect(screenCode).toContain('detail.fundingOutcome === null || isLive')
  })
})

describe('⭐ the query hook — the 404 is an ANSWER, ⛔ not a transient fault', () => {
  it('⛔ `retry: false`, and ⛔ NO `placeholderData` that turns a failure into a blank drive', () => {
    const hookCode = code(hook)
    expect(hookCode).toContain('retry: false')
    expect(hookCode).not.toContain('placeholderData')
    // ⭐⭐ AND THE RESPONSE IS ⛔ NOT RETAINED — `gcTime: 0` keeps the largest Tier-1 payload in this app
    // out of the MMKV blob. ⚠⛔ A NARROW, surface-local mitigation of a **repo-wide, pre-existing** gap
    // (`deferred-work.md`'s persisted-query-cache item, whose DPDPA trigger this story records as
    // **FIRED**) — ⛔ it does ⛔ NOT close that item.
    expect(hookCode).toContain('gcTime: 0')
  })
})
