# Story 3.5: Medical Disclosure with IMA List + Concealment-Denial Ack `[SURFACE]`

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member completing signup,
I want to disclose any IMA-listed pre-existing illnesses with an explicit acknowledgment that concealment can cause claim denial,
so that R14 concealment-penalty enforcement (FR-11, evaluated by Epic 4 Validity Service) has the consent + audit trail to enforce flag-for-State-Trustee-review rather than auto-deny.

### Story context (read this first)

This is the **fourth signup-wizard SURFACE** of Epic 3, the `medical` step in the wizard order `kyc → nominees → medical → payment` (3.4 established this order; this story sits between `nominees.tsx` and the `payment` step that Story 3.6 builds). It builds: the **medical-disclosure HTTP surface** (`POST /api/v1/member/medical-disclosure` submit + a status read + an IMA-list read), a **new Tier-1-encrypted tenant table** `member_medical_disclosures` (mirrors 3.4's `member_nominees` PII pattern — but **append-only history, NOT latest-wins**), the **server-enforced concealment-denial acknowledgment**, the **`member.medical_disclosed` event emission** (widening Story 3.1's stub payload, exactly as 3.4 widened the nominee stub), the **first-ever consumption of the Story 2.7 consent registry** (`recordConsent` with `consentType = 'medical_disclosure_ack'` + the audit-or-throw chain), the **seed of TWO Niyamavali registry clauses** (`niy.medical.ima-list` — the versioned, registry-backed IMA condition catalog the disclosure resolves; and `niy.concealment.r14` — the clause the consent references), and the **member-facing signup screen** `apps/mobile/app/(signup)/medical.tsx`.

**IMA-list design (BigDev-confirmed 2026-06-27): registry-backed (Option A), PRD-literal.** The IMA list is NOT a code-level catalog — it is a Niyamavali clause `niy.medical.ima-list` (payload = the curated condition catalog), resolved per-Pariwar via `resolveByClauseId`, and the recorded `ima_list_version` is that clause's `clause_version_id`. PRD FR-5 line 288: the IMA list is "configured in the rule registry (FR-7) so the list can be updated centrally as the IMA list evolves" — via the Story 2.4 amend flow. See Dev Notes §"Resolved Design Decision".

**Story 3.5 is the FIRST consumer of the consent registry (Story 2.7) anywhere in `apps/api`.** There is no prior `recordConsent` call site to copy from in the app layer — the audit-or-throw orchestration (write the Story 1.10 audit line FIRST, thread its id into `consent_records.audit_id`) must be built here, modeled on the **only existing audit-first-then-thread precedent: the niyamavali amend route** (`apps/api/src/modules/rules/index.ts:~508-518`). Get this right; later stories (3.6 `tc_acceptance`, Epic 6 `claim_time_dpdpa`) will copy 3.5.

**What this story does NOT do (scope guards — mirror the 3.4 / 3.3b boundary discipline):**

