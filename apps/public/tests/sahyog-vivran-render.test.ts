// The `/sahyog-vivran` pure render module — Story 11b.3 (Task 4; AC1, AC3, AC5, AC8).
//
// ⭐ Astro pages are tested THROUGH the pure render module, ⛔ not through the `.astro` file — the
// house carve-out, and the reason *"ALL display logic lives in the pure `.ts` render module"* is
// STRUCTURAL rather than stylistic: a value computed inline in frontmatter never enters the render
// model and is therefore invisible to the tier-leak leg.
//
// ⚠ The labels below are a FIXTURE, and that is correct HERE and only here: this file tests the
// MAPPING, ⛔ not the copy. The copy is asserted through the real `t()` in
// `sahyog-vivran-copy.test.ts` — the 11a.2 defect lived in the gap between those two files, so both
// must exist.

import { describe, expect, it } from 'vitest';

import type { PublicSahyogVivranResponse } from '@twt/contracts';
// ⭐ The REAL money formatter — the stub below calls it rather than transcribing its output.
import { formatCurrency } from '@twt/i18n';

import {
  buildSahyogVivranOutageView,
  buildSahyogVivranView,
  type SahyogVivranLabels,
} from '../src/lib/sahyog-vivran-render.js';
import {
  SAHYOG_VIVRAN_CONTRIBUTOR_FIELD_IDS,
  SAHYOG_VIVRAN_FIELD_IDS,
  SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS,
  sahyogVivranSurfaceFieldIds,
} from '../src/lib/surface-fields.js';

const LABELS: SahyogVivranLabels = {
  pageTitle: 'Sahyog Vivran',
  pageIntro: 'intro',
  factsGroupLabel: 'Drive details',
  labelDeceasedMember: 'Deceased Member',
  labelDriveCode: 'Drive code',
  labelPoolLetter: 'Pool',
  labelDistrict: 'District',
  labelClosedOn: 'Closed on',
  labelContributions: 'Contributions confirmed',
  labelStatus: 'Standing',
  districtUnknown: 'Not recorded',
  // ⚠ D3 (Story 11b.12) — the FIELD NAMES are historical and deliberately NOT renamed; the VALUES
  // are the ruled words **Live · Closed · Verified**, which is what the page actually shows.
  statusCollecting: 'Live',
  statusActive: 'Closed',
  statusArchive: 'Verified',
  collectingTitle: 'This drive is Live',
  collectingBody: 'The final outcome will appear here once reconciliation settles.',
  outcomeFullyFunded: 'The cycle closed with the support it needed.',
  outcomeUnderFunded: 'The cycle closed. The trust met its commitment to the family.',
  outcomePartial: 'The cycle closed. Reconciliation is still in progress.',
  appealTitle: 'Reversed by appeal',
  appealLineage: 'This claim was first denied, went to appeal, and the denial was reversed.',
  labelAppealStage: 'Appeal stage',
  appealStage: (stage) => `Reversed at appeal stage ${String(stage)}`,
  appealReversedOn: 'Reversed on',
  dispositionNewEvidence: 'New evidence was presented',
  dispositionProceduralCorrection: 'A procedural correction was made',
  dispositionReconsideration: 'The claim was reconsidered on its merits',
  contributionsCount: (count) => `${String(count)} confirmed`,
  // ⚠⛔⛔ THE REAL FORMATTER, ⛔ NOT A HAND-WRITTEN FORM — CORRECTED 2026-09-15 (Task 2 unit 1 review).
  // The transcribed stub `` `₹${a.toLocaleString('en-IN')} raised` `` was wrong TWICE and hid a
  // SHIPPED defect: it dropped the house space (`currency.ts` emits `₹ 1,37,000` and calls it *"ONE
  // house form"*), and by modelling ONE ₹ it concealed that the locale key carried a SECOND literal
  // one — the page rendered `₹₹ 1,37,000 raised` in both locales while this file stayed green.
  // ⇒ ⭐ the stub now CALLS what production calls, so it cannot drift from it again. ⛔ Do ⛔ not
  // re-inline a literal form here. ⚠ The composed COPY is asserted through the real `t()` in
  // `sahyog-vivran-copy.test.ts`; this models only the FORMATTER half the page supplies.
  // ⭐⭐ AND THE INTERACTION IS STILL WORTH NAMING: Indian digit grouping is what keeps a rupee figure
  // structurally unable to look like an account number (`/\d{6,}/`). ⛔ Do ⛔ not "fix" a future trip
  // there by weakening that control — it is the leak check, and the amount is what must conform.
  amountRaised: (a: number) => `${formatCurrency(a, 'en')} raised`,
  outageTitle: 'We could not load this drive just now',
  outageBody: 'This is a problem on our side.',
  // ⭐⛔ REDUCED BY STORY 11b.11 (`2026-09-04-190` cl.1-2, `2026-09-04-191` cl.1). ⛔ Seven labels
  // went with the fields they described, and `bankAccountLabel` is a STRING — the ordinal it
  // announced to screen readers contradicted the equality the page states in copy.
  bankTitle: 'Who receives this support',
  bankGroupLabel: 'Nominee recorded for this drive',
  bankEqualNominees: 'Both names are recorded equally. Neither is preferred.',
  bankAccountLabel: 'Recorded nominee',
  labelAccountHolder: 'Nominee Name',
  contributorsHeader: 'Confirmed contributions',
  contributorsEmpty: 'No contributor names to show right now.',
  // ⭐ `-219` cl.1+cl.3 — the placeholder for a withheld name. ⚠ A STUB: the REAL-`t()` leg
  // for this key, in BOTH locales, lives in `sahyog-vivran-copy.test.ts`
  // ([[feedback_stub_must_call_not_transcribe]] — a stub is a SECOND source for a shipped word).
  contributorUnnamed: 'A contributor',
  contributorTotal: (n: number) => `Contributors: ${String(n)}`,
  paginationLabel: 'Pages',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
};

