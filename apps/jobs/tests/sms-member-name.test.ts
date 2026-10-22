// Story 6.37e (Task 1.2; AC1; `2026-10-18-359` B, `2026-10-18-362` B; `2026-10-22-377` SN1–SN3) — the ONE name choice for the four
// texts: the full mode-resolved name when it fits the `{member}` slot, else the Pariwar's existing shielded form, else `too_long`.
// Every expected short form is COMPUTED through the domain's resolver — ⛔ transcribed (F9: a Devanagari conjunct initial depends on
// the runtime's ICU); the three literal pins — (b) 'Ramesh S.', (c) 'सत्यनारायण श.', (k) 'Venkata -.' — carry no conjunct initial, so
// they are ICU-stable, and they only guard the computed value against a resolver that stops shortening. The callers' source leg
// pins I4: ONE function, called by exactly the two text senders. It reads the TypeScript AST (as `scripts/*/lib.ts` do) where
// `staff-email-identity-read-fence.test.ts`, its model, strips comments with a regex — a string such as `'src/*.ts'` opens a fake
// comment for that regex and hides a later call (Story 6.37e code review, 2026-10-22).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DLT_TYPE_MAX_LENGTH, type DltSlot } from '@twt/channels';
import { notifications } from '@twt/domain';
import ts from 'typescript';
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
const SOURCE = /\.(?:ts|tsx|mts|cts|js|mjs)$/;
const MODULE = 'apps/jobs/src/scheduler/sms-member-name.ts';
const PREDICATE_HOME = 'apps/jobs/src/scheduler/peer-mesh-sms-templates.ts';

/** The ONLY files whose code calls or imports the one function — the two text senders. */
const CALLERS = ['apps/jobs/src/scheduler/claim-peer-mesh-requests.ts', 'apps/jobs/src/scheduler/claim-suspicion-notices.ts'];

const MODULE_SPECIFIER = /\/sms-member-name(?:\.js)?$/;

function walk(rel: string, out: Map<string, string>): void {
  const abs = path.join(repoRoot, rel);
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const childRel = `${rel}/${name}`;
    if (statSync(path.join(abs, name)).isDirectory()) walk(childRel, out);
    else if (SOURCE.test(name)) out.set(childRel, readFileSync(path.join(abs, name), 'utf-8'));
  }
}

/** What a file's CODE does. Comments are trivia (never a node) and a string is ONE literal whatever it holds. */
interface CodeFacts {
  /** An `import` / `export … from` / `import()` of `sms-member-name`. */
  readonly importsModule: boolean;
  /** A call `smsMemberName(…)` or `ns.smsMemberName(…)`. */
  readonly callsModule: boolean;
  /** `fitsDltAlphanumeric` called or declared. */
  readonly fitsPredicate: boolean;
  /** The string literal `'shielded_name'`. */
  readonly shieldedLiteral: boolean;
}

const factsCache = new Map<string, CodeFacts>();
function codeFacts(src: string): CodeFacts {
  const cached = factsCache.get(src);
  if (cached !== undefined) return cached;
  let importsModule = false;
  let callsModule = false;
  let fitsPredicate = false;
  let shieldedLiteral = false;
  const calleeName = (e: ts.Expression) => (ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : undefined);
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier !== undefined) {
      if (ts.isStringLiteral(n.moduleSpecifier) && MODULE_SPECIFIER.test(n.moduleSpecifier.text)) importsModule = true;
    }
    if (ts.isCallExpression(n)) {
      const arg = n.arguments[0];
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword && arg !== undefined && ts.isStringLiteralLike(arg) && MODULE_SPECIFIER.test(arg.text)) {
        importsModule = true;
      }
      const callee = calleeName(n.expression);
      if (callee === 'smsMemberName') callsModule = true;
      if (callee === 'fitsDltAlphanumeric') fitsPredicate = true;
    }
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'fitsDltAlphanumeric') fitsPredicate = true;
    if (ts.isStringLiteralLike(n) && n.text === 'shielded_name') shieldedLiteral = true;
    ts.forEachChild(n, visit);
  };
  visit(ts.createSourceFile('probe.ts', src, ts.ScriptTarget.Latest, true));
  const facts: CodeFacts = { importsModule, callsModule, fitsPredicate, shieldedLiteral };
  factsCache.set(src, facts);
  return facts;
}

/** ⭐ ONE checker for the real tree and the plants: the files (⛔ `skip`) whose CODE shows the fact. */
const filesWhere = (files: ReadonlyMap<string, string>, pick: (facts: CodeFacts) => boolean, skip?: string): string[] =>
  [...files]
    .filter(([f]) => f !== skip)
    .filter(([, src]) => pick(codeFacts(src)))
    .map(([f]) => f)
    .sort();
