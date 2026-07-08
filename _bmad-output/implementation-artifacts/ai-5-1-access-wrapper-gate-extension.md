---
baseline_commit: e938493788075d5216bd7553e37e8941d13e2ee5
---

# AI-5-1 — Extend the access-wrapper AST gate to the Epic 5 access surface

**Source:** Epic 5 retrospective (`epic-5-retro-2026-07-08.md`, §7) — confirmed BigDev 2026-07-08.
**Type:** Technical (CI gate). DB/network-free invariant scan. Critical path before Epic 6.
**Status:** done — implemented 2026-07-08 via `dev-story`. Secret-compare-only slice (BigDev 2026-07-08). Code review 2026-07-08: 6 decision-needed resolved (3 deferred, 2 patched, 1 dismissed) + 2 patch findings fixed, all evidenced (23/23 tests, gate self-green). See Review Findings.

---

## 1. Context + the reconciliation (surface it, don't silently repoint)

AI-4-3 built `scripts/access-wrapper-invariants/` (gate + `docs/access-wrapper-invariants.md` checklist) to mechanize the cheapest slice of the I-3 access-wrapper family. But `check.ts` hardcodes `SCAN_ROOT = 'packages/validity-service/src'` and `lib.ts`'s `scanAccessWrapperInvariant` keys its invariant on **`Promise<…MemberValidityPayload>`-returning functions with a `caller`/`internal` marker** — a shape that exists *only* in validity-service. Every Epic 5 story disclosed the gate scans none of its access surface and walked the (a–e) checklist by hand.

**The trap AI-5-1 must avoid:** simply adding `packages/channels/src` to `SCAN_ROOT` makes the *existing* validity-shaped invariant match **zero** functions on that surface → the gate stays green **while proving nothing**. "Extend SCAN_ROOT" is necessary but not sufficient. The commitment is only closed when the gate scans the Epic 5 surface **for an invariant that actually fires on Epic 5 defect shapes.**

Per [[feedback_mechanization_split_commitment]] (mechanize the cheapest + most-corrosive slice; keep judgment calls on the sharpened checklist), the mechanizable slice for this surface is the **constant-time secret comparison** invariant — the concrete Story 5.4 defect. The remaining checklist items stay convention + reviewer-enforced.

## 2. The invariant to mechanize (conditional-semantic, not a count)

> **Within a verification context, any comparison of two runtime values must use an approved constant-time comparator — never `===` / `!==` / `==` / `!=` / `.includes` / `.startsWith` / `.localeCompare`.**

The invariant is **conditional on the presence of verification**, not on finding a minimum number of good compares. A *verification context* is a function that establishes trust by checking an incoming credential — it computes an HMAC, reads a webhook signature header or `hub.verify_token`, or resolves a channel secret for comparison. Where such a context exists in the scanned surface, its runtime-value comparisons must go through the approved helper; where no verification exists, there is nothing to get wrong and the invariant is satisfied by construction. This is complete **per-site** (every unsafe compare inside a verification context is flagged regardless of whether safe ones also exist) and vacuous-safe **for the right reason** — no synthetic "≥1 compare" canary is used or needed.

This is the direct analog of validity's caller/internal fail-closed guard, one domain over. It catches the exact 5.4 defect (`hub.verify_token` compared with plain `!==`, a webhook-auth timing side-channel) and is already satisfied by the shipped code (`apps/api/src/modules/channel-webhooks/signature.ts` uses `timingSafeEqual` / `timingSafeEqualString` / `verifyMetaSignature`), so the gate is **self-green by construction** on the current tree. Anchoring on the verification *context* (not on a secret-name lexicon) also catches a secret compared under an innocuously-named variable.

