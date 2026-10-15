// Story 6.36b (Task 4) — the SERVER half of the phone ↔ server normalisation parity: `normalizeMobile` gives exactly the
// `server` answer of every case in the shared fixture (`packages/contracts/tests/fixtures/mobile-normalize-cases.json`).
// The phone half is `apps/mobile/tests/unit/phone-normalize.test.ts` (the app ⛔ cannot import the domain). No DB.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { normalizeMobile } from '../../src/encryption/member-fields.js';

const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../contracts/tests/fixtures/mobile-normalize-cases.json');
const { cases } = JSON.parse(readFileSync(FIXTURE, 'utf-8')) as { cases: { input: string; server: string | null; phone: string | null }[] };

describe('normalizeMobile — the shared fixture (server half)', () => {
  it('has cases on both sides of the line', () => {
    expect(cases.filter((c) => c.server !== null).length).toBeGreaterThan(5);
    expect(cases.filter((c) => c.server === null && c.phone !== null).length).toBeGreaterThan(5);
  });

  it.each(cases.map((c) => [c.input, c.server] as const))('%j ⇒ %j', (input, server) => {
    expect(normalizeMobile(input)).toBe(server);
  });

  it('RULE: wherever the server accepts, the phone gives the SAME answer (the fixture itself is consistent)', () => {
    for (const c of cases) if (c.server !== null) expect(c.phone).toBe(c.server);
  });
});
