// packages/i18n/src/currency.ts
//
// Rupee currency formatting with Indian (lakh/crore) digit grouping (Story 2.1, AC6).
//
// Indian grouping clusters the LAST three digits, then in twos: 4588000 → "45,88,000",
// 100000 → "1,00,000". The grouping is hand-rolled (not Intl.NumberFormat) so the
// output is deterministic and identical across Node / Hermes (RN) / edge, where Intl
// data availability varies.
//
// ── Amendment-A2 contract ─────────────────────────────────────────────────────────
// `formatCurrency` is locale-PARAMETRIC (it can emit Devanagari numerals), but currency
// amounts are OPERATIONAL data: per amendment-A2 they MUST render Latin. So callers
// format operational amounts with `formatCurrency(amount, 'en')` even inside a Hindi
// UI ("₹ 45,88,000"). The `'hi'` (Devanagari) form exists only for the narrow
// ceremonial-prose case; do not use it for ledgers, stat-strips, or pool figures.

import type { Locale } from './locale.js';
import { toHindiNumeral } from './number.js';

/** Group an integer-digit string with Indian (lakh/crore) separators. */
function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * Format `amount` as `₹` with Indian lakh/crore grouping and locale-aware numerals.
 * Whole amounts drop the decimal ("₹ 110"); fractional amounts keep two places
 * ("₹ 99.50"). Negative amounts prefix a minus ("-₹ 110").
 *
 * Per amendment-A2, pass `'en'` for operational figures (Latin numerals); `'hi'`
 * (Devanagari) is for ceremonial prose only.
 */
export function formatCurrency(amount: number, locale: Locale): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`[i18n] formatCurrency requires a finite amount, received ${String(amount)}`);
  }
  // ⚠⛔⛔ **`9e13`, ⛔ NOT `1e15` — the SIBLING FIX, propagated (FOURTH review pass, 2026-09-08).**
  // ⭐ This function has the IDENTICAL `Math.abs(amount) * 100` idiom below, and the third pass fixed
  // the bound in {@link formatCurrencyShort} while **deleting the *"like `formatCurrency`"*
  // cross-reference** rather than propagating it — leaving the sibling silently corrupting across
  // `[9.007e13, 1e15)`, with the one line that pointed a reader at it gone.
  // ⭐ `Number.MAX_SAFE_INTEGER` is `9.007e15` ⇒ the amount must stay under `≈9.007e13`; `9e13` is
  // that, rounded down to a legible figure. ⚠ This is a LIVE path — `formatSahyogLiveAmount`'s
  // exact-below-₹10-lakh arm routes here — and every real caller is orders of magnitude inside it.
  if (Math.abs(amount) >= 9e13) {
    throw new Error(
      `[i18n] formatCurrency: amount exceeds supported range (±9e13, the safe-integer bound for amount * 100), received ${String(amount)}`,
    );
  }

  const negative = amount < 0;
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const [intPart = '0', fracPart = '00'] = rounded.toFixed(2).split('.');

  const grouped = groupIndian(intPart);
  const body = fracPart === '00' ? grouped : `${grouped}.${fracPart}`;
  const digits = locale === 'hi' ? toHindiNumeral(body) : body;

  return `${negative ? '-' : ''}₹ ${digits}`;
}

/**
 * ⭐⭐ THE SHORT MONEY FORM — `₹ 19.45 lakh` / `₹ 19.45 लाख`. Story 11b.14, Trustee-ratified
 * 2026-09-07 (DR + KB); recorded at `2026-09-07-204`.
 *
 * ⚠⛔ **IT DID ⛔ NOT EXIST BEFORE.** `"lakh"`, `"लाख"`, `"हज़ार"` and `"crore"` appeared in ⛔ ZERO
 * copy or code files in this repository, and {@link formatCurrency} emits only the grouped form.
 * ⇒ ⛔ the word-form and its rounding rule are BOTH new, and both are RULED — ⛔ neither is a
 * developer's choice.
 *
 * ⭐ **THE RULE, verbatim:**
 *  · *"Cut off at **Exactly** ten lakh"* ⇒ ⛔⛔ **TRUNCATE, ⛔ NEVER round up.** `₹19,45,678` is
 *    `19.45 lakh`, ⛔ never `19.46` — the figure must ⛔ never overstate what has been contributed.
 *  · **Trailing zeros trimmed** — `₹ 50 lakh`, ⛔ never `₹ 50.00 lakh`.
 *  · **lakh becomes crore at ₹1 crore** — the natural join. `MAX_DRIVE_TARGET_INR` is ₹10 crore,
 *    so crore is reachable.
 *
 * ⭐⭐ **THE HINDI ARM TAKES THE HINDI WORD AND ⛔ LATIN DIGITS**, and that is the **amendment-A2**
 * contract stated at the top of this file: money is OPERATIONAL data. ⛔ It does ⛔ NOT call
 * `toHindiNumeral`, and it is ⛔ NOT the `'hi'` arm of {@link formatCurrency} — which exists only for
 * ceremonial prose and would emit `₹ १९.४५`. ⭐ The Panel's own ratified string writes `19.45 लाख`.
 *
 * ⚠ **THE SPACING MATCHES {@link formatCurrency} DELIBERATELY** (`₹ ` with a space). The routing note
 * writes `₹19.45 lakh` in shorthand prose, ⛔ but the two forms appear on the SAME page — Closed rows
 * carry the exact form and Live rows the short one — and two rupee spacings on one page is the
 * *"two money formats"* defect the follow-up warned of. ⇒ ⭐ ONE house form.
 *
 * ⛔ Refuses a negative amount: there is no ruled short form for one, and every caller is a total.
 */
