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
//   (c) a drizzle `.insert(fieldWorkerMoveRequests)` / `.update(fieldWorkerMoveRequests)` (bare, namespaced, wrapped, bound to a
//       name - `const t = fieldWorkerMoveRequests`, `t = ...`, an import alias, a destructured one - held in an object property or an array,
//       or read by `schema['fieldWorkerMoveRequests']`), called as `db.update`, `db['update']`, `db.update!` or a destructured `update`
//       (code review RP-8).
// The raw verbs are `INSERT INTO`, `UPDATE [ONLY]`, `MERGE INTO` and `COPY`, with the table quoted, qualified by ANY schema (spaces around the
// dot allowed; a schema put in by a substitution reads as a bare dot) or behind a block or a `--` line comment; a template whose substitution
// IS the table (`sql\`UPDATE ${fieldWorkerMoveRequests} ...\``), holds its SQL name (`const T = 'field_worker_move_requests'`, `const U = T`,
// `{ t: '...' }` read as `N.t`) or is a call given it (`sql.identifier('...')`, `sql.raw('...')`) reads as the table, and a `+` chain of
// literals in one expression is read joined (code review R4-6, R5-2). ANY call given the SQL name and bound to a name (`pgTable(...)`,
// `sql.identifier(...)`) is the table, and so is an element of `const [t] = [fieldWorkerMoveRequests]` (every element, if the literal spreads).
// No whitespace is needed before a quote or a comment (`UPDATE"t"`, `UPDATE/**/t`); up to two qualifiers, quoted or bare (R5-1). DELETE and TRUNCATE are
// deliberately NOT flagged: 0205's triggers refuse both for every role (code review CR32); a `COPY ... TO` (a read) is flagged - fail closed.
// ⚠ What it cannot see: SQL assembled from fragments across variables (a `let` built up, a helper returning a fragment), a table name
// computed at run time, a SQL-name constant IMPORTED from another module (the aliases are per file), nested or assignment destructuring, a write method reached by `.call` / `.apply` / `.bind` or a computed name, a table passed through a function's
// parameter, `sql.raw` / `sql.identifier` given a name built at run time, a symlinked directory, `.sql` files, and code outside the scanned
// roots (check.ts). The DB trigger (0205) is the independent RUNTIME guard; both are required.

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
const SQL_NAME = 'field_worker_move_requests';
// A comment whose body cannot run past its own `*/` (an UNAMBIGUOUS body - a lazy `[\s\S]*?` let a run of comments split many ways and
// backtracked exponentially; code review R5-1), or a `--` line comment.
const COMMENT = String.raw`(?:\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|--[^\n]*(?:\n|$))`;
// Between tokens: whitespace or comments, one item a step (linear); or nothing before a quote or a comment (`UPDATE"t"`, `UPDATE/**/t`).
const GAP = String.raw`(?:(?:\s|${COMMENT})+|(?="|\/\*|--))`;
// Up to two qualifiers (`schema.`, `db.schema.`), quoted (`"my-schema"`, `""` inside) or bare - or a bare dot, a substitution's gap.
const QUALIFIER = String.raw`(?:(?:(?:"(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)\s*)?\.\s*){0,2}`;
// ⛔ followed by a dot: `field_worker_move_requests.id` names a COLUMN of the table (a `-- copy` comment before it in a read is not a write).
const RAW_WRITE = new RegExp(
  String.raw`\b(?:insert\s+into|update|merge\s+into|copy)${GAP}(?:only${GAP})?${QUALIFIER}"?field_worker_move_requests"?(?![a-z0-9_$])(?!\s*\.)`,
  'i',
);
/** A string that IS the table's SQL name, quoted or qualified or not - held in a constant, it reads as the table in a substitution (R4-6). */
const SQL_NAME_ONLY = /^\s*(?:"?[a-z_][a-z0-9_$]*"?\s*\.\s*)?"?field_worker_move_requests"?\s*$/i;
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

/**
 * What a file binds to the table: plain NAMES (an import alias, `const t = ` / `t = `, a destructured one), the PROPERTY names an object
 * literal or an assignment gives it (`{ t: fieldWorkerMoveRequests }`, `holder.t = ...`, read as `x.t`, `x['t']` or `const { t } = x`) and
 * the ARRAYS that hold it (`[fieldWorkerMoveRequests]`, read as `a[0]`).
 */
