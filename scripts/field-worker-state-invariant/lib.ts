// scripts/field-worker-state-invariant/lib.ts
//
// Pure scanner for the Story 13.1 I1 invariant: `field_workers`' eight PROJECTED columns —
// `current_state`, `state_event_version`, `kyc_status`, `state_reason_code`, `district`, `ended_on`, `audit_id`,
// `updated_at` — are a replay-derived cache and may be written ONLY by the event-replay projector
// (packages/domain/src/field-worker/project.ts: `projectFieldWorkerGenesis` / `projectFieldWorkerTransition`). Any
// OTHER code path that writes one lets the cache diverge from the event-sourced source of truth. Twin of
// scripts/marketplace-module-state-invariant/lib.ts (copied, renamed, and its column set replaced by the eight I1 columns
// — the set is table-specific).
//
// FLAGGED write forms (AST-detected — a `.set({ district })` substring in a comment/string never
// matches): `.update(fieldWorkers).set({ … })`, bare/bulk `.insert(fieldWorkers).values({ … })`,
// `…onConflictDoUpdate({ set: { … } })`, and `fieldWorkers.<column> = …`, for EACH of the eight columns.
// The Drizzle FIELD names are camelCase; the table matches bare (`fieldWorkers`), namespaced
// (`schema.fieldWorkers`), wrapped (`(fieldWorkers)`, `fieldWorkers as any`, `fieldWorkers!`), under an import alias
// (`fieldWorkers as fw`) or a `const` alias, and through a SPLIT chain (`const q = db.update(fieldWorkers); q.set(…)`).
// ⭐ A `.set` / `.values` / upsert `set` on a `fieldWorkers` chain whose payload the scanner CANNOT read — a variable, a call,
// a spread — is itself a finding ("unverifiable shape", review R3-27): the gate cannot prove it leaves the eight columns alone.
// ⚠ What it still cannot see: raw SQL (the trigger's), a dynamic table or method key, a chain built or returned by a HELPER
// (`withWhere(db.update(fieldWorkers)).set(…)`, `upd().set(…)`), and roots outside `packages/domain/src` (house convention for every
// `*-state-invariant` gate). Aliases are tracked per FILE, ⛔ per scope — a shadowed name only over-approximates (a loud false positive).
//
// This is the STATIC authoring-time guard. The DB trigger (migration 0200) is the independent RUNTIME
// guard that also catches raw SQL — and the only guard on the immutable CONTENT columns (I2). Both are
// required — different layers.

import * as ts from 'typescript';

export interface FieldWorkerStateWriteFinding {
  file: string;
  line: number;
  detail: string;
  /** The innermost enclosing function's name — `<anonymous>` for a callback (review R3-27), `undefined` at the top level. */
  enclosingFunction: string | undefined;
}

const FIELD_WORKERS_TABLE = 'fieldWorkers';
/** The eight PROJECTED columns (I1) + the approver (13.1a, 0201) — see migration 0201's trigger exclusion chain. A new projected column joins this
 *  set AND the trigger's chain in the same change (C8 (c) — `CREATE OR REPLACE` of the guard function). */
const GUARDED_COLUMNS = new Set([
  'currentState',
  'stateEventVersion',
  'kycStatus',
  'stateReasonCode',
  'district',
  'endedOn',
  'auditId',
  'updatedAt',
  'approvedByDisplay', // Story 13.1a (0201) — the approver, set once by the projector on `field_worker.activated`
]);

/** `expr` without the wrappers that do not change WHICH object it is: parentheses, `as`, `<T>`, `!`, `satisfies`. */
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

/** Per-file names that refer to the `fieldWorkers` TABLE (an import or `const` alias) or to a chain on it (a split chain). */
interface TableNames {
  readonly tables: Set<string>;
  readonly chains: Set<string>;
}

/** The member a property access or a LITERAL element access names (`x.set` / `x['set']` — review R4-8), else null. */
function memberName(expr: ts.Expression): string | null {
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  if (ts.isElementAccessExpression(expr) && ts.isStringLiteralLike(expr.argumentExpression)) return expr.argumentExpression.text;
  return null;
}

/** Does a `.update(X)` / `.insert(X)` argument refer to `fieldWorkers` — bare, namespaced (`.x` or `['x']`), wrapped or aliased? */
function isTableRef(expr: ts.Expression, names: TableNames): boolean {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return e.text === FIELD_WORKERS_TABLE || names.tables.has(e.text);
  return memberName(e) === FIELD_WORKERS_TABLE;
}

/** The legacy single-name probe (direct assignment `fieldWorkers.<col> = …`). */
function tableNameOf(expr: ts.Expression): string | undefined {
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return undefined;
}

/** Does a single object literal carry a guarded-column property (assignment, shorthand, or a
 * computed key that is literally one of the guarded column names)? */
