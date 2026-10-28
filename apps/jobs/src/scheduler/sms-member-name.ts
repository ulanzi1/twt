// THE NAME IN A CLAIM TEXT — Story 6.37e rework (Task 1.2; AC1; `2026-10-22-379` Q1 A; `2026-10-22-380` decisions 2–5).
// ONE pure function for the four texts that name the deceased member: the three suspicion texts (`claim-suspicion-notices.ts`) and
// the text to the five neighbours (`claim-peer-mesh-requests.ts`) — and, Story 5.8b (`2026-10-28-414` Q2 A: the rule reaches a fifth
// text), the degraded-mode bridge's cycle-open text, which names the family it supports (`contribution-notify-triggers.ts`).
// ⛔ IO, ⛔ clock, ⛔ a package import.
//
// The Panel's rule (`-379` Q1 A, as put): *"(1) Send the full name whenever it fits 60 letters. (2) Only if it is longer: remove
// titles and suffixes … (whole words only; Kumari, Devi, Kumar and Bai are parts of names and stay). (3) If still longer: turn words
// into their first letter, starting from the FIRST word, one word at a time, until it fits — and never the last word. (4) If it still
// does not fit … no text, as today."* So, in order:
//   N1 — `full`: the name AS PASSED whenever it is ≤ 60 code points — ⛔ changed by a character; the shortening never fires "just in case";
//   N2 — `shortened`: only above 60 — every listed title dropped at once, then initials from the FIRST word, one at a time, stopping
//        the moment it fits; ⛔ the LAST word (after the titles are gone); ⛔ truncation, ⛔ a full stop on an initial;
//   N3 — `too_long`: else — each caller keeps TODAY's outcome (the suspicion texts: the send core refuses `value_too_long` + alarm;
//        the neighbours' text: claim-wide `no_target:name_too_long`; the bridge text (5.8b): ⛔ block for the job's members and ONE
//        name-free alarm with the count, `alert_sms.bridge_name_too_long` — the push still goes).
// `full` and `shortened` carry the name split across the two boxes (`sms-member-boxes.ts`): the boxes CONCATENATE to the name, each
// ≤ 30, ⛔ empty for any name of 2+ code points, cut near the middle and away from a space where a cut allows it (N5, `-380` decision 3).
//
// ⭐ The author's readings of the ruled words (`-380` decision 4): a word is a whitespace-separated run; a title is a word that, after
// NFC, ONE trailing full stop removed and lower-casing, equals a list entry (`SHRI`, `Dr.`, `स्व.` are titles; `(Late)` is a word);
// a word's first letter is its first grapheme cluster holding a letter or a digit — a word with none (`-`) is left as is.
// ⭐ WHY THE RESOLVED NAME IS THE INPUT: the neighbours' shared reader returns only the mode-resolved name (`-181`; the WhatsApp
// reminder reads it too and keeps the FULL name, `-365`). Counts are CODE POINTS — ⛔ UTF-16 units, ⛔ graphemes.
// ⛔ A name in a log line, alarm, detail or payload — a box or a shortened form included (N7); ⛔ record of which form was sent (SN5).

import { MEMBER_BOX_MAX, MEMBER_NAME_MAX } from './sms-member-boxes.js';

/** The name a claim text carries in its two boxes, or `too_long` (the caller's existing outcome). */
export type SmsMemberName =
  | { readonly kind: 'full' | 'shortened'; readonly name: string; readonly boxes: readonly [string, string] }
  | { readonly kind: 'too_long' };

/** A fixed, name-free message — pg-boss keeps a failed job's error. */
const EMPTY_NAME = '[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)';

/** The Panel's closed list (`-379` Q1 A (2)), as matched: lower-case, ⛔ trailing full stop, NFC. */
const TITLES: ReadonlySet<string> = new Set(
  'shri sri smt shrimati sushri dr late mr mrs ms ji श्री श्रीमती सुश्री डॉ स्व स्वर्गीय जी'.normalize('NFC').split(' '),
);

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const WHITESPACE = /\s/u;

const codePoints = (s: string): number => [...s].length;

/** The grapheme clusters of a string — `Intl.Segmenter` where present, the code-point iterator otherwise. */
function graphemes(s: string): string[] {
  const SegmenterCtor = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof SegmenterCtor === 'function') {
    return [...new SegmenterCtor(undefined, { granularity: 'grapheme' }).segment(s)].map((g) => g.segment);
  }
  return [...s];
}

function isTitle(word: string): boolean {
  const w = word.normalize('NFC');
  return TITLES.has((w.endsWith('.') ? w.slice(0, -1) : w).toLowerCase());
}

/** A word's first letter-bearing grapheme, or `undefined` when it has none. */
const firstLetter = (word: string): string | undefined => graphemes(word).find((g) => LETTER_OR_DIGIT.test(g));

/**
 * NB3 (b) — split a name of n code points into two boxes. A cut `c` (code points) with `max(1, n−30) ≤ c ≤ min(30, n−1)`; first
 * choice a grapheme boundary with ⛔ whitespace on either side, nearest the middle (a tie ⇒ the smaller `c`); else the nearest
 * grapheme boundary; else the nearest offset (a cut inside one cluster — the name is still sent whole, N1). n = 1 ⇒ `[name, '']`.
 */
function toBoxes(name: string): readonly [string, string] {
  const cps = [...name];
  const n = cps.length;
  if (n === 1) return [name, ''];
  const boundaries = new Set<number>();
  let at = 0;
  for (const g of graphemes(name)) boundaries.add((at += codePoints(g)));
  const clean = (c: number): boolean => !WHITESPACE.test(cps[c - 1]!) && !WHITESPACE.test(cps[c]!);
  const range: number[] = [];
  for (let c = Math.max(1, n - MEMBER_BOX_MAX); c <= Math.min(MEMBER_BOX_MAX, n - 1); c++) range.push(c);
  const nearest = (cs: number[]): number | undefined =>
    cs.reduce<number | undefined>((best, c) => (best === undefined || Math.abs(2 * c - n) < Math.abs(2 * best - n) ? c : best), undefined);
  const c =
    nearest(range.filter((x) => boundaries.has(x) && clean(x))) ?? nearest(range.filter((x) => boundaries.has(x))) ?? nearest(range)!;
  return [cps.slice(0, c).join(''), cps.slice(c).join('')];
}

/**
 * The full mode-resolved name if it fits 60, else the Panel's shortened form if THAT fits, else `too_long`. Throws on an empty or
 * whitespace-only name — a programmer error, unreachable from both callers (each turns `''` into `unresolvable` first): returning
 * `too_long` would let a blank name reach the send core and be SENT.
 */
export function smsMemberName(resolvedName: string): SmsMemberName {
  if (resolvedName.trim() === '') throw new Error(EMPTY_NAME);
  if (codePoints(resolvedName) <= MEMBER_NAME_MAX) return { kind: 'full', name: resolvedName, boxes: toBoxes(resolvedName) };
  const words = resolvedName.split(/\s+/).filter((w) => w !== '' && !isTitle(w));
  for (let i = 0; i < words.length; i++) {
    const name = words.join(' ');
    if (codePoints(name) <= MEMBER_NAME_MAX) return { kind: 'shortened', name, boxes: toBoxes(name) };
    if (i === words.length - 1) break;
    words[i] = firstLetter(words[i]!) ?? words[i]!;
  }
  return { kind: 'too_long' };
}