interface Aliases {
  names: Set<string>;
  props: Set<string>;
  arrays: Set<string>;
  /** Names bound to a string that IS the SQL name (`const T = 'field_worker_move_requests'`, `const U = T`, `T = '...'`). */
  sqlNames: Set<string>;
  /** Property names given that string (`{ t: 'field_worker_move_requests' }`, read as `N.t`). */
  sqlProps: Set<string>;
}

const stringKey = (e: ts.Expression): string | undefined => {
  const a = unwrap(e);
  return ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a) ? a.text : undefined;
};

/** True for `fieldWorkerMoveRequests`, `<ns>.fieldWorkerMoveRequests`, `<ns>['fieldWorkerMoveRequests']` or what is bound to it, under any wrapper. */
function isTable(expr: ts.Expression, aliases: Aliases): boolean {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return e.text === TABLE || aliases.names.has(e.text);
  if (ts.isPropertyAccessExpression(e)) return e.name.text === TABLE || aliases.props.has(e.name.text);
  if (ts.isElementAccessExpression(e)) {
    const key = stringKey(e.argumentExpression);
    if (key !== undefined && (key === TABLE || aliases.props.has(key))) return true;
    const base = unwrap(e.expression);
    return ts.isIdentifier(base) && aliases.arrays.has(base.text);
  }
  return false;
}

/** The node's parent past any wrapper (`[t] as const`, `(t)`, `t!`). */
function outerParent(node: ts.Node): ts.Node | undefined {
  let p = node.parent;
  while (p !== undefined && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isTypeAssertionExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p))) p = p.parent;
  return p;
}

/**
 * What a file binds to the table (`Aliases`). File-wide, not scope-aware: an over-approximation that fails CLOSED. Iterated to a fixpoint, so an
 * alias of an alias declared later in the text is found (code review CR32 - the module's own idiom is `const t = fieldWorkerMoveRequests`).
 * Assignments, object-literal properties and arrays are alias sources too (code review RP-8).
 */
function collectAliases(sf: ts.SourceFile): Aliases {
  const aliases: Aliases = { names: new Set<string>(), props: new Set<string>(), arrays: new Set<string>(), sqlNames: new Set<string>(), sqlProps: new Set<string>() };
  let grew = true;
  const add = (set: Set<string>, name: string): void => {
    if (!set.has(name)) {
      set.add(name);
      grew = true;
    }
  };
  const walk = (node: ts.Node): void => {
    if (ts.isImportSpecifier(node) && (node.propertyName ?? node.name).text === TABLE) add(aliases.names, node.name.text);
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const init = unwrap(node.initializer);
      if (ts.isIdentifier(node.name) && isTable(node.initializer, aliases)) add(aliases.names, node.name.text);
      // `const x = pgTable('field_worker_move_requests', ...)` - a second drizzle table over the same SQL name (R4-6).
      if (ts.isIdentifier(node.name) && ts.isCallExpression(init) && init.arguments[0] !== undefined && stringKey(init.arguments[0]) === SQL_NAME) add(aliases.names, node.name.text);
      // `const T = 'field_worker_move_requests'` - the SQL name in a constant, read as the table in a substitution (R4-6) - and `const U = T`
      // (R5-2: transitive, through the fixpoint).
      if (ts.isIdentifier(node.name) && holdsSqlName(node.initializer, aliases)) add(aliases.sqlNames, node.name.text);
      // `const [t] = [fieldWorkerMoveRequests]` (positional) and `const [t] = held` for an array that holds it (every element - fail closed).
      if (ts.isArrayBindingPattern(node.name)) {
        // A spread in the literal shifts the positions: then every element is the table if any is (fail closed; R5-2).
        const spread = ts.isArrayLiteralExpression(init) && init.elements.some((e) => ts.isSpreadElement(e));
        const anyHeld = ts.isArrayLiteralExpression(init) && init.elements.some((e) => !ts.isSpreadElement(e) && isTable(e, aliases));
        node.name.elements.forEach((el, i) => {
          if (ts.isOmittedExpression(el) || el.dotDotDotToken !== undefined || !ts.isIdentifier(el.name)) return;
          const held = ts.isArrayLiteralExpression(init)
            ? spread
              ? anyHeld
              : init.elements[i] !== undefined && !ts.isSpreadElement(init.elements[i]!) && isTable(init.elements[i]!, aliases)
            : ts.isIdentifier(init) && aliases.arrays.has(init.text);
          if (held) add(aliases.names, el.name.text);
        });
      }
      if (ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          const prop = el.propertyName ?? el.name;
          if (ts.isIdentifier(prop) && (prop.text === TABLE || aliases.props.has(prop.text)) && ts.isIdentifier(el.name)) add(aliases.names, el.name.text);
        }
      }
    }
    // `t = fieldWorkerMoveRequests`, `holder.t = ...`, `holder['t'] = ...`
    // `T = 'field_worker_move_requests'` (R5-2)
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(unwrap(node.left)) && holdsSqlName(node.right, aliases)) {
      add(aliases.sqlNames, (unwrap(node.left) as ts.Identifier).text);
    }
    // `{ t: 'field_worker_move_requests' }` (R5-2)
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && holdsSqlName(node.initializer, aliases)) add(aliases.sqlProps, node.name.text);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isTable(node.right, aliases)) {
      const left = unwrap(node.left);
      if (ts.isIdentifier(left)) add(aliases.names, left.text);
      else if (ts.isPropertyAccessExpression(left)) add(aliases.props, left.name.text);
      else if (ts.isElementAccessExpression(left)) {
        const key = stringKey(left.argumentExpression);
        if (key !== undefined) add(aliases.props, key);
      }
    }
    // `{ t: fieldWorkerMoveRequests }`, `{ fieldWorkerMoveRequests }`
    if (ts.isPropertyAssignment(node) && isTable(node.initializer, aliases) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) add(aliases.props, node.name.text);
    if (ts.isShorthandPropertyAssignment(node) && (node.name.text === TABLE || aliases.names.has(node.name.text))) add(aliases.props, node.name.text);
    // `const a = [fieldWorkerMoveRequests]` / `a = [...]`
    if (ts.isArrayLiteralExpression(node) && node.elements.some((el) => !ts.isSpreadElement(el) && isTable(el, aliases))) {
      const p = outerParent(node);
      if (p !== undefined && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) add(aliases.arrays, p.name.text);
      else if (p !== undefined && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(unwrap(p.left))) add(aliases.arrays, (unwrap(p.left) as ts.Identifier).text);
    }
    ts.forEachChild(node, walk);
  };
  while (grew) {
    grew = false;
    walk(sf);
  }
  return aliases;
}

