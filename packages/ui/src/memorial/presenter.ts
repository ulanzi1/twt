// The family memorial's framework-agnostic PRESENTER (Story 11b.4, AC5 / AC11 — `#decision-2026-10-24-398`).
//
// ONE place that turns the family's VERBATIM words + the Trust's decided spans into what is shown — shared by the mobile
// PREVIEW and OUTCOME screens today, and by row 11b-4a's public render later (UX: *"preview matches public output
// exactly"*). ⚠ 11b.4a must render these segments with `white-space: pre-wrap`: HTML collapses the spaces React Native
// `<Text>` keeps (recorded in its deferred-work trigger).
//
// ⛔ It never edits the family's text: a paragraph's text is a SLICE of the stored string (⛔ no trim, ⛔ no normalisation —
// Trap 6). Composed SPLIT FIRST, THEN INTERSECT: a span may ⛔ not cross a paragraph separator (the validator refuses it).
// An omission is a SEGMENT carrying a copy KEY — ⛔ never a string like "[…]", so the notation can never be confused with
// something the family typed. ⛔ No copy here: `@twt/ui`'s dependencies are exactly `{ "@twt/contracts" }` (the
// `status-pill/i18n-keys.ts` precedent) — the surface resolves the key.

import { memorialParagraphRanges, type MemorialOmission, type MemorialReviewReason } from '@twt/contracts';

/** The copy key a renderer resolves for a part the Trust left out — in the `memorial` namespace (`render.omitted`). */
export const MEMORIAL_OMITTED_KEY = 'render.omitted';

// `-391` Q4 A (R10): the family is told, FOR EACH PART, which reason applies — so the marker carries its OWN reason (the
// admin renderer reads only `kind`, so adding the field is compatible there).
// ⚠ `reason` is for the family's OWN screen (and the Trust's): it must not be serialised on the PUBLIC render (row 11b-4a) —
// the public page shows the marker only, never why a part was left out.
export type MemorialSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'omitted'; readonly key: typeof MEMORIAL_OMITTED_KEY; readonly reason: MemorialReviewReason };

export interface MemorialParagraph {
  readonly segments: readonly MemorialSegment[];
}

/** The family's text as paragraphs (a blank line separates them; CRLF-aware; ⛔ trimming inside a paragraph). */
export function memorialParagraphs(body: string): string[] {
  return memorialParagraphRanges(body).map((r) => body.slice(r.start, r.end));
}

function paragraphsWith(text: string, spans: readonly MemorialOmission[]): MemorialParagraph[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  return memorialParagraphRanges(text).map((p) => {
    const segments: MemorialSegment[] = [];
    let at = p.start;
    for (const s of sorted) {
      if (s.end <= p.start || s.start >= p.end) continue;
      const start = Math.max(s.start, p.start);
      const end = Math.min(s.end, p.end);
      if (start > at) segments.push({ kind: 'text', text: text.slice(at, start) });
      segments.push({ kind: 'omitted', key: MEMORIAL_OMITTED_KEY, reason: s.reason });
      at = end;
    }
    if (at < p.end) segments.push({ kind: 'text', text: text.slice(at, p.end) });
    return { segments };
  });
}

export interface MemorialDecisionForRender {
  readonly omissions: readonly MemorialOmission[];
  /** The photo (and its alt text) was left out. */
  readonly photoLeftOut: boolean;
  // T12 (b) — ⛔ no photo REASON here: the surface reads it from its own source (the member view's `photoLeftOut.reason`,
  // the review DTO's `photoLeftOutReason`), so there is exactly ONE place a screen takes it from.
}

export interface ReconstructedMemorial {
  /** What the family wrote — every word, as paragraphs. */
  readonly original: readonly MemorialParagraph[];
  /** What the Trust approved — the family's words with each part left out marked. Equals `original` when ⛔ decision. */
  readonly asApproved: readonly MemorialParagraph[];
  readonly altText: {
    readonly original: readonly MemorialParagraph[];
    /** `null` when the photo (with its alt text) was left out. */
    readonly asApproved: readonly MemorialParagraph[] | null;
  } | null;
  readonly photoLeftOut: boolean;
}

/**
 * The reason of EVERY part left out in `paragraphs`, in reading order, ONE entry per marker (duplicates kept — two parts
 * left out for the same reason are two parts). R10: the surface pairs each reason with its own part (never a de-duplicated set).
 */
export function memorialOmittedReasons(paragraphs: readonly MemorialParagraph[]): MemorialReviewReason[] {
  const out: MemorialReviewReason[] = [];
  for (const p of paragraphs) for (const s of p.segments) if (s.kind === 'omitted') out.push(s.reason);
  return out;
}

/**
 * The reconstruction a future reviewer can always rely on (AC5): what the family originally wrote vs. what the Trust left
 * out. `decision` is `null` for a version with ⛔ decision yet (the preview, `with_the_trust`).
 */
export function reconstructMemorial(
  words: { readonly body: string; readonly altText: string | null },
  decision: MemorialDecisionForRender | null,
): ReconstructedMemorial {
  const bodySpans = decision?.omissions.filter((o) => o.field === 'body') ?? [];
  const altSpans = decision?.omissions.filter((o) => o.field === 'altText') ?? [];
  const photoLeftOut = decision?.photoLeftOut ?? false;
  return {
    original: paragraphsWith(words.body, []),
    asApproved: paragraphsWith(words.body, bodySpans),
    altText:
      words.altText === null
        ? null
        : {
            original: paragraphsWith(words.altText, []),
            asApproved: photoLeftOut ? null : paragraphsWith(words.altText, altSpans),
          },
    photoLeftOut,
  };
}
