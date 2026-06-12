# Sprint Change Proposal — R1 (epics.md L1147 session-model wording sync)

**Date:** 2026-06-12
**Author:** BigDev (via `bmad-correct-course`)
**Trigger:** PR#15 reviewer note R1
**Scope classification:** Minor — one-line wording sync, zero implementation impact
**Status:** Approved + applied 2026-06-12

---

## 1. Issue summary

Story 1.9's AC at `_bmad-output/planning-artifacts/epics.md` L1147 specified:

> **And** refresh tokens are 90 days; access tokens are short-lived (≤ 15 min)

This imported the **member/mobile** properties of the §2.4 session-model hybrid (`@fastify/jwt` access 15 min + refresh 30d, per architecture.md lines 1417–1420) into the **admin** story. The canonical admin auth posture is the §2.4 *admin-web* leg: `@fastify/session` plugin + Postgres-backed session store, HttpOnly + Secure + SameSite=Lax cookie, **idle 12h / absolute 7d**, server-side revocation by deleting the session row.

The misalignment was surfaced — not silently resolved — in PR#15 (Story 1.9 dev-story closure) per [[feedback_architecture_vs_prd_boundary]] (docs are not edited from inside a dev-story). Recorded as a deferred Correct-course note in `deferred-work.md` Story 1.9 section + ADR-0009 §Decision-2 + Decision 2026-06-12-045.

Story 1.9's implementation already ships the correct cookie model — only the AC text was out of sync.

## 2. Impact analysis

| Artifact | Impact |
|---|---|
| `epics.md` L1147 | One AC line replaced |
| `deferred-work.md` Story 1.9 Correct-course note | Closure language flipped from "Resolved via explicit deferral / surfaced" → "Closed by [edit] 2026-06-12" per [[feedback_closure_language_precision]] |
| PRD / architecture / ADRs | None — §2.4 already canonical; ADR-0009 §Decision-2 already records rationale |
| Stories / sprint plan | None — Story 1.9 is `done`; implementation correct |
| Tests / code | None |

## 3. Recommended approach

**Direct adjustment.** Two coordinated edits, no rollback, no scope change, no re-sprint-planning.

## 4. Detailed change proposals (applied)

### Edit 1 — `_bmad-output/planning-artifacts/epics.md` L1147

**Before:**
```markdown
**And** refresh tokens are 90 days; access tokens are short-lived (≤ 15 min)
```

**After:**
```markdown
**And** the admin session is server-side: `@fastify/session` + Postgres-backed session store, HttpOnly + Secure + SameSite=Lax cookie, **idle 12h / absolute 7d**, server-side revocation by row delete; the session id rotates on every auth-state change (first-factor → MFA-pending, full login, password reset, WebAuthn (re-)enrollment). The "90d refresh / ≤15min access" properties of AR-23 belong to the **member/mobile** leg of the §2.4 hybrid (Story 3.2); "2 trusted devices" (line above) is realised as **≤2 registered WebAuthn passkeys** per admin.
```

**Rationale:** Aligns AC text with architecture.md §2.4 admin-web canonical + ADR-0009 §Decision-2. Inline cross-reference to the §2.4 hybrid + Story 3.2 mobile leg prevents future readers from re-importing the member properties. Preserves the L1146 device-count constraint by re-anchoring it to the WebAuthn passkey count (the actual implementation mechanism).

### Edit 2 — `_bmad-output/implementation-artifacts/deferred-work.md` Story 1.9 Correct-course note

Flipped closure language from "surfaced, NOT silently applied" → "Closed by [edit] 2026-06-12", per [[feedback_closure_language_precision]]. Cross-link added to this proposal. Out-of-scope observation about L1143 / AR-23 carried forward (see §5).

## 5. Observation carried forward (out of L1147 scope)

L1143 Given-line cites **AR-23** (epics.md L290), whose own text reads:

> **AR-23:** Session model hybrid — refresh-token 90d; max 2 trusted devices **per member** (FR-58C-configurable); force-re-OTP signals: SIM-swap-positive, device-binding state change, risk signals from fraud-policy ADR.

The admin story anchoring on the member-side AR is the upstream cause of the wrong import. Two follow-up paths exist:

- **(a)** Re-anchor L1143 from `AR-23` to a §2.4-direct reference, OR
- **(b)** Split AR-23 into AR-23a (admin) + AR-23b (member) in the AR catalog at epics.md L289–291.

**Status:** Deferred per BigDev's one-line bound. Re-trigger: next epics revision OR next correct-course pass touching the AR catalog.

## 6. Implementation handoff

| Field | Value |
|---|---|
| Scope classification | Minor |
| Executor | BigDev (via `bmad-correct-course`, 2026-06-12) |
| Deliverables | Both edits applied + this proposal file persisted |
| Cross-links | `deferred-work.md` Story 1.9 section; `ADR-0009 §Decision-2`; Decision 2026-06-12-045 |
| Downstream | PR#15 reviewer note R1 can be flipped from "Surfaced" → "Closed by [edit]" in the PR body |

## 7. Closure record

- **R1 (epics.md L1147 session-model wording):** Closed by [edit] 2026-06-12.
- **L1143 / AR-23 observation:** Resolved via explicit deferral (not addressed in this pass).
