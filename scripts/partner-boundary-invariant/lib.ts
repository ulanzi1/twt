// scripts/partner-boundary-invariant/lib.ts
//
// The pure scanner behind Story 12.5's boundary fence (Decision `2026-11-21-483` QE15; I3, I4, I9; AC10). Epic 12.5's boundary AC, in its
// own words: partner integrations "consume explicitly consented lead-handoff events only" and "must NOT become authoritative sources of
// member lifecycle, validity, contribution, or claim-state truth". Four STATIC rules (rule (a) — ⛔ inbound partner route — is a live
// route-registry spec in apps/api, because a path built at runtime is invisible to a text scan):
//
//   (b) ADVISORY ONLY — the stored partner value's names (`partner_reference`, `partnerReference`) appear ONLY in the four files that may
//       touch it (`REFERENCE_ALLOWED_FILES`), anywhere under the three source roots — as an identifier, a property name, or inside a
//       string (raw SQL names the column). And inside `lead-handoff.ts`, ⛔ in `getLeadHandoffStatus` (the member-facing read) — which
//       MUST exist there as a named function declaration, so the leg cannot pass on nothing.
//   (c) ⛔ AUTHORITY IMPORT — in the four transport files, every use of the `member`, `consent`, `claim`, `contribution`, `pool` and
//       `validityCache` namespaces (jobs files: through the `@twt/domain` barrel) or a named VALUE import from their modules (domain
//       files: by relative path) must be on `AUTHORITY_READ_ALLOWLIST` — the READS P0–P5 need. Anything else (a write entry point, a
//       namespace passed whole) fails. Type-only imports carry no behaviour and are not judged. The ways AROUND an import scan fail too
//       (code review 2026-11-22, patch 8): the domain barrel, a deep `@twt/domain/…` path, an authority PACKAGE, a dynamic `import(` /
//       `require(`, a re-export, and a raw-SQL WRITE to any table but the transport's own. And the scan must not be vacuous:
//       `lead-handoff.ts` must import EXACTLY the allow-listed reads (`authorityReadsImported`; check.ts compares).
//   (d) THE RESPONSE BODY IS NEVER PARSED — ⛔ `JSON.parse(` and ⛔ `.json(` in `partner-lead-client.ts`.
//   (e) ⛔ TEST SEAM IN PRODUCTION — every `createPartnerLeadClient(` call under `apps/jobs/src` has ZERO arguments — under an import
//       alias too; `.call` / `.apply` / `.bind` on it fail.
//
// AST-detected (the kyc-provider-boundary / member-state-invariant shape): a name in a COMMENT never matches. ⚠ The SEMANTIC limit is
// stated in the README: this proves the ABSENCE of the patterns it names — ⛔ that no future code path could launder partner data
// ([[feedback_gate_scope_semantic_coverage]]). The ADR names the review question every inbound integration must answer.

import * as path from 'node:path';

import * as ts from 'typescript';

export interface BoundaryFinding {
  readonly rule: 'b' | 'c' | 'd' | 'e';
  readonly file: string;
  readonly line: number;
  readonly what: string;
}

/** The roots rule (b) scans (repo-relative). */
export const SCAN_ROOTS: readonly string[] = ['packages/domain/src', 'apps/api/src', 'apps/jobs/src'];

/** The four files that may name the advisory reference (QE15 (b)) — and the four rule (c) judges. */
export const REFERENCE_ALLOWED_FILES: readonly string[] = [
  'packages/domain/src/schema/marketplace_lead_handoffs.ts',
  'packages/domain/src/marketplace/lead-handoff.ts',
  'apps/jobs/src/scheduler/module-lead-handoff.ts',
  'apps/jobs/src/scheduler/partner-lead-client.ts',
];

/** Rule (c)'s files: the transport itself (the schema file holds no logic). */
export const TRANSPORT_FILES: readonly string[] = [
  'packages/domain/src/marketplace/lead-handoff.ts',
  'packages/domain/src/marketplace/lead-envelope.ts',
  'apps/jobs/src/scheduler/module-lead-handoff.ts',
  'apps/jobs/src/scheduler/partner-lead-client.ts',
];

/** Rule (d)'s file. */
export const CLIENT_FILE = 'apps/jobs/src/scheduler/partner-lead-client.ts';
/** Rule (e)'s root. */
export const JOBS_SRC_ROOT = 'apps/jobs/src';
/** Rule (e)'s factory. */
const SEAM_FACTORY = 'createPartnerLeadClient';

