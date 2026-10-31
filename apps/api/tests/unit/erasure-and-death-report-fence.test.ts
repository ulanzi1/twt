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
//   · DL3 / N3 (code review rounds 2 and 3) — in each of those two handlers, `acquireErasureLocks(` precedes EVERY
//     `resolveRtbfLegality(` read inside its own function, and no other advisory lock is taken before it; and no advisory lock in
//     the data-rights handlers is built by hand (a hand-built key could disagree with the erasure's for the same member). The
//     race spec (`packages/domain/tests/integration/member/erasure-intake-race.spec.ts`) proves the HELPER; THIS pins, textually,
//     that the HANDLERS call it — reverting either to the old rtbf-key-only lock turns it red.
//   · N1 — the gate SQL (`f.kind = 'member_found_innocent'` inside a `NOT EXISTS`) appears ONLY in `claim/death-report.ts`,
//     plus a NAMED allow-list of read-only copies (`approval-warnings.ts` × 3, `peer-mesh-read.ts` × 1). Because that
//     structural match names one spelling (an alias, a `LEFT JOIN … IS NULL`, a Drizzle `notExists` all escape it), the
//     LITERAL `'member_found_innocent'` (any quote, and the `CLAIM_NOMINEE_FINDING_KINDS` tuple) is pinned too: it may be named
//     only by the files on a named list. ⚠ Wider, ⛔ proof — a kind reached through some other constant still escapes it.
//   · TR1 — `claim/death-report.ts` imports ONLY `drizzle-orm`, `../db.js`, `../ids/index.js` (a leaf; `member/` imports it).
// ⭐ POSITIVE CONTROLS: each scan is a pure function over `{ file: source }`, run once on the tree and once with a planted
// violation that MUST be caught — including the evasions the plain scan would miss (an alias, a destructured import, a
// side-effect import, another spelling of the gate).
// ⚠ WHAT THESE ARE, said plainly: TEXTUAL TRIPWIRES over comment-stripped source. A form a regex does not name can slip past one
// (a function-start it does not list; a constant reached through another file). The LIVE proofs are the forced-interleave probes in
// `rtbf.spec.ts` and `member-data-rights/delivery-and-correction.spec.ts` — they fail if a handler does not actually take the lock.

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

/**
 * Every file that NAMES `anonymizeMember` at all (comments are already stripped; the definition's own `export async function`
 * line counts) — ⛔ only the calls: `const { anonymizeMember: a } = memberDomain; a(…)`, `.call(…)` or passing it as a callback
 * never spell `anonymizeMember(` yet reach the same act.
 */
function anonymizeNamers(tree: Tree): string[] {
  return Object.keys(tree).filter((f) => /\banonymizeMember\b/.test(tree[f]!)).sort();
}

/**
 * The function-START forms this scan can see (round 3 widened the list): `async name(` / `async function name(` / `async (` at the
 * start of a line, with any modifiers (`export`, `default`, `public`, `private`, `protected`, `static`); a function-valued
 * `const|let|var x = (async)? function (…)` or `= (async)? (…) =>`; an object property `name: async (…)` / `name: async function`;
 * and an inline `async (…) =>` callback. A parenthesised EXPRESSION (`const x = (a + b)`) is deliberately not one.
 * ⚠ A form NOT on this list is attributed to the nearest preceding one that is — so the scan can FALSE-PASS on it. That is the
 * edge of what a regex can see; the live probes are the proof.
 */
