// Story 6.37e rework (Task 1.3; AC1; `2026-10-22-379` Q1 A; `2026-10-22-380` decisions 1–4) — the ONE name choice for the four
// texts: the mode-resolved name WHOLE whenever it fits 60 code points, carried across two ≤ 30 boxes; above 60 the listed titles
// dropped, then initials from the FIRST word, ⛔ never the last word; else `too_long`. Literals are ASCII and were run; every
// Devanagari expectation is STRUCTURAL and computed through the same `Intl.Segmenter` (G13 — a conjunct's clusters depend on the
// runtime's ICU). The seeded sweep (l) holds N1–N5 over thousands of names (a 32-bit LCG — ⛔ `fast-check`, G18). The callers' source
// leg pins N4: ONE function, called by exactly the two text senders; it reads the TypeScript AST (as `scripts/*/lib.ts` do) — a
// comment-stripping regex is blinded by a string such as `'src/*.ts'` (the v1.6 code review, P-7).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DLT_TYPE_MAX_LENGTH, type DltSlot } from '@twt/channels';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { PEER_MESH_REQUEST_SMS_TEMPLATES } from '../src/scheduler/peer-mesh-sms-templates.js';
import { MEMBER_BOX_MAX, MEMBER_BOX_SLOTS, MEMBER_NAME_MAX } from '../src/scheduler/sms-member-boxes.js';
import { smsMemberName, type SmsMemberName } from '../src/scheduler/sms-member-name.js';
import { SUSPICION_NOTICE_SMS_TEMPLATES } from '../src/scheduler/suspicion-notice-sms-templates.js';

const codePoints = (s: string) => [...s].length;
const clusters = (s: string) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((g) => g.segment);
const EMPTY_NAME = '[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)';

/** The name and boxes of a `full` / `shortened` result — fails the leg on `too_long`. */
function sent(out: SmsMemberName): { kind: 'full' | 'shortened'; name: string; boxes: readonly [string, string] } {
  if (out.kind === 'too_long') throw new Error('expected a name, got too_long');
  return out;
}
const lastWord = (s: string) => s.split(' ').at(-1);

