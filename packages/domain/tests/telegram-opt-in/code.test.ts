// Verification-code generation + `/start` extraction — DB-free unit tests (Story 5.5, Task 11).

import { describe, expect, it } from 'vitest';

import {
  TELEGRAM_START_PARAM_MAX_LENGTH,
  VERIFICATION_CODE_PREFIX,
  extractStartCode,
  generateVerificationCode,
} from '../../src/telegram-opt-in/code.js';

describe('generateVerificationCode', () => {
  it('emits a prefixed, unambiguous, start-param-safe code', () => {
    const c = generateVerificationCode();
    expect(c.startsWith(VERIFICATION_CODE_PREFIX)).toBe(true);
    // Prefix + 8 chars from the unambiguous alphabet (no 0/O/1/I/L, uppercase + 2-9). All in [A-Za-z0-9_-].
    expect(c).toMatch(/^TWT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/); // Telegram's start-param charset
    expect(c.length).toBeLessThanOrEqual(TELEGRAM_START_PARAM_MAX_LENGTH);
  });

  it('is effectively unique across a large batch (entropy sanity — no collisions in 5k draws)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i += 1) seen.add(generateVerificationCode());
    expect(seen.size).toBe(5000);
  });
});

describe('extractStartCode', () => {
  it('extracts the code from a `/start <code>` message body', () => {
    const code = generateVerificationCode();
    expect(extractStartCode(`/start ${code}`)).toBe(code);
  });

  it('extracts a bare code (member pasted just the code)', () => {
    const code = generateVerificationCode();
    expect(extractStartCode(code)).toBe(code);
  });

  it('returns null when no code is present', () => {
    expect(extractStartCode('/start')).toBeNull();
    expect(extractStartCode('just a normal message')).toBeNull();
    expect(extractStartCode('')).toBeNull();
  });

  it('is case-insensitive — a lowercased/retyped code still matches', () => {
    const code = generateVerificationCode();
    expect(extractStartCode(`/start ${code.toLowerCase()}`)).toBe(code);
  });

  it('tolerates Unicode dash variants an autocorrect might substitute for the ASCII hyphen', () => {
    const code = generateVerificationCode();
    const enDash = code.replace('-', '–'); // ASCII hyphen → en dash
    expect(extractStartCode(`/start ${enDash}`)).toBe(code);
  });
});
