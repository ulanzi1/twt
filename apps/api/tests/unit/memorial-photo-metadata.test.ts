// Story 11b.4 (MA8, Task 5.1a) — the photo metadata stripper. Synthetic files built byte by byte: planted GPS in an EXIF
// APP1, an EXIF thumbnail carrying its OWN `FF D8 … FF D9`, an MPF trailer after the primary EOI (with its own APP1 /
// GPS), each PNG metadata chunk, a non-image with a JPEG mimetype, and truncated / garbage files. Review T9: the colour
// data (JPEG APP2 ICC / APP14 Adobe; PNG iCCP / gAMA / cHRM, and cICP — review V1) is kept, and only it.

import zlib from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { stripMemorialPhotoMetadata, type PhotoStripStats } from '../../src/modules/memorial/photo-metadata.js';

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
const seg = (marker: number, payload: number[]): number[] => {
  const len = payload.length + 2;
  return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
};
const contains = (hay: Uint8Array, needle: number[]): boolean => {
  outer: for (let i = 0; i + needle.length <= hay.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
};

const APP0 = seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const THUMB = [0xff, 0xd8, 0xff, 0xdb, 0x00, 0x03, 0x00, 0xff, 0xd9]; // a thumbnail with its own SOI … EOI
const APP1_EXIF = seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS-26.8467N-80.9462E'), ...THUMB]);
const COM = seg(0xfe, ascii('taken at home'));
const DQT = seg(0xdb, [0x00, ...new Array<number>(64).fill(1)]);
const SOF0 = seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
const SOS = seg(0xda, [1, 1, 0, 0, 0x3f, 0]);
// Entropy-coded data with a stuffed FF00 and a restart marker — both must be copied, ⛔ read as a marker.
const SCAN = [0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78, 0x9a];
const EOI = [0xff, 0xd9];
const MPF_TRAILER = [0xff, 0xd8, ...seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS-SECOND')]), ...SOS, 0x01, ...EOI];

function jpeg(...parts: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...parts.flat()]);
}