/**
 * The write verb a call names, through every spelling of its callee: `db.update`, `db['update']`, `db.update!`, `(db.update)`, a bare
 * `update` (a destructured method) — or `undefined`. A callee that is none of these (`.call`, `.apply`, a computed name) is invisible here.
 */
function writeVerb(callee: ts.Expression): 'insert' | 'update' | undefined {
  const c = unwrap(callee);
  const name = ts.isPropertyAccessExpression(c) ? c.name.text : ts.isElementAccessExpression(c) ? stringKey(c.argumentExpression) : ts.isIdentifier(c) ? c.text : undefined;
  return name === 'insert' || name === 'update' ? name : undefined;
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

/** True for an expression that holds the table's SQL name: the string itself, or a name / property bound to it (R5-2). */
function holdsSqlName(expr: ts.Expression, aliases: Aliases): boolean {
  const e = unwrap(expr);
  const text = stringKey(e);
  if (text !== undefined) return SQL_NAME_ONLY.test(text);
  if (ts.isIdentifier(e)) return aliases.sqlNames.has(e.text);
  if (ts.isPropertyAccessExpression(e)) return aliases.sqlProps.has(e.name.text);
  if (ts.isElementAccessExpression(e)) {
    const key = stringKey(e.argumentExpression);
    return key !== undefined && aliases.sqlProps.has(key);
  }
  return false;
}

/**
 * True for a substitution that reads as the table: the drizzle table, something holding its SQL name, or a CALL given the SQL name
 * (`sql.identifier('field_worker_move_requests')`, `sql.raw('...')` - code review R5-2; fail closed on any callee).
 */
function namesTable(expr: ts.Expression, aliases: Aliases): boolean {
  const e = unwrap(expr);
  if (isTable(e, aliases) || holdsSqlName(e, aliases)) return true;
  return ts.isCallExpression(e) && e.arguments[0] !== undefined && holdsSqlName(e.arguments[0], aliases);
}

/** The literal text of a string / template node (a template's static parts joined; a substitution that IS the table reads as its name), or null. */
function literalText(node: ts.Node, aliases: Aliases): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map((s) => (namesTable(s.expression, aliases) ? ` ${SQL_NAME} ` : ' ') + s.literal.text).join('');
  }
  return null;
}

