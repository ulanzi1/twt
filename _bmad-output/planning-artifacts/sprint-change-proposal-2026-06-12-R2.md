# Sprint Change Proposal — R2 (identity/auth carve-out RLS posture — architecture confirmation)

**Date:** 2026-06-12
**Author:** Winston (System Architect) via `bmad-correct-course`; BigDev approving
**Trigger:** Story 1.9 / ADR-0009 §5 closing question — R2 surfaced for architecture confirmation
**Scope classification:** Minor — architecture confirmation + ADR tightening + status flip + closure-language sync; zero implementation impact (the chosen mechanism is already what shipped)
**Status:** Approved + applied 2026-06-12

---

## 1. Issue summary

Story 1.9 landed the global identity/auth tables (`users`, `admin_credentials`, `webauthn_credentials`, `recovery_codes`, `admin_sessions`, `step_up_otps`) and **surfaced — not silently resolved** — a load-bearing architecture question (Reconciliation R2): the *exact RLS mechanism* for tables that are global because **login executes before any `app.pariwar_id` is set**. Three candidates were named in `policies/identity-auth-rls.ts`, ADR-0009 §5, and `deferred-work.md` D7-1.9 / CR-E-5:

1. **ENABLE+FORCE RLS + `USING(true)` carve-out** (what shipped — modeled on `pariwar-passport-rls.ts`)
2. **Dedicated `twt_auth` Postgres role** (the auth repo runs as a role `twt_app` is not a member of)
3. **Documented no-RLS-with-grants** (RLS off these tables; rely on table GRANTs + the narrow auth repo)

D7-1.9 split the gate honestly: *engineering substrate* = Closed by [edit]; *architecture confirmation + trustee ratification* = Resolved via explicit deferral. This proposal closes the **architecture-confirmation** leg. Trustee ratification remains deferred (CR-E-5).

## 2. Architecture confirmation (the verdict)

**Confirmed: Option 1 (ENABLE+FORCE RLS + `USING(true)` carve-out) is the correct v1 posture.** The deciding axis is **regime-consistency under FORCE RLS**, not row-level protection (two of the three options give *zero* row-level protection):

- **Option 3 is dominated by Option 1.** Identical row-level protection (none — `USING(true)` and no-RLS both admit every row to `twt_app`). But Option 3 breaks the Story 1.6 invariant that *every* table `twt_app` touches is RLS-forced, creating a "remembered exception" class where a future owner-run migration or stray `row_security = off` could silently change behaviour, and a future `pariwar_id`-bearing column on an identity table would be unprotected by anything. Option 1 costs one policy per table to keep the invariant whole and make "this table is global" a *visible, auditable* line in the policy catalog rather than the *absence* of one. Same protection, strictly better against regime-drift → take Option 1.

- **Option 2 is the genuinely stronger boundary — and not warranted at Epic 1.** A dedicated `twt_auth` role means a SQL-injection or scope-resolution bug in a *tenant* handler running as `twt_app` could not reach `admin_credentials`, because `twt_app` would lack `SELECT` on it. Real privilege separation. But it fractures the single-pool / `SET LOCAL ROLE twt_app`-per-tx model, adds a third role to a deliberately two-role architecture (§1.2: `twt_app` + `twt_service`), and forces login to switch roles mid-request (authenticate as `twt_auth`, then resolve grants as `twt_app`). "Boring technology" + "developer productivity is architecture" both say: don't buy that complexity now, when the auth repo is already the sole query path and every secret is crypto-hardened at rest. It is the right *graduation*, recorded as a trigger — not the right *start*.

**Substrate verified, not trusted:** the leak suite (`cross-pariwar-leak.spec.ts`) actively asserts `users`/`admin_credentials` as global-readable under an arbitrary active scope (NOT must-return-0), and asserts the retro-FK reject/accept paths. The shipped implementation matches the confirmed mechanism.

## 3. Impact analysis

| Artifact | Impact |
|---|---|
| `policies/identity-auth-rls.ts` + migration `0005` | **None** — the confirmed mechanism is exactly what shipped |
| Tests / code | None |
| `docs/adr/ADR-0009` §5 + status | Three tightenings to §5; status `drafted` → `under-trustee-review`; Consequences line synced |
| `deferred-work.md` D7-1.9 + CR-E-5 | Closure language flipped per [[feedback_closure_language_precision]]: architecture-confirmation leg → "Closed by [edit] 2026-06-12"; trustee ratification stays "Resolved via explicit deferral" |
| PRD / architecture.md / epics / UX | None — §1.2 two-role model + Story 1.6 FORCE-RLS invariant already canonical; this confirms a *control* selection (ADR scope) per [[feedback_architecture_vs_adr_boundary]] |
| Sprint plan / stories | None — Story 1.9 is `done`; implementation correct |

