// Story 11b.4 (MA8, Task 5.1a) — the photo metadata stripper. Synthetic files built byte by byte: planted GPS in an EXIF
// APP1, an EXIF thumbnail carrying its OWN `FF D8 … FF D9`, an MPF trailer after the primary EOI (with its own APP1 /
// GPS), each PNG metadata chunk, a non-image with a JPEG mimetype, and truncated / garbage files.

import { describe, expect, it } from 'vitest';

import { stripMemorialPhotoMetadata } from '../../src/modules/memorial/photo-metadata.js';

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
