// ⭐⭐ Story 11b.20 — the ratified §8.1 message block on the PUBLIC Sahyog Vivran page.
//
// ⭐ Authority: `#decision-2026-09-11-214` Consequence 3 (the public render), `#decision-2026-09-13-216`
// cl.1 (₹0 silence, every stage), `#decision-2026-09-19-223` cl.1 (a null name renders `no_family`).
//
// ⚠ `scrape-test.spec.ts` synthesises its HTML from FIELD IDS, so it ⛔ never sees this block's text.
// ⇒ these tests are the only coverage the text has, and they resolve it through the REAL `t()` and the
// REAL `formatCurrency` ([[feedback_stub_must_call_not_transcribe]]) — ⛔ never a transcribed string.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatCurrency, t, type Locale } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import {
  SAHYOG_VIVRAN_MESSAGE_BLOCK_BODY_KEYS,
  resolveSahyogVivranMessageBlockCopy,
  selectSahyogVivranMessageBlock,
  type SahyogVivranMessageBlockInput,
} from '../src/lib/sahyog-vivran-message-block.js';
import { buildSahyogVivranOutageView } from '../src/lib/sahyog-vivran-render.js';
import { sahyogVivranSurfaceFieldIds } from '../src/lib/surface-fields.js';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const LOCALES: readonly Locale[] = ['en', 'hi'];
const NS = { namespace: 'sahyog-shared' } as const;

/** Strip Astro/JS comments so a commented-out line cannot satisfy a presence assertion. */
const stripComments = (src: string): string =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const MODULE_SRC = readFileSync(join(appRoot, 'src/lib/sahyog-vivran-message-block.ts'), 'utf8');
const MODULE = stripComments(MODULE_SRC);
const PAGE = stripComments(
  readFileSync(join(appRoot, 'src/pages/sahyog-vivran/[driveToken].astro'), 'utf8'),
);

const ALL_VISIBLE = { amount: true, deceasedName: true, nomineeName: true, district: true } as const;

const input = (over: Partial<SahyogVivranMessageBlockInput> = {}): SahyogVivranMessageBlockInput => ({
  amountRaisedInr: 137000,
  deceasedMemberName: 'Ramesh Kumar',
  district: 'Patna',
  nomineeName: 'Sunita Devi',
  visible: ALL_VISIBLE,
  ...over,
});

describe('⭐ AC6 — the headline variant: a name renders `.full`, a null name renders `no_family`', () => {
  it('⭐ a named, funded drive renders `.full` WITH the name (catches a selector stuck on `no_family`)', () => {
    const block = selectSahyogVivranMessageBlock(input());
    expect(block).not.toBeNull();
    expect(block!.headline).toEqual({ key: 'message_block.headline.full', familyName: 'Ramesh Kumar' });
  });

  it('⭐ a null-name, funded drive renders `no_family` — ⛔ never `null` (catches a dropped block)', () => {
    const block = selectSahyogVivranMessageBlock(input({ deceasedMemberName: null }));
    expect(block).not.toBeNull();
    expect(block!.headline).toEqual({ key: 'message_block.headline.no_family' });
  });

  it('⛔ the module claims ⛔ no cause for a null name (`-160` cl.6, `-223` cl.4)', () => {
    expect(MODULE_SRC).not.toMatch(/withh[eo]ld|declin|consent|unconsented|chose not|authoris/i);
  });
});

describe('⭐ AC7 — silent on a ₹0 drive, and the ₹0 check runs FIRST', () => {
  it('⭐ the WHOLE block (headline AND table) is `null` at ₹0 — named or not', () => {
    expect(selectSahyogVivranMessageBlock(input({ amountRaisedInr: 0 }))).toBeNull();
    expect(
      selectSahyogVivranMessageBlock(input({ amountRaisedInr: 0, deceasedMemberName: null })),
    ).toBeNull();
    expect(selectSahyogVivranMessageBlock(input({ amountRaisedInr: -1 }))).toBeNull();
    // ⭐ ₹1 is funded — the boundary is `<= 0`, ⛔ not `< 100` or any other threshold.
    expect(selectSahyogVivranMessageBlock(input({ amountRaisedInr: 1 }))).not.toBeNull();
  });

  it('⭐⭐ the ₹0 decision PRECEDES the name decision in the source (order, ⛔ not presence)', () => {
    // ⚠ Presence alone passes if the two are swapped — a ₹0 unnamed drive would then resolve
    // `no_family` while both lines still exist. ⇒ compare their positions, as the member fence does.
    const amountIdx = MODULE.search(/amountRaisedInr <= 0\)\s*return null/);
    const nameIdx = MODULE.search(
      /familyName === null\)\s*return \{ headline: \{ key: 'message_block\.headline\.no_family' \}/,
    );
    expect(amountIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeGreaterThan(-1);
    expect(amountIdx).toBeLessThan(nameIdx);
  });
});

