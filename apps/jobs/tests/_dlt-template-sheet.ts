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

/** The ONE main-table row carrying `configKey` (in backticks) — fails the test if there is none or more than one. */
export function sheetRowByConfigKey(configKey: string): SheetTemplateRow {
  // Up to three leading spaces, as GFM renders (the gate's SHEET_TEMPLATE_ROW, which also scans pipe-less look-alikes).
  const rows = SHEET.split('\n').filter(
    (line) => /^ {0,3}\|\s*\d+[A-Za-z]?\s*\|/.test(line) && line.includes(`\`${configKey}\``),
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
