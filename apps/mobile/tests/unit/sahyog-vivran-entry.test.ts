// The `live`-drive INBOUND PATH fence — Story 11b.10 (AC4, D4), DB-free source scan.
//
// ⭐⭐ WHY A FENCE AND NOT JUST A COMPONENT: this entry is one half of a deliverable whose OTHER half
// is a security control, and the two are ONE (`2026-09-03-184` cl.4 as widened by `2026-09-04-185`
// cl.3). The token alone makes the entire Sahyog Vivran surface reachable by NOBODY — silently
// inverting the Panel's ratified **(A)** while passing every gate and looking like a security
// improvement. ⇒ a future edit that quietly removes this entry, or re-derives its address on the
// client, must fail at PR time rather than in a review comment.
//
// ⚠ The mobile harness is pure Vitest (⛔ no RTL render), so this is a SOURCE SCAN — the house
// pattern (`helpline-cta-presence.test.ts`, `no-ingest-path.test.ts`) — ⛔ not a mount test. Its
// documented limitation is the same: it proves a reference EXISTS in real code, ⛔ not that every
// branch renders it.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// apps/mobile/tests/unit → repo root is four levels up.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

// ⚠ Comments are STRIPPED before scanning — the 2026-07-25 review finding: a raw `includes()` match
// happily satisfied itself on a commented-out call site, which is the exact false negative these
// fences exist to rule out. This file is DENSELY commented and would trip that in both directions.
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const ENTRY = 'apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx';
const TAB1 = 'apps/mobile/app/(tabs)/index.tsx';
const TAB2 = 'apps/mobile/app/(tabs)/shradhanjali.tsx';
// ⚠ Tab 2 is a one-line delegate; the sample-data wiring D4 measured lives in the COMPONENT.
// ⛔ Asserting only on the route file would leave the ruling's ground unchecked.
const TAB2_COMPONENT = 'apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx';
const URL_BUILDER = 'apps/mobile/lib/public-site.ts';

describe('⭐⭐ the `live`-drive inbound path exists and is on TAB 1 (AC4, D4)', () => {
  it('the My Pool tab mounts <SahyogVivranEntry> — ⛔ in real code, not a comment', () => {
    const src = stripComments(read(TAB1));
    expect(src).toContain('<SahyogVivranEntry />');
    expect(src).toContain('SahyogVivranEntry');
  });

  it('⛔ it is BESIDE <ActiveContributionCard>, ⛔ NEVER inside it (Story 8.3 D8)', () => {
    // ⛔ 8.2 owns the card body; D8 ruled the affordance a SIBLING. This asserts both are mounted as
    // siblings in the same stack — a field added to the card's view model instead would leave the
    // entry absent from the tab, which the previous test already catches.
    const src = stripComments(read(TAB1));
    const card = src.indexOf('<ActiveContributionCard />');
    const entry = src.indexOf('<SahyogVivranEntry />');
    expect(card).toBeGreaterThan(-1);
    expect(entry).toBeGreaterThan(card);
  });

  it('⛔⛔ the SHRADHANJALI tab is UNTOUCHED — the thing that looks obvious and is wrong (D4)', () => {
    // ⚠ Tab 2 is literally named `Shradhanjali` and its component is literally
    // `ShradhanjaliSahyogVivran`, so every instinct puts the entry there. ⛔ It does not belong: that
    // tab renders `SAMPLE_CONTRIBUTORS`/`SAMPLE_MEMORIAL` from `./sample-data` with ZERO API wiring
    // (a P0-5 measurement prototype), so choosing it would silently re-scope this story into
    // building the memorial surface's data layer. ⭐ This fence is what makes that ruling durable.
    for (const rel of [TAB2, TAB2_COMPONENT]) {
      const src = stripComments(read(rel));
      expect(src).not.toContain('SahyogVivranEntry');
      expect(src).not.toContain('sahyogVivranUrl');
    }
    // ⭐ And it is STILL the sample-data prototype — if THAT ever changes, D4's ground has moved and
    // the tab choice deserves re-examination rather than silent inheritance.
    expect(stripComments(read(TAB2_COMPONENT))).toContain('sample-data');
  });
});

