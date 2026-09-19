// Story 11b.21 Task 2 — `kyc/name-render.ts`, the name normaliser and KMS-outage classifier SHARED by
// the public Sahyog Vivran route and the member contributor list (`#decision-2026-09-19-224` D4).
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import {
  KmsOutageError,
  normalisePublicName,
  withKmsOutageClassification,
} from '../../src/modules/kyc/name-render.js';

describe('normalisePublicName', () => {
  it('returns the name edge-trimmed, interior joiners intact', () => {
    expect(normalisePublicName('  Rajesh Sharma\u200b ')).toBe('Rajesh Sharma');
    // U+200D selects a half-form in Devanagari — ⛔ never stripped from the interior.
    expect(normalisePublicName('प्रज्\u200dञा')).toBe('प्रज्\u200dञा');
  });

  it('returns null for an invisible-only or bidi-only value — ⛔ never an empty string', () => {
    expect(normalisePublicName('\u200b\u2060\ufeff')).toBeNull();
    expect(normalisePublicName('\u202e\u2066')).toBeNull();
    expect(normalisePublicName('   ')).toBeNull();
  });

  it('removes interior bidi controls', () => {
    expect(normalisePublicName('Ravi\u202eKumar')).toBe('RaviKumar');
  });
});

describe('withKmsOutageClassification', () => {
  const makeEnc = (decryptDek: (...args: unknown[]) => Promise<unknown>) =>
    ({ kms: { decryptDek } }) as unknown as AppDeps['encryption'];

  it('re-throws INVALID_ARGUMENT (code 3) unchanged — a per-envelope fault', async () => {
    const original = Object.assign(new Error('3 INVALID_ARGUMENT'), { code: 3 });
    const wrapped = withKmsOutageClassification(makeEnc(vi.fn().mockRejectedValue(original)));
    await expect(wrapped.kms.decryptDek(new Uint8Array(), 'k' as never, new Uint8Array())).rejects.toBe(original);
  });

  it('classifies any other failure, status-less included, as an outage', async () => {
    for (const err of [Object.assign(new Error('14 UNAVAILABLE'), { code: 14 }), new Error('no status')]) {
      const wrapped = withKmsOutageClassification(makeEnc(vi.fn().mockRejectedValue(err)));
      await expect(wrapped.kms.decryptDek(new Uint8Array(), 'k' as never, new Uint8Array())).rejects.toBeInstanceOf(
        KmsOutageError,
      );
    }
  });

  it('carries a surface-neutral message (D4)', () => {
    expect(new KmsOutageError(new Error('x')).message).not.toMatch(/sahyog|member/i);
  });
});

describe('⛔ ONE implementation, ⛔ not two (D4)', () => {
  it('public-pages and member-pool both IMPORT the shared module — neither declares its own', async () => {
    const { readFile } = await import('node:fs/promises');
    const sites = [
      new URL('../../src/modules/public-pages/handlers.ts', import.meta.url),
      new URL('../../src/modules/member-pool/handlers.ts', import.meta.url),
    ];
    for (const site of sites) {
      const source = await readFile(site, 'utf8');
      expect(source).toMatch(/from\s+'(\.\.\/)+kyc\/name-render\.js'/);
      expect(source).not.toMatch(/^\s*(export\s+)?(async\s+)?function\s+(normalisePublicName|withKmsOutageClassification)\b/m);
      expect(source).not.toMatch(/^\s*(export\s+)?class\s+KmsOutageError\b/m);
      expect(source).not.toMatch(/^\s*(export\s+)?(const|let|var)\s+(INVISIBLE_CHARS|EDGE_INVISIBLE_OR_SPACE|BIDI_CONTROLS)\s*=/m);
    }
  });
});