describe("smsMemberName — the whole name up to 60, the Panel's shortening above it, else too_long (AC1)", () => {
  it('(a) boundary — 60 code points ⇒ `full` byte-identical; 61 ⇒ `too_long`; a 60-code-point two-word name ⇒ `full`', () => {
    expect(sent(smsMemberName('a'.repeat(60)))).toMatchObject({ kind: 'full', name: 'a'.repeat(60) });
    expect(smsMemberName('a'.repeat(61))).toEqual({ kind: 'too_long' });
    const two = 'a'.repeat(30) + ' ' + 'b'.repeat(29);
    expect(codePoints(two)).toBe(60);
    expect(sent(smsMemberName(two))).toMatchObject({ kind: 'full', name: two });
  });

  it('(b) concatenation — the boxes join to the name; `full` is the input AS PASSED (internal double spaces kept)', () => {
    for (const input of ['Ramesh  Kumar', 'Ramesh Kumar Sharma', 'Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer']) {
      const out = sent(smsMemberName(input));
      expect(out.boxes[0] + out.boxes[1]).toBe(out.name);
    }
    expect(sent(smsMemberName('Ramesh  Kumar')).name).toBe('Ramesh  Kumar');
  });

  it("(c) box bounds — for EVERY length 2..60 (one word and two words) each box is 1..30 code points; n = 1 ⇒ [x, '']", () => {
    for (let n = 2; n <= 60; n++) {
      const names = ['a'.repeat(n)];
      if (n >= 3) names.push('a'.repeat(Math.floor((n - 1) / 2)) + ' ' + 'b'.repeat(n - 1 - Math.floor((n - 1) / 2)));
      for (const name of names) {
        const { boxes } = sent(smsMemberName(name));
        for (const box of boxes) {
          expect(codePoints(box)).toBeGreaterThanOrEqual(1);
          expect(codePoints(box)).toBeLessThanOrEqual(MEMBER_BOX_MAX);
        }
        expect(boxes[0] + boxes[1]).toBe(name);
      }
    }
    expect(sent(smsMemberName('x')).boxes).toEqual(['x', '']);
  });

  it('(d) the cut — near the middle, away from a space; the forced cut keeps the name WHOLE', () => {
    expect(sent(smsMemberName('Ramesh Kumar Sharma')).boxes).toEqual(['Ramesh Ku', 'mar Sharma']);
    expect(sent(smsMemberName('A'.repeat(20))).boxes).toEqual(['A'.repeat(10), 'A'.repeat(10)]);
    expect(sent(smsMemberName('A'.repeat(60))).boxes).toEqual(['A'.repeat(30), 'A'.repeat(30)]);
    // a space at the nearest-to-middle offsets (9 and 10 of 19) moves the cut to the nearest clean one (8 and 11 tie ⇒ 8)
    expect(sent(smsMemberName('Abcdefghi Bcdefghij')).boxes).toEqual(['Abcdefgh', 'i Bcdefghij']);
    // the forced cut — 60 code points, the only admissible offset (30) is beside the space: still `full`, box 1 ends in the space
    const forced = 'A'.repeat(29) + ' ' + 'B'.repeat(30);
    expect(sent(smsMemberName(forced))).toEqual({ kind: 'full', name: forced, boxes: ['A'.repeat(29) + ' ', 'B'.repeat(30)] });
  });

  it('(d) the forced cut INSIDE a cluster — a conjunct straddling offset 30 of a 60-code-point name: still `full`, 30 | 30 (computed)', () => {
    const name = 'a'.repeat(29) + 'क्ष' + 'b'.repeat(28);
    expect(codePoints(name)).toBe(60);
    // premise (computed through the segmenter): no cluster boundary at offset 30 on this runtime
    let at = 0;
    const bounds = clusters(name).map((g) => (at += codePoints(g)));
    expect(bounds).not.toContain(30);
    const out = sent(smsMemberName(name));
    expect(out.kind).toBe('full');
    expect(out.boxes.map(codePoints)).toEqual([30, 30]);
    expect(out.boxes[0] + out.boxes[1]).toBe(name);
    expect(out.boxes[1].startsWith('्')).toBe(true);
  });

  it("(e) the Panel's own example (65) ⇒ `shortened` \"K V Satya …\" (55), ⛔ full stops", () => {
    const out = sent(smsMemberName('Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer'));
    expect(out.kind).toBe('shortened');
    expect(out.name).toBe('K V Satya Narayana Murthy Subrahmanyam Swaminathan Iyer');
    expect(out.name).not.toContain('.');
  });

  it('(f) titles — above 60, a listed title in any case, with or without a full stop, is dropped (⛔ initials needed)', () => {
    const base = 'Abcdefghij '.repeat(4) + 'Lmnopqrstuvwx';
    expect(codePoints(base)).toBe(57);
    for (const title of ['Shri', 'SHRI', 'Dr.', 'Late', 'Mr.', 'स्व.', 'श्री']) {
      const name = `${title} ${base}`;
      expect(codePoints(name)).toBeGreaterThan(60);
      expect(smsMemberName(name)).toEqual({ kind: 'shortened', name: base, boxes: sent(smsMemberName(base)).boxes });
    }
  });

  // `-379` Q1 A (2), as ratified — typed from the decision, ⛔ read from the module, so a deleted or mis-keyed entry in `TITLES` is RED
  // (code review round 2, P1: seven of these were pinned by no test).
  const RATIFIED_TITLES = ['Shri', 'Sri', 'Smt', 'Shrimati', 'Sushri', 'Dr', 'Late', 'Mr', 'Mrs', 'Ms', 'Ji', 'श्री', 'श्रीमती', 'सुश्री', 'डॉ', 'स्व.', 'स्वर्गीय', 'जी'];

  it.each(RATIFIED_TITLES)(
    '(f) the ratified title %s is dropped above 60 — in front and in the middle, with or without its full stop, upper-cased where the script has case (⛔ initials needed)',
    (title) => {
      const words = ['Abcdefghij', 'Abcdefghij', 'Abcdefghij', 'Abcdefghij', 'Lmnopqrstuvwxy'];
      const base = words.join(' ');
      expect(codePoints(base)).toBe(58);
      const bare = title.replace(/\.$/, '');
      for (const form of [bare, `${bare}.`, bare.toUpperCase()]) {
        for (const name of [`${form} ${base}`, [...words.slice(0, 2), form, ...words.slice(2)].join(' ')]) {
          expect(codePoints(name)).toBeGreaterThan(60);
          expect(smsMemberName(name)).toEqual({ kind: 'shortened', name: base, boxes: sent(smsMemberName(base)).boxes });
        }
      }
    },
  );

  it('(f) Kumari / Devi / Kumar / Bai are ⛔ titles — early, they become INITIALS; Shrikant / Drake / Jiya are ⛔ titles', () => {
    expect(sent(smsMemberName('Kumari Devi Kumar Bai Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuvw')).name).toBe(
      'K D Kumar Bai Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuvw',
    );
    expect(sent(smsMemberName('Shrikant Drake Jiya Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuvw')).name).toBe(
      'S Drake Jiya Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuvw',
    );
  });

  it('(g) titles only above 60 — a ≤ 60 name keeps its title; a trailing Ji is dropped above 60 and the NEW last word is protected', () => {
    expect(sent(smsMemberName('Shri Ramesh Kumar Sharma Ji'))).toMatchObject({ kind: 'full', name: 'Shri Ramesh Kumar Sharma Ji' });
    const out = sent(smsMemberName('Abcdefghij '.repeat(5) + 'Lmnopq Ji'));
    expect(out).toMatchObject({ kind: 'shortened', name: 'A Abcdefghij Abcdefghij Abcdefghij Abcdefghij Lmnopq' });
  });

  it('(h) never the last word — a one-letter first word and a 61-letter last ⇒ `too_long`; titles only ⇒ `too_long`', () => {
    expect(smsMemberName('B ' + 'A'.repeat(61))).toEqual({ kind: 'too_long' });
    const titles = 'Shri Dr. Late Mr. Ji '.repeat(4).trim();
    expect(codePoints(titles)).toBeGreaterThan(60);
    expect(smsMemberName(titles)).toEqual({ kind: 'too_long' });
    expect(lastWord(sent(smsMemberName('Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer')).name)).toBe('Iyer');
    expect(lastWord(sent(smsMemberName('Abcdefghij '.repeat(5) + 'Lmnopq Ji')).name)).toBe('Lmnopq');
  });

  it('(i) first letter — "(Late)" ⇒ L; "K." ⇒ K (⛔ stop); a "-" word is left as is; an invisible first mark is skipped', () => {
    expect(sent(smsMemberName('(Late) ' + 'Abcdefghij '.repeat(4) + 'Lmnopqrstuv')).name).toBe(
      'L Abcdefghij Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuv',
    );
    expect(sent(smsMemberName('K. ' + 'Abcdefghij '.repeat(4) + 'Lmnopqrstuvwxyz')).name).toBe(
      'K A Abcdefghij Abcdefghij Abcdefghij Lmnopqrstuvwxyz',
    );
    expect(sent(smsMemberName('- ' + 'Abcdefghij '.repeat(5) + 'Lmnopqrstu')).name).toBe(
      '- A Abcdefghij Abcdefghij Abcdefghij Abcdefghij Lmnopqrstu',
    );
    const invisible = '​Abcdefghij';
    expect(clusters(invisible)[0]).toBe('​'); // premise: the mark is its own cluster on this runtime
    expect(sent(smsMemberName(`${invisible} ${'Bcdefghijk '.repeat(4)}Lmnopqrstuv`)).name).toBe(
      'A Bcdefghijk Bcdefghijk Bcdefghijk Bcdefghijk Lmnopqrstuv',
    );
  });

  it('(j) code points — an ASTRAL one-word name of 60 code points (120 UTF-16 units) ⇒ `full`; 61 ⇒ `too_long`', () => {
    const name = '𝐀'.repeat(60);
    expect(name.length).toBe(120);
    expect(sent(smsMemberName(name)).boxes.map(codePoints)).toEqual([30, 30]);
    expect(smsMemberName('𝐀'.repeat(61))).toEqual({ kind: 'too_long' });
  });

  it("(k) the guard — '', '   ' and 61 spaces ⇒ throw the fixed, name-free message", () => {
    for (const blank of ['', '   ', ' '.repeat(61)]) expect(() => smsMemberName(blank)).toThrow(EMPTY_NAME);
  });
});

