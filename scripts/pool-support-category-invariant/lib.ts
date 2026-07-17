// scripts/pool-support-category-invariant/lib.ts
//
// Pure scanner for the Story 7.1 AC4 invariant: the pool engine has NO death-specific
// branches. Every pool-engine code path operates on the `support_category` ENUM values,
// never on a hardcoded `'death'` / `'death_support'` string. v2 `_daan` activation must
// be a CONFIGURATION change (a new enum label + a new insert), NOT an engine refactor —
// which is only true if the engine never special-cases death by literal.
//
// The scan is a STRING MATCH (AC4 wording: "no string match on 'death' or
// 'death_support'"): the token `death` (case-insensitive, so `Death`/`DEATH` also match)
// anywhere in a pool-engine source line — INCLUDING comments — is a finding. The ONLY
// legitimate home for the `death_support` literal is the enum DEFINITION file
// (schema/pools.ts), which the caller allowlists. Pool-engine code that needs the v1
// category reads it from the `POOL_SUPPORT_CATEGORIES` tuple / the enum, never a literal.
//
// This deliberately catches comments too (a pool-engine comment that says "death" is a
// smell that the code is thinking in death-specific terms — the discriminator's whole
// point is that the engine is category-agnostic). The scanner is line-oriented + pure;
// check.ts owns the file walk + the allowlist.

export interface DeathBranchFinding {
  file: string;
  line: number;
  detail: string;
}

/** The forbidden token. Case-insensitive so `Death` / `DEATH` also match; `death_support`
 *  contains `death`, so both AC4 tokens are covered by this one pattern. */
const DEATH_PATTERN = /death/i;

/** Scan one pool-engine TypeScript source for any `death` string match (line-oriented). */
export function scanDeathBranches(file: string, source: string): DeathBranchFinding[] {
  const findings: DeathBranchFinding[] = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = DEATH_PATTERN.exec(line);
    if (m) {
      findings.push({
        file,
        line: i + 1,
        detail: `hardcoded '${line.slice(m.index, m.index + 13).trim()}' — pool-engine code must key on the support_category enum, never a death literal`,
      });
    }
  }
  return findings;
}

export function formatFinding(f: DeathBranchFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `The pool engine has NO death-specific branches (Story 7.1 AC4): every path operates on ` +
    `the support_category enum (POOL_SUPPORT_CATEGORIES), never a hardcoded 'death'/'death_support' ` +
    `string. v2 _daan activation is a config change, not an engine refactor — keep it that way.`
  );
}