**Explicitly NOT in this gate** (stay on `docs/access-wrapper-invariants.md`, per §5): independent caller-authorization, HMAC-not-raw-PII audit hashing, isolated best-effort writes, permission-key scope-match. These are judgment calls a heuristic static scan false-positives on (the same reasoning AI-4-3's README already records). AI-5-3 owns the audit-write-ordering slice separately — do **not** fold it in here.

## 3. Conformance rule (AST, for `lib.ts`)

**Step 1 — identify verification contexts.** A function body is a verification context iff it exhibits any of these signals (AST, not comment/string matches):
- calls `createHmac` (Node `node:crypto`), or
- reads a webhook signature header or verify-token — a member/property access to `x-hub-signature-256` / `x-telegram-bot-api-secret-token` / `hub.verify_token` (case-insensitive), or
- calls a channel-secret resolver whose result feeds a comparison — e.g. `resolveChannelSecret(...)` / a `*SecretName → value` resolution, or
- calls one of the approved constant-time comparators (its presence *is* verification, and any *sibling* plain compare in the same function is then suspect).

**Step 2 — within a verification context, flag unsafe comparisons.** Flag a `BinaryExpression` with operator `===` / `!==` / `==` / `!=`, or a `.includes(...)` / `.startsWith(...)` / `.localeCompare(...)` call, **iff both compared operands are runtime values** — i.e. neither operand is a string / number / `null` / `undefined` / boolean literal. That literal exemption clears the legitimate control-flow compares a verification handler contains (`mode !== 'subscribe'`, `challenge === undefined`, `!token`) while catching the real defect (`token !== expectedToken`, both runtime).

- **Conformant** = the runtime-vs-runtime compare flows through an approved constant-time comparator: `timingSafeEqual`, `timingSafeEqualString`, `timingSafeHashCompare`, or a `verify*Signature` helper.
- **Non-verification functions are not scanned for this rule** — the invariant is conditional on Step 1. A plain `a === b` in a renderer or a config accessor is out of scope by design.

**Why this is vacuous-safe without a canary:** the finding is *produced by* the presence of a verification context, not asserted against a global minimum. If webhook verification exists anywhere in `SCAN_ROOTS`, its runtime compares are checked completely; if it genuinely doesn't exist, the invariant is correctly satisfied (nothing to verify). The only remaining coverage obligation is that `SCAN_ROOTS` (§4) contains wherever verification lives — a scope-list review item, not a runtime count.

## 4. Scope (multi-root — mirror the `member-state-invariant` collection shape)

Replace the single `SCAN_ROOT` with a `SCAN_ROOTS: string[]`:

```
packages/channels/src
apps/api/src/modules/channel-webhooks
apps/api/src/modules/wa-opt-in
apps/api/src/modules/telegram-opt-in
apps/api/src/modules/channel-config
apps/api/src/modules/degraded-mode
apps/api/src/modules/device-token
```

The secret-compare invariant only *bites* in the webhook/opt-in subset today; the wider set is scanned so a future secret-compare anywhere in the channel access surface is caught. Keep the existing `collectTsFiles` (skips `node_modules`/dotfiles/`.d.ts`/`.test.ts`/`.spec.ts`). A missing root is a hard error (as today).

**Packaging — CONFIRMED BigDev 2026-07-08: one gate, two invariants.** The existing validity `MemberValidityPayload`/caller-internal invariant **still runs** over `packages/validity-service/src`. `lib.ts` exports `scanValidityCallerInvariant` (the current one, keyed on validity roots) + `scanSecretCompareInvariant` (new, keyed on channel roots); `check.ts` runs each over its own root set under the single `access-wrapper-invariants` CI job — one gate that now honestly covers both surfaces. (A sibling `scripts/channel-access-invariants/` gate was considered and rejected as needless boilerplate + a second CI job.)

## 5. The checklist half stays (sharpen, don't over-gate)

Update `docs/access-wrapper-invariants.md` and `scripts/access-wrapper-invariants/README.md`: the gate now covers **two mechanized slices** — (1) validity caller/internal fail-closed, (2) channel-surface constant-time secret compare. The four judgment-call items (independent caller-auth, HMAC-not-raw-PII audit, isolated best-effort writes, permission-scope match) remain the reviewer checklist for every new access/webhook/consent path. Note that Epic 6's claim access surface inherits both mechanized invariants from day one.

## 6. Tasks

- [x] **`lib.ts`** — add `scanSecretCompareInvariant(file, source)` (pure TS-AST, DB-free) implementing §3: detect verification-context functions (Step 1), then within them flag runtime-vs-runtime compares not routed through an approved constant-time comparator (Step 2, with the literal-operand exemption). Return `AccessWrapperFinding`-shaped results with a distinct `formatSecretCompareFinding`. Keep the existing validity scanner untouched.
- [x] **`lib.test.ts`** — add teeth: (a) a verification-context fixture with the **pre-fix** `token !== expectedToken` (both runtime) → **flagged**; (b) the shipped `timingSafeEqualString(token, expectedToken)` → **clean**; (c) the legitimate control-flow compares in a verification fn — `mode !== 'subscribe'`, `challenge === undefined`, `!token` → **clean** (literal-operand / presence exemption); (d) a `.includes(sig)` between two runtime values inside a verification fn → **flagged**; (e) a plain `a === b` in a **non-verification** function → **not scanned / clean** (proves the conditional scoping). No canary test — the invariant is conditional-semantic, not count-based.
- [x] **`check.ts`** — replace `SCAN_ROOT` with `SCAN_ROOTS`; run the validity invariant over validity roots and the secret-compare invariant over the §4 channel roots; update log/summary copy to name both invariants. No global count assertion.
- [x] **`README.md` + `docs/access-wrapper-invariants.md`** — document the two mechanized slices + the retained checklist (§5).
- [x] **`ci.yml`** — update the `access-wrapper-invariants` job name/comment to reflect the widened scope (still no `fetch-depth: 0`, DB/network-free, `pnpm access-wrapper:test` + `pnpm access-wrapper:check`).
- [x] **Verify:** `pnpm access-wrapper:test` (teeth green) + `pnpm access-wrapper:check` (self-green on the current tree, canary satisfied) + confirm it's part of `pnpm ci:local`. Sanity-check by temporarily reverting the 5.4 fix to `!==` locally and confirming the gate goes red, then restore.

### Review Findings

Three-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). All §7 Done-when criteria independently reproduced as PASS (dual-scan, teeth, self-green + `ci:local` wiring, docs, exact `CHANNEL_ROOTS` match, §8 deferral honored). The findings below are gaps in the AST scanner's own coverage, not violations of what's already claimed done.

