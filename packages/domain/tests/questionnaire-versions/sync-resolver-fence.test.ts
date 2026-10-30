// Story 6.33 (QE12 R6; I6; AC4) — the SYNC resolver fence: ⛔ non-test code outside `questionnaire-versions/` and the code
// registry's own module calls `resolveLiveVersion(` / `getQuestionnaireVersion(` — every consumer reads through the ONE
// database-aware reader, so a chain version is ⛔ invisible to a consumer that kept the old call. Review RT5 — the same for a
// DIRECT read of `QUESTIONNAIRE_REGISTRY` (the code versions the sync resolver walks): outside its named readers it would
// resolve "the version in force" around the reader and stay green. Plus the word fence: ⛔
// non-test code resolves a questionnaire item's words with `t(…copyKey…)` outside THE ONE word function (QE4).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
// Review RV23 — the mobile app renders questions too (it must read the SERVER's words, ⛔ resolve a copy key itself).
const ROOTS = [
  'apps/api/src',
  'apps/jobs/src',
  'apps/admin/src',
  'apps/mobile/app',
  'apps/mobile/components',
  'apps/mobile/lib',
  'packages/domain/src',
  'packages/api-client/src',
  'packages/contracts/src',
];
const WORDS_FILE = 'apps/api/src/modules/claims/questionnaire-words.ts';
/**
 * A `t(…)` call (also `i18n.t(…)`) whose argument is a questionnaire ITEM's copy key — `q`, `o`, `opt`, `option`, `question`,
 * `item`, `def`, `choice`, `answer`, with or without optional chaining. ⚠ A TRIPWIRE, ⛔ a proof: an indirection (`const { copyKey } = q;
 * t(copyKey)`) evades it, and a name outside the list does — the legitimate `t(template.copyKey)` / `t(render.copyKey)` of the SMS
 * templates and the noticeboard must NOT match, which is why the list is of item names, ⛔ any `copyKey`.
 */
const ITEM_WORD_RE = /\b(?:\w+\.)?t\(\s*(?:q|o|opt|option|question|item|def|choice|answer)\??\.copyKey\b/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'tests', 'ios', 'android', 'Pods', '.expo']);

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full, { throwIfNoEntry: false });
    if (st === undefined) continue;
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$|\.spec\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}
const files = ROOTS.flatMap((r) => walk(path.join(repo, r), []));
const rel = (f: string) => path.relative(repo, f);

