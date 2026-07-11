// scripts/claim-adjudication-human-actor-invariant/lib.ts
//
// Pure AST scanner for the Story 6.10 human-adjudication invariant (AC4/AC5, D5): every claim-
// ADJUDICATION route (the verifier console today; Story 6.11's approve/deny/escalate next) must be
// composed with the HUMAN-actor guard chain — an authenticated admin SESSION + tenant SCOPE resolution
// + a PERMISSION hook — and must carry NO machine/service/system/null-actor path. This is defense-in-
// depth: the RUNTIME chain is the security control; this gate mechanizes the STRUCTURE so a future
// machine principal cannot be silently wired into an adjudication route ([[feedback_mechanization_split
// _commitment]] — the ₹50L auto-approval failure mode justifies teeth before 6.11's endpoints exist).
//
// STRUCTURED (not a text grep for hook order): it parses the Fastify route registration
// (`r.get('/…', { preHandler: [ … ] }, handler)`) and classifies each preHandler entry by resolving it
// to the HOOK-FACTORY it was constructed from (a `const scope = scopeResolutionHook(deps)` binding is
// resolved to `scope`), so a rename of the local binding cannot fool it and a token inside a comment
// or unrelated string never matches.
//
// A COVERED route is CONFORMANT iff its preHandler chain contains ALL THREE human-actor hooks
//   · a session guard      (requireAdminSession)
//   · a scope resolver     (scopeResolutionHook)
//   · a permission hook     (requirePermissionHook)
// AND contains NO forbidden actor hook (a `system` / `service` / `machine` / `sie` / null-actor
// principal). A missing hook OR a forbidden hook is a finding. Which routes are COVERED is the explicit
// coverage set in check.ts — Story 6.11 MUST add its approve/deny/escalate routes there.

import * as ts from 'typescript';

export interface AdjudicationFinding {
  file: string;
  line: number;
  detail: string;
}

/** The Fastify route-registration method names (`r.get(...)`, `r.post(...)`, …). */
const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

/** Hook-factory callee → the human-actor category it constructs. */
const HOOK_FACTORY_CATEGORY: Record<string, 'session' | 'scope' | 'permission'> = {
  requireAdminSession: 'session',
  scopeResolutionHook: 'scope',
  requirePermissionHook: 'permission',
};

/** A forbidden actor-hook factory: a machine/service/system/SIE/null-actor principal on an adjudication
 *  route. Matched on the FACTORY callee name (structured), never a bare string/comment. */
const FORBIDDEN_HOOK_RE = /system|service|machine|\bsie\b|null_?actor|nullactor|serviceaccount|serviceprincipal/i;

/** Name-heuristic fallback for a preHandler identifier NOT bound to a local hook-factory const (e.g. a
 *  directly-imported guard). Conservative: only classifies clearly-named guards — a bare `require*`
 *  prefix is NOT enough (a disguised machine-actor hook like `requireWorkerToken` must NOT be credited
 *  as the permission hook; leaving it unclassified correctly fails the route as missing one). */
function categoryFromName(name: string): 'session' | 'scope' | 'permission' | null {
  const n = name.toLowerCase();
  if (n.includes('adminsession') || n === 'session') return 'session';
  if (n.includes('scope')) return 'scope';
  if (n.includes('permission')) return 'permission';
  return null;
}

/** One classified route registration found in a source file. */
export interface RouteRegistration {
  method: string;
  path: string;
  line: number;
  hooks: { session: boolean; scope: boolean; permission: boolean };
  /** The forbidden actor-hook factory/identifier names found in the chain (empty when clean). */
  forbidden: string[];
  /** True when the route options carried a `preHandler` array at all. */
  hasPreHandlerArray: boolean;
  /** preHandler elements that could NOT be statically classified (e.g. a spread `...hooks`) — a hidden
   *  forbidden hook could be lurking inside, so these fail the route rather than being silently ignored. */
  unresolved: string[];
}

/**
 * Parse a source file and return EVERY Fastify route registration with its preHandler chain classified.
 * `check.ts` filters these to the explicit coverage set and evaluates conformance.
 */
