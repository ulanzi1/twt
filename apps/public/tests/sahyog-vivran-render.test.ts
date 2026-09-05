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

import {
  buildSahyogVivranOutageView,
  buildSahyogVivranView,
  type SahyogVivranLabels,
} from '../src/lib/sahyog-vivran-render.js';
import {
  SAHYOG_VIVRAN_FIELD_IDS,
  SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS,
  sahyogVivranSurfaceFieldIds,
} from '../src/lib/surface-fields.js';

const LABELS: SahyogVivranLabels = {
  pageTitle: 'Sahyog Vivran',
  pageIntro: 'intro',
  factsGroupLabel: 'Drive details',
  labelDriveCode: 'Drive code',
  labelPoolLetter: 'Pool',
  labelDistrict: 'District',
  labelClosedOn: 'Closed on',
  labelContributions: 'Contributions confirmed',
  labelStatus: 'Standing',
  districtUnknown: 'Not recorded',
  statusCollecting: 'Collecting',
  statusActive: 'Active',
  statusArchive: 'Archive',
  collectingTitle: 'This drive is still collecting',
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
};

const SETTLED: PublicSahyogVivranResponse = {
  drive: {
    poolLetterCode: 'C',
    poolCanonicalIdentifier: 'P-2026-09-003',
    driveStatus: 'archive',
    closedAt: '2026-09-01T18:45:00.000Z',
    district: 'Lucknow',
    confirmedContributionCount: 137,
    fundingOutcome: 'fully_funded',
    appealReversal: null,
    nomineeBankAccounts: [],
  },
};

describe('buildSahyogVivranView — the settled drive', () => {
  const { model } = buildSahyogVivranView(SETTLED, LABELS);

  it('renders the drive facts, and the count through the label function', () => {
    expect(model.poolLetterCode).toBe('C');
    expect(model.poolCanonicalIdentifier).toBe('P-2026-09-003');
    expect(model.driveStatus).toBe('Archive');
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

  it('⭐⛔ carries NO rupee figure, under any key (D1(b) moved the amount to 11b.3b)', () => {
    // ⛔ D1(c) — re-deriving `confirmedCount × fixedAmount` here — is REFUSED, so no key may carry a
    // currency symbol, an INR token, or the word "raised". ⚠ Asserted over the WHOLE model rather
    // than a named key, so a future key cannot smuggle one in under a different name.
    const serialized = JSON.stringify(model);
    expect(serialized).not.toMatch(/₹/);
    expect(serialized).not.toMatch(/\bINR\b/i);
    expect(serialized).not.toMatch(/amountRaised/i);
    expect(serialized).not.toMatch(/\braised\b/i);
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
    const keys = Object.keys(model);
    for (const forbidden of [/contributor/i, /verifier/i, /deceased/i]) {
      expect(keys.filter((k) => forbidden.test(k))).toEqual([]);
    }
    // ⛔ The ONLY nominee-shaped key on the shell is the container. A second one would be a field
    // nobody declared.
    expect(keys.filter((k) => /nominee/i.test(k))).toEqual(['nomineeAccounts']);
    // ⛔ And no NAME key on the shell at all — the account holder's name lives on the account row.
    expect(keys.filter((k) => /name/i.test(k))).toEqual([]);
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
      drive: {
        ...SETTLED.drive,
        driveStatus: 'collecting',
        closedAt: null,
        // ⚠ The domain read already nulls the outcome for a collecting drive; asserted here so the
        // render layer cannot re-introduce one from a stale wire value either.
        fundingOutcome: null,
        confirmedContributionCount: 4,
      },
    },
    LABELS,
  );

  it('⭐ flags the collecting state so the page can say what is TRUE, not estimate', () => {
    expect(model.isCollecting).toBe(true);
    expect(model.driveStatus).toBe('Collecting');
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

describe('buildSahyogVivranView — the ZERO-EXPECTATION drive (the 11b.1 review finding)', () => {
  it('⛔ renders NOTHING rather than "the cycle closed with the support it needed"', () => {
    // ⚠ The domain read resolves this BEFORE calling `classifyCycleOutcome`, because `0 >= 0` is
    // VACUOUSLY TRUE and returned `fully_funded` for a drive that collected nothing — published beside
    // "0 confirmed", edge-cached, on the one page whose premise is that its statements can be checked.
    // ⛔ `partial` was considered and REJECTED: "Reconciliation is still in progress" is not true of a
    // drive nobody was assigned to.
    const { model } = buildSahyogVivranView(
      {
        drive: {
          ...SETTLED.drive,
          driveStatus: 'active',
          confirmedContributionCount: 0,
          fundingOutcome: null,
        },
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

  it('⭐ returns EXACTLY the eleven classified field ids — ⛔ not "length > 0"', () => {
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
      'appeal_disposition_category',
      'appeal_reversal_at',
      'appeal_reversal_stage',
      'close_of_cycle_framing',
      'confirmed_contribution_count',
      'district',
      'drive_closed_at',
      'drive_status',
      'nominee_account_holder_name',
      'pool_canonical_identifier',
      'pool_letter_code',
    ]);
  });

  it('⛔ the shell maps ONLY the three booleans + the accounts CONTAINER to null', () => {
    // ⭐ `nomineeAccounts` joins the three booleans at 11b.3a, and for a DIFFERENT reason worth
    // keeping distinct: the booleans select between blocks of fixed i18n copy, while `nomineeAccounts`
    // is a CONTAINER whose per-row attributes carry the ids. ⛔ Classifying the array itself would be
    // meaningless; leaving its attributes outside the derivation would drop FOUR Tier-1 fields.
    const unrendered = Object.entries(SAHYOG_VIVRAN_FIELD_IDS)
      .filter(([, id]) => id === null)
      .map(([key]) => key)
      .sort();
    expect(unrendered).toEqual([
      'apiUnavailable',
      'isCollecting',
      'nomineeAccounts',
      'wasReversedByAppeal',
    ]);
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
    const leaky = { ...model, deceasedMemberName: 'Rajesh Kumar Sharma' };
    expect(() => sahyogVivranSurfaceFieldIds(leaky as unknown as typeof model)).toThrow(
      /deceasedMemberName/,
    );
  });
});