describe('⛔⛔ the address is SERVER-RETURNED — never client-derived (AC4, D2)', () => {
  const entrySrc = stripComments(read(ENTRY));
  const builderSrc = stripComments(read(URL_BUILDER));

  it('the entry passes the SERVER-RETURNED token to the URL builder', () => {
    expect(entrySrc).toContain('data.sahyogVivranToken');
    expect(entrySrc).toContain('sahyogVivranUrl(');
  });

  it('⛔ NEITHER the entry NOR the builder touches `poolId` or the canonical identifier', () => {
    // ⛔⛔ THE DEFECT THIS EXISTS TO CATCH: constructing the address from pool facts would re-create
    // D2's guessability INSIDE the client, where nothing server-side could bound it — and it would
    // still produce working links, so ⛔ nothing else would fail.
    for (const src of [entrySrc, builderSrc]) {
      expect(src).not.toContain('poolCanonicalIdentifier');
      expect(src).not.toMatch(/\bpoolId\b/);
    }
  });

  it('the builder reuses `publicSiteOrigin` — ⛔ no hardcoded origin', () => {
    expect(builderSrc).toContain('${publicSiteOrigin}/sahyog-vivran/');
    // ⚠ THE ORIGIN COUNT IS TAKEN FROM THE **RAW** SOURCE, and the reason is a real trap: the
    // house comment-stripper is a regex, and `//` inside `https://twt.org` looks exactly like a
    // line comment to it — so the stripped text contains no origin at all and a count over it
    // would pass VACUOUSLY. ⛔ Exactly one literal: the single CODE-defaulted fallback shared by
    // every link in this module (`EXPO_PUBLIC_PUBLIC_SITE_ORIGIN`'s default).
    const raw = read(URL_BUILDER);
    expect(raw.match(/https:\/\/twt\.org/g) ?? []).toHaveLength(1);
  });
});

describe('⛔ LOCK-STEP suppression, and the a11y contract (AC4)', () => {
  const entrySrc = stripComments(read(ENTRY));

  it('gates on the SAME query the card gates on, and `return null`s otherwise', () => {
    // ⛔ An entry that outlived the card would be a DEAD LINK on the member's home screen. ⚠ It
    // gates on `useActiveContributionQuery` — deliberately UNLIKE `ViewContributorsEntry`, which
    // gates on its destination's own query: here the destination's ADDRESS is a field on the card's
    // query, so the card's query IS the exact precondition.
    // ⚠ THE `!data.sahyogVivranToken` ARM was added by code review: a PERSISTED (MMKV) pre-11b.10
    // `{ assigned: true }` card rehydrates with no token key and no Zod re-parse, and without this
    // the entry would open `…/sahyog-vivran/undefined`. An entry that outlives a usable token is the
    // same dead link as one that outlives the card.
    expect(entrySrc).toContain('useActiveContributionQuery');
    expect(entrySrc).toMatch(
      /if\s*\(!data \|\| !data\.assigned \|\| !data\.sahyogVivranToken\)\s*\{\s*return null/,
    );
  });

  it('opens OUTBOUND with `Linking.openURL` — ⛔ no in-app route, ⛔ no WebView', () => {
    // ⛔ D4 ruled ⛔ no new route group. And every route outside `(auth)` sits behind the root
    // session guard, so an in-app view of PUBLIC trust content would put it back behind a gate.
    expect(entrySrc).toContain('Linking.openURL');
    expect(entrySrc).not.toContain('router.push');
    expect(entrySrc).not.toContain('WebView');
  });

  it('⭐ ≥56pt touch target, `link` role, and BOTH an accessible label and a hint', () => {
    expect(entrySrc).toContain('height={56}');
    // ⛔ `link`, ⛔ not `button`: it leaves the app, and a screen reader should say so first.
    expect(entrySrc).toContain("accessibilityRole=\"link\"");
    expect(entrySrc).toContain('accessibilityLabel');
    expect(entrySrc).toContain('accessibilityHint');
    // ⛔ Copy goes through `t()` with an EXPLICIT namespace — `t()` defaults to `common` and THROWS
    // on a miss ([[project_missed_cycle_visibility_substrate]]).
    expect(entrySrc).toContain("namespace: 'contribution'");
  });

  it('⚠ depends on `locale`, ⛔ never on `t` — `useT()` returns a fresh closure each render', () => {
    expect(entrySrc).toContain('useLocale()');
    expect(entrySrc).toContain('sahyogVivranUrl(data.sahyogVivranToken, locale)');
  });
});

describe('⛔ what D4 ruled OUT stays out (AC4)', () => {
  it('⛔ no notification, ⛔ no 8th FR-71 category, ⛔ no deep-link resource, ⛔ no SMS template', () => {
    // ⭐ Branch (i) was REJECTED and the record of WHY lives in the story. What this asserts is that
    // the rejection HELD in code: the FR-71 push taxonomy is FROZEN and `deepLinkTargetForAlert`'s
    // `resource` is a CLOSED enum, so a `sahyog` arm anywhere here would be a multi-story build
    // against a ratified taxonomy arriving as a side effect.
    const entrySrc = stripComments(read(ENTRY));
    expect(entrySrc).not.toContain('dispatch');
    expect(entrySrc).not.toContain('deepLink');
    expect(entrySrc).not.toContain('alertId');
  });

  it('⛔ no `(sahyog)` route group was added to the app', () => {
    // ⭐ D4 ruled ⛔ NO new route group. `readdirSync` on the route root is the direct reading of
    // that — ⛔ not a proxy for it.
    const groups = readdirSync(path.join(repoRoot, 'apps/mobile/app'));
    expect(groups).toContain('(tabs)');
    expect(groups).not.toContain('(sahyog)');
  });
});
