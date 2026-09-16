// ⭐⭐ FAMILY 13 IN ITS **WEB** FORM, ON `/sahyog-vivran/[driveToken]` — Story 11b.3b (Task 6, AC7).
//
// ── ⛔ WHY THIS IS A SOURCE SCAN, AND ⛔ WHY THAT IS ⛔ NOT A COMPROMISE ──────────────────────────
// ⛔ There is ⛔ no DOM harness for `.astro` files in this app — the house carve-out is that display
// LOGIC is tested through the pure render module (`sahyog-vivran-render.test.ts`) and the copy through
// the real `t()` (`sahyog-vivran-copy.test.ts`). ⭐ What ⛔ neither can see is the **MARKUP**: whether
// the name the render model produces is announced by a real heading, inside a real list, beside a
// landmark that says what it is. ⇒ this file scans the template, the same idiom
// `sahyog-drive-link-a11y.test.ts` already uses for the sibling surface.
//
// ⚠⛔ **THE CHECKLIST'S MOBILE WORDING DOES ⛔ NOT TRANSLITERATE.** Family 13 is written for React
// Native — `accessible={true}` + `accessibilityRole` + an accessible name, the control a SIBLING of a
// labelled container. ⛔ On the web there is ⛔ no `accessibilityRole`: **the semantic element IS the
// role**, and adding `role="list"` to a `<ul>` is how a real list gets broken by a typo. ⇒ the web
// form of the same three checks is: a real ELEMENT · a real NAME · a real STRUCTURE.
//
// ⚠ AND ⛔ NO a11y CI GATE IS MINTED HERE — AI-11a-3 routes that to *"checklist/invariant family 13
// first; a CI gate ⛔ only if later mechanically justified"* (C-2: 19 gates in `scripts/`, ⛔ none a11y).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');

/**
 * Strip Astro/JS comments so a commented-out element cannot satisfy a presence assertion.
 *
 * ⚠ THE HOUSE FINDING (2026-07-25), inherited rather than rediscovered: a raw `includes()` happily
 * matched a literal inside a comment. ⭐ This page is **densely** commented — the contributor section
 * alone carries more prose than markup — so stripping is load-bearing here, ⛔ not hygiene.
 */
const template = (src: string): string =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGE = template(readFileSync(join(appRoot, 'src/pages/sahyog-vivran/[driveToken].astro'), 'utf8'));

describe('⭐ the page is NON-EMPTY after comment-stripping (⛔ the anti-vacuity guard)', () => {
  it('⛔ the scan has a subject — a stripped-to-nothing page would pass every leg below', () => {
    // ⛔ Without this, a template whose markup moved elsewhere would make every `not.toMatch` below
    // pass over an empty string — green, and proving ⛔ nothing
    // ([[feedback_gate_scope_semantic_coverage]]).
    expect(PAGE.length).toBeGreaterThan(2000);
    expect(PAGE).toContain('<MatrixField');
  });
});

