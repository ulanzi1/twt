// The CROSS-SURFACE HELPLINE-PRESENCE fence — Story 8.11 (AC7), DB-free source scan.
//
// UX-DR49 + AR-61 make the "Call helpline" affordance a CROSS-CUTTING fallback: it must be reachable
// (≤ 2 taps → in practice, rendered ON the surface) from EVERY node of the contribution loop, not
// just the claim loop where <CallHelplineCTA> first shipped. A "cross-cutting" claim is only complete
// when an invariant MEANINGFULLY covers the surface ([[feedback_gate_scope_semantic_coverage]]) — so
// this file makes the presence executable: it reads the REAL source of each named contribution
// surface and fails if one stops referencing <CallHelplineCTA>. A future edit that drops the
// affordance from any of them fails at PR time rather than in a review comment.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native / RTL render available), so this
// is a SOURCE SCAN — the 8.10 no-ingest-path.test.ts pattern — not a mount test. Revert-sanity proven
// (remove the CTA from one surface → red → restore → green); see the story's Dev Agent Record.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

// Review finding (2026-07-25): the raw `includes()` checks below matched a comment CONTAINING the
// literal substring (e.g. a stale `// <CallHelplineCTA height={56} />` left after a real removal) —
// the exact false-negative the "not merely a comment" claim was supposed to rule out. Strip comments
// before scanning so only real code can satisfy the presence/render/copy-key assertions. (This is a
// source-scan fence, not an AST — it does not verify per-branch coverage within a file; see the
// story's Review Findings for that documented limitation.)
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** The component reference every contribution surface must carry. */
const AFFORDANCE = 'CallHelplineCTA';

/**
 * Every contribution-loop surface the affordance must ride (AC1). The two already-shipped call sites
 * (pay.tsx, UpiFailureCoach.tsx) are included so a regression that removed THEM also fails here — the
 * fence guards the whole set, not only the three Story 8.11 newly wired.
 */
const CONTRIBUTION_SURFACES: readonly string[] = [
  'apps/mobile/components/active-contribution/ActiveContributionCard.tsx', // My Pool card (8.2)
  'apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx', // Yogdaan Bahi (8.6)
  'apps/mobile/app/(contribution)/note/[id].tsx', // Contribution Note screen (8.7)
  'apps/mobile/app/(contribution)/pay.tsx', // UPI Intent flow (8.4 — shipped)
  'apps/mobile/components/active-contribution/UpiFailureCoach.tsx', // UPI failure coach (8.5 — shipped)
];

describe('AC7 — <CallHelplineCTA> is present on every contribution surface', () => {
  for (const rel of CONTRIBUTION_SURFACES) {
    it(`${rel} references <${AFFORDANCE}>`, () => {
      const src = stripComments(read(rel));
      // Name the offender on failure (the "name the offender" gate contract) — a bare boolean is
      // unactionable. A rendered JSX reference `<CallHelplineCTA` is required, not merely the bare
      // identifier in a comment: the import + the render both contain the substring, and a surface that
      // kept only a stale comment mentioning it (including one that itself contains `<CallHelplineCTA`)
      // is caught because comments are stripped before either check runs.
      expect(
        src.includes(AFFORDANCE),
        `${rel} no longer references <${AFFORDANCE}> — the cross-cutting helpline fallback was ` +
          `dropped from a contribution surface (UX-DR49 + AR-61). Re-add it before merging.`,
      ).toBe(true);
      expect(
        src.includes(`<${AFFORDANCE}`),
        `${rel} imports but never RENDERS <${AFFORDANCE}> — the affordance must be on the surface.`,
      ).toBe(true);
    });
  }

  it('the scan actually reached real source (a scan over missing files proves nothing)', () => {
    for (const rel of CONTRIBUTION_SURFACES) {
      expect(read(rel).length, `${rel} is empty or unreadable — the path is wrong`).toBeGreaterThan(0);
    }
  });
});

// ─── the PDF artifact carries the printed helpline line too (AC4) ────────────────────────────────
//
// A PDF is not tappable, so it carries the NUMBER, not a <CallHelplineCTA>. Guard the artifact's
// footer copy key so the printed helpline line can't silently regress either.
describe('AC4 — the Contribution Note PDF footer references the helpline copy key', () => {
  const TEMPLATE = 'apps/api/src/modules/member-pool/note-template.ts';

  it(`${TEMPLATE} renders the note.helpline footer copy`, () => {
    const src = stripComments(read(TEMPLATE));
    expect(
      src.includes("hi('note.helpline')") && src.includes("en('note.helpline')"),
      `${TEMPLATE} no longer prints the bilingual note.helpline footer line — the PDF artifact would ` +
        `escape the self-view boundary without carrying the helpline number (Story 8.11 AC4).`,
    ).toBe(true);
  });
});
