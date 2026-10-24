// Story 11b.4, R13 (mobile leg) — a family-authored text segment is rendered inside its own bidi isolate, so an UNTERMINATED
// override / isolate in it cannot reorder the omission marker (or the text) that follows it. The control characters are
// built with `String.fromCodePoint` so no raw invisible character sits in this file.

import { describe, expect, it } from 'vitest';

import { isolateMemorialBidi } from '../../src/index.js';

const cp = (n: number): string => String.fromCodePoint(n);
const LRE = cp(0x202a);
const RLE = cp(0x202b);
const PDF = cp(0x202c);
const LRO = cp(0x202d);
const RLO = cp(0x202e);
const LRI = cp(0x2066);
const RLI = cp(0x2067);
const FSI = cp(0x2068);
const PDI = cp(0x2069);

/**
 * What a bidi renderer is left "inside" after reading `text` — an INDEPENDENT formulation (BD9 isolate matching by a
 * counter; embeddings counted per isolate level) of what the implementation does with one mixed stack.
 */
function leftOpen(text: string): { isolates: number; embeddings: number; unmatchedPdi: number } {
  const embeddingsPerLevel: number[] = [0];
  let unmatchedPdi = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    const top = embeddingsPerLevel.length - 1;
    if (c === 0x202c) {
      if (embeddingsPerLevel[top]! > 0) embeddingsPerLevel[top]! -= 1;
    } else if (c >= 0x202a && c <= 0x202e) {
      embeddingsPerLevel[top]! += 1;
    } else if (c >= 0x2066 && c <= 0x2068) {
      embeddingsPerLevel.push(0);
    } else if (c === 0x2069) {
      if (embeddingsPerLevel.length > 1) embeddingsPerLevel.pop();
      else unmatchedPdi += 1;
    }
  }
  return {
    isolates: embeddingsPerLevel.length - 1,
    embeddings: embeddingsPerLevel.reduce((a, b) => a + b, 0),
    unmatchedPdi,
  };
}

const NEUTRAL = { isolates: 0, embeddings: 0, unmatchedPdi: 0 };

