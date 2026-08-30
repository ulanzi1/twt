// The `<ContributionList>` ROW presenter teeth — Story 11b.2 (Task 2; AC2/AC3/AC4). Pure unit tests: the
// presenter is `(row) → view-model` with nothing to mock.
//
// ⛔ THERE IS DELIBERATELY NO ANONYMIZED-VARIANT TEST. 11b.2a's D6(a) deleted that variant — with an RTBF'd
// contributor's row omitted entirely (11b.2a's D5) no producer can emit one, so a test for it could only pass
// by hand-forging a row the API can never construct. That is a test OF THE FIXTURE, not of the system.
// In its place: the ANTI-WIDENING assertion that the row type has exactly ONE renderable kind.
//
// ⛔ AND THERE IS NO PASSING TEST FOR THE `unknown` BRANCH'S REACHABILITY. No producer can emit `unknown`
// today (the API boundary skips a row whose name it cannot resolve), so the branch is recorded UN-ATTESTED /
// UNEXERCISED in Completion Notes and routed as deferred work — never written up as tested. What IS asserted
// below is the branch's BEHAVIOUR when handed one: it THROWS (D8(a)). A throwing exhaustiveness guard that
// never fires is working.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONTRIBUTION_LIST_I18N_REFS } from '../../src/contribution-list/i18n-keys.js';
import { deriveContributionRowViewModel } from '../../src/contribution-list/presenter.js';
import type {
  ContributionRowDisplayName,
  ContributionRowInput,
  ContributionRowViewModel,
} from '../../src/contribution-list/view-model.js';

// tests/contribution-list → repo root is FOUR levels up (contribution-list → tests → ui → packages → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const row = (over: Partial<ContributionRowInput> = {}): ContributionRowInput => ({
  displayName: { kind: 'name', firstName: 'Sushil', lastInitial: 'K' },
  poolLetterCode: 'F',
  ...over,
});

describe('deriveContributionRowViewModel — the row content contract', () => {
  it('emits the pool letter code and the row a11y REF unchanged', () => {
    const vm = deriveContributionRowViewModel(row());
    expect(vm.poolLetterCode).toBe('F');
    expect(vm.rowA11y.ref).toEqual(CONTRIBUTION_LIST_I18N_REFS.rowA11y);
    expect(vm.rowA11y.ref.namespace).toBe('contribution');
  });

  it('is PURE — same input, same output', () => {
    expect(deriveContributionRowViewModel(row())).toEqual(deriveContributionRowViewModel(row()));
  });
});

describe('NAME PARTS ONLY — the presenter NEVER joins firstName + lastInitial (D9(a))', () => {
  it('emits the two parts unchanged under a single `nameParts` arm (D11-outputshape(a))', () => {
    const vm = deriveContributionRowViewModel(
      row({ displayName: { kind: 'name', firstName: 'Sushil', lastInitial: 'K' } }),
    );
    expect(vm.displayName).toEqual({ kind: 'nameParts', firstName: 'Sushil', lastInitial: 'K' });
  });

  it('⭐ emits NO composed name string anywhere in the view-model — joining would RULE the name FORM', () => {
    // The name FORM is UNRULED (D7-nameform(a)) and routed to the Trustee Panel. A join here would decide it
    // in presenter.ts and make the routed deferral false on the day it was written. This asserts the negative
    // over the WHOLE serialized view-model, not just the displayName field, so a join cannot hide elsewhere.
    const vm = deriveContributionRowViewModel(
      row({ displayName: { kind: 'name', firstName: 'Sushil', lastInitial: 'K' } }),
    );
    const serialized = JSON.stringify(vm);
    for (const joined of ['Sushil K', 'Sushil K.', 'SushilK', 'K Sushil', 'K. Sushil']) {
      expect(
        serialized,
        `the presenter composed "${joined}" — the contributor name FORM is UNRULED and the join belongs to the render layer`,
      ).not.toContain(joined);
    }
    // Belt and braces: the parts ARE both present, so the negative above is not vacuously true.
    expect(serialized).toContain('Sushil');
    expect(serialized).toContain('"lastInitial":"K"');
  });
});