const FUNCTION_STARTS: readonly RegExp[] = [
  /^[ \t]*(?:(?:export|default|public|private|protected|static)\s+)*async\s+(?:function\s*\*?\s*)?\w*\s*\(/gm,
  /\b(?:const|let|var)\s+\w+\s*(?::[^=;]+)?=\s*(?:async\s*)?(?:function\b[^(]*\([^)]*\)|\([^)]*\)\s*(?::[^={]+)?=>)/g,
  /\b\w+\s*:\s*async\s*(?:function\b[^(]*)?\(/g,
  /\basync\s*\([^)]*\)\s*(?::[^={]+)?=>/g,
];

/** The start of the function that encloses offset `at` — the nearest preceding `FUNCTION_STARTS` match — or -1. */
function enclosingFunctionStart(src: string, at: number): number {
  const starts = FUNCTION_STARTS.flatMap((re) => [...src.matchAll(re)].map((m) => m.index!));
  return Math.max(-1, ...starts.filter((s) => s < at));
}

/**
 * Does `acquireErasureLocks(` precede EVERY `resolveRtbfLegality(` read inside the read's own function — with ⛔ other advisory
 * lock (`pg_advisory_xact_lock`, either key function) taken before it? (DL3 / N3: intake key FIRST, then the rtbf key, ONE order.)
 * ⚠ TEXTUAL: it shows the lock call is there and first, ⛔ that it is awaited on the live path (a dead branch, a missing `await`),
 * and it recognises only the function-start forms in `FUNCTION_STARTS` — a form not on the list can FALSE-PASS. It fails CLOSED
 * only when the read has no recognised function before it, or the recognised one holds no lock call. The live proof is the
 * forced-interleave probes; this is the cheap tripwire that fires first.
 */
function locksBeforeLegality(src: string): boolean {
  const reads = [...src.matchAll(/\bresolveRtbfLegality\(/g)].map((m) => m.index!);
  if (reads.length === 0) return false;
  return reads.every((at) => {
    const start = enclosingFunctionStart(src, at);
    if (start < 0) return false;
    const body = src.slice(start, at);
    const lock = body.search(/\bacquireErasureLocks\(/);
    return lock >= 0 && !/pg_advisory_xact_lock|rtbfAdvisoryLockKey\(|intakeAdvisoryLockKey\(/.test(body.slice(0, lock));
  });
}

/**
 * Every advisory-LOCK function spelling (round 5): the transaction and session forms, `try_`, `_shared`. Round 4 counted only
 * `pg_advisory_xact_lock(`, so a `pg_advisory_lock(hashtext($1))` (the session form — `member-auth.service.ts` uses one) was in
 * NEITHER count. `pg_advisory_unlock` is ⛔ a lock.
 */
const ADVISORY_LOCK_FN = String.raw`pg_(?:try_)?advisory_(?:xact_)?lock(?:_shared)?`;

/**
 * How many advisory-lock calls in `src` are PARSED but ⛔ keyed the data-rights way (below)? A hand-built key (an inline hash, a
 * `hashtext`) could disagree with the erasure's for the same member — the class round 2's lock-key patch closed for the key
 * FUNCTIONS; this pins that the call SITES keep using them.
 */
function handBuiltAdvisoryLocks(src: string): number {
  return parsedAdvisoryLocks(src).filter((keyed) => !keyed).length;
}

/**
 * How many advisory-lock calls in `src` the scan PARSED and found keyed. ⚠ Code review round 4: a call the pattern cannot parse
 * (an object-form `query({ text, values })`, a params array past 240 characters) is in NEITHER count — so the fence asserts THIS
 * equals `advisoryLockCalls`, ⛔ only that the hand-built count is 0.
 */
function keyedAdvisoryLocks(src: string): number {
  return parsedAdvisoryLocks(src).filter((keyed) => keyed).length;
}

/**
 * Each `query(text, […])` advisory-lock call the pattern parses: is it keyed the data-rights way? Round 5 — BOTH must hold:
 * the SQL argument is a bare `$n` (⛔ `hashtext($1)` around a key-function param, which locks a DIFFERENT key), and the params
 * array is built by `rtbfAdvisoryLockKey(` (⛔ `intakeAdvisoryLockKey(`: a grant keyed by the intake key would invert the one
 * order, intake → rtbf, against the erasure).
 */
function parsedAdvisoryLocks(src: string): boolean[] {
  // the lock call with ONE level of nested parentheses in its SQL argument, then the params array of the `query(text, […])`.
  const call = new RegExp(String.raw`${ADVISORY_LOCK_FN}\(((?:[^()]|\([^()]*\))*)\)['"` + '`' + String.raw`]?\s*,\s*\[([\s\S]{0,240}?)\]\s*\)`, 'g');
  return [...src.matchAll(call)].map((m) => /^\s*\$\d+\s*$/.test(m[1]!) && /\brtbfAdvisoryLockKey\(/.test(m[2]!));
}

/** How many advisory-lock calls (any spelling) `src` makes at all — so the scan above cannot pass by matching nothing. */
function advisoryLockCalls(src: string): number {
  return [...src.matchAll(new RegExp(String.raw`${ADVISORY_LOCK_FN}\(`, 'g'))].length;
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

/**
 * Every file that uses the sentinel OTHER than to compare with it, alias it or import it — i.e. could WRITE it. ⭐ An alias is
 * FOLLOWED: `const S = memberDomain.ANONYMIZED_SENTINEL;` and `import { ANONYMIZED_SENTINEL as S }` — the alias's own name is held
 * to the same rule, so a write through `S` is caught (two real files alias it today, only to compare). ⭐ An EXPORTED alias
 * (`export const S = …`, `export { ANONYMIZED_SENTINEL }`) counts as a writer outright: it carries the sentinel to a file this
 * scan never sees naming it.
 */
function sentinelWriters(tree: Tree): string[] {
  const alias = /\bconst\s+(\w+)\s*=\s*memberDomain\.ANONYMIZED_SENTINEL\s*;/g;
  const comparisons = (name: string) => [
    new RegExp(`(===|!==)\\s*(?:memberDomain\\.)?${name}\\b`, 'g'),
    new RegExp(`\\b${name}\\s*(===|!==)`, 'g'),
  ];
  return Object.keys(tree)
    .filter((f) => f !== ANONYMIZE)
    .filter((f) => {
      let src = tree[f]!;
      if (
        /\bexport\s+(?:const|let|var)\s+\w+\s*=\s*(?:memberDomain\.)?ANONYMIZED_SENTINEL\b/.test(src) ||
        /\bexport\s*\{[^}]*\bANONYMIZED_SENTINEL\b/.test(src)
      ) {
        return true;
      }
      const names = new Set(['ANONYMIZED_SENTINEL', ...[...src.matchAll(alias)].map((m) => m[1]!)]);
      for (const clause of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
        for (const part of clause[1]!.split(',')) {
          const renamed = part.trim().match(/^ANONYMIZED_SENTINEL\s+as\s+(\w+)$/);
          if (renamed) names.add(renamed[1]!);
        }
      }
      src = src.replace(alias, '').replace(/import\s*\{[^}]*\bANONYMIZED_SENTINEL\b[^}]*\}\s*from/g, '');
      for (const name of names) for (const re of comparisons(name)) src = src.replace(re, '');
      return [...names].some((name) => new RegExp(`\\b${name}\\b`).test(src)) || /['"]\[anonymized\]['"]/.test(src);
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

/**
 * Every file naming the finding kind — as a string literal in ANY quote (`'` `"` or a backtick), or through the schema's
 * `CLAIM_NOMINEE_FINDING_KINDS` tuple. The gate cannot be restated under another SPELLING (another alias, a `LEFT JOIN … IS NULL`,
 * a Drizzle `eq(…)` + `notExists`) without naming the kind, so this is the wider companion of `gateSqlCopies`. ⚠ Wider, ⛔ proof:
 * a kind reached through some OTHER constant, or assembled from parts, still escapes it.
 */
function findingKindLiteralFiles(tree: Tree): string[] {
  return Object.keys(tree)
    .filter((f) => /['"`]member_found_innocent['"`]|\bCLAIM_NOMINEE_FINDING_KINDS\b/.test(tree[f]!))
    .sort();
}

/**
 * The module specifiers one file pulls in — static imports (default / named / namespace / `type`), the side-effect form
 * `import './x.js'`, `export … from`, dynamic `import()` and `require()`. A de-duplicated, sorted set. ⭐ The clause between
 * `import` and `from` may hold no quote and no `;`, so a side-effect import can never be swallowed into the next statement.
 */
function importsOf(src: string): string[] {
  const specs = new Set<string>();
  const patterns = [
    /^[ \t]*(?:import|export)\s+(?:type\s+)?[^'";]*?\sfrom\s+['"]([^'"]+)['"]/gm,
    /^[ \t]*import\s+['"]([^'"]+)['"]/gm,
    /\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /\brequire\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) specs.add(m[1]!);
  return [...specs].sort();
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

  it('DL15 — `anonymizeMember` is NAMED (not only called) by exactly its definition and the two reviewed handlers', () => {
    expect(anonymizeNamers(tree)).toEqual([ANONYMIZE, DATA_RIGHTS, RTBF].sort());
  });

  it('⭐ DL15 positive control — an ALIASED / destructured / callback use is named, so caught, though it never spells `anonymizeMember(`', () => {
    const destructured = { ...tree, 'apps/jobs/src/planted-alias.ts': 'const { anonymizeMember: erase } = memberDomain;\nawait erase(tx, enc, ids);' };
    const callback = { ...tree, 'apps/jobs/src/planted-callback.ts': 'await Promise.all(ids.map(memberDomain.anonymizeMember.bind(null, tx, enc)));' };
    expect(anonymizeCallers(destructured)).not.toContain('apps/jobs/src/planted-alias.ts'); // ← the old scan's blind spot
    expect(anonymizeNamers(destructured)).toContain('apps/jobs/src/planted-alias.ts');
    expect(anonymizeNamers(callback)).toContain('apps/jobs/src/planted-callback.ts');
  });

  it('DL3 / N3 — in BOTH reviewed handlers `acquireErasureLocks(` precedes every legality read, with ⛔ other advisory lock before it', () => {
    expect(locksBeforeLegality(tree[RTBF]!), RTBF).toBe(true);
    expect(locksBeforeLegality(tree[DATA_RIGHTS]!), DATA_RIGHTS).toBe(true);
  });

  it('⭐ DL3 / N3 positive control — the OLD rtbf-key-only lock, a lock AFTER the read, and a stray lock BEFORE it are each caught; the right shapes pass', () => {
    const oldLock =
      "    async fulfilErasure(request) {\n      await c.query('SELECT pg_advisory_xact_lock($1)', [memberDomain.rtbfAdvisoryLockKey(p, m).toString()]);\n      const legality = await memberDomain.resolveRtbfLegality(tx, p, m, state);\n    }";
    const lockAfterRead =
      '    async fulfilErasure(request) {\n      const legality = await memberDomain.resolveRtbfLegality(tx, p, m, state);\n      await memberDomain.acquireErasureLocks(c, p, m);\n    }';
    const strayLockFirst =
      "    async fulfilErasure(request) {\n      await c.query('SELECT pg_advisory_xact_lock($1)', [otherKey]);\n      await memberDomain.acquireErasureLocks(c, p, m);\n      const legality = await memberDomain.resolveRtbfLegality(tx, p, m, state);\n    }";
    const inMethod =
      '    async fulfilErasure(request) {\n      await memberDomain.acquireErasureLocks(c, p, m);\n      const legality = await memberDomain.resolveRtbfLegality(tx, p, m, state);\n    }';
    const inHelper =
      '  async function assertAnonymizable(scopeTx) {\n    await memberDomain.acquireErasureLocks(scopeTx.client, p, m);\n    const legality = await memberDomain.resolveRtbfLegality(scopeTx.tx, p, m, state);\n  }';
    expect(locksBeforeLegality(oldLock)).toBe(false);
    expect(locksBeforeLegality(lockAfterRead)).toBe(false);
    expect(locksBeforeLegality(strayLockFirst)).toBe(false);
    expect(locksBeforeLegality('export const x = 1;')).toBe(false); // no legality read at all ⇒ nothing to pin ⇒ fail closed
    expect(locksBeforeLegality(inMethod)).toBe(true);
    expect(locksBeforeLegality(inHelper)).toBe(true);
  });

  it('⭐ DL3 / N3 positive control (round 3) — a read in a form the first version could not see (arrow, `private async`, `export default async function`, an inline `async (…) =>`) after a locked method is now caught', () => {
    const locked =
      '  async locked(r) {\n    await memberDomain.acquireErasureLocks(c, p, m);\n    await memberDomain.resolveRtbfLegality(tx, p, m, s);\n  }\n';
    const read = 'await memberDomain.resolveRtbfLegality(tx, p, m, s);';
    expect(locksBeforeLegality(locked)).toBe(true); // control: the locked method alone passes
    const planted = {
      arrow: `${locked}  const later = async (r) => {\n    ${read}\n  };`,
      privateAsync: `${locked}  private async sweep(r) {\n    ${read}\n  }`,
      defaultExport: `${locked}  export default async function run(r) {\n    ${read}\n  }`,
      inlineCallback: `${locked}  async other(r) {\n    await run(async (tx) => {\n      ${read}\n    });\n  }`,
    };
    for (const [form, src] of Object.entries(planted)) expect(locksBeforeLegality(src), form).toBe(false);
  });

  it('DL3 / N3 (round 3) — every advisory lock the data-rights handlers take is built by `rtbfAdvisoryLockKey(`, ⛔ by hand', () => {
    expect(advisoryLockCalls(tree[DATA_RIGHTS]!)).toBe(3); // two grant paths + the redeem path
    // Round 4: EVERY call parsed AND keyed — a call the pattern cannot parse (object form) would otherwise pass unseen.
    expect(keyedAdvisoryLocks(tree[DATA_RIGHTS]!)).toBe(advisoryLockCalls(tree[DATA_RIGHTS]!));
    expect(handBuiltAdvisoryLocks(tree[DATA_RIGHTS]!)).toBe(0);
    // The member's own erasure route takes its locks ONLY through `acquireErasureLocks` (the order test above): ⛔ raw call.
    expect(advisoryLockCalls(tree[RTBF]!)).toBe(0);
  });

  it('⭐ (round 4) positive control — an OBJECT-FORM lock call escapes the parse, and the equality above catches it', () => {
    const proper = "await c.query('SELECT pg_advisory_xact_lock($1)', [memberDomain.rtbfAdvisoryLockKey(p, m).toString()]);";
    const objectForm = "await c.query({ text: 'SELECT pg_advisory_xact_lock($1)', values: [handKey] });";
    const src = `${proper}\n${objectForm}`;
    expect(handBuiltAdvisoryLocks(src)).toBe(0); // the old assertion alone passes…
    expect(advisoryLockCalls(src)).toBe(2); // …both calls are SEEN…
    expect(keyedAdvisoryLocks(src)).toBe(1); // …only the proper one is parsed and keyed, so the equality fails (round 5: pinned)
  });

  it('⭐ (round 5) positive controls — a key-function param under `hashtext`, the INTAKE key, and a session-form lock are caught', () => {
    const wrapped = "await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [memberDomain.rtbfAdvisoryLockKey(p, m).toString()]);";
    const intakeKeyed = "await c.query('SELECT pg_advisory_xact_lock($1)', [claimDomain.intakeAdvisoryLockKey(p, m).toString()]);";
    const sessionHand = "await c.query('SELECT pg_advisory_lock(hashtext($1)::bigint)', [body.member_id]);";
    const tryForm = "await c.query('SELECT pg_try_advisory_xact_lock($1)', [memberDomain.rtbfAdvisoryLockKey(p, m).toString()]);";
    expect(handBuiltAdvisoryLocks(wrapped)).toBe(1);
    expect(handBuiltAdvisoryLocks(intakeKeyed)).toBe(1);
    expect(advisoryLockCalls(sessionHand)).toBe(1); // round 4 counted 0
    expect(handBuiltAdvisoryLocks(sessionHand)).toBe(1);
    expect(advisoryLockCalls(tryForm)).toBe(1);
    expect(keyedAdvisoryLocks(tryForm)).toBe(1);
    expect(advisoryLockCalls("await c.query('SELECT pg_advisory_unlock($1)', [k]);")).toBe(0); // an unlock is ⛔ a lock
  });

  it('⭐ DL3 / N3 positive control (round 3) — a HAND-BUILT key (an inline hash; `hashtext`) is caught; the key function is not', () => {
    const inlineHash =
      "await c.query('SELECT pg_advisory_xact_lock($1)', [BigInt('0x' + createHash('sha256').update(`member.rtbf:${p}:${m}`).digest('hex').slice(0, 15)).toString()]);";
    const hashtext = "await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [body.member_id]);";
    const proper = "await c.query('SELECT pg_advisory_xact_lock($1)', [memberDomain.rtbfAdvisoryLockKey(p, body.member_id).toString()]);";
    expect(handBuiltAdvisoryLocks(inlineHash)).toBe(1);
    expect(handBuiltAdvisoryLocks(hashtext)).toBe(1);
    expect(handBuiltAdvisoryLocks(proper)).toBe(0);
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

  it('⭐ DL15 positive control — a WRITE through an ALIAS of the sentinel is caught; comparing through the alias is a read', () => {
    const aliasWrite = {
      ...tree,
      'apps/jobs/src/planted-alias-scrub.ts':
        'const S = memberDomain.ANONYMIZED_SENTINEL;\nawait tx.update(members).set({ nameCiphertext: S });',
    };
    const aliasRead = {
      ...tree,
      'apps/jobs/src/planted-alias-read.ts': 'const S = memberDomain.ANONYMIZED_SENTINEL;\nif (stored === S) return null;',
    };
    expect(sentinelWriters(aliasWrite)).toEqual(['apps/jobs/src/planted-alias-scrub.ts']);
    expect(sentinelWriters(aliasRead)).toEqual([]);
  });

  it('⭐ DL15 positive control (round 3) — a write through an IMPORT alias is caught, and an EXPORTED alias is flagged outright', () => {
    const importAliasWrite = {
      ...tree,
      'apps/jobs/src/planted-import-alias.ts':
        "import { ANONYMIZED_SENTINEL as GONE } from '@twt/domain';\nawait tx.update(members).set({ nameCiphertext: GONE });",
    };
    const importAliasRead = {
      ...tree,
      'apps/jobs/src/planted-import-alias-read.ts': "import { ANONYMIZED_SENTINEL as GONE } from '@twt/domain';\nif (stored === GONE) return null;",
    };
    const exported = { ...tree, 'apps/api/src/planted-export.ts': 'export const SENTINEL = memberDomain.ANONYMIZED_SENTINEL;' };
    expect(sentinelWriters(importAliasWrite)).toEqual(['apps/jobs/src/planted-import-alias.ts']);
    expect(sentinelWriters(importAliasRead)).toEqual([]);
    expect(sentinelWriters(exported)).toEqual(['apps/api/src/planted-export.ts']);
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

  it('N1 — the finding kind is named as a LITERAL only by the gate, its two read-only copies, the writer and the schema', () => {
    expect(findingKindLiteralFiles(tree)).toEqual(
      [
        DEATH_REPORT,
        'packages/domain/src/claim/approval-warnings.ts', // read-only copy × 3
        'packages/domain/src/claim/peer-mesh-read.ts', // read-only copy × 1
        'packages/domain/src/claim/nominee-lock.ts', // `recordMemberInnocenceFinding` — the WRITER (an insert, ⛔ a gate)
        'packages/domain/src/schema/claim_nominee_findings.ts', // the kind enum + its partial unique index
      ].sort(),
    );
  });

  it('⭐ N1 positive control — a second definition under ANOTHER spelling (LEFT JOIN … IS NULL; a Drizzle eq) escapes the structural scan but ⛔ the literal one', () => {
    const leftJoin = {
      ...tree,
      'packages/domain/src/member/planted-leftjoin.ts':
        "sql`SELECT 1 FROM claims c LEFT JOIN claim_nominee_findings x ON x.claim_case_id = c.claim_case_id AND x.kind = 'member_found_innocent' WHERE x.claim_case_id IS NULL`",
    };
    const drizzle = {
      ...tree,
      'packages/domain/src/member/planted-drizzle.ts': "const released = and(eq(claimNomineeFindings.kind, 'member_found_innocent'), notExists(sub));",
    };
    for (const planted of [leftJoin, drizzle]) {
      expect(Object.keys(gateSqlCopies(planted))).not.toContain('packages/domain/src/member/planted-leftjoin.ts'); // ← the old scan's blind spot
      expect(Object.keys(gateSqlCopies(planted))).not.toContain('packages/domain/src/member/planted-drizzle.ts');
    }
    expect(findingKindLiteralFiles(leftJoin)).toContain('packages/domain/src/member/planted-leftjoin.ts');
    expect(findingKindLiteralFiles(drizzle)).toContain('packages/domain/src/member/planted-drizzle.ts');
  });

  it('⭐ N1 positive control (round 3) — a BACKTICK literal and the finding-kind TUPLE are named too', () => {
    const backtick = { ...tree, 'packages/domain/src/member/planted-backtick.ts': 'const kind = `member_found_innocent`;' };
    const tuple = { ...tree, 'packages/domain/src/member/planted-tuple.ts': 'const kind = CLAIM_NOMINEE_FINDING_KINDS[0];' };
    expect(findingKindLiteralFiles(backtick)).toContain('packages/domain/src/member/planted-backtick.ts');
    expect(findingKindLiteralFiles(tuple)).toContain('packages/domain/src/member/planted-tuple.ts');
  });

  it('TR1 — `death-report.ts` is a LEAF: it imports only drizzle-orm, ../db.js and ../ids/index.js', () => {
    expect(importsOf(tree[DEATH_REPORT]!)).toEqual(['../db.js', '../ids/index.js', 'drizzle-orm'].sort());
  });

  it('⭐ TR1 positive control — a planted `claim/` import is caught', () => {
    expect(importsOf(`${tree[DEATH_REPORT]!}\nimport { projectClaimState } from './project.js';`)).toContain('./project.js');
  });

  it('⭐ TR1 positive control — every OTHER way to pull a module in is seen: side-effect, `export … from`, dynamic import, require', () => {
    // The old matcher let a side-effect `import './a.js';` be swallowed into the NEXT statement's match, hiding './a.js'.
    expect(importsOf("import './a.js';\nimport { x } from './b.js';")).toEqual(['./a.js', './b.js']);
    expect(importsOf("export * from './c.js';\nexport { y } from './d.js';")).toEqual(['./c.js', './d.js']);
    expect(importsOf("const m = await import('./e.js');")).toEqual(['./e.js']);
    expect(importsOf('const m = await import(`./h.js`);')).toEqual(['./h.js']); // a template-literal specifier (round 3)
    expect(importsOf("const m = require('./f.js');")).toEqual(['./f.js']);
    expect(importsOf("import type { T } from './g.js';\nimport { U } from './g.js';")).toEqual(['./g.js']); // a de-duplicated set
    expect(importsOf('export const x = 1;\nexport function f() {}')).toEqual([]); // no `from` ⇒ no module
  });
});
