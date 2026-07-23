// THE ONE BROWSER TEST — Story 8.7 (AC2). Renders the REAL Contribution-Note template through the
// REAL headless-Chromium adapter and asserts on the produced PDF bytes.
//
// ── Why this suite exists, and why it cannot be faked ──────────────────────────────────────────────
// D5 names the concrete disaster: a headless-Chromium container with no Devanagari font renders tofu
// boxes (▯▯▯) for every Hindi glyph WHILE EVERY UNIT TEST STILL PASSES — the fake renderer returns
// fake bytes, the route returns a valid PDF, and the Latin numerals look perfect, which is what makes
// it easy to miss in a quick visual check. AC2 therefore requires that font availability be asserted
// BY A RENDERED-OUTPUT CHECK, not assumed. This is that check, and it is the only test in the repo
// that needs a browser.
//
// It also covers the second AC2 leg — the tagged-PDF structure tree — which is likewise unprovable
// without a real engine.
//
// ── Skip posture ───────────────────────────────────────────────────────────────────────────────────
// The suite SKIPS (loudly, naming what it looked for) when no Chromium/Chrome binary is discoverable,
// exactly like the DB-gated specs skip without `DATABASE_URL`. A skip is NOT evidence the AC holds —
// when it skips, the AC2 font/tagging leg is un-attested for that run and must be recorded as such.
// Set `CHROMIUM_EXECUTABLE_PATH` to point at a binary explicitly.

import { existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

import { createChromiumContributionNotePdfRenderer } from '@twt/platform-adapters';
import { describe, expect, it } from 'vitest';

import { NOTE_EMBEDDED_FACE_NAME } from '../../src/modules/member-pool/note-assets.js';
import { renderContributionNoteHtml } from '../../src/modules/member-pool/note-template.js';

/** Candidate browser binaries, in preference order. `CHROMIUM_EXECUTABLE_PATH` always wins. */
const CANDIDATES = [
  process.env['CHROMIUM_EXECUTABLE_PATH'],
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter((p): p is string => typeof p === 'string' && p.length > 0);

const executablePath = CANDIDATES.find((p) => existsSync(p));

/**
 * Every text-bearing region of the PDF: the raw bytes PLUS every FlateDecode stream inflated.
 *
 * Chrome writes its catalog and font descriptors into COMPRESSED object streams, so a naive substring
 * scan of the raw file finds neither the embedded face name nor `/StructTreeRoot` — and would report a
 * false negative (or, worse, a false positive from an uncompressed coincidence). Inflating first is
 * what makes these assertions mean what they say.
 */
function searchableText(pdf: Uint8Array): string {
  const parts: string[] = [Buffer.from(pdf).toString('latin1')];
  const raw = Buffer.from(pdf);
  // PDF streams are delimited by the `stream` / `endstream` keywords; try to inflate each candidate
  // and keep whatever decompresses. A stream that is not Flate-compressed simply fails and is skipped.
  let cursor = 0;
  for (;;) {
    const start = raw.indexOf('stream', cursor);
    if (start === -1) break;
    const end = raw.indexOf('endstream', start);
    if (end === -1) break;
    // Skip the `stream` keyword + its EOL (CRLF or LF).
    let dataStart = start + 'stream'.length;
    if (raw[dataStart] === 0x0d) dataStart += 1;
    if (raw[dataStart] === 0x0a) dataStart += 1;
    try {
      parts.push(inflateSync(raw.subarray(dataStart, end)).toString('latin1'));
    } catch {
      // Not a Flate stream (or truncated by our crude scan) — the raw copy already covers it.
    }
    cursor = end + 'endstream'.length;
  }
  return parts.join('\n');
}

/** A representative green Note — the richest case (UTR + the सत्यापित stamp + full Devanagari copy). */
const FACTS = {
  contributionId: 'evt-render-1',
  status: 'green',
  attestedAt: '2026-06-20T10:15:00.000Z',
  generatedAt: '2026-07-23T09:00:00.000Z',
  cycleRef: '2026-06',
  deceasedFirstName: 'राजेश',
  deceasedLastInitial: 'श',
  memberFirstName: 'सुशील',
  memberLastInitial: 'कु',
  memberRef: 'TWT-4F2A9C1B',
  poolLetterCode: 'A',
  poolName: null,
  poolCanonicalIdentifier: 'P-2026-06-001',
  amountInr: 500,
  paymentReference: 'TWT7QX4M2K',
  utr: '123456789012',
  niyamavali: null,
  branding: {
    displayNameHi: 'टीचर्स वेलफेयर ट्रस्ट',
    displayNameEn: 'Teachers Welfare Trust',
    logoUrl: null,
    primaryColor: '#1f4e5f',
    secondaryColor: '#c9a227',
  },
} as const;

describe.skipIf(executablePath === undefined)('AC2 — the REAL engine produces a correct, tagged, Devanagari PDF', () => {
  it('embeds the vendored Devanagari face and carries a structure tree', async () => {
    const renderer = createChromiumContributionNotePdfRenderer({
      ...(executablePath ? { executablePath } : {}),
      timeoutMs: 60_000,
    });
    try {
      const html = renderContributionNoteHtml(FACTS);
      const pdf = await renderer.render(html, { title: 'योगदान प्रतिज्ञा — Yogdaan Pratigya', timeoutMs: 60_000 });

      // It is a real PDF, not an empty or truncated body.
      expect(Buffer.from(pdf.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
      expect(pdf.byteLength).toBeGreaterThan(10_000);

      const text = searchableText(pdf);

      // LEG 1 (the tofu guard): the vendored face is actually EMBEDDED. Chrome names an embedded
      // subset `/<TAG>+NotoSansDevanagari`, so the family name appears in the font descriptor. If the
      // engine had substituted a system font — or found none — this fails, which is the entire point.
      expect(text, 'the vendored Devanagari face must be embedded in the PDF (D5 tofu guard)').toContain(
        NOTE_EMBEDDED_FACE_NAME,
      );

      // LEG 2: the tagged-PDF structure tree, so a screen reader reads the document in logical order.
      expect(text, 'the PDF must carry a structure tree (tagged PDF)').toContain('StructTreeRoot');
    } finally {
      await renderer.close();
    }
  }, 90_000);
});

describe.skipIf(executablePath !== undefined)('AC2 — real-engine suite skipped', () => {
  it('records that no browser binary was discoverable (the AC2 render leg is UN-ATTESTED for this run)', () => {
    // Deliberately a passing, informational test rather than a silent skip: a run with no browser must
    // still say so out loud, because "the suite was green" would otherwise be read as "AC2 was proven".
    expect(executablePath).toBeUndefined();
  });
});