describe('R6 — the sync resolver is called ONLY by the reader and the code registry', () => {
  it('⛔ resolveLiveVersion( / getQuestionnaireVersion( elsewhere', () => {
    const allowed = (f: string) =>
      f.startsWith('packages/domain/src/questionnaire-versions/') || f === 'packages/domain/src/questionnaires/registry.ts';
    const hits = files
      .filter((f) => !allowed(rel(f)))
      .filter((f) => /\b(resolveLiveVersion|getQuestionnaireVersion)\(/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(hits).toEqual([]);
  });
  it('the scan has teeth: the reader itself calls both', () => {
    const reader = readFileSync(path.join(repo, 'packages/domain/src/questionnaire-versions/read.ts'), 'utf8');
    expect(reader).toMatch(/resolveLiveVersion\(/);
    expect(reader).toMatch(/getQuestionnaireVersion\(/);
    // every root contributes files — a renamed / moved root must fail loudly, ⛔ shrink the scan silently
    for (const r of ROOTS) expect(walk(path.join(repo, r), []).length, r).toBeGreaterThan(0);
  });
});

/**
 * Review RT5 — the code registry's readers, each for a reason that is ⛔ "the version in force": the code module itself
 * (`questionnaires/` — the registry, the validator, `newestCodeVersion`), THE reader (`questionnaire-versions/`), the ground
 * inspection's pin read (it passes the registry INTO `readQuestionnaireDefinition`), and the editor's handlers (the catalogue
 * of code versions and a code version's detail — QE16).
 */
const REGISTRY_READERS = (f: string): boolean =>
  f.startsWith('packages/domain/src/questionnaires/') ||
  f.startsWith('packages/domain/src/questionnaire-versions/') ||
  f === 'packages/domain/src/claim/ground-inspection-questionnaire.ts' ||
  f === 'apps/api/src/modules/questionnaire-versions/handlers.ts';
const REGISTRY_RE = /\bQUESTIONNAIRE_REGISTRY\b/;

describe('R6 (review RT5) — ⛔ a direct read of QUESTIONNAIRE_REGISTRY outside its named readers', () => {
  it('⛔ QUESTIONNAIRE_REGISTRY elsewhere', () => {
    const hits = files
      .filter((f) => !REGISTRY_READERS(rel(f)))
      .filter((f) => REGISTRY_RE.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(hits).toEqual([]);
  });
  it('the registry scan has TEETH: it matches the bypass it is for, the reader is a reader, and every allow-listed file exists', () => {
    expect(REGISTRY_RE.test("questionnaires.QUESTIONNAIRE_REGISTRY.filter((d) => d.kind === 'peer_mesh').at(-1)")).toBe(true);
    expect(REGISTRY_RE.test('const MY_QUESTIONNAIRE_REGISTRY_COPY = []')).toBe(false);
    expect(readFileSync(path.join(repo, 'packages/domain/src/questionnaire-versions/read.ts'), 'utf8')).toMatch(REGISTRY_RE);
    for (const f of ['packages/domain/src/claim/ground-inspection-questionnaire.ts', 'apps/api/src/modules/questionnaire-versions/handlers.ts']) {
      expect(files.map(rel), f).toContain(f);
    }
    // review round 4 (RF4) — the ALLOW-LIST refuses: a consumer anywhere else (each root's kind) is ⛔ a named reader
    for (const outside of [
      'apps/jobs/src/boot.ts',
      'apps/api/src/modules/claims/peer-request-core.ts',
      'apps/admin/src/modules/questionnaire-versions/QuestionnaireVersionsPage.tsx',
      'apps/mobile/components/peer-request/PeerQuestionnaire.tsx',
      'packages/domain/src/claim/peer-mesh-reply.ts',
      'packages/api-client/src/index.ts',
    ]) {
      expect(REGISTRY_READERS(outside), outside).toBe(false);
      expect(files.map(rel), outside).toContain(outside);
    }
  });
});

describe('QE4 — ONE word function for a questionnaire item', () => {
  it('⛔ t(<item>.copyKey) — q / o / opt / option / question / item / def / choice / answer, also i18n.t( and ?. — outside questionnaire-words.ts', () => {
    const hits = files
      .filter((f) => rel(f) !== WORDS_FILE)
      .filter((f) => ITEM_WORD_RE.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(hits).toEqual([]);
  });
  it('the word scan has TEETH: the regex matches the forms it is meant to catch, the word function itself, and ⛔ the legitimate non-questionnaire copy keys', () => {
    for (const bad of ['t(q.copyKey, { member })', 't( o.copyKey)', 'i18n.t(opt?.copyKey)', 't(item.copyKey)', 'x.t(def.copyKey, p)', 't(answer?.copyKey)']) {
      expect(ITEM_WORD_RE.test(bad), bad).toBe(true);
    }
    for (const ok of ['t(template.copyKey, vars)', 't(render.copyKey)', 't(copyKey, undefined, NS)', 'format(q.copyKey)', 'const t = q.copyKey']) {
      expect(ITEM_WORD_RE.test(ok), ok).toBe(false);
    }
    // the ONE word function does resolve an item's words this way — so a SECOND copy of it would be caught
    expect(ITEM_WORD_RE.test(readFileSync(path.join(repo, WORDS_FILE), 'utf8'))).toBe(true);
  });
});