const SETTLED: PublicSahyogVivranResponse = {
  drive: {
    poolLetterCode: 'C',
    poolCanonicalIdentifier: 'P-2026-09-003',
    driveStatus: 'verified',
    closedAt: '2026-09-01T18:45:00.000Z',
    // ⭐ Story 11b.3b (Task 2 unit 2) — a REAL name in the primary fixture, so the render path and
    // the Tier-1 leak leg are actually exercised. ⚠⛔ It is ⛔ NOT the day-one state: the publication
    // basis is fail-closed for every member, so a live drive carries `null` here. ⭐ That arm has its
    // own leg below — ⛔ a fixture that only ever carried `null` would leave the ruled render
    // unexercised, which is the vacuous-leg defect this surface names everywhere else.
    deceasedMemberName: 'Rajesh Kumar Sharma',
    district: 'Lucknow',
    confirmedContributionCount: 137,
    amountRaisedInr: 137000,
    fundingOutcome: 'fully_funded',
    appealReversal: null,
    nomineeBankAccounts: [],
  },
  // ⭐ Story 11b.3b (Task 3) — the contributor PAGE and the SET SIZE.
  // ⭐ Since `2026-09-16-219` cl.1 the API KEEPS every paged row, so `items.length` is
  // `min(limit, total − offset)` and a withheld name arrives as `{ name: null }` — ⛔ never a missing
  // row. ⚠ This fixture used to hold two named rows beside `total: 3` (*"rows are omitted AFTER
  // paging"*), a shape the API can ⛔ no longer emit; corrected 2026-09-18 (fourth review pass), as
  // `scrape-test.spec.ts` already was. ⭐ What is FEWER than `total` is the count of NAMED rows.
  items: [{ name: 'Rajesh Kumar Sharma' }, { name: 'Meera Bai Yadav' }, { name: null }],
  page: 1,
  limit: 50,
  total: 3,
};

// ⭐ Story 11b.22 (`-225`, AC4) — THE ARG-SWAP GUARD. The two label stubs return DIFFERENT shapes
// (`Contributors: n` vs `n confirmed`) and the fixture has THREE distinct figures — `total` (137),
// `confirmedContributionCount` (150) and `items.length` (12) — so feeding any one of them to the wrong
// label (including `items.length` for `total`) fails here. ⭐ The shape is one the API can emit: `limit: 12`
// makes `items.length` = `min(limit, total − offset)`, and events ≥ distinct contributors.
// ⚠⛔ This leg is ⛔ NOT the copy proof — the stubs are a second source; the REAL-`t()` legs live in
// `sahyog-vivran-copy.test.ts`.
describe('buildSahyogVivranView — the SET SIZE and the EVENT count are ⛔ never swapped', () => {
  const { model } = buildSahyogVivranView(
    {
      ...SETTLED,
      drive: { ...SETTLED.drive, confirmedContributionCount: 150 },
      items: Array.from({ length: 12 }, (_, i) => ({ name: `Contributor ${String(i + 1)}` })),
      page: 1,
      limit: 12,
      total: 137,
    },
    LABELS,
  );

  it('⭐ `contributorTotal` is the SET label fed `total`; the event count is the EVENT label fed the event count', () => {
    expect(model.contributorTotal).toBe('Contributors: 137');
    expect(model.confirmedContributionCount).toBe('150 confirmed');
  });
});

