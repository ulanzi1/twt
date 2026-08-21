// ⭐ AC1'S ABSENCE PROOF — `apps/public` GAINS NO KMS MATERIAL. Story 11a.3 (Task 5; AC1).
//
// ── ⛔ WHY AN ABSENCE NEEDS A TEST ──────────────────────────────────────────────────────────────
// `2026-08-20-143` cl.1 rejected option (b) — giving `apps/public` its own encryption deps — on the
// ground that the KEK is shared across EVERY Tier-1 field class (mobile, device tokens, KYC), so
// handing the internet-facing SSR process decrypt capability has a blast radius that is ⛔ not
// "names". The whole architecture of this story rests on that absence.
//
// ⛔ AN ABSENCE NOBODY CHECKS IS AN ABSENCE THAT REGRESSES. Nothing about `apps/public` fails if a
// future author adds `encryption` to a `.server.ts` module — it would typecheck, lint, render, and
// pass every other test in this app. This file is the only thing that would object.
//
// ⚠ DELIBERATELY NOT COMMENT-STRIPPED. Stripping comments would remove false positives (a comment
// that merely NAMES a forbidden token) at the cost of opening a real hole — the 11a.2 review found
// `<AuthenticatedFragment>`'s comment-stripped literal scan defeatable by concatenation and by
// wrapper helpers, and its prose overstated what it proved. The cost of the stricter choice is that
// source comments must describe these tokens rather than spell them; that cost is paid, once, in
// `directory.server.ts`.
//
// ⚠ AND ITS HONEST LIMIT, stated in the 10.12 fence's own style: this is a TEXTUAL scan of source.
// It catches the import, the symbol and the config key — the three ways this capability actually
// arrives. It does ⛔ NOT catch capability reached through a dynamically-computed specifier, and it
// says nothing about what `@twt/domain`'s OTHER namespaces transitively contain. What it proves is
// that no module in this app ASKS for encryption.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
// ⭐ EVERY DIRECTORY THAT SHIPS OR RUNS CODE IN THIS APP — ⛔ not `src/` alone.
// ⚠ The scan root used to be `src/` while two prose locations claimed the absence was asserted
// "across the whole app". `scripts/` was outside it — and Story 11a.3 added TWO executable scripts
// there, either of which could have imported KMS capability with every leg still green.
const SRC = join(here, '../src');
const SCRIPTS = join(here, '../scripts');

/** Every source file under `dir`, recursively. ⚠ A missing dir is an error, ⛔ never an empty scan. */
function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (['.ts', '.astro', '.mjs', '.js'].includes(extname(entry))) out.push(full);
  }
  return out;
}

const FILES = [...collect(SRC), ...collect(SCRIPTS)];

// ⛔ A SCAN THAT FOUND NOTHING IS NOT A PASS. If a future refactor moves or renames either root,
// `collect` would return `[]` and every assertion below would pass over an empty list — the
// vacuous-green shape this repo removes on sight.
it('the scan actually covers files in BOTH roots', () => {
  expect(FILES.some((f) => f.startsWith(SRC))).toBe(true);
  expect(FILES.some((f) => f.startsWith(SCRIPTS))).toBe(true);
  expect(FILES.length).toBeGreaterThan(10);
});

/**
 * The tokens that mean "this process can decrypt Tier-1".
 *
 * ⛔ Each is a DIFFERENT arrival route, listed separately so a failure names which one appeared:
 * the domain namespace, the two helpers, the field-class constant, and the config keys that would
 * have to exist for any of them to work.
 */
const FORBIDDEN: ReadonlyArray<{ token: RegExp; why: string }> = [
  { token: /\bencryption\s*[,}]/, why: 'the @twt/domain `encryption` namespace' },
  { token: /decryptKycField/, why: 'the Tier-1 KYC decrypt helper' },
  { token: /encryptKycField/, why: 'the Tier-1 KYC encrypt helper' },
  { token: /decryptTier1|encryptTier1/, why: 'a raw Tier-1 envelope helper' },
  { token: /MEMBER_KYC_FIELD_CLASS/, why: 'the KYC field class' },
  { token: /buildEncryptionDeps/, why: 'a third by-value encryption-deps parallel' },
  { token: /\bkekRef\b/, why: 'a KEK reference' },
  { token: /\bhmacKeyRef\b/, why: 'an HMAC key reference' },
  { token: /FieldCryptoDeps/, why: 'the crypto deps type' },
];

describe('⭐ AC1 — apps/public holds NO KMS material', () => {
  it('scans a NON-TRIVIAL number of files (⛔ the scan can never pass vacuously)', () => {
    // The 1.13 "inert guard" lesson: a scanner that found nothing to scan would report green.
    expect(FILES.length).toBeGreaterThan(10);
    expect(FILES.some((f) => f.endsWith('directory.server.ts'))).toBe(true);
    expect(FILES.some((f) => f.endsWith('members.astro'))).toBe(true);
  });

  for (const { token, why } of FORBIDDEN) {
    it(`⛔ no module references ${why}`, () => {
      const offenders = FILES.filter((f) => token.test(readFileSync(f, 'utf-8')))
        // This file names every token by construction.
        .filter((f) => !f.endsWith('no-kms-in-public.test.ts'));
      expect(offenders).toEqual([]);
    });
  }

  it('⛔ package.json declares no KMS / crypto dependency', () => {
    const pkg = JSON.parse(readFileSync(join(here, '../package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.filter((n) => /kms|@google-cloud\/kms|node-vault/i.test(n))).toEqual([]);
  });

  it('⭐ and the directory client reaches the data the ALLOWED way — over HTTP', () => {
    // ⚠ The positive half of the same property: proving an absence is only half an argument if
    // nothing shows how the capability IS obtained. The member name arrives already decrypted,
    // already presentation-resolved, from `apps/api`.
    const client = readFileSync(join(SRC, 'lib/directory.server.ts'), 'utf-8');
    expect(client).toMatch(/fetch\(/);
    expect(client).toMatch(/public-pages\/member-directory/);
  });
});