// ── (l) a seeded sweep ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A 32-bit LCG (Numerical Recipes) — deterministic, ⛔ a dependency. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

const SWEEP_TITLES = ['Shri', 'SHRI', 'Sri', 'Smt', 'Smt.', 'Dr', 'Dr.', 'Late', 'LATE', 'Mr.', 'Mrs', 'Ji', 'श्री', 'स्व.', 'जी'];
/** Every title form the module drops — a generated plain word is re-drawn if it is one of them. */
const TITLE_FORMS = new Set(
  SWEEP_TITLES.map((t) => t.replace(/\.$/, '').toLowerCase()).concat(['ms', 'shrimati', 'sushri', 'श्रीमती', 'सुश्री', 'डॉ', 'स्वर्गीय']),
);
const DEVANAGARI = ['रमेश', 'शर्मा', 'श्रीवास्तव', 'सत्यनारायण', 'कुमार', 'क्षितिज'];

interface Word {
  readonly text: string;
  readonly title: boolean;
}

/** A name as the resolver delivers it — trimmed, single-spaced — mixing short / long Latin words, titles, initials and Devanagari. */
function sweepName(rand: () => number): Word[] {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const latin = (len: number) =>
    String.fromCharCode(65 + Math.floor(rand() * 26)) +
    Array.from({ length: len - 1 }, () => String.fromCharCode(97 + Math.floor(rand() * 26))).join('');
  const plain = (len: number) => {
    let w = latin(len);
    while (TITLE_FORMS.has(w.toLowerCase())) w = latin(len + 1);
    return { text: w, title: false };
  };
  const words: Word[] = [];
  const count = 1 + Math.floor(rand() * 11);
  for (let i = 0; i < count; i++) {
    const r = rand();
    if (r < 0.15) words.push({ text: pick(SWEEP_TITLES), title: true });
    else if (r < 0.25) words.push({ text: pick(DEVANAGARI), title: false });
    else if (r < 0.35) words.push({ text: latin(1) + (rand() < 0.5 ? '.' : ''), title: false });
    else words.push(plain(r < 0.65 ? 2 + Math.floor(rand() * 4) : 5 + Math.floor(rand() * 18)));
  }
  if (rand() < 0.2) words.push(plain(40 + Math.floor(rand() * 35)));
  return words;
}