describe('buildSahyogVivranView — the settled drive', () => {
  const { model } = buildSahyogVivranView(SETTLED, LABELS);

  it('renders the drive facts, and the count through the label function', () => {
    expect(model.poolLetterCode).toBe('C');
    expect(model.poolCanonicalIdentifier).toBe('P-2026-09-003');
    expect(model.driveStatus).toBe('Verified');
    expect(model.district).toBe('Lucknow');
    expect(model.confirmedContributionCount).toBe('137 confirmed');
    expect(model.closeOfCycleFraming).toBe(LABELS.outcomeFullyFunded);
  });

  it('⭐ formats the close instant in IST — 00:15 IST on the NEXT day, ⛔ not the UTC day', () => {
    // 2026-09-01T18:45Z + 5h30m = 2026-09-02T00:15 IST. ⚠ A UTC-day render would say 01-09-2026, and
    // the visitor would see a date they could not reconcile with the drive's own record.
    expect(model.driveClosedAt).toBe('02-09-2026');
  });

  it('⛔ renders NO appeal lineage when the claim was never reversed', () => {
    expect(model.wasReversedByAppeal).toBe(false);
    expect(model.appealReversalStage).toBeNull();
    expect(model.appealDispositionCategory).toBeNull();
    expect(model.appealReversalAt).toBeNull();
  });

  // ⚠⛔⛔ **NARROWED 2026-09-15 (Story 11b.3b, AC3b / AC9) — ⛔ THE FENCE IS ⛔ NOT DELETED, AND ITS
  // PRIOR FORM IS KEPT HERE AS THE RECORD** ([[feedback_supersede_never_reinterpret]]). It read:
  //   *"carries NO rupee figure, under any key (D1(b) moved the amount to 11b.3b)"*, asserting the
  //   WHOLE serialized model matched ⛔ none of `/₹/`, `/\bINR\b/i`, `/amountRaised/i`, `/\braised\b/i`.
  // ⭐ **11b.3b IS that story**, and `2026-09-04-190` cl.6 rules `amountRaisedInr` the public figure
  // ⇒ the blanket form is ⛔ now unsatisfiable BY DESIGN. ⛔ Deleting it would discard D1(c)'s
  // refusal, which survives 11b.3b UNCHANGED.
  // ⭐⭐ **SO IT IS RE-POINTED AT WHAT IT WAS REALLY PROTECTING** — ⛔ not "no money", but **no TARGET
  // and no COMPARISON**. The amount is a FIGURE (`2026-09-15-218` cl.4); its ratio to a target is
  // the percentage cl.1 refuses.
  it('⭐ carries the RULED rupee figure — and ⛔ NO target, percentage or comparison beside it', () => {
    const serialized = JSON.stringify(model);
    // ⭐ The ruled figure IS present, and under its ruled key.
    // ⚠⛔ DERIVED FROM THE REAL FORMATTER, ⛔ not transcribed — a hand-written `'₹1,37,000 raised'`
    // is a SECOND source for the house money form, and the one committed here was already wrong
    // (it dropped `currency.ts`'s house space). ⛔ Do ⛔ not re-inline the literal.
    expect(model.amountRaisedInr).toBe(`${formatCurrency(137000, 'en')} raised`);
    // ⛔⛔ AND EXACTLY ONE ₹ — the shipped `₹₹` defect's signature, asserted on the MODEL as well as
    // on the copy, because this is the layer a future label change would re-break.
    expect(model.amountRaisedInr.match(/₹/g)).toHaveLength(1);
    // ⛔⛔ AND ⛔ NOTHING THAT WOULD LET A READER RECONSTRUCT लक्ष्य. `2026-09-07-204` cl.8 closed the
    // arithmetic-recovery channel BY CONSTRUCTION; these are the operands and framings that re-open
    // it by hand, and ⛔ none may appear under ANY key.
    expect(serialized).not.toMatch(/rosterSize/i);
    expect(serialized).not.toMatch(/fixedAmount/i);
    expect(serialized).not.toMatch(/expectedTotal/i);
    expect(serialized).not.toMatch(/deliveredTotal/i);
    expect(serialized).not.toMatch(/shortfall/i);
    expect(serialized).not.toMatch(/percent/i);
    expect(serialized).not.toMatch(/\btarget\b/i);
    // ⚠ And ⛔ no "X of Y" completion framing, which is a percentage written in words.
    expect(serialized).not.toMatch(/\bof\s+₹/i);
  });

  it('⭐⛔ carries NO UN-RULED person, under any key — ⚠ NARROWED at 11b.3a, ⛔ not deleted', () => {
    // ⚠⭐ THIS ASSERTION WAS *"carries NO person, under any key"* AND IT IS NARROWED, ⛔ NOT RELAXED.
    // Story 11b.3a adds the four ruled nominee-bank fields WITH their Panel ruling
    // (`2026-08-28-165` cl.1) and their four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries, in the same
    // commit as the declarations — which is exactly the price the original clause named. ⇒ what the
    // test still forbids is a person key with ⛔ NO ruling behind it.
    //
    // ⛔ THE DECEASED MEMBER AND THE CONTRIBUTOR STAY FORBIDDEN — they are **11b.3b**'s, gated on
    // `2026-09-02-173` / `-174`, and ⛔ this story adds neither.
    // ⚠⛔ AND `nominee` IS ⛔ NOT SIMPLY REMOVED FROM THE LIST: the shell model carries only the
    // CONTAINER key `nomineeAccounts`; the per-account attributes are asserted separately below.
    //
    // ⚠⛔⛔ **NARROWED AGAIN 2026-09-15 (Story 11b.3b, Task 2 unit 2 / AC9) — ⛔ THE TEXT ABOVE IS
    // KEPT AS THE RECORD AND ⛔ NOT REWRITTEN** ([[feedback_supersede_never_reinterpret]]). ⭐ **11b.3b
    // IS that story**, and it adds ⛔ not "neither" but **ONE**: `2026-09-02-173` (Trustee Panel)
    // ruled the **DECEASED MEMBER's FULL NAME** onto this surface, declared in the matrix with its
    // own `tier1_public_exception` in the same commit as the field. ⇒ `/deceased/i` leaves the
    // forbidden list, and the key is asserted PRESENT below rather than merely un-forbidden — ⛔ a
    // leg that only stopped forbidding it would go vacuous.
    // ⛔⛔ **THE CONTRIBUTOR AND THE VERIFIER STAY FORBIDDEN, AND THEY ARE THE HALF THAT MATTERED:**
    // the contributor's render is this story's **Task 3** (which owns the pagination, ordering and
    // bounded decrypt that list requires), and ⛔ NOBODY has ruled a verifier identity at any tier.
    // ⚠⛔⛔ **NARROWED A THIRD TIME 2026-09-15 (Story 11b.3b, Task 3 / AC9) — ⛔ THE HISTORY ABOVE IS
    // KEPT** ([[feedback_supersede_never_reinterpret]]). Task 2 unit 2 removed `/deceased/i` from the
    // forbidden list when `2026-09-02-173` ruled that name. ⭐ **Task 3 removes `/contributor/i` for
    // the same reason**: `2026-09-02-174` (Trustee Panel) ruled the contributor's FULL NAME onto this
    // surface, unconditional per `-175`, with its own `tier1_public_exception` declared in the matrix.
    // ⛔⛔ **THE VERIFIER STAYS FORBIDDEN, AND IT IS NOW THE WHOLE OF THE FENCE:** ⛔ nobody has ruled a
    // verifier identity at ANY tier. ⇒ ⭐ both ruled subjects are asserted PRESENT below rather than
    // merely un-forbidden — ⛔ a leg that only stopped forbidding them would go vacuous.
    const keys = Object.keys(model);
    for (const forbidden of [/verifier/i]) {
      expect(keys.filter((k) => forbidden.test(k))).toEqual([]);
    }
    // ⭐ THE RULED PERSON KEYS ON THE SHELL — present, and EXACTLY these.
    expect(keys.filter((k) => /deceased/i.test(k))).toEqual(['deceasedMemberName']);
    // ⚠ `contributorTotal` is a COUNT of a set, ⛔ not a person — it rides this filter because it
    // shares the word, and asserting the EXACT pair is what keeps a third, undeclared key out.
    expect(keys.filter((k) => /contributor/i.test(k))).toEqual([
      'contributors',
      'contributorTotal',
    ]);
    // ⛔ The ONLY nominee-shaped key on the shell is the container. A second one would be a field
    // nobody declared.
    expect(keys.filter((k) => /nominee/i.test(k))).toEqual(['nomineeAccounts']);
    // ⚠⛔ **AMENDED, ⛔ NOT DELETED** — this read `toEqual([])` on the ground that the account
    // holder's name lives on the account row. ⭐ The ruled deceased name is now a shell key, so the
    // leg asserts the EXACT set rather than emptiness: ⛔ a second, undeclared name key still fails.
    expect(keys.filter((k) => /name/i.test(k))).toEqual(['deceasedMemberName']);
    // ⛔⛔ AND ⛔ NO PER-CONTRIBUTOR AMOUNT, RANK OR ROW KEY ON THE ROWS — 11b.1 **AC5** forbids
    // leaderboards, rankings, gamification and social-performance metrics, and `D10-rowkey`(a)
    // (`2026-09-02-177` cl.3) rules there is ⛔ NO row key. ⭐ Asserted over the ROW's own keys, so a
    // future `amount`/`rank`/`index` fails HERE rather than shipping as a "small addition".
    for (const row of model.contributors) {
      expect(Object.keys(row)).toEqual(['contributorName']);
    }
  });

  it('⭐⭐ `-219` cl.1 — a WITHHELD name survives the render layer as `null`, IN POSITION', () => {
    // ⚠⛔⛔ **THERE WAS ⛔ NO RENDER-LAYER TEST FOR THIS AT ALL** until 2026-09-17 (adversarial review).
    // The whole placeholder path was covered only by REGEXES OVER THE `.astro` SOURCE, which assert a
    // string exists in a file and execute ⛔ nothing. ⇒ had `contributors.map` dropped or coerced a
    // null, every test still passed and the FIRST real erasure on a live drive would have been the
    // discovery — found by a family, on a memorial page.
    const { model: m } = buildSahyogVivranView(
      {
        ...SETTLED,
        items: [{ name: 'Anita Verma' }, { name: null }, { name: 'Chandra Iyer' }],
        page: 1,
        limit: 50,
        total: 3,
      },
      LABELS,
    );

    // ⭐ THE ROW IS KEPT, ⛔ not dropped, and its POSITION is the producer's — the unnamed row sits
    // where that person sat, between the two named ones.
    expect(m.contributors).toEqual([
      { contributorName: 'Anita Verma' },
      { contributorName: null },
      { contributorName: 'Chandra Iyer' },
    ]);
    // ⭐ `items.length === total` — cl.1's mechanical property: a page is ⛔ never short.
    expect(m.contributors).toHaveLength(3);
    // ⛔⛔ cl.3 — the row carries ⛔ NO cause. ⚠ `null` is the ONLY signal, and it is the same `null`
    // an erasure, an unresolvable name and a failed decrypt all produce.
    expect(Object.keys(m.contributors[1]!)).toEqual(['contributorName']);
    // ⛔ AND THE PLACEHOLDER COPY IS ⛔ NOT IN THE MODEL — it is a LABEL resolved at the page. Putting
    // it here would classify the page's own words as the member's Tier-1 `contributor_name` datum.
    expect(JSON.stringify(m)).not.toContain(LABELS.contributorUnnamed);
  });

  it('⭐⛔ carries NO prohibited financial key — the AC4 shape, at the render layer too', () => {
    const keys = Object.keys(model).map((k) => k.toLowerCase());
    for (const forbidden of ['yellow', 'attested', 'utr', 'estimated', 'projected']) {
      expect(keys.some((k) => k.includes(forbidden))).toBe(false);
    }
    // ⚠ `driveStatus` is permitted and `status` alone is not — the drive's LIFECYCLE standing is not
    // a contribution status pill, and the naming keeps the two unconfusable.
    expect(keys).not.toContain('status');
    expect(keys).toContain('drivestatus');
  });
});