function singleObjectHasStateKey(obj: ts.ObjectLiteralExpression): boolean {
  return obj.properties.some((p) => {
    if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
      const name = p.name;
      if (ts.isIdentifier(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isStringLiteral(name)) return GUARDED_COLUMNS.has(name.text);
      if (ts.isComputedPropertyName(name)) {
        // A computed key literal: a plain string ({ ['currentState']: ... }) or a no-substitution
        // template literal ({ [`currentState`]: ... }) — both are statically-known column names.
        if (ts.isStringLiteral(name.expression)) return GUARDED_COLUMNS.has(name.expression.text);
        if (ts.isNoSubstitutionTemplateLiteral(name.expression)) return GUARDED_COLUMNS.has(name.expression.text);
      }
    }
    return false;
  });
}

/** What a write's payload is, as far as the scanner can READ it (review R3-27). */
type PayloadShape = 'guarded' | 'clean' | 'unverifiable';

/** An object literal OR an array of object literals (the bulk-insert form): carries a guarded key, carries none, or cannot be
 *  read — a variable / call / spread payload may hold any column. */
function payloadShape(arg: ts.Expression): PayloadShape {
  const a = unwrap(arg);
  const one = (o: ts.Expression): PayloadShape => {
    const e = unwrap(o);
    if (!ts.isObjectLiteralExpression(e)) return 'unverifiable';
    if (singleObjectHasStateKey(e)) return 'guarded';
    // Unreadable members (review R4-7): a spread, a NON-literal computed key (`{ [k]: v }`), an accessor or a method.
    const unreadable = e.properties.some(
      (p) =>
        ts.isSpreadAssignment(p) ||
        ts.isGetAccessorDeclaration(p) ||
        ts.isSetAccessorDeclaration(p) ||
        ts.isMethodDeclaration(p) ||
        ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
          ts.isComputedPropertyName(p.name) &&
          !ts.isStringLiteral(p.name.expression) &&
          !ts.isNoSubstitutionTemplateLiteral(p.name.expression)),
    );
    return unreadable ? 'unverifiable' : 'clean';
  };
  if (ts.isArrayLiteralExpression(a)) {
    const shapes = a.elements.map((el) => (ts.isSpreadElement(el) ? 'unverifiable' : one(el)));
    return shapes.includes('guarded') ? 'guarded' : shapes.includes('unverifiable') ? 'unverifiable' : 'clean';
  }
  return one(a);
}

/**
 * The innermost enclosing function, by name: a named function / method / accessor, an arrow or function expression bound to a
 * `const` or written as an object PROPERTY (its key) — and `<anonymous>` for any other function-like node (a callback), so a
 * write inside a callback inside a projector body is NOT the projector's own (review R3-27). `undefined` at the top level.
 */
function enclosingFunctionName(node: ts.Node): string | undefined {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if ((ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur) || ts.isGetAccessor(cur) || ts.isSetAccessor(cur)) && cur.name) {
      return ts.isIdentifier(cur.name) || ts.isStringLiteral(cur.name) ? cur.name.text : '<anonymous>';
    }
    if (ts.isConstructorDeclaration(cur)) return 'constructor';
    if (ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) {
      if (ts.isFunctionExpression(cur) && cur.name) return cur.name.text;
      const parent = cur.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
      if (ts.isPropertyAssignment(parent) && (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))) return parent.name.text;
      return '<anonymous>';
    }
    if (ts.isFunctionLike(cur)) return '<anonymous>';
    cur = cur.parent;
  }
  return undefined;
}

/** Walk a chain LEFTWARD, returning true if it contains `.update(fieldWorkers)` / `.insert(fieldWorkers)` — or starts at a
 *  variable that holds such a chain (a split chain). */
function chainTargetsTable(node: ts.Node, names: TableNames): boolean {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isCallExpression(cur)) {
      const callee = cur.expression;
      const method = memberName(callee);
      if (method !== null && (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee))) {
        if ((method === 'update' || method === 'insert') && cur.arguments.length >= 1) {
          const a = cur.arguments[0];
          if (a && isTableRef(a, names)) return true;
        }
        cur = callee.expression;
        continue;
      }
      cur = cur.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isNonNullExpression(cur) || ts.isAwaitExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isIdentifier(cur)) return names.chains.has(cur.text);
    break;
  }
  return false;
}

/** The `set` of an `onConflictDoUpdate({ set: … })` argument — keyed bare or as a string, or SHORTHAND (`{ set }`, whose payload
 *  is a variable and so unverifiable) — or `undefined` when there is none; `'unverifiable'` when the argument is not a literal. */
function onConflictSet(arg: ts.Expression): ts.Expression | 'unverifiable' | undefined {
  const a = unwrap(arg);
  if (!ts.isObjectLiteralExpression(a)) return 'unverifiable';
  for (const p of a.properties) {
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === 'set') return 'unverifiable';
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'set') return p.initializer;
    if (ts.isSpreadAssignment(p)) return 'unverifiable';
  }
  return undefined;
}