describe('isolateMemorialBidi', () => {
  it('returns a plain segment UNCHANGED — plain Hindi and English carry no invisible controls', () => {
    for (const plain of ['माँ बहुत अच्छी थीं।', 'a plain English line', 'मिश्रित mixed पाठ, 123', ' leading and trailing  ', 'एक\nदो']) {
      expect(isolateMemorialBidi(plain)).toBe(plain);
    }
    // The marks that are not stateful (LRM, RLM, ALM) can never leak, so they are not "hostile" either.
    const marks = `a${cp(0x200e)}b${cp(0x200f)}c${cp(0x061c)}d`;
    expect(isolateMemorialBidi(marks)).toBe(marks);
  });

  it('wraps a HOSTILE segment in FSI … PDI and leaves every visible character untouched', () => {
    const hostile = `माँ${RLO}बहुत`;
    const out = isolateMemorialBidi(hostile);
    expect(out).toBe(`${FSI}${hostile}${PDF}${PDI}`);
    expect(out.replace(new RegExp(`[${FSI}${PDI}${PDF}]`, 'gu'), '')).toBe(hostile);
  });

  it('is empty for an empty segment (never a bare control pair)', () => {
    expect(isolateMemorialBidi('')).toBe('');
  });

  it.each([
    ['an unterminated RLO', `abc${RLO}xyz`],
    ['an unterminated LRO', `abc${LRO}xyz`],
    ['an unterminated RLE / LRE', `abc${RLE}x${LRE}yz`],
    ['an unterminated RLI', `abc${RLI}xyz`],
    ['an unterminated LRI', `abc${LRI}xyz`],
    ['an unterminated FSI', `abc${FSI}xyz`],
    ['a stray PDI (it would close the wrapper early)', `abc${PDI}xyz`],
    ['two stray PDIs after an RLO', `${RLO}abc${PDI}${PDI}xyz`],
  ])('%s cannot leak into what follows (the omission marker)', (_name, hostile) => {
    // The raw text leaves something open or unmatched (that is the attack) …
    const raw = leftOpen(hostile);
    expect(raw.isolates + raw.embeddings + raw.unmatchedPdi).toBeGreaterThan(0);
    // … the isolated segment leaves NOTHING open, and takes no PDI from its neighbour.
    expect(leftOpen(isolateMemorialBidi(hostile))).toEqual(NEUTRAL);
    // Segment, marker, segment: the marker and the second segment start from a neutral state each time.
    expect(leftOpen(isolateMemorialBidi(hostile) + '[marker]')).toEqual(NEUTRAL);
    expect(leftOpen(isolateMemorialBidi(hostile) + '[marker]' + isolateMemorialBidi('next'))).toEqual(NEUTRAL);
  });

  it.each([
    ['a stray PDF', `abc${PDF}xyz`],
    ['a balanced isolate with an RLO inside', `${RLI}a${RLO}b${PDI}c`],
  ])('%s (already harmless) stays neutral too', (_name, benign) => {
    expect(leftOpen(benign)).toEqual(NEUTRAL);
    expect(leftOpen(isolateMemorialBidi(benign))).toEqual(NEUTRAL);
  });

  it('keeps the family text between the wrapper and its closers VERBATIM', () => {
    const hostile = `abc${RLO}xyz${LRI}pq`;
    const out = isolateMemorialBidi(hostile);
    expect(out.startsWith(FSI + hostile)).toBe(true);
    expect(out.slice((FSI + hostile).length)).toBe(PDI + PDF + PDI); // LRI → PDI, RLO → PDF, then the wrapper's PDI
  });

  it('holds for every short combination of controls (a deterministic sweep)', () => {
    const plainLetters = ['a', 'b', 'क'];
    const alphabet = [...plainLetters, RLO, PDF, LRI, RLI, FSI, PDI, LRE, RLE, LRO];
    let seed = 20261024;
    // The HIGH bits of a power-of-two LCG are the well-mixed ones (its low bits cycle with a tiny period).
    const pick = (n: number): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return Math.floor(seed / 65536) % n;
    };
    const controls = new Set(alphabet.filter((c) => !plainLetters.includes(c)));
    let plain = 0;
    let wrapped = 0;
    for (let n = 0; n < 3000; n += 1) {
      const len = 1 + pick(12);
      let s = '';
      for (let i = 0; i < len; i += 1) s += alphabet[pick(alphabet.length)]!;
      const out = isolateMemorialBidi(s);
      expect(leftOpen(out), JSON.stringify(s)).toEqual(NEUTRAL);
      if ([...s].some((c) => controls.has(c))) {
        // Hostile text keeps the balanced wrap: its own FSI first, a PDI last.
        wrapped += 1;
        expect(out.startsWith(FSI) && out.endsWith(PDI), JSON.stringify(s)).toBe(true);
        expect(out.includes(s), JSON.stringify(s)).toBe(true);
      } else {
        plain += 1;
        expect(out, JSON.stringify(s)).toBe(s);
      }
    }
    // The sweep must exercise BOTH paths (it would be vacuous if the alphabet never produced one of them).
    expect(plain).toBeGreaterThan(30);
    expect(wrapped).toBeGreaterThan(2000);
  });

  it('PLANTED: the bare wrap (no balancing) is NOT enough — the sweep above can fail', () => {
    const bare = (s: string): string => FSI + s + PDI;
    // An unterminated LRI swallows the wrapper's PDI; a stray PDI closes the wrapper early.
    expect(leftOpen(bare(`a${LRI}b`))).not.toEqual(NEUTRAL);
    expect(leftOpen(bare(`a${PDI}b${RLO}c`))).not.toEqual(NEUTRAL);
  });
});