export function scanRouteRegistrations(file: string, source: string): RouteRegistration[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);

  // (1) Collect `const <id> = <factory>(…)` bindings → factory callee name (for structured resolution).
  const bindingFactory = new Map<string, string>();
  const collectBindings = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callee = node.initializer.expression;
      if (ts.isIdentifier(callee)) bindingFactory.set(node.name.text, callee.text);
    }
    ts.forEachChild(node, collectBindings);
  };
  collectBindings(sf);

  const registrations: RouteRegistration[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      if (ROUTE_METHODS.has(method)) {
        const [pathArg, optionsArg] = node.arguments;
        if (pathArg && (ts.isStringLiteral(pathArg) || ts.isNoSubstitutionTemplateLiteral(pathArg))) {
          const path = pathArg.text;
          const reg = classifyRoute(sf, method, path, node, optionsArg, bindingFactory);
          if (reg) registrations.push(reg);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return registrations;
}

function classifyRoute(
  sf: ts.SourceFile,
  method: string,
  path: string,
  callNode: ts.CallExpression,
  optionsArg: ts.Expression | undefined,
  bindingFactory: Map<string, string>,
): RouteRegistration | null {
  const { line } = sf.getLineAndCharacterOfPosition(callNode.getStart(sf));
  const hooks = { session: false, scope: false, permission: false };
  const forbidden: string[] = [];
  const unresolved: string[] = [];
  let hasPreHandlerArray = false;

  if (optionsArg && ts.isObjectLiteralExpression(optionsArg)) {
    for (const prop of optionsArg.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'preHandler' &&
        ts.isArrayLiteralExpression(prop.initializer)
      ) {
        hasPreHandlerArray = true;
        for (const el of prop.initializer.elements) {
          classifyPreHandlerElement(el, bindingFactory, hooks, forbidden, unresolved);
        }
      }
    }
  }

  return { method, path, line: line + 1, hooks, forbidden, hasPreHandlerArray, unresolved };
}

/** Classify one preHandler array element into a hook category / forbidden marker. Any element shape this
 *  cannot statically resolve (e.g. a spread `...hooks`, a conditional expression) is recorded as
 *  `unresolved` rather than silently skipped — a forbidden hook could be hiding inside it, so the route
 *  must fail rather than pass on an unexamined element. */
function classifyPreHandlerElement(
  el: ts.Expression,
  bindingFactory: Map<string, string>,
  hooks: { session: boolean; scope: boolean; permission: boolean },
  forbidden: string[],
  unresolved: string[],
): void {
  if (ts.isSpreadElement(el)) {
    unresolved.push(`...${el.expression.getText()}`);
    return;
  }
  // An inline factory call — `requirePermissionHook(deps, KEY, …)` / `someSystemHook(deps)`.
  if (ts.isCallExpression(el) && ts.isIdentifier(el.expression)) {
    applyFactory(el.expression.text, hooks, forbidden);
    return;
  }
  // An identifier — resolve via its local `const = factory(...)` binding, else the name heuristic.
  if (ts.isIdentifier(el)) {
    const factory = bindingFactory.get(el.text);
    if (factory) {
      applyFactory(factory, hooks, forbidden);
      return;
    }
    if (FORBIDDEN_HOOK_RE.test(el.text)) {
      forbidden.push(el.text);
      return;
    }
    const cat = categoryFromName(el.text);
    if (cat) hooks[cat] = true;
    return;
  }
  unresolved.push(el.getText());
}

function applyFactory(
  factory: string,
  hooks: { session: boolean; scope: boolean; permission: boolean },
  forbidden: string[],
): void {
  if (FORBIDDEN_HOOK_RE.test(factory)) {
    forbidden.push(factory);
    return;
  }
  const cat = HOOK_FACTORY_CATEGORY[factory] ?? categoryFromName(factory);
  if (cat) hooks[cat] = true;
}

/**
 * Evaluate ONE covered adjudication route registration for conformance. Returns the findings (empty when
 * conformant): a missing session/scope/permission hook, or any forbidden machine/service actor hook.
 */
export function evaluateAdjudicationRoute(file: string, reg: RouteRegistration): AdjudicationFinding[] {
  const findings: AdjudicationFinding[] = [];
  const base = `${reg.method.toUpperCase()} ${reg.path}`;
  if (!reg.hasPreHandlerArray) {
    findings.push({ file, line: reg.line, detail: `${base} — adjudication route has NO preHandler chain (no human-actor guard)` });
    return findings;
  }
  if (!reg.hooks.session) {
    findings.push({ file, line: reg.line, detail: `${base} — missing the admin SESSION guard (requireAdminSession)` });
  }
  if (!reg.hooks.scope) {
    findings.push({ file, line: reg.line, detail: `${base} — missing the tenant SCOPE resolver (scopeResolutionHook)` });
  }
  if (!reg.hooks.permission) {
    findings.push({ file, line: reg.line, detail: `${base} — missing the PERMISSION hook (requirePermissionHook)` });
  }
  for (const f of reg.forbidden) {
    findings.push({ file, line: reg.line, detail: `${base} — forbidden non-human actor hook \`${f}\` on an adjudication route` });
  }
  for (const u of reg.unresolved) {
    findings.push({
      file,
      line: reg.line,
      detail: `${base} — preHandler element \`${u}\` could not be statically classified (spread/dynamic expression) — a forbidden hook could be hiding inside it; rewrite as explicit hook identifiers/calls`,
    });
  }
  return findings;
}

/**
 * Scan a file for adjudication routes whose path contains any of `coveredPathSubstrings`, and return
 * `{ findings, matchedPaths }`. `matchedPaths` lets check.ts assert the coverage entry was actually
 * present (a coverage entry that matches NO route is itself a failure — missing coverage, never a
 * silent skip). A non-covered route in the same file is ignored (it is not an adjudication route).
 */
export function scanAdjudicationRoutes(
  file: string,
  source: string,
  coveredPathSubstrings: readonly string[],
): { findings: AdjudicationFinding[]; matchedPaths: string[] } {
  const regs = scanRouteRegistrations(file, source);
  const findings: AdjudicationFinding[] = [];
  const matchedPaths: string[] = [];
  for (const reg of regs) {
    if (coveredPathSubstrings.some((sub) => reg.path.includes(sub))) {
      matchedPaths.push(reg.path);
      findings.push(...evaluateAdjudicationRoute(file, reg));
    }
  }
  return { findings, matchedPaths };
}

export function formatFinding(f: AdjudicationFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    `Every claim-adjudication route MUST compose the HUMAN-actor chain [requireAdminSession, ` +
    `scopeResolutionHook, requirePermissionHook(...)] and carry NO machine/service/system actor ` +
    `(Story 6.10 AC4/AC5). See scripts/claim-adjudication-human-actor-invariant/README.md.`
  );
}