describe('buildSahyogVivranView — the LIVE (still collecting) drive (D4(b), AC3)', () => {
  const { model } = buildSahyogVivranView(
    {
      ...SETTLED,
      drive: {
        ...SETTLED.drive,
        driveStatus: 'live',
        closedAt: null,
        // ⚠ The domain read already nulls the outcome for a collecting drive; asserted here so the
        // render layer cannot re-introduce one from a stale wire value either.
        fundingOutcome: null,
        confirmedContributionCount: 4,
        amountRaisedInr: 4000,
      },
    },
    LABELS,
  );

  it('⭐ flags the collecting state so the page can say what is TRUE, not estimate', () => {
    expect(model.isCollecting).toBe(true);
    expect(model.driveStatus).toBe('Live');
  });

  it('⛔ renders NOTHING for the close date and NOTHING for the outcome', () => {
    // ⚠ `null`, ⛔ not a placeholder, ⛔ not "pending", ⛔ not an em-dash — an omission that announces
    // itself is an enumeration signal, and here it would also assert a close that has not happened.
    expect(model.driveClosedAt).toBeNull();
    expect(model.closeOfCycleFraming).toBeNull();
  });

  it('⭐ STILL renders the confirmed count — the one figure that is true mid-drive', () => {
    expect(model.confirmedContributionCount).toBe('4 confirmed');
  });
});

