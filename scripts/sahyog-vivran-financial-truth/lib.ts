// scripts/sahyog-vivran-financial-truth/lib.ts
//
// Pure scanner for Story 11b.3 AC3/AC4 — the FINANCIAL-TRUTH-FROM-CANONICAL-EVENTS invariant, the
// story's load-bearing commitment. The epic AC asks for exactly this: *"a CI test asserts: no API
// endpoint serving Sahyog Vivran data computes inferred financial state from non-canonical sources;
// financial summaries source exclusively from `contribution.confirmed` + `pool.settled` events."*
//
// ── ⭐ WHAT IT PROVES, AND WHY IT IS AN **AST** SCAN AND NOT A SUBSTRING SCAN ────────────────────
// The Sahyog Vivran read path's EVENT-TYPE SURFACE is exactly the canonical set. Anything else — a
// planted read of `contribution.utr-attested` (self-attested YELLOW: a member's CLAIM that they paid,
// ⛔ not confirmed money) or `contribution.reconciliation-mismatch` — FAILS.
// ⛔ A SUBSTRING SCAN COULD NOT DO THIS JOB HERE, and that is not a preference. These files are dense
// with comments that NAME the prohibited types in order to forbid them ("⛔ NEVER
// `contribution.utr-attested`"). A line scan would fail on the prohibition itself, and the only way
// to make it pass would be to DELETE the sentences that explain the rule. ⇒ this walks the TypeScript
// AST and looks at STRING LITERALS ONLY, so comments are invisible to it by construction.
// ⚠ (That is the opposite trade-off from `pool-support-category-invariant`, which scans comments ON
// PURPOSE because a pool-engine comment thinking in category terms IS the smell. Different rule,
// different instrument — ⛔ do not "harmonise" them.)
//
// ── THE THREE RULES ─────────────────────────────────────────────────────────────────────────────
//   (1) EVENT SURFACE — every event-type-shaped string literal in a scanned file must be on
//       {@link ALLOWED_EVENT_TYPES}. ⭐ It is an ALLOWLIST, ⛔ not a deny-list: a deny-list only ever
//       catches the prohibited sources somebody already thought of, and AC3's list of prohibited
//       framings is explicitly open-ended ("any aggregate mixing confirmed and unconfirmed counts").
//   (2) PROHIBITED IMPORT — the read path may not import an attestation-derived accessor. ⚠ Rule (1)
//       alone would miss this: `hasAttestedContribution` reads `contribution.utr-attested` in ANOTHER
//       file, so the literal never appears here.
//   (3) RENDER-PATH MULTIPLICATION — **D1(c)**, mechanized. `amountRaisedInr = confirmedCount ×
//       fixedAmount` is the SHIPPED canonical definition (Story 9.12 D3) and D1(b) ruled it CONSUMED
//       — ⛔ but behind the `@twt/ui` fence this story does not lift, so the amount lands at 11b.3b.
//       ⛔ Re-deriving it locally is D1(c), REFUSED. ⇒ no render-path file may so much as NAME an
//       amount operand. ⚠ Scoped to the RENDER path deliberately: the DOMAIN read legitimately uses
//       `fixedAmount` to feed `classifyCycleOutcome`, which QUARANTINES the target — totals flow in,
//       only an opaque enum flows out. ⛔ Banning it there would forbid the quarantine itself.
//
// ── ⚠ WHAT IT DOES **NOT** PROVE (confessed, per the 10.12 fence's style) ───────────────────────
// It is a SYNTACTIC, per-file scan with ⛔ no call-graph analysis. A read of a prohibited event type
// placed in a THIRD module and called from the read path is invisible to it, exactly as the
// `pool-bound-payment-invariant` gate cannot see a remap split across two functions. ⭐ Rule (2) is
// what narrows that gap for the realistic case — the accessors that actually exist — but it is a
// tripwire against the common-case mistake, ⛔ not a formal proof of AC3. Code review remains the
// backstop. ⛔ Do not write in a story that this gate proves the invariant.

