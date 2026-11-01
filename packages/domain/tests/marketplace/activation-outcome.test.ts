// Story 12.2 (`2026-11-01-433` QE7 (A); AC9; 12.1 RVD5's activation leg) — `classifyActivationOutcome`. DB-free.

import { describe, expect, it } from 'vitest';

import { classifyActivationOutcome } from '../../src/marketplace/activation-sweep.js';
import {
  ModuleGenesisMissingError,
  ModuleIllegalTransitionError,
  ModuleOutsideWindowError,
  ModuleStreamConcurrencyError,
} from '../../src/marketplace/errors.js';

const ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const NOW = new Date('2026-11-01T00:00:00Z');

describe('classifyActivationOutcome', () => {
  it('a racing withdraw (ModuleIllegalTransitionError) → skipped', () => {
    expect(classifyActivationOutcome(new ModuleIllegalTransitionError(ID, 'archived', 'module.activated'))).toBe('skipped');
  });

  it('a window that closed between scan and lock (ModuleOutsideWindowError) → skipped', () => {
    expect(classifyActivationOutcome(new ModuleOutsideWindowError(ID, 'activate', NOW, NOW, NOW))).toBe('skipped');
  });

  it.each([
    ['ModuleGenesisMissingError', new ModuleGenesisMissingError(ID)],
    ['ModuleStreamConcurrencyError', new ModuleStreamConcurrencyError(ID, 3)],
    ['a plain Error', new Error('boom')],
    ['a pg error', Object.assign(new Error('permission denied'), { code: '42501', severity: 'ERROR' })],
    ['a non-error', 'oops'],
  ])('%s → failed', (_l, err) => {
    expect(classifyActivationOutcome(err)).toBe('failed');
  });
});