describe('buildSahyogVivranView — ⭐⭐ THE UNNAMED DRIVE: the DAY-ONE state of every drive', () => {
  // ⚠⛔⛔ **THIS IS ⛔ NOT AN EDGE CASE — IT IS WHAT EVERY DRIVE RENDERS ON THE DAY 11b.3b SHIPS.**
  // `NAME_PUBLICATION_AUTHORISED` requires a pinned `clause_versions` row for
  // `niy.public-disclosure.member-information`; counsel's written clause is still owed (OVERDUE
  // since 2026-09-07) and there is ⛔ no migration, ⛔ no seed and ⛔ no writer for it anywhere in the
  // repo ⇒ the gate is FALSE for every member. ⭐ Fail-closed and therefore CORRECT (`-209` cl.2).
  // ⇒ ⭐ the fixture above, which CARRIES a name, is the POST-CLAUSE state; this one is TODAY.
  // ⛔⛔ ⛔ Do ⛔ not "fix" a blank name by seeding a placeholder clause row — `public-read.ts`
  // forbids it in terms: *"a stand-in makes names render on an authority that does ⛔ not exist."*
  const { model } = buildSahyogVivranView(
    { ...SETTLED, drive: { ...SETTLED.drive, deceasedMemberName: null } },
    LABELS,
  );

  it('⛔ renders NOTHING for the name — ⛔ no placeholder and ⛔ no withheld marker', () => {
    // ⚠ `null`, ⛔ not "Not recorded", ⛔ not "name withheld", ⛔ not an em dash. A per-drive marker
    // announces WHICH members have a publication basis, which is the enumeration signal an absent
    // basis must ⛔ not emit. ⚠ ⛔ NOT the `district` posture, which DOES have fallback copy: an
    // unrecorded posting is an ordinary data gap, an unnamed member is a governance state.
    expect(model.deceasedMemberName).toBeNull();
  });

  it('⭐⭐ OMITS THE NAME, ⛔ NEVER THE PAGE — every other fact still renders', () => {
    // ⭐ The deceased member's arm of AC3's PER-SUBJECT omission ruling, and the sibling index's
    // shipped rule. ⭐ The CONTRIBUTOR arm (Task 3) now keeps its ROW too and renders the
    // placeholder (`2026-09-16-219` cl.1); ⚠ it used to omit the row — SUPERSEDED.
    expect(model.apiUnavailable).toBe(false);
    expect(model.poolCanonicalIdentifier).toBe('P-2026-09-003');
    expect(model.district).toBe('Lucknow');
    expect(model.confirmedContributionCount).toBe('137 confirmed');
    expect(model.amountRaisedInr).toBe(`${formatCurrency(137000, 'en')} raised`);
    expect(model.closeOfCycleFraming).not.toBeNull();
  });

  it('⭐ the field id STAYS CLASSIFIED even while the value is null — ⛔ not a vanishing field', () => {
    // ⛔ The id set describes what this surface DECLARES, ⛔ not what one drive happens to carry. A
    // field that dropped out of the classified set when unnamed would make the leak leg go vacuous
    // on exactly the drives nobody would check ([[feedback_gate_scope_semantic_coverage]]).
    expect(sahyogVivranSurfaceFieldIds(model)).toContain('deceased_member_name');
  });
});

