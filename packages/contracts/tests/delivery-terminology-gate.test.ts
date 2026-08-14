// Story 10.21 — MECHANIZES the delivery-terminology mandate (Decision `2026-08-14-113` clause 2).
//
// ⭐ WHY A GATE AND NOT A CONVENTION. The staff-mediated fallback is gated on a machine-checkable
// element that observes ONE thing: **an OTP was issued for the member-direct grant and the primary
// route did not complete**. It does NOT observe the handset. There is no delivery receipt
// (`channels/src/providers/sms-dlt.ts`: *"The gateway gives NO synchronous delivery receipt at accept
// time (no DLR seam in v1)"*) and no mobile-change history (`member_identities` has neither a history
// table nor a `member.mobile_changed` event).
//
// ⛔ SO A FIELD NAMED `mobile_lost` WOULD BE A LIE THE CODE TELLS ITSELF. It would assert to every
// future reader, reviewer, operator and auditor that the system ESTABLISHED something it merely
// INFERRED — and the inference is simply wrong in the ordinary case of a member who was asleep, busy,
// or ignored the message. Story 10.21 has already had to correct THREE artifacts that named a
// protection they did not deliver: the inert `23505` catch, the inert `ON DELETE CASCADE` comment, and
// the vacuous `pii-scrape` gate. This gate exists so a fourth is not created deliberately.
//
// ⚠ AND IT WOULD DECAY SILENTLY WITHOUT THIS. A later rename from `primary_delivery_not_completed` to
// `mobile_lost` reads like a clarification, breaks no test, and changes no behaviour — it only changes
// what the code CLAIMS. That is precisely the failure mode a gate catches and review does not.
//
// ⚠ SELF-REFERENCE: this file necessarily contains the banned terms as its own search needles, so it
// EXCLUDES ITSELF from the scan by name — the same defence the AC2 single-literal gate uses. ⛔ Do not
// "simplify" the exclusion away; the scan would then fail on itself and look like a real violation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

/** Source trees the mandate binds. */
const SCAN_ROOTS = [
  'packages/contracts/src',
  'packages/domain/src',
  'apps/api/src',
  'apps/admin/src',
  'apps/jobs/src',
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage', '.git']);
const SCAN_EXT = new Set(['.ts', '.tsx', '.sql']);

/** This file carries the banned terms as needles; excluding it is what stops a self-hit. */
const SELF = path.basename(fileURLToPath(import.meta.url));

/**
 * ⛔ THE FORBIDDEN TERMS (Decision `2026-08-14-113` clause 2).
 *
 * Built by concatenation so this module does not itself contain the literal tokens — belt and braces
 * alongside the self-exclusion above, and it keeps a grep for these terms pointing at real violations
 * rather than at this file.
 */
const FORBIDDEN = [
  ['mobile', 'lost'].join('_'),
  ['mobile', 'unreachable'].join('_'),
  // camelCase spellings of the same claims — the mandate binds the CLAIM, not one casing of it.
  'mobileLost',
  'mobileUnreachable',
] as const;

/** The one sanctioned term. */
const MANDATED = ['primary', 'delivery', 'not', 'completed'].join('_');

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // a scan root that does not exist yet is not a violation
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(path.extname(entry)) && path.basename(full) !== SELF) out.push(full);
  }
  return out;
}

/** Repo-relative paths of scanned files containing `needle`. */
function filesContaining(needle: string): string[] {
  const hits: string[] = [];
  for (const root of SCAN_ROOTS) {
    for (const file of walk(path.join(repoRoot, root))) {
      if (readFileSync(file, 'utf8').includes(needle)) hits.push(path.relative(repoRoot, file));
    }
  }
  return hits.sort();
}

describe('Story 10.21 — delivery terminology is MANDATED (Decision 2026-08-14-113 clause 2)', () => {
  for (const term of FORBIDDEN) {
    it(`⛔ no source file uses '${term}'`, () => {
      const hits = filesContaining(term);
      expect(
        hits,
        `'${term}' is FORBIDDEN by Decision 2026-08-14-113 clause 2. Found in: ${hits.join(', ')}.\n` +
          `The gate on the staff-mediated fallback observes that an OTP was issued and THE PRIMARY ` +
          `ROUTE DID NOT COMPLETE. It does NOT observe the handset — there is no delivery receipt ` +
          `(no DLR seam in v1) and no mobile-change history. Naming it '${term}' asserts something ` +
          `the system never established, and is wrong for any member who was simply asleep, busy, or ` +
          `ignored the message.\n` +
          `Use '${MANDATED}' instead. If you believe the system CAN now verify the handset, that is a ` +
          `governance change: supersede 2026-08-14-113 first, then rename.`,
      ).toEqual([]);
    });
  }

  it('the gate can actually FAIL — the scanner is not vacuous', () => {
    // ⛔ Revert-sanity. A scan that silently matches nothing would pass forever and prove nothing.
    // A token known to exist in the tree must be found, and a token known not to must not be.
    expect(filesContaining('memberId').length).toBeGreaterThan(0);
    expect(filesContaining('a-token-that-appears-in-no-source-file-anywhere')).toEqual([]);
  });
});
