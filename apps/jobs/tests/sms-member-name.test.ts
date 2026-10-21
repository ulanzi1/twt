// Story 6.37e (Task 1.2; AC1; `2026-10-18-359` B, `2026-10-18-362` B; `2026-10-22-377` SN1–SN3) — the ONE name choice for the four
// texts: the full mode-resolved name when it fits the `{member}` slot, else the Pariwar's existing shielded form, else `too_long`.
// Every expected short form is COMPUTED through the domain's resolver — ⛔ transcribed (F9: a Devanagari conjunct initial depends on
// the runtime's ICU). The callers' source leg (on `staff-email-identity-read-fence.test.ts`'s model) pins I4: ONE function, called by
// exactly the two text senders.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DLT_TYPE_MAX_LENGTH, type DltSlot } from '@twt/channels';
import { notifications } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { PEER_MESH_REQUEST_SMS_TEMPLATES } from '../src/scheduler/peer-mesh-sms-templates.js';
import { smsMemberName } from '../src/scheduler/sms-member-name.js';
import { SUSPICION_NOTICE_SMS_TEMPLATES } from '../src/scheduler/suspicion-notice-sms-templates.js';

const shielded = (name: string) => notifications.resolveMemberFacingDeceasedName('shielded_name', name);
const codePoints = (s: string) => [...s].length;

describe('smsMemberName — the full name when it fits, else the shielded form, else too_long (AC1)', () => {
  it('(a) a 40-code-point multi-word name ⇒ `full`, byte-identical', () => {
    const name = 'Ramesh ' + 'K'.repeat(26) + ' Sharma';
    expect(codePoints(name)).toBe(40);
    expect(smsMemberName(name)).toEqual({ kind: 'full', name });
  });

  it('(b) a 41-code-point multi-word name ⇒ `short`, the shielded form (computed)', () => {
    const name = 'Ramesh ' + 'K'.repeat(27) + ' Sharma';
    expect(codePoints(name)).toBe(41);
    expect(smsMemberName(name)).toEqual({ kind: 'short', name: shielded(name) });
    expect(shielded(name)).toBe('Ramesh S.');
  });

  it('(c) a Devanagari name over 40 with a NON-conjunct surname initial ⇒ `short`', () => {
    const name = 'सत्यनारायण मूर्ति सुब्रह्मण्यम चतुर्वेदी शर्मा';
    expect(codePoints(name)).toBeGreaterThan(40);
    const out = smsMemberName(name);
    expect(out).toEqual({ kind: 'short', name: shielded(name) });
    expect(shielded(name)).toBe('सत्यनारायण श.');
  });

  it('(d) a ONE-word name of 41 ⇒ `too_long`', () => {
    expect(smsMemberName('A'.repeat(41))).toEqual({ kind: 'too_long' });
  });

  it('(e) a multi-word name whose short form is still over 40 ⇒ `too_long` (PQ2 — as built)', () => {
    const name = 'A'.repeat(39) + ' B';
    expect(codePoints(shielded(name))).toBe(42);
    expect(smsMemberName(name)).toEqual({ kind: 'too_long' });
  });

  it('(f) an already-shielded input: fitting ⇒ `full` as passed; an over-long ONE-word shielded input ⇒ `too_long` (F7)', () => {
    expect(smsMemberName('Ramesh S.')).toEqual({ kind: 'full', name: 'Ramesh S.' });
    expect(smsMemberName('Venkatanarayana'.repeat(3))).toEqual({ kind: 'too_long' });
  });

  it('(g) a fitting name with internal double spaces is returned AS PASSED (⛔ re-collapsed — the resolver already did)', () => {
    expect(smsMemberName('Ramesh  Kumar')).toEqual({ kind: 'full', name: 'Ramesh  Kumar' });
  });

  it("(h) '' ⇒ throws a fixed, name-free message (a caller bug — SN2)", () => {
    expect(() => smsMemberName('')).toThrow('[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)');
  });

  it("(h′) a whitespace-only name of 41 ⇒ throws (⛔ a blank `short`)", () => {
    expect(() => smsMemberName(' '.repeat(41))).toThrow('[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)');
  });

  it('(i) an astral-plane ONE-word name of 40 code points (80 UTF-16 units) ⇒ `full` — code points, ⛔ UTF-16', () => {
    const name = '𝐀'.repeat(40);
    expect(name.length).toBe(80);
    expect(smsMemberName(name)).toEqual({ kind: 'full', name });
  });

  it("(k) a 44-code-point name ending in ' -' ⇒ `short`, the AS-BUILT form (F16, PQ1 — ⛔ token cleaning)", () => {
    const name = 'Venkata Satya Narayana Murthy Subrahmanyam -';
    expect(codePoints(name)).toBe(44);
    expect(smsMemberName(name)).toEqual({ kind: 'short', name: shielded(name) });
    expect(shielded(name)).toBe('Venkata -.');
  });
});

// ── (j) SN3 — one limit, two slots ─────────────────────────────────────────────────────────────────────────────────────────