describe('⭐ AC4 — the table: an absent token DROPS its column; an empty table renders nothing', () => {
  it('⭐ both columns, nominee LEFT and district RIGHT, through the existing matrix field ids', () => {
    expect(selectSahyogVivranMessageBlock(input())!.columns).toEqual([
      { labelKey: 'message_block.table.nominee_name', field: 'nominee_account_holder_name', value: 'Sunita Devi' },
      { labelKey: 'message_block.table.district', field: 'district', value: 'Patna' },
    ]);
  });

  it('⭐ a null `district` drops the District column', () => {
    expect(selectSahyogVivranMessageBlock(input({ district: null }))!.columns.map((c) => c.field)).toEqual([
      'nominee_account_holder_name',
    ]);
  });

  it('⭐ a null deceased name drops the District column — the district travels with the DECEASED', () => {
    expect(
      selectSahyogVivranMessageBlock(input({ deceasedMemberName: null }))!.columns.map((c) => c.field),
    ).toEqual(['nominee_account_holder_name']);
  });

  it('⭐ a null holder name drops the Nominee column', () => {
    expect(selectSahyogVivranMessageBlock(input({ nomineeName: null }))!.columns.map((c) => c.field)).toEqual([
      'district',
    ]);
  });

  it('⭐ nothing to tabulate ⇒ `[]`, ⛔ never a table of placeholders — and the headline still renders', () => {
    const block = selectSahyogVivranMessageBlock(
      input({ nomineeName: null, deceasedMemberName: null }),
    );
    expect(block!.columns).toEqual([]);
    expect(block!.headline.key).toBe('message_block.headline.no_family');
    // ⭐ the page renders the table ⛔ only when there is a column.
    expect(PAGE).toMatch(/messageBlockCopy\.columns\.length > 0 &&/);
  });

  it('⭐ both field ids are ALREADY declared on this surface — ⛔ no new field id is minted (AC8(iii))', () => {
    // ⭐ the REAL outage model — its keys are the surface's own; ⛔ no hand-built shape.
    const declared = sahyogVivranSurfaceFieldIds(buildSahyogVivranOutageView().model);
    expect(declared).toContain('nominee_account_holder_name');
    expect(declared).toContain('district');
  });
});

describe('⭐ AC8(iv) — the matrix verdicts are HONOURED, ⛔ never thrown on', () => {
  it('⭐ a suppressed `amount_raised_inr` ⇒ ⛔ no block at all (both headlines carry `{amount}`)', () => {
    expect(
      selectSahyogVivranMessageBlock(input({ visible: { ...ALL_VISIBLE, amount: false } })),
    ).toBeNull();
  });

  it('⭐ a suppressed `deceased_member_name` ⇒ `no_family`, and the District column drops with it', () => {
    const block = selectSahyogVivranMessageBlock(input({ visible: { ...ALL_VISIBLE, deceasedName: false } }));
    expect(block!.headline).toEqual({ key: 'message_block.headline.no_family' });
    expect(block!.columns.map((c) => c.field)).toEqual(['nominee_account_holder_name']);
  });

  it('⭐ a suppressed table field drops its COLUMN — ⛔ never a label over an empty cell', () => {
    expect(
      selectSahyogVivranMessageBlock(input({ visible: { ...ALL_VISIBLE, nomineeName: false } }))!.columns.map(
        (c) => c.field,
      ),
    ).toEqual(['district']);
    expect(
      selectSahyogVivranMessageBlock(input({ visible: { ...ALL_VISIBLE, district: false } }))!.columns.map(
        (c) => c.field,
      ),
    ).toEqual(['nominee_account_holder_name']);
  });

  it('⭐ the page asks `visibilityOf` for all four fields and passes the verdicts in', () => {
    for (const field of ['amount_raised_inr', 'deceased_member_name', 'nominee_account_holder_name', 'district']) {
      expect(PAGE).toContain(`visibilityOf('sahyog-vivran', '${field}', 'public').visible`);
    }
  });
});

