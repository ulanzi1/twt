// Pure helpers for the family-memorial review screen (Story 11b.4, Task 7 — AC9 / MA6).
//
// ⭐ The sentence list is a UI AID ONLY — the reviewer picks whole sentences instead of typing offsets. The SERVER
// validates offsets (`validateMemorialDecision`, shared from `@twt/contracts`), ⛔ sentences. Every range is a
// `[start, end)` UTF-16 offset into the VERBATIM stored text; ⛔ the text is never edited, trimmed or normalised — a
// sentence's edge whitespace is only left OUT of the range, never removed from the words.

import {
  MEMORIAL_BIDI_CONTROLS,
  memorialParagraphRanges,
  type MemorialOmission,
  type MemorialOmissionField,
  type MemorialReviewReason,
} from '@twt/contracts';

export interface TextRange {
  readonly start: number;
  readonly end: number;
}

/** Split `[start, end)` of `text` after every danda (`।`) and double danda (`॥`) — Hindi's sentence marks. */
function splitAtDandas(text: string, range: TextRange): TextRange[] {
  const out: TextRange[] = [];
  let at = range.start;
  for (let i = range.start; i < range.end; i += 1) {
    const c = text[i];
    if (c === '।' || c === '॥') {
      out.push({ start: at, end: i + 1 });
      at = i + 1;
    }
  }
  if (at < range.end) out.push({ start: at, end: range.end });
  return out;
}

/** Shrink a range past its edge whitespace (the words are untouched — only the range moves). */
function trimRange(text: string, range: TextRange): TextRange | null {
  let { start, end } = range;
  while (start < end && /\s/u.test(text[start]!)) start += 1;
  while (end > start && /\s/u.test(text[end - 1]!)) end -= 1;
  return end > start ? { start, end } : null;
}

/**
 * The sentences of `text`, as ranges into it, oldest-first, ⛔ crossing a paragraph separator: per paragraph
 * (`memorialParagraphRanges` — the same split the presenter and the validator use), `Intl.Segmenter(locale, {
 * granularity: 'sentence' })` where it exists, then a further split after each `।` / `॥` (the segmenter does not
 * reliably break on them), each range shrunk past its edge whitespace.
 */
export function memorialSentenceRanges(text: string, locale = 'hi'): TextRange[] {
  const SegmenterCtor = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  const out: TextRange[] = [];
  for (const p of memorialParagraphRanges(text)) {
    const pieces: TextRange[] = [];
    if (typeof SegmenterCtor === 'function') {
      const seg = new SegmenterCtor(locale, { granularity: 'sentence' });
      for (const s of seg.segment(text.slice(p.start, p.end))) {
        pieces.push({ start: p.start + s.index, end: p.start + s.index + s.segment.length });
      }
    } else {
      pieces.push(p);
    }
    for (const piece of pieces) {
      for (const r of splitAtDandas(text, piece)) {
        const trimmed = trimRange(text, r);
        if (trimmed !== null) out.push(trimmed);
      }
    }
  }
  return out;
}

export interface SelectedPart extends TextRange {
  readonly field: MemorialOmissionField;
  readonly reason: MemorialReviewReason;
}

/**
 * The reviewer's selections → the omissions posted: sorted per field; two parts that TOUCH with the SAME reason are merged
 * into one (the validator refuses touching spans — "merge them first"). Parts that touch with DIFFERENT reasons are kept
 * apart, and the pre-check tells the reviewer.
 */
export function buildOmissions(parts: readonly SelectedPart[]): MemorialOmission[] {
  const out: MemorialOmission[] = [];
  for (const field of ['body', 'altText'] as const) {
    const sorted = parts.filter((p) => p.field === field).sort((a, b) => a.start - b.start);
    for (const p of sorted) {
      const prev = out.at(-1);
      if (prev && prev.field === field && prev.end === p.start && prev.reason === p.reason) {
        out[out.length - 1] = { ...prev, end: p.end };
      } else {
        out.push({ field, start: p.start, end: p.end, reason: p.reason });
      }
    }
  }
  return out;
}

export type BidiVisibleSegment = { readonly kind: 'text'; readonly text: string } | { readonly kind: 'bidi'; readonly codePoint: string };

/**
 * The family's text with every bidi control made VISIBLE (AC9): a hidden RLO / LRI … reorders what the reviewer reads, so
 * each is split out as its own marker segment (e.g. `U+202E`). A display transform only — the stored words are never
 * touched. EVERY rendering of the family's text on the review screen goes through here (the stored block, the sentence
 * picker, the as-approved text, the omission quote, the photo's alt) — one helper, so a control cannot hide in the one
 * place that forgot it.
 */
export function bidiVisible(text: string): BidiVisibleSegment[] {
  const out: BidiVisibleSegment[] = [];
  let run = '';
  for (const ch of text) {
    if (MEMORIAL_BIDI_CONTROLS.test(ch)) {
      if (run !== '') out.push({ kind: 'text', text: run });
      run = '';
      out.push({ kind: 'bidi', codePoint: `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}` });
    } else {
      run += ch;
    }
  }
  if (run !== '') out.push({ kind: 'text', text: run });
  return out;
}

/** How one control reads on the screen — ONE spelling, shared by the marker element and the flat string. */
export function bidiMarkerText(codePoint: string): string {
  return `⟦BIDI ${codePoint}⟧`;
}

/**
 * {@link bidiVisible} flattened to one string, each control spelled out by {@link bidiMarkerText} — for the places that
 * cannot hold markup (an `alt` attribute: a broken image shows its alt text raw). It stays routed through `bidiVisible`,
 * the one helper — a second scan would be a second place to forget a control.
 */
export function bidiVisibleString(text: string): string {
  return bidiVisible(text)
    .map((s) => (s.kind === 'text' ? s.text : bidiMarkerText(s.codePoint)))
    .join('');
}
