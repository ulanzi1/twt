// Story 11b.4a (review R13 / R14) — the public photo variant (MP5), DB-free. A PNG may carry an alpha channel and a JPEG has none:
// without a `flatten` the transparent pixels are matted onto BLACK. The pixel bound is ONE number shared with the Send's ingest.

import { readFileSync } from 'node:fs';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { MEMORIAL_PHOTO_MAX_PIXELS } from '../../src/modules/memorial/photo-metadata.js';
import { MEMORIAL_PHOTO_VARIANT, memorialPhotoVariant } from '../../src/modules/public-pages/memorial-photo-variant.js';

/** The `[r, g, b]` of the pixel at (x, y) of a decoded image. */
async function pixel(image: Buffer, x: number, y: number): Promise<number[]> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * info.channels;
  return [data[at]!, data[at + 1]!, data[at + 2]!];
}

describe('memorialPhotoVariant — an alpha channel is flattened onto WHITE (R13)', () => {
  /** 40 × 40 RGBA: the left half fully TRANSPARENT black, the right half opaque red. */
  async function rgbaPng(): Promise<Buffer> {
    return sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: { create: { width: 20, height: 40, channels: 3, background: { r: 255, g: 0, b: 0 } } }, left: 20, top: 0 }])
      .png()
      .toBuffer();
  }

  it('the fixture is a REAL RGBA PNG with a transparent region (else the assertions below prove nothing)', async () => {
    const meta = await sharp(await rgbaPng()).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
    expect(meta.channels).toBe(4);
    const { data } = await sharp(await rgbaPng()).raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // the top-left pixel's alpha
    expect(data[(0 * 40 + 30) * 4 + 3]).toBe(255); // a right-half pixel's alpha
  });

  it('the transparent pixels come out WHITE, ⛔ not black; the opaque pixels keep their colour', async () => {
    const out = await memorialPhotoVariant(await rgbaPng());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.hasAlpha).toBe(false);
    for (const [x, y] of [[2, 2], [10, 20], [17, 37]] as const) {
      const [r, g, b] = await pixel(out, x, y);
      expect(Math.min(r!, g!, b!), `transparent pixel (${x}, ${y}) is white`).toBeGreaterThanOrEqual(250);
    }
    const [r, g, b] = await pixel(out, 30, 20);
    expect(r).toBeGreaterThan(230);
    expect(g).toBeLessThan(40);
    expect(b).toBeLessThan(40);
  });

  it('a semi-transparent pixel lands BETWEEN white and its colour (it is composited onto white, ⛔ dropped to its RGB)', async () => {
    // Opaque black at 50% alpha over white is mid-grey; if the alpha were dropped it would be pure black.
    const half = await sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    const [r, g, b] = await pixel(await memorialPhotoVariant(half), 8, 8);
    for (const c of [r, g, b]) {
      expect(c).toBeGreaterThan(100);
      expect(c).toBeLessThan(160);
    }
  });
});

describe('the pixel bound is ONE number (R14)', () => {
  it('the variant\'s decode bound IS the ingest\'s refusal bound — ⛔ not a second literal', () => {
    expect(MEMORIAL_PHOTO_VARIANT.limitInputPixels).toBe(MEMORIAL_PHOTO_MAX_PIXELS);
    expect(MEMORIAL_PHOTO_MAX_PIXELS).toBe(50_000_000);
  });

  it('…and it is so BY CONSTRUCTION: the variant\'s source takes the constant, ⛔ a literal that merely happens to equal it today (RR11)', () => {
    // The equality above holds for a re-introduced `50_000_000` too — it would fail only the day the two numbers drift apart.
    const src = readFileSync(new URL('../../src/modules/public-pages/memorial-photo-variant.ts', import.meta.url), 'utf-8');
    expect(src).toMatch(/limitInputPixels:\s*MEMORIAL_PHOTO_MAX_PIXELS\b/);
    expect(src).not.toMatch(/limitInputPixels:\s*[\d_]+/);
  });
});
