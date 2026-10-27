// Story 11b.4a — MP3 (b): the public page's memorial text is the presenter's `asApproved` with the cuts JOINED (`2026-10-27-411`
// item 3, PC1 B — ⛔ no marker). The join rule (ours): trim the whitespace on both sides of a cut, then ONE `\n` if the removed
// stretch held a line break, else ONE space; nothing at a paragraph's start or end; a paragraph with ⛔ no kept text is dropped.
// Each kept piece is bidi-isolated BEFORE the join (11b.4 R13).

import type { MemorialOmission } from '@twt/contracts';
import { reconstructMemorial } from '@twt/ui';
import { describe, expect, it } from 'vitest';

import { joinKeptSegments, memorialCutTexts, publicMemorialText } from '../../src/modules/public-pages/memorial-public-text.js';

/** The public strings for `body` with the parts `[a, b)` left out — through the REAL presenter. */
function publicWords(body: string, cuts: readonly (readonly [number, number])[]): string[] {
  const omissions: MemorialOmission[] = cuts.map(([start, end]) => ({ field: 'body', start, end, reason: 'against_the_law' }));
  const rec = reconstructMemorial({ body, altText: null }, { omissions, photoLeftOut: false });
  return joinKeptSegments(rec.asApproved, memorialCutTexts(body, omissions));
}

/** `[start, end)` of `needle` in `hay` (asserting it is there). */
function at(hay: string, needle: string): [number, number] {
  const i = hay.indexOf(needle);
  expect(i, `"${needle}" in the fixture`).toBeGreaterThanOrEqual(0);
  return [i, i + needle.length];
}

describe('joinKeptSegments — the join rule (MP3 (b))', () => {
  it('⛔ no cut ⇒ the paragraphs as written (a single newline inside a paragraph is kept — the page renders pre-wrap)', () => {
    expect(publicWords('First line\nsecond line\n\nSecond paragraph', [])).toEqual(['First line\nsecond line', 'Second paragraph']);
  });

  it('a mid-sentence cut ⇒ ONE space, the whitespace on both sides trimmed', () => {
    const body = 'He loved the school and  the bad man   and his students.';
    expect(publicWords(body, [at(body, 'the bad man')])).toEqual(['He loved the school and and his students.']);
  });

  it('a cut at a paragraph\'s start or end ⇒ nothing is inserted there', () => {
    const body = 'Bad words. He was kind.\n\nHe was brave. More bad words.';
    expect(publicWords(body, [at(body, 'Bad words.'), at(body, 'More bad words.')])).toEqual(['He was kind.', 'He was brave.']);
  });

  it('a cut spanning a line break ⇒ ONE newline (the break was in the cut itself)', () => {
    const body = 'Line one.\nBad line.\nLine three.';
    expect(publicWords(body, [at(body, '\nBad line.\n')])).toEqual(['Line one.\nLine three.']);
    // …and when the break was in the whitespace beside the cut.
    expect(publicWords(body, [at(body, 'Bad line.')])).toEqual(['Line one.\nLine three.']);
  });

  it('adjacent cuts separated only by whitespace ⇒ ONE separator for the whole removed stretch (a newline if any part held one)', () => {
    const body = 'Keep A. Cut one. \n Cut two. Keep B.';
    expect(publicWords(body, [at(body, 'Cut one.'), at(body, 'Cut two.')])).toEqual(['Keep A.\nKeep B.']);
    const flat = 'Keep A. Cut one.   Cut two. Keep B.';
    expect(publicWords(flat, [at(flat, 'Cut one.'), at(flat, 'Cut two.')])).toEqual(['Keep A. Keep B.']);
  });

  it('a whole paragraph cut ⇒ the paragraph is DROPPED (⛔ no empty gap)', () => {
    const body = 'Kept first.\n\nAll of this goes.\n\nKept last.';
    expect(publicWords(body, [at(body, 'All of this goes.')])).toEqual(['Kept first.', 'Kept last.']);
  });

  it('a whitespace-only lead before a cut ⇒ the cut is at the paragraph\'s start (⛔ no leading separator)', () => {
    const body = '   Gone. Kept.';
    expect(publicWords(body, [at(body, 'Gone.')])).toEqual(['Kept.']);
  });

  it('⛔ no left-out substring appears in the output — and the kept text is asserted PRESENT first', () => {
    const body = 'माँ हमेशा मुस्कुराती थीं। गुप्त बात यहाँ है। वे सबकी मदद करती थीं।';
    const out = publicWords(body, [at(body, 'गुप्त बात यहाँ है।')]).join('\n');
    expect(out).toContain('माँ हमेशा मुस्कुराती थीं।');
    expect(out).toContain('वे सबकी मदद करती थीं।');
    expect(out).not.toContain('गुप्त');
  });

  it('a hostile-bidi kept piece beside a cut is ISOLATED before the join — its override cannot run into the next piece', () => {
    const RLO = '\u202e';
    const FSI = '\u2068';
    const PDI = '\u2069';
    const body = `Before ${RLO}reversed CUT ME after.`;
    const [out] = publicWords(body, [at(body, 'CUT ME')]);
    // The first piece holds the unterminated override, so it is wrapped (and balanced); the clean second piece is ⛔ not touched.
    expect(out!.startsWith(`${FSI}Before ${RLO}reversed`)).toBe(true);
    expect(out!.endsWith(`${PDI} after.`)).toBe(true);
    expect(out).not.toContain('CUT ME');
    // Plain text carries ⛔ no invisible control.
    expect(publicWords('Plain words. Cut. More.', [[13, 17]])[0]).toBe('Plain words. More.');
  });
});

describe('publicMemorialText — the ONE orchestration the page and the helpline drive view share (review R5)', () => {
  const cut = (field: 'body' | 'altText', [start, end]: readonly [number, number]): MemorialOmission => ({ field, start, end, reason: 'against_the_law' });

  it('the words are the joined public words — the same strings `publicWords` builds by hand through the presenter', () => {
    const body = 'He loved the school and  the bad man   and his students.\n\nSecond paragraph.';
    const omissions = [cut('body', at(body, 'the bad man'))];
    expect(publicMemorialText({ body, altText: null, omissions }).words).toEqual(publicWords(body, [at(body, 'the bad man')]));
  });

  it('the description is cut and joined on its OWN spans — a body cut never moves it, and an alt-text cut never reaches the words', () => {
    const body = 'Kept words about the man here.';
    const alt = 'A teacher with the secret name smiling';
    const out = publicMemorialText({ body, altText: alt, omissions: [cut('altText', at(alt, 'the secret name'))] });
    expect(out.words).toEqual([body]);
    expect(out.altText).toBe('A teacher with smiling');
    const bodyOnly = publicMemorialText({ body, altText: alt, omissions: [cut('body', at(body, 'about the man'))] });
    expect(bodyOnly.words).toEqual(['Kept words here.']);
    expect(bodyOnly.altText).toBe(alt);
  });

  it('⛔ no description written ⇒ `null` — the caller decides what that reads as (the page\'s wire says an empty string)', () => {
    expect(publicMemorialText({ body: 'Words.', altText: null, omissions: [] }).altText).toBeNull();
  });
});