## 4. Recommended approach

**Direct adjustment.** Architecture confirmation + coordinated doc edits, no rollback, no scope change, no re-sprint-planning. Parallel to R1 (`sprint-change-proposal-2026-06-12.md`).

## 5. Detailed change proposals (applied)

### Edit 1 — `docs/adr/ADR-0009` §5: three tightenings

- **(a) `USING(true)` is NOT a row-isolation control.** The confidentiality of identity data rests on three *other* controls — the narrow apps/api auth repo as sole query path, crypto-at-rest (email Tier-1 ciphertext + blind index, Argon2id+pepper, hashed OTPs/recovery codes), and table GRANTs. RLS's role on this family is **regime-consistency** + **auditable explicitness**, not protection. Stated explicitly so no future reader mistakes the policy for a boundary.
- **(b) Asymmetry vs. the Passport carve-out (do not conflate).** `pariwar_passport` is READ-cross / WRITE-isolated (keeps a real `pariwar_id` write boundary — *public-by-design tenant data*); the identity family has **no tenant dimension at all**, so read *and* write are global (*pre-tenant non-data*). Same word, different justification.
- **(c) Graduation trigger to Option 2** recorded: revisit a dedicated `twt_auth` role when (i) a future story adds a `pariwar_id`-bearing column to an identity table that needs scoping, OR (ii) the threat model elevates to "defend credentials against a compromised tenant request-handler" as a first-class boundary.

The §5 blockquote rewritten from "Trustees/architecture to confirm or revise" → "✅ Architecture-confirmed 2026-06-12 (Winston)" with the dominated/unwarranted rationale and a cross-link to this proposal; trustee ratification flagged as the distinct pending gate.

### Edit 2 — `docs/adr/ADR-0009` status block + Consequences

Status `drafted` → `under-trustee-review`; an "Architecture-confirmed: 2026-06-12 (Winston)" line added; the Consequences line "(R2) … awaits architecture confirmation" synced to "architecture-confirmed 2026-06-12; trustee ratification pending."

### Edit 3 — `deferred-work.md` D7-1.9 + CR-E-5

Closure language flipped per [[feedback_closure_language_precision]]: the **architecture-confirmation** leg of R2 → **Closed by [edit] 2026-06-12** (artifact = this proposal + the ADR tightening + the status flip); **trustee ratification** → remains **Resolved via explicit deferral** (CR-E-5 re-trigger: first trustee review session after Epic 1 stabilises). Cross-link to this proposal added.

## 6. Observation carried forward (out of R2 scope)

**Retro-FK existence-oracle (noted, not a concern here).** The retro FKs `role_grants.user_id → users.id` (D4-1.8) and `pariwar_passport.created_by → users.id` (D4-1.7) point from scoped/carve-out tables into the global `users`. A FK existence check can act as an existence oracle — but since `users` is global-readable by `twt_app` anyway, this is **not a new leak**. Carried forward only as the pattern to watch the *next* time a FK points into a genuinely *scoped* table.

**Status:** Resolved via explicit deferral (surfaced for the trustee record; nothing to patch now).

## 7. Implementation handoff

| Field | Value |
|---|---|
| Scope classification | Minor |
| Executor | Winston (System Architect) via `bmad-correct-course`, 2026-06-12 |
| Deliverables | Architecture confirmation (Option 1) + ADR-0009 §5/status/Consequences edits + deferred-work closure flips + this proposal file |
| Cross-links | `ADR-0009 §5`; `deferred-work.md` D7-1.9 / CR-E-5; `policies/identity-auth-rls.ts`; `sprint-change-proposal-2026-06-12.md` (R1) |
| Downstream | ADR-0009 now `under-trustee-review`; the R2 RLS mechanism enters the trustee queue (first review session after Epic 1 stabilises) carrying the Option-2 graduation trigger |

## 8. Closure record

- **R2 (identity/auth carve-out RLS mechanism — architecture confirmation):** Closed by [edit] 2026-06-12 — Option 1 (ENABLE+FORCE+`USING(true)`) confirmed.
- **R2 trustee ratification:** Resolved via explicit deferral (CR-E-5; first trustee review session after Epic 1 stabilises).
- **Retro-FK existence-oracle observation:** Resolved via explicit deferral (not addressed in this pass).
