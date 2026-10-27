// The family memorial photo's METADATA STRIPPER — runs AT INGEST, before `put` (Story 11b.4, MA8 —
// `#decision-2026-10-24-398`). ⛔ Not deferred: the reviewer's signed URL would otherwise hand staff the GPS of the
// family's home. A pure byte-level walk, ⛔ no image dependency, ⛔ no re-encode (the image bytes are otherwise unchanged).
//
//   (i)  The type is decided by MAGIC BYTES (JPEG `FF D8 FF`, the 8-byte PNG signature) — the part's `mimetype` is the
//        client's choice and is ⛔ trusted; anything else ⇒ `photo_type`.
//   (ii) JPEG — the segments are WALKED by their lengths and only the CODING segments are kept (an allow-list: SOFn, DHT,
//        DQT, DRI, DNL, DAC, SOS and the restart / TEM markers) plus the COLOUR data (review T9 — colour data, ⛔ not
//        metadata about a person: without it a Display-P3 phone photo renders washed out and an Adobe-transform JPEG can
//        decode with wrong colours): an APP2 whose identifier is `ICC_PROFILE\0` (ONLY that APP2 — a FlashPix or MPF APP2
//        is dropped) and an APP14 whose identifier is `Adobe`. The rest of APP1–APP15 (EXIF / XMP / MPF / vendor blocks),
//        COM and every reserved or JPGn marker are dropped; APP0 is kept ONLY as the bare 14-byte JFIF header whose thumbnail
//        is 0 x 0 (a JFXX extension, or a JFIF header that embeds an RGB thumbnail, is dropped whole). The entropy-coded
//        data after each SOS is copied up to the next real marker; the walk STOPS at the primary image's EOI and
//        everything after it is dropped. ⚠⛔ Never a raw byte search for `FF D9`: an EXIF APP1 thumbnail carries its own
//        `FF D8 … FF D9`, so a search would cut most phone photos — the walk skips that thumbnail inside its APP1 length.
//        iPhone MPF JPEGs append secondary images after the primary EOI, each with its own APP1 / GPS — all dropped.
//        A JPEG needs a frame (SOF) and a scan (SOS) before its EOI, else `photo_unreadable` (SOI + EOI alone is not an image).
//        PNG — the chunks are walked against an ALLOW-list: IHDR, PLTE, IDAT, IEND (critical) plus `tRNS` and the colour
//        chunks `sRGB`, `iCCP`, `gAMA`, `cHRM` (T9) and `cICP` (review V1 — the HDR / wide-gamut colour code points) are
//        kept; EVERYTHING else is dropped (`eXIf`, the text chunks, `tIME`, `pHYs`, and every private ancillary chunk — a
//        C2PA `caBX`, Apple's `iDOT`, …). IHDR must come first and at least one IDAT must precede IEND, else
//        `photo_unreadable`; everything after `IEND` is dropped.
//        ⚠ THE RESIDUAL (review V1, DECIDED (A)): a kept ICC profile / colour chunk is COPIED AS RECEIVED — ⛔ not parsed,
//        ⛔ not normalised; only its identifier (JPEG) or chunk type (PNG) is matched. An ICC profile can carry a creation
//        date-time and free-text tags (`desc` — e.g. "Display P3" — `cprt`, `dmnd` / `dmdd`, the device maker / model
//        descriptions), and a PNG `iCCP` a free-text profile name. A phone's profile is its maker's generic one, but a
//        crafted file can carry anything there — and it carries only what the family itself put in its own photo.
//   (iii) A truncated or malformed file ⇒ `photo_unreadable` (⛔ never a throw that 500s). The kept ranges are copied
//        into ONE buffer as they close (contiguous ranges coalesce): the cost is bounded by the input's size and does not
//        grow with the number of its segments (a 10 MiB run of 2-byte markers once held millions of `subarray` views).
//   (iv) PIXELS, ⛔ not just bytes (review R14): a frame header (JPEG SOFn) or IHDR (PNG) that declares more than
//        `MEMORIAL_PHOTO_MAX_PIXELS` ⇒ `photo_too_large` (the existing wire code — ⛔ no new value); one that declares an EMPTY
//        image (a width or a height of 0) or a frame too short to hold its size ⇒ `photo_unreadable` (`sharp` refuses both, review
//        RR4). The public photo route's `sharp` decode is bounded by the SAME number, so no photo accepted here is refused for its
//        SIZE — otherwise a 10 MiB file under the byte cap but over the pixel cap is stored, advertised with its alt text, and
//        404s forever. ⚠ That is a bound on the DECLARED size, ⛔ not a promise that the page can serve the photo: this module
//        reads structure and never decodes, so a file whose entropy data `sharp` refuses is still stored (deferred, RR20).
//
// ⚠ Orientation is an EXIF tag and is dropped with APP1: the phone picker re-encodes at `quality: 0.8`, which is expected
// to bake rotation in — ⚠ UNVERIFIED until the Task 6.6 device check (a rotated portrait; an iPhone HEIC original).

