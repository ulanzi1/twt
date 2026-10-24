// Bidi ISOLATION for a family-authored text segment (Story 11b.4, R13 — the mobile leg of AC9's "a hidden bidi control must
// not reorder what is read").
//
// The family may type (or paste) an UNTERMINATED right-to-left override (U+202E) or isolate (U+2067 …). Rendered as-is, the
// control runs on into the NEXT segment of the same line — the omission marker the Trust's decision put there — and
// reorders it (and the words after it). Each text segment is therefore rendered inside a First-Strong Isolate (U+2068) …
// Pop Directional Isolate (U+2069): whatever the family's text opens stays inside its own isolate.
//
// The STORED text is never touched (Trap 6) — this is a DISPLAY wrapper, applied where a segment is drawn. Only
// invisible, default-ignorable controls are added; no visible character of the family's is removed, replaced or reordered.
// ⭐ Text that holds NO embedding, override or isolate control (U+202A–U+202E, U+2066–U+2069) is returned UNCHANGED: nothing
// in it can reach the next segment, and plain Hindi / English should not carry invisible controls whose behaviour on every
// device is unverified. Only hostile text is wrapped.
//
// A bare wrap is not enough on its own, because the PDI matches the NEAREST unmatched initiator: an unterminated isolate
// inside the text would swallow the wrapper's PDI and leave the wrapper's FSI open, and a stray PDI inside the text would
// close the wrapper's FSI early. So the text is walked first and BALANCED: closers are appended for whatever it leaves
// open, and one extra FSI is prefixed for every PDI it has no initiator for.

const FSI = '\u2068';
const PDI = '\u2069';
const PDF = '\u202c';

type Open = 'embedding' | 'isolate';

/** Does `text` hold an embedding / override (U+202A–U+202E) or an isolate control (U+2066–U+2069)? Pure; by code point. */
function hasDirectionalControl(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069)) return true;
  }
  return false;
}

/**
 * `text` made safe to draw next to other segments: unchanged when it holds no directional control; otherwise wrapped so
 * that no control inside it can affect anything outside it. Pure; total; empty ⇒ empty.
 */
export function isolateMemorialBidi(text: string): string {
  if (!hasDirectionalControl(text)) return text;
  const open: Open[] = [];
  let strayPdi = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x202c) {
      // PDF ends the last EMBEDDING / OVERRIDE; it never reaches past an isolate initiator.
      if (open[open.length - 1] === 'embedding') open.pop();
    } else if (cp >= 0x202a && cp <= 0x202e) {
      open.push('embedding'); // LRE, RLE, LRO, RLO
    } else if (cp >= 0x2066 && cp <= 0x2068) {
      open.push('isolate'); // LRI, RLI, FSI
    } else if (cp === 0x2069) {
      // PDI closes the nearest isolate AND every embedding opened inside it.
      const at = open.lastIndexOf('isolate');
      if (at === -1) {
        // No initiator in the text: it closes one of the prefixed FSIs, and every embedding opened since (all of `open`).
        strayPdi += 1;
        open.length = 0;
      } else {
        open.length = at;
      }
    }
  }
  let closers = '';
  for (let i = open.length - 1; i >= 0; i -= 1) closers += open[i] === 'embedding' ? PDF : PDI;
  return FSI.repeat(strayPdi + 1) + text + closers + PDI;
}
