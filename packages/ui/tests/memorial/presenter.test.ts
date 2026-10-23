// Story 11b.4 — the memorial presenter (AC5 / AC11): verbatim paragraphs, segment-shaped reconstruction, and the preview
// equal to the outcome for the same input.

import { describe, expect, it } from 'vitest';

import { MEMORIAL_OMITTED_KEY, memorialParagraphs, reconstructMemorial } from '../../src/index.js';

describe('memorialParagraphs', () => {
  it('splits on a blank line, CRLF-aware, and keeps each paragraph VERBATIM (Trap 6)', () => {
    expect(memorialParagraphs('  पहली पंक्ति\r\n\r\n*दूसरी*  ')).toEqual(['  पहली पंक्ति', '*दूसरी*  ']);
    expect(memorialParagraphs('one\ntwo')).toEqual(['one\ntwo']);
    expect(memorialParagraphs('')).toEqual([]);
  });
});

describe('reconstructMemorial', () => {
  const body = 'माँ बहुत अच्छी थीं। रमेश ने धोखा दिया।\n\nहम उन्हें याद करते हैं।';
  const cut = body.indexOf('रमेश');
  const cutEnd = body.indexOf('\n');

  it('with ⛔ decision, asApproved equals the original', () => {
    const r = reconstructMemorial({ body, altText: null }, null);
    expect(r.asApproved).toEqual(r.original);
    expect(r.altText).toBeNull();
  });

  it('marks a part left out as a SEGMENT with a key — ⛔ a string', () => {
    const r = reconstructMemorial(
      { body, altText: 'फ़ोटो' },
      { omissions: [{ field: 'body', start: cut, end: cutEnd, reason: 'accuses_someone_of_wrongdoing' }], photoLeftOut: false },
    );
    expect(r.asApproved[0]!.segments).toEqual([
      { kind: 'text', text: body.slice(0, cut) },
      { kind: 'omitted', key: MEMORIAL_OMITTED_KEY },
    ]);
    expect(r.asApproved[1]!.segments).toEqual([{ kind: 'text', text: 'हम उन्हें याद करते हैं।' }]);
    // The original keeps every word.
    expect(r.original[0]!.segments).toEqual([{ kind: 'text', text: body.slice(0, cutEnd) }]);
    // A family-typed "[…]" stays TEXT.
    const typed = reconstructMemorial({ body: 'a […] b', altText: null }, { omissions: [], photoLeftOut: false });
    expect(typed.asApproved[0]!.segments).toEqual([{ kind: 'text', text: 'a […] b' }]);
  });

  it('a photo left out takes its alt text with it', () => {
    const r = reconstructMemorial({ body, altText: 'माँ' }, { omissions: [], photoLeftOut: true });
    expect(r.photoLeftOut).toBe(true);
    expect(r.altText?.asApproved).toBeNull();
    expect(r.altText?.original).toEqual([{ segments: [{ kind: 'text', text: 'माँ' }] }]);
  });

  it('preview == outcome for the same input (UX: "preview matches public output exactly")', () => {
    const preview = reconstructMemorial({ body, altText: 'x' }, null).asApproved;
    const outcome = reconstructMemorial({ body, altText: 'x' }, { omissions: [], photoLeftOut: false }).asApproved;
    expect(preview).toEqual(outcome);
  });
});
