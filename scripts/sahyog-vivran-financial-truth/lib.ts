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
 * ⭐⭐ NARROWED AT STORY 11b.3b (AC11(b)) — ⛔ NOT WIDENED, ⛔ NOT DELETED, AND THE TEETH ARE PROVEN.
 *
 * ⚠ THE SHAPE THIS RULE ORIGINALLY HAD: it fired on any amount operand being **NAMED** on the render
 * path, `amountRaisedInr` INCLUDED. ⭐ That was correct while `2026-09-02-176` **D1(b)** had MOVED the
 * amount off this surface — naming it could only be preparation for re-deriving it. ⛔ It stopped being
 * correct the moment 11b.3b actually SHIPS the amount: `2026-09-04-190` **cl.6** rules
 * `amountRaisedInr` the public rupee figure, and `-189` **cl.5** records the rupee boundary as NEWLY
 * CROSSED. ⇒ a rule that bans the ruled field's own NAME makes the ruling unshippable.
 *
 * ⭐ SO THE RULE IS RE-POINTED AT THE **DEFECT**, ⛔ not at the vocabulary:
 *   · {@link TARGET_OPERANDS} — the TARGET and its FACTORS. ⛔ Still banned by NAME on the render path.
 *     `2026-09-07-204` **cl.8** closed the arithmetic-recovery channel *"BY CONSTRUCTION"* with *"the
 *     wire carries the PERCENTAGE only, ⛔ never `rosterSize`"*, and the wire shape's own fence
 *     (`sahyog-vivran.ts`) forbids a target/expected-total/shortfall *"in any field, under any name"*.
 *     ⚠ `deliveredTotal` is in here too, and DELIBERATELY: it is the DOMAIN-internal binding: the render
 *     path names the **wire** field (`amountRaisedInr`), ⛔ never the domain's spelling of it.
 *   · {@link isAmountDerivation} — the actual D1(c) act: **re-deriving the product locally**. ⛔ Caught
 *     STRUCTURALLY (a `*` whose operands are a confirmed-count and a per-member amount), so it is
 *     caught under ANY local spelling, ⛔ not only when the banned words happen to appear.
 *
 * ⛔⛔ D1(c) IS ⛔ NOT RELAXED BY THIS NARROWING — it is enforced by SHAPE rather than by vocabulary,
 * which is strictly harder to evade. ⭐ `2026-09-02-176` **D1(c)** stays REFUSED: *"a second
 * multiplication anywhere in this app is the defect."*
 */
const TARGET_OPERANDS = /^(fixedAmount|rosterSize|expectedTotal|deliveredTotal)$/;

// ⚠ Review finding, 2026-09-15: a `RULED_AMOUNT_FIELD` regex stood here, documented as what
// "permits" `amountRaisedInr` on the render path. It was never referenced anywhere — the actual
// permission is just `amountRaisedInr` not being a member of {@link TARGET_OPERANDS} above.
// ⛔ Removed rather than wired in: there is no check left for it to gate.

/** Operand halves of the refused product `confirmedCount × fixedAmount`. */
const COUNT_OPERAND = /^(confirmedCount|confirmedContributionCount|assignedCount|rosterSize)$/;
const PER_MEMBER_AMOUNT = /^(fixedAmount|fixed_amount)$/;

/** The identifier a node ultimately names — `x`, `row.x`, `this.x` all yield `x`. */
function namedOperand(node: ts.Expression): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  if (ts.isParenthesizedExpression(node)) return namedOperand(node.expression);
  return undefined;
}

/**
 * A hard-coded amount operand — `1000`, `(1000)`, `-1000`, `+1000`, or `'1000'`.
 *
 * ⚠⛔ **FOUND 2026-09-17 BY ADVERSARIAL REVIEW, REPRODUCED:** this recognised `ts.isNumericLiteral`
 * ONLY. ⇒ `count * -1000` is a `PrefixUnaryExpression` and `count * '1000'` a `StringLiteral` (which
 * JS coerces to the identical product) — ⛔ both walked straight past a leg added days earlier
 * precisely to catch a hard-coded amount.
 */
function isNumericLiteralOperand(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) return isNumericLiteralOperand(node.expression);
  if (ts.isNumericLiteral(node)) return true;
  // ⭐ `-1000` / `+1000` — a sign does ⛔ not make it a different act.
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken)
  ) {
    return isNumericLiteralOperand(node.operand);
  }
  // ⭐ `'1000'` — JS coerces, so the product is byte-identical. ⛔ A quote is ⛔ not a defence.
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.trim() !== '' && Number.isFinite(Number(node.text));
  }
  return false;
}

