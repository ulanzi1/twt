// scripts/member-state-invariant/lib.ts
//
// Pure scanner for the Story 3.1 AC2 invariant: `members.state` is a replay-derived
// cache and may be written ONLY by the event-replay projector
// (packages/domain/src/member/project.ts). Any OTHER code path that writes the `state`
// column of the `members` table is an architectural violation (it would let the cache
// diverge from the event-sourced source of truth).
//
// FLAGGED write forms (AST-detected → a `.limit(` substring in a comment/string never
// matches, mirror domain-accessor-invariants):
//   · `db.update(members).set({ state: ... })`                     — canonical UPDATE
//   · `db.insert(members)…onConflictDoUpdate({ set: { state: … } })` — upsert UPDATE
//   · `members.state = …`                                           — direct assignment
//
// This is the STATIC authoring-time guard (AC2). The DB trigger (migration 0018, AC3)
// is the independent RUNTIME guard that also catches raw SQL. Both are required — they
// are different layers (Story 3.1 Dev Notes "The load-bearing invariant").

import * as ts from 'typescript';

export interface MemberStateWriteFinding {
  file: string;
  line: number;
  detail: string;
}

const MEMBERS_TABLE = 'members';
const STATE_COLUMN = 'state';

/** Does an object literal carry a `state` property (assignment or shorthand)? */
function objectHasStateKey(arg: ts.Expression): boolean {
  if (!ts.isObjectLiteralExpression(arg)) return false;
  return arg.properties.some((p) => {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const name = p.name;
      if (ts.isIdentifier(name)) return name.text === STATE_COLUMN;
      if (ts.isStringLiteral(name)) return name.text === STATE_COLUMN;
    }
    return false;
  });
}

/**
 * Walk a method/property chain LEFTWARD from `node`, returning true if it contains a
 * `.update(members)` or `.insert(members)` call (the table operation that, combined
 * with a `state` write below it, targets the members.state cache).
 */
function chainTargetsMembers(node: ts.Node): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && ts.isIdentifier(a) && a.text === MEMBERS_TABLE) return true;
        }
        cur = callee.expression;
        continue;
      }
      cur = cur.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return false;
}

/** The `set` property of an `onConflictDoUpdate({ set: {...} })` argument, if any. */
function onConflictSetObject(arg: ts.Expression): ts.Expression | undefined {
  if (!ts.isObjectLiteralExpression(arg)) return undefined;
  for (const p of arg.properties) {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'set') {
      return p.initializer;
    }
  }
  return undefined;
}

/** Scan one TypeScript source for `members.state` writes. */
export function scanMemberStateWrites(file: string, source: string): MemberStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: MemberStateWriteFinding[] = [];

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const chainRoot = node.expression.expression;

      // `.update(members).set({ state })`
      if (
        method === 'set' &&
        node.arguments.length === 1 &&
        objectHasStateKey(node.arguments[0]!) &&
        chainTargetsMembers(chainRoot)
      ) {
        push(node, '.update(members).set({ state }) — UPDATE to the members.state cache');
      }

      // `.insert(members)…onConflictDoUpdate({ set: { state } })`
      if (method === 'onConflictDoUpdate' && node.arguments.length === 1) {
        const setObj = onConflictSetObject(node.arguments[0]!);
        if (setObj && objectHasStateKey(setObj) && chainTargetsMembers(chainRoot)) {
          push(node, '.insert(members)…onConflictDoUpdate({ set: { state } }) — upsert of members.state');
        }
      }
    }

    // `members.state = …`
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === STATE_COLUMN &&
      ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === MEMBERS_TABLE
    ) {
      push(node, 'members.state = … — direct assignment to the members.state cache');
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: MemberStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `members.state is a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/member/project.ts) may write it (Story 3.1 AC2). Route the ` +
    `state change through projectMemberState(...) instead.`
  );
}
