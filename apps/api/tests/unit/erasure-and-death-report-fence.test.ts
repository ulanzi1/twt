// Story 6.38 (AC11; N1, DL1, DL15, TR1; `2026-10-30-423` Q1 (a) / (b)) — the erasure ACT and the ONE definition of "a death is
// reported and stands", fenced in code. Scans `apps/api/src`, `apps/jobs/src` and `packages/domain/src`, comments stripped.
//
//   · DL15 — ⛔ erasure outside the two reviewed handlers (`rtbf/handlers.ts`, `member-data-rights/handlers.ts`), each of which
//     reads the ONE legality (`resolveRtbfLegality`, or `assertAnonymizable` which wraps it) BEFORE it erases. The fence pins
//     the ACT, ⛔ only the function name: `anonymizeMember(` is called ONLY there; `'member.rtbf_anonymized'` is emitted as an
//     `eventType` ONLY there (the reducer accepts it from EVERY live state, so an emitter elsewhere bypasses the death lock
//     entirely); `ANONYMIZED_SENTINEL` / its literal is WRITTEN only in `member/anonymize.ts` (comparisons and aliases allowed).
//     ⛔ Out of reach, said plainly: SQL in migrations or operator scripts — reviewed by hand. Any FUTURE deferred / scheduled
//     erasure decides legality at EXECUTION, after `acquireErasureLocks` (`member/rtbf-legality.ts` header).
//   · N1 — the gate SQL (`f.kind = 'member_found_innocent'` inside a `NOT EXISTS`) appears ONLY in `claim/death-report.ts`,
//     plus a NAMED allow-list of read-only copies (`approval-warnings.ts` × 3, `peer-mesh-read.ts` × 1).
//   · TR1 — `claim/death-report.ts` imports ONLY `drizzle-orm`, `../db.js`, `../ids/index.js` (a leaf; `member/` imports it).
// ⭐ POSITIVE CONTROLS: each scan is a pure function over `{ file: source }`, run once on the tree and once with a planted
// violation that MUST be caught.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');
const TREES = ['apps/api/src', 'apps/jobs/src', 'packages/domain/src'] as const;

const RTBF = 'apps/api/src/modules/rtbf/handlers.ts';
const DATA_RIGHTS = 'apps/api/src/modules/member-data-rights/handlers.ts';
const ANONYMIZE = 'packages/domain/src/member/anonymize.ts';
const DEATH_REPORT = 'packages/domain/src/claim/death-report.ts';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (name.endsWith('.ts')) out.push(path.relative(repoRoot, full).split(path.sep).join('/'));
  }
  return out;
}
type Tree = Readonly<Record<string, string>>;
function loadTree(): Tree {
  const tree: Record<string, string> = {};
  for (const f of TREES.flatMap((t) => sourceFiles(path.join(repoRoot, t)))) {
    tree[f] = stripComments(readFileSync(path.join(repoRoot, f), 'utf-8'));
  }
  return tree;
}

// ── the scans (pure) ────────────────────────────────────────────────────────────────────────────────────────────────

