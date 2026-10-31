// The family memorial's PUBLIC text — Story 11b.4a, MP3 (b) (`2026-10-27-411` item 3, PC1 B, Trustee-ratified: *"⛔ No marker:
// the words on either side are simply joined."*; the join rule is OURS — `-411` Not covered: *"how the words are joined across
// a cut … the build's"*). TWO consumers, both in `apps/api` — the public page (`memorial-public-read.ts`) and the helpline's
// take-down drive view (`memorial-takedown/handlers.ts`, which shows "the words as the page shows them", so the two share this
// join and cannot drift) ⇒ it lives here, ⛔ not in `@twt/ui` ([[feedback_no_premature_package]]).
//
// ⭐ INPUT: the presenter's `asApproved` paragraphs (`reconstructMemorial` — the SAME reconstruction the family's screen and
// the Trust's review read) plus the text of each cut in reading order (`memorialCutTexts`). The cut texts are used ONLY to
// ask "did the removed stretch hold a line break?" and ⛔ never leave this module.
// ⭐ THE JOIN RULE: at each cut, trim the whitespace at the end of the kept text before it and at the start of the kept text
// after it; then insert ONE `\n` if the removed stretch (the cut plus the trimmed whitespace) held a line break, else ONE
// space. Nothing is inserted at a paragraph's start or end. A paragraph left with ⛔ no kept text is DROPPED (⛔ no empty
// paragraph — that would be a visible gap, `-393` M1's spirit).
// ⭐ BIDI (11b.4 R13): `isolateMemorialBidi` is applied to EACH kept piece BEFORE the join — a cut can leave an unbalanced
// direction control on either side, and once joined it would run on into the next piece.
// ⛔ No `reason`, ⛔ no key, ⛔ no marker, ⛔ no position: the output is plain strings.

import { groupMemorialKinship, type MemorialKinshipEntry, type MemorialKinshipRelation, type MemorialOmission } from '@twt/contracts';
import { isolateMemorialBidi, reconstructMemorial, type MemorialParagraph } from '@twt/ui';

const LINE_BREAK = /[\r\n\u2028\u2029]/u;
const TRAILING_WS = /\s+$/u;
const LEADING_WS = /^\s+/u;

/** The text of each span of `text`, in reading order (the order the presenter emits its `omitted` segments). */
export function memorialCutTexts(text: string, spans: readonly MemorialOmission[]): string[] {
  return [...spans].sort((a, b) => a.start - b.start).map((s) => text.slice(s.start, s.end));
}

type Pending = null | 'start' | 'space' | 'newline';

/**
 * ⭐ MP3 (b) — the presenter's `asApproved` paragraphs as the public page's strings: the kept text only, each piece isolated,
 * joined across every cut by the join rule above. `cutTexts[i]` is the text of the i-th `omitted` segment in reading order.
 */
export function joinKeptSegments(paragraphs: readonly MemorialParagraph[], cutTexts: readonly string[]): string[] {
  const out: string[] = [];
  let cut = 0;
  for (const p of paragraphs) {
    const pieces: { text: string; sep: string }[] = [];
    let pending: Pending = null;
    for (const s of p.segments) {
      if (s.kind === 'omitted') {
        const removed = cutTexts[cut] ?? '';
        cut += 1;
        if (pieces.length === 0) {
          // A cut at the paragraph's start: nothing is inserted there.
          pending = 'start';
          continue;
        }
        const last = pieces[pieces.length - 1]!;
        const tail = TRAILING_WS.exec(last.text)?.[0] ?? '';
        last.text = last.text.slice(0, last.text.length - tail.length);
        if (last.text === '') {
          // A whitespace-only piece can only open the paragraph (two text segments never touch), so dropping it puts the
          // cut at the paragraph's start: nothing is inserted there.
          pieces.pop();
          pending = 'start';
          continue;
        }
        // A line break anywhere in the removed stretch since the last kept piece — this cut, the whitespace trimmed around it, or an
        // earlier cut and whitespace of the same stretch.
        const newline: boolean = pending === 'newline' || LINE_BREAK.test(tail) || LINE_BREAK.test(removed);
        pending = newline ? 'newline' : 'space';
        continue;
      }
      let text = s.text;
      if (pending !== null) {
        const lead = LEADING_WS.exec(text)?.[0] ?? '';
        text = text.slice(lead.length);
        if (pending === 'space' && LINE_BREAK.test(lead)) pending = 'newline';
      }
      // Whitespace alone between two cuts is part of ONE removed stretch: the pending separator carries over it.
      if (text === '') continue;
      pieces.push({ text, sep: pending === 'space' ? ' ' : pending === 'newline' ? '\n' : '' });
      pending = null;
    }
    // A cut at the paragraph's end: the trailing whitespace was already trimmed; nothing is inserted.
    if (pieces.length === 0) continue;
    out.push(pieces.map((x) => x.sep + isolateMemorialBidi(x.text)).join(''));
  }
  return out;
}

/**
 * ⭐ The words and the photo's description EXACTLY as the public page shows them, from the decrypted body and alt text and the Trust's
 * omissions: reconstruct, take each field's cut texts, join. The ONE orchestration both consumers call, so "the words as the page shows
 * them" cannot drift between the page and the helpline's drive view. `altText` is `null` when there is no description to show (none was
 * written, or the presenter has none as approved); each caller decides what that reads as (the page's wire says `''`).
 */
export function publicMemorialText(input: {
  readonly body: string;
  readonly altText: string | null;
  readonly omissions: readonly MemorialOmission[];
}): { readonly words: string[]; readonly altText: string | null } {
  const { body, altText, omissions } = input;
  const rec = reconstructMemorial({ body, altText }, { omissions, photoLeftOut: false });
  const words = joinKeptSegments(rec.asApproved, memorialCutTexts(body, omissions.filter((o) => o.field === 'body')));
  const description =
    altText === null || rec.altText?.asApproved == null
      ? null
      : joinKeptSegments(rec.altText.asApproved, memorialCutTexts(altText, omissions.filter((o) => o.field === 'altText'))).join(' ');
  return { words, altText: description };
}

/**
 * ⭐ Story 11b.5a (KL10 / KL11) — the family list EXACTLY as the public page shows it: the entries the Trust kept, grouped by the
 * ONE helper (`groupMemorialKinship` — the fourteen's order, the family's order within a relation, ⛔ `inPhoto`), each NAME
 * isolated by `isolateMemorialBidi` (an unclosed RLO in one name would otherwise reorder every later name in the same `<dd>`;
 * `dir="auto"` isolates rows, ⛔ names). The ONE function both consumers call — the page and the helpline's drive view — so the
 * two cannot drift. ⛔ No index, ⛔ no reason, ⛔ no count of left-out entries leaves it.
 */
export function publicMemorialKinship(
  entries: readonly MemorialKinshipEntry[],
  leftOutIndexes: readonly number[],
): { relation: MemorialKinshipRelation; names: string[] }[] {
  return groupMemorialKinship(entries, leftOutIndexes).map((row) => ({
    relation: row.relation,
    names: row.names.map((n) => isolateMemorialBidi(n)),
  }));
}