export type StrippedPhoto =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly mime: 'image/jpeg' | 'image/png' }
  | { readonly ok: false; readonly problem: 'photo_type' | 'photo_unreadable' | 'photo_too_large' };

/**
 * The most pixels (width × height) a memorial photo may declare — the ONE number: `MEMORIAL_PHOTO_VARIANT.limitInputPixels`
 * (the public route's `sharp` decode bound) is this constant, ⛔ not a second literal that could drift below what ingest admits.
 */
export const MEMORIAL_PHOTO_MAX_PIXELS = 50_000_000;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
/**
 * The ONLY PNG chunks kept: the four critical ones, transparency, and the colour chunks (the sRGB flag, an embedded ICC
 * profile, gamma, chromaticities — T9; the coding-independent code points `cICP` — V1). Everything else is metadata.
 * ⚠ Copied as received — see the header's residual.
 */
const PNG_KEPT_CHUNKS = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'sRGB', 'iCCP', 'gAMA', 'cHRM', 'cICP']);

/** The APP2 identifier of an embedded ICC profile (`ICC_PROFILE` + NUL) — the only APP2 kept. */
const JPEG_ICC_IDENTIFIER = [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00] as const;
/** The APP14 identifier of Adobe's colour-transform segment (`Adobe`) — the only APP14 kept. */
const JPEG_ADOBE_IDENTIFIER = [0x41, 0x64, 0x6f, 0x62, 0x65] as const;

/**
 * Test-visible counters of one strip (T10 (b)): `copies` = how many separate copies into the output buffer were made — a
 * run of contiguous kept ranges is ONE copy, so a file whose kept bytes are one run costs one copy however many segments
 * it has. Optional; the handler passes none.
 */
export interface PhotoStripStats {
  copies: number;
}

function isJpeg(b: Uint8Array): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function isPng(b: Uint8Array): boolean {
  return b.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((v, i) => b[i] === v);
}

const UNREADABLE = { ok: false, problem: 'photo_unreadable' } as const;
const TOO_LARGE = { ok: false, problem: 'photo_too_large' } as const;

/** A range this short is copied by a plain loop (a `subarray` view per tiny range is what made the cost per-segment). */
const SMALL_RANGE = 64;

/**
 * Collects the KEPT byte ranges of `src` into ONE buffer (at most `src.length` bytes, allocated once). A range that starts
 * where the pending one ends EXTENDS it (a run of kept segments is a single copy); the pending range is copied the moment a
 * gap closes it, so ⛔ no per-segment object outlives its own call.
 */
class KeptRanges {
  private readonly out: Uint8Array;
  private at = 0;
  private from = 0;
  private to = 0;

  constructor(
    private readonly src: Uint8Array,
    private readonly stats: PhotoStripStats | undefined,
  ) {
    this.out = new Uint8Array(src.length);
  }

  keep(start: number, end: number): void {
    if (end <= start) return;
    if (this.to > this.from && start === this.to) {
      this.to = end;
      return;
    }
    this.flush();
    this.from = start;
    this.to = end;
  }

  private flush(): void {
    const n = this.to - this.from;
    if (n <= 0) return;
    if (n < SMALL_RANGE) {
      for (let k = 0; k < n; k += 1) this.out[this.at + k] = this.src[this.from + k]!;
    } else {
      this.out.set(this.src.subarray(this.from, this.to), this.at);
    }
    this.at += n;
    this.from = this.to;
    if (this.stats !== undefined) this.stats.copies += 1;
  }

