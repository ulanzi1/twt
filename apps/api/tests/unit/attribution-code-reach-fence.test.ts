// Story 13.2 (Task 6.4; AC10; AT8 v2 ii–iv) — "no API endpoint allows attribution-code lookup without Pariwar context", enforced
// by gating the CALL, ⛔ the route shape. Three static gates over the source, TypeScript-AST (⛔ a substring grep):
//
//  (ii) ONE REACH FENCE over the whole repo — every `apps/*/src` and `packages/*/src` (enumerated at run time; `.ts` `.tsx` `.mts`
//       `.js` `.astro`, `.d.ts` included; DOT-directories included — `apps/public/src/pages/.well-known/*.ts` are live
//       UNAUTHENTICATED routes; only `node_modules` skipped). A file REACHES the registry if it names the namespace
//       (`attributionCode`, any identifier position, or `x['attributionCode']`), re-exports `@twt/domain` wholesale, imports a
//       path containing `attribution-code` (⭐ EXCEPT the API door imported from `apps/api/src` — its importers there are the
//       sanctioned route callers, TR13; a door import from any other tree, or a RE-EXPORT of the door, is REACH — review R1), or names
//       a table / schema symbol / domain function as a WHOLE identifier or string text. Exactly the module directory (a prefix)
//       and the ALLOWED files may. Precedent: family-account-reach-fence.test.ts (*"the first version scanned `apps/api/src`
//       alone"*).
// (iii) the API door's POSITIVE shape — exactly eleven exports; each wrapper's parameters / types / option keys pinned; `request`
//       reached ONLY through the private `authenticatedScope`, which reads `requestContext.pariwarId` / `.actorId` and nothing
//       else; ⛔ `getRequestContext`; ⛔ `generate` (AT9 — the allocate call gets a fresh `{ maxAttempts }` literal).
//  (iv) the authenticated-Pariwar WRITER PIN over `apps/api/src` — the files that assign `pariwarId` on ANY receiver are exactly
//       the member-session guard and the scope-resolution hook (G9b); ⛔ `Object.assign` / `Reflect.set` / `defineProperty` on a
//       request context (incl. `x['requestContext']` and a `const` alias of one); a context REPLACEMENT — `.requestContext =`,
//       `['requestContext'] =`, or a `requestContext` key / name given to those three calls — only in the request-context
//       middleware (review R2).
// ⚠ Turbo's LOCAL cache skips `@twt/api#test` when only a non-dependency workspace (apps/public, apps/admin, …) changed; GitHub CI
// has no turbo cache and is the backstop. A new entry in ALLOWED (e.g. C4's backfill job) is a REVIEWED edit here.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// ── (ii) the reach fence ─────────────────────────────────────────────────────────────────────────────────────────────

/** The module itself — a PATH PREFIX, exempt from REACH and from the must-match check. */
const MODULE_DIR = 'packages/domain/src/attribution-code/';
const DOOR = 'apps/api/src/modules/field-worker/attribution-code-access.ts';
/** The EXACT files outside the module that may reach it — each must exist AND match REACH (a stale entry fails). */
const ALLOWED = [
  'packages/domain/src/schema/field_worker_attribution_codes.ts',
  'packages/domain/src/schema/attribution_code_allocation_flags.ts',
  'packages/domain/src/schema/index.ts',
  'packages/domain/src/policies/field-worker-attribution-codes-rls.ts',
  'packages/domain/src/policies/attribution-code-allocation-flags-rls.ts',
  'packages/domain/src/policies/index.ts',
  'packages/domain/src/index.ts',
  DOOR,
] as const;
const NAMESPACE = 'attributionCode';
/** Matched as WHOLE identifiers, or `\b<name>\b` in string / template text — so `resolveAttributionForRequest` and `attributionCodeId` do ⛔. */
const NAMES = [
  'fieldWorkerAttributionCodes',
  'attributionCodeAllocationFlags',
  'field_worker_attribution_codes',
  'attribution_code_allocation_flags',
  'resolveAttribution',
  'allocateAttributionCode',
  'readAttributionCodeForFieldWorker',
  'flagAllocationExhausted',
  'listAllocationFlags',
] as const;
const NAME_SET = new Set<string>(NAMES);
const NAMES_RE = new RegExp(`\\b(?:${NAMES.join('|')})\\b`);
const EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.astro'];

/** Every `apps/*\/src` and `packages/*\/src`, from the workspace directories (⛔ a hard-coded list). */
function trees(): string[] {
  const out: string[] = [];
  for (const top of ['apps', 'packages']) {
    for (const name of readdirSync(path.join(repoRoot, top))) {
      const src = path.join(repoRoot, top, name, 'src');
      try {
        if (statSync(src).isDirectory()) out.push(`${top}/${name}/src`);
      } catch {
        // no src/ (apps/mobile, packages/eslint-config-twt)
      }
    }
  }
  return out.sort();
}

