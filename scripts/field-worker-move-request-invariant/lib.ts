// scripts/field-worker-move-request-invariant/lib.ts
//
// Pure scanner for Story 13.1d's AD2 invariant: `field_worker_move_requests` is the projection of each request's own event stream and is
// written ONLY by its projector (packages/domain/src/field-worker/move-request-project.ts: `projectMoveRequestOpened` /
// `projectMoveRequestTransition`). Any other writer lets the row diverge from the stream.
//
// ⭐ Unlike the drizzle-only `*-state-invariant` scanners, the request projector writes in RAW SQL — so a drizzle-only scan would pass
// vacuously ([[feedback_gate_scope_semantic_coverage]]). FLAGGED, each with its enclosing function:
//   (a) a string or template literal that INSERTs into or UPDATEs `field_worker_move_requests` (any case, quoted or not);
//   (b) a string or template literal naming the writer setting `app.field_worker_move_request_writer` (the trigger's key — setting it is
//       how a raw write gets past 0205's guard);
//   (c) a drizzle `.insert(fieldWorkerMoveRequests)` / `.update(fieldWorkerMoveRequests)` (bare, namespaced or wrapped).
// ⚠ What it cannot see: SQL assembled from fragments across variables, a dynamic table name, and roots outside the scanned ones. The
// DB trigger (0205) is the independent RUNTIME guard; both are required.

import * as ts from 'typescript';

export interface MoveRequestWriteFinding {
  file: string;
  line: number;
  detail: string;
  enclosingFunction: string | undefined;
}

export interface AllowlistEntry {
  file: string;
  functions: ReadonlySet<string>;
}

const TABLE = 'fieldWorkerMoveRequests';
const RAW_WRITE = /\b(insert\s+into|update)\s+(?:"?public"?\.)?"?field_worker_move_requests"?(?![a-z_])/i;
const WRITER_SETTING = /app\.field_worker_move_request_writer/;

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression(e)) {
      e = e.expression;
    } else {
      return e;
    }
  }
}

/** True for `fieldWorkerMoveRequests` or `<ns>.fieldWorkerMoveRequests`, under any wrapper. */
function isTable(expr: ts.Expression): boolean {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return e.text === TABLE;
  if (ts.isPropertyAccessExpression(e)) return e.name.text === TABLE;
  return false;
}

function enclosingFunctionName(node: ts.Node): string | undefined {
  for (let n: ts.Node | undefined = node.parent; n !== undefined; n = n.parent) {
    if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) return n.name?.getText() ?? '<anonymous>';
    if (ts.isFunctionExpression(n) || ts.isArrowFunction(n)) {
      const p = n.parent;
      if (p !== undefined && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
      return '<anonymous>';
    }
  }
  return undefined;
}

/** The literal text of a string / template node (a template's static parts joined), or null. */
function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  return null;
}

export function scanMoveRequestWrites(file: string, source: string): MoveRequestWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings: MoveRequestWriteFinding[] = [];
  const add = (node: ts.Node, detail: string): void => {
    findings.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, detail, enclosingFunction: enclosingFunctionName(node) });
  };
  const visit = (node: ts.Node): void => {
    const text = literalText(node);
    if (text !== null) {
      if (RAW_WRITE.test(text)) add(node, 'raw SQL write to field_worker_move_requests');
      if (WRITER_SETTING.test(text)) add(node, 'the app.field_worker_move_request_writer setting');
      if (ts.isTemplateExpression(node)) {
        node.templateSpans.forEach((s) => visit(s.expression));
        return;
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const arg = node.arguments[0];
      if ((method === 'insert' || method === 'update') && arg !== undefined && isTable(arg)) add(node, `drizzle .${method}(${TABLE})`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

export function isAllowlistedWrite(f: MoveRequestWriteFinding, allowlist: readonly AllowlistEntry[]): boolean {
  return allowlist.some((a) => a.file === f.file && f.enclosingFunction !== undefined && a.functions.has(f.enclosingFunction));
}

export function formatFinding(f: MoveRequestWriteFinding): string {
  return `${f.file}:${String(f.line)} — ${f.detail} (in ${f.enclosingFunction ?? '<top level>'})`;
}
