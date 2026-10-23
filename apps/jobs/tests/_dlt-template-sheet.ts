// The DLT registration sheet, read by the lockstep tests — Story 6.34 (TV2 / TV8 / TV13; AC3, AC7).
// `docs/launch-gate-inventory/dlt-template-requests-6-19.md`'s template table is the request BigDev copies into
// STPL's SmartPing portal: each row names a template's config key, the TRAI type to select for each variable, in
// order, and the MSG91 form of its text (`##name##` per variable). These helpers find a row BY CONFIG KEY so a
// renumbered row cannot silently compare against the wrong template.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DLT_VAR, DLT_VARIABLE_TYPES, type DltSlot, type DltVariableType } from '@twt/channels';
import { expect } from 'vitest';

export const SHEET = readFileSync(
  fileURLToPath(new URL('../../../docs/launch-gate-inventory/dlt-template-requests-6-19.md', import.meta.url)),
  'utf-8',
);

/** The raw `claim.json` catalogues (flat keys) — the i18n values the slot names must match. */
export const CLAIM_CATALOG: Readonly<Record<'hi' | 'en', Readonly<Record<string, string>>>> = {
  hi: JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../packages/i18n/locales/hi/claim.json', import.meta.url)), 'utf-8'),
  ) as Record<string, string>,
  en: JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../packages/i18n/locales/en/claim.json', import.meta.url)), 'utf-8'),
  ) as Record<string, string>,
};

/** The raw `contribution.json` catalogues (flat keys) — Story 5.11's `sms.*` notices live here. */
export const CONTRIBUTION_CATALOG: Readonly<Record<'hi' | 'en', Readonly<Record<string, string>>>> = {
  hi: JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../packages/i18n/locales/hi/contribution.json', import.meta.url)), 'utf-8'),
  ) as Record<string, string>,
  en: JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../packages/i18n/locales/en/contribution.json', import.meta.url)), 'utf-8'),
  ) as Record<string, string>,
};

/** The `{param}` names an i18n value interpolates, in order (the resolver's own token shape). */
export function i18nParamNames(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string);
}

/** The MSG91 form of a registered text: each variable marker replaced, in order, by `##<slot name>##` (TV13). */
export function msg91Form(registeredText: string, slots: readonly DltSlot[]): string {
  const parts = registeredText.split(DLT_VAR);
  return parts.reduce((out, part, i) => (i === 0 ? part : `${out}##${slots[i - 1]?.name ?? '?'}##${part}`), '');
}

const TYPE_WORD = new RegExp(`\\b\\d+ (${DLT_VARIABLE_TYPES.join('|')})\\b`, 'g');

/** One template row of the sheet's main table, found by its config key. */
export interface SheetTemplateRow {
  readonly number: number;
  /** The TRAI types listed in the "Variable types" cell, in order. */
  readonly types: DltVariableType[];
  /** The "MSG91 template" cell, backticks stripped. */
  readonly msg91: string;
}

/**
 * Asserts the sheet's "Registered text" tables carry ordinal `number` on exactly ONE line, and that line IS
 * `| <number> | <registeredText> |` — the row BigDev copies into SmartPing (third code review: ⛔ a substring, so a
 * stale second row with the same ordinal, a mid-line occurrence or an extra cell fails). Main-table rows — the ones
 * carrying a config key — are excluded; they share the ordinals.
 */
export function expectRegisteredTextRow(number: number, registeredText: string): void {
  const ordinal = new RegExp(`^ {0,3}\\|[ \\t]*${String(number)}[ \\t]*\\|`);
  const lines = SHEET.split('\n').filter((line) => ordinal.test(line) && !line.includes('`sms.dlt.template_id.'));
  expect(lines, `the sheet's "Registered text" row ${String(number)}`).toHaveLength(1);
  expect((lines[0] as string).trim()).toBe(`| ${String(number)} | ${registeredText} |`);
}

/** The ONE main-table row carrying `configKey` (in backticks) — fails the test if there is none or more than one. */
export function sheetRowByConfigKey(configKey: string): SheetTemplateRow {
  // Up to three leading spaces, as GFM renders. ⛔ The gate's SHEET_TEMPLATE_ROW: a main-table ordinal is a whole
  // number (it is returned as one), so a lettered ordinal is ⛔ selected here (third code review).
  const rows = SHEET.split('\n').filter(
    (line) => /^ {0,3}\|[ \t]*\d+[ \t]*\|/.test(line) && line.includes(`\`${configKey}\``),
  );
  expect(rows, `the sheet's main-table row for ${configKey}`).toHaveLength(1);
  const cells = (rows[0] as string).split('|').map((c) => c.trim());
  // | # | Message | Locale | Owning story | Config key | Variable types | MSG91 template |
  const typesCell = cells[6] ?? '';
  const msg91Cell = cells[7] ?? '';
  return {
    number: Number(cells[1]),
    types: [...typesCell.matchAll(TYPE_WORD)].map((m) => m[1] as DltVariableType),
    msg91: msg91Cell.replace(/^`|`$/g, ''),
  };
}
