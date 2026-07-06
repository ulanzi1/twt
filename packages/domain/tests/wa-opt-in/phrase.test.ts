// Verification-phrase generation + extraction — DB-free unit tests (Story 5.4, Task 3).

import { describe, expect, it } from 'vitest';

import {
  VERIFICATION_PHRASE_PREFIX,
  extractVerificationPhrase,
  generateVerificationPhrase,
} from '../../src/wa-opt-in/phrase.js';

describe('generateVerificationPhrase', () => {
  it('emits a prefixed, unambiguous, URL-safe phrase', () => {
    const p = generateVerificationPhrase();
    expect(p.startsWith(VERIFICATION_PHRASE_PREFIX)).toBe(true);
    // Prefix + 8 chars from the unambiguous alphabet (no 0/O/1/I/L, uppercase + 2-9).
    expect(p).toMatch(/^TWT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it('is effectively unique across a large batch (entropy sanity — no collisions in 5k draws)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i += 1) seen.add(generateVerificationPhrase());
    expect(seen.size).toBe(5000);
  });
});

describe('extractVerificationPhrase', () => {
  it('extracts the phrase from a bare Send-Hello body', () => {
    const phrase = generateVerificationPhrase();
    expect(extractVerificationPhrase(phrase)).toBe(phrase);
  });

  it('extracts the anchored token even with surrounding words', () => {
    const phrase = generateVerificationPhrase();
    expect(extractVerificationPhrase(`Hello please enable ${phrase} thanks`)).toBe(phrase);
  });

  it('returns null when no phrase is present', () => {
    expect(extractVerificationPhrase('just a normal message')).toBeNull();
    expect(extractVerificationPhrase('')).toBeNull();
  });

  it('is case-insensitive — a lowercased/retyped phrase still matches (code review 2026-07-06)', () => {
    const phrase = generateVerificationPhrase();
    expect(extractVerificationPhrase(phrase.toLowerCase())).toBe(phrase);
  });

  it('tolerates Unicode dash variants an autocorrect might substitute for the ASCII hyphen', () => {
    const phrase = generateVerificationPhrase();
    const enDash = phrase.replace('-', '–'); // ASCII hyphen → en dash
    expect(extractVerificationPhrase(enDash)).toBe(phrase);
  });
});
