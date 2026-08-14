// Story 10.21 (AC2) — MECHANIZES the "one module owns the subcategory token" convention.
//
// ⛔ WHY THIS GATE EXISTS. An un-mechanized naming convention decays, and this one decays SILENTLY.
// `HelpdeskSubcategory` is `z.string().min(1).max(64)` with NO allow-list, and the `other` catch-all
// rule matches ANY subcategory in its category — so a TYPO'd token (`dpdpa-data-right`,
// `dpdpa_data_rights`, …) routes just as cleanly to the same desk, produces no error, and is
// indistinguishable in the queue. The convention has NO natural failure signal, so it needs a gate or
// it has nothing.
//
// ⚠ THE SELF-REFERENCE TRAP, AND HOW THIS FILE AVOIDS IT. A source scan for a literal must itself
// contain that literal as its search needle — so an un-excluded scan FAILS ON ITSELF. Two defences,
// both deliberate:
//   1. the needle is READ FROM THE IMPORTED CONSTANT, never written out here; and
//   2. this file is excluded from the scan by name.
// ⛔ Do not "simplify" by hardcoding the string — that reintroduces exactly the failure this comment
// describes, and it will look like a real violation.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DATA_RIGHTS_STEP_UP_CONTEXT,
  DPDPA_DATA_RIGHTS_SUBCATEGORY,
} from '../src/member-data-rights/member-data-rights.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

/** Source trees that may legitimately mention the token. */
const SCAN_ROOTS = ['packages/contracts/src', 'packages/domain/src', 'apps/api/src', 'apps/admin/src'];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', 'coverage', '.git']);
const SCAN_EXT = new Set(['.ts', '.tsx']);

/** This file is its own needle-carrier; excluding it is what stops the scan failing on itself. */
const SELF = path.basename(fileURLToPath(import.meta.url));

/** The ONE module allowed to declare the tokens. */
const OWNER = path.join('packages', 'contracts', 'src', 'member-data-rights', 'member-data-rights.ts');

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

/**
 * Every scanned source file declaring `needle` as a COMPLETE quoted string literal, repo-relative.
 *
 * ⚠ QUOTE-DELIMITED, and that is a correctness requirement rather than a nicety. A bare
 * `.includes(needle)` also matches the token as a PREFIX of a longer, semantically different literal —
 * e.g. the audit action `'member_data_rights.rtbf_fulfilled'` contains the step-up context
 * `'member_data_rights'`. That produced a false violation on a correct implementation, which is the
 * worst failure mode a gate can have: it teaches the next reader to distrust it and weaken it.
 * ⛔ Do not "simplify" this back to a substring test.
 */
function filesContaining(needle: string): string[] {
  const quoted = [`'${needle}'`, `"${needle}"`, `\`${needle}\``];
  const hits: string[] = [];
  for (const root of SCAN_ROOTS) {
    for (const file of walk(path.join(repoRoot, root))) {
      const text = readFileSync(file, 'utf8');
      if (quoted.some((q) => text.includes(q))) hits.push(path.relative(repoRoot, file));
    }
  }
  return hits.sort();
}

describe('Story 10.21 AC2 — the DPDPA tokens are declared in exactly ONE module', () => {
  it('the subcategory literal appears in exactly one source module (its own)', () => {
    // ⚠ needle read from the constant, never written here — see the header.
    const hits = filesContaining(DPDPA_DATA_RIGHTS_SUBCATEGORY);
    expect(
      hits,
      `'${DPDPA_DATA_RIGHTS_SUBCATEGORY}' must be a literal in exactly ONE module (${OWNER}). ` +
        `Found in: ${hits.join(', ')}. If you added a call site, IMPORT the constant instead — a typo ` +
        `here routes cleanly to the same desk and nothing complains.`,
    ).toEqual([OWNER]);
  });

  it('the step-up context literal appears in exactly one source module (its own)', () => {
    // Same discipline, different failure mode: a typo in the OTP-REQUEST path yields an elevation that
    // can never satisfy the gate — permanently broken, with no error naming the cause. There is no
    // step-up context registry to catch it; string inequality is the only mechanism.
    const hits = filesContaining(DATA_RIGHTS_STEP_UP_CONTEXT);
    expect(
      hits,
      `'${DATA_RIGHTS_STEP_UP_CONTEXT}' must be a literal in exactly ONE module (${OWNER}). ` +
        `Found in: ${hits.join(', ')}. Import the constant on BOTH sides — the route AND the OTP-request ` +
        `caller — or the elevation can never satisfy the gate.`,
    ).toEqual([OWNER]);
  });

  it('the gate can actually FAIL — the scanner finds a planted duplicate', () => {
    // ⛔ Revert-sanity. A scan that silently matches nothing would pass forever and prove nothing. This
    // asserts the machinery itself works, using a token the scanner WILL find in the owner module.
    expect(filesContaining(DPDPA_DATA_RIGHTS_SUBCATEGORY).length).toBeGreaterThan(0);
    expect(filesContaining('a-token-that-appears-in-no-source-file-anywhere')).toEqual([]);
    // ⛔ And the quote-delimiting itself must hold: a token that only ever appears as the PREFIX of a
    // longer literal is NOT a declaration of that token, and must not be reported as one.
    expect(filesContaining('member_data_rights.rtbf')).toEqual([]);
  });
});