/** The every-earlier-word-initialled form of the title-stripped words (the last word kept) — the shortest the rule can reach. */
const shortest = (kept: readonly string[]) =>
  kept.map((w, i) => (i === kept.length - 1 ? w : (clusters(w).find((g) => /[\p{L}\p{N}]/u.test(g)) ?? w))).join(' ');

describe('(l) a seeded sweep — N1–N5 over generated names', () => {
  it('holds concatenation, bounds, the cut, `full` iff ≤ 60, `shortened` ⇒ ≤ 60 with the last word kept, `too_long` ⇒ nothing reaches 60', () => {
    const rand = lcg(0x6375e);
    let full = 0;
    let shortened = 0;
    let tooLong = 0;
    for (let k = 0; k < 6000; k++) {
      const words = sweepName(rand);
      const input = words.map((w) => w.text).join(' ');
      const kept = words.filter((w) => !w.title).map((w) => w.text);
      const out = smsMemberName(input);
      if (out.kind === 'too_long') {
        tooLong++;
        expect(codePoints(input)).toBeGreaterThan(MEMBER_NAME_MAX);
        expect(kept.length === 0 || codePoints(shortest(kept)) > MEMBER_NAME_MAX).toBe(true);
        continue;
      }
      expect(out.boxes[0] + out.boxes[1]).toBe(out.name);
      for (const box of out.boxes) {
        // a box is empty ONLY for a one-code-point name (the one degenerate case — (c))
        expect(codePoints(box)).toBeGreaterThanOrEqual(codePoints(out.name) === 1 ? 0 : 1);
        expect(codePoints(box)).toBeLessThanOrEqual(MEMBER_BOX_MAX);
      }
      // the cut: where a clean cluster boundary exists in range, the cut is one of them and the nearest to the middle
      const cps = [...out.name];
      const n = cps.length;
      let at = 0;
      const bounds = new Set(clusters(out.name).map((g) => (at += codePoints(g))));
      const clean = (c: number) => bounds.has(c) && !/\s/u.test(cps[c - 1]!) && !/\s/u.test(cps[c]!);
      const cleanCuts: number[] = [];
      for (let c = Math.max(1, n - MEMBER_BOX_MAX); c <= Math.min(MEMBER_BOX_MAX, n - 1); c++) if (clean(c)) cleanCuts.push(c);
      const cut = codePoints(out.boxes[0]);
      if (cleanCuts.length > 0) {
        expect(cleanCuts).toContain(cut);
        expect(Math.min(...cleanCuts.map((c) => Math.abs(2 * c - n)))).toBe(Math.abs(2 * cut - n));
      }
      if (codePoints(input) <= MEMBER_NAME_MAX) {
        full++;
        expect(out).toMatchObject({ kind: 'full', name: input });
      } else {
        shortened++;
        expect(out.kind).toBe('shortened');
        expect(codePoints(out.name)).toBeLessThanOrEqual(MEMBER_NAME_MAX);
        expect(lastWord(out.name)).toBe(kept.at(-1));
        expect(out.name.split(' ')).toHaveLength(kept.length);
      }
    }
    // the sweep reaches every outcome
    expect(Math.min(full, shortened, tooLong)).toBeGreaterThan(100);
  });
});