describe('stripMemorialPhotoMetadata — JPEG', () => {
  it('drops the EXIF APP1 (GPS) and COM, keeps APP0 and the coding segments, and the image bytes otherwise unchanged', () => {
    const input = jpeg(APP0, APP1_EXIF, COM, DQT, SOF0, SOS, SCAN, EOI);
    const r = stripMemorialPhotoMetadata(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mime).toBe('image/jpeg');
    expect(contains(r.bytes, ascii('GPS'))).toBe(false);
    expect(contains(r.bytes, ascii('taken at home'))).toBe(false);
    expect([...r.bytes]).toEqual([0xff, 0xd8, ...APP0, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });

  it('a thumbnail inside APP1 (its own FF D9) does ⛔ not cut the file — the scan data is all kept', () => {
    const r = stripMemorialPhotoMetadata(jpeg(APP1_EXIF, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && contains(r.bytes, SCAN)).toBe(true);
  });

  it('drops an MPF trailer after the PRIMARY image\'s EOI (with its own APP1 / GPS)', () => {
    const r = stripMemorialPhotoMetadata(jpeg(APP0, DQT, SOF0, SOS, SCAN, EOI, MPF_TRAILER));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(contains(r.bytes, ascii('GPS-SECOND'))).toBe(false);
    expect([...r.bytes.slice(-2)]).toEqual(EOI);
    expect(r.bytes.length).toBe(2 + APP0.length + DQT.length + SOF0.length + SOS.length + SCAN.length + 2);
  });

  it('a truncated JPEG (⛔ no EOI, or a segment past the end) → photo_unreadable', () => {
    expect(stripMemorialPhotoMetadata(jpeg(APP0, DQT, SOF0, SOS, SCAN))).toEqual({ ok: false, problem: 'photo_unreadable' });
    expect(stripMemorialPhotoMetadata(jpeg([0xff, 0xe1, 0x40, 0x00, 1, 2, 3]))).toEqual({ ok: false, problem: 'photo_unreadable' });
    expect(stripMemorialPhotoMetadata(new Uint8Array([0xff, 0xd8, 0xff]))).toEqual({ ok: false, problem: 'photo_unreadable' });
  });
});

describe('stripMemorialPhotoMetadata — PNG', () => {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: number[]): number[] => {
    const n = data.length;
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, ...ascii(type), ...data, 0, 0, 0, 0];
  };
  const IHDR = chunk('IHDR', new Array<number>(13).fill(0));
  const IDAT = chunk('IDAT', [1, 2, 3, 4]);
  const IEND = chunk('IEND', []);

  it.each(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME'])('drops the %s chunk', (type) => {
    const meta = chunk(type, ascii('GPS-26.8N'));
    const r = stripMemorialPhotoMetadata(new Uint8Array([...SIG, ...IHDR, ...meta, ...IDAT, ...IEND]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mime).toBe('image/png');
    expect([...r.bytes]).toEqual([...SIG, ...IHDR, ...IDAT, ...IEND]);
  });

  it('drops everything after IEND; a PNG with ⛔ IEND → photo_unreadable', () => {
    const r = stripMemorialPhotoMetadata(new Uint8Array([...SIG, ...IHDR, ...IDAT, ...IEND, ...ascii('trailing GPS')]));
    expect(r.ok && [...r.bytes]).toEqual([...SIG, ...IHDR, ...IDAT, ...IEND]);
    expect(stripMemorialPhotoMetadata(new Uint8Array([...SIG, ...IHDR, ...IDAT]))).toEqual({ ok: false, problem: 'photo_unreadable' });
  });
});

describe('stripMemorialPhotoMetadata — the type is decided by MAGIC BYTES', () => {
  it.each([
    ['a PDF', ascii('%PDF-1.7 …')],
    ['text', ascii('hello')],
    ['empty', []],
    ['a GIF', ascii('GIF89a')],
  ])('%s → photo_type (whatever mimetype the client claimed)', (_n, bytes) => {
    expect(stripMemorialPhotoMetadata(new Uint8Array(bytes))).toEqual({ ok: false, problem: 'photo_type' });
  });
});

// ── R11 — a structure check, bounded cost, and an allow-list ──────────────────────────────────────────────────────────

describe('stripMemorialPhotoMetadata — a JPEG needs a frame AND a scan (R11)', () => {
  const unreadable = { ok: false, problem: 'photo_unreadable' } as const;
  const DHT = seg(0xc4, [0x00, ...new Array<number>(16).fill(0), 0x01]);
  const DRI = seg(0xdd, [0x00, 0x04]);

  it.each([
    ['SOI + EOI alone', [EOI]],
    ['a header only (APP0 + DQT; no SOF, no SOS)', [APP0, DQT, EOI]],
    ['a frame with no scan', [APP0, DQT, SOF0, EOI]],
    ['a scan before any frame', [DQT, SOS, SCAN, EOI]],
  ])('%s → photo_unreadable', (_n, parts) => {
    expect(stripMemorialPhotoMetadata(jpeg(...parts))).toEqual(unreadable);
  });

  it('PNG signature + IEND alone is refused too (see the PNG block) and a JPEG with a frame and a scan passes', () => {
    expect(stripMemorialPhotoMetadata(jpeg(DQT, SOF0, SOS, SCAN, EOI)).ok).toBe(true);
  });

  it('a 10 MiB run of `FF 01` markers between SOI and EOI with NO frame or scan is refused (photo_unreadable)', () => {
    const pairs = Math.floor((10 * 1024 * 1024 - 4) / 2);
    const buf = new Uint8Array(2 + pairs * 2 + 2);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    for (let i = 0; i < pairs; i += 1) {
      buf[2 + i * 2] = 0xff;
      buf[3 + i * 2] = 0x01;
    }
    buf[buf.length - 2] = 0xff;
    buf[buf.length - 1] = 0xd9;
    expect(stripMemorialPhotoMetadata(buf)).toEqual(unreadable);
  });

  // T10 (b): the amplification repro, made ACCEPTED (a frame and a scan follow the run) so the range copier actually runs —
  // the frameless file above is refused by the no-scan rule before any copy. The property pinned is STRUCTURAL, ⛔ not a
  // wall-clock bound (the old per-segment walk took ~735 ms here, under any loose timer): the five million kept 2-byte TEM
  // markers sit in ONE contiguous run, so they cost ONE copy into the output — the old walk made one `subarray` per marker.
  it('a 10 MiB run of `FF 01` markers WITH a frame and a scan is accepted, and the run is ONE copy (kept ranges coalesce)', () => {
    const tail = [...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI];
    const pairs = Math.floor((10 * 1024 * 1024 - 2 - APP1_EXIF.length - tail.length) / 2);
    const buf = new Uint8Array(2 + APP1_EXIF.length + pairs * 2 + tail.length);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf.set(APP1_EXIF, 2); // dropped — so the kept bytes are exactly two runs: the SOI, then everything after the APP1
    const runAt = 2 + APP1_EXIF.length;
    for (let i = 0; i < pairs; i += 1) {
      buf[runAt + i * 2] = 0xff;
      buf[runAt + i * 2 + 1] = 0x01;
    }
    buf.set(tail, runAt + pairs * 2);
    expect(pairs).toBeGreaterThan(5_000_000);

    const stats: PhotoStripStats = { copies: 0 };
    const r = stripMemorialPhotoMetadata(buf, stats);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Two copies — the SOI, and [run + DQT + SOF + SOS + scan + EOI] — however many segments the run holds (O(1), not O(n)).
    expect(stats.copies).toBe(2);
    expect(r.bytes.length).toBe(buf.length - APP1_EXIF.length);
    expect(Buffer.compare(Buffer.from(r.bytes.subarray(2)), Buffer.from(buf.subarray(runAt)))).toBe(0);
    expect(contains(r.bytes.subarray(0, 64), ascii('GPS'))).toBe(false);
  });

  it('the copy count tracks the GAPS, not the segments: N kept markers each separated by a dropped COM are N copies', () => {
    // The counter's own teeth: when kept ranges are NOT adjacent they cannot coalesce, so the count rises with them.
    const N = 1_000;
    const middle: number[] = [];
    for (let i = 0; i < N; i += 1) middle.push(...seg(0xfe, [0x41]), 0xff, 0x01); // COM (dropped) then TEM (kept)
    const stats: PhotoStripStats = { copies: 0 };
    const r = stripMemorialPhotoMetadata(jpeg(middle, DQT, SOF0, SOS, SCAN, EOI), stats);
    expect(r.ok).toBe(true);
    // The SOI, then N runs: each TEM starts a new run (a COM before it), and the last one extends through the EOI.
    expect(stats.copies).toBe(1 + N);
  });

  it('a LEGITIMATE many-segment JPEG (kept 2-byte markers alternating with dropped segments) comes through intact', () => {
    // Worst case for the old walk and for any range copier: every kept range is 2 bytes, none is adjacent to the next.
    const N = 100_000;
    const middle: number[] = [];
    const keptMiddle: number[] = [];
    for (let i = 0; i < N; i += 1) {
      middle.push(0xff, 0x01, ...seg(0xfe, [0x41, 0x42])); // TEM (kept) then a COM (dropped)
      keptMiddle.push(0xff, 0x01);
    }
    const r = stripMemorialPhotoMetadata(jpeg(APP0, middle, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bytes.length).toBe(2 + APP0.length + keptMiddle.length + DQT.length + SOF0.length + SOS.length + SCAN.length + 2);
    expect([...r.bytes.subarray(0, 2 + APP0.length)]).toEqual([0xff, 0xd8, ...APP0]);
    expect(r.bytes.subarray(2 + APP0.length, 2 + APP0.length + keptMiddle.length).every((v, i) => v === (i % 2 === 0 ? 0xff : 0x01))).toBe(true);
    expect([...r.bytes.subarray(r.bytes.length - 2)]).toEqual(EOI);
    expect(contains(r.bytes, ascii('AB'))).toBe(false);
  });

  it('a large kept scan (one 3 MiB range) is ONE contiguous copy and arrives byte for byte', () => {
    const head = [0xff, 0xd8, ...APP0, ...DQT, ...SOF0, ...SOS];
    const scanLength = 3 * 1024 * 1024;
    const input = new Uint8Array(head.length + scanLength + 2);
    input.set(head, 0);
    for (let i = 0; i < scanLength; i += 1) input[head.length + i] = i % 251 === 0 ? 0x00 : (i * 7) & 0x7f; // no 0xFF inside
    input.set(EOI, head.length + scanLength);
    const r = stripMemorialPhotoMetadata(input);
    expect(r.ok && r.bytes.length).toBe(input.length);
    expect(r.ok && Buffer.compare(Buffer.from(r.bytes), Buffer.from(input))).toBe(0);
  });

  it('a JFXX extension (an embedded thumbnail image) is dropped; the JFIF header stays', () => {
    const JFXX = seg(0xe0, [...ascii('JFXX'), 0, 0x10, ...THUMB]);
    const r = stripMemorialPhotoMetadata(jpeg(APP0, JFXX, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...APP0, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
    expect(r.ok && contains(r.bytes, ascii('JFXX'))).toBe(false);
  });

  it('a JFIF header that embeds an RGB thumbnail is dropped whole (the thumbnail would carry the image)', () => {
    const JFIF_WITH_THUMB = seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0xde, 0xad, 0xbe]);
    const r = stripMemorialPhotoMetadata(jpeg(JFIF_WITH_THUMB, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });

  it('an unknown APP0 and a reserved JPGn segment are dropped (an allow-list, not a deny-list)', () => {
    const OTHER_APP0 = seg(0xe0, [...ascii('AVI1'), 0, 0, 0, 0]);
    const JPG5 = seg(0xf5, ascii('hidden GPS'));
    const r = stripMemorialPhotoMetadata(jpeg(OTHER_APP0, JPG5, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });

  it('a real small valid JPEG (JFIF, DQT, DHT, DRI, SOF2 progressive, two scans, restart markers) is byte for byte what is kept', () => {
    const SOF2 = seg(0xc2, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
    const input = jpeg(APP0, DQT, DHT, DRI, SOF2, SOS, SCAN, DHT, SOS, SCAN, EOI);
    const r = stripMemorialPhotoMetadata(input);
    expect(r.ok && [...r.bytes]).toEqual([...input]);
  });
});

// ── T9 — colour data is kept (JPEG) ──────────────────────────────────────────────────────────────────────────────────

describe('stripMemorialPhotoMetadata — JPEG colour data is kept (T9), and only it', () => {
  // An APP2 ICC chunk: `ICC_PROFILE\0`, the chunk's sequence number and count, then the profile bytes (with a description).
  const APP2_ICC = seg(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, ...ascii('desc Display P3'), 0x00, 0x10, 0x20]);
  const APP2_ICC_2OF2 = seg(0xe2, [...ascii('ICC_PROFILE'), 0, 2, 2, 0x30, 0x40]);
  // APP14 Adobe: `Adobe`, version (2), flags0 (2), flags1 (2), the colour transform (1).
  const APP14_ADOBE = seg(0xee, [...ascii('Adobe'), 0x00, 0x64, 0x00, 0x00, 0x00, 0x00, 0x01]);
  // A FlashPix APP2 (`FPXR`) and an MPF APP2 (`MPF\0`) — APP2s that are NOT a colour profile.
  const APP2_FLASHPIX = seg(0xe2, [...ascii('FPXR'), 0, 0, ...ascii('GPS-26.8N')]);
  const APP2_MPF = seg(0xe2, [...ascii('MPF'), 0, ...ascii('GPS-SECOND')]);

  it('keeps an APP2 ICC profile (every chunk of a multi-chunk profile), in place, while EXIF / COM around it go', () => {
    const r = stripMemorialPhotoMetadata(jpeg(APP0, APP1_EXIF, APP2_ICC, COM, APP2_ICC_2OF2, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...APP0, ...APP2_ICC, ...APP2_ICC_2OF2, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });

  it('keeps the APP14 Adobe segment (the colour transform)', () => {
    const r = stripMemorialPhotoMetadata(jpeg(APP1_EXIF, APP14_ADOBE, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...APP14_ADOBE, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });

  it.each([
    ['a FlashPix APP2 (FPXR)', APP2_FLASHPIX],
    ['an MPF APP2', APP2_MPF],
    ['an APP2 whose identifier is ICC_PROFILE without its NUL', seg(0xe2, [...ascii('ICC_PROFILEX'), 1, 1])],
    ['an APP2 shorter than the ICC identifier', seg(0xe2, ascii('ICC'))],
    ['an APP14 that is not Adobe', seg(0xee, [...ascii('Adobf'), 0, 0x64])],
    ['an ICC identifier in a DIFFERENT APPn (APP3)', seg(0xe3, [...ascii('ICC_PROFILE'), 0, 1, 1, ...ascii('GPS')])],
  ])('drops %s', (_n, segment) => {
    const r = stripMemorialPhotoMetadata(jpeg(APP0, segment, DQT, SOF0, SOS, SCAN, EOI));
    expect(r.ok && [...r.bytes]).toEqual([0xff, 0xd8, ...APP0, ...DQT, ...SOF0, ...SOS, ...SCAN, ...EOI]);
  });
});

describe('stripMemorialPhotoMetadata — PNG: a structure check and an ALLOW-list (R11)', () => {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: number[]): number[] => {
    const n = data.length;
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, ...ascii(type), ...data, 0, 0, 0, 0];
  };
  const IHDR = chunk('IHDR', new Array<number>(13).fill(0));
  const IDAT = chunk('IDAT', [1, 2, 3, 4]);
  const IEND = chunk('IEND', []);
  const unreadable = { ok: false, problem: 'photo_unreadable' } as const;

  it.each([
    ['the signature + IEND alone', [...SIG, ...IEND]],
    ['a header + IEND with no image data', [...SIG, ...IHDR, ...IEND]],
    ['image data with no header chunk first', [...SIG, ...IDAT, ...IEND]],
    ['an IHDR of the wrong length', [...SIG, ...chunk('IHDR', [1, 2, 3]), ...IDAT, ...IEND]],
  ])('%s → photo_unreadable', (_n, bytes) => {
    expect(stripMemorialPhotoMetadata(new Uint8Array(bytes))).toEqual(unreadable);
  });

  it.each(['pHYs', 'caBX', 'iDOT', 'prVW', 'acTL', 'zzZz'])('drops the %s chunk (not on the allow-list)', (type) => {
    const meta = chunk(type, ascii('GPS-26.8N'));
    const r = stripMemorialPhotoMetadata(new Uint8Array([...SIG, ...IHDR, ...meta, ...IDAT, ...IEND]));
    expect(r.ok && [...r.bytes]).toEqual([...SIG, ...IHDR, ...IDAT, ...IEND]);
  });

  it('keeps PLTE, tRNS and sRGB in place, between the IDATs it also keeps', () => {
    const PLTE = chunk('PLTE', [255, 0, 0]);
    const TRNS = chunk('tRNS', [0]);
    const SRGB = chunk('sRGB', [0]);
    const IDAT2 = chunk('IDAT', [5, 6]);
    const input = [
      ...SIG, ...IHDR, ...SRGB, ...PLTE, ...TRNS, ...chunk('tEXt', ascii('hi')), ...IDAT,
      ...chunk('eXIf', ascii('GPS')), ...IDAT2, ...chunk('tIME', [0, 0, 0, 0, 0, 0, 0]), ...IEND,
    ];
    const r = stripMemorialPhotoMetadata(new Uint8Array(input));
    expect(r.ok && [...r.bytes]).toEqual([...SIG, ...IHDR, ...SRGB, ...PLTE, ...TRNS, ...IDAT, ...IDAT2, ...IEND]);
  });

  // T9 — colour data is kept (⛔ metadata about a person): an embedded ICC profile, gamma and chromaticities; V1 — and the
  // coding-independent code points (`cICP`: colour primaries, transfer function, matrix, full-range flag — here Display P3
  // with the PQ transfer, an HDR phone photo).
  it.each([
    ['iCCP', [...ascii('Display P3'), 0, 0, 0x78, 0x9c, 1, 2, 3]],
    ['gAMA', [0x00, 0x00, 0xb1, 0x8f]],
    ['cHRM', new Array<number>(32).fill(7)],
    ['cICP', [12, 16, 0, 1]],
  ])('keeps the %s colour chunk, in place, while the metadata around it goes', (type, data) => {
    const colour = chunk(type, data);
    const input = [...SIG, ...IHDR, ...chunk('eXIf', ascii('GPS-26.8N')), ...colour, ...chunk('tEXt', ascii('home')), ...IDAT, ...IEND];
    const r = stripMemorialPhotoMetadata(new Uint8Array(input));
    expect(r.ok && [...r.bytes]).toEqual([...SIG, ...IHDR, ...colour, ...IDAT, ...IEND]);
  });

  it('a real small valid PNG (correct CRCs, deflated pixels) passes byte for byte; its metadata does not', () => {
    const crcChunk = (type: string, data: Buffer): Buffer => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(data.length, 0);
      head.write(type, 4, 'ascii');
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])), 0);
      return Buffer.concat([head, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(2, 0); // width
    ihdr.writeUInt32BE(2, 4); // height
    ihdr[8] = 8; // bit depth
    ihdr[9] = 0; // greyscale
    const pixels = zlib.deflateSync(Buffer.from([0, 10, 20, 0, 30, 40]));
    const sig = Buffer.from(SIG);
    const clean = Buffer.concat([
      sig,
      crcChunk('IHDR', ihdr),
      crcChunk('sRGB', Buffer.from([0])),
      crcChunk('iCCP', Buffer.from('icc\0\0profile')), // colour data — kept (T9)
      crcChunk('IDAT', pixels),
      crcChunk('IEND', Buffer.alloc(0)),
    ]);
    const dirty = Buffer.concat([
      sig,
      crcChunk('IHDR', ihdr),
      crcChunk('sRGB', Buffer.from([0])),
      crcChunk('iCCP', Buffer.from('icc\0\0profile')),
      crcChunk('eXIf', Buffer.from('GPS-26.8467N')),
      crcChunk('caBX', Buffer.from('c2pa-manifest')),
      crcChunk('IDAT', pixels),
      crcChunk('tIME', Buffer.alloc(7)),
      crcChunk('IEND', Buffer.alloc(0)),
      Buffer.from('trailing GPS'),
    ]);
    const cleanOut = stripMemorialPhotoMetadata(new Uint8Array(clean));
    expect(cleanOut.ok && Buffer.compare(Buffer.from(cleanOut.bytes), clean)).toBe(0);
    const dirtyOut = stripMemorialPhotoMetadata(new Uint8Array(dirty));
    expect(dirtyOut.ok && Buffer.compare(Buffer.from(dirtyOut.bytes), clean)).toBe(0);
    expect(zlib.inflateSync(pixels)).toEqual(Buffer.from([0, 10, 20, 0, 30, 40]));
  });
});