import * as ts from 'typescript';

export interface FinancialTruthFinding {
  file: string;
  line: number;
  rule: 'event_surface' | 'prohibited_import' | 'render_path_multiplication';
  detail: string;
}

/**
 * ⭐ THE CANONICAL EVENT SURFACE — the ONLY event types the Sahyog Vivran read path may name.
 *
 * ⛔ ADDING TO THIS LIST IS A SCOPE DECISION, ⛔ NEVER A WAY TO MAKE A FAILING SCAN PASS. The gate
 * failing means a non-canonical source reached the read path; the fix is to remove the source, ⛔ not
 * to widen the allowlist. (The `RULED_TIER1_PUBLIC_EXCEPTIONS` discipline, one layer over.)
 *
 *   · `contribution.confirmed` — Story 9.5's canonical financial truth, the ONE source of confirmed
 *     visibility. Its confirmed-only guard is STRUCTURAL: the domain read has no status parameter.
 *   · `reconciliation.confirmation-reversed` — the compensating reversal (Story 9.4 D1). ⚠ It is a
 *     `reconciliation.*` event, deliberately OFF the 8.10 `contribution.*` fence, so ⛔ never try to
 *     select or exclude these two by prefix.
 *   · `pool.closed` / `pool.settled` — AC3's SETTLEMENT-STATE source, the pool's own lifecycle stream.
 *   · `claim.reversed` — Story 6.16's PUBLISH SIGNAL, derived at render time (D12(a)). ⚠ It carries
 *     ⛔ NO financial content at all: `reversed_at_stage` + a bounded NON-PII `disposition_category`.
 *     It is allowed here because the read joins it, ⛔ not because it bears on money.
 */
export const ALLOWED_EVENT_TYPES: readonly string[] = [
  'contribution.confirmed',
  'reconciliation.confirmation-reversed',
  'pool.closed',
  'pool.settled',
  'claim.reversed',
];

/**
 * What an event-type literal LOOKS like — a known domain namespace, a dot, a name.
 *
 * ⚠ Anchored to the namespaces that actually exist so ordinary dotted strings (a MIME type, a header
 * name, a module specifier) are not mistaken for events. ⛔ A looser pattern would make the gate
 * noisy, and a noisy gate gets an allow-list, which is how it stops meaning anything.
 */
const EVENT_TYPE_SHAPE =
  /^(contribution|reconciliation|pool|claim|alert|member|cycle|helpdesk|news|survey|moderation|consent)\.[a-z0-9][a-z0-9_.-]*$/;

/**
 * Accessors and symbols whose whole job is attestation-derived or non-canonical state.
 *
 * ⭐ RULE (1) CANNOT SEE THESE — they read the prohibited event type in ANOTHER file, so no
 * prohibited literal ever appears in the read path. ⚠ This list is deliberately about REAL exported
 * symbols in this repo, ⛔ not a guess at names a developer might invent.
 */
export const PROHIBITED_IMPORTS: readonly string[] = [
  // Story 8.4's yellow/self-attested read — a member's CLAIM that they paid.
  'hasAttestedContribution',
  // Returns `{ confirmed, attested }`; its `attested` half is a nudge-suppression courtesy signal
  // and is structurally separate from every confirmed surface.
  'listActedMemberIdsForPool',
  // The yellow event-type constants themselves.
  'CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE',
  'CONTRIBUTION_MISMATCH_EVENT_TYPE',
];

/**
 * Operand names that would only be present in order to compute or render a rupee figure.
 *
 * ⛔ D1(c), mechanized. ⚠ Applied to RENDER-PATH files only — see the header.
 */
const AMOUNT_OPERANDS = /^(fixedAmount|amountRaised|amountRaisedInr|rosterSize|expectedTotal|deliveredTotal)$/;

/** Line number (1-based) of a node, for the report. */
function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

