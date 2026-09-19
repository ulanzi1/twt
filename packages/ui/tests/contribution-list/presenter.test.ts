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
//
// ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 / `2026-09-18-222` (`#decision-2026-09-19-224` D1/D2): the
// member wire now carries `{ name: string | null }`, so a withheld name IS producible and renders a
// PLACEHOLDER from ONE existing key (`sahyog-vivran` → `value.contributor_unnamed`). The input kinds are
// `name | unnamed`, the output arms `name | placeholder`; the `unknown` throw is gone, and the `never`
// guard still throws with the KIND only.

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
  displayName: { kind: 'name', name: 'Sushil Kumar' },
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

// Was: "NAME PARTS ONLY — the presenter NEVER joins firstName + lastInitial (D9(a))". Inverted by Story
// 11b.21 (`-224` D2/D3): the server resolves the name FORM (mode-resolved, `-189` cl.3) and the wire carries
// ONE string; the presenter passes it through and still composes nothing.
describe('THE NAME PASSES THROUGH — the presenter never re-forms a server-resolved name', () => {
  it('emits the resolved name unchanged under the `name` arm', () => {
    const vm = deriveContributionRowViewModel(row({ displayName: { kind: 'name', name: 'Rajesh S.' } }));
    expect(vm.displayName).toEqual({ kind: 'name', name: 'Rajesh S.' });
  });

  it('⭐ does not shorten, split or re-case a full name', () => {
    const vm = deriveContributionRowViewModel(
      row({ displayName: { kind: 'name', name: 'Rajesh Kumar Sharma' } }),
    );
    expect(JSON.stringify(vm)).toContain('"name":"Rajesh Kumar Sharma"');
  });
});

describe('THE UNNAMED ROW — a placeholder arm, from ONE key (`-222` cl.1–cl.2, `-224` D1)', () => {
  it('an `unnamed` input renders the placeholder ref — ⛔ it does not throw and ⛔ it is not dropped', () => {
    const vm = deriveContributionRowViewModel(row({ displayName: { kind: 'unnamed' } }));
    expect(vm.displayName).toEqual({
      kind: 'placeholder',
      ref: { key: 'value.contributor_unnamed', namespace: 'sahyog-vivran' },
    });
    expect(vm.displayName).toEqual({ kind: 'placeholder', ref: CONTRIBUTION_LIST_I18N_REFS.contributorUnnamed });
  });

  it('the placeholder row keeps the SAME row a11y ref and pool letter as a named row (D5 — no new copy)', () => {
    const named = deriveContributionRowViewModel(row());
    const unnamed = deriveContributionRowViewModel(row({ displayName: { kind: 'unnamed' } }));
    expect(unnamed.rowA11y).toEqual(named.rowA11y);
    expect(unnamed.poolLetterCode).toBe(named.poolLetterCode);
  });

  it('⛔ the placeholder carries ⛔ no cause — no erasure copy, no reason field', () => {
    const serialized = JSON.stringify(deriveContributionRowViewModel(row({ displayName: { kind: 'unnamed' } })));
    for (const banned of ['anonym', 'erase', 'reason', 'cause', 'rtbf', 'withheld']) {
      expect(serialized.toLowerCase()).not.toContain(banned);
    }
  });
});