- **It does NOT create the member.** Per 3.3b §R2 / 3.4 §R2, **Story 3.6 owns member creation** + signup-wizard assembly. 3.5 ASSUMES a member exists in a pre-lock-in signup state and proves the flow against a seeded member in tests (same posture 3.3b / 3.4 took). `subjectId` for the consent = the member's id (mirror 3.4 — not a "pre-member applicant id").
- **It does NOT wire the Life Events medical-update route** (that is **Story 3.9**, which re-runs this story's submit service behind `requireMemberStepUp(deps, 'medical_disclosure_update')`). 3.5 ships the submit service **re-runnable** so 3.9 attaches the step-up gate + reuses it — exactly the 3.4 nominee posture. **No step-up at signup** (the member is mid-wizard on a fresh signup-continuation session, TTL 30 min per 3.2).
- **It does NOT evaluate concealment or deny/flag any claim.** R14 concealment evaluation (walk the disclosure history, link cause-of-death, flag for State Trustee) is **Epic 4 Validity Service** (epics §Story 4.x, line 1956). 3.5 only records the disclosure + ack so Epic 4 has the audit trail. Do NOT build any evaluation, scoring, or `concealment_review_required` flag here.
- **It does NOT add a lifecycle state transition.** `member.medical_disclosed` is a **non-transition MARKER** — Story 3.1's reducer already returns the current state unchanged for it (`from_state === to_state`; see `member/state.ts:20` MARKER list). Do NOT invent a state or touch the reducer's transition table. (Identical discipline to 3.4's `member.nominees_declared`.)
- **It does NOT assert the lock-in precondition.** Story 3.6's lock-in gate is what checks "medical disclosure + concealment ack recorded" as condition (c) for `member.lock_in_entered` (epics line 1734). That check is **3.6's, not 3.5's**.

## Acceptance Criteria

**AC1 — IMA list (curated, versioned) + multi-select + free-text (FR-5)**
**Given** FR-5 (medical disclosure is v1-M, IMA-list-driven) + UX-DR55 Pattern 4 dignified-validation copy (validated against Story 0.9)
**When** the medical disclosure flow is implemented
**Then** the member is shown the **canonical IMA list** — the curated condition catalog resolved from the **`niy.medical.ima-list` Niyamavali clause** for the member's Pariwar (`resolveByClauseId`) — and selects any applicable conditions (**multi-select; zero selections is valid** — most members disclose nothing); a free-text field collects additional context (optional). The active `ima_list_version` (= the resolved clause's `clause_version_id`) is recorded with the disclosure. Per PRD FR-5 the catalog is centrally updatable via the Story 2.4 amend flow without a code deploy.

**AC2 — Concealment-denial acknowledgment, server-enforced (FR-11)**
**And** the consent block reads explicitly (bilingual en/hi): *"I understand that if I conceal an IMA-listed condition and my death is later linked to that condition, my nominees' claim may be denied or flagged for State Trustee review per Niyamavali clause `niy.concealment.r14`"* — the member must **check the acknowledgment to proceed**. The server REJECTS any submit where `acknowledged !== true` (the ack is **always required**, even when zero conditions are selected — it is the concealment-rule acknowledgment, not a per-condition gate).

**AC3 — Persistence split: event (non-PII) + Tier-1 disclosure row (PII) + consent_records ack (Story 2.7)**
**And** the disclosure is persisted as a `member.medical_disclosed` event carrying **non-PII only** (`{ ...auditShape, ima_list_version, condition_count, acknowledged: true, ack_locale }`, where `ima_list_version` is the resolved `niy.medical.ima-list` `clause_version_id`) — NO condition codes, NO free-text — plus a `consent_records` entry (`consentType = 'medical_disclosure_ack'`, `consentArtifactRef = <clause_version_id of niy.concealment.r14>`, `grantedViaActor = 'member_self'`, `consentPayload = { checkboxTextShown: <the exact localized ack text>, locale, ... }`). The **PII** (selected condition codes + free-text additional context) lives **Tier-1 envelope-encrypted** in `member_medical_disclosures`. The recorded `acknowledgment-text-locale` and `ima_list_version` are non-PII and appear on the disclosure row + event. **Note the two distinct clause references:** `ima_list_version` (which catalog the member saw) and `consent_artifact_ref` (the concealment-ack legal basis) are different `clause_version_id`s.

**AC4 — Append-only disclosure history (Life Events seam, Story 3.9; Epic 4 walks the full history)**
**And** Life Events medical-disclosure-update (Story 3.9) follows the same pattern with a **new event + new disclosure row + new consent row per update** — the table is **APPEND-ONLY** (NOT delete-then-insert latest-wins like nominees): concealment evaluation in Epic 4 **walks the full disclosure history** (epics line 1715, 1956), so every disclosure is preserved with its `ima_list_version` and timestamp. 3.5 ships the submit service re-runnable so 3.9 attaches `requireMemberStepUp(deps, 'medical_disclosure_update')` and reuses it with zero changes.

**AC5 — Accessibility (inherited Story 0.10 P0-2c gate)**
**And** the signup medical screen is screen-reader-accessible: the IMA multi-select, the free-text field, and the concealment-ack checkbox each have proper labels + per-field guidance; the ack text is announced in full before the member can check it (UX-DR55 dignified-validation grammar, UX-DR57 Pattern 6 bilingual input).

**AC6 — Load-bearing: audit-or-throw + clause-resolution guard (no consent/disclosure without a resolvable clause + a chained audit line)**
**Given** the consent registry's compliance invariant (Story 2.7: `consent_records.audit_id` must point at a real Story 1.10 audit line; "Epic 3/6 MUST write the audit line first and thread the id")
**When** the submit handler runs
**Then** it (a) **resolves `niy.concealment.r14` to its current `clause_version_id` in the member's REAL Pariwar** (`resolveByClauseId`) and **fails the submit** (no row, no event, no consent) if the clause is not resolvable — never record a consent with a null/dangling `consent_artifact_ref`; (b) writes the Story 1.10 audit line FIRST (`audit.writeAuditEntry`) and threads its `auditId` into `recordConsent`; (c) runs the disclosure row + event + consent insert inside ONE member scope-tx so any throw rolls back the whole disclosure (audit-or-throw — mirror the niyamavali amend route).

## Tasks / Subtasks

- [x] **Task 1 — `member_medical_disclosures` Tier-1-encrypted tenant table + RLS + migration 0026** (AC3, AC4)
  - [x] Add `packages/domain/src/schema/member_medical_disclosures.ts`. **Append-only history** (NOT latest-wins): **per-disclosure PK** `disclosureId uuid('disclosure_id').defaultRandom().primaryKey().$type<MedicalDisclosureId>()` — a NEW row per disclosure, multiple rows over time by design (AC4; unlike `member_nominees`' composite `(member_id, rank)` latest-wins PK). Columns:
    - `memberId uuid` FK → `members.memberId` **`onDelete: 'cascade'`** (RTBF Story 3.12) — NOT `.primaryKey()` here (the PK is `disclosure_id`).
    - `pariwarId uuid('pariwar_id').notNull().$type<PariwarId>()` (RLS predicate, branded).
    - `imaListVersion text('ima_list_version').notNull()` — the resolved `niy.medical.ima-list` `clause_version_id` the member saw (**non-PII**; held as `text` exactly like `consent_records.consent_artifact_ref` holds a `clause_version_id`).
    - `disclosedConditionsCiphertext piiColumn(1, 'member_medical')('disclosed_conditions_ciphertext').notNull()` — Tier-1 ciphertext of the canonical-JSON array of selected condition codes (encrypt `[]` when zero selected so the column is always non-null and round-trips).
    - `additionalContextCiphertext piiColumn(1, 'member_medical')('additional_context_ciphertext')` NULLABLE — Tier-1 free-text.
    - `conditionCount smallint('condition_count').notNull()` — **non-PII** count (0..N) for summary/audit/event (mirrors 3.4 `nominee_count` discipline — a count is metadata, not health data; see Dev Notes §"Medical field sensitivity").
    - `acknowledgedAt timestamptz('acknowledged_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()` — DB-authoritative ack instant (§1.11).
    - `acknowledgmentTextLocale text('acknowledgment_text_locale').notNull()` — `'hi' | 'en'` (which locale the ack text was shown in; constrain in the contract, not the DB).
    - `clauseVersionId uuid('clause_version_id').notNull().$type<ClauseVersionId>()` — the `niy.concealment.r14` version acknowledged (self-contained provenance on the row; also stored in `consent_records.consent_artifact_ref`). **No FK** — `clause_versions` is tenant-scoped and the ref is resolved at write time; mirror the consent registry's "no FK on `consent_artifact_ref`" decision.
    - `consentId uuid('consent_id').notNull().$type<ConsentId>().references(() => consentRecords.consentId)` — FK link disclosure → the consent row created in the same tx (insert consent FIRST, then the disclosure carries its id). **Import `consentRecords` from `'../schema/consent_records.js'`** — this import is NOT in the `member_nominees.ts` template (nominees have no FK to `consent_records`), so it must be added explicitly.
    - `createdAt timestamptz('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow()`.
    - Add an index on `(pariwar_id, member_id)` (the history-read lookup key; mirror `consent_records_pariwar_subject_type_idx` style).
    - Header style, `piiColumn` tier, snake_case-column / camelCase-field naming: **mirror `member_kyc_profiles.ts` / `member_nominees.ts`**.
  - [x] Add `MedicalDisclosureId` branded id to `packages/domain/src/ids/index.ts` (mirror `ConsentId`).
  - [x] Add `packages/domain/src/policies/member-medical-disclosures-rls.ts` — tenant-isolated RLS, mirror `member-nominees-rls.ts` (NOT the global identity-auth carve-out).
  - [x] Re-export the table in `packages/domain/src/schema/index.ts`; register the policy in `packages/domain/src/policies/index.ts`.
  - [x] Register field-class `MEMBER_MEDICAL_FIELD_CLASS = 'member_medical'` in `apps/api/src/context.ts` (mirror `MEMBER_NOMINEE_FIELD_CLASS`).
  - [x] **Migration `0026_member-medical-disclosures.sql` — HAND-AUTHORED** (do NOT run `db:generate`). Per 3.4's debug log: drizzle-kit's `meta/` snapshots stop at 0020, so `db:generate` would diff against `0020_snapshot.json` and re-emit applied migrations → `42P07` ([[project_live_db_test_gotchas]]). Hand-author `0026_member-medical-disclosures.sql` mirroring `0025_member-nominees.sql` (table + FK-cascade to `members` + FK to `consent_records` + GRANT SELECT/INSERT + FORCE RLS + the 2 RLS policies). **Append-only ⇒ GRANT is SELECT, INSERT only (NO UPDATE, NO DELETE** beyond the FK cascade — disclosures are immutable history, mirror the consent-records "no DELETE" rationale). Add the `_journal.json` idx-26 entry manually (`when` = 3.4's idx-25 `1782877200000` + `86400000` = `1782963600000`, continuing the one-day cadence). Apply + verify on `:5433`.

- [x] **Task 2 — Domain accessors (encrypted append-write + history read) + IMA catalog module** (AC1, AC3, AC4)
  - [x] Add `packages/domain/src/medical/disclosure-write.ts` — `appendMedicalDisclosure(tx, { memberId, pariwarId, imaListVersion, disclosedConditionsCiphertext, additionalContextCiphertext, conditionCount, acknowledgmentTextLocale, clauseVersionId, consentId })`: **INSERT one new row** (append-only — NO delete-then-insert). Accepts pre-encrypted ciphertext (encryption is app-layer per 3.3b/3.4 — caller pre-encrypts; do NOT encrypt inside the accessor). Returns the inserted row.
  - [x] Add `packages/domain/src/medical/disclosure-read.ts` — `getMedicalDisclosures(tx, pariwarId, memberId)` returns the full history rows (newest-first, ciphertext + non-PII) and `getLatestMedicalDisclosure(tx, pariwarId, memberId)` for the status summary. Add a `medical/index.ts` barrel + export the `medical` namespace from `packages/domain/src/index.ts` (mirror the `nominee` namespace export at `index.ts:118`).
  - [x] **IMA catalog resolver (registry-backed — Option A, BigDev-confirmed; see Dev Notes §"Resolved Design Decision"):** Add `packages/domain/src/medical/ima-list.ts` — a **registry resolver**, NOT a static catalog: `export const IMA_LIST_CLAUSE_ID = 'niy.medical.ima-list' as ClauseId;` + a Zod schema `ImaListPayloadSchema = z.object({ conditions: z.array(z.object({ code: z.string().min(1), label_en: z.string(), label_hi: z.string() }).strict()).min(1), ... }).passthrough()` validating the clause payload shape + `resolveImaList(tx, pariwarId)` → resolves `resolveByClauseId(tx, pariwarId, IMA_LIST_CLAUSE_ID)`, parses+validates `row.payload` against `ImaListPayloadSchema`, and returns `{ version: row.clauseVersionId, conditions: parsed.conditions }` (or `null` if the clause is absent). Add `isKnownImaCode(conditions, code)` as a pure helper over a resolved condition set. The returned `version` (a `clause_version_id`) is what gets recorded as `ima_list_version`. **`medical/` may import `niyamavali` accessors** (both are `@twt/domain`-internal — no turbo cycle).

- [x] **Task 3 — Seed TWO Niyamavali clauses: `niy.medical.ima-list` + `niy.concealment.r14`** (AC1, AC2, AC3, AC6)
  - [x] Add BOTH `clause_versions` rows to `packages/domain/seed/niyamavali-v1-clauses.sql` (the existing Story 2.3 seed; idempotent `ON CONFLICT DO NOTHING`). **BOTH MUST carry `benefit_mechanism = 'pool'`** — the Story 1.16d benefit-mechanism CI gate reads `seed_globs: [packages/domain/seed/niyamavali-*.sql]` and asserts every record carries a v1-permitted mechanism (`pool`). Use the next sequential synthetic `clause_version_id`s under the same synthetic seed Pariwar `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, `version 1`.
    - **`niy.medical.ima-list`** (`clause_version_id = '0e1c0004-0000-4000-8000-000000000004'`) — the curated IMA condition catalog. Payload (opaque JSONB, snake_case keys, `provisional: true`): `{"rule_code":"IMA-LIST","title_en":"IMA-listed serious illnesses (disclosure catalog)","conditions":[{"code":"ckd","label_en":"Chronic kidney disease","label_hi":"…"},{"code":"malignancy","label_en":"Cancer / malignancy","label_hi":"…"}, … ~8–12 PROVISIONAL entries: cardiovascular disease, stroke, severe diabetes complications, chronic liver disease, severe respiratory/COPD, HIV/AIDS, etc.],"provisional":true}`. Mark **PROVISIONAL per OQ-13** — the canonical IMA source is a pre-launch Trustee-Panel open question, exactly like the niyamavali seed's "PROVISIONAL / structural" content. The bilingual `label_en` / `label_hi` in the payload are what the screen renders (so the IMA condition labels are NOT i18n keys — only the chrome + ack copy are; Task 9).
    - **`niy.concealment.r14`** (`clause_version_id = '0e1c0005-0000-4000-8000-000000000005'`) — the concealment-ack legal basis. Payload: `{"rule_code":"R14","title_en":"Concealment denial — undeclared IMA-listed illness","ack_text_en":"<the AC2 English ack copy>","ack_text_hi":"<the AC2 Hindi ack copy>","never_auto_deny":true,"provisional":true}`. (Storing the canonical ack text in the clause payload makes the consent's `consent_artifact_ref` resolve to the exact acknowledged wording — Epic 4 provenance.)
  - [x] **Per-Pariwar seeding note (do NOT skip):** the niyamavali registry is **per-Pariwar** (RLS); `resolveByClauseId` resolves within the member's REAL Pariwar at runtime. The seed only populates the synthetic seed Pariwar. So **API/integration tests MUST seed BOTH `niy.medical.ima-list` AND `niy.concealment.r14` into the test member's Pariwar** (insert `clause_versions` rows in the test's Pariwar before submitting); the AC6 resolution-guard tests assert clean failures when either is absent. Real-Pariwar provisioning (the per-Pariwar registry bootstrap that lands both clauses in every production Pariwar) is a Story 1.15 / Story 2.4 concern, NOT 3.5 — but document the dependency in Dev Notes so 3.6/provisioning wires it.
  - [x] **Story 4.4 cross-reference — do NOT over-engineer the seed payload:** Epic 4 Story 4.4 also allocates `niy.concealment.r14` with rule-engine evaluation decision logic (structured JSONB for the R14 engine). The 3.5 seed is the **consent-ack v1 only** (ack text + `never_auto_deny`). Story 4.4 will **amend** this clause via the Story 2.4 amend flow (new `clause_version_id`, same `clause_id`). Design the seed payload as the consent-layer minimum — do NOT pre-bake evaluation fields (scoring, flag criteria, etc.) into the v1 payload; those belong to Story 4.4. The `clause_id` string `'niy.concealment.r14'` is shared and must be identical in both stories.

- [x] **Task 4 — Widen `MedicalDisclosedPayloadSchema` (non-PII)** (AC3)
  - [x] In `packages/domain/src/member/events.ts`, replace the stub `MedicalDisclosedPayloadSchema = z.object({ ...auditShape }).strict()` (line 118) with `z.object({ ...auditShape, ima_list_version: z.string().min(1), condition_count: z.number().int().nonnegative(), acknowledged: z.literal(true), ack_locale: z.enum(['en', 'hi']) }).strict()`. **NO condition codes / free-text in the payload** — the `events_log` payload is plaintext JSONB and must never carry PII (the 3.4 nominee precedent: count + shape only). The reducer in `member/state.ts` already treats `member.medical_disclosed` as a MARKER (identity, non-transition — `state.ts:20`) — **verify, do not change** (widening the Zod payload does not change reducer behavior; mirror 3.4 R5).
  - [x] Confirm the `EVENT_TYPE_REGISTRY` entry in `packages/events/src/registry.ts:54` still validates against the widened schema (it imports the same schema object — no edit expected, but run the registry test).

- [x] **Task 5 — Contracts (transport DTOs + OpenAPI)** (AC1, AC2, AC3)
  - [x] Add `packages/contracts/src/medical/disclosure.ts`:
    - `MedicalDiscloseRequest` = `{ conditionCodes: string[] (0..N, .strict()), additionalContext?: string (max len), imaListVersion: string, acknowledged: z.literal(true), ackLocale: z.enum(['en','hi']) }` — `acknowledged` is `z.literal(true)` so the contract itself rejects a false/absent ack (defense-in-depth; the server still re-checks per AC2/AC6).
    - `MedicalDisclosureSummary` (status read, **non-PII echo discipline** — mirror 3.4 `NomineeSummaryEntry`): `{ disclosedAt, imaListVersion, conditionCount, hasAdditionalContext: boolean, ackLocale }` — **NEVER echo raw condition codes / free-text back**.
    - `MedicalDisclosureStatusResponse` = `{ latest: MedicalDisclosureSummary | null, historyCount: number }` (object wrapper, not a bare array — follow the `KycStatusResponse` / `NomineeStatusResponse` convention).
    - `ImaListResponse` = `{ version: string, conditions: { code, labelEn, labelHi }[], ackText: { en: string, hi: string } }` — the catalog + the resolved concealment-ack copy for the screen.
    - **Contracts MUST NOT import `@twt/domain`** (browser-bundle rule) — re-declare any wire shapes from `_common` primitives + `.strict()`.
  - [x] Add `packages/contracts/src/medical/index.ts`; export from `packages/contracts/src/index.ts`; add components + path registration in `packages/contracts/scripts/emit-openapi.ts` (mirror the `nominee` blocks); regenerate `openapi/v1.yaml` via the emit script (contracts-determinism gate must stay green).

- [x] **Task 6 — API module (`apps/api/src/modules/medical/`)** (AC1, AC2, AC3, AC4, AC6)
  - [x] `medical.routes.ts` — register `POST /api/v1/member/medical-disclosure` (submit), `GET /api/v1/member/medical-disclosure` (status), `GET /api/v1/member/medical-disclosure/ima-list` (catalog + ack text) behind `requireMemberSession(deps)`. **No step-up preHandler at signup** (3.9 adds `requireMemberStepUp(deps, 'medical_disclosure_update')` on its Life Events route).
  - [x] `medical-crypto.ts` — `encryptMedicalField` / `decryptMedicalField` keyed on the member's REAL `pariwarId` + `MEMBER_MEDICAL_FIELD_CLASS`. **Mirror `apps/api/src/modules/nominee/nominee-crypto.ts` verbatim.**
  - [x] `medical.handlers.ts` — the submit handler (THE load-bearing path; build in this exact order):
    1. `openScopeTx(deps, pariwarIdStr)`; guard member exists and is **not** terminal. **`getMemberStateAt` never returns null** — non-existent members replay to `pending-kyc` (empty stream → initial state; confirmed at `packages/domain/src/member/read.ts:42`, return type `Promise<MemberLifecycleState>`). To address 3.4's deferred D3 with a clean 409: **add an explicit member existence check first** — query `members WHERE member_id = $memberId` within the pariwar scope; if not found, throw `ConflictError('Member not found', 'medical.member_not_found')` before calling `getMemberStateAt`. Then call `getMemberStateAt` and check `if (TERMINAL_STATES.has(state))` for terminal-state rejection. **Do NOT write `if (!state)` — TypeScript rejects it (never-null type).** The FK on `member_medical_disclosures → members` is a data-integrity safety net, but it produces a 500, not a clean 409.
    2. Validate `acknowledged === true` (AC2/AC6).
    3. **Resolve BOTH clauses (AC6 — no disclosure/consent without resolvable clauses):**
       - `const imaList = await medical.resolveImaList(scopeTx.tx, pariwarId)` → if `null`, throw a clear typed error (`medical.ima_list_unavailable`). Validate **every** submitted code: `const unknownCodes = conditionCodes.filter(c => !isKnownImaCode(imaList.conditions, c)); if (unknownCodes.length > 0) throw new BadRequestError(\`Unknown IMA condition codes: ${unknownCodes.join(', ')}\`, 'medical.unknown_condition_code');` — reject all-at-once with a 400. Record `ima_list_version = imaList.version` (the resolved `clause_version_id` — **server-authoritative**, do not trust a client-supplied version; an optimistic client `imaListVersion` may be compared to detect staleness but the server's resolved version wins).
       - `const concealment = await niyamavali.resolveByClauseId(scopeTx.tx, pariwarId, 'niy.concealment.r14' as ClauseId)` → if `null`, throw `medical.concealment_clause_unavailable` (AC6). Capture `concealment.clauseVersionId` + the canonical ack text from its payload: `const ackText = ackLocale === 'hi' ? concealment.payload.ack_text_hi : concealment.payload.ack_text_en;` (the `niy.concealment.r14` payload stores both locales as `ack_text_en` / `ack_text_hi` — Task 3).
    4. Encrypt: `disclosedConditionsCiphertext = encryptMedicalField(canonicalJsonStringify(conditionCodes))`; `additionalContextCiphertext = additionalContext ? encryptMedicalField(additionalContext) : null`. **Always encrypt even when `conditionCodes = []`** — the column is non-null; `canonicalJsonStringify([]) = '[]'` encrypts to a valid ciphertext.
    5. **Audit-or-throw (mirror `rules/index.ts:508-518`):** `const auditRow = await audit.writeAuditEntry(deps.servicePool, { pariwarId, actorId: memberIdStr, actorRole: null, action: 'member_medical.disclosed', resourceLocator: \`member:${memberIdStr}:medical-disclosure\`, requestPayloadHash: sha256(canonicalJson({ ima_list_version: imaList.version, condition_count, concealment_clause_version_id: concealment.clauseVersionId })), responseStatus: 200, traceId });` → `const auditId = auditRow.auditId;`. **The hash is over NON-PII only** (never the condition codes / free-text).
    6. `const consentRow = await consent.recordConsent(scopeTx.tx, { pariwarId, subjectId: memberIdStr, consentType: 'medical_disclosure_ack', consentArtifactRef: concealment.clauseVersionId, grantedViaActor: 'member_self', consentPayload: { checkboxTextShown: ackText, locale: ackLocale }, auditId });` — **omit `consentId`** (let the DB generate it via `defaultRandom()`); use `consentRow.consentId` from this return value in step 7. Pre-generation is NOT needed: `writeAuditEntry` does not consume `consent_id`, so there is no audit-references-consent linkage to protect. The returned row provides the id for threading.
    7. `await medical.appendMedicalDisclosure(scopeTx.tx, { memberId, pariwarId, imaListVersion: imaList.version, disclosedConditionsCiphertext, additionalContextCiphertext, conditionCount, acknowledgmentTextLocale: ackLocale, clauseVersionId: concealment.clauseVersionId, consentId: consentRow.consentId });`
    8. `await memberDomain.projectMemberState(scopeTx.client, { memberId, pariwarId, eventType: 'member.medical_disclosed', payload: { from_state: state, to_state: state, trigger: 'medical_disclosure', actor: 'member', ima_list_version: imaList.version, condition_count, acknowledged: true, ack_locale: ackLocale }, actorId: memberIdStr });` (from_state === to_state — non-transition marker).
    9. **Assemble the response and set `ok = true`:** `const result = await buildStatus(scopeTx, pariwarId, memberId);` (calls `getMedicalDisclosures` once — see status handler for derivation); set `ok = true` ONLY after this succeeds. **3.4 P2 discipline: `emitAuthAudit` must NOT fire before `ok = true`** — if `buildStatus` throws, the scope tx rolls back and a fire-and-forget audit entry would have been emitted against a rolled-back write.
    10. `emitAuthAudit(deps, request, 'member_medical.disclosed', { actorId: memberIdStr, pariwarId: pariwarIdStr, context: { ima_list_version, condition_count } });` (**no PII** — mirror 3.4). Placed **AFTER `ok = true`** — exactly the nominee handler pattern: `result = await buildStatus(...)` → `ok = true` → `emitAuthAudit(...)` → `return result`. Keep the **chained `writeAuditEntry` + `recordConsent` inside the scope tx** so a later throw rolls them back.
    11. `closeScopeTx(scopeTx, ok)` in `finally`.
  - [x] `medical.handlers.ts` — **status handler:** call `getMedicalDisclosures(tx, pariwarId, memberId)` once → derive `latest` from `rows[0]` (map to `MedicalDisclosureSummary` with no-PII echo-back: `hasAdditionalContext = row.additionalContextCiphertext !== null`, never the raw codes/text; decrypt NOTHING for the summary) and `historyCount` from `rows.length`. **Do NOT add a separate COUNT query** — one call, two values. **ima-list handler:** resolve BOTH `niy.medical.ima-list` (→ `version` + `conditions` bilingual) and `niy.concealment.r14` (→ `ackText: { en: payload.ack_text_en, hi: payload.ack_text_hi }`) — return `ImaListResponse`. **If either clause is absent, return HTTP 503 Service Unavailable** (`medical.ima_list_service_unavailable` / `medical.concealment_clause_service_unavailable`) — 503 signals the registry is unprovisioned for this Pariwar (not a client error); the screen should render a graceful "disclosure unavailable" state. The SUBMIT path still returns 409 per AC6 — 503 is for the GET path only.
  - [x] **Do NOT add a `medical.repo.ts`** — there is no PUBLIC pre-scope path (every route is member-session-gated), exactly the 3.4 rationale for omitting `nominee.repo.ts`. Add `index.ts` exporting `registerMedicalModule`; wire it in `apps/api/src/server.ts` next to `registerNomineeModule`.
  - [x] Register the `member_medical.disclosed` audit type in `apps/api/src/audit/audit-sink.ts` (mirror the `member_nominees.declared` registration 3.4 added).

- [x] **Task 7 — Server-side ack enforcement + clause-resolution guard** (AC2, AC6)
  - [x] Enforce `acknowledged === true` server-side (never trust only the client `z.literal(true)`): reject with a 400 `medical.acknowledgment_required` when false/absent.
  - [x] Enforce the clause-resolution guard for BOTH clauses: a 409/422 `medical.ima_list_unavailable` when `resolveImaList` returns null, and `medical.concealment_clause_unavailable` when `resolveByClauseId('niy.concealment.r14')` returns null — in either case the whole submit fails atomically (no disclosure row, no event, no consent, no orphan). Test BOTH paths explicitly (AC6).

- [x] **Task 8 — Mobile signup screen** (AC1, AC2, AC5)
  - [x] Add `apps/mobile/app/(signup)/medical.tsx` — the IMA multi-select (checkbox list from `GET .../ima-list`), the optional free-text "additional context" field, and the concealment-ack checkbox showing the full AC2 copy (member cannot submit until checked; the submit CTA is disabled until ack is checked). Mirror `apps/mobile/app/(signup)/nominees.tsx` for structure, the api-client call, and screen chrome. Add the screen to the `(signup)` group (the `_layout.tsx` Stack already hosts the group; place after `nominees`).
  - [x] Accessibility (AC5): every control labelled + per-field guidance; the **full ack text announced** before the checkbox; zero-selection state is clearly conveyed ("You haven't selected any conditions — you can still continue"). Bilingual via `@twt/i18n` (Pattern 6).
  - [x] Add the api-client methods in `packages/api-client/src/index.ts` (`medicalDisclose` / `medicalStatus` / `medicalImaList` — mirror the `nomineesDeclare` / `nomineesStatus` client methods).

- [x] **Task 9 — i18n copy** (AC1, AC2, AC5)
  - [x] Add the medical-flow **chrome** strings (screen title/intro, free-text label/placeholder, the zero-selection reassurance, submit CTA, error messages) to `packages/i18n/locales/en/common.json` + `packages/i18n/locales/hi/common.json`. Follow the tone guide (Story 2.2) — calm-precise member register; dignified-validation grammar (UX-DR55). **NOTE (Option A):** the **IMA condition labels** are NOT i18n keys — they come bilingual from the `niy.medical.ima-list` clause payload (`label_en` / `label_hi`) via the API. The **concealment-ack copy** is also sourced from the `niy.concealment.r14` clause payload (`ack_text_en` / `ack_text_hi`, Task 3) and is what the screen renders + what gets consent-recorded as `checkboxTextShown` — one canonical wording, authored once in the seed. (i18n carries only the non-clause chrome; do NOT duplicate the ack copy or condition labels into i18n.)

- [x] **Task 10 — Tests** (all ACs)
  - [x] Domain unit: `packages/domain/tests/medical/disclosure.test.ts` — IMA catalog integrity (`isKnownImaCode`, version), event-payload `.strict()` **rejects PII keys** (no `conditions` / `additional_context` / free-text), `condition_count`/`ima_list_version` accepted.
  - [x] Domain integration (DB-gated, `:5433`): `packages/domain/tests/integration/medical/member-medical-disclosures.spec.ts` — RLS isolation (cross-Pariwar denial, mirror `members-policy-regression.spec.ts`), FK cascade on member delete (RTBF Story 3.12), encrypted round-trip (conditions array + free-text), **append-only history** (two submits → two rows, both preserved — assert **membership not counts**, own-committing writers accumulate rows [[project_live_db_test_gotchas]]).
  - [x] API integration: `apps/api/tests/integration/medical/medical-disclose.spec.ts` — seed a member in `pending-fee` (3.3b/3.4 `seedMember` helper) **+ seed BOTH `niy.medical.ima-list` AND `niy.concealment.r14` into the member's Pariwar**; assert: submit → one `member.medical_disclosed` event (non-PII payload, from_state===to_state, `ima_list_version` === resolved ima-list `clause_version_id`) + one `consent_records` row (`medical_disclosure_ack`, `consent_artifact_ref` === resolved `niy.concealment.r14` `clause_version_id`, `audit_id` non-null pointing at a real chain line) + one `member_medical_disclosures` row (encrypted, condition codes NOT in the event/audit/plaintext); **unknown condition code → 400**; **zero-conditions submit is valid** (count 0, still emits event + consent); **ack=false → 400**; **ima-list-clause-absent → 409 with NO partial writes** AND **concealment-clause-absent → 409 with NO partial writes** (AC6 — for each, assert no event, no consent, no disclosure row after the failure); re-submit appends a 2nd disclosure (history grows, AC4); terminal-state → 409; status GET no-PII echo-back; no-token → 401.
  - [x] Run `pnpm ci:local` ([[project_ci_actions_suspension_local_mirror]]) as the merge gate (CI Actions still suspended); integration needs `DATABASE_URL` on `:5433`. Watch for the known pre-existing parallel-`:5433` `test (unit)` flake 3.4 documented (re-run to confirm green; the canonical `integration-tests` job is the signal). **All 18 jobs green.**

- [x] **Task 11 — Friction-budget disposition + sprint ledger** (housekeeping)
  - [x] The friction-budget CI gate fires on the new member-facing path. Add a **Story 3.5 disposition note** to `friction-budget.md` (mirror the "Story 3.4 disposition" paragraph): medical disclosure is **necessary v1-M signup data entry + a mandatory compliance acknowledgment, zero gratuitous friction** — **no new ledger row warranted**. Verify the new mobile screen stays **under** the `friction-budget.yaml` page-weight ceiling; **do not touch the best-ever baseline** unless the measurement DECREASES it ([[project_friction_budget_baseline_ratchet]]).
  - [x] On completion, flip `development_status[3-5-medical-disclosure-with-ima-list-concealment-denial-ack]` and append the combined `ready-for-dev→in-progress→review` ledger COMMENT entry per [[project_sprint_status_ledger]].

## Dev Notes

### Reuse map — extend these, do NOT reinvent

| Need | Reuse (do not rebuild) | Source |
| --- | --- | --- |
| Tier-1 encrypted PII table (column pattern + naming) | `member_nominees.ts` / `member_kyc_profiles.ts` + `piiColumn(1, fieldClass)` | `packages/domain/src/schema/member_nominees.ts`, `member_kyc_profiles.ts`, `encryption/column.ts` |
| App-layer encrypt/decrypt helpers | `nominee-crypto.ts` (`encryptNomineeField` / `decryptNomineeField`) | `apps/api/src/modules/nominee/nominee-crypto.ts` |
| RLS policy for a member tenant table | `member-nominees-rls.ts` | `packages/domain/src/policies/` |
| Consent registry grant | `consent.recordConsent(db, { consentType, consentArtifactRef, grantedViaActor, consentPayload, auditId, consentId })` | `packages/domain/src/consent/write.ts` |
| **Audit-or-throw chain (write audit FIRST, thread id)** | the niyamavali amend route — the ONLY precedent | `apps/api/src/modules/rules/index.ts:508-518` |
| Hash-chain audit-line writer (returns `auditId`) | `audit.writeAuditEntry(deps.servicePool, {...})` | `packages/domain/src/audit/write.ts:118` |
| Clause resolution (BOTH `niy.medical.ima-list` + `niy.concealment.r14` → `clause_version_id`) | `niyamavali.resolveByClauseId(db, pariwarId, clauseId, asOf?)`; wrapped for the catalog by `medical.resolveImaList` | `packages/domain/src/niyamavali/read.ts`, `packages/domain/src/medical/ima-list.ts` |
| Event emission from a handler | `memberDomain.projectMemberState({ eventType, payload, actorId })` | `apps/api/src/modules/kyc/kyc.handlers.ts:243` |
| Scope-tx lifecycle | `openScopeTx` / `closeScopeTx` | `apps/api/src/modules/nominee/nominee.handlers.ts` |
| Member-session guard | `requireMemberSession(deps)` | `apps/api/src/modules/auth/shared/member-session-guard.ts` |
| Step-up gate (for 3.9, NOT here) | `requireMemberStepUp(deps, 'medical_disclosure_update')` | `apps/api/src/modules/auth/member/member-step-up.gate.ts` |
| Contracts DTO + no-PII-echo discipline | `nominee/declaration.ts` (`NomineeSummaryEntry` presence flags) | `packages/contracts/src/nominee/declaration.ts` |
| Mobile signup screen | `(signup)/nominees.tsx` + `(signup)/_layout.tsx` | `apps/mobile/app/(signup)/` |
| Event vocabulary + reducer (marker) | `member.medical_disclosed` (already declared, no-op marker) | `packages/domain/src/member/events.ts:118`, `member/state.ts:20` |

### R1 — The load-bearing PII split: event = audit, projection = data (NO PII in the event-log)

Identical discipline to 3.4 R1 and 3.3b. **Raw PII never enters the `events_log` payload** (plaintext JSONB). `member.medical_disclosed` carries `{ ...auditShape, ima_list_version, condition_count, acknowledged, ack_locale }` only; the **selected condition codes + free-text additional context** go Tier-1 envelope-encrypted into `member_medical_disclosures`. The event stream is the immutable timeline of WHEN disclosures happened; the table holds the encrypted WHAT.

### R2 — Append-only history (NOT latest-wins) — the key structural difference from 3.4

3.4 nominees are **latest-wins** (delete-then-insert; the current row-set is the effective declaration). **Medical disclosures are the opposite: APPEND-ONLY.** Epics line 1715 + 1956 are explicit — Epic 4 concealment evaluation "walks the **full disclosure history** (not just the most recent)". So every submit INSERTs a new `member_medical_disclosures` row + a new `member.medical_disclosed` event + a new `consent_records` row, all preserved with their `ima_list_version` + timestamp. Do NOT delete prior disclosures; do NOT reuse `replaceMemberNominees`' delete-then-insert shape. The table GRANT is SELECT + INSERT only (no UPDATE/DELETE — immutable history, mirror the consent-records "revoke is a mutate, never a delete; GRANT excludes DELETE" rationale).

### R3 — First consent-registry consumer: the audit-or-throw chain (get this exactly right)

Story 3.5 is the FIRST `recordConsent` call site in `apps/api`. The consent registry's compliance invariant (Story 2.7 `consent/write.ts` header): "Epic 3/6 MUST write the audit line first and thread the id, or the row carries `audit_id = NULL` (a compliance gap the FK alone cannot force)." The ONLY existing audit-first-then-thread precedent is the niyamavali amend route (`rules/index.ts:508-518`): `audit.writeAuditEntry(deps.servicePool, {...})` returns a row with `auditId`, which is then threaded into the registry insert. **Copy that pattern.** Ordering inside the submit handler: resolve clause → `writeAuditEntry` (→ `auditId`) → `recordConsent({ auditId, consentId: pre-generated })` → `appendMedicalDisclosure({ consentId })` → `projectMemberState` event → `emitAuthAudit` (fire-and-forget, last). The `writeAuditEntry` runs on `deps.servicePool` (BYPASSRLS, its own tx) — same as the niyamavali route; an orphan audit line on a later rollback is the known, benign, accepted artifact (audit lines are append-only facts). Everything else (consent insert, disclosure insert, event) is inside the member scope-tx so a throw rolls them back together (AC6).

### R4 — `member.medical_disclosed` is a non-transition marker (reducer untouched)

Per Story 3.1 (`member/state.ts:20` MARKER list) — `member.medical_disclosed` is emitted on the stream but is **NOT a state transition**; the reducer returns the current state unchanged. The event payload's `from_state` MUST equal `to_state` (= the member's current state at submit time). Do NOT add a transition, a phantom state, or special-case the reducer. Widening the Zod payload (Task 4) does not change reducer behavior. (Same as 3.4 R5 for nominees.)

### R5 — The ack is ALWAYS required (even with zero conditions)

AC2's acknowledgment is the **concealment-rule** acknowledgment, not a per-condition gate. Every member completing the medical step must check it — including the (common) healthy member who selects zero conditions. A zero-condition submit is valid and STILL records the event + consent + a disclosure row (`condition_count = 0`, conditions ciphertext = encrypted `[]`). This matters because Story 3.6's lock-in gate requires "medical disclosure + concealment ack recorded" (epics line 1734 condition (c)) — the ack/event must exist even for members who disclose nothing. Server enforces `acknowledged === true` regardless of `condition_count`.

### R6 — Clause resolution is per-Pariwar; seed BOTH clauses into the test Pariwar

The niyamavali registry is per-Pariwar (RLS). `resolveByClauseId(db, memberPariwarId, …)` resolves within the member's REAL Pariwar — NOT the synthetic seed Pariwar. The Task 3 seed only populates the synthetic Pariwar (`aaaaaaaa-…`), which is enough for dev/staging fixtures + the benefit-mechanism CI gate's teeth, but **API/integration tests MUST insert BOTH `niy.medical.ima-list` AND `niy.concealment.r14` into the test member's Pariwar** before submitting. Real-Pariwar registry bootstrap (every production Pariwar carrying both clauses) is a provisioning concern (Story 1.15 / Story 2.4 amend flow), explicitly NOT 3.5 — but 3.5's AC6 resolution-guard is what makes a missing clause a clean, atomic failure rather than a dangling consent / unrenderable list. **Flag this dependency for 3.6 / provisioning: every production Pariwar must carry both clauses before a member can complete the medical step.**

### Resolved Design Decision: IMA list = registry-backed (Option A, BigDev-confirmed 2026-06-27)

The epics AC says "canonical IMA list (curated, versioned)"; PRD FR-5 (line 288) says the IMA list is "**configured in the rule registry (FR-7)** so the list can be updated centrally as the IMA list evolves." **BigDev confirmed Option A (registry-backed), PRD-literal.** The IMA list is a Niyamavali clause `niy.medical.ima-list` (payload = the curated condition catalog with bilingual labels), seeded `benefit_mechanism='pool'`, resolved per-Pariwar via `resolveByClauseId`; the recorded `ima_list_version` is that clause's `clause_version_id`; central catalog updates flow through the Story 2.4 amend workflow (no code deploy). The catalog content is **PROVISIONAL per OQ-13** (canonical IMA source is a pre-launch Trustee-Panel open question) — exactly the niyamavali seed's "PROVISIONAL / structural" posture. Two distinct clauses are seeded + resolved: `niy.medical.ima-list` (the catalog, → `ima_list_version`) and `niy.concealment.r14` (the ack legal basis, → `consent_artifact_ref`). The IMA-list access is wrapped in one resolver (`medical/resolveImaList`) so the catalog source stays a single seam.

*(Considered + rejected: a code-level static catalog — simpler, but diverges from PRD FR-5's "configured in the rule registry" and loses the central-update-without-deploy capability. BigDev chose PRD-literal.)*

### Medical field sensitivity (tier assignment)

- `disclosed_conditions` (the array of selected IMA codes) → **Tier-1** envelope ciphertext. Health data about the member; never searched/deduped, so plain Tier-1 ciphertext (architecture §2.7 "medical disclosures" is Tier-1).
- `additional_context` (free-text) → **Tier-1**, NULLABLE.
- `condition_count` → **non-PII** metadata (a count, not which conditions — mirrors 3.4 `nominee_count`; safe in the table column + the event payload).
- `ima_list_version`, `acknowledgment_text_locale`, `acknowledged` → **non-PII** (safe in table + event).
- `consent_payload.checkboxTextShown` / `locale` → consent registry's **clear jsonb** (Story 2.7 header: checkbox text + locale are operational context, NOT Tier-1 PII).

### Migration discipline

Next index is **0026** (last applied: `0025_member-nominees.sql`). **Hand-author** (drizzle `meta/` snapshots stop at 0020; `db:generate` would re-emit applied migrations → `42P07`). Mirror `0025_member-nominees.sql`. Never regenerate/hand-edit an already-applied migration; never reset via `DROP SCHEMA` → strips `twt_app` USAGE → `42P01`. ([[project_live_db_test_gotchas]]) `_journal.json` idx-26 `when` = `1782963600000` (idx-25 + 1 day).

### Project Structure Notes

- **New — `@twt/domain`:** `schema/member_medical_disclosures.ts`, `policies/member-medical-disclosures-rls.ts`, `medical/disclosure-write.ts`, `medical/disclosure-read.ts`, `medical/ima-list.ts`, `medical/index.ts`, `migrations/0026_member-medical-disclosures.sql` (+ `meta/0026_snapshot.json` if the hand-authored flow needs it — match 0025's approach). `ids/index.ts` gains `MedicalDisclosureId`.
- **New — `@twt/contracts`:** `src/medical/disclosure.ts`, `src/medical/index.ts`.
- **New — `apps/api`:** `modules/medical/{medical.routes,medical.handlers,medical-crypto,index}.ts`.
- **New — `apps/mobile`:** `app/(signup)/medical.tsx`.
- **New — tests:** `packages/domain/tests/medical/disclosure.test.ts`, `packages/domain/tests/integration/medical/member-medical-disclosures.spec.ts`, `apps/api/tests/integration/medical/medical-disclose.spec.ts`.
- **Edited:** `packages/domain/src/{schema/index,policies/index,index,ids/index}.ts`, `packages/domain/src/member/events.ts`, `packages/domain/seed/niyamavali-v1-clauses.sql`, `packages/domain/migrations/meta/_journal.json`, `packages/contracts/src/index.ts` + `scripts/emit-openapi.ts` + `openapi/v1.yaml`, `apps/api/src/{server,context}.ts`, `apps/api/src/audit/audit-sink.ts`, `packages/api-client/src/index.ts`, `packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`.

### Review Findings (Chunk A — Domain layer, 2026-06-27)

**Decision needed:**

- [x] [Review][Decision] `ImaConditionSchema.strict()` vs `.passthrough()` for per-condition objects — spec marks IMA list content PROVISIONAL per OQ-13 (pre-launch Trustee-Panel open question). If OQ-13 resolves with per-condition enrichment fields (e.g., `icd_code`, `severity`, `category`), the current `.strict()` on `ImaConditionSchema` (`packages/domain/src/medical/ima-list.ts:657`) will throw a Zod validation error at runtime, degrading `resolveImaList` to a 500. The outer `ImaListPayloadSchema` uses `.passthrough()` to tolerate structural keys — should the same tolerance be applied to the condition items? Options: (a) change to `.passthrough()` or `.strip()` now, accepting unknown per-condition fields silently; (b) keep `.strict()` and accept that an OQ-13 payload enrichment triggers a deploy to widen the schema; (c) keep `.strict()` but wrap `parse()` in try/catch and fail with a typed 503 (merges with patch P1 below).

**Patch:**

- [x] [Review][Patch] `resolveImaList` / `resolveConcealmentClause` use `.parse()` — throws unhandled `ZodError` (→ 500) when clause row exists but payload is malformed; `null`-guard only covers the absent-clause path. Fix: switch to `.safeParse()` (or try/catch) and return `null` on parse failure so the caller's AC6 / 503 guard fires cleanly. [`packages/domain/src/medical/ima-list.ts:700`, `packages/domain/src/medical/concealment.ts:774`]
- [x] [Review][Patch] `ResolvedImaList.version` typed as `string` instead of `ClauseVersionId` — asymmetric with `ResolvedConcealmentClause.clauseVersionId: ClauseVersionId`. The value IS a `ClauseVersionId` at runtime; the weaker type allows it to be passed to any `string` parameter without a type error. Fix: change `version: string` → `version: ClauseVersionId` in the `ResolvedImaList` interface. [`packages/domain/src/medical/ima-list.ts:679`]

**Defer:**

- [x] [Review][Defer] `conditionCount: number` in `AppendMedicalDisclosureInput` has no upper bound guard against PostgreSQL `smallint` overflow (max 32,767) [`packages/domain/src/medical/disclosure-write.ts:585`] — deferred, pre-existing: contract layer caps `conditionCodes` to ≤50, making the overflow unreachable in practice. Revisit if the contract cap is ever relaxed.
- [x] [Review][Defer] `getMedicalDisclosures` fetches unbounded row history into memory for `buildStatus` [`packages/domain/src/medical/disclosure-read.ts:499`] — deferred, pre-existing: acceptable at signup (one row expected); Story 3.9 Life Events repeat use is where unbounded fetch becomes a real concern — add COUNT or pagination then.
- [x] [Review][Defer] No retry idempotency guard on the submit path — a client network-timeout retry creates a second independent disclosure + consent row; no `UNIQUE(consent_id)` constraint or idempotency key prevents it — deferred, pre-existing design: append-only is by intent per R2 and the spec's re-submit test (AC4); retry deduplication is a Story 3.9 / handler-layer concern, not domain-layer.
- **Naming discipline:** DB columns snake_case, TS fields camelCase (architecture L3663-3677). Header-comment style mirrors `member_nominees.ts`.
- **Domain may not import `@twt/events`** (turbo cycle — [[project_member_lifecycle_domain_substrate]]); the projector/reads hit `events_log` directly. Contracts may not import `@twt/domain` (browser-bundle rule).

### Testing standards summary

- Unit (vitest) co-located under each package's `tests/`. DB-gated integration runs against `twt-test-pg` Docker on **:5433** ([[project_live_db_test_gotchas]]); assert **membership not counts**.
- RLS regression for the new table is mandatory (cross-Pariwar denial) — mirror `members-policy-regression.spec.ts`.
- FK-cascade test proves RTBF (Story 3.12) sweeps disclosure rows on member delete.
- The AC6 atomicity test (clause-absent → no partial writes) is the highest-value new test — it is what makes 3.5 the safe template for every later consent consumer.
- Merge gate: `pnpm ci:local` mirrors all ci.yml jobs ([[project_ci_actions_suspension_local_mirror]]).
- If `onSend` hooks are touched, run the DB-gated suites ([[project_fastify_onsend_doublesend]]) — not expected here.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5 (lines 1702-1715)] — story + ACs.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6 (line 1734)] — lock-in entry precondition (c): medical disclosure + concealment ack recorded (3.6's check, not 3.5's).
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4 R14 evaluation (lines 1715, 1956)] — concealment eval walks the FULL disclosure history → append-only (R2).
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-5 (lines 284-294)] — IMA-listed, v1-M, ack + Niyamavali-version-of-record, "configured in the rule registry", OQ-13 canonical-source open question.
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-11 (lines 361-371)] — R14-adapted concealment: flag for State Trustee review, NEVER auto-deny.
- [Source: _bmad-output/planning-artifacts/architecture.md#2.7 PII encryption (lines 1500-1515)] — medical disclosures = Tier-1 envelope (Tink + Cloud KMS).
- [Source: packages/domain/src/schema/consent_records.ts] — `medical_disclosure_ack` consent type, `consent_artifact_ref`, audit-or-throw obligation, no-FK-on-ref decision.
- [Source: packages/domain/src/consent/write.ts] — `recordConsent` signature + caller-supplied `auditId`/`consentId`.
- [Source: apps/api/src/modules/rules/index.ts:508-518] — the audit-first-then-thread precedent to mirror.
- [Source: packages/domain/src/niyamavali/read.ts] — `resolveByClauseId` (clause → current `clause_version_id`); used for BOTH `niy.medical.ima-list` and `niy.concealment.r14`.
- [Source: packages/domain/seed/niyamavali-v1-clauses.sql] — seed shape + benefit_mechanism='pool' requirement (Story 1.16d gate); both new clauses land here.
- [Source: benefit-mechanism.yaml] — `seed_globs: [packages/domain/seed/niyamavali-*.sql]`, `v1_permitted: [pool]` — every seeded `clause_versions` row MUST carry `benefit_mechanism='pool'`.
- [Source: packages/domain/src/member/events.ts:118] — `MedicalDisclosedPayloadSchema` stub to widen.
- [Source: _bmad-output/implementation-artifacts/3-4-nominee-declaration-with-75-25-split.md] — the proven SURFACE template (table+RLS+crypto+contracts+module+screen+tests) + deferred findings D1-D3 to address.

## Previous Story Intelligence

- **3.4 (nominee declaration)** is the **exact template** for a PII-carrying signup-wizard SURFACE: encrypted tenant table + app-layer crypto + in-scope handler that writes the projection then `projectMemberState`s the event + member-facing summary that never echoes PII. 3.5 is the same shape with **two deltas**: (1) **append-only history** not latest-wins (R2); (2) it additionally writes a **`consent_records` entry via the audit-or-throw chain** (R3). Reuse 3.4's structure; apply the two deltas.
- **3.4 deferred findings to pre-empt:** D3 (null-member → guard bypass) — add the explicit null-member 409 in the terminal-state guard. P2 (audit emitted before `ok=true`) — keep the chained `writeAuditEntry`+`recordConsent` inside the scope tx and place the fire-and-forget `emitAuthAudit` last; set `ok=true` only after the status build.
- **3.4 §R2** is binding: **member creation is Story 3.6**. Do not create members here; assume + seed.
- **3.1** declared `member.medical_disclosed` as a **no-op reducer marker** with a placeholder payload — 3.5 widens the payload and emits it for real. The reducer needs no change (R4).
- **3.2** shipped `requireMemberStepUp` as a reusable gate that "specific gated routes attach in their own stories"; 3.5 takes the **signup** half (no step-up), Story 3.9 takes the Life Events update half. Pick the action-context string **`medical_disclosure_update`** now so 3.9 + any step-up audit line agree.
- **2.7 (consent registry)** shipped `recordConsent` + the `medical_disclosure_ack` consent type but **no consumer** — 3.5 is the first. The header's audit-or-throw obligation is the load-bearing contract.
- DB gotchas carried forward: hand-author migration 0026; never regenerate an applied migration; test DB on :5433; assert membership not counts.

## Git Intelligence Summary

Recent epic-3 commits (3.1 → 3.4) show the established cadence: each story = domain schema + RLS + accessors → contracts → apps/api module → mobile screen → tests, merged via `pnpm ci:local` (Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Migrations advanced 0018 (3.1) → 0025 (3.4); **3.5 is 0026** (hand-authored). Commit manually (branch + selective stage, not the `commit-story` helper — [[project_story_automator_ops]]). The current branch is `story/3.4-nominee-declaration`; 3.5 starts from a fresh branch off the 3.4 commit.

## Latest Tech Information

No new external libraries. Stack is fixed: Drizzle 0.45 (sync `customType` → app-layer encrypt/decrypt per `column.ts`), Google Tink + Cloud KMS envelope encryption (Story 1.5), Fastify member-token guard (3.2), Zod + `.strict()` contracts, Expo Router `(signup)` group (3.3b/3.4). The consent registry (2.7) + niyamavali registry (2.3/2.4) + audit chain (1.10) are all already shipped — 3.5 wires existing primitives, adds no dependencies.

## Project Context Reference

No `project-context.md` exists in this repo (only the generator template). Binding conventions live in CLAUDE.md auto-memory: [[project_member_lifecycle_domain_substrate]], [[project_live_db_test_gotchas]], [[project_ci_actions_suspension_local_mirror]], [[project_sprint_status_ledger]], [[project_friction_budget_baseline_ratchet]], [[project_eslint_config_per_package_cwd]], [[project_fastify_onsend_doublesend]], [[project_story_automator_ops]].

### Review Findings (Chunk C — Tests + Mobile + i18n, 2026-06-27)

**Patch:**

- [x] [Review][Patch] No `ScrollView` on main medical form — bare `YStack flex={1}` clips content on small devices (iPhone SE); Submit CTA unreachable with ≥2 conditions. Fix: wrap form in `ScrollView contentContainerStyle={{ flexGrow: 1 }}` from `react-native`, remove `flex={1}` from inner `YStack`. [`apps/mobile/app/(signup)/medical.tsx`]
- [x] [Review][Patch] `loadFailed` branch renders a dead end with no retry affordance — member permanently blocked in linear signup wizard. Fix: add `retryCount` state + reset `loadFailed` in `useEffect` deps + "Try again" Button in the unavailable screen. [`apps/mobile/app/(signup)/medical.tsx`; new i18n key `medical.retry`]
- [x] [Review][Patch] Consent FK domain integration test listed in file header comment (family 4) but not implemented. Fix: added `it()` that inserts disclosure + consent, joins on `consent_id`, asserts join returns 1 row with `consent_type = 'medical_disclosure_ack'`. [`packages/domain/tests/integration/medical/member-medical-disclosures.spec.ts`]
- [x] [Review][Patch] Missing tests for Chunk B P2b contract guard (duplicate `conditionCodes`) and enum guard (`ackLocale: 'fr'`). Fix: two new `it()` blocks in the API integration spec. [`apps/api/tests/integration/medical/medical-disclose.spec.ts`]
- [x] [Review][Patch] `additionalContext` `Input` missing `maxLength={2000}` — server rejects >2000 chars with generic error and no UX indication. Fix: added `maxLength={2000}` prop. [`apps/mobile/app/(signup)/medical.tsx`]
- [x] [Review][Patch] Done screen renders `t('medical.done')` on H2 + Text (liveRegion) + Button — screen reader announces same string four times. Fix: removed redundant `<Text>` element. [`apps/mobile/app/(signup)/medical.tsx`]
- [x] [Review][Patch] AC4 and R5 tests use `disclosureCount` COUNT helper — violates project pattern (assert membership not counts). Fix: replaced with row-returning queries asserting condition_count membership. [`apps/api/tests/integration/medical/medical-disclose.spec.ts`]
- [x] [Review][Patch] Condition and ack checkboxes missing `accessibilityHint` — violates AC5 and 3.4 convention ("every control: accessibilityLabel + accessibilityHint"). Fix: added `accessibilityHint={t('medical.conditions_help')}` to condition buttons and `accessibilityHint={t('medical.ack_help')}` to ack button. [`apps/mobile/app/(signup)/medical.tsx`]

**Defer:**

- [x] [Review][Defer] `toSummary` ZodError if a historical row has a bad `acknowledgment_text_locale` value (column is plain `text`, no DB CHECK constraint) — any future `GET /status` for that member returns 500. Mitigation: add `CHECK (acknowledgment_text_locale IN ('en','hi'))` constraint in a future migration (alongside Story 3.12 RTBF schema work). (W14)
- [x] [Review][Defer] `conditionCodes.max(50)` permanently blocks submit if the IMA list is ever provisioned with >50 conditions (`ImaListPayloadSchema` has no upper bound on conditions array). Re-trigger: if the IMA catalog grows beyond 50 entries — raise the contract cap to match. (W15)

### Review Findings (Chunk B — API + Contracts layer, 2026-06-27)

**Patch:**

- [x] [Review][Patch] `ackLocale: row.acknowledgmentTextLocale as MedicalAckLocale` in `toSummary` — unsafe DB boundary cast; column is plain `text` with no enum constraint, so a value outside `['en','hi']` silently passes the `as` cast and then either corrupts the response or blows up the Fastify Zod serializer as a 500 on every `GET /medical-disclosure` that hits the row. Fix: `MedicalAckLocale.parse(row.acknowledgmentTextLocale)` — throws at the boundary, surfaces as a visible error rather than a silent bad value. [`apps/api/src/modules/medical/medical.handlers.ts:84`]
- [x] [Review][Patch] Clause resolution ordering — `conditionCodes` validation interleaved between `resolveImaList` (clause 1) and `resolveConcealmentClause` (clause 2); a request with unknown codes aborts before the concealment clause is probed, masking a provisioning gap (should be a 409) with a 400. AC6(a) requires BOTH clauses resolved before any client-input rejection. Fix: move the `unknownCodes` filter/throw to after both clause resolutions. [`apps/api/src/modules/medical/medical.handlers.ts:145–171`]
- [x] [Review][Patch] `conditionCodes` allows duplicates — `z.array(...).max(50)` with no uniqueness check; a client sending `["ckd","ckd","ckd"]` passes all validation, stores `conditionCount: 3`, and encrypts a 3-element array for one unique condition. Epic 4's concealment evaluator reads `conditionCount` as authoritative. Fix: add `.refine((codes) => new Set(codes).size === codes.length, { message: 'conditionCodes must be unique' })`. [`packages/contracts/src/medical/disclosure.ts:44`]

**Defer:**

- [x] [Review][Defer] `MemberStreamConcurrencyError` from `projectMemberState` uncaught → 500 instead of retryable 409 on concurrent submit race (same member, two simultaneous requests). Pre-existing pattern from 3.4 (no nominee concurrent-race handler either). Re-trigger: Story 3.9 Life Events, where re-disclosure under concurrent use is more likely. (W4)
- [x] [Review][Defer] `TERMINAL_STATES = new Set(['withdrawn', 'anonymized'])` is a local hardcoded set; drift risk if the domain state machine adds new terminal states. Re-trigger: when the state-machine adds a state that should also block medical disclosure — check this set then. (W5)
- [x] [Review][Defer] TOCTOU between `resolveImaList` and `resolveConcealmentClause` in both submit and imaList handlers under READ COMMITTED isolation — a Niyamavali amendment committing between the two queries produces a mixed-provenance row (submit) or a mixed-catalog response (imaList). Rare; amendments are admin-controlled. Re-trigger: if amendment frequency increases or Epic 4 auditability requires snapshot consistency. (W6)
- [x] [Review][Defer] `status` + `imaList` handlers open a write-capable scope tx for read-only operations (MVCC overhead, unnecessary write connection usage). Re-trigger: performance audit or connection-pool pressure. (W7)
- [x] [Review][Defer] POST submit missing per-actor rate limit; global IP ceiling applies but does not throttle by authenticated member. Re-trigger: when rate-limit infrastructure is added to other member-write routes. (W8)
- [x] [Review][Defer] `encContext` uses identical `{ pariwarId, fieldClass: 'member_medical' }` for both `disclosedConditionsCiphertext` and `additionalContextCiphertext`; under AEAD, swapping the two ciphertexts passes authentication. Re-trigger: when encryption context conventions are reviewed codebase-wide. (W9)
- [x] [Review][Defer] `emitAuthAudit` fire-and-forget has no `.catch()` — rejection on pool exhaustion / network partition is silently swallowed with no fallback audit trace. Pre-existing pattern: all `emitAuthAudit` callers are fire-and-forget. Re-trigger: when a `.catch(logger.error)` convention is adopted globally. (W10)
- [x] [Review][Defer] `status` handler returns `{ latest: null, historyCount: 0 }` (HTTP 200) for a non-existent member — indistinguishable from "member exists, nothing disclosed yet". Re-trigger: if session guard is ever loosened or ghost-member scenarios require explicit detection. (W11)
- [x] [Review][Defer] `unknownCodes.join(', ')` in BadRequestError message — submitted condition codes (potentially PHI if from the IMA list) appear in structured logs and the API error response. Re-trigger: when a PHI-scrubbing logging convention is adopted. (W12)
- [x] [Review][Defer] `ServiceUnavailableError` default code is `'request.unavailable'` — semantically incorrect for a 503 (all callers pass explicit codes so the default is never reached; code smell only). Re-trigger: if a caller omits the explicit code argument. (W13)

## Story Completion Status

Ultimate context engine analysis completed — comprehensive developer guide created. Ready for `dev-story`. **The IMA-list design decision is resolved: registry-backed (Option A), BigDev-confirmed 2026-06-27** — the IMA list is the seeded `niy.medical.ima-list` clause, resolved per-Pariwar, `ima_list_version` = its `clause_version_id`. No open decisions remain.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8)

### Debug Log References

- **Live-DB `now()` tie (domain integration):** two `appendMedicalDisclosure` calls in ONE per-test transaction share `created_at` (= `transaction_timestamp()`), so `created_at DESC` is non-deterministic and `getLatest` returned the wrong row. Fixed in-test by seeding the older disclosure with an explicit past timestamp (in production each submit is its own tx, so `created_at` differs naturally). [[project_live_db_test_gotchas]].
- **Pre-existing 3.4 test defect surfaced by ci:local:** `apps/api/tests/integration/nominee/nominee-declare.spec.ts` `seedWithdrawnMember` passed `actorId: 'system'` to `projectMemberState`, but `events_log.actor_id` is `uuid` (since migration 0001) → `22P02 invalid input syntax for type uuid: "system"`. This slipped through because CI Actions are suspended. Corrected to `actorId: null` (the projectMemberState "NULL = system/SIE" contract) — same root-cause fix applied to the new 3.5 `seedWithdrawnMember`.
- **benefit-mechanism seed-records count:** `scripts/benefit-mechanism/seed-records.test.ts` asserted exactly 3 seed clause records; the two new Story 3.5 clauses made it 5 — updated the assertion + id list.

### Completion Notes List

Implemented the Story 3.5 medical-disclosure SURFACE end-to-end. All 6 ACs + R1–R6 satisfied; merge gate `pnpm ci:local` **18/18 green** on `:5433`.

- **AC1 (IMA list, registry-backed Option A):** `niy.medical.ima-list` clause (10 provisional bilingual conditions) resolved per-Pariwar via `medical.resolveImaList` (wraps `niyamavali.resolveByClauseId`); `ima_list_version` = the resolved `clause_version_id`, server-authoritative (a stale client value is ignored — asserted in the API test).
- **AC2 (concealment ack, server-enforced):** `acknowledged !== true` → 400 `medical.acknowledgment_required` (defense-in-depth behind the contract's `z.literal(true)`); ack copy sourced from `niy.concealment.r14` payload (`ack_text_en`/`ack_text_hi`), recorded as `consent_payload.checkboxTextShown`.
- **AC3 (persistence split):** event (non-PII: `ima_list_version`/`condition_count`/`acknowledged`/`ack_locale`) + Tier-1-encrypted `member_medical_disclosures` row (condition codes + free-text) + `consent_records` row (`medical_disclosure_ack`, `consent_artifact_ref` = `niy.concealment.r14` cvid). Two distinct clause refs verified in tests.
- **AC4 (append-only history):** per-disclosure PK `disclosure_id`; GRANT SELECT/INSERT only (no UPDATE/DELETE); re-submit APPENDS (history grows — asserted). 3.9 re-runs the submit service behind step-up with zero changes.
- **AC5 (a11y):** every control labelled + hinted; conditions are `role=checkbox` with `checked` state; the FULL ack text is announced before its checkbox; zero-selection reassurance; submit disabled until ack checked.
- **AC6 (load-bearing audit-or-throw + clause guard):** FIRST `recordConsent` consumer in apps/api. Order: resolve BOTH clauses → `writeAuditEntry` (servicePool, NON-PII hash) FIRST → `recordConsent({ auditId })` → `appendMedicalDisclosure({ consentId })` → projector event, all inside ONE member scope-tx. Both clause-absent throws happen BEFORE `writeAuditEntry`, so a missing clause → clean 409 with NO partial writes AND no orphan audit line (both paths asserted atomic). `emitAuthAudit` fires last, only after `ok = true`.
- **3.4 D3 resolved:** added `member.memberExists` (explicit existence probe) → clean 409 `medical.member_not_found` before the non-nullable `getMemberStateAt`.
- **R4 (marker):** `member.medical_disclosed` is a non-transition marker (`from_state === to_state`); reducer untouched (verified it falls through to `default: return state`).
- **GET ima-list** returns 503 (not 409) when the registry is unprovisioned (GET-only signal); submit still uses 409 per AC6.

### File List

**New — `@twt/domain`:**
- `packages/domain/src/schema/member_medical_disclosures.ts`
- `packages/domain/src/policies/member-medical-disclosures-rls.ts`
- `packages/domain/src/medical/disclosure-write.ts`
- `packages/domain/src/medical/disclosure-read.ts`
- `packages/domain/src/medical/ima-list.ts`
- `packages/domain/src/medical/concealment.ts`
- `packages/domain/src/medical/index.ts`
- `packages/domain/migrations/0026_member-medical-disclosures.sql`
- `packages/domain/tests/medical/disclosure.test.ts`
- `packages/domain/tests/integration/medical/member-medical-disclosures.spec.ts`

**New — `@twt/contracts`:**
- `packages/contracts/src/medical/disclosure.ts`
- `packages/contracts/src/medical/index.ts`

**New — `apps/api`:**
- `apps/api/src/modules/medical/medical.routes.ts`
- `apps/api/src/modules/medical/medical.handlers.ts`
- `apps/api/src/modules/medical/medical-crypto.ts`
- `apps/api/src/modules/medical/index.ts`
- `apps/api/tests/integration/medical/medical-disclose.spec.ts`

**New — `apps/mobile`:**
- `apps/mobile/app/(signup)/medical.tsx`

**Edited — `@twt/domain`:**
- `packages/domain/src/ids/index.ts` (+ `MedicalDisclosureId`)
- `packages/domain/src/index.ts` (+ `medical` namespace)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts` (barrels)
- `packages/domain/src/member/events.ts` (widened `MedicalDisclosedPayloadSchema`)
- `packages/domain/src/member/read.ts` (+ `memberExists`)
- `packages/domain/seed/niyamavali-v1-clauses.sql` (+ 2 clauses)
- `packages/domain/migrations/meta/_journal.json` (+ idx-26)

**Edited — `@twt/contracts`:**
- `packages/contracts/src/index.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`

**Edited — `apps/api`:**
- `apps/api/src/context.ts` (+ `MEMBER_MEDICAL_FIELD_CLASS`)
- `apps/api/src/audit/audit-sink.ts` (+ `member_medical.disclosed`)
- `apps/api/src/http-errors.ts` (+ `ServiceUnavailableError`)
- `apps/api/src/server.ts` (wire `registerMedicalModule`)
- `apps/api/tests/integration/nominee/nominee-declare.spec.ts` (pre-existing `actorId` bug fix)

**Edited — other:**
- `packages/api-client/src/index.ts` (+ `medicalDisclose`/`medicalStatus`/`medicalImaList`)
- `packages/i18n/locales/en/common.json`, `packages/i18n/locales/hi/common.json` (medical chrome)
- `scripts/benefit-mechanism/seed-records.test.ts` (count 3→5)
- `friction-budget.md` (Story 3.5 disposition)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger + status → review)

### Change Log

| Date | Version | Description |
| --- | --- | --- |
| 2026-06-27 | 0.1 | Story 3.5 implemented: medical-disclosure SURFACE (table+RLS+migration 0026, domain accessors + registry-backed IMA/concealment resolvers, widened event, contracts+OpenAPI, apps/api module with audit-or-throw consent chain, mobile screen, i18n, full test suite). 2 niyamavali clauses seeded. ci:local 18/18 green on :5433. Status → review. |