/** Every `{member}` slot's `maxLength` across both registries. */
function memberMaxLengths(slotLists: readonly (readonly DltSlot[])[]): number[] {
  return slotLists.flatMap((slots) => slots.filter((s) => s.name === 'member').map((s) => s.maxLength));
}
/** ⭐ ONE comparison for the real registries and the positive control. */
const allEqualTo = (lengths: readonly number[], limit: number) => lengths.length > 0 && lengths.every((n) => n === limit);

describe('(j) SN3 — the suspicion and neighbours `{member}` slots share ONE limit, the alphanumeric ceiling', () => {
  const real = [
    ...Object.values(SUSPICION_NOTICE_SMS_TEMPLATES).flatMap((byLocale) => Object.values(byLocale).map((e) => e.slots)),
    ...Object.values(PEER_MESH_REQUEST_SMS_TEMPLATES).map((e) => e.slots),
  ];

  it('every member slot (6 suspicion + 2 neighbours) has maxLength === DLT_TYPE_MAX_LENGTH.alphanumeric', () => {
    const lengths = memberMaxLengths(real);
    expect(lengths).toHaveLength(8);
    expect(allEqualTo(lengths, DLT_TYPE_MAX_LENGTH.alphanumeric)).toBe(true);
  });

  it('⭐ positive control — a planted unequal maxLength IS caught by the same comparison', () => {
    const planted: DltSlot = { name: 'member', type: 'alphanumeric', maxLength: DLT_TYPE_MAX_LENGTH.alphanumeric + 1, label: 'planted' };
    expect(allEqualTo(memberMaxLengths([...real, [planted]]), DLT_TYPE_MAX_LENGTH.alphanumeric)).toBe(false);
  });
});

// ── The callers' source leg (I4) ───────────────────────────────────────────────────────────────────────────────────────────

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');
const SOURCE = /\.(?:ts|tsx|mts|cts|js|mjs)$/;
const MODULE = 'apps/jobs/src/scheduler/sms-member-name.ts';
const PREDICATE_HOME = 'apps/jobs/src/scheduler/peer-mesh-sms-templates.ts';

/** The ONLY files whose code calls or imports the one function — the two text senders. */
const CALLERS = ['apps/jobs/src/scheduler/claim-peer-mesh-requests.ts', 'apps/jobs/src/scheduler/claim-suspicion-notices.ts'];

const IMPORTS_MODULE = /['"][^'"]*\/sms-member-name(?:\.js)?['"]/;
const CALLS = /\bsmsMemberName\s*\(/;
const FITS_CALL = /\bfitsDltAlphanumeric\s*\(/;
const SHIELDED_MODE = /['"`]shielded_name['"`]/;

function walk(rel: string, out: Map<string, string>): void {
  const abs = path.join(repoRoot, rel);
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const childRel = `${rel}/${name}`;
    if (statSync(path.join(abs, name)).isDirectory()) walk(childRel, out);
    else if (SOURCE.test(name)) out.set(childRel, readFileSync(path.join(abs, name), 'utf-8'));
  }
}

/** ⭐ ONE checker for the real tree and the plants: the files (⛔ the module itself) whose CODE imports or calls it. */
function callersOf(files: ReadonlyMap<string, string>): string[] {
  return [...files]
    .filter(([f]) => f !== MODULE)
    .filter(([, src]) => {
      const code = stripComments(src);
      return IMPORTS_MODULE.test(code) || CALLS.test(code);
    })
    .map(([f]) => f)
    .sort();
}
const filesWhoseCode = (files: ReadonlyMap<string, string>, re: RegExp) =>
  [...files].filter(([, src]) => re.test(stripComments(src))).map(([f]) => f).sort();

describe('I4 — ONE function for the four texts, called by exactly the two text senders (AC1 source leg)', () => {
  const tree = new Map<string, string>();
  walk('apps/jobs/src', tree);

  it('the module is in the walk (a rename fails) and the callers are EXACTLY the two senders', () => {
    expect(tree.has(MODULE)).toBe(true);
    expect(callersOf(tree)).toEqual(CALLERS);
  });

  it('⭐ positive controls — a third caller IS caught; a commented call is ⛔', () => {
    const planted = new Map(tree);
    planted.set('apps/jobs/src/other/third.ts', "import { smsMemberName } from '../scheduler/sms-member-name.js';\n");
    expect(callersOf(planted)).toEqual([...CALLERS, 'apps/jobs/src/other/third.ts'].sort());
    const called = new Map(tree);
    called.set('apps/jobs/src/other/fourth.ts', 'export const x = smsMemberName (name);\n');
    expect(callersOf(called)).toEqual([...CALLERS, 'apps/jobs/src/other/fourth.ts'].sort());
    const commented = new Map(tree);
    commented.set('apps/jobs/src/other/fifth.ts', '// smsMemberName(name)\n/* import x from "./sms-member-name.js" */\nexport {};\n');
    expect(callersOf(commented)).toEqual(CALLERS);
  });

  it('⛔ a second fit or shorten: `fitsDltAlphanumeric(` is called only in its home and the module; `shielded_name` only in the module', () => {
    expect(filesWhoseCode(tree, FITS_CALL)).toEqual([MODULE, PREDICATE_HOME].sort());
    expect(filesWhoseCode(tree, SHIELDED_MODE)).toEqual([MODULE]);
  });
});
