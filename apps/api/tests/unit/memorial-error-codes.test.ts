// Story 11b.5a (code review RP13 → RP24) — the family memorial's error codes have ONE source, `MEMORIAL_MEMBER_ERROR_CODES`
// (`packages/domain/src/memorial/errors.ts`: "the API's error bodies, the api-client's typed refusals and the app's copy keys —
// never invent a synonym"). `memorial.kinship_invalid` was thrown by the Send for a whole story before it was in the tuple, and
// nothing failed. This pin reads the memorial module's SOURCE: every `'memorial.<code>'` literal it throws or returns must be a
// registered code (or the one fail-soft marker the tuple's file exports beside it).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { memorial } from '@twt/domain';
import { describe, expect, it } from 'vitest';

const MODULE_DIR = fileURLToPath(new URL('../../src/modules/memorial/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

/** Every distinct `'memorial.<code>'` literal (a single dotted segment — an audit action such as `memorial.member.read` is two). */
export function codeLiterals(source: string): string[] {
  return [...new Set([...source.matchAll(/'(memorial\.[a-z_]+)'/g)].map((m) => m[1]!))].sort();
}

describe('the memorial module only speaks registered error codes (RP13 / RP24)', () => {
  const registered = new Set<string>([...memorial.MEMORIAL_MEMBER_ERROR_CODES, memorial.MEMORIAL_UNAVAILABLE_NOW]);
  const found = sourceFiles(MODULE_DIR).flatMap((f) => codeLiterals(readFileSync(f, 'utf8')));

  it('is not vacuous: the scan reaches the module and sees the codes the handlers throw', () => {
    expect(sourceFiles(MODULE_DIR).length).toBeGreaterThan(3);
    expect(found.length).toBeGreaterThan(15);
    expect(found).toContain('memorial.kinship_invalid');
    expect(found).toContain('memorial.authorisation_outdated');
  });

  it('every `memorial.<code>` literal in apps/api/src/modules/memorial is in MEMORIAL_MEMBER_ERROR_CODES', () => {
    expect([...new Set(found)].filter((code) => !registered.has(code))).toEqual([]);
  });

  it('the matcher itself: a code outside the tuple is found, an audit action is not', () => {
    expect(codeLiterals("throw new ConflictError('x', 'memorial.not_a_registered_code'); emit('memorial.member.read')")).toEqual([
      'memorial.not_a_registered_code',
    ]);
    expect(registered.has('memorial.not_a_registered_code')).toBe(false);
  });
});
