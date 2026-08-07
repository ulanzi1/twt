// scripts/custom-field-governance/lib.ts
//
// Pure, importable logic for the custom-field-governance CI gate (Story 10.12, AC3 layer 3).
// Side-effect-free and fixture-tested (lib.test.ts); the impure orchestration (fs, process.exit)
// lives in check.ts — the scripts/governance-boundary and scripts/member-state-invariant house style.
//
// ⚠ READ THE SCOPE LIMIT BEFORE TRUSTING THIS GATE. Custom-field definitions are DATABASE ROWS
// authored at runtime by tenant admins. This gate CANNOT scan them, and does not pretend to. What it
// asserts is what CI can actually prove about committed source:
//
//   (a) DENYLIST SUPERSET — the domain denylist (`CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS`) covers every
//       `forbidden_column` pattern the FR-100 registry declares. This is what stops the two drifting:
//       a v2 addition to `fr-100-non-add.yaml` that nobody mirrored into the custom-field fence would
//       otherwise leave a newly-frozen column name authorable as a custom field.
//
//   (b) SOLE-WRITER — `insert(pariwarCustomFieldDefinitions)` appears ONLY inside the sanctioned
//       writer module. Layer 1 (the runtime fence) protects exactly one code path; a second INSERT
//       site elsewhere in the repo would bypass it entirely while every test stayed green.
//
// The thing NEITHER leg proves is that no forbidden definition row EXISTS in some tenant database.
// That is what layer 1 (runtime, `custom-fields/frozen-governance.ts`) and layer 2 (the DB CHECK
// `pariwar_custom_field_definitions_frozen_key_ck`, migration 0095) are for. Three layers, none of
// them sufficient alone. See README.md.

import * as ts from 'typescript';

// ─────────────────────────────────────────────────────────────────────────────
// Leg (a) — denylist ⊇ fr-100 forbidden_column
// ─────────────────────────────────────────────────────────────────────────────

/** The outcome of the superset check. Clean iff `missing` is empty. */
export interface DenylistConformance {
  /** fr-100 patterns with no covering entry in the domain denylist. */
  missing: string[];
  /** The fr-100 patterns checked (echoed for the gate's log). */
  checked: string[];
}

/**
 * Does the domain denylist COVER `fr100Pattern`? Coverage means an entry that would match every key
 * the fr-100 prefix matches — i.e. a `'prefix'`-mode entry whose pattern is a prefix of (or equal to)
 * the fr-100 pattern.
 *
 * ⚠ A `'segment'`-mode entry does NOT count as coverage even when its text matches, because the two
 * modes accept different key sets: `payout_destinations` matches `payout_destination` in prefix mode
 * and NOT in segment mode. Accepting a segment entry here would let the gate report coverage of a
 * pattern the runtime fence does not actually enforce — a vacuous pass of the exact kind this gate
 * exists to prevent.
 */
export function coversFr100Pattern(
  entries: ReadonlyArray<{ pattern: string; mode: string }>,
  fr100Pattern: string,
): boolean {
  return entries.some((e) => e.mode === 'prefix' && fr100Pattern.startsWith(e.pattern));
}

/** Leg (a): every fr-100 `forbidden_column` pattern must be covered by the domain denylist. */
export function checkDenylistConformance(
  entries: ReadonlyArray<{ pattern: string; mode: string }>,
  fr100Patterns: readonly string[],
): DenylistConformance {
  const missing = fr100Patterns.filter((p) => !coversFr100Pattern(entries, p)).sort();
  return { missing, checked: [...fr100Patterns].sort() };
}