/** Recursive walk — DOT-directories INCLUDED (`.well-known`); ONLY `node_modules` skipped. */
function walk(relDir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(repoRoot, relDir))) {
    if (name === 'node_modules') continue;
    const rel = `${relDir}/${name}`;
    if (statSync(path.join(repoRoot, rel)).isDirectory()) out.push(...walk(rel));
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(rel);
  }
  return out;
}

const scriptKindOf = (file: string): ts.ScriptKind =>
  file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;

/** The module specifier a node carries, if any: import / export declarations, `import()`, `require()`, `import('x')` types. */
function moduleSpecifierOf(node: ts.Node): string | null {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return node.moduleSpecifier.text;
  }
  if (ts.isCallExpression(node) && node.arguments.length > 0) {
    const callee = node.expression;
    const isImport = callee.kind === ts.SyntaxKind.ImportKeyword;
    const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
    const arg = node.arguments[0]!;
    if ((isImport || isRequire) && ts.isStringLiteralLike(arg)) return arg.text;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
    return node.argument.literal.text;
  }
  if (ts.isExternalModuleReference(node) && ts.isStringLiteralLike(node.expression)) return node.expression.text;
  return null;
}

/** The door's sanctioned importers live in the API (review R1 — a public page or a job importing it bypasses the session hooks). */
const DOOR_CALLER_TREE = 'apps/api/src/';

/** A relative specifier that resolves to the API door (any of `.js` / `.ts` / extension-less). */
function resolvesToDoor(file: string, spec: string): boolean {
  if (!spec.startsWith('.')) return false;
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)).replace(/\.(?:js|ts|mts|mjs)$/, '');
  return resolved === DOOR.replace(/\.ts$/, '');
}

const isTemplateText = (n: ts.Node): n is ts.TemplateHead | ts.TemplateMiddle | ts.TemplateTail =>
  n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle || n.kind === ts.SyntaxKind.TemplateTail;

/** REACH over one TS / JS source (comments are ⛔ AST nodes, so a commented mention never matches). */
function scanCode(file: string, text: string, kind: ts.ScriptKind): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const hits: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      if (node.text === NAMESPACE) hits.push(`namespace:${node.text}`);
      else if (NAME_SET.has(node.text)) hits.push(`name:${node.text}`);
    } else if ((ts.isStringLiteralLike(node) || isTemplateText(node)) && NAMES_RE.test(node.text)) {
      hits.push(`text:${node.text}`);
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === NAMESPACE) {
      hits.push(`element:${NAMESPACE}`);
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier) &&
      node.moduleSpecifier.text === '@twt/domain' &&
      (node.exportClause === undefined || ts.isNamespaceExport(node.exportClause))
    ) {
      hits.push('barrel:@twt/domain');
    }
    const spec = moduleSpecifierOf(node);
    const sanctionedDoorImport =
      spec !== null && file.startsWith(DOOR_CALLER_TREE) && !ts.isExportDeclaration(node) && resolvesToDoor(file, spec);
    if (spec !== null && spec.includes('attribution-code') && !sanctionedDoorImport) hits.push(`path:${spec}`);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

/** `.astro`: the frontmatter and every `<script>` are TS (scanned on the AST); the template is regex-scanned after comment-stripping. */
function scanAstro(file: string, text: string): string[] {
  const hits: string[] = [];
  let template = text;
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (fm) {
    hits.push(...scanCode(file, fm[1]!, ts.ScriptKind.TS));
    template = template.slice(fm[0].length);
  }
  template = template.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (_, body: string) => {
    hits.push(...scanCode(file, body, ts.ScriptKind.TS));
    return '';
  });
  template = template.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (new RegExp(`\\b${NAMESPACE}\\b`).test(template) || NAMES_RE.test(template) || /attribution-code/.test(template)) {
    hits.push('astro-template');
  }
  return hits;
}

function reachHits(file: string, text: string): string[] {
  return file.endsWith('.astro') ? scanAstro(file, text) : scanCode(file, text, scriptKindOf(file));
}

const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');

/** AT9 — an ALLOWED file outside the module must ⛔ mention `generate` (the allocator's test seam) as any identifier. */
function generateHits(file: string, text: string): number {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  let n = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === 'generate') n += 1;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return n;
}

// ── (iii) the door shape ─────────────────────────────────────────────────────────────────────────────────────────────

const ERROR_EXPORTS = [
  'InvalidAttributionCodeError',
  'AttributionPariwarScopeMismatchError',
  'FieldWorkerAlreadyHasAttributionCodeError',
  'AttributionCodeAllocationExhaustedError',
  'AttributionCodeRequiresTransactionError',
  'AttributionCaptureMismatchError',
] as const;

