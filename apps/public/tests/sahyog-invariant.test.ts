// ⭐ THE REMEMBRANCE-NOT-ANALYTICS INVARIANT IS ACTUALLY IN ALL THREE PLACES — Story 11b.1 (Task 6; AC5).
//
// ── ⛔ WHY THIS FILE EXISTS ─────────────────────────────────────────────────────────────────────
// AC5 requires the invariant be recorded in THREE places: the page frontmatter, the pure render
// module, and the surface's abuse-rules artifact. ⭐ The reason it is three is that those are the
// three files a future author actually opens — one copy in a decision record reaches nobody
// ([[feedback_spec_edits_must_propagate_to_tasks]]).
//
// ⚠ But "recorded in three places" is a CLAIM, and an unchecked claim decays exactly like any
// other: a refactor moves the header, someone trims a comment block, and the story record still
// says three. ⇒ this file checks the claim. It is deliberately a CONTENT check rather than a
// structural one, because what must survive is the PROHIBITION, not a heading.
//
// ⛔ It is NOT a substitute for the behavioural tests — `sahyog-render.test.ts` proves there is no
// sort affordance and no ranking. This proves the RULE is written where a person will read it
// before they build one.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
/**
 * Read a file with its COMMENT PREFIXES stripped and whitespace collapsed.
 *
 * ⚠ Necessary, ⛔ not cosmetic: the invariant is prose inside `//` and `#` comment blocks, so it
 * WRAPS across lines with a prefix on each one. A naive `toMatch` over the raw text fails on
 * correctly-written copy — which would make this file a nuisance that gets deleted rather than a
 * guard that gets kept.
 */
const read = (rel: string): string =>
  readFileSync(join(repoRoot, rel), 'utf8')
    .split('\n')
    .map((l) => l.replace(/^\s*(\/\/|#)\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');

/** ⭐ The three places, named. ⛔ Adding a fourth copy is not an improvement — it is a fourth thing
 *  to drift. ⛔ Removing one is what this file exists to catch. */
const THE_THREE_PLACES = [
  'apps/public/src/pages/sahyog.astro',
  'apps/public/src/lib/sahyog-render.ts',
  'packages/contracts/public-pages/directory-abuse-rules.yaml',
] as const;

/** The five prohibitions AC5 enumerates, each by the word that carries it. */
const FIVE_PROHIBITIONS = [
  /leaderboard/i,
  /ranking/i,
  /gamification/i,
  /social[- ]performance/i,
  /popularity/i,
] as const;

describe('AC5 — the remembrance-not-analytics invariant is in all THREE places', () => {
  for (const place of THE_THREE_PLACES) {
    describe(place, () => {
      const text = read(place);

      it('states the invariant by name', () => {
        expect(text).toMatch(/remembrance,?\s*not\s*analytics/i);
      });

      for (const prohibition of FIVE_PROHIBITIONS) {
        it(`states the prohibition matching ${String(prohibition)}`, () => {
          expect(text).toMatch(prohibition);
        });
      }

      it('states THE TEST a proposal must pass', () => {
        // ⭐ The test is the load-bearing part: the prohibition list can never be exhaustive, so
        // what has to survive is the QUESTION a future author asks about a proposal nobody
        // anticipated. A file carrying the list but not the question has lost the useful half.
        expect(text).toMatch(/remembrance,?\s*transparency\s*or\s*claim\s*discoverability/i);
        expect(text).toMatch(/rejected/i);
      });

      it('⛔ states that the SORT ORDER is not a ranking', () => {
        // ⭐ The prohibition most likely to be breached by accident, so it is called out separately
        // in all three places rather than left implicit inside "rankings".
        expect(text).toMatch(/sort\s*order\s*is\s*not\s*a\s*ranking/i);
        expect(text).toMatch(/never\s*by\s*contribution\s*count/i);
      });
    });
  }

  it('⛔ the abuse-rules artifact keeps the DIRECTORY invariant too — ⛔ not replaced', () => {
    // ⚠ One file, TWO surfaces, TWO invariants. The directory's failure mode is a SOCIAL GRAPH and
    // this one's is a LEADERBOARD; collapsing them into one block would lose both.
    const rules = read('packages/contracts/public-pages/directory-abuse-rules.yaml');
    expect(rules).toMatch(/legitimacy surface, not a social graph/i);
    expect(rules).toMatch(/remembrance,?\s*not\s*analytics/i);
  });
});