export function denylistConformanceIsClean(r: DenylistConformance): boolean {
  return r.missing.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leg (b) — the SOLE-WRITER source scan
// ─────────────────────────────────────────────────────────────────────────────

/** The drizzle table binding whose INSERT sites are policed. */
export const DEFINITIONS_TABLE_BINDING = 'pariwarCustomFieldDefinitions';

export interface WriterFinding {
  file: string;
  line: number;
  detail: string;
}

/**
 * Scan one TypeScript source for `insert(pariwarCustomFieldDefinitions)` calls.
 *
 * AST-detected, never grep: a gate that fired on the table name appearing in a comment or a string
 * literal would be switched off within a week — and every schema/README/migration file in this repo
 * names its table in prose. Matching the CALL EXPRESSION means only a real write site is reported.
 *
 * Both `db.insert(t)` and a bare `insert(t)` are matched: the second form appears when a module
 * destructures the builder, and a scan that only understood the method-call form would miss it.
 */
/**
 * ⭐ [Review][Patch] ALIAS RESOLUTION — the `governance-boundary` gate's precedented route
 * (`gate-inventory.md:37`, "named symbol incl. aliases"). A scanner that only matches a bare
 * identifier whose OWN text equals the export name misses `import { X as y } from '...'` and
 * `const { X: y } = schema` — both rename the LOCAL binding without touching the literal export name.
 * Walk the file first to learn every local name bound (directly or via rename) to `originalName`.
 */
function collectLocalAliasesFor(sf: ts.SourceFile, originalName: string): Set<string> {
  const aliases = new Set<string>([originalName]);

  const visit = (node: ts.Node): void => {
    // `import { X as y } from '...'` — `propertyName` preserves the ORIGINAL exported name; `name` is
    // the local binding the rest of the file actually uses.
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings) {
      const { namedBindings } = node.importClause;
      if (ts.isNamedImports(namedBindings)) {
        for (const el of namedBindings.elements) {
          const original = el.propertyName?.text ?? el.name.text;
          if (original === originalName) aliases.add(el.name.text);
        }
      }
    }
    // `const { X: y } = schema` — the same rename, via destructuring rather than an import specifier
    // (the `governance-boundary` Route 2b gap).
    if (ts.isObjectBindingPattern(node)) {
      for (const el of node.elements) {
        const original =
          el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : undefined;
        if (original === originalName && ts.isIdentifier(el.name)) aliases.add(el.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return aliases;
}

export function scanDefinitionWrites(file: string, source: string): WriterFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: WriterFinding[] = [];
  const aliasedLocalNames = collectLocalAliasesFor(sf, DEFINITIONS_TABLE_BINDING);

  const argIsDefinitionsTable = (node: ts.CallExpression): boolean => {
    const a = node.arguments[0];
    if (!a) return false;
    if (ts.isIdentifier(a)) return aliasedLocalNames.has(a.text);
    // `schema.pariwarCustomFieldDefinitions` — a namespace-qualified reference. The property name
    // itself can never be locally renamed (only the object it hangs off can be), so the literal name
    // is the correct — and only — check here.
    if (ts.isPropertyAccessExpression(a)) return a.name.text === DEFINITIONS_TABLE_BINDING;
    return false;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isInsert =
        (ts.isPropertyAccessExpression(callee) && callee.name.text === 'insert') ||
        (ts.isIdentifier(callee) && callee.text === 'insert');
      if (isInsert && argIsDefinitionsTable(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const a = node.arguments[0];
        const argText = a && ts.isIdentifier(a) ? a.text : DEFINITIONS_TABLE_BINDING;
        findings.push({
          file,
          line: line + 1,
          detail: `insert(${argText}) — a definition-row INSERT outside the sanctioned writer`,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ [Review][Patch] Leg (c) — the `members.custom_fields` SOLE-WRITER source scan
// ─────────────────────────────────────────────────────────────────────────────
//
// AC6 claims "the writer is the sole `update(members).set({ customFields })` call site in the repo,
// asserted by AC3's source-scan leg" — but no scan ever asserted it: leg (b) above only ever matched
// `insert(pariwarCustomFieldDefinitions)`. This leg supplies the mechanization the AC's own text
// claimed already existed, mirroring leg (b)'s shape exactly.

/** The drizzle table binding whose `.set({ customFields })` sites are policed. */
export const MEMBERS_TABLE_BINDING = 'members';

/** The `.set({...})` property name that marks a members UPDATE as a custom-fields write. */
const CUSTOM_FIELDS_SET_KEY = 'customFields';

/**
 * Scan one TypeScript source for `update(members).set({ customFields: … })` (or the shorthand
 * `{ customFields }`) outside the sanctioned writer. AST-detected for the same reason leg (b) is:
 * a gate that fired on a comment or string literal would be switched off within a week.
 */
export function scanMemberCustomFieldWrites(file: string, source: string): WriterFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const findings: WriterFinding[] = [];
  const aliasedLocalNames = collectLocalAliasesFor(sf, MEMBERS_TABLE_BINDING);

  const argIsMembersTable = (node: ts.CallExpression): boolean => {
    const a = node.arguments[0];
    if (!a) return false;
    if (ts.isIdentifier(a)) return aliasedLocalNames.has(a.text);
    if (ts.isPropertyAccessExpression(a)) return a.name.text === MEMBERS_TABLE_BINDING;
    return false;
  };

  /** Does `.set({...})`'s object argument carry a `customFields` property, shorthand or explicit? */
  const setArgTouchesCustomFields = (setCall: ts.CallExpression): boolean => {
    const arg = setCall.arguments[0];
    if (!arg || !ts.isObjectLiteralExpression(arg)) return false;
    return arg.properties.some((p) => {
      if (ts.isShorthandPropertyAssignment(p)) return p.name.text === CUSTOM_FIELDS_SET_KEY;
      if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) return p.name.text === CUSTOM_FIELDS_SET_KEY;
      return false;
    });
  };

  const visit = (node: ts.Node): void => {
    // `.set({...})` chained directly off `update(members)` or `db.update(members)` — matches
    // member-write.ts's actual shape (`.update(members).set({ customFields: envelope, … })`).
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'set' &&
      ts.isCallExpression(node.expression.expression)
    ) {
      const updateCall = node.expression.expression;
      const updateCallee = updateCall.expression;
      const isUpdate =
        (ts.isPropertyAccessExpression(updateCallee) && updateCallee.name.text === 'update') ||
        (ts.isIdentifier(updateCallee) && updateCallee.text === 'update');
      if (isUpdate && argIsMembersTable(updateCall) && setArgTouchesCustomFields(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(updateCall.getStart(sf));
        findings.push({
          file,
          line: line + 1,
          detail: `update(${MEMBERS_TABLE_BINDING}).set({ ${CUSTOM_FIELDS_SET_KEY} }) — a member custom-fields write outside the sanctioned writer`,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatWriterFinding(f: WriterFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    'Every definition publish must go through `customFields.publishDefinitionVersion` ' +
    '(packages/domain/src/custom-fields/registry.ts), which runs the frozen-governance fence, the ' +
    'PII-tier guard and the cardinality bound before writing (Story 10.12 AC3). An INSERT elsewhere ' +
    'bypasses all three at once. See scripts/custom-field-governance/README.md.'
  );
}

/** [Review][Patch] The leg (c) counterpart to `formatWriterFinding`, naming the RIGHT sanctioned path
 *  (member-value writes, not definition publishes — the two writers are different modules). */
export function formatMemberWriterFinding(f: WriterFinding): string {
  return (
    `${f.file}:${f.line} — ${f.detail}. ` +
    'Every member custom-field write must go through `customFields.setMemberCustomFields` ' +
    '(packages/domain/src/custom-fields/member-write.ts), which resolves the in-force definition set, ' +
    'validates against it, and enforces the AC5 limits before writing (Story 10.12 AC6). An UPDATE ' +
    'elsewhere bypasses all of that. See scripts/custom-field-governance/README.md.'
  );
}