describe('⭐ AC2/AC5 — the copy, resolved through the REAL `t()` and `formatCurrency`, in both locales', () => {
  for (const locale of LOCALES) {
    it(`⭐ ${locale} — a named drive: the headline carries the name and the formatted amount, verbatim`, () => {
      const copy = resolveSahyogVivranMessageBlockCopy(selectSahyogVivranMessageBlock(input())!, locale);
      const amount = formatCurrency(137000, 'en');
      expect(copy.headline).toBe(
        t('message_block.headline.full', { family_name: 'Ramesh Kumar', amount }, { locale, ...NS }),
      );
      expect(copy.headline).toContain('Ramesh Kumar');
      expect(copy.headline).toContain(amount);
      // ⛔ `{amount}` carries its own ₹ ⇒ ⛔ a second one is the `₹₹` defect.
      expect(copy.headline).not.toMatch(/₹\s*₹/);
      expect(copy.headline).not.toMatch(/[{}]/);
    });

    it(`⭐ ${locale} — a null-name drive: the no-name headline, ⛔ with no name slot and no brace`, () => {
      const copy = resolveSahyogVivranMessageBlockCopy(
        selectSahyogVivranMessageBlock(input({ deceasedMemberName: null }))!,
        locale,
      );
      expect(copy.headline).toBe(
        t('message_block.headline.no_family', { amount: formatCurrency(137000, 'en') }, { locale, ...NS }),
      );
      expect(copy.headline).not.toMatch(/[{}]/);
      // ⛔ never `-219`'s contributor placeholder standing in for the deceased.
      expect(copy.headline).not.toContain(t('value.contributor_unnamed', undefined, { locale, namespace: 'sahyog-vivran' }));
    });

    it(`⭐ ${locale} — the four name-free paragraphs, in §8.1 order, and the two table labels`, () => {
      const copy = resolveSahyogVivranMessageBlockCopy(selectSahyogVivranMessageBlock(input())!, locale);
      expect(copy.paragraphs).toEqual(
        SAHYOG_VIVRAN_MESSAGE_BLOCK_BODY_KEYS.map((k) => t(k, undefined, { locale, ...NS })),
      );
      expect(copy.paragraphs).toHaveLength(4);
      expect(copy.columns).toEqual([
        {
          field: 'nominee_account_holder_name',
          label: t('message_block.table.nominee_name', undefined, { locale, ...NS }),
          value: 'Sunita Devi',
        },
        { field: 'district', label: t('message_block.table.district', undefined, { locale, ...NS }), value: 'Patna' },
      ]);
      for (const text of [...copy.paragraphs, ...copy.columns.map((c) => c.label)]) {
        expect(text).not.toMatch(/[{}]/);
        expect(text).not.toMatch(/not recorded/i);
      }
    });
  }

  it('⭐ the body keys are the four name-free §8.1 paragraphs, as BARE literals', () => {
    expect(SAHYOG_VIVRAN_MESSAGE_BLOCK_BODY_KEYS).toEqual([
      'message_block.solidarity',
      'message_block.gratitude',
      'message_block.tagline',
      'message_block.join',
    ]);
    // ⛔ never a key built by concatenation — the dark-copy fence's RESOLVER cannot see one (AC2).
    expect(MODULE).not.toMatch(/['"`]message_block\.['"`]\s*\+/);
    expect(MODULE).not.toMatch(/\+\s*['"`]message_block/);
  });
});

describe('⭐ AC1/AC5/AC8 — the page wires it, and nothing else moves', () => {
  it('⭐ the selector is fed the RAW wire values, and ⛔ only when `fetched.ok` (the outage path renders nothing)', () => {
    expect(PAGE).toMatch(/const messageBlock = fetched\.ok\s*\?\s*selectSahyogVivranMessageBlock\(\{/);
    expect(PAGE).toMatch(/amountRaisedInr: fetched\.data\.drive\.amountRaisedInr,/);
    expect(PAGE).toMatch(/deceasedMemberName: fetched\.data\.drive\.deceasedMemberName,/);
    expect(PAGE).toMatch(/district: fetched\.data\.drive\.district,/);
    expect(PAGE).toMatch(
      /nomineeName: fetched\.data\.drive\.nomineeBankAccounts\[0\]\?\.accountHolderName \?\? null,/,
    );
    expect(PAGE).toMatch(/\}\)\s*:\s*null;/);
    // ⛔ never the labelled "₹ X raised" string, and ⛔ never a value that already had "Not recorded" applied.
    expect(PAGE).not.toMatch(/selectSahyogVivranMessageBlock\([^)]*model\./);
    expect(PAGE).toMatch(/\{messageBlockCopy !== null && \(/);
  });

  it('⭐ the table cells go through `<MatrixField>` — ⛔ never a bare `<td>{value}</td>`', () => {
    expect(PAGE).toMatch(
      /<td[^>]*><MatrixField surface="sahyog-vivran" field=\{column\.field\} viewerContext="public" value=\{column\.value\} \/><\/td>/,
    );
    expect(PAGE).not.toMatch(/<td[^>]*>\{column\.value\}<\/td>/);
  });

  it('⛔ no literal ₹ before an amount, ⛔ no multiplication, ⛔ never `deliveredTotal`', () => {
    for (const src of [PAGE, MODULE]) {
      expect(src).not.toMatch(/['"`]₹\{?\s*\$\{?\s*amount/);
      expect(src).not.toMatch(/deliveredTotal/);
    }
    expect(MODULE).not.toMatch(/\*/);
    expect(MODULE).toMatch(/formatCurrency\(block\.amountRaisedInr, 'en'\)/);
  });

  it('⛔ family 13 still holds on the page: ⛔ no `<script>`, ⛔ no `title=`, ⛔ no role on list/nav', () => {
    expect(PAGE).not.toMatch(/<script/);
    expect(PAGE).not.toMatch(/<(section|table|p|th|td)[^>]*title=/);
    expect(PAGE).not.toMatch(/<(ul|li|nav)[^>]*role=/);
  });
});
