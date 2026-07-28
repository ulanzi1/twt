// Story 9.9 (Task 4; AC5) — the no-routing / no-cap / no-primary guard, with teeth.
//
// This story is donor CHOICE, not automatic routing: it adds NO cap constant, NO daily-receipts reader, NO
// IST cap window, NO account selector/optimizer, NO bank-health probe, and NO primary/secondary priority.
// The story frames the guard as "a reviewer can grep for `cap`, `RBI_UPI`, `routing`, `primary` and find
// nothing new." This test mechanizes that grep over the Story 9.9 source surfaces so a future dev physically
// cannot smuggle routing/cap machinery back in without it going red (revert-sanity teeth).
//
// We scan for IMPLEMENTATION tokens (identifiers a real router/cap would introduce), NOT prose words — so a
// comment that says "NOT a primary/secondary priority" (the deliberate negation) does not false-positive.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// The Story 9.9 source surfaces (comment-stripped — we assert about CODE, not doc prose).
const SURFACES = [
  'apps/api/src/modules/payment/handlers.ts',
  'apps/api/src/modules/payment/routes.ts',
  'apps/api/src/modules/claims/nominee-bank-crypto.ts',
  'packages/contracts/src/contributions/nominee-accounts.ts',
  // The Story 8.13 "default #1 / Switch account" contract this story REFRAMES to equal-choice (review
  // finding, 2026-07-28: the pre-dev consistency pass reached the schema/domain comments but missed this
  // file — added to the guard's scan scope so a future revert can't reintroduce the stale framing here).
  'packages/contracts/src/contributions/upi-intent.ts',
  'packages/domain/src/contribution/intent.ts',
  'apps/mobile/app/(contribution)/pay.tsx',
];

// Identifiers a routing/cap/optimizer/priority implementation would introduce. Case-insensitive; word-ish.
const FORBIDDEN: Array<{ re: RegExp; why: string }> = [
  { re: /RBI_UPI|rbiCap|rbi_cap/i, why: 'an RBI cap constant' },
  { re: /dailyReceipt|receiptsToday|dailyReceived|capWindow|capCounter|capRemaining/i, why: 'a daily-receipts / cap counter' },
  { re: /routeAccount|selectAccount|optimizeAccount|chooseBestAccount|accountRouter|pickAccount/i, why: 'a server-side account router/selector' },
  { re: /bankHealth|probeBank|bankProbe|healthCheck.*account/i, why: 'a bank-health probe' },
  { re: /primaryAccount|isPrimary|accountPriority|secondaryAccount|defaultAccount/i, why: 'a primary/secondary/default account priority' },
];

describe('Story 9.9 — no cap / routing / primary-secondary machinery (AC5, revert-sanity teeth)', () => {
  for (const rel of SURFACES) {
    it(`${rel} introduces no routing/cap/priority identifier`, () => {
      const code = strip(read(rel));
      const hits: string[] = [];
      for (const { re, why } of FORBIDDEN) {
        const m = re.exec(code);
        if (m) hits.push(`${why}: matched '${m[0]}'`);
      }
      expect(hits, `forbidden routing/cap/priority machinery in ${rel}:\n  ${hits.join('\n  ')}`).toEqual([]);
    });
  }

  it('the scan actually reached the surfaces (a scan over zero files proves nothing)', () => {
    for (const rel of SURFACES) {
      expect(read(rel).length, `${rel} unexpectedly empty`).toBeGreaterThan(100);
    }
    // Sanity: the handler DOES contain the equal-choice read (proving we scanned the right, current file).
    expect(read('apps/api/src/modules/payment/handlers.ts')).toContain('nomineeAccounts');
  });
});