  /** The kept bytes, as a buffer of exactly their length. */
  finish(): Uint8Array {
    this.flush();
    return this.out.slice(0, this.at);
  }
}

/** SOF0–SOF15 less DHT (C4), JPG (C8) and DAC (CC): the frame header — the image's dimensions and components. */
function isJpegFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/** The coding segments that are kept (an allow-list). APP0 is decided separately; everything else is dropped. */
function isJpegCodingSegment(marker: number): boolean {
  return isJpegFrameMarker(marker) || marker === 0xc4 || marker === 0xcc || marker === 0xdb || marker === 0xdc || marker === 0xdd || marker === 0xda;
}

/** The segment's payload (after `FF xx LL LL`) starts with `identifier`. */
function hasIdentifier(b: Uint8Array, pos: number, segEnd: number, identifier: readonly number[]): boolean {
  const p = pos + 4;
  if (segEnd - p < identifier.length) return false;
  return identifier.every((v, i) => b[p + i] === v);
}

/**
 * Colour data kept from the APPn range (T9): an APP2 ICC profile chunk and the APP14 Adobe segment — nothing else.
 * ⚠ Copied as received — see the header's residual.
 */
function isJpegColourSegment(b: Uint8Array, marker: number, pos: number, segEnd: number): boolean {
  if (marker === 0xe2) return hasIdentifier(b, pos, segEnd, JPEG_ICC_IDENTIFIER);
  if (marker === 0xee) return hasIdentifier(b, pos, segEnd, JPEG_ADOBE_IDENTIFIER);
  return false;
}

/**
 * APP0 is kept ONLY as the bare JFIF header: `FF E0 00 10` + `JFIF\0` + version (2) + units (1) + densities (4) + a 0 x 0
 * thumbnail — 14 payload bytes, nothing after. A JFXX extension (an embedded thumbnail image) and a JFIF header that carries
 * an RGB thumbnail are dropped whole; a JPEG without JFIF decodes the same.
 */
function isBareJfifHeader(b: Uint8Array, pos: number, segEnd: number): boolean {
  const p = pos + 4;
  return (
    segEnd - p === 14 &&
    b[p] === 0x4a && // J
    b[p + 1] === 0x46 && // F
    b[p + 2] === 0x49 && // I
    b[p + 3] === 0x46 && // F
    b[p + 4] === 0x00 &&
    b[p + 12] === 0x00 && // Xthumbnail
    b[p + 13] === 0x00 // Ythumbnail
  );
}