/** Every file that CALLS `anonymizeMember(` (⛔ the definition). */
function anonymizeCallers(tree: Tree): string[] {
  return Object.keys(tree).filter((f) => /\banonymizeMember\(/.test(tree[f]!.replace(/export async function anonymizeMember\(/g, ''))).sort();
}

/** In `file`, does the legality guard precede EVERY `anonymizeMember(` inside the same named method? */
function guardedBeforeErasure(src: string): boolean {
  const calls = [...src.matchAll(/\banonymizeMember\(/g)].map((m) => m.index!);
  if (calls.length === 0) return false;
  const methods = [...src.matchAll(/^\s*async\s+(\w+)\s*\(/gm)].map((m) => m.index!);
  return calls.every((at) => {
    const start = Math.max(-1, ...methods.filter((m) => m < at));
    const body = src.slice(Math.max(start, 0), at);
    return start >= 0 && /\b(resolveRtbfLegality|assertAnonymizable)\(/.test(body);
  });
}

/** Every file that EMITS `member.rtbf_anonymized` as an event type. */
function rtbfEmitters(tree: Tree): string[] {
  return Object.keys(tree).filter((f) => /eventType\s*:\s*['"]member\.rtbf_anonymized['"]/.test(tree[f]!)).sort();
}

/** Every file naming the event type at all — allowed: the two emitters, the reducer, the event registry. */
function rtbfNamers(tree: Tree): string[] {
  return Object.keys(tree).filter((f) => /['"]member\.rtbf_anonymized['"]/.test(tree[f]!)).sort();
}

/** Every file that uses the sentinel OTHER than to compare with it, alias it or import it — i.e. could WRITE it. */
function sentinelWriters(tree: Tree): string[] {
  const allowedUse = [
    /(===|!==)\s*(?:memberDomain\.)?ANONYMIZED_SENTINEL\b/g,
    /\bANONYMIZED_SENTINEL\s*(===|!==)/g,
    /const\s+\w+\s*=\s*memberDomain\.ANONYMIZED_SENTINEL\s*;/g,
    /import\s*\{[^}]*\bANONYMIZED_SENTINEL\b[^}]*\}\s*from/g,
  ];
  return Object.keys(tree)
    .filter((f) => f !== ANONYMIZE)
    .filter((f) => {
      let src = tree[f]!;
      for (const re of allowedUse) src = src.replace(re, '');
      return /\bANONYMIZED_SENTINEL\b/.test(src) || /['"]\[anonymized\]['"]/.test(src);
    })
    .sort();
}

/** Every file × count of the gate SQL — `f.kind = 'member_found_innocent'` inside a `NOT EXISTS (`. */
function gateSqlCopies(tree: Tree): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [f, src] of Object.entries(tree)) {
    const n = [...src.matchAll(/NOT\s+EXISTS\s*\([\s\S]{0,400}?f\.kind\s*=\s*'member_found_innocent'/g)].length;
    if (n > 0) out[f] = n;
  }
  return out;
}

/** The import specifiers of one file. */
function importsOf(src: string): string[] {
  return [...src.matchAll(/^\s*import\s[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]!).sort();
}

// ── the fences ──────────────────────────────────────────────────────────────────────────────────────────────────────

describe('Story 6.38 — the erasure act and the one death-report predicate (source fences)', () => {
  const tree = loadTree();

  it('the scan reached real source', () => {
    for (const f of [RTBF, DATA_RIGHTS, ANONYMIZE, DEATH_REPORT]) expect(tree[f]?.length ?? 0, f).toBeGreaterThan(0);
  });

  it('DL15 — `anonymizeMember(` is called by EXACTLY the two reviewed handlers, each after its legality read', () => {
    expect(anonymizeCallers(tree)).toEqual([DATA_RIGHTS, RTBF].sort());
    expect(guardedBeforeErasure(tree[RTBF]!), RTBF).toBe(true);
    expect(guardedBeforeErasure(tree[DATA_RIGHTS]!), DATA_RIGHTS).toBe(true);
  });

  it('⭐ DL15 positive control — a planted third caller (a job) is caught, and an unguarded erasure is caught', () => {
    const planted = { ...tree, 'apps/jobs/src/planted-erasure.ts': 'export async function run() { await memberDomain.anonymizeMember(tx, enc, { memberId, pariwarId }); }' };
    expect(anonymizeCallers(planted)).toContain('apps/jobs/src/planted-erasure.ts');
    expect(guardedBeforeErasure('    async sweep(x) {\n      await memberDomain.anonymizeMember(tx, enc, ids);\n    }')).toBe(false);
  });

  it('DL15 — `member.rtbf_anonymized` is EMITTED only by the two handlers; named only there, in the reducer and the registry', () => {
    expect(rtbfEmitters(tree)).toEqual([DATA_RIGHTS, RTBF].sort());
    expect(rtbfNamers(tree)).toEqual(
      [DATA_RIGHTS, RTBF, 'packages/domain/src/member/events.ts', 'packages/domain/src/member/state.ts'].sort(),
    );
  });

  it('⭐ DL15 positive control — a planted emitter in a sweep is caught', () => {
    const planted = { ...tree, 'apps/jobs/src/planted-sweep.ts': "await projectMemberState(c, { memberId, pariwarId, eventType: 'member.rtbf_anonymized', payload, actorId: null });" };
    expect(rtbfEmitters(planted)).toContain('apps/jobs/src/planted-sweep.ts');
  });

  it('DL15 — the sentinel is WRITTEN only in `member/anonymize.ts` (comparisons, aliases and imports elsewhere are reads)', () => {
    expect(sentinelWriters(tree)).toEqual([]);
  });

  it('⭐ DL15 positive control — a planted sentinel WRITE (the constant or its literal) is caught; a comparison is ⛔', () => {
    const write = { ...tree, 'apps/jobs/src/planted-scrub.ts': 'await tx.update(members).set({ nameCiphertext: memberDomain.ANONYMIZED_SENTINEL });' };
    const literal = { ...tree, 'apps/jobs/src/planted-literal.ts': "await tx.update(members).set({ nameCiphertext: '[anonymized]' });" };
    const read = { ...tree, 'apps/jobs/src/planted-read.ts': 'if (stored === memberDomain.ANONYMIZED_SENTINEL) return null;' };
    expect(sentinelWriters(write)).toEqual(['apps/jobs/src/planted-scrub.ts']);
    expect(sentinelWriters(literal)).toEqual(['apps/jobs/src/planted-literal.ts']);
    expect(sentinelWriters(read)).toEqual([]);
  });

  it('N1 — the gate SQL is defined ONLY in `death-report.ts`, with the named read-only copies', () => {
    expect(gateSqlCopies(tree)).toEqual({
      [DEATH_REPORT]: 1,
      'packages/domain/src/claim/approval-warnings.ts': 3,
      'packages/domain/src/claim/peer-mesh-read.ts': 1,
    });
  });

  it('⭐ N1 positive control — a planted second definition is caught', () => {
    const planted = {
      ...tree,
      'packages/domain/src/member/planted-lock.ts':
        "sql`SELECT EXISTS (SELECT 1 FROM claims c WHERE NOT EXISTS ( SELECT 1 FROM claim_nominee_findings f WHERE f.kind = 'member_found_innocent'))`",
    };
    expect(gateSqlCopies(planted)['packages/domain/src/member/planted-lock.ts']).toBe(1);
  });

  it('TR1 — `death-report.ts` is a LEAF: it imports only drizzle-orm, ../db.js and ../ids/index.js', () => {
    expect(importsOf(tree[DEATH_REPORT]!)).toEqual(['../db.js', '../ids/index.js', 'drizzle-orm'].sort());
  });

  it('⭐ TR1 positive control — a planted `claim/` import is caught', () => {
    expect(importsOf(`${tree[DEATH_REPORT]!}\nimport { projectClaimState } from './project.js';`)).toContain('./project.js');
  });
});
