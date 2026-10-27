// The family memorial photo's ONE public variant — Story 11b.4a, MP5 (`#decision-2026-10-27-412` item 5).
//
// The stored object is up to 10 MiB (11b.4 MA8) on a 360 px page over cellular, and `-400` item 3 KEPT its ICC profile (whose
// description and date tags would otherwise become public). ⇒ per request: fit inside 960 × 1200 WITHOUT enlargement, convert to
// sRGB, JPEG quality 82 (mozjpeg), and ⛔ NO metadata — `sharp` drops EXIF / XMP / IPTC / ICC unless `withMetadata()` /
// `keepMetadata()` / `keepIccProfile()` is called, and ⛔ none is.
// ⚠ ⛔ NO ROTATION: the ingest stripper already dropped APP1 and the EXIF orientation with it (`memorial/photo-metadata.ts`,
// `-398` MA8), so a stored object carries ⛔ no orientation to apply (Row 41 (h) stays open — a rotated phone photo).
// ⭐ `flatten` onto WHITE (review R13): a PNG may carry an alpha channel and JPEG has none — `sharp` would otherwise matte it onto
// black, and a transparent logo or cut-out becomes a black slab. White is the page's own ground inside the photo frame.
// ⚠ `failOn: 'error'` refuses a truncated / corrupt input (the route's empty 404 — ⛔ never a half-decoded image); `limitInputPixels`
// bounds the decode (~200 MB peak at 50 MP) and is the SAME number ingest refuses above (`MEMORIAL_PHOTO_MAX_PIXELS`, review R14:
// no photo the Send accepted is refused here for its SIZE — one whose data `sharp` cannot decode can still fail, RR20, deferred).
// CPU and memory per request are bounded only by `limits.search` until
// an edge cache exists (Row 41 (p)). Architecture §4.11.2's responsive pipeline / Astro Image component stay unbuilt — a dated
// departure.

import sharp from 'sharp';

import { MEMORIAL_PHOTO_MAX_PIXELS } from '../memorial/photo-metadata.js';

/** MP5's settings — exported for the spec, ⛔ not a tuning surface. */
export const MEMORIAL_PHOTO_VARIANT = {
  maxWidth: 960,
  maxHeight: 1200,
  quality: 82,
  limitInputPixels: MEMORIAL_PHOTO_MAX_PIXELS,
} as const;

/** The public JPEG of a stored memorial photo (JPEG or PNG). Throws on an input `sharp` refuses — the caller 404s. */
export async function memorialPhotoVariant(stored: Uint8Array): Promise<Buffer> {
  return sharp(stored, { failOn: 'error', limitInputPixels: MEMORIAL_PHOTO_VARIANT.limitInputPixels })
    .resize({
      width: MEMORIAL_PHOTO_VARIANT.maxWidth,
      height: MEMORIAL_PHOTO_VARIANT.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .jpeg({ quality: MEMORIAL_PHOTO_VARIANT.quality, mozjpeg: true })
    .toBuffer();
}
