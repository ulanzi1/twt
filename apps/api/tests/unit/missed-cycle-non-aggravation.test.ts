// The NON-AGGRAVATION fence — Story 10.27 (Task 7; AC8). PURE source + contract scan, DB-free.
//
// ⚖ Q5, ratified verbatim by Decision `2026-08-07-086`:
//
//     A trustee may NOT cite a member's visibility into their own missed cycles as an aggravating
//     "on notice" factor in a suspension decision.
//
// Story 10.27 shows a member their own assigned-and-closed cycles that carry no matched
// contribution. This file makes the constraint EXECUTABLE rather than merely stated: it asserts that
// nothing the story adds reaches the trustee-facing SUSPICION channel — no new violator flag, no new
// signal category, no new column on the Trustee-Lite list, and no "the member has seen this" bit
// anywhere.
//
// ── Why this is a real risk and not a ceremonial assertion ───────────────────────────────────────
// The member surface and the violator arm read the SAME opportunity scan (that sharing is Story
// 10.27's D2, and it is deliberate — it stops the member's view drifting from the ladder's verdict).
// One shared scan with two consumers is exactly the shape where a well-meaning author adds "…and
// whether we showed them" to the trustee side in one line. The facts themselves (`skips_current_year`
// and friends) legitimately reach the trustee through `scanR7ViolatorCandidates`; the member's
// VISIBILITY of them must not, because a member being able to read their own record says nothing
// about their conduct, and treating it as aggravation would punish the disclosure itself.
//
// This is the same asymmetry Decision `2026-08-06-081`'s D4 drew one clause over: a clause may
// influence trustee UNDERSTANDING without influencing trustee SUSPICION
// ([[project_r7g_violator_flag_exclusion]]). MEMBER VISIBILITY IS NOT MEMBER NOTICE.
//
// Sibling fence: `packages/validity-service/tests/violator-accusation-channel.test.ts` guards the
// other half — who may CALL the violator derivation. This one guards what may FEED it.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TRUSTEE_SIGNAL_CATEGORIES,
  TrusteeLiteResponse,
  VIOLATOR_FLAG_PERMITTED_KEYS,
  ViolatorFlag,
} from '@twt/contracts';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Everything Story 10.27 added that a trustee surface could plausibly reach for. The member-facing
 * read, its contract shape, and the section that renders it.
 */
const MEMBER_VISIBILITY_IDENTIFIERS = [
  'listMemberMissedCycles',
  'MissedCycleEntry',
  'MissedCycleSection',
  'missedCycles',
  'MISSED_CYCLE_STATE',
] as const;

/**
 * Production roots that render or compute anything a TRUSTEE reads. `apps/admin/src` is the console
 * itself; the two API modules are the trustee worklist and the moderation surface it feeds; the
 * validity-service roots are the ladder and the candidate scan behind the violator arm.
 *
 * ⚠ Deliberately NOT `apps/api/src/modules/member-pool` — that is the member's own surface, which is
 * precisely where this story's read belongs.
 */
const TRUSTEE_FACING_ROOTS = [
  'apps/admin/src',
  'apps/api/src/modules/trustee-lite',
  'apps/api/src/modules/member-moderation',
  'packages/validity-service/src',
  'packages/domain/src/trustee-lite',
] as const;

const SCANNED_EXTENSIONS = ['.ts', '.tsx'];

function collectSourceFiles(rel: string): string[] {
  const abs = path.join(repoRoot, rel);
  const entries = readdirSync(abs, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && SCANNED_EXTENSIONS.some((ext) => e.name.endsWith(ext)))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath ?? abs, e.name)));
}