const callersOf = (files: ReadonlyMap<string, string>) => filesWhere(files, (c) => c.importsModule || c.callsModule, MODULE);

describe('I4 — ONE function for the four texts, called by exactly the two text senders (AC1 source leg)', () => {
  const tree = new Map<string, string>();
  walk('apps/jobs/src', tree);

  it('the module is in the walk (a rename fails) and the callers are EXACTLY the two senders', () => {
    expect(tree.has(MODULE)).toBe(true);
    expect(callersOf(tree)).toEqual(CALLERS);
  });

  it('⭐ positive controls — a third caller IS caught; a commented call or a string that only NAMES it is ⛔', () => {
    const planted = new Map(tree);
    planted.set('apps/jobs/src/other/third.ts', "import { smsMemberName } from '../scheduler/sms-member-name.js';\n");
    expect(callersOf(planted)).toEqual([...CALLERS, 'apps/jobs/src/other/third.ts'].sort());
    const called = new Map(tree);
    called.set('apps/jobs/src/other/fourth.ts', 'export const x = smsMemberName (name);\n');
    expect(callersOf(called)).toEqual([...CALLERS, 'apps/jobs/src/other/fourth.ts'].sort());
    const commented = new Map(tree);
    commented.set('apps/jobs/src/other/fifth.ts', '// smsMemberName(name)\n/* import x from "./sms-member-name.js" */\nexport {};\n');
    expect(callersOf(commented)).toEqual(CALLERS);
    const named = new Map(tree);
    named.set('apps/jobs/src/other/sixth.ts', "export const doc = 'smsMemberName(x) from ./sms-member-name.js';\n");
    expect(callersOf(named)).toEqual(CALLERS);
  });

  it('⭐ positive controls — a call AFTER a string that a comment-stripping regex would take for a comment IS caught (code review 2026-10-22)', () => {
    const glob = new Map(tree);
    glob.set('apps/jobs/src/other/seventh.ts', "const g = 'src/*.ts';\nexport const x = smsMemberName(n);\n/** doc */\n");
    expect(callersOf(glob)).toEqual([...CALLERS, 'apps/jobs/src/other/seventh.ts'].sort());
    const slashes = new Map(tree);
    slashes.set('apps/jobs/src/other/eighth.ts', "const s = ' //'; export const y = smsMemberName(n);\n");
    expect(callersOf(slashes)).toEqual([...CALLERS, 'apps/jobs/src/other/eighth.ts'].sort());
    const dynamic = new Map(tree);
    dynamic.set('apps/jobs/src/other/ninth.ts', "export const z = () => import('../scheduler/sms-member-name.js');\n");
    expect(callersOf(dynamic)).toEqual([...CALLERS, 'apps/jobs/src/other/ninth.ts'].sort());
  });

  it('⭐ positive controls — a RE-EXPORT and a member call (`deps.smsMemberName(n)`, no import in the file) ARE caught', () => {
    const reexport = new Map(tree);
    reexport.set('apps/jobs/src/other/eleventh.ts', "export { smsMemberName } from '../scheduler/sms-member-name.js';\n");
    expect(callersOf(reexport)).toEqual([...CALLERS, 'apps/jobs/src/other/eleventh.ts'].sort());
    const member = new Map(tree);
    member.set('apps/jobs/src/other/twelfth.ts', 'export const w = (deps: { smsMemberName(n: string): unknown }, n: string) => deps.smsMemberName(n);\n');
    expect(callersOf(member)).toEqual([...CALLERS, 'apps/jobs/src/other/twelfth.ts'].sort());
  });

  it('⛔ a second fit or shorten: `fitsDltAlphanumeric` is called or declared only in its home and the module; `shielded_name` only in the module', () => {
    expect(filesWhere(tree, (c) => c.fitsPredicate)).toEqual([MODULE, PREDICATE_HOME].sort());
    expect(filesWhere(tree, (c) => c.shieldedLiteral)).toEqual([MODULE]);
  });

  it('⭐ positive control — a second fit or a second `shielded_name` reader IS caught', () => {
    const planted = new Map(tree);
    planted.set('apps/jobs/src/other/tenth.ts', "export const ok = (n: string) => fitsDltAlphanumeric(n);\nexport const m = 'shielded_name';\n");
    expect(filesWhere(planted, (c) => c.fitsPredicate)).toEqual([MODULE, PREDICATE_HOME, 'apps/jobs/src/other/tenth.ts'].sort());
    expect(filesWhere(planted, (c) => c.shieldedLiteral)).toEqual([MODULE, 'apps/jobs/src/other/tenth.ts'].sort());
  });
});
