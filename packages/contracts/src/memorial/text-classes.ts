// packages/contracts/src/memorial/text-classes.ts
//
// The character classes, limits and paragraph ranges the family memorial's API, admin, mobile and `@twt/ui` share — ONE
// copy (Trap 9). Pure; ⛔ no `@twt/domain`. ⚠ Every check runs on a DERIVED view — the family's text is stored VERBATIM
// (Trap 6: ⛔ no trim, ⛔ no NFC/NFKC, ⛔ no whitespace collapse, ⛔ no line-ending rewrite).

/* eslint-disable no-misleading-character-class */
/**
 * Invisible characters — a copy BY VALUE of `INVISIBLE_CHARS` in `apps/api/src/modules/kyc/name-render.ts` (module-private
 * there; admin and mobile cannot import `apps/api`), incl. the `Lo` fillers U+115F / U+1160 / U+3164 and U+2800, **plus
 * U+FFA0** (HALFWIDTH HANGUL FILLER, `Lo`), which the source lacks. ⚠ ⛔ No `g` flag: a global regex is stateful under
 * `.test()` (`lastIndex`); {@link stripMemorialInvisibles} builds its global copy per call.
 */
export const MEMORIAL_INVISIBLE_CHARS =
  /[­͏ᅟᅠ᠎​-‏‪-‮⁠-⁤⁦-⁩⠀ㅤ︀-️﻿ﾠ]/u;

/**
 * Bidi embedding / override / isolate controls — a copy BY VALUE of `BIDI_CONTROLS` in
 * `apps/api/src/modules/kyc/name-render.ts` (module-private; a by-value copy also lives in
 * `apps/public/src/lib/sahyog-vivran-message-block.ts`). The admin review screen SHOWS them visibly in the family's text
 * (AC9) — an interior RLO reorders what the reviewer reads. ⛔ No `g` flag (see above).
 */
export const MEMORIAL_BIDI_CONTROLS = /[‪-‮⁦-⁩]/u;
/* eslint-enable no-misleading-character-class */

/** A letter, number, punctuation or symbol — what makes text non-blank. */
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** The text with every {@link MEMORIAL_INVISIBLE_CHARS} removed (a derived view — ⛔ never stored). */
export function stripMemorialInvisibles(text: string): string {
  return text.replace(new RegExp(MEMORIAL_INVISIBLE_CHARS.source, 'gu'), '');
}

/** Blank ⇔ after removing the invisible class, ⛔ no letter, number, punctuation or symbol remains (AC7). */
export function isMemorialTextBlank(text: string): boolean {
  return !VISIBLE.test(stripMemorialInvisibles(text));
}

/** Unicode CODE POINTS on the RAW string (⛔ UTF-16 units — a Devanagari or astral text would otherwise count wrong). */
export function memorialCodePointLength(text: string): number {
  let n = 0;
  for (const _ of text) n += 1;
  return n;
}

/** AC7 limits (`-398` §1 item 20; BigDev *"6,000 / 300"*). */
export const MEMORIAL_BODY_MAX_CODE_POINTS = 6000;
export const MEMORIAL_ALT_TEXT_MAX_CODE_POINTS = 300;
/** ≤ 10 MiB — the claim-document limit BY VALUE (⛔ by import: the purposes differ — MA8). */
export const MEMORIAL_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/**
 * A paragraph separator: a line break followed by ≥ 1 line holding only spaces or tabs (a BLANK line), CRLF-aware.
 * ⛔ The separator is ⛔ part of either paragraph; the paragraphs keep their own text untouched (AC11).
 */
const PARAGRAPH_SEPARATOR = /(?:\r\n|\r|\n)(?:[ \t]*(?:\r\n|\r|\n))+/g;

/** `[start, end)` UTF-16 ranges of the text's paragraphs, in order (an empty text has ⛔ no paragraph). */
export function memorialParagraphRanges(text: string): { readonly start: number; readonly end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  for (const m of text.matchAll(PARAGRAPH_SEPARATOR)) {
    ranges.push({ start, end: m.index });
    start = m.index + m[0].length;
  }
  ranges.push({ start, end: text.length });
  // A leading or trailing separator leaves an empty range — ⛔ a paragraph.
  return ranges.filter((r) => r.end > r.start);
}