export function formatCurrencyShort(amount: number, locale: Locale): string {
  if (!Number.isFinite(amount)) {
    throw new Error(
      `[i18n] formatCurrencyShort requires a finite amount, received ${String(amount)}`,
    );
  }
  // ⛔ INTEGER RUPEES ONLY — the `amount * 100` truncation math below is EXACT only for integers,
  // and every caller passes a whole-rupee total. Its sibling `formatCount` guards the same way.
  if (!Number.isInteger(amount)) {
    throw new Error(
      `[i18n] formatCurrencyShort requires an integer amount (whole INR), received ${String(amount)}`,
    );
  }
  if (amount < 0) {
    throw new Error(
      `[i18n] formatCurrencyShort refuses a negative amount, received ${String(amount)}`,
    );
  }
  // ⛔ UPPER BOUND — past this, `amount * 100` leaves the safe-integer range and the truncation
  // silently corrupts.
  //
  // ⚠⛔⛔ **`9e13`, ⛔ NOT `1e15` — CORRECTED in Story 11b.14's THIRD review pass (2026-09-08).** The
  // first version copied {@link formatCurrency}'s `1e15` and inherited its looseness while asserting
  // a property that threshold does ⛔ not deliver: **`1e14 × 100 = 1e16` ALREADY EXCEEDS
  // `Number.MAX_SAFE_INTEGER` (9.007e15)** — executed, ⛔ not reasoned. ⇒ the sound bound is
  // `MAX_SAFE_INTEGER / 100 ≈ 9.007e13`; `9e13` is that, rounded down to a legible figure.
  // ⭐ Every real caller is orders of magnitude inside it — see the scale-first note below.
  if (amount >= 9e13) {
    throw new Error(
      `[i18n] formatCurrencyShort: amount exceeds supported range (9e13, the safe-integer bound for amount * 100), received ${String(amount)}`,
    );
  }

  const CRORE = 10_000_000;
  const LAKH = 100_000;
  // ⚠⛔ **THE SHORT FORM STARTS AT ₹1 LAKH — ⛔ never below** (Review finding, 2026-09-08).
  // `formatCurrencyShort(300)` used to return `₹ 0 lakh` — a false zero for a real figure. The
  // ruled sub-lakh form is EXACT (`2026-09-07-206` cl.3: `Expected: ₹ 300`) and is the caller's job
  // (`formatSahyogTargetAmount`); this primitive refuses the input rather than mis-state it, the
  // same way it already refuses a negative. `0` is left alone deliberately — `₹ 0 lakh` for `0` is
  // not a false statement, and the zero-state copy (`-206` cl.4) never routes through here.
  if (amount > 0 && amount < LAKH) {
    throw new Error(
      `[i18n] formatCurrencyShort has no sub-₹1-lakh form; the caller must use the exact form below ₹1,00,000, received ${String(amount)}`,
    );
  }
  const useCrore = amount >= CRORE;
  const divisor = useCrore ? CRORE : LAKH;
  const unit = useCrore
    ? locale === 'hi'
      ? 'करोड़'
      : 'crore'
    : locale === 'hi'
      ? 'लाख'
      : 'lakh';

  // ⛔ TRUNCATION, ⛔ not rounding — see the rule above. `Math.floor` on the scaled value is what
  // makes `19,45,999` render `19.45`; `toFixed(2)` alone would round it UP to `19.46`.
  //
  // ⚠⛔⛔ **SCALE FIRST, DIVIDE SECOND — ⛔ AND THE ORDER IS THE WHOLE FIX** (Review finding,
  // 2026-09-07). ⛔ The prior text of this line was `Math.floor((amount / divisor) * 100)`, which
  // divides in IEEE-754 **before** scaling: the quotient lands a hair below the true value and
  // `Math.floor` then eats a whole hundredth. ⭐ **Executed, ⛔ not reasoned — 570 mismatches in a
  // ₹10L–₹10Cr sweep:** `₹10,03,000` rendered `₹ 10.02 lakh`, `₹10,20,000` rendered `₹ 10.19 lakh`,
  // `₹2,01,000` rendered `₹ 2 lakh` (⛔ the fraction vanished), and `₹1,13,00,000` rendered
  // `₹ 1.12 crore` — ⚠ an error of **₹1,00,000** in the crore band.
  // ⭐ `amount * 100` is EXACT for every reachable input: callers pass integer paise-free rupees.
  //
  // ⚠⛔ **AMENDED 2026-09-08 (third review pass) — ⛔ the prior justification covered only ONE of the
  // two callers** ([[feedback_supersede_never_reinterpret]]).
  // It read: *"`MAX_DRIVE_TARGET_INR` is ₹10 crore ⇒ ⛔ the product cannot exceed 1e9 × 100 = 1e11"*.
  // ⚠⛔ **TWO CORRECTIONS TO THAT SENTENCE, ⭐ both named rather than silently dropped (FOURTH pass):**
  // ⭐ (i) the CONSTANT was ⛔ not wrong — `MAX_DRIVE_TARGET_INR` was the correct bound for the target
  // path when the line was written; the third pass's amend overstated the charge. ⭐ (ii) its
  // ARITHMETIC is wrong and is carried forward here **flagged**: ₹10 crore is `1e8`, ⛔ not `1e9`, so
  // the product it describes is `1e10`, ⛔ not `1e11`. ⛔ Do ⛔ not inherit that figure.
  // ⛔ What IS the defect: that bound covers the **target** path only; the other live caller is
  // `formatSahyogLiveAmount`
  // (`apps/public/src/lib/sahyog-render.ts`), which passes `amountRaisedInr`, whose contract is
  // `z.number().int().nonnegative()` — **unbounded**. ⇒ ⭐ **the real guarantee is the `9e13` guard
  // above**, which every caller passes through unconditionally, and the two known ceilings sit far
  // inside it: `MAX_DERIVED_DRIVE_TARGET_INR` is ₹1,000 crore (`1e10`) for the derived लक्ष्य, and
  // `MAX_DRIVE_TARGET_INR` ₹10 crore for the admin-typed one.
  // ⛔ Do ⛔ not "simplify" this back to dividing first.
  // ⚠ Every value in `currency-short.test.ts` was float-exact, so the suite was **GREEN on a broken
  // function** — ⭐ the mismatching values are now pinned there by name.
  const truncatedHundredths = Math.floor((amount * 100) / divisor);
  const whole = Math.floor(truncatedHundredths / 100);
  const hundredths = truncatedHundredths % 100;
  // Trailing zeros trimmed: `50` → "50", `50.10` → "50.1", `19.45` → "19.45".
  const fraction =
    hundredths === 0 ? '' : `.${String(hundredths).padStart(2, '0').replace(/0$/, '')}`;

  return `₹ ${groupIndian(String(whole))}${fraction} ${unit}`;
}

