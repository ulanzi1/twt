// The ACCUSATION-CHANNEL fence — Story 10.26 (Task 1; AC5, D4). PURE source scan.
//
// ⚖ The ratified invariant (D4; `docs/legal/niyamavali.md:81`):
//
//     A clause may influence trustee UNDERSTANDING without influencing trustee SUSPICION.
//
// Story 10.26's AC5 asked for the `imposesRestorationObligation` filter at BOTH R7 producers, on the
// stated assumption that both feed violator flags. A source trace at implementation time showed they
// do not, and the two channels are genuinely different things:
//
//   ACCUSATION   `r7-candidate-scan.ts` → `deriveViolatorFlags` → `summarizeViolatorFlags` → the
//                Trustee-Lite violator section, which feeds SUSPENSION decisions. FILTERED.
//   UNDERSTANDING `evaluateAppliedR7ClauseSlots` → `assembleClauses` → `MemberValidityPayload` →
//                `@twt/ui` `member-status/presenter.ts` `buildRuleExplanations` → the MEMBER'S OWN
//                RECORD. NOT filtered — this is where `memberStatus.rule.no_exemption` comes from,
//                and it is the entire point of activating R7(G) (AC6).
//
// That asymmetry is only SAFE while it stays true. `MemberValidityPayload.applicableNiyamavaliClauses`
// is structurally exactly what `deriveViolatorFlags` reads (the sentinel-lockstep test pins that), so
// a future story could wire the individual payload into a violator surface in one line and silently
// re-create the harm: a member flagged as a suspension candidate for disclosing a bereavement.
//
// This fence makes that impossible to do quietly. It asserts that the ONLY production call sites of
// the violator derivation are the trustee-lite handler and the FILTERED bulk scan that feeds it. If
// you are here because this test went red: you have added an accusation consumer. Either it reads a
// clause list already filtered by `contributesViolatorFlag`, or R7(G) must be excluded before it.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Production source roots that could plausibly route a clause list into the violator derivation. */
const SCANNED_ROOTS = [
  'packages/validity-service/src',
  'packages/domain/src',
  'packages/ui/src',
  'apps/api/src',
  'apps/admin/src',
];

const SCANNED_EXTENSIONS = ['.ts', '.tsx'];

/**
 * The call sites permitted to invoke the violator derivation, and why each is safe.
 * `packages/domain/src/trustee-lite/violator-flags.ts` is the DEFINITION itself (frozen — 10.24 AC5).
 */
const ALLOWED_CALL_SITES = new Set<string>([
  // The definition — `summarizeViolatorFlags` calls `deriveViolatorFlags` internally.
  'packages/domain/src/trustee-lite/violator-flags.ts',
  // The one production consumer, fed exclusively by `scanR7ViolatorCandidates`, which applies the
  // AC5 `contributesViolatorFlag` filter before any clause reaches it.
  'apps/api/src/modules/trustee-lite/handlers.ts',
]);

function collectSourceFiles(rel: string): string[] {
  const abs = path.join(repoRoot, rel);
  const entries = readdirSync(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && SCANNED_EXTENSIONS.some((ext) => e.name.endsWith(ext)))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath ?? abs, e.name)));
}

/** A CALL (`fn(`), not a mention — comments and doc references name these functions constantly. */
const CALL_PATTERN = /\b(?:trusteeLite\.)?(deriveViolatorFlags|summarizeViolatorFlags)\s*\(/;

describe('AC5/D4 — the violator derivation has exactly one production consumer', () => {
  const files = SCANNED_ROOTS.flatMap(collectSourceFiles);

  it('scans a non-trivial production surface (the fence is not vacuously green)', () => {
    expect(files.length).toBeGreaterThan(100);
    // The allowlisted files must actually exist in the scanned set, or the allowlist has gone stale
    // and the fence would pass by naming files nobody has.
    for (const allowed of ALLOWED_CALL_SITES) expect(files).toContain(allowed);
  });

  it('no production module outside the allowlist calls deriveViolatorFlags / summarizeViolatorFlags', () => {
    const offenders = files.filter(
      (rel) => !ALLOWED_CALL_SITES.has(rel) && CALL_PATTERN.test(readFileSync(path.join(repoRoot, rel), 'utf8')),
    );
    expect(
      offenders,
      'A new ACCUSATION consumer appeared. `deriveViolatorFlags` flags EVERY R7 clause it is given ' +
        '(violator-flags.ts:209-216, frozen), so an unfiltered clause list makes a member who ' +
        'disclosed a bereavement a suspension candidate — contradicting the ratified Niyamavali §3.1 ' +
        '("carries no consequence of its own"). Filter with `contributesViolatorFlag` first, then ' +
        'add the site to ALLOWED_CALL_SITES with a note on why it is safe.',
    ).toEqual([]);
  });

  it('the one live consumer is fed by the FILTERED bulk scan, not by an individual validity payload', () => {
    const handler = readFileSync(
      path.join(repoRoot, 'apps/api/src/modules/trustee-lite/handlers.ts'),
      'utf8',
    );
    // `summarizeViolatorFlags(await scanR7ViolatorCandidates(...))` — the filtered producer, inline.
    expect(handler).toMatch(/summarizeViolatorFlags\(\s*await scanR7ViolatorCandidates\(/);
    // And the scan itself still carries the exclusion.
    const scan = readFileSync(
      path.join(repoRoot, 'packages/validity-service/src/r7-candidate-scan.ts'),
      'utf8',
    );
    expect(scan).toMatch(/\.filter\(\(entry\) => contributesViolatorFlag\(entry\.clauseId, payloadsByClauseId\)\)/);
  });
});
