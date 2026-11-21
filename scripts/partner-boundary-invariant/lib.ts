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
const SQL_WRITE = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:ONLY\s+)?"?([a-z_][a-z0-9_]*)"?/g;
/** Packages that ARE an authority (rule (c), jobs files): their truth is never the transport's to read or write. */
export const AUTHORITY_PACKAGES: readonly string[] = ['@twt/validity-service'];
/** The function rule (b)'s member-read leg judges — it must exist in `lead-handoff.ts` as a named declaration. */
export const MEMBER_STATUS_READ = 'getLeadHandoffStatus';
const DOMAIN_TRANSPORT_FILE = 'packages/domain/src/marketplace/lead-handoff.ts';

/** `./../member/x.js` → `../member/x.js`: one spelling per relative specifier, so a detour cannot dodge the directory match. */
function normaliseSpecifier(spec: string): string {
  if (!spec.startsWith('.')) return spec;
  const out: string[] = [];
  for (const part of spec.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..' && out.length > 0 && out[out.length - 1] !== '..') out.pop();
    else out.push(part);
  }
  const joined = out.join('/');
  return joined.startsWith('..') ? joined : `./${joined}`;
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
    const spec = normaliseSpecifier(stmt.moduleSpecifier.text);
    const clause = stmt.importClause;
    if (clause === undefined || clause.isTypeOnly) continue;

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

    const dir = Object.keys(AUTHORITY_MODULE_DIRS).find((d) => spec.startsWith(d));
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
    const spec = normaliseSpecifier(stmt.moduleSpecifier.text);
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
 * ⭐ Rule (e). Every `createPartnerLeadClient(` call has ZERO arguments (production passes no test seam) — under an import ALIAS too
 * (`import { createPartnerLeadClient as mk }`), and `.call(` / `.apply(` / `.bind(` on it fail (each can carry the seam).
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
  const isFactory = (e: ts.Expression): boolean => (ts.isIdentifier(e) ? names.has(e.text) : ts.isPropertyAccessExpression(e) && e.name.text === SEAM_FACTORY);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (isFactory(callee) && node.arguments.length > 0) {
        out.push({ rule: 'e', file, line: lineOf(sf, node), what: 'createPartnerLeadClient( is called WITH an argument (a test seam in production)' });
      }
      if (ts.isPropertyAccessExpression(callee) && ['call', 'apply', 'bind'].includes(callee.name.text) && isFactory(callee.expression)) {
        out.push({ rule: 'e', file, line: lineOf(sf, node), what: `createPartnerLeadClient.${callee.name.text}( — an indirect call can carry a test seam` });
      }
    }
    ts.forEachChild(node, visit);
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