const isPlus = (n: ts.Node): n is ts.BinaryExpression => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken;

/**
 * The text of a whole `+` chain (`'UPDATE ' + 'field_worker_move_requests SET ...'`), its leaves joined: a literal by its text, a part that
 * reads as the table by its name, anything else as a space (R4-6). Read at the TOP of a chain only.
 */
function plusChainText(node: ts.BinaryExpression, aliases: Aliases): string {
  const part = (e: ts.Expression): string => {
    const u = unwrap(e);
    if (isPlus(u)) return part(u.left) + part(u.right);
    const text = literalText(u, aliases);
    if (text !== null) return text;
    return namesTable(u, aliases) ? ` ${SQL_NAME} ` : ' ';
  };
  return part(node);
}

export function scanMoveRequestWrites(file: string, source: string): MoveRequestWriteFinding[] {
  const kind = file.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : file.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : /\.(js|mjs|cjs)$/.test(file)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const aliases = collectAliases(sf);
  const findings: MoveRequestWriteFinding[] = [];
  const add = (node: ts.Node, detail: string): void => {
    findings.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, detail, enclosingFunction: enclosingFunctionName(node) });
  };
  const visit = (node: ts.Node): void => {
    const text = literalText(node, aliases);
    if (text !== null) {
      if (RAW_WRITE.test(text)) add(node, 'raw SQL write to field_worker_move_requests');
      if (WRITER_SETTING.test(text)) add(node, 'the app.field_worker_move_request_writer setting');
      if (ts.isTemplateExpression(node)) {
        node.templateSpans.forEach((s) => visit(s.expression));
        return;
      }
    }
    // A `+` chain read joined, at its top - reported only when no single literal in it already was (one finding per write).
    if (isPlus(node) && !isPlus(outerParent(node) ?? node.parent)) {
      const joined = plusChainText(node, aliases);
      const leaves: ts.Node[] = [];
      const collect = (e: ts.Node): void => {
        const u = ts.isExpression(e) ? unwrap(e) : e;
        if (isPlus(u)) {
          collect(u.left);
          collect(u.right);
        } else leaves.push(u);
      };
      collect(node);
      const alone = leaves.some((l) => {
        const t = literalText(l, aliases);
        return t !== null && RAW_WRITE.test(t);
      });
      if (!alone && RAW_WRITE.test(joined)) add(node, 'raw SQL write to field_worker_move_requests');
    }
    if (ts.isCallExpression(node)) {
      const method = writeVerb(node.expression);
      const arg = node.arguments[0];
      if (method !== undefined && arg !== undefined && isTable(arg, aliases)) add(node, `drizzle .${method}(${TABLE})`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

export function isAllowlistedWrite(f: MoveRequestWriteFinding, allowlist: readonly AllowlistEntry[]): boolean {
  return allowlist.some((a) => a.file === f.file && f.enclosingFunction !== undefined && a.functions.has(f.enclosingFunction));
}

/**
 * The NON-VACUITY floor (code review CR32): every allow-listed function must be SEEN writing — a raw write AND the writer setting. A rename
 * of the projector, or a scan gone blind, lists it here instead of passing green.
 */
export function unseenAllowlistedWriters(all: readonly MoveRequestWriteFinding[], allowlist: readonly AllowlistEntry[]): string[] {
  const missing: string[] = [];
  for (const a of allowlist) {
    for (const fn of a.functions) {
      const seen = all.filter((f) => f.file === a.file && f.enclosingFunction === fn);
      if (!seen.some((f) => f.detail.startsWith('raw SQL write')) || !seen.some((f) => f.detail.startsWith('the app.'))) missing.push(`${a.file} ${fn}`);
    }
  }
  return missing;
}

export function formatFinding(f: MoveRequestWriteFinding): string {
  // The allow-list matches the INNERMOST named function: a write moved into a callback reads `<anonymous>` and would otherwise fail without a reason.
  const hint = f.enclosingFunction === '<anonymous>' ? ' — the allow-list matches the innermost NAMED function: put the write in a named function' : '';
  return `${f.file}:${String(f.line)} — ${f.detail} (in ${f.enclosingFunction ?? '<top level>'})${hint}`;
}