// ── (m) the shared limit ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Whether every slot list's first two slots ARE the shared box slots (by reference). */
const sharesBoxSlots = (slotLists: readonly (readonly DltSlot[])[]) =>
  slotLists.length > 0 && slotLists.every((slots) => slots[0] === MEMBER_BOX_SLOTS[0] && slots[1] === MEMBER_BOX_SLOTS[1]);

describe('(m) the two boxes are ONE pair of slots, shared by both registries', () => {
  const real = [
    ...Object.values(SUSPICION_NOTICE_SMS_TEMPLATES).flatMap((byLocale) => Object.values(byLocale).map((e) => e.slots)),
    ...Object.values(PEER_MESH_REQUEST_SMS_TEMPLATES).map((e) => e.slots),
  ];

  it('the box slots are alphanumeric at MEMBER_BOX_MAX (≤ the alphanumeric ceiling); MEMBER_NAME_MAX is two boxes', () => {
    expect(MEMBER_BOX_SLOTS.map((s) => [s.name, s.type, s.maxLength])).toEqual([
      ['member1', 'alphanumeric', MEMBER_BOX_MAX],
      ['member2', 'alphanumeric', MEMBER_BOX_MAX],
    ]);
    expect(MEMBER_BOX_MAX).toBeLessThanOrEqual(DLT_TYPE_MAX_LENGTH.alphanumeric);
    expect(MEMBER_NAME_MAX).toBe(2 * MEMBER_BOX_MAX);
  });

  it('all eight registered texts (6 suspicion + 2 neighbours) begin with the SAME two slot objects', () => {
    expect(real).toHaveLength(8);
    expect(sharesBoxSlots(real)).toBe(true);
  });

  it('⭐ positive control — a planted DIFFERENT slot object IS caught by the same check', () => {
    const planted: DltSlot = { ...MEMBER_BOX_SLOTS[0] };
    expect(sharesBoxSlots([...real, [planted, MEMBER_BOX_SLOTS[1]]])).toBe(false);
  });
});

// ── The callers' source leg (N4) ───────────────────────────────────────────────────────────────────────────────────────────

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE = /\.(?:ts|tsx|mts|cts|js|mjs)$/;
const MODULE = 'apps/jobs/src/scheduler/sms-member-name.ts';
const BOXES = 'apps/jobs/src/scheduler/sms-member-boxes.ts';

/**
 * The ONLY files whose code calls or imports the one function — the two claim-text senders and (Story 5.8b, `-414` Q2 A) the
 * cycle-open producer, for the degraded-mode bridge's text. Story 5.8b replaced: EXACTLY the two claim-text senders.
 */
const CALLERS = [
  'apps/jobs/src/scheduler/claim-peer-mesh-requests.ts',
  'apps/jobs/src/scheduler/claim-suspicion-notices.ts',
  'apps/jobs/src/scheduler/contribution-notify-triggers.ts',
];

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
  /** `fitsDltAlphanumeric` (the retired 40-letter predicate) as an identifier in any position: called, declared, imported / exported, aliased, destructured or a member. */
  readonly fitsPredicate: boolean;
  /** A string literal holding the title list (`shrimati`). */
  readonly titleList: boolean;
  /** The identifier `MEMBER_NAME_MAX`. */
  readonly nameMax: boolean;
}

const factsCache = new Map<string, CodeFacts>();
function codeFacts(src: string): CodeFacts {
  const cached = factsCache.get(src);
  if (cached !== undefined) return cached;
  let importsModule = false;
  let callsModule = false;
  let fitsPredicate = false;
  let titleList = false;
  let nameMax = false;
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
    }
    // the retired predicate's name in ANY identifier position — a call, a declaration, an import or export (either side of an `as`), a destructured
    // binding, a class or object member; a comment is trivia and a string is ONE literal (code review round 3, P11)
    if (ts.isIdentifier(n) && n.text === 'fitsDltAlphanumeric') fitsPredicate = true;
    if (ts.isStringLiteralLike(n) && n.text.includes('shrimati')) titleList = true;
    if (ts.isIdentifier(n) && n.text === 'MEMBER_NAME_MAX') nameMax = true;
    ts.forEachChild(n, visit);
  };
  visit(ts.createSourceFile('probe.ts', src, ts.ScriptTarget.Latest, true));
  const facts: CodeFacts = { importsModule, callsModule, fitsPredicate, titleList, nameMax };
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

