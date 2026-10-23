// packages/contracts/src/memorial/omissions.ts
//
// THE pure validator of a reviewer's decision (Story 11b.4, MA6 — `#decision-2026-10-24-398`). ONE copy, shared by the API
// (which enforces it — `400 memorial_review.invalid_omissions`) and the admin screen (which pre-checks it). ⛔ Mobile never
// calls it: `@twt/ui`'s presenter only renders DECIDED spans.
//
// Spans are `[start, end)` UTF-16 offsets into the VERBATIM field. Refused:
//   · an empty span, a span out of range, unsorted, overlapping or TOUCHING another (merge them first);
//   · a boundary that is ⛔ not a GRAPHEME-CLUSTER boundary (a Devanagari conjunct or a ZWJ sequence, ⛔ only a surrogate
//     pair) — `Intl.Segmenter` constructed LAZILY inside the call (the `kyc/name.ts` precedent, which falls back where
//     `Segmenter` is absent — then only code-point boundaries are enforced);
//   · a span holding ⛔ no visible character; a span crossing a paragraph separator (a blank line);
//   · under `approved_with_omissions`, a decision that leaves ⛔ no visible character of the body (that is `not_approved`).
// The act's rules: `approved` takes ⛔ none of omissions / photoLeftOut / reasonCode; `approved_with_omissions` needs ≥ 1
// omission or `photoLeftOut`, and ⛔ no reasonCode; `not_approved` needs a reasonCode and ⛔ no omissions or photoLeftOut.
// Also refused: `photoLeftOut` with ⛔ no photo; an `altText` span together with `photoLeftOut` (the photo and its alt text
// go together); an `altText` span with ⛔ no alt text.

import { isMemorialTextBlank, memorialParagraphRanges } from './text-classes.js';
import type { MemorialOmission, MemorialOmissionField, MemorialReviewAction, MemorialReviewReason } from './vocab.js';

export interface MemorialDecisionCandidate {
  readonly action: MemorialReviewAction;
  readonly omissions?: readonly MemorialOmission[];
  readonly photoLeftOut?: { readonly reason: MemorialReviewReason };
  readonly reasonCode?: MemorialReviewReason;
}

export interface MemorialDecisionSubject {
  readonly body: string;
  readonly altText: string | null;
  readonly hasPhoto: boolean;
}

export type MemorialDecisionProblem =
  | 'action_shape'
  | 'photo_left_out_without_photo'
  | 'alt_text_span_with_photo_left_out'
  | 'alt_text_span_without_alt_text'
  | 'span_empty'
  | 'span_out_of_range'
  | 'span_order'
  | 'span_not_grapheme_boundary'
  | 'span_blank'
  | 'span_crosses_paragraph'
  | 'nothing_left';

export type MemorialDecisionValidation = { readonly ok: true } | { readonly ok: false; readonly problem: MemorialDecisionProblem };

/** The offsets that are grapheme-cluster boundaries in `text` (incl. 0 and `text.length`). */
function graphemeBoundaries(text: string): Set<number> {
  const out = new Set<number>([0, text.length]);
  const SegmenterCtor = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof SegmenterCtor === 'function') {
    const seg = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    for (const s of seg.segment(text)) out.add(s.index);
    return out;
  }
  // Fallback (⚠ weaker): code-point boundaries only — a surrogate pair is never split.
  let i = 0;
  for (const cp of text) {
    out.add(i);
    i += cp.length;
  }
  return out;
}

function checkSpans(text: string, spans: readonly MemorialOmission[]): MemorialDecisionProblem | null {
  if (spans.length === 0) return null;
  const boundaries = graphemeBoundaries(text);
  const paragraphs = memorialParagraphRanges(text);
  let prevEnd = -1;
  for (const s of spans) {
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end > text.length) {
      return 'span_out_of_range';
    }
    if (s.end <= s.start) return 'span_empty';
    // Sorted, ⛔ overlapping and ⛔ touching (prevEnd === start would be two spans that should be one).
    if (s.start <= prevEnd) return 'span_order';
    prevEnd = s.end;
    if (!boundaries.has(s.start) || !boundaries.has(s.end)) return 'span_not_grapheme_boundary';
    if (isMemorialTextBlank(text.slice(s.start, s.end))) return 'span_blank';
    if (!paragraphs.some((p) => s.start >= p.start && s.end <= p.end)) return 'span_crosses_paragraph';
  }
  return null;
}

function remaining(text: string, spans: readonly MemorialOmission[]): string {
  let out = '';
  let at = 0;
  for (const s of spans) {
    out += text.slice(at, s.start);
    at = s.end;
  }
  return out + text.slice(at);
}

/** Validate a reviewer's decision against the version it decides (MA6). Pure; total. */
export function validateMemorialDecision(
  decision: MemorialDecisionCandidate,
  subject: MemorialDecisionSubject,
): MemorialDecisionValidation {
  const omissions = decision.omissions ?? [];
  const fail = (problem: MemorialDecisionProblem): MemorialDecisionValidation => ({ ok: false, problem });

  switch (decision.action) {
    case 'approved':
      if (omissions.length > 0 || decision.photoLeftOut !== undefined || decision.reasonCode !== undefined) {
        return fail('action_shape');
      }
      return { ok: true };
    case 'not_approved':
      if (decision.reasonCode === undefined || omissions.length > 0 || decision.photoLeftOut !== undefined) {
        return fail('action_shape');
      }
      return { ok: true };
    case 'approved_with_omissions':
      break;
    default: {
      const exhaustive: never = decision.action;
      throw new Error(`validateMemorialDecision: unknown action ${String(exhaustive)}`);
    }
  }

  if (decision.reasonCode !== undefined) return fail('action_shape');
  if (omissions.length === 0 && decision.photoLeftOut === undefined) return fail('action_shape');
  if (decision.photoLeftOut !== undefined && !subject.hasPhoto) return fail('photo_left_out_without_photo');

  const byField = (field: MemorialOmissionField) => omissions.filter((o) => o.field === field);
  const bodySpans = byField('body');
  const altSpans = byField('altText');
  // Spans must arrive sorted overall within a field; an interleaving of the two fields is fine.
  if (altSpans.length > 0) {
    if (decision.photoLeftOut !== undefined) return fail('alt_text_span_with_photo_left_out');
    if (subject.altText === null) return fail('alt_text_span_without_alt_text');
  }
  const bodyProblem = checkSpans(subject.body, bodySpans);
  if (bodyProblem !== null) return fail(bodyProblem);
  if (subject.altText !== null) {
    const altProblem = checkSpans(subject.altText, altSpans);
    if (altProblem !== null) return fail(altProblem);
  }
  if (bodySpans.length > 0 && isMemorialTextBlank(remaining(subject.body, bodySpans))) return fail('nothing_left');
  return { ok: true };
}