- [x] [Review][Defer] Switch/case equality bypasses the scanner — `unsafeCompareNode` only matches `BinaryExpression`/`CallExpression` shapes; a verification context written as `switch (token) { case expectedToken: ... }` produces a `SwitchStatement`/`CaseClause`, which has no AST match anywhere in the scanner, so a Story-5.4-shaped defect rewritten as a switch passes clean. — deferred: secret verification is not expected to use switch/case; supporting it widens the heuristic for a pattern with no current usage. Revisit only if a real credential-verification implementation adopts this shape.
- [x] [Review][Patch] Constructor bodies are never scanned — `FunctionLike`/`isFunctionLike` in `lib.ts` omit `ts.ConstructorDeclaration`. Real constructors exist in the scanned surface (`packages/channels/src/providers/{whatsapp-app,telegram-app,sms-app}.ts`); verification/compare logic written directly in one would never be treated as a scan unit, and since constructors also aren't recognized as a scope boundary, a constructor nested inside a scanned method wouldn't stop `collectOwnNodes` either. — **Fixed:** `ts.ConstructorDeclaration` added to `FunctionLike`/`isFunctionLike`; `functionDisplayName` reports `'constructor'`. Teeth: `lib.test.ts` "[review patch] scans a verification context written as a class constructor".
- [x] [Review][Defer] Name-only matching has no import resolution — `calleeName` matches purely on identifier text at the call site. This both under- and over-fires: a locally shadowed/mocked function named `timingSafeEqualString`/`resolveChannelSecret`/`createHmac` satisfies verification/approved-comparator checks regardless of its real implementation, while an aliased import (`import { timingSafeEqual as tse }`) is invisible to the approved-comparator check. — deferred: proper import/symbol resolution requires semantic analysis rather than a cheap AST heuristic, exceeding AI-5-1's intended "cheapest mechanizable slice." Revisit only if aliasing causes a real false negative or false positive.
- [x] [Review][Patch] Verification-signal lexicon is a hardcoded, narrower-than-spec allowlist — `VERIFY_HEADER_KEYS` is a fixed 3-string set and the secret-resolver signal only recognizes the literal name `resolveChannelSecret` (spec §3 says the generic "`*SecretName → value` resolution" pattern). Confirmed live: `apps/api/src/modules/channel-webhooks/handlers.ts`'s `receive()` reads its signature header via an imported constant (`META_SIGNATURE_HEADER`), not the header-key literal, so the header-based verification signal never fires there today — it's only rescued because `receive()` also calls `resolveChannelSecret`/`verifyMetaSignature`. A future handler reading a header via an imported constant without a rescuing secret-resolver call would be invisible to the gate. — **Fixed:** `VERIFY_HEADER_KEYS` replaced with shape-matching `isVerifyHeaderKey` (`x-*-signature[-256]` / `x-*-secret-token` / `hub.verify_token`, case-insensitive); `SECRET_RESOLVER_FN` replaced with `SECRET_RESOLVER_RE = /^resolve.*Secret/i`. Note: this widens the *literal-string* and *identifier-name* matching only — it does not add import/symbol resolution for a header read via an imported constant (that remains the deferred "name-only matching" item above). Teeth: two new tests for a differently-named resolver (`resolveWebhookSecret`) and a differently-shaped header (`x-line-signature`).
- [x] [Review][Defer] Verification signal and compare split across nested scopes evades detection — `collectOwnNodes` deliberately stops at each nested function-like boundary and `isVerificationContext` is evaluated independently per scope. Today's `handlers.ts` methods (`verifyChallenge`/`receive`/`receiveTelegram`) each independently call `resolveChannelSecret`, so they self-qualify — but a refactor that resolves the secret once in the outer factory and only compares it in an inner callback/method (the exact object-literal-methods-in-a-factory shape this code already uses) would silently defeat the gate. — deferred: detecting verification state across nested scopes requires control/data-flow analysis, moving beyond the project's lightweight invariant-gate philosophy. Revisit if future refactoring introduces this pattern in production code.
- [x] [Review][Patch] const-literal exemption is whole-file name-matched, not lexically scoped [scripts/access-wrapper-invariants/lib.ts:296 (`collectConstLiterals`), lib.ts:289 (`isExemptOperand`)] — `collectConstLiterals` walks the entire `SourceFile` unconditionally (no function-boundary stop, unlike `collectOwnNodes`) and stores every `const`-with-literal-initializer name into one flat `Set<string>`, despite the doc comment claiming "module-scope." `isExemptOperand` then exempts any operand by name match alone, regardless of which declaration it binds to. Confirmed independently three ways — Blind Hunter's static analysis, Edge Case Hunter's code reading, and the Acceptance Auditor's live probe (a same-named local const-literal in an unrelated function silently exempted a genuine `token !== expectedToken` compare in `verifyChallenge`, producing 0 findings where 1 was expected). This is a false-negative in the exact invariant the gate claims to enforce, not a coverage-scope question. — **Fixed:** `collectConstLiterals` split into `collectTopLevelConstLiterals` (module-scope statements only) + `collectConstLiteralsFromNodes` (reused per-function against `collectOwnNodes`'s own-node list); `scanSecretCompareInvariant` now unions top-level + this-function-only consts per verification context, so an unrelated function's same-named local can no longer leak an exemption. Teeth: "does NOT let a same-named local const-literal in an UNRELATED function exempt a genuine compare" + "still exempts a genuine module-scope const-literal used across functions".
- [x] [Review][Patch] Fix message omits `==`/`!=` from the listed unsafe operators [scripts/access-wrapper-invariants/lib.ts (`formatSecretCompareFinding`)] — the message lists only `` `===`/`!==`/`.includes`/`.startsWith`/`.localeCompare` `` even though `EQUALITY_OPS` also flags loose `==`/`!=`, so a developer chasing a loose-equality finding gets a misleading remediation description. — **Fixed:** message now lists `` `===`/`!==`/`==`/`!=`/`.includes`/`.startsWith`/`.localeCompare` ``. Teeth: "formatSecretCompareFinding mentions loose equality (==/!=)".

