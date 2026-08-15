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

/**
 * Trees the mandate binds.
 *
 * ⛔ `packages/domain/migrations` IS IN SCOPE, and its absence was a hole (round-2 code review).
 * `2026-08-14-113` clause 2 binds *"the predicate, the column/field, the error code and the audit
 * action"* — and the COLUMN is declared in `0104_data-rights-delivery-and-correction.sql`, under
 * `migrations/`, not `src/`. `.sql` was already in `SCAN_EXT`, which made the gate look like it
 * covered SQL while no scan root could reach a single `.sql` file. A later migration renaming the
 * column to a handset-flavoured name would have passed green.
 * ⛔ Do not remove the migrations root.
 */
const SCAN_ROOTS = [
  'packages/contracts/src',
  'packages/domain/src',
  'packages/domain/migrations',
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

/**
 * A token guaranteed ABSENT from every scanned file — ⛔ ASSEMBLED AT RUNTIME, never written as a
 * quoted literal. Writing it out would place it in a scanned file and make the revert-sanity assertion
 * below find itself. That is not hypothetical: this gate and its sibling both hardcoded the SAME
 * sentinel, and the moment the scan roots widened to cover the test trees each began finding the
 * other's copy. ⛔ Do not "simplify" this into a string constant.
 */
const ABSENT_SENTINEL = ['no', 'such', 'token', 'in', 'any', 'scanned', 'file'].join('-');

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

  it('⭐ the MANDATED term is actually PRESENT at the four sites the mandate binds', () => {
    // ⛔ FORBIDDING THE WRONG NAMES IS ONLY HALF THE MANDATE. Before this, `MANDATED` was interpolated
    // into failure messages and never asserted — so a drift away from the ruled term to some THIRD,
    // non-banned name (`otp_not_answered`, `delivery_incomplete`, …) passed every assertion above.
    // ⛔ Clause 2 binds four sites; each is asserted by the tree that owns it.
    const sites: ReadonlyArray<readonly [string, string]> = [
      ['the COLUMN', 'packages/domain/migrations'],
      ['the FIELD', 'packages/domain/src'],
      ['the ERROR CODE and AUDIT ACTION', 'apps/api/src'],
    ];
    for (const [what, root] of sites) {
      const hits = filesContaining(MANDATED).filter((f) => f.startsWith(root));
      expect(
        hits.length,
        `${what}: the mandated term '${MANDATED}' must appear under ${root}. Decision ` +
          `2026-08-14-113 clause 2 binds the predicate, the column/field, the error code AND the ` +
          `audit action — renaming it to a third term that merely avoids the banned words is still a ` +
          `breach of the mandate.`,
      ).toBeGreaterThan(0);
    }
  });

  it('the gate can actually FAIL — the scanner is not vacuous', () => {
    // ⛔ Revert-sanity. A scan that silently matches nothing would pass forever and prove nothing.
    // A token known to exist in the tree must be found, and a token known not to must not be.
    expect(filesContaining('memberId').length).toBeGreaterThan(0);
    expect(filesContaining(ABSENT_SENTINEL)).toEqual([]);
    // ⛔ And the migrations root must actually be reachable — otherwise the column assertion above
    // would pass vacuously on an empty file list, which is the exact failure this root was added for.
    expect(
      filesContaining('data_export_delivery_grants').filter((f) => f.endsWith('.sql')).length,
      'the migrations scan root must reach .sql files',
    ).toBeGreaterThan(0);
  });
});