/**
 * ⭐⭐ **`.astro` IS TWO LANGUAGES IN ONE FILE, AND SCANNING ONLY THE FIRST IS A SILENT HOLE.**
 *
 * ⚠⛔⛔ **FOUND 2026-09-17 BY AN ADVERSARIAL REVIEW OF THE `-219` cl.5(a) WORK — REPRODUCED, ⛔ not
 * theorised.** The scanner parsed every file with {@link ts.ScriptKind.TS}. For
 * `apps/public/src/pages/sahyog-vivran/[driveToken].astro` that parses the **frontmatter** between the
 * `---` fences and then hits `<` — everything after it is ⛔ NOT a TS program, so the template's
 * `{...}` expressions were ⛔ never visited. Planting `confirmedContributionCount * 1000` in the
 * frontmatter FIRED; planting `{confirmedContributionCount * 1000}` in the template returned `[]`.
 * ⇒ ⚠ the template is the MOST natural place to write a figure on an Astro page, and it was the
 * half the gate could ⛔ not see — while `-219` cl.5(b) records this gate as the **SOLE** enforcement
 * of D1(c).
 *
 * ⭐ **THE FIX: re-shape `.astro` into one TSX program** — frontmatter as statements, template wrapped
 * in a fragment — so ONE walk covers both halves. ⛔ Do ⛔ not "simplify" this back to a single
 * `ScriptKind.TS` parse.
 * ⚠ TypeScript's parser RECOVERS from syntax it does not understand rather than throwing, so an
 * Astro-specific construct degrades to a partial tree instead of a crash — acceptable for a tripwire,
 * ⛔ but it means a green scan of a template is weaker evidence than a green scan of TS.
 * ⇒ ⭐⭐ **`lib.test.ts` carries an ANTI-VACUITY leg that plants a product in the TEMPLATE half and
 * requires it to fire.** ⛔ Never delete it: without it this function can silently return to scanning
 * nothing, which is exactly the state it was in before.
 */
function prepareSource(file: string, source: string): { text: string; kind: ts.ScriptKind } {
  if (!file.endsWith('.astro')) return { text: source, kind: ts.ScriptKind.TS };

  // ⚠ The fence is `---` on its own line. A file with no frontmatter is all template.
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  const frontmatter = m ? m[1] : '';
  const template = m ? source.slice(m[0].length) : source;

  // ⚠⛔ Line numbers are PRESERVED for the frontmatter half (it stays at the top and the fence lines
  // are replaced by blanks), so a finding there still reports its real line. ⛔ The template half is
  // offset by the wrapper — accepted: a tripwire's job is to FAIL, and the detail names the file.
  const lead = m ? '\n'.repeat((m[0].match(/\n/g) ?? []).length) : '';
  return {
    text: `${lead}${frontmatter}\n;<>\n${template}\n</>;\n`,
    kind: ts.ScriptKind.TSX,
  };
}

/**
 * ⭐ TRUE for a local re-derivation of the rupee figure — the D1(c) defect, by SHAPE.
 *
 * ⚠ Deliberately symmetric (either operand order) and deliberately tolerant of member access, because
 * `confirmedContributionCount * row.fixedAmount` is exactly how the domain spells it.
 *
 * ⭐⭐ **HARDENED 2026-09-16 BY `#decision-2026-09-16-219` cl.5(a) (Trustee-ratified) — THE SECOND
 * LEG BELOW IS THE RULING, ⛔ not a tidy-up.** AC11(b)'s narrowing dropped `amountRaisedInr` from
 * {@link TARGET_OPERANDS} (correctly — a rule that bans the ruled field's own NAME makes the ruling
 * unshippable), but the replacement shape leg required BOTH operands to resolve to a NAMED
 * identifier. ⇒ `confirmedContributionCount * 1000` in a render-path file passed **GREEN**, where
 * before the narrowing that exact line tripped the name rule. ⚠ The doc-block's claim that the
 * product is caught *"under ANY local spelling"* was therefore FALSE for a literal operand, and
 * `2026-09-02-176` **D1(c)** was enforceable only against the one spelling the domain happens to use.
 *
 * ⚠⛔⛔ **WHAT IS STILL ⛔ NOT CAUGHT — CORRECTED 2026-09-17, BECAUSE THE EARLIER LIST WAS ⛔ NOT THE
 * WHOLE OF IT** ([[feedback_record_unattested_no_backfill]]). ⛔ This doc-block previously named the
 * aliased-const case and called it *"the whole of the remaining exposure"*. ⚠ That was FALSE, and it
 * was false in the one place it most mattered — beside the sentence recording this gate as D1(c)'s
 * SOLE enforcement. The honest list:
 *   · **An operand aliased to a local const** — `const per = 1000; count * per;` resolves to the
 *     identifier `per`. Closing it needs const-tracking, a different instrument.
 *   · **A product built across STATEMENTS** — `let a = count; a *= 1000;` — needs dataflow, likewise.
 *   · **A computed literal** — `count * (500 + 500)`.
 *   · **Rule (3) fires ⛔ ONLY on `renderPath: true` files** (see {@link ScanOptions}), and
 *     `apps/api/.../public-pages/handlers.ts` is ⛔ `false` — so the product written THERE is ⛔ not a
 *     finding at all, by design.
 *   · **{@link ScanOptions} is driven by a HAND-MAINTAINED file list** in `check.ts`; a
 *     differently-named new file is invisible until someone adds it.
 *   · **The scan is SYNTACTIC and per-file** — `check.ts` prints this on every green run. A
 *     prohibited product placed in a THIRD module and called from a render-path file is ⛔ invisible.
 * ⇒ ⚠⛔ D1(c)'s own words are *"a second multiplication ANYWHERE in this app is the defect"*. ⛔ This
 * gate does ⛔ not have that reach and must ⛔ never be described as if it did — ⭐ it is a TRIPWIRE.
 *
 * ⭐ And the shape leg was ⛔ never dead code, which is why it is EXTENDED rather than replaced:
 * {@link PER_MEMBER_AMOUNT} accepts `fixed_amount` (snake), which is ⛔ absent from
 * {@link TARGET_OPERANDS} ⇒ `confirmedCount * fixed_amount` is caught by SHAPE alone.
 */