describe('EXHAUSTIVENESS over the display-name kind — TWO kinds, not three and not one (AC3)', () => {
  // Was: `name | unknown`, with `unknown` THROWING (`-168` cl.5). Story 11b.21 (`-224` D2): `name | unnamed`,
  // and `unnamed` RENDERS. ⚠ This literal is the compile-time half: adding a kind leaves it MISSING a key;
  // removing one leaves it EXCESS.
  const KINDS: Record<ContributionRowDisplayName['kind'], true> = { name: true, unnamed: true };

  it('the input variant has EXACTLY two kinds — a third cannot be added without a ruling', () => {
    expect(Object.keys(KINDS).sort()).toEqual(['name', 'unnamed']);
  });

  it('⛔ a forged retired `unknown` kind THROWS via the `never` guard — with the KIND only, ⛔ never the operand', () => {
    const forged = { kind: 'unknown', name: 'Secret Person' } as unknown as ContributionRowDisplayName;
    let message = '';
    try {
      deriveContributionRowViewModel(row({ displayName: forged }));
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/unhandled display-name kind: unknown/);
    expect(message).not.toContain('Secret');
  });

  it('⛔ the anonymized kind is NOT accepted — an unhandled kind throws rather than blanking the name', () => {
    // Hand-forged on purpose: this asserts the `never` guard fires, NOT that the system can produce this row.
    // It cannot — that is exactly why the anonymized RENDER arm was deleted rather than tested.
    const forged = { kind: 'anonymized', i18nKey: 'member.anonymousMember' } as unknown as ContributionRowDisplayName;
    expect(() => deriveContributionRowViewModel(row({ displayName: forged }))).toThrow(
      /unhandled display-name kind/,
    );
  });

  // Was: "the OUTPUT union is a SINGLE `nameParts` arm (D11-outputshape(a))" — `-169` cl.8 superseded in
  // part (presenter + render layer) by `-224` D2.
  it('the OUTPUT union is EXACTLY `name | placeholder` — ⛔ the `nameParts` arm is gone', () => {
    const ARMS: Record<ContributionRowViewModel['displayName']['kind'], true> = { name: true, placeholder: true };
    expect(Object.keys(ARMS).sort()).toEqual(['name', 'placeholder']);
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
  // Story 11b.21: `firstName`/`lastInitial` → `name`; the placeholder arm adds `ref`/`key`/`namespace`.
  const NESTED_INPUT_KEYS: Record<AllKeys<ContributionRowInput>, true> = {
    displayName: true,
    kind: true,
    name: true,
    poolLetterCode: true,
  };
  const NESTED_VIEW_MODEL_KEYS: Record<AllKeys<ContributionRowViewModel>, true> = {
    displayName: true,
    kind: true,
    name: true,
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

  // Was: `Object.keys(vm.displayName)` = `['firstName', 'kind', 'lastInitial']` for the ONE (named) arm.
  // Story 11b.21 (`-224` D2): the named arm is `['kind', 'name']`, and the new placeholder arm is
  // `['kind', 'ref']` — the runtime keys of BOTH are pinned.
  it('(d) the ACTUAL RUNTIME return value carries exactly the declared keys — a compile-time literal alone cannot see an unsafe cast or object spread adding an extra property', () => {
    const vm = deriveContributionRowViewModel(row());
    expect(Object.keys(vm).sort()).toEqual(Object.keys(VIEW_MODEL_KEYS).sort());
    expect(Object.keys(vm.displayName).sort()).toEqual(['kind', 'name']);
    const placeholder = deriveContributionRowViewModel(row({ displayName: { kind: 'unnamed' } }));
    expect(Object.keys(placeholder).sort()).toEqual(Object.keys(VIEW_MODEL_KEYS).sort());
    expect(Object.keys(placeholder.displayName).sort()).toEqual(['kind', 'ref']);
    expect(Object.keys(vm.rowA11y).sort()).toEqual(['ref']);
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

  // Was: "declares all TEN `contributor_list.*` refs" with every key `startsWith('contributor_list.')`.
  // Story 11b.21 (`-224` D1) adds exactly ONE ref from another namespace — the ruled placeholder word.
  it('declares ELEVEN refs: the ten `contributor_list.*` + EXACTLY ONE `sahyog-vivran` placeholder — ⛔ NOT `member.anonymousMember`', () => {
    expect(refs).toHaveLength(11);
    const foreign = refs.filter((ref) => !ref.key.startsWith('contributor_list.'));
    expect(foreign).toEqual([{ key: 'value.contributor_unnamed', namespace: 'sahyog-vivran' }]);
    for (const ref of refs) {
      if (ref !== foreign[0]) expect(ref.namespace).toBe('contribution');
    }
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

  // Was: "the ROW presenter emits exactly ONE of the ten (`row_a11y`), which takes a `{name}` param" — the
  // ten `contributor_list.*` refs are now eleven (`-224` D1); the row presenter emits `row_a11y` for every
  // row and, for an UNNAMED row, also the placeholder ref (asserted below — the title's second half).
  it('the ROW presenter emits `row_a11y` (and, for an unnamed row, the placeholder); `row_a11y` takes a `{name}` param', () => {
    const vm = deriveContributionRowViewModel(row());
    expect(vm.rowA11y.ref.key).toBe('contributor_list.row_a11y');
    const unnamed = deriveContributionRowViewModel(row({ displayName: { kind: 'unnamed' } }));
    expect(unnamed.rowA11y.ref.key).toBe('contributor_list.row_a11y');
    expect(unnamed.displayName).toEqual({
      kind: 'placeholder',
      ref: { key: 'value.contributor_unnamed', namespace: 'sahyog-vivran' },
    });
    const bundle = JSON.parse(
      readFileSync(path.join(repoRoot, 'packages/i18n/locales/en/contribution.json'), 'utf8'),
    ) as Record<string, string>;
    // The presenter does NOT fill `{name}` — the consumer resolves the display name FIRST and passes it as a
    // param: `t(key, { name }, { namespace })`. The namespace is the THIRD argument (resolver.ts:53).
    expect(bundle['contributor_list.row_a11y']).toContain('{name}');
    expect(JSON.stringify(vm)).not.toContain('{name}');
  });
});