function stripJpeg(b: Uint8Array, stats: PhotoStripStats | undefined): StrippedPhoto {
  const kept = new KeptRanges(b, stats);
  kept.keep(0, 2); // SOI
  let sawFrame = false;
  let sawScan = false;
  let pos = 2;
  while (pos < b.length) {
    if (b[pos] !== 0xff) return UNREADABLE;
    // Fill bytes: any number of 0xFF may precede a marker.
    while (pos < b.length && b[pos + 1] === 0xff) pos += 1;
    if (pos + 1 >= b.length) return UNREADABLE;
    const marker = b[pos + 1]!;
    if (marker === 0xd9) {
      // SOI + EOI, or a header with no scan, is not an image — a frame (SOF) AND a scan (SOS) must precede the EOI.
      if (!sawScan) return UNREADABLE;
      kept.keep(pos, pos + 2); // the PRIMARY image's EOI — everything after it (MPF images) is dropped
      return { ok: true, bytes: kept.finish(), mime: 'image/jpeg' };
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      kept.keep(pos, pos + 2); // standalone
      pos += 2;
      continue;
    }
    if (marker === 0x00 || marker === 0xd8) return UNREADABLE;
    if (pos + 3 >= b.length) return UNREADABLE;
    const length = (b[pos + 2]! << 8) | b[pos + 3]!;
    if (length < 2) return UNREADABLE;
    const segEnd = pos + 2 + length;
    if (segEnd > b.length) return UNREADABLE;
    if (isJpegFrameMarker(marker)) {
      sawFrame = true;
      // SOFn payload: precision (1), height (2), width (2), Nf (1), then 3 bytes per component. A valid frame has at least one
      // component, so its `length` (which counts its own 2 bytes) is at least 2 + 1 + 2 + 2 + 1 + 3 = 11; `sharp` refuses a shorter
      // one ("Bogus marker length") and an empty image ("Empty JPEG image") — both checked against `sharp` (review RS4). This reads the
      // declared size, ⛔ a decode.
      if (length < 11) return UNREADABLE;
      const height = (b[pos + 5]! << 8) | b[pos + 6]!;
      const width = (b[pos + 7]! << 8) | b[pos + 8]!;
      if (b[pos + 9] === 0 || width === 0 || height === 0) return UNREADABLE;
      if (width * height > MEMORIAL_PHOTO_MAX_PIXELS) return TOO_LARGE;
    }
    if (marker === 0xda && !sawFrame) return UNREADABLE; // a scan before any frame header
    // An allow-list: the coding segments, the colour data (ICC APP2, Adobe APP14) and the bare JFIF header; EXIF / XMP /
    // MPF / FlashPix / COM / JPGn / reserved are dropped.
    if (
      isJpegCodingSegment(marker) ||
      isJpegColourSegment(b, marker, pos, segEnd) ||
      (marker === 0xe0 && isBareJfifHeader(b, pos, segEnd))
    ) {
      kept.keep(pos, segEnd);
    }
    pos = segEnd;
    if (marker === 0xda) {
      sawScan = true;
      // SOS — copy the entropy-coded data up to the next REAL marker (⛔ a stuffed `FF 00`, ⛔ a restart marker).
      let i = pos;
      for (;;) {
        if (i + 1 >= b.length) return UNREADABLE;
        if (b[i] === 0xff) {
          const next = b[i + 1]!;
          if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
            i += 2;
            continue;
          }
          if (next === 0xff) {
            i += 1;
            continue;
          }
          break;
        }
        i += 1;
      }
      kept.keep(pos, i);
      pos = i;
    }
  }
  return UNREADABLE; // ⛔ no EOI — truncated
}

function stripPng(b: Uint8Array, stats: PhotoStripStats | undefined): StrippedPhoto {
  const kept = new KeptRanges(b, stats);
  kept.keep(0, PNG_SIGNATURE.length);
  let pos: number = PNG_SIGNATURE.length;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let first = true;
  let sawImageData = false;
  while (pos + 12 <= b.length) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4]!, b[pos + 5]!, b[pos + 6]!, b[pos + 7]!);
    if (!/^[A-Za-z]{4}$/.test(type)) return UNREADABLE;
    const end = pos + 12 + length;
    if (end > b.length) return UNREADABLE;
    if (first) {
      // The header chunk comes first and is always 13 bytes long.
      if (type !== 'IHDR' || length !== 13) return UNREADABLE;
      const width = view.getUint32(pos + 8);
      const height = view.getUint32(pos + 12);
      if (width === 0 || height === 0) return UNREADABLE; // the PNG spec forbids a zero dimension
      if (width * height > MEMORIAL_PHOTO_MAX_PIXELS) return TOO_LARGE;
      first = false;
    }
    if (type === 'IDAT') sawImageData = true;
    if (PNG_KEPT_CHUNKS.has(type)) kept.keep(pos, end);
    pos = end;
    if (type === 'IEND') {
      // The signature + IHDR + IEND, with no image data between them, is not an image.
      if (!sawImageData) return UNREADABLE;
      return { ok: true, bytes: kept.finish(), mime: 'image/png' };
    }
  }
  return UNREADABLE; // ⛔ no IEND — truncated
}

/** Check the type by magic bytes and strip the metadata. Total: ⛔ never throws. `stats` is for tests (T10 (b)). */
export function stripMemorialPhotoMetadata(bytes: Uint8Array, stats?: PhotoStripStats): StrippedPhoto {
  try {
    if (isJpeg(bytes)) return stripJpeg(bytes, stats);
    if (isPng(bytes)) return stripPng(bytes, stats);
    return { ok: false, problem: 'photo_type' };
  } catch {
    return UNREADABLE;
  }
}