interface ParamPin {
  name: string;
  /** A type-reference name, or the EXACT key set of an inline object type. */
  type: string | readonly string[];
  optional?: boolean;
}
const WRAPPERS: Record<string, readonly ParamPin[]> = {
  resolveAttributionForRequest: [
    { name: 'request', type: 'FastifyRequest' },
    { name: 'scopeTx', type: 'ScopeTx' },
    { name: 'options', type: ['asOf', 'code'] },
  ],
  readAttributionCodeForRequest: [
    { name: 'request', type: 'FastifyRequest' },
    { name: 'scopeTx', type: 'ScopeTx' },
    { name: 'options', type: ['fieldWorkerId'] },
  ],
  allocateAttributionCodeForRequest: [
    { name: 'request', type: 'FastifyRequest' },
    { name: 'scopeTx', type: 'ScopeTx' },
    { name: 'options', type: ['fieldWorkerId'] },
    { name: 'opts', type: ['maxAttempts'], optional: true },
  ],
  listAllocationFlagsForRequest: [
    { name: 'request', type: 'FastifyRequest' },
    { name: 'scopeTx', type: 'ScopeTx' },
    { name: 'options', type: ['limit'] },
  ],
  flagAllocationExhaustedForRequest: [
    { name: 'deps', type: 'AppDeps' },
    { name: 'request', type: 'FastifyRequest' },
    { name: 'options', type: ['attempts'] },
  ],
};
const PINNED_EXPORTS = [...Object.keys(WRAPPERS), ...ERROR_EXPORTS].sort();

const hasExport = (n: ts.Node): boolean =>
  ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

function paramTypeOf(p: ts.ParameterDeclaration): string | readonly string[] | null {
  const t = p.type;
  if (t === undefined) return null;
  if (ts.isTypeReferenceNode(t)) return t.typeName.getText();
  if (ts.isTypeLiteralNode(t)) {
    return t.members.map((m) => (m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) ? m.name.text : '<computed>')).sort();
  }
  return t.getText();
}

/** Every violation of the door's positive shape (empty = conforming). */
function doorViolations(text: string): string[] {
  const sf = ts.createSourceFile(DOOR, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const v: string[] = [];
  const exported = new Set<string>();
  const fns = new Map<string, ts.FunctionDeclaration>();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) fns.set(st.name.text, st);
    if (ts.isExportDeclaration(st)) {
      if (!st.exportClause || !ts.isNamedExports(st.exportClause)) v.push('export * from the door');
      else for (const s of st.exportClause.elements) exported.add(s.name.text);
      continue;
    }
    if (ts.isExportAssignment(st)) v.push('export default / export =');
    if (!hasExport(st)) continue;
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) exported.add(d.name.getText());
    } else if (
      (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st)) &&
      st.name
    ) {
      exported.add(st.name.text);
    }
  }
  const exports = [...exported].sort();
  if (JSON.stringify(exports) !== JSON.stringify(PINNED_EXPORTS)) v.push(`exports ${JSON.stringify(exports)}`);

  // Each wrapper: exported, its parameters pinned by name / type / option keys.
  for (const [name, pins] of Object.entries(WRAPPERS)) {
    const fn = fns.get(name);
    if (!fn || !hasExport(fn)) {
      v.push(`${name}: missing`);
      continue;
    }
    if (fn.parameters.length !== pins.length) v.push(`${name}: ${String(fn.parameters.length)} parameters`);
    fn.parameters.forEach((p, i) => {
      const pin = pins[i];
      if (!pin) return;
      if (p.name.getText() !== pin.name) v.push(`${name}: parameter ${String(i)} is ${p.name.getText()}`);
      if (Boolean(p.questionToken) !== Boolean(pin.optional)) v.push(`${name}: parameter ${pin.name} optionality`);
      if (JSON.stringify(paramTypeOf(p)) !== JSON.stringify(Array.isArray(pin.type) ? [...pin.type].sort() : pin.type)) {
        v.push(`${name}: parameter ${pin.name} type ${JSON.stringify(paramTypeOf(p))}`);
      }
    });
  }

  // `authenticatedScope`: private, one `request` parameter, reads ONLY `request.requestContext.{pariwarId,actorId}`.
  const helper = fns.get('authenticatedScope');
  if (!helper) v.push('authenticatedScope: missing');
  else if (hasExport(helper)) v.push('authenticatedScope: exported');

  // EVERY `request` identifier in the file: a parameter of a wrapper / the helper, the sole argument of `authenticatedScope(…)`
  // inside a wrapper, or `request.requestContext.<pariwarId|actorId>` inside the helper.
  const visit = (node: ts.Node, inFn: string | null): void => {
    let fnName = inFn;
    if (ts.isFunctionDeclaration(node) && node.name) fnName = node.name.text;
    if (ts.isIdentifier(node)) {
      if (node.text === 'getRequestContext') v.push('getRequestContext');
      if (node.text === 'generate') v.push('generate');
      if (node.text === 'request') {
        const parent = node.parent;
        const isParam = ts.isParameter(parent) && parent.name === node;
        const isTypeName = ts.isTypeReferenceNode(parent) || ts.isQualifiedName(parent);
        const okWrapperUse =
          fnName !== null &&
          fnName in WRAPPERS &&
          ts.isCallExpression(parent) &&
          ts.isIdentifier(parent.expression) &&
          parent.expression.text === 'authenticatedScope' &&
          parent.arguments.length === 1 &&
          parent.arguments[0] === node;
        const okHelperUse =
          fnName === 'authenticatedScope' &&
          ts.isPropertyAccessExpression(parent) &&
          parent.expression === node &&
          parent.name.text === 'requestContext' &&
          ts.isPropertyAccessExpression(parent.parent) &&
          parent.parent.expression === parent &&
          ['pariwarId', 'actorId'].includes(parent.parent.name.text);
        const okParam = isParam && fnName !== null && (fnName in WRAPPERS || fnName === 'authenticatedScope');
        if (!(okParam || isTypeName || okWrapperUse || okHelperUse)) v.push(`request used in ${String(fnName)}: ${parent.getText().slice(0, 60)}`);
      }
    }
    ts.forEachChild(node, (c) => visit(c, fnName));
  };
  visit(sf, null);

  // AT9 — the allocate call gets a FRESH `{ maxAttempts }` literal (⛔ the caller's opts, ⛔ a spread).
  const allocCalls: ts.CallExpression[] = [];
  const findAlloc = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'allocateAttributionCode') {
      allocCalls.push(node);
    }
    ts.forEachChild(node, findAlloc);
  };
  findAlloc(sf);
  if (allocCalls.length !== 1) v.push(`${String(allocCalls.length)} allocate calls`);
  for (const call of allocCalls) {
    const third = call.arguments[2];
    const ok =
      third !== undefined &&
      ts.isObjectLiteralExpression(third) &&
      third.properties.length === 1 &&
      ts.isPropertyAssignment(third.properties[0]!) &&
      third.properties[0].name.getText() === 'maxAttempts';
    if (!ok) v.push(`allocate options: ${third ? third.getText() : '<none>'}`);
  }
  return v;
}