**Dismissed:** Buffer-oriented compare idioms (`Buffer.compare(a,b) === 0`, `.equals()`, `.endsWith()`) — don't chase every compare API; the project convention is one approved helper (`timingSafeEqualString`). If `Buffer.compare()` shows up in review, catch it there; only then consider extending the scanner.

---

## Dev Agent Record

### Implementation plan / key decisions

- **Scope: secret-compare only** (BigDev 2026-07-08). The §8 route-level fail-closed option was NOT built — it stays on the reviewer checklist (`docs/access-wrapper-invariants.md`).
- **Two scanners, one gate.** `lib.ts` keeps `scanAccessWrapperInvariant` (validity, untouched) and adds `scanSecretCompareInvariant`. `check.ts` runs each over its own root set (`VALIDITY_ROOTS` / `CHANNEL_ROOTS`) under the single `access-wrapper-invariants` CI job. No sibling gate script.
- **The real verification code is in object-literal methods, not `FunctionDeclaration`s.** `verifyChallenge` / `receive` / `receiveTelegram` are `MethodDeclaration`s inside a factory's `return { … }`; `verifyMetaSignature` / `timingSafeEqualString` are top-level functions. So the new scanner walks **all** function-like scopes (FunctionDeclaration + MethodDeclaration + Function/Arrow expressions + accessors) and attributes each compare to its innermost enclosing scope via an "own-nodes, don't descend into nested functions" collector — a nested method's finding reports as `verifyChallenge`, not the factory.
- **Two exemptions beyond §3's literal text were required to keep the gate self-green on the real tree** (both principled, not hacks): (i) a `.length` operand (`provided.length !== expected.length` is a public shape guard, never the secret bytes); (ii) a local `const` initialized to a string literal (`header.startsWith(SIGNATURE_PREFIX)` where `SIGNATURE_PREFIX = 'sha256='`). Without these the shipped `signature.ts` would false-positive and the gate could never be green. Both are documented in the README + checklist doc. A compare is exempt iff **either** operand is literal / `.length` / const-literal, so `token !== expectedToken` (both bare runtime) still fires.
- **No canary.** The invariant is conditional-semantic (produced by a verification context), so vacuous-safety needs no synthetic "≥1 compare" assertion — matching §2/§3.