describe('buildSahyogVivranView — the ZERO-EXPECTATION drive (the 11b.1 review finding)', () => {
  it('⛔ renders NOTHING rather than "the cycle closed with the support it needed"', () => {
    // ⚠ The domain read resolves this BEFORE calling `classifyCycleOutcome`, because `0 >= 0` is
    // VACUOUSLY TRUE and returned `fully_funded` for a drive that collected nothing — published beside
    // "0 confirmed", edge-cached, on the one page whose premise is that its statements can be checked.
    // ⛔ `partial` was considered and REJECTED: "Reconciliation is still in progress" is not true of a
    // drive nobody was assigned to.
    const { model } = buildSahyogVivranView(
      {
        ...SETTLED,
        drive: {
          ...SETTLED.drive,
          driveStatus: 'closed',
          confirmedContributionCount: 0,
          amountRaisedInr: 0,
          fundingOutcome: null,
        },
        // ⭐ A ZERO-EXPECTATION drive has ⛔ no confirmed contributors either — the fixture must not
        // keep the settled drive's rows, which would assert a state the substrate cannot produce.
        items: [],
        total: 0,
      },
      LABELS,
    );
    expect(model.closeOfCycleFraming).toBeNull();
    expect(model.confirmedContributionCount).toBe('0 confirmed');
  });
});

describe('buildSahyogVivranView — the appeal-reversal lineage (AC5, D12(a))', () => {
  const { model } = buildSahyogVivranView(
    {
      ...SETTLED,
      drive: {
        ...SETTLED.drive,
        appealReversal: {
          reversedAtStage: 2,
          dispositionCategory: 'procedural_correction',
          reversedAt: '2026-08-20T05:00:00.000Z',
        },
      },
    },
    LABELS,
  );

  it('⭐ renders the stage, the localised disposition and the reversal date', () => {
    expect(model.wasReversedByAppeal).toBe(true);
    expect(model.appealReversalStage).toBe('Reversed at appeal stage 2');
    expect(model.appealDispositionCategory).toBe('A procedural correction was made');
    expect(model.appealReversalAt).toBe('20-08-2026');
  });

  it('⛔⛔ TRANSLATES the disposition tag — it NEVER echoes the wire token', () => {
    // ⚠ Echoing it would put an internal vocabulary word on a public page, and — worse — would be the
    // mechanism by which an unbounded string could ever reach one.
    expect(model.appealDispositionCategory).not.toContain('procedural_correction');
  });

  it('⛔⛔ carries NO rationale text and NO reviewer identity, under any key', () => {
    // Those live on the `claim.appeal_stageN_reviewed` DECISION event's Tier-1 metadata row and are
    // NEVER public. `claim.reversed` is the PUBLISH SIGNAL, ⛔ not the decision.
    const keys = Object.keys(model).map((k) => k.toLowerCase());
    for (const forbidden of ['rationale', 'reason', 'reviewer', 'actor', 'decision', 'note']) {
      expect(keys.some((k) => k.includes(forbidden))).toBe(false);
    }
  });
});