describe('AC8/Q5 — nothing from the member missed-cycle surface reaches the suspicion channel', () => {
  const files = TRUSTEE_FACING_ROOTS.flatMap(collectSourceFiles);

  it('scans a non-trivial trustee-facing surface (the fence is not vacuously green)', () => {
    expect(files.length).toBeGreaterThan(50);
    // The one live violator consumer must be IN the scanned set, or the fence is pointed elsewhere.
    expect(files).toContain('apps/api/src/modules/trustee-lite/handlers.ts');
  });

  it('⛔ no trustee-facing module references the member missed-cycle read, shape or section', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      const src = stripComments(read(rel));
      for (const ident of MEMBER_VISIBILITY_IDENTIFIERS) {
        // Word-bounded so a longer unrelated identifier cannot match, and comment-stripped so the
        // constraint STATEMENT in the trustee-lite handler does not flag itself.
        if (new RegExp(`\\b${ident}\\b`).test(src)) offenders.push(`${rel} — ${ident}`);
      }
    }
    expect(
      offenders,
      'MEMBER VISIBILITY IS NOT MEMBER NOTICE (Q5, ratified). A trustee-facing module now reads the ' +
        "member's own missed-cycle surface. The underlying FACTS already reach the violator arm " +
        'through `scanR7ViolatorCandidates` — that is the only sanctioned channel. A member being ' +
        'ABLE to see their own record is not evidence about their conduct, and citing it as an ' +
        '"on notice" aggravating factor is exactly what Q5 forbids. Do NOT allowlist this.\n  ' +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('the scan is LIVE — it matches its own targets (a typo would make it green forever)', () => {
    // Otherwise a mis-typed identifier list would assert nothing at all.
    const memberSurface = stripComments(read('apps/api/src/modules/member-pool/handlers.ts'));
    expect(memberSurface).toMatch(/\blistMemberMissedCycles\b/);
    expect(memberSurface).toMatch(/\bmissedCycles\b/);
    // And the pattern really does fire when a trustee-facing file contains one of these.
    for (const ident of MEMBER_VISIBILITY_IDENTIFIERS) {
      expect(new RegExp(`\\b${ident}\\b`).test(`const x = ${ident};`), ident).toBe(true);
    }
  });

  it('the constraint is STATED IN THE CODE at the Trustee-Lite consumer (AC8), not only here', () => {
    // A fence with no explanation at the site it guards teaches the next reader nothing.
    const handler = read('apps/api/src/modules/trustee-lite/handlers.ts');
    expect(handler).toContain('MEMBER VISIBILITY IS NOT MEMBER NOTICE');
    expect(handler).toMatch(/aggravating\s+'on notice' factor in a suspension decision/);
    expect(handler).toContain('project_r7g_violator_flag_exclusion');
  });
});

describe('AC8/Q5 — the trustee-facing CONTRACT gained no surface for this story', () => {
  it('the seven signal categories are unchanged — no missed-cycle category was added', () => {
    expect([...TRUSTEE_SIGNAL_CATEGORIES]).toEqual([
      'cycle_freeze',
      'r9_voting',
      'concealment',
      'appeal',
      'reconciliation',
      'moderation',
      'violator_flag',
    ]);
  });

  it('the Trustee-Lite response gained no section (no new column on the list)', () => {
    expect(Object.keys(TrusteeLiteResponse.shape).sort()).toEqual([
      'appeal',
      'concealment',
      'cycle_freeze',
      'evaluated_at',
      'moderation',
      'r9_voting',
      'reconciliation',
      'violator_flags',
    ]);
  });

  it('the violator flag key set is still the FROZEN four — no "member has seen this" bit', () => {
    expect(Object.keys(ViolatorFlag.shape).sort()).toEqual([...VIOLATOR_FLAG_PERMITTED_KEYS].sort());
    // `.strict()` is what makes the rejection structural rather than conventional.
    const valid = {
      clause_id: 'niy.contribution-discipline.r7-d',
      clause_label: 'R7(D)',
      facts_establishing: [],
      holding_since: null,
    };
    expect(ViolatorFlag.safeParse(valid).success).toBe(true);
    for (const smuggled of [
      'member_notified',
      'member_has_seen',
      'visible_to_member',
      'on_notice',
      'missed_cycles_shown',
      'disclosed_at',
    ]) {
      expect(
        ViolatorFlag.safeParse({ ...valid, [smuggled]: true }).success,
        `the violator flag must reject the aggravating field ${smuggled}`,
      ).toBe(false);
    }
  });
});
