/**
 * ⭐⭐ Story 11b.20 — THE RATIFIED §8.1 MESSAGE BLOCK ON THE PUBLIC SAHYOG VIVRAN PAGE.
 *
 * ⭐ Authority: `#decision-2026-09-11-214` **Consequence 3** (the public render). The copy is Story
 * 11b.19's, in `sahyog-shared`, and is resolved here BY NAME — ⛔ no string is authored, derived or
 * translated in this file (`-193` cl.3, `-206` cl.1).
 *
 * ⭐ This module is the page's whole decision about the block, kept PURE so a test can call it:
 * `.astro` files are not unit-testable in this repo, and `scrape-test.spec.ts` synthesises its HTML from
 * field ids, so it ⛔ never sees this block's text.
 *
 * ⚠⛔ The file name carries `sahyog-vivran` ON PURPOSE: it keeps the module inside the financial-truth
 * gate's scope safeguard (`scripts/sahyog-vivran-financial-truth/check.ts`), where it is registered with
 * `renderPath: true`. ⛔ Rename it without that and the gate stops seeing it.
 *
 * ⛔ The amount is `amountRaisedInr`, the ruled wire figure (`-190` cl.6), formatted and ⛔ never
 * re-derived: no product, no presenter, and ⛔ never the target or its factors (Trap 2).
 */

import { formatCurrency, t, type Locale } from '@twt/i18n';

/** The raw wire values the block reads, plus the matrix verdict for each (AC8(iv)). */
export interface SahyogVivranMessageBlockInput {
  /** `PublicSahyogVivranEntry.amountRaisedInr` — the RAW number, ⛔ never the labelled "₹ X raised". */
  readonly amountRaisedInr: number;
  readonly deceasedMemberName: string | null;
  /** The RAW nullable district — ⛔ never a value that already had "Not recorded" applied. */
  readonly district: string | null;
  /** The FIRST account's `accountHolderName` (the `resolveSummaryNomineeName` precedent). */
  readonly nomineeName: string | null;
  /**
   * `visibilityOf('sahyog-vivran', <field>, 'public').visible` for the four fields the block shows.
   * ⭐ Each verdict is HONOURED here, ⛔ never thrown on: a suppressed amount drops the whole block
   * (both headlines carry `{amount}`, and `-216` rules out a no-amount variant); a suppressed name
   * reads as no name; a suppressed table field drops its column.
   */
  readonly visible: {
    readonly amount: boolean;
    readonly deceasedName: boolean;
    readonly nomineeName: boolean;
    readonly district: boolean;
  };
}

export type SahyogVivranMessageBlockHeadline =
  | { readonly key: 'message_block.headline.full'; readonly familyName: string }
  | { readonly key: 'message_block.headline.no_family' };

export interface SahyogVivranMessageBlockColumn {
  readonly labelKey: 'message_block.table.nominee_name' | 'message_block.table.district';
  /** The EXISTING matrix field id the cell renders through — ⛔ no new id is minted (AC8(iii)). */
  readonly field: 'nominee_account_holder_name' | 'district';
  readonly value: string;
}

export interface SahyogVivranMessageBlock {
  readonly amountRaisedInr: number;
  readonly headline: SahyogVivranMessageBlockHeadline;
  /** Left to right. `[]` ⇒ the page renders ⛔ no table at all. */
  readonly columns: readonly SahyogVivranMessageBlockColumn[];
}

/** The four name-free §8.1 paragraphs after the headline, in order. Bare literals only (AC2). */
export const SAHYOG_VIVRAN_MESSAGE_BLOCK_BODY_KEYS = [
  'message_block.solidarity',
  'message_block.gratitude',
  'message_block.tagline',
  'message_block.join',
] as const;