// ── (iv) the writer pin ──────────────────────────────────────────────────────────────────────────────────────────────

const PARIWAR_WRITERS = ['apps/api/src/middleware/scope-resolution/index.ts', 'apps/api/src/modules/auth/shared/member-session-guard.ts'];
const CONTEXT_ASSIGNER = 'apps/api/src/middleware/request-context/index.ts';
const ASSIGN_OPS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

const unwrap = (e: ts.Expression): ts.Expression => {
  let cur = e;
  while (ts.isNonNullExpression(cur) || ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur)) cur = cur.expression;
  return cur;
};
const isPariwarIdTarget = (e: ts.Expression): boolean => {
  const t = unwrap(e);
  return (
    (ts.isPropertyAccessExpression(t) && t.name.text === 'pariwarId') ||
    (ts.isElementAccessExpression(t) && ts.isStringLiteralLike(t.argumentExpression) && t.argumentExpression.text === 'pariwarId')
  );
};
/** A destructuring-assignment pattern that writes a PROPERTY ACCESS named `pariwarId` (⛔ a shorthand — that writes a local). */
function patternWritesPariwarId(e: ts.Expression): boolean {
  const t = unwrap(e);
  if (ts.isObjectLiteralExpression(t)) {
    return t.properties.some(
      (p) =>
        (ts.isPropertyAssignment(p) &&
          (isPariwarIdTarget(p.initializer) ||
            patternWritesPariwarId(p.initializer) ||
            (ts.isBinaryExpression(p.initializer) && p.initializer.operatorToken.kind === ts.SyntaxKind.EqualsToken && isPariwarIdTarget(p.initializer.left)))) ||
        (ts.isSpreadAssignment(p) && isPariwarIdTarget(p.expression)),
    );
  }
  if (ts.isArrayLiteralExpression(t)) return t.elements.some((el) => isPariwarIdTarget(el) || patternWritesPariwarId(el));
  return false;
}
/** `x.requestContext` or `x['requestContext']` (review R2 — a literal element access is the same property). */
const isContextMember = (e: ts.Expression): boolean => {
  const t = unwrap(e);
  return (
    (ts.isPropertyAccessExpression(t) && t.name.text === 'requestContext') ||
    (ts.isElementAccessExpression(t) && ts.isStringLiteralLike(t.argumentExpression) && t.argumentExpression.text === 'requestContext')
  );
};
/** A request context: the name, a member access, `getRequestContext()`, or a local ALIAS bound to one of those (review R2). */
const isContextRef = (e: ts.Expression, aliases: ReadonlySet<string>): boolean => {
  const t = unwrap(e);
  return (
    (ts.isIdentifier(t) && (t.text === 'requestContext' || aliases.has(t.text))) ||
    isContextMember(t) ||
    (ts.isCallExpression(t) && ts.isIdentifier(t.expression) && t.expression.text === 'getRequestContext')
  );
};
/** `{ requestContext: … }` / `{ requestContext }` / `'requestContext'` — a call argument that REPLACES the context on its target. */
const namesContextKey = (e: ts.Expression | undefined): boolean => {
  if (e === undefined) return false;
  const t = unwrap(e);
  if (ts.isStringLiteralLike(t)) return t.text === 'requestContext';
  return (
    ts.isObjectLiteralExpression(t) &&
    t.properties.some((p) => p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) && p.name.text === 'requestContext')
  );
};

