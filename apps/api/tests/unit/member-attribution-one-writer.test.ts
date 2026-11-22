// Story 3.15 (AC5; N6, DL6) — ONE writer of `member_attribution`: the signup `assisted` step's handler is the only `apps/api/src`
// file that names `insertMemberAttribution` (as an identifier — TypeScript AST, so a comment never counts). The 3.6b payment
// confirm stopped capturing; a second caller would make two writers of one `UNIQUE(member_id)` row.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SRC = path.join(repoRoot, 'apps/api/src');
const WRITER = 'insertMemberAttribution';
const THE_ONE = 'apps/api/src/modules/member-attribution/handlers.ts';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mts)$/.test(name)) out.push(p);
  }
  return out;
}

function namesWriter(file: string): boolean {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let hit = false;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === WRITER) hit = true;
    else if (ts.isStringLiteralLike(node) && node.text === WRITER) hit = true;
    if (!hit) ts.forEachChild(node, visit);
  };
  visit(sf);
  return hit;
}

describe('Story 3.15 — one writer of member_attribution in apps/api (AC5)', () => {
  it(`only ${THE_ONE} names ${WRITER}`, () => {
    const files = walk(SRC)
      .filter(namesWriter)
      .map((f) => path.relative(repoRoot, f).split(path.sep).join('/'));
    expect(files).toEqual([THE_ONE]);
  });

  it('CONTROL — the scan sees an identifier and ignores a comment', () => {
    const tmp = (text: string): boolean => {
      const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true);
      let hit = false;
      const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && node.text === WRITER) hit = true;
        ts.forEachChild(node, visit);
      };
      visit(sf);
      return hit;
    };
    expect(tmp(`await payment.${WRITER}(tx, input);`)).toBe(true);
    expect(tmp(`// payment.${WRITER} is the writer`)).toBe(false);
  });
});
