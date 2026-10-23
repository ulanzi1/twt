// The family memorial photo's METADATA STRIPPER — runs AT INGEST, before `put` (Story 11b.4, MA8 —
// `#decision-2026-10-24-398`). ⛔ Not deferred: the reviewer's signed URL would otherwise hand staff the GPS of the
// family's home. A pure byte-level walk, ⛔ no image dependency, ⛔ no re-encode (the image bytes are otherwise unchanged).
//
//   (i)  The type is decided by MAGIC BYTES (JPEG `FF D8 FF`, the 8-byte PNG signature) — the part's `mimetype` is the
//        client's choice and is ⛔ trusted; anything else ⇒ `photo_type`.
//   (ii) JPEG — the segments are WALKED by their lengths: APP1–APP15 (EXIF / XMP / MPF / ICC / vendor blocks) and COM are
//        dropped; APP0 (JFIF) and every coding segment are kept; the entropy-coded data after each SOS is copied up to the
//        next real marker; the walk STOPS at the primary image's EOI and everything after it is dropped. ⚠⛔ Never a raw byte
//        search for `FF D9`: an EXIF APP1 thumbnail carries its own `FF D8 … FF D9`, so a search would cut most phone
//        photos — the walk skips that thumbnail inside its APP1 length. iPhone MPF JPEGs append secondary images after
//        the primary EOI, each with its own APP1 / GPS — all dropped.
//        PNG — the chunks are walked: `eXIf`, `tEXt`, `iTXt`, `zTXt`, `tIME` dropped; everything after `IEND` dropped.
//   (iii) A truncated or malformed file ⇒ `photo_unreadable` (⛔ never a throw that 500s).
//
// ⚠ Orientation is an EXIF tag and is dropped with APP1: the phone picker re-encodes at `quality: 0.8`, which is expected
// to bake rotation in — ⚠ UNVERIFIED until the Task 6.6 device check (a rotated portrait; an iPhone HEIC original).

export type StrippedPhoto =
  | { readonly ok: true; readonly bytes: Uint8Array; readonly mime: 'image/jpeg' | 'image/png' }
  | { readonly ok: false; readonly problem: 'photo_type' | 'photo_unreadable' };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const PNG_DROPPED_CHUNKS = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);

function isJpeg(b: Uint8Array): boolean {
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function isPng(b: Uint8Array): boolean {
  return b.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((v, i) => b[i] === v);
}

const UNREADABLE = { ok: false, problem: 'photo_unreadable' } as const;

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function stripJpeg(b: Uint8Array): StrippedPhoto {
  const out: Uint8Array[] = [b.subarray(0, 2)]; // SOI
  let pos = 2;
  while (pos < b.length) {
    if (b[pos] !== 0xff) return UNREADABLE;
    // Fill bytes: any number of 0xFF may precede a marker.
    while (pos < b.length && b[pos + 1] === 0xff) pos += 1;
    if (pos + 1 >= b.length) return UNREADABLE;
    const marker = b[pos + 1]!;
    if (marker === 0xd9) {
      out.push(b.subarray(pos, pos + 2)); // the PRIMARY image's EOI — everything after it (MPF images) is dropped
      return { ok: true, bytes: concat(out), mime: 'image/jpeg' };
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(b.subarray(pos, pos + 2)); // standalone
      pos += 2;
      continue;
    }
    if (marker === 0x00 || marker === 0xd8) return UNREADABLE;
    if (pos + 3 >= b.length) return UNREADABLE;
    const length = (b[pos + 2]! << 8) | b[pos + 3]!;
    if (length < 2) return UNREADABLE;
    const segEnd = pos + 2 + length;
    if (segEnd > b.length) return UNREADABLE;
    const dropped = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!dropped) out.push(b.subarray(pos, segEnd));
    pos = segEnd;
    if (marker === 0xda) {
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
      out.push(b.subarray(pos, i));
      pos = i;
    }
  }
  return UNREADABLE; // ⛔ no EOI — truncated
}

function stripPng(b: Uint8Array): StrippedPhoto {
  const out: Uint8Array[] = [b.subarray(0, PNG_SIGNATURE.length)];
  let pos: number = PNG_SIGNATURE.length;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (pos + 12 <= b.length) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(b[pos + 4]!, b[pos + 5]!, b[pos + 6]!, b[pos + 7]!);
    if (!/^[A-Za-z]{4}$/.test(type)) return UNREADABLE;
    const end = pos + 12 + length;
    if (end > b.length) return UNREADABLE;
    if (!PNG_DROPPED_CHUNKS.has(type)) out.push(b.subarray(pos, end));
    pos = end;
    if (type === 'IEND') return { ok: true, bytes: concat(out), mime: 'image/png' };
  }
  return UNREADABLE; // ⛔ no IEND — truncated
}

/** Check the type by magic bytes and strip the metadata. Total: ⛔ never throws. */
export function stripMemorialPhotoMetadata(bytes: Uint8Array): StrippedPhoto {
  try {
    if (isJpeg(bytes)) return stripJpeg(bytes);
    if (isPng(bytes)) return stripPng(bytes);
    return { ok: false, problem: 'photo_type' };
  } catch {
    return UNREADABLE;
  }
}