/** The names a file binds to a request context (`const ctx = request.requestContext`, `= getRequestContext()!`, chained aliases). */
function contextAliases(sf: ts.SourceFile): Set<string> {
  const aliases = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer !== undefined &&
        !aliases.has(node.name.text) &&
        isContextRef(node.initializer, aliases)
      ) {
        aliases.add(node.name.text);
        grew = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return aliases;
}

/** The three writer-pin findings for one source: `pariwarId` writes, context mutations, `.requestContext =` assignments. */
function writerFindings(file: string, text: string): { pariwarId: number; mutation: number; contextAssign: number } {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  const f = { pariwarId: 0, mutation: 0, contextAssign: 0 };
  const aliases = contextAliases(sf);
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && ASSIGN_OPS.has(node.operatorToken.kind)) {
      if (isPariwarIdTarget(node.left) || (node.operatorToken.kind === ts.SyntaxKind.EqualsToken && patternWritesPariwarId(node.left))) {
        f.pariwarId += 1;
      }
      if (isContextMember(node.left)) f.contextAssign += 1;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
      const callee = `${node.expression.expression.text}.${node.expression.name.text}`;
      const [first, second] = node.arguments;
      if (['Object.assign', 'Reflect.set', 'Object.defineProperty'].includes(callee)) {
        if (first !== undefined && isContextRef(first, aliases)) f.mutation += 1;
        // ⛔ replace the context on its holder: Object.assign(request, { requestContext }), Reflect.set(request, 'requestContext', …).
        else if (callee === 'Object.assign' ? node.arguments.slice(1).some(namesContextKey) : namesContextKey(second)) f.contextAssign += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return f;
}

// ── the gates ────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('Story 13.2 AT8 v2 (ii) — the repo-wide reach fence', () => {
  const treeList = trees();
  const files = treeList.flatMap(walk);
  const outside = files.filter((f) => !f.startsWith(MODULE_DIR));

  it('scans every apps/*/src and packages/*/src — non-vacuous floors, the count printed (recorded in the story Debug Log)', () => {
    const perTree = Object.fromEntries(treeList.map((t) => [t, files.filter((f) => f.startsWith(`${t}/`)).length]));
    console.info(`[attribution-code-reach-fence] scanned ${String(files.length)} files in ${String(treeList.length)} trees`, perTree);
    expect(treeList.length).toBeGreaterThanOrEqual(19);
    expect(files.length).toBeGreaterThanOrEqual(1600);
    expect(treeList).toContain('apps/public/src');
    expect(files.some((f) => f.endsWith('.astro'))).toBe(true);
    expect(files.some((f) => f.endsWith('.d.ts'))).toBe(true);
    // ⭐ DOT-directories are walked — the unauthenticated `.well-known` routes are in the scan.
    expect(files.some((f) => f.startsWith('apps/public/src/pages/.well-known/'))).toBe(true);
  });

  it('exactly the ALLOWED files (outside the module directory) reach the registry, and each of them does', () => {
    const reachers = outside.filter((f) => reachHits(f, read(f)).length > 0).sort();
    expect(reachers).toEqual([...ALLOWED].sort());
  });

  it('the module directory exists and holds the module (a prefix, exempt from must-match)', () => {
    expect(files.filter((f) => f.startsWith(MODULE_DIR)).length).toBeGreaterThanOrEqual(7);
  });

  it('AT9 — ⛔ ALLOWED file outside the module mentions `generate` (the allocator test seam)', () => {
    for (const f of ALLOWED) expect(generateHits(f, read(f)), f).toBe(0);
  });

  it('⭐ POSITIVE CONTROLS — every supported import / reach form is caught', () => {
    const planted: Array<[string, string]> = [
      ['apps/public/src/pages/planted.astro', `---\nimport { attributionCode } from '@twt/domain';\n---\n<p>hi</p>`],
      ['apps/public/src/pages/planted-template.astro', `---\nimport * as d from '@twt/domain';\n---\n<p>{d.attributionCode.ATTRIBUTION_CODE_LENGTH}</p>`],
      ['apps/public/src/pages/planted-script.astro', `<p>x</p>\n<script>\nimport { attributionCode } from '@twt/domain';\n</script>`],
      ['apps/public/src/pages/.well-known/planted.ts', `import { attributionCode } from '@twt/domain';`],
      ['packages/validity-service/src/planted.ts', `import { attributionCode } from '@twt/domain'; void attributionCode;`],
      ['apps/api/src/modules/member/planted.ts', `const rows = await db.select().from(schema.fieldWorkerAttributionCodes);`],
      ['apps/api/src/modules/member/planted-sql.ts', `await c.query('SELECT field_worker_id FROM field_worker_attribution_codes WHERE code = $1', [x]);`],
      ['apps/api/src/modules/member/planted-tpl.ts', 'await c.query(`SELECT 1 FROM attribution_code_allocation_flags WHERE pariwar_id = ${p}`);'],
      ['packages/domain/src/member/planted.ts', `import { resolveAttribution } from '../attribution-code/resolve.js';`],
      ['apps/api/src/modules/claims/planted.ts', `if (e instanceof attributionCode.AttributionCodeAllocationExhaustedError) throw e;`],
      ['apps/api/src/a.ts', `import { attributionCode as ac } from '@twt/domain';`],
      ['apps/api/src/b.ts', `import * as d from '@twt/domain'; d.attributionCode.resolveX();`],
      ['apps/api/src/c.ts', `import * as d from '@twt/domain'; const x = d['attributionCode'];`],
      ['apps/api/src/d.ts', `type T = import('@twt/domain').attributionCode.AttributionAsOf;`],
      ['apps/api/src/e.ts', `type T = typeof import('@twt/domain').attributionCode;`],
      ['apps/api/src/f.ts', `const { attributionCode } = await import('@twt/domain');`],
      ['apps/api/src/g.ts', `const m = (await import('@twt/domain')).attributionCode;`],
      ['apps/jobs/src/h.js', `const m = require('@twt/domain').attributionCode;`],
      ['apps/jobs/src/i.js', `const { attributionCode } = require('@twt/domain');`],
      ['packages/domain/src/claim/j.ts', `const m = await import('../attribution-code/resolve.js');`],
      ['apps/jobs/src/k.js', `const m = require('../../packages/domain/src/attribution-code/index.js');`],
      ['apps/api/src/l.ts', `import x = require('@twt/domain/attribution-code');`],
      ['apps/api/src/m.ts', `const { domain } = deps; await domain.attributionCode.allocateAttributionCode(c, i);`],
      ['apps/api/src/n.ts', `const f = listAllocationFlags;`],
      ['apps/admin/src/o.tsx', `export function P() { return <div>{attributionCode.ATTRIBUTION_CODE_LENGTH}</div>; }`],
      ['apps/api/src/p.d.ts', `export declare const x: typeof import('@twt/domain').attributionCode;`],
      // An INTERMEDIATE re-export chain — every link is caught.
      ['apps/api/src/reexport-a.ts', `export { attributionCode as ac } from '@twt/domain';`],
      ['apps/api/src/reexport-b.ts', `export * from '@twt/domain';`],
      ['apps/api/src/reexport-b2.ts', `export * as dom from '@twt/domain';`],
      ['apps/api/src/reexport-c.ts', `import { attributionCode } from './reexport-b.js';`],
      // Review R1 — the door imported OUTSIDE apps/api/src (an unauthenticated public endpoint, a job, a package), or re-exported.
      [
        'apps/public/src/pages/planted-door.ts',
        `import { resolveAttributionForRequest } from '../../../api/src/modules/field-worker/attribution-code-access.js';`,
      ],
      ['apps/public/src/pages/.well-known/planted-door.ts', `const m = await import('../../../../api/src/modules/field-worker/attribution-code-access');`],
      ['apps/jobs/src/planted-door.ts', `import { listAllocationFlagsForRequest } from '../../api/src/modules/field-worker/attribution-code-access.js';`],
      ['packages/validity-service/src/planted-door.ts', `import type { ScopeTx } from '../../../apps/api/src/modules/field-worker/attribution-code-access.js';`],
      ['apps/api/src/modules/field-worker/index.ts', `export { resolveAttributionForRequest } from './attribution-code-access.js';`],
      ['apps/api/src/modules/field-worker/index2.ts', `export * from './attribution-code-access.js';`],
    ];
    for (const [file, src] of planted) expect(reachHits(file, src), `${file}: ${src}`).not.toEqual([]);
  });

  it('NEGATIVE CONTROLS — the door’s importers, a comment, an unrelated string, the brands and lookalike names are ⛔ flagged', () => {
    const clean: Array<[string, string]> = [
      [
        'apps/api/src/modules/field-worker/planted.routes.ts',
        `import { resolveAttributionForRequest, AttributionCodeAllocationExhaustedError } from './attribution-code-access.js';\nvoid resolveAttributionForRequest; void AttributionCodeAllocationExhaustedError;`,
      ],
      ['apps/api/src/modules/member/planted.routes.ts', `import { readAttributionCodeForRequest } from '../field-worker/attribution-code-access.js';`],
      ['apps/api/src/modules/member/planted2.routes.ts', `const m = await import('../field-worker/attribution-code-access');`],
      ['apps/api/src/modules/member/commented.ts', `// attributionCode.resolveAttribution is ⛔ called here\n/* field_worker_attribution_codes */ export const x = 1;`],
      ['apps/api/src/modules/member/message.ts', `throw new Error('see the attribution-code docs: an attribution code is six digits');`],
      ['packages/domain/src/ids/planted.ts', `export const attributionCodeId = 1; export const fieldWorkerAttributionCodesCount = 2;`],
      ['apps/api/src/modules/member/constraint.ts', `if (c === 'field_worker_attribution_codes_pariwar_code_uq') retry();`],
      ['apps/public/src/pages/clean.astro', `---\n// attributionCode — a comment\nconst x = 1;\n---\n<!-- attributionCode --><p>{x}</p>`],
    ];
    for (const [file, src] of clean) expect(reachHits(file, src), `${file}: ${src}`).toEqual([]);
    // The REAL brands file names `attributionCodeId` and is ⛔ a reacher.
    expect(reachHits('packages/domain/src/ids/index.ts', read('packages/domain/src/ids/index.ts'))).toEqual([]);
  });

  it('AT9 bite — a `generate` in an allowed file is caught', () => {
    expect(generateHits(DOOR, `await x.allocate(c, i, { generate: () => '482913' });`)).toBeGreaterThan(0);
  });
});