describe('⭐⭐ the contributor section — family 13 (web): real ELEMENT · real NAME · real STRUCTURE', () => {
  it('⭐ is a real `<section>` NAMED BY ITS OWN HEADING — ⛔ not an unlabelled `<div>`', () => {
    // ⭐ `aria-labelledby` over `aria-label`: the heading is ⛔ already on the page, so pointing at it
    // keeps ONE string. A second `aria-label` would be a copy that can drift out of sync with the
    // heading a sighted reader sees — the two would then disagree about what the section is.
    expect(PAGE).toMatch(/<section\s+aria-labelledby="sv-contributors-heading"/);
    expect(PAGE).toMatch(/<h2 id="sv-contributors-heading"[^>]*>\{labels\.contributorsHeader\}<\/h2>/);
  });

  it('⭐ renders the names in a real `<ul>`/`<li>` — ⛔ never `<div>`s or `<br>`-separated text', () => {
    // ⚠ A list is how a screen reader announces "list, 3 items" and lets a user skip it. A stack of
    // `<div>`s announces nothing and cannot be skipped — on a page whose whole purpose is that a
    // stranger can CHECK it, that is the difference between scannable and merely present.
    expect(PAGE).toMatch(/<ul[^>]*>\s*\{model\.contributors\.map/);
    // ⭐⭐ `#decision-2026-09-16-219` cl.1 — A ROW NOW HAS TWO ARMS, AND **BOTH** MUST BE A REAL `<li>`.
    // ⚠ The `<li>` opens ONCE and the name/placeholder branch sits INSIDE it, so a withheld name is
    // announced as an ordinary list item — ⛔ never as a bare span outside the list, and ⛔ never as a
    // skipped position that makes the list announce a count smaller than the page shows.
    // ⛔ This used to assert `<li>` was followed IMMEDIATELY by `<MatrixField>`; that would now pass
    // only by deleting the placeholder arm.
    // ⚠ `PAGE` is COMMENT-STRIPPED by this file's own loader, so the `<li>` is followed by the
    // ternary itself, ⛔ not by the explanatory block that sits there in the source.
    expect(PAGE).toMatch(/<li[^>]*>\s*\{contributor\.contributorName === null \? \(/);
    expect(PAGE).toMatch(
      /\{contributor\.contributorName === null \? \(\s*<span[^>]*>\{labels\.contributorUnnamed\}<\/span>/,
    );
    expect(PAGE).toMatch(/\) : \(\s*<MatrixField surface="sahyog-vivran" field="contributor_name"/);
  });

  it('⭐⭐ `-219` cl.3 — the placeholder row carries ⛔ NO marker distinguishing it', () => {
    // ⛔⛔ Five different causes produce a withheld name, and the row must ⛔ not say which — ⛔ not by
    // an attribute, ⛔ not by a data-* hook, ⛔ not by a per-cause class. ⚠ A screen-reader user and a
    // scraper must see the SAME undifferentiated row a sighted visitor does.
    // ⭐ The permitted difference is presentational only (muted + italic), which carries ⛔ no cause.
    expect(PAGE).not.toMatch(/data-(erased|omitted|withheld|rtbf|anonymized)/i);
    expect(PAGE).not.toMatch(/aria-label=\{[^}]*contributorUnnamed/);
    expect(PAGE).not.toMatch(/<li[^>]*class="[^"]*(erased|omitted|withheld)/i);
  });

  it('⛔ adds ⛔ NO redundant ARIA role to elements that already have one', () => {
    // ⛔⛔ `role="list"` on a `<ul>` and `role="listitem"` on an `<li>` are the transliteration trap
    // this file's header names: they add nothing, and a typo in one silently REMOVES the semantics
    // the element already had.
    expect(PAGE).not.toMatch(/<ul[^>]*role=/);
    expect(PAGE).not.toMatch(/<li[^>]*role=/);
    expect(PAGE).not.toMatch(/<nav[^>]*role=/);
  });

  it('⛔⛔ the paging landmark is named for WHAT IT DOES — ⛔ never for the section it sits in', () => {
    // ⚠⛔ A first draft labelled this `contributorsHeader`. A screen reader then announces a
    // NAVIGATION landmark called "Confirmed contributions" — which names the SECTION rather than the
    // control, and collides with the `<h2>` two elements up. ⭐ `pagination.label` ("Pages" / "पृष्ठ")
    // is the sibling `/sahyog`'s own answer and is reused UNCHANGED.
    expect(PAGE).toMatch(/<nav[^>]*aria-label=\{labels\.paginationLabel\}/);
    expect(PAGE).not.toMatch(/<nav[^>]*aria-label=\{labels\.contributorsHeader\}/);
  });

  it('⭐ the page links are REAL anchors with `rel` — ⛔ never JS-dependent buttons', () => {
    // ⛔ This page is server-rendered and carries ZERO `<script>`. A `<button onclick>` would be a
    // link that fails for exactly the visitors most likely to be on a constrained device.
    expect(PAGE).toMatch(/<a class="underline" rel="prev" href=\{previousPageHref\}>/);
    expect(PAGE).toMatch(/<a class="underline" rel="next" href=\{nextPageHref\}>/);
    expect(PAGE).not.toMatch(/<button[^>]*PageHref/);
  });

  it('⛔ the whole page still carries ⛔ ZERO `<script>` — ⛔ the pagination added none', () => {
    // ⚠ The section is the first thing on this page with an interaction, and a client-side pager is
    // the obvious way to build one. ⭐ It is built as plain links precisely so it does ⛔ not.
    expect(PAGE).not.toMatch(/<script/i);
  });
});

describe('⭐⛔ HOVER IS ⛔ NOT AN AFFORDANCE (family 13 check (c))', () => {
  it('⛔ no contributor row or page link hides meaning behind `:hover` or `title=`', () => {
    // ⚠ Unreachable by keyboard AND by touch, and most members are on phones. ⭐ `title=` is the same
    // defect wearing an attribute: it is a tooltip, and a tooltip is a hover.
    expect(PAGE).not.toMatch(/<li[^>]*title=/);
    expect(PAGE).not.toMatch(/<a[^>]*title=/);
  });
});