describe('EXHAUSTIVENESS over the display-name kind — TWO kinds, not three and not one (AC3)', () => {
  // The local mirror carries `name | unknown`. `@twt/domain`'s own union has a THIRD kind; it is deliberately
  // absent because 11b.2a's D5 omits an RTBF'd contributor's row entirely, so no producer can hand this
  // presenter one (11b.2a's D6(a)). This literal is the compile-time half of that claim: adding a kind
  // upstream leaves it MISSING a key; removing one leaves it EXCESS.
  const KINDS: Record<ContributionRowDisplayName['kind'], true> = { name: true, unknown: true };

  it('the input variant has EXACTLY two kinds — a third cannot be added without a ruling', () => {
    expect(Object.keys(KINDS).sort()).toEqual(['name', 'unknown']);
  });

  it('⛔ `unknown` THROWS — it never renders a blank, and it never borrows erasure copy (D8(a))', () => {
    expect(() => deriveContributionRowViewModel(row({ displayName: { kind: 'unknown' } }))).toThrow(
      /unresolvable contributor name/,
    );
  });

  it('⛔ the anonymized kind is NOT accepted — an unhandled kind throws rather than blanking the name', () => {
    // Hand-forged on purpose: this asserts the `never` guard fires, NOT that the system can produce this row.
    // It cannot — that is exactly why the anonymized RENDER arm was deleted rather than tested.
    const forged = { kind: 'anonymized', i18nKey: 'member.anonymousMember' } as unknown as ContributionRowDisplayName;
    expect(() => deriveContributionRowViewModel(row({ displayName: forged }))).toThrow(
      /unhandled display-name kind/,
    );
  });

  it('the OUTPUT union is a SINGLE `nameParts` arm (D11-outputshape(a))', () => {
    const ARMS: Record<ContributionRowViewModel['displayName']['kind'], true> = { nameParts: true };
    expect(Object.keys(ARMS)).toEqual(['nameParts']);
  });
});

describe('ANTI-WIDENING — confirmed-only is preserved as a SHAPE (AC4, D2(a))', () => {
  const BANNED = ['status', 'yellow', 'attested', 'utr', 'pending', 'projected'] as const;

  // (a) THE COMPILE HALF — this literal is asserted BY FAILING `pnpm turbo run typecheck`, not at runtime.
  // Adding a key to the input type breaks it as MISSING; removing one breaks it as EXCESS. ⚠ It is the
  // COUPLED edit for `rowKey`'s removal: leaving `rowKey: true` here while the interface drops it makes this
  // an excess property and typecheck fails — and the likeliest wrong repair (putting `rowKey` back on the
  // interface) would silently restore a ruling 11b.2a's D5 VACATED.
  const INPUT_KEYS: Record<keyof ContributionRowInput, true> = {
    displayName: true,
    poolLetterCode: true,
  };
  const VIEW_MODEL_KEYS: Record<keyof ContributionRowViewModel, true> = {
    displayName: true,
    poolLetterCode: true,
    rowA11y: true,
  };

  // (c) THE NESTING + RENAME HALF — without it (a) and (b) are defeated by ONE WORD. `keyof` is TOP-LEVEL
  // ONLY, so `displayName: { …; status: 'confirmed' }` widens the row with a status and passes both; so does
  // any rename (`statusKind`, `pendingCount`, `isAttested`, `utrRef`). ⇒ the ban is TRANSITIVE and
  // SUBSTRING-matched, and the key set is a TYPED LITERAL the compiler forces complete — never a hand-written
  // array, which would be decoupled from the types and vacuous by construction.
  type AllKeys<T> = T extends object ? { [K in keyof T]: K | AllKeys<T[K]> }[keyof T] : never;
  const NESTED_INPUT_KEYS: Record<AllKeys<ContributionRowInput>, true> = {
    displayName: true,
    kind: true,
    firstName: true,
    lastInitial: true,
    poolLetterCode: true,
  };
  const NESTED_VIEW_MODEL_KEYS: Record<AllKeys<ContributionRowViewModel>, true> = {
    displayName: true,
    kind: true,
    firstName: true,
    lastInitial: true,
    poolLetterCode: true,
    rowA11y: true,
    ref: true,
    key: true,
    namespace: true,
  };

  it('(a) the INPUT surface is EXACTLY the two keys AC3 declares — and ⛔ NO `rowKey`', () => {
    expect(Object.keys(INPUT_KEYS).sort()).toEqual(['displayName', 'poolLetterCode']);
    expect(INPUT_KEYS).not.toHaveProperty('rowKey');
    expect(VIEW_MODEL_KEYS).not.toHaveProperty('rowKey');
  });

  it('(b) no banned identity field is present at the top level of either type', () => {
    for (const banned of BANNED) {
      expect(INPUT_KEYS).not.toHaveProperty(banned);
      expect(VIEW_MODEL_KEYS).not.toHaveProperty(banned);
    }
  });

  it('(c) ⭐ no banned token appears at ANY nesting depth, under any rename, in either type', () => {
    // ⚠ SCOPE: the ROW TYPES only. This scan must NOT run over `i18n-keys.ts` or raw module text —
    // `contributor_list.pending_strip` and `…_a11y` contain the banned token `pending` BY DESIGN. They are the
    // AGGREGATE signal (pool-contributor-list.ts:59-65), not a per-row identity field. The ban is on a row's
    // KEY SET, never on a copy key.
    const keys = [...Object.keys(NESTED_INPUT_KEYS), ...Object.keys(NESTED_VIEW_MODEL_KEYS)];
    expect(keys.length).toBeGreaterThan(Object.keys(INPUT_KEYS).length);
    for (const k of keys) {
      for (const banned of BANNED) {
        expect(
          k.toLowerCase(),
          `'${k}' carries the banned token '${banned}' — confirmed-only is a SHAPE (D2(a))`,
        ).not.toContain(banned);
      }
    }
  });
});