describe('Story 13.2 AT8 v2 (iii) — the API door’s positive shape', () => {
  const door = read(DOOR);

  it('the real door conforms: eleven exports, pinned parameters, request only through authenticatedScope, ⛔ generate', () => {
    expect(doorViolations(door)).toEqual([]);
  });

  const mutate = (from: string, to: string): string => {
    expect(door.includes(from), `bite anchor present: ${from}`).toBe(true);
    return door.replace(from, to);
  };
  const RESOLVE_OPTS = 'options: { code: string; asOf: attributionCode.AttributionAsOf },';
  const PARIWAR_LINE = '  const { pariwarId } = authenticatedScope(request);\n  assertScopeTxIsRequestScope(scopeTx, pariwarId);\n  return attributionCode.resolveAttribution(';

  it.each([
    ['an extra export', () => `${door}\nexport const extra = 1;\n`],
    ['an export * from the door', () => `${door}\nexport * from '@twt/contracts';\n`],
    ['a pariwarId parameter', () => mutate(RESOLVE_OPTS, `${RESOLVE_OPTS}\n  pariwarId?: string,`)],
    ['a pariwar option key', () => mutate(RESOLVE_OPTS, 'options: { code: string; asOf: attributionCode.AttributionAsOf; pariwar?: string },')],
    ['a request.body read', () => mutate(PARIWAR_LINE, `  void request.body;\n${PARIWAR_LINE}`)],
    ["a request['body'] read", () => mutate(PARIWAR_LINE, `  void request['body'];\n${PARIWAR_LINE}`)],
    ['const { body } = request', () => mutate(PARIWAR_LINE, `  const { body } = request;\n  void body;\n${PARIWAR_LINE}`)],
    ['request passed to another helper', () => mutate(PARIWAR_LINE, `  void JSON.stringify(request);\n${PARIWAR_LINE}`)],
    ['getRequestContext()', () => mutate(PARIWAR_LINE, `  void getRequestContext();\n${PARIWAR_LINE}`)],
    ['the helper reading another property', () => mutate('const actorId = request.requestContext.actorId;', 'const actorId = request.requestContext.traceId;')],
    ['the helper reading request.headers', () => mutate('const actorId = request.requestContext.actorId;', 'const actorId = String(request.headers);')],
    ['a forwarded opts (generate rides along)', () => mutate('{ maxAttempts: opts?.maxAttempts },', 'opts ?? {},')],
    ['a forwarded generate', () => mutate('{ maxAttempts: opts?.maxAttempts },', "{ maxAttempts: opts?.maxAttempts, generate: () => '482913' },")],
    ['a wrapper taking tx: Db', () => mutate('  request: FastifyRequest,\n  scopeTx: ScopeTx,\n  options: { code', '  request: FastifyRequest,\n  scopeTx: Db,\n  options: { code')],
    ['a wrapper taking a pg.Pool', () => mutate('  request: FastifyRequest,\n  scopeTx: ScopeTx,\n  options: { fieldWorkerId: ids.FieldWorkerId },\n  opts', '  request: FastifyRequest,\n  scopeTx: pg.Pool,\n  options: { fieldWorkerId: ids.FieldWorkerId },\n  opts')],
    ['the flag wrapper taking an actorId option', () => mutate('options: { attempts: number },', 'options: { attempts: number; actorId: string },')],
    ['authenticatedScope exported', () => mutate('function authenticatedScope(', 'export function authenticatedScope(')],
  ])('BITE — %s ⇒ a violation', (_label, make) => {
    expect(doorViolations(make())).not.toEqual([]);
  });
});