### Debug log

- `pnpm access-wrapper:test` → **17 passed** (9 pre-existing validity + 8 new secret-compare, incl. the (a)–(e) teeth, `.length`/const-literal exemptions, and nested-method attribution).
- `pnpm access-wrapper:check` → **green**: 11 validity files + 54 channel files, 0 findings (self-green by construction).
- **Revert-sanity (the AI-5-1 whole point):** temporarily changed `handlers.ts:72` back to `token !== expectedToken` → gate went **RED**, pinpointing `channel-webhooks/handlers.ts:72 verifyChallenge` (exit 1). Restored → green, zero residual diff on `handlers.ts`. Proves teeth on the actual Epic-5 surface, not a self-green no-op.
- Strict `tsc --noEmit` (ESM/bundler) on the three script files → clean. (`scripts/` is not a turbo workspace, so CI exercises it via vitest + tsx transpile only.)

### Completion notes

Done-criteria (§7) all met: the gate scans the Epic-5 channel surface for the verification-context constant-time-compare invariant **and** still scans validity-service for the caller/internal invariant; the teeth prove it catches the pre-fix 5.4 `!==` shape and clears the legitimate literal/`.length`/const-literal compares; `access-wrapper:check` is self-green and wired into `ci:local` (line 59); README + checklist doc honestly describe two mechanized slices + the retained reviewer checklist. Lands before Epic 6's first claim access story. The AI-4-3 → AI-5-1 scope split (retro I-1) is now closed.

### File List

- `scripts/access-wrapper-invariants/lib.ts` — added `scanSecretCompareInvariant` + `formatSecretCompareFinding` + helpers (validity scanner untouched).
- `scripts/access-wrapper-invariants/lib.test.ts` — added 8 secret-compare teeth tests.
- `scripts/access-wrapper-invariants/check.ts` — `SCAN_ROOT` → `VALIDITY_ROOTS` + `CHANNEL_ROOTS`; runs both invariants; updated summary copy.
- `scripts/access-wrapper-invariants/README.md` — documents the two mechanized slices + verification-context definition.
- `docs/access-wrapper-invariants.md` — added checklist item **(f)** constant-time credential compare (gated); updated intro + "Relationship to the AST gate".
- `.github/workflows/ci.yml` — widened `access-wrapper-invariants` job name/comment to two invariants.
- `_bmad-output/implementation-artifacts/ai-5-1-access-wrapper-gate-extension.md` — this record (frontmatter `baseline_commit`, task checkboxes, Dev Agent Record).

### Change Log

- 2026-07-08 — Implemented AI-5-1: extended the access-wrapper AST gate with the channel-surface constant-time secret-compare invariant over the Epic-5 access surface; validity invariant retained. Secret-compare-only scope. Gate self-green + revert-sanity RED confirmed. Status → review.

## 7. Done when

- The gate scans the Epic 5 channel access surface (§4) for the verification-context constant-time-compare invariant **and** still scans validity-service for the caller/internal invariant.
- Teeth prove it catches the pre-fix 5.4 `!==` shape and clears the legitimate literal/presence compares; the conditional-semantic scoping (verification-context ⇒ constant-time), not a synthetic count, is what makes it complete and vacuous-safe.
- `access-wrapper:check` is self-green on the current tree and wired into `ci:local`.
- README + checklist doc honestly describe two mechanized slices + the retained reviewer checklist.
- Lands before Epic 6's first claim access story, so that surface is covered from day one.

## 8. Open decision for BigDev

The recommended mechanized slice is **constant-time secret compare** (the sharp 5.4 defect; §2). An optional *second* invariant for this gate would be **route-level fail-closed** — assert every route in the §4 `apps/api` modules declares an auth preHandler (`requireMemberSession` / `requireAdminSession` / `requirePermissionHook`, or the webhook signature guard). It's the direct (b)-checklist analog and there is **no separate login-wall gate script** covering it — but it carries higher false-positive risk (the webhook GET-challenge is intentionally signature/verify-token-gated, not session-gated). Recommend shipping the secret-compare invariant now and treating route-fail-closed as a follow-up only if a route-auth defect actually recurs.
