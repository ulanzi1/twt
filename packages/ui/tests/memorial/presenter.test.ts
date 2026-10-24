// Story 11b.4 — the memorial presenter (AC5 / AC11): verbatim paragraphs, segment-shaped reconstruction, and the preview
// equal to the outcome for the same input.

import { describe, expect, it } from 'vitest';

import { MEMORIAL_OMITTED_KEY, memorialOmittedReasons, memorialParagraphs, reconstructMemorial } from '../../src/index.js';

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
      { kind: 'omitted', key: MEMORIAL_OMITTED_KEY, reason: 'accuses_someone_of_wrongdoing' },
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

  // R10 / `-391` Q4 A — "for each part, which of these reasons applies": TWO parts, DIFFERENT reasons, plus a photo left out
  // for a third — each reason must stay paired with ITS OWN part (a de-duplicated set cannot do that).
  it('carries the reason on EACH omitted part, paired with its own marker; and on the photo', () => {
    const text = 'क ख ग घ ङ च';
    const first = text.indexOf('ख');
    const second = text.indexOf('घ');
    const alt = 'one two three';
    const r = reconstructMemorial(
      { body: text, altText: alt },
      {
        omissions: [
          { field: 'body', start: first, end: first + 1, reason: 'attacks_someone_named' },
          { field: 'body', start: second, end: second + 1, reason: 'against_the_law' },
          { field: 'altText', start: 4, end: 7, reason: 'identifies_a_child' },
        ],
        photoLeftOut: false,
      },
    );
    expect(r.asApproved[0]!.segments).toEqual([
      { kind: 'text', text: 'क ' },
      { kind: 'omitted', key: MEMORIAL_OMITTED_KEY, reason: 'attacks_someone_named' },
      { kind: 'text', text: ' ग ' },
      { kind: 'omitted', key: MEMORIAL_OMITTED_KEY, reason: 'against_the_law' },
      { kind: 'text', text: ' ङ च' },
    ]);
    // The helper keeps reading order and does NOT de-duplicate.
    expect(memorialOmittedReasons(r.asApproved)).toEqual(['attacks_someone_named', 'against_the_law']);
    expect(memorialOmittedReasons(r.altText!.asApproved!)).toEqual(['identifies_a_child']);
    const same = reconstructMemorial(
      { body: text, altText: null },
      {
        omissions: [
          { field: 'body', start: first, end: first + 1, reason: 'against_the_law' },
          { field: 'body', start: second, end: second + 1, reason: 'against_the_law' },
        ],
        photoLeftOut: false,
      },
    );
    expect(memorialOmittedReasons(same.asApproved)).toEqual(['against_the_law', 'against_the_law']);
    // A photo left out drops its alt text from the as-approved render. T12 (b): the presenter carries ⛔ no photo REASON —
    // the screen reads it from the view (one source), so the presenter's output has no such field.
    const photo = reconstructMemorial({ body: text, altText: alt }, { omissions: [], photoLeftOut: true });
    expect(photo.photoLeftOut).toBe(true);
    expect(photo.altText!.asApproved).toBeNull();
    expect('photoLeftOutReason' in photo).toBe(false);
  });

  it('preview == outcome for the same input (UX: "preview matches public output exactly")', () => {
    const preview = reconstructMemorial({ body, altText: 'x' }, null).asApproved;
    const outcome = reconstructMemorial({ body, altText: 'x' }, { omissions: [], photoLeftOut: false }).asApproved;
    expect(preview).toEqual(outcome);
  });
});