describe('Story 13.2 AT8 v2 (iv) — the authenticated-Pariwar writer pin (apps/api/src)', () => {
  const apiFiles = walk('apps/api/src');

  it('the files that write `pariwarId` on ANY receiver are EXACTLY the member-session guard and the scope-resolution hook', () => {
    const writers = apiFiles.filter((f) => writerFindings(f, read(f)).pariwarId > 0).sort();
    expect(writers).toEqual([...PARIWAR_WRITERS].sort());
  });

  it('⛔ Object.assign / Reflect.set / Object.defineProperty on a request context; `.requestContext =` only in the request-context middleware', () => {
    expect(apiFiles.filter((f) => writerFindings(f, read(f)).mutation > 0)).toEqual([]);
    expect(apiFiles.filter((f) => writerFindings(f, read(f)).contextAssign > 0)).toEqual([CONTEXT_ASSIGNER]);
  });

  it.each([
    ['ctx.pariwarId = x', 'const ctx = request.requestContext; ctx.pariwarId = x;'],
    ['getRequestContext()!.pariwarId = x', 'getRequestContext()!.pariwarId = x;'],
    ["x['pariwarId'] = y", "x['pariwarId'] = y;"],
    ['??=', 'request.requestContext.pariwarId ??= config.defaultSignupPariwarId;'],
    ['||=', 'ctx.pariwarId ||= header;'],
    ['&&=', 'ctx.pariwarId &&= header;'],
    ['({ pariwarId: ctx.pariwarId } = o)', '({ pariwarId: ctx.pariwarId } = o);'],
    ['({ a: { pariwarId: ctx.pariwarId } } = o)', '({ a: { pariwarId: ctx.pariwarId } } = o);'],
    ['[ctx.pariwarId] = arr', '[ctx.pariwarId] = arr;'],
  ])('BITE — a third writer via %s is caught', (_label, src) => {
    expect(writerFindings('apps/api/src/modules/member/planted.ts', src).pariwarId).toBeGreaterThan(0);
  });

  it.each([
    ['Object.assign(request.requestContext, …)', 'Object.assign(request.requestContext, { pariwarId });'],
    ['Object.assign(getRequestContext()!, …)', 'Object.assign(getRequestContext()!, { pariwarId });'],
    ['Reflect.set(requestContext, …)', "Reflect.set(requestContext, 'pariwarId', p);"],
    ['Object.defineProperty(request.requestContext, …)', "Object.defineProperty(request.requestContext, 'pariwarId', { value: p });"],
  ])('BITE — a context mutation via %s is caught', (_label, src) => {
    expect(writerFindings('apps/api/src/modules/member/planted.ts', src).mutation).toBeGreaterThan(0);
  });

  it('BITE — request.requestContext = { …ctx, pariwarId } outside the request-context middleware is caught', () => {
    expect(writerFindings('apps/api/src/modules/member/planted.ts', 'request.requestContext = { ...ctx, pariwarId };').contextAssign).toBe(1);
  });

  it.each([
    ["request['requestContext'] = { …, pariwarId: v }", "request['requestContext'] = { ...request.requestContext, pariwarId: suppliedValue };"],
    ['Object.assign(request, { requestContext: … })', 'Object.assign(request, { requestContext: { ...ctx, pariwarId: v } });'],
    ['Object.assign(request, { requestContext })', 'Object.assign(request, { requestContext });'],
    ["Reflect.set(request, 'requestContext', …)", "Reflect.set(request, 'requestContext', { ...ctx, pariwarId: v });"],
    ["Object.defineProperty(request, 'requestContext', …)", "Object.defineProperty(request, 'requestContext', { value: c });"],
  ])('BITE (review R2) — a context REPLACEMENT via %s is caught', (_label, src) => {
    expect(writerFindings('apps/api/src/modules/member/planted.ts', src).contextAssign).toBeGreaterThan(0);
  });

  it.each([
    ['Object.assign(ctx, …) on a const alias', 'const ctx = request.requestContext; Object.assign(ctx, { pariwarId: suppliedValue });'],
    ["an alias of request['requestContext']", "const ctx = request['requestContext']; Reflect.set(ctx, 'pariwarId', v);"],
    ['an alias of getRequestContext()!', "const c = getRequestContext()!; Object.defineProperty(c, 'pariwarId', { value: v });"],
    ['a chained alias', 'const a = request.requestContext; const b = a; Object.assign(b, { pariwarId: v });'],
    ["Object.assign(request['requestContext'], …)", "Object.assign(request['requestContext'], { pariwarId: v });"],
  ])('BITE (review R2) — a context mutation via %s is caught', (_label, src) => {
    expect(writerFindings('apps/api/src/modules/member/planted.ts', src).mutation).toBeGreaterThan(0);
  });

  it('NEGATIVE — declarations and shorthand destructuring write a LOCAL and are ⛔ counted', () => {
    for (const src of [
      'const { pariwarId } = request.requestContext;',
      'let { pariwarId } = o;',
      '({ pariwarId } = o);',
      'const pariwarId = request.requestContext.pariwarId;',
      'if (ctx.pariwarId === x) {}',
      // An alias that is only READ, and Object.assign on an unrelated target.
      'const ctx = request.requestContext; void ctx.actorId;',
      'const ctx = request.requestContext; Object.assign(out, { traceId: ctx.traceId });',
    ]) {
      expect(writerFindings('apps/api/src/modules/member/planted.ts', src), src).toEqual({ pariwarId: 0, mutation: 0, contextAssign: 0 });
    }
  });
});