describe('buildSahyogVivranOutageView — ⛔ an outage is NOT a 404', () => {
  const { model } = buildSahyogVivranOutageView();

  it('flags the outage', () => {
    expect(model.apiUnavailable).toBe(true);
  });

  it('⛔ ECHOES NO ADDRESS — Story 11b.10. The URL segment is an OPAQUE TOKEN, ⛔ not a drive code', () => {
    // ⚠ This used to assert the identifier was echoed back. ⭐ The URL no longer CARRIES one, so an
    // echo would print a live public ADDRESS into the `pool_canonical_identifier` classified field
    // — a fabricated drive fact on a page whose whole contract is that it invents nothing.
    expect(model.poolCanonicalIdentifier).toBe('');
  });

  it('⛔ INVENTS no drive fact — every other value is empty or null', () => {
    expect(model.poolLetterCode).toBe('');
    expect(model.driveStatus).toBe('');
    expect(model.confirmedContributionCount).toBe('');
    expect(model.driveClosedAt).toBeNull();
    expect(model.district).toBeNull();
    expect(model.closeOfCycleFraming).toBeNull();
    expect(model.appealReversalStage).toBeNull();
    expect(model.isCollecting).toBe(false);
    expect(model.wasReversedByAppeal).toBe(false);
  });

  it('⭐ declares the SAME field set as a rendered page — ⛔ the leg never goes partly vacuous', () => {
    // ⛔ A degraded page that quietly declares fewer classified fields is a tier-leak leg that goes
    // vacuous exactly when something is already wrong.
    expect(sahyogVivranSurfaceFieldIds(model)).toEqual(
      sahyogVivranSurfaceFieldIds(buildSahyogVivranView(SETTLED, LABELS).model),
    );
  });
});