/** The advisory reference's two spellings. */
export const REFERENCE_NAMES: readonly string[] = ['partner_reference', 'partnerReference'];
const REFERENCE_IN_TEXT = /\b(partner_reference|partnerReference)\b/;

/** The authority namespaces (QE15 (c)). */
export const AUTHORITY_NAMESPACES: readonly string[] = ['member', 'consent', 'claim', 'contribution', 'pool', 'validityCache'];

/** ⭐ The READS the transport may use — as namespace paths (jobs files) … */
export const AUTHORITY_READ_ALLOWLIST: readonly string[] = [
  'member.memberExists',
  'member.getCurrentMemberState',
  'member.listAccountFrozenMemberIds',
  'member.moderation.getCurrentMemberModerationOverlay',
  'claim.isDeathReportStanding',
  'consent.listConsentsForArtifact',
  'consent.resolveConsentById',
];

/** … and as (relative module, name) pairs (domain files). The module dirs that count as authority, keyed by their namespace. */
export const AUTHORITY_MODULE_DIRS: Readonly<Record<string, string>> = {
  '../member/': 'member',
  '../consent/': 'consent',
  '../claim/': 'claim',
  '../contribution/': 'contribution',
  '../pool/': 'pool',
  '../validity-cache/': 'validityCache',
};
export const AUTHORITY_IMPORT_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  '../member/read.js': ['memberExists', 'getCurrentMemberState'],
  '../member/overlay.js': ['listAccountFrozenMemberIds'],
  '../member/moderation/overlay.js': ['getCurrentMemberModerationOverlay'],
  '../claim/death-report.js': ['isDeathReportStanding'],
  '../consent/read.js': ['listConsentsForArtifact', 'resolveConsentById'],
};

/** The transport's OWN table — the only one a transport file may write by raw SQL (rule (c)). */
export const TRANSPORT_TABLE = 'marketplace_lead_handoffs';
/** A raw-SQL write and the table it names. House SQL is upper-case keywords and lower-case names, so prose ("update the …") and
 *  `FOR UPDATE OF h` / `FOR UPDATE SKIP LOCKED` never match. */
const SQL_WRITE = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|TRUNCATE(?:\s+TABLE)?)\s+(?:ONLY\s+)?"?([a-z_][a-z0-9_]*)"?/g;
/** A read of EVERY column (rule (b)): `SELECT *`, `RETURNING *`, `t.*` — it returns the advisory reference without naming it. */
const SQL_VERB = /\b(select|returning)\b/i;
/** A whole-row value: `to_json(h)`, `to_jsonb(h)`, `row_to_json(h)` — every column, under no name. */
const SQL_WHOLE_ROW = /\b(to_jsonb?|row_to_json)\s*\(/i;
/**
 * ⭐ Rule (b)'s "every column" test on ONE SQL string (code review 2026-11-22, rounds 2 and 3): a string that holds `SELECT` or
 * `RETURNING` and, once every `count(*)` / `(*)` is taken out, still holds a `*` (`SELECT *`, `t.*`, `"t".*`, `lead_id, *`,
 * `DISTINCT ON (…) *`, any case); or a whole-row JSON value. A string without the verb is not SQL here — a regex source is not judged.
 */
function readsEveryColumn(text: string): boolean {
  if (!SQL_VERB.test(text)) return false;
  return /\*/.test(text.replace(/\(\s*\*\s*\)/g, '')) || SQL_WHOLE_ROW.test(text);
}
/** The query builder's whole-row reads (rule (b)): a relational `findFirst` / `findMany`, and `getTableColumns(`. */
const BUILDER_WHOLE_ROW = ['findFirst', 'findMany', 'getTableColumns'];
/** Packages that ARE an authority (rule (c), jobs files): their truth is never the transport's to read or write. */
export const AUTHORITY_PACKAGES: readonly string[] = ['@twt/validity-service'];
/** The function rule (b)'s member-read leg judges — it must exist in `lead-handoff.ts` as a named declaration. */
export const MEMBER_STATUS_READ = 'getLeadHandoffStatus';
const DOMAIN_TRANSPORT_FILE = 'packages/domain/src/marketplace/lead-handoff.ts';

/** The directory every domain transport file sits in — the base the allow-list's relative specifiers are written from. */
const DOMAIN_TRANSPORT_DIR = 'packages/domain/src/marketplace';
const DOMAIN_SRC = 'packages/domain/src';

/**
 * ONE spelling per module, by RESOLVING (code review 2026-11-22, round 2): a relative specifier is joined to the importing file's
 * directory and normalised, so `../../src/consent/write.js` IS `../consent/write.js`. Returns the repo path it lands on (`resolved`) and,
 * for a domain file, the specifier rewritten relative to {@link DOMAIN_TRANSPORT_DIR} (`spec`) — the form the allow-list is keyed by.
 * A bare specifier (`@twt/domain`, `node:crypto`) is returned as it is, with `resolved` null.
 */
function resolveSpecifier(file: string, raw: string): { spec: string; resolved: string | null } {
  if (!raw.startsWith('.')) return { spec: raw, resolved: null };
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), raw));
  if (!file.startsWith(`${DOMAIN_SRC}/`)) return { spec: raw, resolved };
  const rel = path.posix.relative(DOMAIN_TRANSPORT_DIR, resolved);
  return { spec: rel.startsWith('..') ? rel : `./${rel}`, resolved };
}