/**
 * ⭐ A COUNT — Indian grouping, ⛔ no `₹`, ⛔ no short form, in BOTH locales.
 *
 * ⚠⛔ **COUNTS ARE ALWAYS EXACT, AT EVERY SIZE** — *"For colleagues shows exact number"*
 * (Trustee-ratified 2026-09-07). ⇒ ⭐ the Panel's earlier Hindi *"43 हज़ार"* word-form is **DROPPED**,
 * and the EN/HI asymmetry in the two ratified strings is resolved: both render `43,000`.
 *
 * ⭐⭐ **IT TAKES ⛔ NO LOCALE, AND THAT IS THE CONTRACT MADE STRUCTURAL.** A count is OPERATIONAL
 * data and renders **LATIN in both locales** (amendment-A2, this file's header) — ⇒ a `locale`
 * parameter would imply a per-locale difference that does ⛔ not exist and must ⛔ not be introduced.
 * ⛔ Do ⛔ not reach for `toHindiNumeral`, and ⛔ do ⛔ not add the parameter back "for symmetry" with
 * {@link formatCurrencyShort}, which needs it only for the WORD (lakh / लाख).
 */
export function formatCount(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[i18n] formatCount requires a non-negative integer, received ${String(value)}`);
  }
  return groupIndian(String(value));
}

/**
 * ⭐⭐ **लक्ष्य's RULED FORM — the drive's EXPECTED figure.** Trustee-ratified 2026-09-07
 * (*"Expected figure always in Lakh or Crore."*), narrowed the same day by `2026-09-07-206` **cl.3**.
 *
 * ⭐ **THE RULE:** exact **below** ₹1,00,000; the short lakh/crore form **at and above** it.
 *
 * ⚠⛔⛔ **THE ₹10-LAKH CUT-OFF DOES ⛔ NOT APPLY HERE.** A ₹8,00,000 target renders **`₹ 8 lakh`**,
 * ⛔ never `₹ 8,00,000`. ⇒ ⭐ **TWO DIFFERENT RULES ON ONE ROW, AND THAT IS DELIBERATE:** the
 * *contributed* amount ({@link formatSahyogContributedAmount}) is exact below TEN lakh; the *target*
 * is exact only below ONE. ⛔ Do ⛔ not "align" them — the divergence is the ruling, ⛔ not an
 * oversight.
 *
 * ⛔⛔ **WHY THE SUB-LAKH FLOOR EXISTS:** the short form has ⛔ no sub-lakh behaviour, so a small
 * drive's DERIVED target rendered the words **`₹ 0 lakh`** — ⭐ executed: ₹300 and ₹800 both did, and
 * ₹300 is exactly what 3 assignees × a ₹100 `fixed_amount` produces (Review finding, 2026-09-07).
 * ⚠ A zero-shaped target is **SILENCE, ⛔ never `₹0`**, and the read path enforces that for a
 * ZERO-assignee pool — ⛔ but a NONZERO target was reaching the page as a zero STRING by way of the
 * number form.
 *
 * ⚠⛔ **RELOCATED HERE FROM `apps/public/src/lib/sahyog-render.ts` BY STORY 11b.15, AND ⛔ NOT
 * RE-IMPLEMENTED.** The member's drive list renders the same ruled figure and `apps/mobile` cannot
 * import from `apps/public` ⇒ the alternative was a SECOND copy of a Trustee-ratified number form,
 * which is the fork this codebase refuses everywhere else. ⭐ A second consumer now exists, so this
 * is shared tooling in the package the primitives already live in — ⛔ not a new package
 * ([[project_no_premature_package]]). `sahyog-render.ts` re-exports it, so ⛔ every existing
 * `apps/public` call site and test is unchanged.
 */
export function formatSahyogTargetAmount(targetInr: number, locale: Locale): string {
  if (targetInr < 100_000) return formatCurrency(targetInr, 'en');
  return formatCurrencyShort(targetInr, locale);
}

/**
 * ⭐⭐ **THE CONTRIBUTED AMOUNT'S RULED FORM — exact below ₹10 lakh, CUT OFF at and above it, and
 * ⛔ ONLY on a LIVE drive.** Trustee-ratified 2026-09-07: *"Begin cutting off only if amount
 * contributed exceeds 10 lakh, till then show exact number — this applies to Live drive. For Closed,
 * verified shows exact figure."*, amended the same day by *"Cut off at **Exactly** ten lakh"*.
 *
 * ⇒ ⛔ **THE TEST IS `>=`, ⛔ NOT `>`** — the later wording moved the boundary, and ₹10,00,000
 * renders `₹ 10 lakh` where the earlier wording would have kept it exact. ⚠ A reader watching a
 * drive therefore sees the figure **change form** as it crosses the line; ⭐ that is intended.
 *
 * ⚠⛔ **CLOSED AND VERIFIED ROWS ARE ⛔ ALWAYS EXACT** — the short form is scoped to Live. That is
 * what `isLive` carries, and ⛔ why it is a parameter rather than an assumption.
 *
 * ⭐ LATIN numerals in both locales for the exact arm (`formatCurrency(…, 'en')`) — money is
 * **OPERATIONAL** data (amendment-A2). ⛔ Never the `'hi'` Devanagari arm, which exists only for
 * ceremonial prose.
 *
 * ⚠⛔ **RELOCATED HERE BY STORY 11b.15** — same reason as {@link formatSahyogTargetAmount}. ⭐ The
 * STAGE→boolean mapping stays at each call site (the public index speaks
 * `live`/`active`/`archive`, the member list speaks `live`/`closed`/`verified`); ⛔ only the RULE
 * moved, so there is exactly one place the ₹10-lakh boundary is written.
 */
export function formatSahyogContributedAmount(
  amountInr: number,
  locale: Locale,
  isLive: boolean,
): string {
  const CUT_OFF_INR = 1_000_000;
  if (isLive && amountInr >= CUT_OFF_INR) return formatCurrencyShort(amountInr, locale);
  return formatCurrency(amountInr, 'en');
}