/**
 * ⭐ The `Nominee full name` | `District` table above the message (§8.1).
 *
 * ⚠⛔ An absent token DROPS ITS COLUMN (`-214` Consequence 6, §10.2 ruling 3) — ⛔ never "Not recorded",
 * ⛔ never a placeholder. ⭐ And the District travels with the DECEASED: *"who served in … district"*
 * describes the deceased member, so a District column beside the holder's name with the deceased
 * absent would attribute the posting to the wrong person. ⇒ it drops when EITHER is absent (the member
 * `selectMessageBlockTableColumns` precedent).
 * ⚠⛔ They are LABELS, ⛔ not claims (`-214` Consequence 8): the value is the disbursement account
 * holder, and ⛔ nothing here says that person *"is the nominee of"* anyone.
 */
function selectColumns(
  nomineeName: string | null,
  district: string | null,
  familyName: string | null,
): SahyogVivranMessageBlockColumn[] {
  const columns: SahyogVivranMessageBlockColumn[] = [];
  if (nomineeName !== null) {
    columns.push({
      labelKey: 'message_block.table.nominee_name',
      field: 'nominee_account_holder_name',
      value: nomineeName,
    });
  }
  if (district !== null && familyName !== null) {
    columns.push({ labelKey: 'message_block.table.district', field: 'district', value: district });
  }
  return columns;
}

/**
 * ⭐ Decides the block, or `null` for "render nothing". ⚠ THE ORDER IS LOAD-BEARING:
 *   (1) ₹0 — `amountRaisedInr <= 0` ⇒ `null`, on every stage, table included (`-216` cl.1).
 *       ⛔ There is no `no_amount` variant and ⛔ none may be added.
 *   (2) no displayable name ⇒ `no_family` (`-223` cl.1; `-214` Consequence 5: `t()` THROWS on an
 *       unsupplied `{family_name}`, and this block is page-shaped).
 *   (3) otherwise `.full` with the name.
 * ⚠ If (1) and (2) were swapped, a ₹0 unnamed drive would render the block `-216` silences.
 * ⛔ A null name carries ⛔ no cause, and ⛔ nothing here may suggest one (`-160` cl.6).
 */
export function selectSahyogVivranMessageBlock(
  input: SahyogVivranMessageBlockInput,
): SahyogVivranMessageBlock | null {
  if (!input.visible.amount) return null;
  if (input.amountRaisedInr <= 0) return null;

  const familyName = input.visible.deceasedName ? input.deceasedMemberName : null;
  const columns = selectColumns(
    input.visible.nomineeName ? input.nomineeName : null,
    input.visible.district ? input.district : null,
    familyName,
  );
  const amountRaisedInr = input.amountRaisedInr;

  if (familyName === null) return { headline: { key: 'message_block.headline.no_family' }, columns, amountRaisedInr };
  return { headline: { key: 'message_block.headline.full', familyName }, columns, amountRaisedInr };
}

export interface SahyogVivranMessageBlockCopy {
  readonly headline: string;
  readonly paragraphs: readonly string[];
  readonly columns: readonly {
    readonly field: SahyogVivranMessageBlockColumn['field'];
    readonly label: string;
    readonly value: string;
  }[];
}

/**
 * ⭐ Resolves the decided block through the real `t()`, in `sahyog-shared`.
 * ⚠⛔ `{amount}` is `formatCurrency(…, 'en')` and ALREADY carries its ₹ ⇒ ⛔ never add a literal one
 * (it would ship `₹₹`). Latin numerals in both locales, as every other amount on this page.
 */
export function resolveSahyogVivranMessageBlockCopy(
  block: SahyogVivranMessageBlock,
  locale: Locale,
): SahyogVivranMessageBlockCopy {
  const opts = { locale, namespace: 'sahyog-shared' } as const;
  const amount = formatCurrency(block.amountRaisedInr, 'en');
  const headline =
    block.headline.key === 'message_block.headline.full'
      ? t('message_block.headline.full', { family_name: block.headline.familyName, amount }, opts)
      : t('message_block.headline.no_family', { amount }, opts);
  return {
    headline,
    paragraphs: SAHYOG_VIVRAN_MESSAGE_BLOCK_BODY_KEYS.map((key) => t(key, undefined, opts)),
    columns: block.columns.map((column) => ({
      field: column.field,
      label: t(column.labelKey, undefined, opts),
      value: column.value,
    })),
  };
}