describe('N4 — ONE function for the texts that name the deceased, called by exactly the two claim-text senders and the bridge producer (AC1 source leg; 5.8b)', () => {
  const tree = new Map<string, string>();
  walk('apps/jobs/src', tree);

  it('the module and the boxes file are in the walk (a rename fails) and the callers are EXACTLY the three (5.8b replaced "the two senders")', () => {
    expect(tree.has(MODULE)).toBe(true);
    expect(tree.has(BOXES)).toBe(true);
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

  it('⭐ positive controls — a call AFTER a string that a comment-stripping regex would take for a comment IS caught', () => {
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

  it('⛔ a second fit, title list or name ceiling: `fitsDltAlphanumeric` nowhere; the title list only in the module; MEMBER_NAME_MAX only in the boxes file and the module', () => {
    expect(filesWhere(tree, (c) => c.fitsPredicate)).toEqual([]);
    expect(filesWhere(tree, (c) => c.titleList)).toEqual([MODULE]);
    expect(filesWhere(tree, (c) => c.nameMax)).toEqual([BOXES, MODULE].sort());
  });

  it('⭐ positive controls — a resurrected `fitsDltAlphanumeric`, a second title list and a second MEMBER_NAME_MAX reader ARE caught', () => {
    const planted = new Map(tree);
    planted.set(
      'apps/jobs/src/other/tenth.ts',
      "export function fitsDltAlphanumeric(v: string) { return v.length <= 40; }\nexport const t = 'dr shrimati ji';\nexport const m = MEMBER_NAME_MAX;\n",
    );
    expect(filesWhere(planted, (c) => c.fitsPredicate)).toEqual(['apps/jobs/src/other/tenth.ts']);
    expect(filesWhere(planted, (c) => c.titleList)).toEqual([MODULE, 'apps/jobs/src/other/tenth.ts'].sort());
    expect(filesWhere(planted, (c) => c.nameMax)).toEqual([BOXES, MODULE, 'apps/jobs/src/other/tenth.ts'].sort());
    const commented = new Map(tree);
    commented.set('apps/jobs/src/other/thirteenth.ts', '// fitsDltAlphanumeric(n) — shrimati — MEMBER_NAME_MAX\nexport {};\n');
    expect(filesWhere(commented, (c) => c.fitsPredicate || c.nameMax)).toEqual([BOXES, MODULE].sort());
    expect(filesWhere(commented, (c) => c.titleList)).toEqual([MODULE]);
    // declared in a form other than a `function` — nothing calls it, so only the declaration shows it (code review round 2, P6)
    const declared = new Map(tree);
    declared.set('apps/jobs/src/other/fourteenth.ts', 'export const fitsDltAlphanumeric = (v: string) => v.length <= 40;\n');
    declared.set('apps/jobs/src/other/fifteenth.ts', 'const f = (v: string) => v.length <= 40;\nexport { f as fitsDltAlphanumeric };\n');
    expect(filesWhere(declared, (c) => c.fitsPredicate)).toEqual(['apps/jobs/src/other/fifteenth.ts', 'apps/jobs/src/other/fourteenth.ts']);
    // the name in ANY identifier position — an alias on either side, a destructured binding, a class or an object member (code review round 3, P11);
    // a string that only NAMES it is one literal and stays ⛔ a hit
    const named = new Map(tree);
    const forms: Record<string, string> = {
      sixteenth: "export { fitsDltAlphanumeric as fits } from '../x';\n",
      seventeenth: "import { fitsDltAlphanumeric as fit } from '../x';\nexport const y = fit('a');\n",
      eighteenth: 'declare const deps: Record<string, unknown>;\nconst { fitsDltAlphanumeric } = deps;\nexport {};\n',
      nineteenth: 'export class K { fitsDltAlphanumeric(v: string) { return v.length <= 40; } }\n',
      twentieth: 'export const o = { fitsDltAlphanumeric: (v: string) => v.length <= 40 };\n',
    };
    for (const [name, src] of Object.entries(forms)) named.set(`apps/jobs/src/other/${name}.ts`, src);
    named.set('apps/jobs/src/other/only-a-string.ts', 'export const s = "fitsDltAlphanumeric(n)";\n');
    expect(filesWhere(named, (c) => c.fitsPredicate)).toEqual(Object.keys(forms).map((n) => `apps/jobs/src/other/${n}.ts`).sort());
  });
});