/** Pre-pass: every name in this file that aliases the table or holds a chain on it. Two rounds, so a chain on an alias resolves. */
function collectTableNames(sf: ts.SourceFile): TableNames {
  const names: TableNames = { tables: new Set(), chains: new Set() };
  /** `name = value` — a declaration initialiser OR a plain assignment (review R4-8: `q = db.update(fieldWorkers)`, `t = fieldWorkers`). */
  const bind = (name: string, value: ts.Expression): void => {
    if (isTableRef(value, names)) names.tables.add(name);
    else if (chainTargetsTable(unwrap(value), names)) names.chains.add(name);
  };
  const round = (node: ts.Node): void => {
    if (ts.isImportSpecifier(node) && (node.propertyName ?? node.name).text === FIELD_WORKERS_TABLE) names.tables.add(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) bind(node.name.text, node.initializer);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) bind(node.left.text, node.right);
    // `const { fieldWorkers: fw } = schema` (review R4-8) — a destructured binding keyed by the table's name.
    if (ts.isBindingElement(node) && ts.isIdentifier(node.name)) {
      const key = node.propertyName ?? node.name;
      if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === FIELD_WORKERS_TABLE) names.tables.add(node.name.text);
    }
    ts.forEachChild(node, round);
  };
  round(sf);
  round(sf);
  return names;
}

/** Scan one TypeScript source for writes to `field_workers`' projected columns. */
export function scanFieldWorkerStateWrites(file: string, source: string): FieldWorkerStateWriteFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: FieldWorkerStateWriteFinding[] = [];
  const names = collectTableNames(sf);

  const push = (node: ts.Node, detail: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ file, line: line + 1, detail, enclosingFunction: enclosingFunctionName(node) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) && memberName(node.expression) !== null) {
      const method = memberName(node.expression)!; // `.set(…)` or `['set'](…)` — review R4-8
      const chainRoot = node.expression.expression;

      if (method === 'set' && node.arguments.length === 1 && chainTargetsTable(chainRoot, names)) {
        const shape = payloadShape(node.arguments[0]!);
        if (shape === 'guarded') push(node, '.update(fieldWorkers).set({ <projected column> }) — UPDATE to a projected column');
        if (shape === 'unverifiable') push(node, '.update(fieldWorkers).set(<unverifiable shape>) — a payload the gate cannot read may write a projected column');
      }

      if (method === 'onConflictDoUpdate' && node.arguments.length === 1 && chainTargetsTable(chainRoot, names)) {
        const setObj = onConflictSet(node.arguments[0]!);
        const shape = setObj === undefined ? 'clean' : setObj === 'unverifiable' ? 'unverifiable' : payloadShape(setObj);
        if (shape === 'guarded') push(node, '.insert(fieldWorkers)…onConflictDoUpdate({ set: { <projected column> } }) — upsert of a projected column');
        if (shape === 'unverifiable') push(node, '.insert(fieldWorkers)…onConflictDoUpdate(<unverifiable shape>) — an upsert the gate cannot read');
      }

      if (method === 'values' && node.arguments.length >= 1 && chainTargetsTable(chainRoot, names)) {
        const shape = payloadShape(node.arguments[0]!);
        if (shape === 'guarded') push(node, '.insert(fieldWorkers).values({ <projected column> }) — INSERT (create-time) write to a projected column');
        if (shape === 'unverifiable') push(node, '.insert(fieldWorkers).values(<unverifiable shape>) — an INSERT the gate cannot read');
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      GUARDED_COLUMNS.has(node.left.name.text) &&
      (tableNameOf(node.left.expression) === FIELD_WORKERS_TABLE || isTableRef(node.left.expression, names))
    ) {
      push(node, `fieldWorkers.${node.left.name.text} = … — direct assignment to a projected column`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: FieldWorkerStateWriteFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `field_workers' projected columns are a replay-derived cache; only the event-replay projector ` +
    `(packages/domain/src/field-worker/project.ts) may write them (Story 13.1 I1). Route the change ` +
    `through a fieldWorker.* command (registerFieldWorker / recordFieldWorkerKycCompleted / activateFieldWorker / ` +
    `suspendFieldWorker / reactivateFieldWorker / terminateFieldWorker / postFieldWorker) instead.`
  );
}

/** An allowlisted writer: a specific FUNCTION within a specific file — not the whole file. */
export interface AllowlistEntry {
  file: string;
  functions: Set<string>;
}

/** Is this finding's write site inside one of the allowlisted functions of its file? */
export function isAllowlistedWrite(
  finding: Pick<FieldWorkerStateWriteFinding, 'file' | 'enclosingFunction'>,
  allowlist: readonly AllowlistEntry[],
): boolean {
  return allowlist.some(
    (entry) =>
      entry.file === finding.file &&
      finding.enclosingFunction !== undefined &&
      entry.functions.has(finding.enclosingFunction),
  );
}