const parse = (file: string, source: string): ts.SourceFile => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const lineOf = (sf: ts.SourceFile, node: ts.Node): number => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

/** The text of a string-ish node (a literal or any template piece), else null. */
function stringText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) return node.text;
  return null;
}

/** Every place `node` names the advisory reference: an identifier / private name, or a string containing it. */
function referenceHits(sf: ts.SourceFile, root: ts.Node): Array<{ line: number; what: string }> {
  const hits: Array<{ line: number; what: string }> = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && REFERENCE_NAMES.includes(node.text)) {
      hits.push({ line: lineOf(sf, node), what: `names \`${node.text}\`` });
    } else {
      const text = stringText(node);
      if (text !== null && REFERENCE_IN_TEXT.test(text)) hits.push({ line: lineOf(sf, node), what: 'a string names the advisory reference' });
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return hits;
}

/**
 * ⭐ Rule (b). Outside `REFERENCE_ALLOWED_FILES` ANY mention fails; inside `lead-handoff.ts`, a mention inside `getLeadHandoffStatus` fails
 * (the member-facing status read never returns it).
 */
export function scanReferenceNames(file: string, source: string): BoundaryFinding[] {
  const sf = parse(file, source);
  if (!REFERENCE_ALLOWED_FILES.includes(file)) {
    return referenceHits(sf, sf).map((h) => ({ rule: 'b' as const, file, ...h }));
  }
  const out: BoundaryFinding[] = [];
  if (file === DOMAIN_TRANSPORT_FILE) {
    let found = false;
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === MEMBER_STATUS_READ && node.body !== undefined) {
        found = true;
        for (const h of referenceHits(sf, node.body)) out.push({ rule: 'b', file, line: h.line, what: `${MEMBER_STATUS_READ} ${h.what}` });
        // A read of every column returns the reference WITHOUT naming it (code review 2026-11-22, round 2): `SELECT *` / `RETURNING *`
        // / `t.*` in SQL, and the query builder's `.select()` / `.returning()` with no column list.
        const star = (n: ts.Node): void => {
          const text = stringText(n);
          if (text !== null && readsEveryColumn(text)) out.push({ rule: 'b', file, line: lineOf(sf, n), what: `${MEMBER_STATUS_READ} reads every column (a \`*\` or a whole-row value)` });
          if (ts.isCallExpression(n)) {
            const callee = n.expression;
            const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : null;
            if (name !== null && ['select', 'returning'].includes(name) && ts.isPropertyAccessExpression(callee) && n.arguments.length === 0) {
              out.push({ rule: 'b', file, line: lineOf(sf, n), what: `${MEMBER_STATUS_READ} calls .${name}() with no column list` });
            }
            if (name !== null && BUILDER_WHOLE_ROW.includes(name)) out.push({ rule: 'b', file, line: lineOf(sf, n), what: `${MEMBER_STATUS_READ} calls ${name}( — a whole-row read` });
          }
          ts.forEachChild(n, star);
        };
        star(node.body);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    // ⚠ Not vacuous: a rename, or a rewrite as an arrow constant, would otherwise leave this leg judging nothing — and green.
    if (!found) {
      out.push({ rule: 'b', file, line: 1, what: `no function declaration named \`${MEMBER_STATUS_READ}\` — the member-facing read must stay one, so this rule can judge it` });
    }
  }
  return out;
}