describe('the field-id derivation is OPERATIVE from this surface’s first commit (AC2)', () => {
  const { model } = buildSahyogVivranView(SETTLED, LABELS);

  it('⭐ returns EXACTLY the fourteen classified field ids — ⛔ not "length > 0"', () => {
    // ⛔ Asserting the EXACT set — rather than non-emptiness — is what makes a DROPPED field fail here
    // too. A leg that only detects additions accepts a field vanishing from the render while the
    // matrix still claims it is shown.
    // ⭐ TEN → SIXTEEN at Story 11b.3a: the four ruled Tier-1 nominee-bank fields plus their two
    // Tier-3 siblings.
    // ⭐⛔ **SIXTEEN → ELEVEN AT STORY 11b.11** — `2026-09-04-190` cl.1 withdraws the account number,
    // IFSC, bank name and branch from `public`; `2026-09-04-191` cl.1 withdraws the VPA; `-190` cl.2
    // KEEPS the account-holder name.
    // ⚠⛔ AND NOTE THE FIXTURE: `SETTLED` carries `nomineeBankAccounts: []`, so the surviving id
    // appears here on a drive with NO bank details at all — because the per-row ids come from a
    // REPRESENTATIVE SHAPE, ⛔ never from `nomineeAccounts[0]`. A derivation keyed on the first row
    // would go vacuous on exactly the pages nobody would check. ⛔ The withdrawal does ⛔ not weaken
    // that property; it is the reason the ⛔ ONE surviving Tier-1 declaration is still asserted here.
    expect(sahyogVivranSurfaceFieldIds(model)).toEqual([
      'amount_raised_inr',
      'appeal_disposition_category',
      'appeal_reversal_at',
      'appeal_reversal_stage',
      'close_of_cycle_framing',
      'confirmed_contribution_count',
      // ⭐ Story 11b.3b (Task 3) — `2026-09-02-174`, a confirmed contributor's FULL NAME.
      // ⚠ Derived from the ROW SHAPE, ⛔ not from this fixture's rows: a drive whose contributors
      // were ALL omitted must still DECLARE the field, or the leak leg goes vacuous on exactly the
      // drives nobody would check.
      'contributor_name',
      // ⭐ Story 11b.3b (Task 2 unit 2) — `2026-09-02-173`, the deceased member's FULL NAME.
      // ⚠ Its VALUE is `null` on every drive today (the publication basis is fail-closed), but the
      // field id is CLASSIFIED regardless: the id set describes what this surface DECLARES, ⛔ not
      // what one fixture happens to carry — the same reason the Tier-1 nominee id stays listed.
      'deceased_member_name',
      'district',
      'drive_closed_at',
      'drive_status',
      'nominee_account_holder_name',
      'pool_canonical_identifier',
      'pool_letter_code',
    ]);
  });

  it('⛔ the shell maps ONLY the booleans + the two CONTAINERS + the total to null', () => {
    // ⭐ `nomineeAccounts` joins the three booleans at 11b.3a, and for a DIFFERENT reason worth
    // keeping distinct: the booleans select between blocks of fixed i18n copy, while `nomineeAccounts`
    // is a CONTAINER whose per-row attributes carry the ids. ⛔ Classifying the array itself would be
    // meaningless; leaving its attributes outside the derivation would drop FOUR Tier-1 fields.
    // ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, Task 3) — ⛔ THE PRIOR SET IS KEPT IN THIS COMMENT:**
    // `['apiUnavailable', 'isCollecting', 'nomineeAccounts', 'wasReversedByAppeal']`.
    // ⭐ **`contributors` joins for the CONTAINER reason** — its rows carry the `contributor_name` id
    // via {@link SAHYOG_VIVRAN_CONTRIBUTOR_FIELD_IDS}, exactly as the accounts do.
    // ⭐ **`contributorTotal` joins for a THIRD reason, and it is ⛔ not the container one:** it is a
    // COUNT OF A SET, ⛔ never a fact about a person, so there is nothing to classify. ⚠⛔ Declaring
    // it would invite a reader — and a leak rule — to treat a collection's size as a rendered
    // attribute of someone. ⛔ Do ⛔ not "tidy" the two into one comment: three reasons, ⛔ not one.
    const unrendered = Object.entries(SAHYOG_VIVRAN_FIELD_IDS)
      .filter(([, id]) => id === null)
      .map(([key]) => key)
      .sort();
    expect(unrendered).toEqual([
      'apiUnavailable',
      'contributorTotal',
      'contributors',
      'isCollecting',
      'nomineeAccounts',
      'wasReversedByAppeal',
    ]);
  });

  it('⛔ the per-CONTRIBUTOR mapping maps NOTHING to null — ⭐ the row IS the name', () => {
    // ⛔⛔ THE ROW HAS EXACTLY ONE KEY AND IT IS CLASSIFIED. ⚠ ⛔ NOT the accounts' shape, which maps
    // `accountRank` to null because that substrate HAS a row identity. ⭐ There is ⛔ no such key here
    // and there must ⛔ not be one: `D10-rowkey`(a) (`2026-09-02-177` cl.3) rules there is ⛔ NO row
    // key — ⛔ not an index, ⛔ not a `member_id`, ⛔ not a token. ⇒ a `null` entry appearing in this
    // map would mean someone added a row attribute that renders nothing, which on THIS row can only
    // be an identifier or a rank.
    expect(Object.values(SAHYOG_VIVRAN_CONTRIBUTOR_FIELD_IDS)).toEqual(['contributor_name']);
  });

  it('⛔ the per-ACCOUNT mapping maps ONLY the rank to null', () => {
    // ⚠ `accountRank` is row IDENTITY, ⛔ not a rendered value: rendering "Account 1" / "Account 2"
    // as a classified field would put an ordering that implies preference onto a page whose whole
    // point is that the two accounts are EQUAL (Story 9.9).
    // ⭐⛔ `isMasked` STOOD BESIDE IT UNTIL STORY 11b.11 — it selected between a masked and a full
    // copy block. With the coordinates withdrawn (`2026-09-04-190` cl.1) both blocks reduce to the
    // same single name, so there is ⛔ nothing left to select between and the key is gone.
    // ⛔⛔ MASKING WAS ⛔ NOT DELETED (`-190` cl.4) — the machinery and its own tests are untouched;
    // it has ⛔ NO PUBLIC CONSUMER.
    // ⛔ THE ⛔ ONE remaining key is a classified field: `nominee_account_holder_name`.
    const unrendered = Object.entries(SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS)
      .filter(([, id]) => id === null)
      .map(([key]) => key)
      .sort();
    expect(unrendered).toEqual(['accountRank']);
  });

  it('⭐ NEGATIVE CONTROL — an unclassified key added to the model THROWS (the fail-closed coupling)', () => {
    // ⚠ This is the control that makes the assertion above mean something: without it, a green run
    // over a set nobody could have broken proves nothing.
    //
    // ⚠⛔⛔ **RE-PLANTED 2026-09-15 (Story 11b.3b, Task 2 unit 2 / AC9) — ⛔ THE LEG IS ⛔ NOT DELETED
    // AND ⛔ NOT WEAKENED.** It planted **`deceasedMemberName`** as its undeclared key; ⭐ this story
    // **DECLARES** that field (`2026-09-02-173`), so the control lost its subject and would have
    // passed for the wrong reason — ⛔ or, worse, been "fixed" by deleting the leg.
    // ⭐ **`verifierName` IS THE REPLACEMENT, AND THE CHOICE IS DELIBERATE:** it is one of the
    // person keys the wire shape forbids by name, and ⛔ NOBODY has ruled a verifier identity at
    // ANY tier — so ⛔ no future story can declare it out from under this control without a Panel
    // ruling first. ⛔ Do ⛔ not re-plant a key some story already has a route to declaring.
    const leaky = { ...model, verifierName: 'V Verifier' };
    expect(() => sahyogVivranSurfaceFieldIds(leaky as unknown as typeof model)).toThrow(
      /verifierName/,
    );
  });
});