describe('AC2 — every declared i18n REF resolves in the namespace it CLAIMS, in BOTH locales', () => {
  // ⚠ This reads the locale JSON FROM DISK and therefore asserts AROUND `t()`. That is a known limitation,
  // not an oversight: `@twt/i18n` is deliberately not a dependency OR devDependency of `@twt/ui`, and a test
  // must not be the reason a package boundary moves (the `member-status/presenter.test.ts:277-283` precedent
  // states the same reason). It is the shape of the 11a.2 defect, so it is RECORDED as deferred work with
  // 11b.2b — which CAN call `t()` — as the named trigger.
  // ⛔ NO file-existence guard: a guarded wrong path is a SILENT SKIP, which is the failure this test exists
  // to avoid. Let `readFileSync` throw.
  const refs = Object.values(CONTRIBUTION_LIST_I18N_REFS);

  it('declares all TEN `contributor_list.*` refs — and ⛔ NOT `member.anonymousMember`', () => {
    expect(refs).toHaveLength(10);
    for (const ref of refs) expect(ref.key.startsWith('contributor_list.')).toBe(true);
    expect(refs.map((r) => r.key)).not.toContain('member.anonymousMember');
  });

  for (const locale of ['en', 'hi'] as const) {
    it(`every ref resolves in ${locale}/<its own namespace>.json`, () => {
      for (const ref of refs) {
        const bundle = JSON.parse(
          readFileSync(
            path.join(repoRoot, `packages/i18n/locales/${locale}/${ref.namespace}.json`),
            'utf8',
          ),
        ) as Record<string, string>;
        // Belt and braces — assert the bundle is non-empty BEFORE asserting any key, so a mis-resolved path
        // that yields `{}` cannot read as "the key is simply missing".
        expect(Object.keys(bundle).length).toBeGreaterThan(0);
        const copy = bundle[ref.key];
        expect(
          copy,
          `${ref.key} is missing from ${locale}/${ref.namespace}.json — t() would THROW at the render layer`,
        ).toBeTruthy();
      }
    });
  }

  it('the ROW presenter emits exactly ONE of the ten (`row_a11y`), which takes a `{name}` param', () => {
    const vm = deriveContributionRowViewModel(row());
    expect(vm.rowA11y.ref.key).toBe('contributor_list.row_a11y');
    const bundle = JSON.parse(
      readFileSync(path.join(repoRoot, 'packages/i18n/locales/en/contribution.json'), 'utf8'),
    ) as Record<string, string>;
    // The presenter does NOT fill `{name}` — the consumer resolves the display name FIRST and passes it as a
    // param: `t(key, { name }, { namespace })`. The namespace is the THIRD argument (resolver.ts:53).
    expect(bundle['contributor_list.row_a11y']).toContain('{name}');
    expect(JSON.stringify(vm)).not.toContain('{name}');
  });
});