export interface ScanOptions {
  /**
   * True for files on the RENDER path (`apps/public` + the wire DTO), where rule (3) applies.
   *
   * ⛔ FALSE for the domain read: it legitimately names `fixedAmount` to feed `classifyCycleOutcome`,
   * which quarantines the target by construction. Banning it there would forbid the quarantine.
   */
  renderPath: boolean;
}

/**
 * Scan ONE Sahyog Vivran read-path source. PURE: no fs, no clock, no mutation of its inputs.
 */
export function scanFinancialTruth(
  file: string,
  source: string,
  opts: ScanOptions,
): FinancialTruthFinding[] {
  const findings: FinancialTruthFinding[] = [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const allowed = new Set(ALLOWED_EVENT_TYPES);
  const prohibitedImports = new Set(PROHIBITED_IMPORTS);

  const visit = (node: ts.Node): void => {
    // ── (1) EVENT SURFACE ───────────────────────────────────────────────────
    // ⚠ String literals AND no-substitution template literals: `` `contribution.confirmed` `` is the
    // same string and must not be a way around the rule.
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text;
      if (EVENT_TYPE_SHAPE.test(text) && !allowed.has(text)) {
        findings.push({
          file,
          line: lineOf(sf, node),
          rule: 'event_surface',
          detail:
            `non-canonical event type "${text}" on the Sahyog Vivran read path — the surface is ` +
            `exactly [${ALLOWED_EVENT_TYPES.join(', ')}]`,
        });
      }
    }

    // ── (2) PROHIBITED IMPORT ───────────────────────────────────────────────
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings !== undefined) {
      const bindings = node.importClause.namedBindings;
      if (ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) {
          const imported = (el.propertyName ?? el.name).text;
          if (prohibitedImports.has(imported)) {
            findings.push({
              file,
              line: lineOf(sf, el),
              rule: 'prohibited_import',
              detail:
                `imports "${imported}" — an attestation-derived accessor. Yellow / self-attested / ` +
                `pending state is a member's CLAIM that they paid, ⛔ not confirmed money, and it ` +
                `must be structurally unable to reach this surface`,
            });
          }
        }
      }
    }

    // ── (3) RENDER-PATH MULTIPLICATION (D1(c)) ──────────────────────────────
    if (opts.renderPath && (ts.isIdentifier(node) || ts.isStringLiteral(node))) {
      const name = ts.isIdentifier(node) ? node.text : node.text;
      if (AMOUNT_OPERANDS.test(name)) {
        findings.push({
          file,
          line: lineOf(sf, node),
          rule: 'render_path_multiplication',
          detail:
            `render path names "${name}" — an amount operand. D1(b) ruled the SHIPPED ` +
            `\`amountRaisedInr\` consumed but MOVED it to Story 11b.3b (the @twt/ui fence stays); ` +
            `D1(c) — re-deriving \`confirmedCount × fixedAmount\` locally — is REFUSED`,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return findings;
}

export function formatFinding(f: FinancialTruthFinding): string {
  return `${f.file}:${String(f.line)} [${f.rule}] — ${f.detail}`;
}

/**
 * ⭐ THE SCOPE SAFEGUARD (review finding) — a candidate path that LOOKS like a Sahyog Vivran
 * read-path file but is not in the caller's scanned-files list. PURE: takes an already-resolved
 * candidate list; `check.ts` (the impure entry point) does the fs walk.
 *
 * ⛔ This does NOT replace the sibling-story obligation recorded at `check.ts`'s header ("11b.3a /
 * 11b.3b MUST add their files") — it makes FORGETTING it loud instead of silent. A new
 * `*sahyog-vivran*`-named file landing under the read path's known directories without a matching
 * `SCAN_FILES` entry now fails the gate, rather than shipping a green scan over a surface nobody is
 * reading ([[feedback_gate_scope_semantic_coverage]]).
 */
export function findUnscannedCandidates(
  candidatePaths: readonly string[],
  scannedPaths: readonly string[],
): string[] {
  const scanned = new Set(scannedPaths);
  return candidatePaths.filter((p) => !scanned.has(p)).sort();
}
