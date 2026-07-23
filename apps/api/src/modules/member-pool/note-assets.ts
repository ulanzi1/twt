// Contribution-Note render assets — Story 8.7 (Task 3; AC2 / D5).
//
// The vendored Devanagari faces, read from disk once and cached as data URIs for inlining into the
// Note template's `@font-face` rules.
//
// ── Why the font is INLINED rather than installed (a strengthening of D5) ──────────────────────────
// D5 names the concrete disaster: a headless-Chromium container built from a slim base image has NO
// Devanagari font. Every unit test passes (the fake renderer returns fake bytes), the route returns a
// valid PDF, and the member downloads a document where every Hindi glyph is `▯` — while the Latin
// numerals look perfect, which is exactly what makes it easy to miss in a quick visual check.
//
// D5 offers two defences (local `@font-face` sources AND installing the face in the image). Inlining
// as a data URI is the STRONGER half on its own: the HTML document then CARRIES its own face, so the
// render cannot depend on what the container happens to have installed, on a font-config lookup, or on
// any network fetch (the adapter aborts every non-`data:` request precisely so this cannot regress
// silently). The image-side install becomes belt-and-braces rather than load-bearing.
//
// ── One face, both scripts ─────────────────────────────────────────────────────────────────────────
// Noto Sans Devanagari covers Devanagari AND Latin, digits, `₹` and operational punctuation (verified
// against the vendored file's cmap before choosing it). One face therefore serves the Devanagari names
// and the Latin/Gregorian operational run (D7) with NO second-font fallback hole — a Latin fallback
// that resolved to a missing system font would reintroduce exactly the tofu failure for the numerals.
//
// Provenance: `@expo-google-fonts/noto-sans-devanagari` — the SAME family the mobile app renders with,
// so the artifact and the app agree visually. SIL Open Font License 1.1; the licence text ships beside
// the faces in `apps/api/assets/fonts/LICENSE.txt`.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The vendored faces, by the weight the template asks for. */
const FONT_FILES = {
  regular: 'NotoSansDevanagari_400Regular.ttf',
  bold: 'NotoSansDevanagari_700Bold.ttf',
} as const;

/**
 * Candidate asset roots, tried in order. `apps/api` compiles with `rootDir: "."`, so the emitted
 * layout is `dist/src/modules/member-pool/` while the source layout is `src/modules/member-pool/` —
 * one directory level apart. Rather than guess, try both and fail LOUDLY naming every candidate: a
 * silently-missing font is precisely the failure this module exists to prevent, so it must never
 * degrade to "render without the face".
 */
const ASSET_ROOT_CANDIDATES = ['../../../assets/fonts', '../../../../assets/fonts'] as const;

const here = path.dirname(fileURLToPath(import.meta.url));

/** Resolve a vendored font file to an absolute path, or throw naming every path tried. */
function resolveFontPath(file: string): string {
  const tried: string[] = [];
  for (const root of ASSET_ROOT_CANDIDATES) {
    const candidate = path.resolve(here, root, file);
    tried.push(candidate);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // Try the next layout.
    }
  }
  throw new Error(
    `[contribution-note] vendored font '${file}' not found. Tried:\n  ${tried.join('\n  ')}\n` +
      'The Note template inlines its own Devanagari face (Story 8.7 D5) — rendering without it would ' +
      'silently produce tofu boxes for every Hindi glyph.',
  );
}

/** Lazily-built cache: the faces are ~220 KB each and never change at runtime. */
let cached: { readonly regular: string; readonly bold: string } | null = null;

/**
 * The vendored faces as `data:font/ttf;base64,…` URIs, ready to drop into `@font-face { src: url(…) }`.
 * Read + encoded once per process.
 */
export function devanagariFontDataUris(): { readonly regular: string; readonly bold: string } {
  if (cached !== null) return cached;
  const encode = (file: string): string =>
    `data:font/ttf;base64,${readFileSync(resolveFontPath(file)).toString('base64')}`;
  cached = { regular: encode(FONT_FILES.regular), bold: encode(FONT_FILES.bold) };
  return cached;
}

/**
 * The font family name the template's `@font-face` declares and every rule references. Exported so the
 * real-engine test can assert this exact face is EMBEDDED in the produced PDF (AC2 — font availability
 * is asserted by a rendered-output check, never assumed).
 */
export const NOTE_FONT_FAMILY = 'TWT Note Devanagari';

/** The vendored face's own internal name, as it appears in an embedded-font descriptor inside a PDF. */
export const NOTE_EMBEDDED_FACE_NAME = 'NotoSansDevanagari';