function isAmountDerivation(node: ts.Node): node is ts.BinaryExpression {
  if (!ts.isBinaryExpression(node)) return false;
  // ⭐ `*` AND `*=` — the compound assignment is the same multiplication (the group 5/5 pass deferred
  // this as a "low-severity precision note"; adversarial review 2026-09-17 re-found it alongside two
  // other operand evasions, so it is closed here rather than carried).
  if (
    node.operatorToken.kind !== ts.SyntaxKind.AsteriskToken &&
    node.operatorToken.kind !== ts.SyntaxKind.AsteriskEqualsToken
  ) {
    return false;
  }

  const l = namedOperand(node.left);
  const r = namedOperand(node.right);

  // ⭐ LEG 1 — both operands NAMED: `count × fixedAmount`, the domain's own spelling.
  if (l !== undefined && r !== undefined) {
    if (
      (COUNT_OPERAND.test(l) && PER_MEMBER_AMOUNT.test(r)) ||
      (COUNT_OPERAND.test(r) && PER_MEMBER_AMOUNT.test(l))
    ) {
      return true;
    }
  }

  // ⭐ LEG 2 (`-219` cl.5(a)) — a COUNT operand times a NUMERIC LITERAL. ⚠ The per-member amount is
  // Pariwar configuration; hard-coding it is the SAME act as naming it, and is arguably worse — it
  // also forks the figure from `pools.fixed_amount`.
  if (l !== undefined && COUNT_OPERAND.test(l) && isNumericLiteralOperand(node.right)) return true;
  if (r !== undefined && COUNT_OPERAND.test(r) && isNumericLiteralOperand(node.left)) return true;

  return false;
}

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
  const { text, kind } = prepareSource(file, source);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, kind);
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

    // ── (3) RENDER-PATH TARGET / DERIVATION (D1(c)) ─────────────────────────
    // ⭐ NARROWED at 11b.3b (AC11(b)): the TARGET and its FACTORS stay banned by NAME; the RULED
    // amount field may cross; and the D1(c) act itself is caught by SHAPE. See {@link TARGET_OPERANDS}.
    if (opts.renderPath) {
      if (isAmountDerivation(node)) {
        findings.push({
          file,
          line: lineOf(sf, node),
          rule: 'render_path_multiplication',
          detail:
            'render path RE-DERIVES the rupee figure locally — a confirmed-count product, whether ' +
            'the per-member amount is NAMED (`count × fixedAmount`) or HARD-CODED (`count × 1000`, ' +
            '`× -1000`, `× \'1000\'`, or `*=` — 2026-09-16-219 cl.5(a)). ' +
            'NOTE: a confirmed-count product with a literal is a finding on a render-path file even ' +
            'if you meant a PERCENTAGE — 2026-09-07-218 rules this page renders NO completion ' +
            'percentage, so that shape is forbidden here on its own grounds. ' +
            'D1(c) is REFUSED in terms — "a second multiplication anywhere in this app is the ' +
            'defect" — and the canonical figure is the domain read\'s own `deliveredTotal`, ' +
            'published as `amountRaisedInr` (2026-09-04-190 cl.6)',
        });
      } else if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
        const name = node.text;
        if (TARGET_OPERANDS.test(name)) {
          findings.push({
            file,
            line: lineOf(sf, node),
            rule: 'render_path_multiplication',
            detail:
              `render path names "${name}" — the drive TARGET or one of its factors. ` +
              '2026-09-07-204 cl.8 keeps the target off this wire "BY CONSTRUCTION" ' +
              '("the wire carries the PERCENTAGE only, never `rosterSize`"). ' +
              'The ruled public figure is `amountRaisedInr` (2026-09-04-190 cl.6), which IS permitted ' +
              'here — name that instead, and take it from the domain read rather than re-deriving it',
          });
        }
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