/** The dotted path of a property-access chain rooted at an identifier (`a.b.c`), or null. */
function dottedPath(node: ts.Expression): string | null {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    const left = dottedPath(node.expression);
    return left === null ? null : `${left}.${node.name.text}`;
  }
  return null;
}

/**
 * ⭐ Rule (c). Jobs files: the authority namespaces imported from `@twt/domain` — each USE must be an allow-listed dotted path (the longest
 * chain at the use site); a bare use (passed, destructured, spread) fails. Domain files: a VALUE import from an authority module must be
 * an allow-listed (module, name) pair; a namespace import from one fails. Both: the ways AROUND an import scan fail — the domain barrel,
 * a deep `@twt/domain/…` path, an authority package, a re-export, a dynamic `import(` / `require(`, and a raw-SQL write to a table that
 * is not the transport's own.
 */
export function scanAuthorityUse(file: string, source: string): BoundaryFinding[] {
  const sf = parse(file, source);
  const out: BoundaryFinding[] = [];
  const push = (node: ts.Node, what: string): void => {
    out.push({ rule: 'c', file, line: lineOf(sf, node), what });
  };
  const inDomain = file.startsWith('packages/domain/src/');

  // ── The ways around an import scan ──
  const around = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) push(node, 'a dynamic `import(` — what it loads cannot be judged');
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') push(node, 'a `require(` — what it loads cannot be judged');
    }
    if (ts.isImportEqualsDeclaration(node)) push(node, 'an `import … = require(` — what it loads cannot be judged');
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) push(node, 'a re-export — a transport file passes nothing on');
    const text = stringText(node);
    if (text !== null) {
      for (const m of text.matchAll(SQL_WRITE)) {
        if (m[2] !== TRANSPORT_TABLE) push(node, `raw SQL writes \`${m[2] ?? '?'}\` (${(m[1] ?? '').replace(/\s+/g, ' ')}) — the transport writes only \`${TRANSPORT_TABLE}\``);
      }
    }
    ts.forEachChild(node, around);
  };
  around(sf);

  // Local names bound to an authority namespace from the `@twt/domain` barrel.
  const locals = new Map<string, string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const { spec, resolved } = resolveSpecifier(file, stmt.moduleSpecifier.text);
    const clause = stmt.importClause;

    // A relative import that LEAVES the file's own source root reaches code no rule here judges (a jobs file into
    // `packages/domain/src`, a domain file out of `packages/domain/src`) — a side-effect import too (round 3: it runs that module's
    // top-level code). A TYPE-only import carries no behaviour.
    if (resolved !== null && clause?.isTypeOnly !== true) {
      const root = inDomain ? DOMAIN_SRC : JOBS_SRC_ROOT;
      if (resolved !== root && !resolved.startsWith(`${root}/`)) push(stmt, `a relative import out of ${root} (${stmt.moduleSpecifier.text}) — only that root's own modules are judged`);
    }
    if (clause === undefined) {
      // A side-effect import of an authority module runs its code with nothing named — ⛔ a read the allow-list can admit.
      const dir = Object.keys(AUTHORITY_MODULE_DIRS).find((d) => spec.startsWith(d) || spec === d.slice(0, -1));
      if (dir !== undefined || spec === '@twt/domain' || spec.startsWith('@twt/domain/')) push(stmt, `a side-effect import of ${spec} — its code runs with nothing judged`);
      continue;
    }
    if (clause.isTypeOnly) continue;

    if (spec.startsWith('@twt/domain/')) push(stmt, `a deep import of ${spec} — only the \`@twt/domain\` barrel's namespaces are judged`);
    if (AUTHORITY_PACKAGES.includes(spec) || AUTHORITY_PACKAGES.some((p) => spec.startsWith(`${p}/`))) push(stmt, `imports the authority package ${spec}`);
    if (inDomain && /^\.\.(\/\.\.)*(\/index(\.js|\.ts)?)?$/.test(spec)) push(stmt, `imports the domain barrel (${spec}) — every authority namespace at once`);

    if (spec === '@twt/domain' && clause.namedBindings !== undefined) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        push(stmt, 'imports the whole `@twt/domain` barrel as a namespace');
      } else {
        for (const el of clause.namedBindings.elements) {
          if (el.isTypeOnly) continue;
          const imported = (el.propertyName ?? el.name).text;
          if (AUTHORITY_NAMESPACES.includes(imported)) locals.set(el.name.text, imported);
        }
      }
    }

    // The directory itself (`../consent`, which resolves to its index) counts as that directory.
    const dir = Object.keys(AUTHORITY_MODULE_DIRS).find((d) => spec.startsWith(d) || spec === d.slice(0, -1));
    if (dir !== undefined) {
      if (clause.name !== undefined) push(stmt, `a default import from ${spec}`);
      const bindings = clause.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
        push(stmt, `a namespace import of ${spec}`);
      } else if (bindings !== undefined) {
        for (const el of bindings.elements) {
          if (el.isTypeOnly) continue;
          const imported = (el.propertyName ?? el.name).text;
          if (!(AUTHORITY_IMPORT_ALLOWLIST[spec] ?? []).includes(imported)) push(el, `imports \`${imported}\` from ${spec} (⛔ on the read allow-list)`);
        }
      }
    }
  }

  if (locals.size > 0) {
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && locals.has(node.text)) {
        const parent = node.parent;
        const isImportBinding = ts.isImportSpecifier(parent);
        if (!isImportBinding) {
          // Climb to the longest property-access chain this identifier roots.
          let top: ts.Expression = node;
          while (ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top) top = top.parent;
          const path = dottedPath(top);
          const canonical = path === null ? null : `${locals.get(node.text)!}${path.slice(node.text.length)}`;
          if (canonical === null || !AUTHORITY_READ_ALLOWLIST.includes(canonical)) {
            push(node, canonical === null || canonical === locals.get(node.text) ? `uses the \`${locals.get(node.text)!}\` namespace whole` : `uses \`${canonical}\` (⛔ on the read allow-list)`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

/**
 * Rule (c), NOT VACUOUS: the allow-listed reads a domain transport file actually imports, as `module#name`. check.ts requires
 * `lead-handoff.ts` to import EXACTLY `AUTHORITY_IMPORT_ALLOWLIST` — so the predicates moving to another file (which rule (c) would then
 * not judge) or an allowance nothing uses both fail.
 */
export function authorityReadsImported(file: string, source: string): string[] {
  const sf = parse(file, source);
  const seen: string[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const { spec } = resolveSpecifier(file, stmt.moduleSpecifier.text);
    const bindings = stmt.importClause?.namedBindings;
    if (stmt.importClause === undefined || stmt.importClause.isTypeOnly || bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) {
      if (el.isTypeOnly) continue;
      const imported = (el.propertyName ?? el.name).text;
      if ((AUTHORITY_IMPORT_ALLOWLIST[spec] ?? []).includes(imported)) seen.push(`${spec}#${imported}`);
    }
  }
  return seen.sort();
}

/** Every (module, name) pair of the allow-list, as `module#name`, sorted — what {@link authorityReadsImported} must equal. */
export function authorityReadAllowlistPairs(): string[] {
  return Object.entries(AUTHORITY_IMPORT_ALLOWLIST)
    .flatMap(([spec, names]) => names.map((n) => `${spec}#${n}`))
    .sort();
}

/** ⭐ Rule (d). ⛔ `JSON.parse(` and ⛔ `.json(` — the response body is never parsed. */
export function scanBodyParsing(file: string, source: string): BoundaryFinding[] {
  const sf = parse(file, source);
  const out: BoundaryFinding[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const path = dottedPath(node.expression);
      if (path === 'JSON.parse') out.push({ rule: 'd', file, line: lineOf(sf, node), what: 'calls JSON.parse(' });
      else if (node.expression.name.text === 'json') out.push({ rule: 'd', file, line: lineOf(sf, node), what: 'calls .json(' });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * ⭐ Rule (e). Production passes no test seam: every REFERENCE to `createPartnerLeadClient` — or to an import alias of it — under
 * `apps/jobs/src` must be the callee of a call with ZERO arguments (or its own definition, or an import binding). Anything else fails,
 * because it can carry the seam: an argument; `.call(` / `.apply(` / `.bind(`; `const mk = createPartnerLeadClient`; passing it
 * (`Reflect.apply(createPartnerLeadClient, …)`); `(createPartnerLeadClient)(…)`; a re-export (code review 2026-11-22, round 2).
 * Type positions (`typeof createPartnerLeadClient`, `typeof import('…').createPartnerLeadClient`) and keys (a property, a method or
 * an interface member named like it) carry no behaviour and are not judged; `createPartnerLeadClient!()` is a direct call. Round 3: a
 * STRING-keyed access (`ns['createPartnerLeadClient']`) is a reference too, and a namespace import or an `export *` of the client
 * module fails outright (what it is used for cannot be followed). ⚠ A key BUILT at run time is not seen (README).
 */
export function scanSeamCalls(file: string, source: string): BoundaryFinding[] {
  const sf = parse(file, source);
  const out: BoundaryFinding[] = [];
  const names = new Set<string>([SEAM_FACTORY]);
  for (const stmt of sf.statements) {
    const bindings = ts.isImportDeclaration(stmt) ? stmt.importClause?.namedBindings : undefined;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const el of bindings.elements) if ((el.propertyName ?? el.name).text === SEAM_FACTORY) names.add(el.name.text);
  }
  const push = (node: ts.Node, what: string): void => {
    out.push({ rule: 'e', file, line: lineOf(sf, node), what });
  };
  // The client module taken WHOLE — a namespace import or `export *` — hands the factory on under no name.
  for (const stmt of sf.statements) {
    const spec = (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) && stmt.moduleSpecifier !== undefined && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
    if (spec === null || !/(^|\/)partner-lead-client(\.js|\.ts)?$/.test(spec)) continue;
    if (ts.isImportDeclaration(stmt) && stmt.importClause?.namedBindings !== undefined && ts.isNamespaceImport(stmt.importClause.namedBindings) && !stmt.importClause.isTypeOnly) {
      push(stmt, 'a namespace import of the client module — the factory can be reached under no name');
    }
    if (ts.isExportDeclaration(stmt) && stmt.exportClause === undefined && !stmt.isTypeOnly) push(stmt, '`export *` of the client module — another file could call the factory with a test seam');
  }
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && names.has(node.text)) judge(node);
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === SEAM_FACTORY) judgeRef(node);
    ts.forEachChild(node, visit);
  };
  const judge = (id: ts.Identifier): void => {
    const parent = id.parent;
    if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) return;
    if (ts.isFunctionDeclaration(parent) && parent.name === id) return;
    if (ts.isTypeQueryNode(parent) || ts.isQualifiedName(parent) || ts.isImportTypeNode(parent)) return;
    // A KEY named like it (`{ createPartnerLeadClient: … }`, a method, a class field, an interface member) is not a reference.
    if (
      (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent)) &&
      parent.name === id
    ) {
      return;
    }
    // `x.createPartnerLeadClient` — the property access is the reference; `createPartnerLeadClient.call` — the identifier is.
    judgeRef(ts.isPropertyAccessExpression(parent) && parent.name === id ? parent : id);
  };
  const judgeRef = (start: ts.Expression): void => {
    // `createPartnerLeadClient!` is the same reference.
    let ref: ts.Expression = start;
    while (ts.isNonNullExpression(ref.parent) && ref.parent.expression === ref) ref = ref.parent;
    const holder = ref.parent;
    if (ts.isCallExpression(holder) && holder.expression === ref) {
      if (holder.arguments.length > 0) push(holder, 'createPartnerLeadClient( is called WITH an argument (a test seam in production)');
      return;
    }
    if (ts.isPropertyAccessExpression(holder) && holder.expression === ref && ['call', 'apply', 'bind'].includes(holder.name.text)) {
      push(holder, `createPartnerLeadClient.${holder.name.text}( — an indirect call can carry a test seam`);
      return;
    }
    if (ts.isExportSpecifier(holder)) {
      push(holder, 'a re-export of createPartnerLeadClient — another file could call it with a test seam');
      return;
    }
    push(ref, 'a reference to createPartnerLeadClient that is not a direct zero-argument call (an alias, a pass, a wrapper) — it can carry a test seam');
  };
  visit(sf);
  return out;
}

/** All four rules over one file, by its repo-relative path. */
export function scanFile(file: string, source: string): BoundaryFinding[] {
  const out = [...scanReferenceNames(file, source)];
  if (TRANSPORT_FILES.includes(file)) out.push(...scanAuthorityUse(file, source));
  if (file === CLIENT_FILE) out.push(...scanBodyParsing(file, source));
  if (file.startsWith(`${JOBS_SRC_ROOT}/`)) out.push(...scanSeamCalls(file, source));
  return out;
}

export function formatFinding(f: BoundaryFinding): string {
  return `  ✗ rule (${f.rule}) ${f.file}:${String(f.line)} — ${f.what}`;
}
