-- Niyamavali v1 rule registry seed — Story 2.3 (Task 8, AC8).
--
-- A SMALL, structurally-real set of canonical clauses (BigDev-decided: small, not
-- the full canonical body) as `clause_versions` rows, each tagged
-- `benefit_mechanism = 'pool'` (v1 ships only pool; `reserve` tags zero v1 rules).
-- Purpose:
--   (i)  a canonical structural reference + loadable dev/staging fixture for the
--        create/amend/diff/lineage operations; AND
--   (ii) give the repo-global benefit-mechanism CI gate's check (a) TEETH —
--        `benefit-mechanism.yaml` `rule_sources.seed_globs` points here, so
--        `extractFromSqlInserts` reads these INSERTs and `validateRuleRecords`
--        asserts every record carries a v1-permitted `benefit_mechanism`.
--
-- ⚠ The seeded CONTENT is PROVISIONAL / structural — final legally-reviewed
-- Niyamavali copy lands via Story 0.13 (external dependency; does NOT gate Epic 2).
-- The `payload` JSONB is OPAQUE here (freeze row 14): the registry stores it; the
-- rule-evaluation engine (Epic 4) interprets it. snake_case JSONB keys.
--
-- This is a SEED file (SQL INSERTs), NOT a migration — it is intentionally
-- separate from `migrations/0014_*.sql` for readability, and the `.sql` extractor
-- (`extractFromSqlInserts`) picks it up via the `seed_globs` entry with no code
-- change. Idempotent (ON CONFLICT DO NOTHING) so a re-seed is a no-op.
--
-- Seed tenant: a single synthetic Pariwar (no production PII — architecture §5.5).

INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c0001-0000-4000-8000-000000000001',
    'niy.contribution-discipline.r7-a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    -- Story 4.2: upgraded from the provisional display stub to a REAL rule_kind:'conditional'
    -- spec interpreted by the @twt/niyamavali-engine primitive (Story 4.1). See the R7(A–G)
    -- family block below for the full ladder + the provisional precedence/threshold caveat.
    '{"rule_code":"R7(A)","title_en":"Restoration after contribution lapse (member with under 10 lifetime contributions)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":50,"on_pass":"restore_3_consecutive_one_time","on_fail":"r7_not_applicable","all_of":[{"op":"fact_equals","fact":"contribution.in_lapse","value":true},{"op":"fact_lt","fact":"contribution.total_count","max":10},{"op":"fact_lt","fact":"contribution.r7a_restorations_used","max":2}],"restoration":{"consecutive_required":3,"lock_in_months":0,"one_time_only":true,"lifetime_max":2},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0002-0000-4000-8000-000000000002',
    'niy.ninety-percent-rule.r8',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    -- Story 4.3: upgraded from the provisional display stub to a REAL rule_kind:'conditional'
    -- spec interpreted by the @twt/niyamavali-engine primitive (Story 4.1). See the R8 family
    -- block below (r8-a / r8-b) for the full ladder + the provisional precedence/threshold caveat.
    -- The "90% computation" is a PRE-DERIVED fact (contribution.compliance_percent): the base
    -- clause only checks fact_gte >= 90; the engine never computes the percentage.
    '{"rule_code":"R8","title_en":"Ninety-percent contribution rule (illness-death eligibility gate)","rule_kind":"conditional","family":"r8-ninety-percent","precedence":30,"on_pass":"ninety_percent_met","on_fail":"r8_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.death_classification","value":"illness"},{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_gte","fact":"contribution.compliance_percent","min":90}],"threshold_percent":90,"min_contributions":10,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0003-0000-4000-8000-000000000003',
    'niy.special-death.r9-suicide-murder',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    -- Story 4.4 (D2): upgraded IN PLACE from the provisional display stub to a REAL
    -- rule_kind conditional spec interpreted by the @twt/niyamavali-engine primitive. The
    -- STABLE clause_id niy.special-death.r9-suicide-murder and this clause_version_id and
    -- effective_date are kept (clause_id is immutable-by-contract per ids/index.ts). The epic
    -- literal suffix -2025-03 is recorded as a descriptive variance and NOT minted as a new id.
    -- Mar-2025 rule: death in {suicide murder} AND nominee accused is an exclusion candidate that
    -- ROUTES to State Trustee R9 voting and NEVER auto-denies (SM-1 C7). See the Story 4.4
    -- special-death block below for the R9 family ladder and precedence discipline.
    '{"rule_code":"R9(Mar-2025)","title_en":"Special death (suicide / murder with nominee accused) — Mar 2025 exclusion candidate","rule_kind":"conditional","family":"special-death","precedence":80,"on_pass":"route_r9_voting","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_in","fact":"claim.death_classification","values":["suicide","murder"]},{"op":"fact_equals","fact":"claim.nominee_accused","value":true}],"exclusion_candidate":true,"voting_required":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 3.5 — medical-disclosure clauses (IMA list + concealment-denial ack) ────────
-- TWO registry-backed clauses the medical-disclosure SURFACE resolves per-Pariwar:
--   · niy.medical.ima-list   — the curated, versioned IMA condition catalog (Option A,
--     PRD FR-5 "configured in the rule registry"). The disclosure resolves this and records
--     the resolved clause_version_id as `ima_list_version`. The bilingual label_en/label_hi
--     in the payload are what the signup screen renders (so condition labels are NOT i18n keys).
--   · niy.concealment.r14    — the concealment-ack legal basis (FR-11, R14-adapted: flag for
--     State Trustee review, NEVER auto-deny). The consent's `consent_artifact_ref` resolves to
--     this clause_version_id; the payload's ack_text_en/ack_text_hi are the exact acknowledged
--     wording recorded as consent_payload.checkboxTextShown.
-- BOTH carry benefit_mechanism='pool' (the Story 1.16d gate's seed_globs include this file).
-- CONTENT is PROVISIONAL per OQ-13 (canonical IMA source is a pre-launch Trustee-Panel open
-- question). Story 4.4 AMENDED niy.concealment.r14 IN PLACE (D1: same clause_id AND same
-- clause_version_id 0e1c0005 — a VARIANCE from this comment's original "new clause_version_id"
-- plan, chosen to preserve the consent's consent_artifact_ref → 0e1c0005 reference and avoid a
-- two-versions-same-effective-date ambiguity) — see the amended r14 payload below for the added
-- R14 rule-engine evaluation logic. The 3.5 seed was the consent-ack v1 ONLY.
-- Idempotent (ON CONFLICT DO NOTHING).
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c0004-0000-4000-8000-000000000004',
    'niy.medical.ima-list',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"IMA-LIST","title_en":"IMA-listed serious illnesses (disclosure catalog)","conditions":[{"code":"ckd","label_en":"Chronic kidney disease","label_hi":"दीर्घकालिक गुर्दा रोग"},{"code":"malignancy","label_en":"Cancer / malignancy","label_hi":"कैंसर / दुर्दमता"},{"code":"cardiovascular","label_en":"Cardiovascular disease","label_hi":"हृदय रोग"},{"code":"stroke","label_en":"Stroke","label_hi":"पक्षाघात (स्ट्रोक)"},{"code":"diabetes-complications","label_en":"Severe diabetes complications","label_hi":"गंभीर मधुमेह जटिलताएँ"},{"code":"chronic-liver","label_en":"Chronic liver disease","label_hi":"दीर्घकालिक यकृत रोग"},{"code":"copd","label_en":"Severe respiratory disease / COPD","label_hi":"गंभीर श्वसन रोग / सीओपीडी"},{"code":"hiv-aids","label_en":"HIV / AIDS","label_hi":"एचआईवी / एड्स"},{"code":"tuberculosis","label_en":"Tuberculosis (active)","label_hi":"क्षय रोग (सक्रिय)"},{"code":"neurological","label_en":"Serious neurological disorder","label_hi":"गंभीर तंत्रिका तंत्र विकार"}],"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0005-0000-4000-8000-000000000005',
    'niy.concealment.r14',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    -- Story 4.4 (D1): AMENDED IN PLACE (kept clause_version_id 0e1c0005 and effective_date).
    -- ADDED the rule_kind conditional engine fields (all_of and on_pass/on_fail and the
    -- flag_if_true concealment condition) ALONGSIDE the preserved ack_text_en/ack_text_hi and
    -- never_auto_deny. The interpreter .passthrough() lets rule and ack coexist in one payload.
    -- In-place amendment preserves the Story 3.5 consent consent_artifact_ref to 0e1c0005 (a
    -- VARIANCE vs the 3.5 seed comment above which anticipated a NEW clause_version_id). SM-1 C7
    -- seam: when the pre-derived fact claim.concealed_ima_condition_linked is true the flag_if_true
    -- condition adds special_flags concealment_review_required and the decision routes to State
    -- Trustee review — the engine produces a FLAG and NEVER an auto-deny (never_auto_deny true per
    -- prd.md 370). The full disclosure-event and IMA-list-version trace is the Story 4.6 Validity
    -- Service job (D4) and NOT this engine fact/provenance channel (keys-only and PII-free).
    '{"rule_code":"R14","title_en":"Concealment denial — undeclared IMA-listed illness","rule_kind":"conditional","on_pass":"route_state_trustee_review","on_fail":"concealment_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.concealed_ima_condition_linked","value":true,"flag_if_true":"concealment_review_required"}],"ack_text_en":"I understand that if I conceal an IMA-listed condition and my death is later linked to that condition, my nominees'' claim may be denied or flagged for State Trustee review per Niyamavali clause niy.concealment.r14.","ack_text_hi":"मैं समझता/समझती हूँ कि यदि मैं किसी IMA-सूचीबद्ध बीमारी को छिपाता/छिपाती हूँ और बाद में मेरी मृत्यु उस बीमारी से जुड़ी पाई जाती है, तो Niyamavali खंड niy.concealment.r14 के अनुसार मेरे नामितों का दावा अस्वीकार किया जा सकता है या State Trustee समीक्षा के लिए चिह्नित किया जा सकता है।","never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 3.6b — lock-in policy clause (the FR-8 lock-in-days the signup lock-in step snapshots) ──
-- The registry-backed lock-in policy the Vyawastha Shulk confirm resolves per-Pariwar (lock-in.ts
-- resolveLockInPolicy → resolveByClauseId). v1 payload {"lock_in_days": 30} (FR-8 ramp v1 = 30-day;
-- trustee-adjustable post-launch via the Story 2.4 amend workflow — new graduations do NOT re-lock
-- existing members, who each carry the join-time snapshot). The resolved clause_version_id is recorded
-- on the member.lock_in_entered event as lock_in_policy_version (audit-reproducibility). PROVISIONING
-- PRECONDITION (R6): every production Pariwar MUST carry an effective niy.lock-in.policy clause or a
-- paid member 503s (lock_in.policy_unavailable) at the lock-in step (receipt retained; idempotent
-- re-confirm completes once provisioned) — joins the 3.6a R3 T&C + the pariwar_passport preconditions.
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c0006-0000-4000-8000-000000000006',
    'niy.lock-in.policy',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"LOCK-IN","title_en":"Membership lock-in policy (join-time clock)","lock_in_days":30,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 4.3 — R8 ninety-percent rule (illness-death eligibility gate) + R8(A)/R8(B) ─────
-- The R8 family (FR-10) as REAL rule_kind:'conditional' payloads interpreted by the
-- @twt/niyamavali-engine primitive (Story 4.1). r8 is UPGRADED in place above; r8-a / r8-b
-- are ADDED here. Each clause is self-contained: `all_of` preconditions over the caller-supplied
-- `contribution.*` / `claim.*` facts (Epic 8/9 contribution history + Epic 6 claim intake,
-- assembled by the 4.6 Validity Service — NO source system exists yet at Epic 4), `on_pass` =
-- eligibility-path slug, `on_fail` = 'r8_not_applicable'. The engine picks WHICH R8 sub-clause
-- applies by the payload `precedence` field (DATA, not hardcoded) when facts overlap.
--
-- ⚠ ILLNESS-ONLY GATE (AC2.4, FR-10): all three sub-clauses gate on
-- `claim.death_classification == 'illness'` — an accident-classified death fails every R8
-- precondition → R8 does not apply (accident eligibility is a SEPARATE path, not this story).
-- The gate is DATA (a precondition), never a hardcoded `if (accident)` engine branch.
--
-- ⚠ THE "90% COMPUTATION" IS A PRE-DERIVED FACT, not an engine calculation:
-- `contribution.compliance_percent` arrives already computed; the base clause only checks
-- `fact_gte >= 90`. The engine EVALUATES facts, it never DERIVES them — a different compliance
-- calculation is a PRODUCER change (Epic 8/9), never an engine change.
--
-- ⚠ PROVISIONAL POLICY (FR-10 `policy_review_required` — Trustee-Panel-tunable): the 90%
-- threshold (FR-10 "reviewed at the 10/20/50 milestones") and the `precedence` ints are
-- provisional. Precedence is exceptions-win — R8(B) mid-contribution death (50, "presumed would
-- have paid") > R8(A) skip-allowance (40) > R8 base 90% gate (30). Precedence selects the
-- surfaced EXPLANATION, not eligibility: every applied sub-clause already means "eligible"; the
-- pick only decides which reason is reported when several apply (re-tune the DATA, never add
-- engine logic). R8(A) encodes the FR-10 canonical "prior compliance 100%"
-- (`prior_period_full_compliance == true`); the PRD glossary's "prior >= 90%" phrasing variance
-- (prd.md:167) is flagged for trustee clarification, NOT resolved here — an inherited-copy
-- ambiguity, not an engine defect. R8(A) restoration SATISFACTION + the contribution-cycle
-- alert/deadline mechanics behind `mid_contribution_death` are downstream (Epic 6 / Epic 8/9).
-- All benefit_mechanism='pool' (the benefit-mechanism CI gate's seed_globs cover this file).
-- Idempotent (ON CONFLICT DO NOTHING). snake_case JSONB keys.
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c000d-0000-4000-8000-00000000000d',
    'niy.ninety-percent-rule.r8-a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R8(A)","title_en":"One-skip-per-year allowance (prior compliance 100%)","rule_kind":"conditional","family":"r8-ninety-percent","precedence":40,"on_pass":"skip_allowance_granted","on_fail":"r8_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.death_classification","value":"illness"},{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_equals","fact":"contribution.skips_current_year","value":1},{"op":"fact_equals","fact":"contribution.prior_period_full_compliance","value":true}],"skips_allowed":1,"requires_prior_full_compliance":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000e-0000-4000-8000-00000000000e',
    'niy.ninety-percent-rule.r8-b',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R8(B)","title_en":"Mid-contribution death (presumed would have paid)","rule_kind":"conditional","family":"r8-ninety-percent","precedence":50,"on_pass":"mid_contribution_eligible","on_fail":"r8_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.death_classification","value":"illness"},{"op":"fact_equals","fact":"claim.mid_contribution_death","value":true}],"presumed_would_have_paid":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 4.2 — R7(A–G) contribution-discipline restoration ladder ────────────────────
-- The R7 family (FR-9) as REAL rule_kind:'conditional' payloads interpreted by the
-- @twt/niyamavali-engine primitive (Story 4.1). r7-a is UPGRADED in place above; r7-b…r7-g
-- are ADDED here. Each clause is self-contained: `all_of` preconditions over the
-- caller-supplied `contribution.*` facts (Epic 8/9 producer, assembled by the 4.6 Validity
-- Service — NO source system exists yet at Epic 4), `on_pass` = restoration-path slug,
-- `on_fail` = 'r7_not_applicable'. The engine picks WHICH R7(x) applies by the payload
-- `precedence` field (DATA, not hardcoded) when facts overlap (e.g. a 12-month gap satisfies
-- R7(C) and R7(F); most-structural-wins: C > B > A > F > E > D > G).
--
-- ⚠ PROVISIONAL POLICY (FR-9 `policy_review_required`): the `precedence` ints, R7(C)'s
-- long-gap threshold (12 months), R7(C)'s lock-in, and the R7(A)→R7(B) fall-through wording
-- are Trustee-Panel-tunable. FR-9 says R7(A) is "max 2 lifetime, after that R7(B) applies",
-- but R7(B)'s stated precondition is "registered but NEVER contributed" — which does not
-- match a member who contributed <10× and exhausted R7(A). R7(A)'s `< 2` cap is encoded
-- faithfully; the "falls through to R7(B)" wording is an inherited-TSCT ambiguity flagged
-- for trustee clarification, NOT an engine defect. R7(A) restoration SATISFACTION (counting
-- 3 consecutive contributions and deriving r7a_restorations_used) was originally deferred here
-- to "a downstream Epic 8/9 workflow" — an epic-shaped deferral that no epic owned. It is BUILT
-- by Story 10.25, as a pure as-of derivation over the Story 10.24 projections under the ratified
-- `consecutive-opportunity-restoration-v1` policy (Decision 2026-08-06-076); nothing INCREMENTS a
-- stored counter, and this seed still only encodes the precondition evaluation.
--   ⚠ R7(A) is still NOT evaluated. Its `all_of` below keys the population on
--   `contribution.total_count < 10`, which prd.md:344 disclaims as "an implementation proxy, not the
--   constitutional definition" and prd.md:346 forbids evaluating from. Replacing that proxy with the
--   constitutional joining-discipline criterion is a PART 11 AMENDMENT owned by the Trustee Panel
--   (Decision 2026-08-06-077) — NOT a code change, and deliberately not edited here. R7(A) activates
--   only when that amendment is PUBLISHED and Story 10.23 supplies member.joining_discipline_state.
-- R7(G) is declarative: it
-- exists as an auditable clause that records an explicit non-exemption ('no_exemption') when
-- a personal-event excuse is claimed, and NEVER produces a restoration path.
-- All benefit_mechanism='pool' (the benefit-mechanism CI gate's seed_globs cover this file).
-- Idempotent (ON CONFLICT DO NOTHING). snake_case JSONB keys.
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c0007-0000-4000-8000-000000000007',
    'niy.contribution-discipline.r7-b',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(B)","title_en":"Restoration for member registered but never contributed","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":60,"on_pass":"restore_5_consecutive_plus_lockin","on_fail":"r7_not_applicable","all_of":[{"op":"fact_equals","fact":"contribution.ever_contributed","value":false}],"restoration":{"consecutive_required":5,"lock_in_months":3,"core_team_recommendation":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0008-0000-4000-8000-000000000008',
    'niy.contribution-discipline.r7-c',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(C)","title_en":"Long-gap restoration (treat as new registration)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":70,"on_pass":"treat_as_new_registration","on_fail":"r7_not_applicable","all_of":[{"op":"member_state_in","states":["lock-in","active","active-in-grace","lapsed-unpaid"]},{"op":"fact_gte","fact":"contribution.months_since_last","min":12}],"restoration":{"consecutive_required":5,"lock_in_months":3},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0009-0000-4000-8000-000000000009',
    'niy.contribution-discipline.r7-d',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(D)","title_en":"Established member single-skip restoration (3-month lock-in plus catch-up)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":30,"on_pass":"lockin_3mo_plus_catchup","on_fail":"r7_not_applicable","all_of":[{"op":"member_state_in","states":["lock-in","active","active-in-grace","lapsed-unpaid"]},{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_equals","fact":"contribution.skips_current_year","value":1}],"restoration":{"lock_in_months":3,"catch_up_required":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000a-0000-4000-8000-00000000000a',
    'niy.contribution-discipline.r7-e',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(E)","title_en":"Established member multi-skip restoration (5-month lock-in complete all)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":40,"on_pass":"lockin_5mo_complete_all","on_fail":"r7_not_applicable","all_of":[{"op":"member_state_in","states":["lock-in","active","active-in-grace","lapsed-unpaid"]},{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_gte","fact":"contribution.skips_current_year","min":2}],"restoration":{"lock_in_months":5,"complete_all":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000b-0000-4000-8000-00000000000b',
    'niy.contribution-discipline.r7-f',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(F)","title_en":"Six-month gap restoration (5-month lock-in complete all)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":45,"on_pass":"lockin_5mo_complete_all","on_fail":"r7_not_applicable","all_of":[{"op":"member_state_in","states":["lock-in","active","active-in-grace","lapsed-unpaid"]},{"op":"fact_gte","fact":"contribution.months_since_last","min":6}],"restoration":{"lock_in_months":5,"complete_all":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000c-0000-4000-8000-00000000000c',
    'niy.contribution-discipline.r7-g',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(G)","title_en":"Personal events do not excuse contribution skips (non-exemption)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":10,"on_pass":"no_exemption","on_fail":"r7_not_applicable","all_of":[{"op":"fact_equals","fact":"contribution.personal_event_excuse_claimed","value":true}],"restoration":{"never_excuses":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 4.4 — R5/R9 special-death family + R14 concealment (SM-1 C7) ─────────────────
-- The FR-11 special-death family (R5(C.2)/R5(D)/R5(E)/R5(F)/R9/R9(A) + the Mar-2025 rule,
-- upgraded in place above) as REAL rule_kind:'conditional' payloads interpreted by the
-- @twt/niyamavali-engine primitive (Story 4.1). r9-suicide-murder is UPGRADED in place above;
-- r14 is AMENDED in place above; the six rows below are ADDED. Each clause is self-contained:
-- `all_of` preconditions over the caller-supplied `claim.*` facts (Epic 6 claim intake + Story
-- 3.9 disclosure history + Story 3.5 IMA-list resolution, assembled by the 4.6 Validity Service —
-- NO source system exists yet at Epic 4), `on_pass` = a routing/flag slug, `on_fail` =
-- 'special_death_not_applicable'. The engine picks WHICH sub-clause applies by the payload
-- `precedence` field (DATA, not hardcoded) when facts overlap.
--
-- ⚠ LOAD-BEARING INVARIANT (SM-1 C7, prd.md:370 "never auto-denial"): NO clause in this family
-- has `on_pass` or `on_fail` equal to a deny/ineligible slug. Every path is a ROUTING slug
-- (route_r9_voting / route_state_trustee_review / route_actual_cause_governs /
-- route_core_team_discretion / route_recovery_assistance) or the family not-applicable slug.
-- The engine surfaces a FLAG or a routing trigger; the consumer (Epic 6 claim filing) makes the
-- actual deny decision via State Trustee review / R9 voting. never_auto_deny:true on every row.
--
-- ⚠ `precedence` selects the surfaced EXPLANATION, not eligibility: every applied sub-clause
-- already means the special case applies; the pick only decides which reason is reported when
-- several apply (re-tune the DATA, never add engine logic). Exceptions/most-specific win:
-- Mar-2025 (80) > R9 (60) > R9(A) (50) > R5(E) (40) > R5(F) (30) > R5(C.2) (20) > R5(D) (10).
--
-- ⚠ R5(C.2) vs concealment are COMPLEMENTARY, not in conflict (prd.md:371): R5(C.2) fires on
-- claim.honestly_declared_preexisting (honest declarer → actual cause governs, eligible); the
-- concealment flag fires on claim.concealed_ima_condition_linked (dishonesty). The distinction
-- lives in how the PRODUCER derives the two facts, NOT in engine branching.
--
-- ⚠ PROVISIONAL POLICY (FR-11 `policy_review_required` — Trustee-Panel-tunable): the `precedence`
-- ints and the routing-slug vocabulary are provisional; final legally-reviewed copy lands via
-- Story 0.13. All benefit_mechanism='pool'. Idempotent (ON CONFLICT DO NOTHING). snake_case keys.
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c000f-0000-4000-8000-00000000000f',
    'niy.special-death.r5-c-2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R5(C.2)","title_en":"Actual cause of death governs (honestly-declared pre-existing illness does not bar eligibility)","rule_kind":"conditional","family":"special-death","precedence":20,"on_pass":"route_actual_cause_governs","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.honestly_declared_preexisting","value":true}],"eligibility_preserving":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0010-0000-4000-8000-000000000010',
    'niy.special-death.r5-d',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R5(D)","title_en":"Core team full discretion (no member legal claim; commitment purely ethical)","rule_kind":"conditional","family":"special-death","precedence":10,"on_pass":"route_core_team_discretion","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.legal_claim_asserted","value":true}],"discretionary":true,"no_legal_claim":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0011-0000-4000-8000-000000000011',
    'niy.special-death.r5-e',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R5(E)","title_en":"Multi-nominee dispute / defamatory beneficiary (State Trustee discretion; funds recoverable)","rule_kind":"conditional","family":"special-death","precedence":40,"on_pass":"route_state_trustee_review","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.multi_nominee_dispute","value":true}],"funds_recoverable":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0012-0000-4000-8000-000000000012',
    'niy.special-death.r5-f',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R5(F)","title_en":"Erroneous excess transfer (trust assists recovery; no guarantee, no liability)","rule_kind":"conditional","family":"special-death","precedence":30,"on_pass":"route_recovery_assistance","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.erroneous_excess_transfer","value":true}],"no_guarantee":true,"no_liability":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0013-0000-4000-8000-000000000013',
    'niy.special-death.r9',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R9","title_en":"Special death (suicide / controversial) — core-team investigation, R9 voting may apply","rule_kind":"conditional","family":"special-death","precedence":60,"on_pass":"route_r9_voting","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_in","fact":"claim.death_classification","values":["suicide","murder"]}],"voting_required":true,"majority_required":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0014-0000-4000-8000-000000000014',
    'niy.special-death.r9-a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R9(A)","title_en":"Multiple deaths same date (priority to higher contribution/support record)","rule_kind":"conditional","family":"special-death","precedence":50,"on_pass":"route_r9_voting","on_fail":"special_death_not_applicable","all_of":[{"op":"fact_equals","fact":"claim.multiple_deaths_same_date","value":true}],"voting_required":true,"priority_basis":"higher_contribution_record","never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;

-- ── Story 4.5 — R12 retirement-coverage extension (FR-12) ──────────────────────────────
-- FR-12's "+1 year post-retirement coverage per 5 years of valid membership (15 years -> +3)"
-- delivered as DATA: a single `rule_kind:'computed'` clause interpreted by the @twt/niyamavali-engine
-- primitive (Story 4.1). This is the FIRST computed rule — it COMPUTES AND RETURNS A VALUE
-- (`granted_years`) via the interpreter's registered `grant_ladder` computation, rather than a
-- boolean decision. The engine reads exactly two PRE-DERIVED, caller-injected `member.*` facts
-- (`member.valid_membership_years` int + `member.is_retired` bool); the raw `joined_at`/`retired_at`
-- dates are DELIBERATELY NOT engine facts (they are the producer's calendar-correct derivation
-- inputs and the Story 4.6 date-projection's inputs). NO source system exists yet at Epic 4 — the
-- producer is the Story 4.6 Validity Service.
--
-- The grant ladder is DATA (`grant_every_years`/`years_per_grant`/`min_years`); re-tuning the policy
-- is a clause amendment with ZERO engine change. No `cap` in v1 (the FR-12 addendum implies none;
-- add one only via a future amendment). The engine emits `granted_years` + echoes `is_retired` under
-- `result.computed.values` ONLY; Story 4.6 does the calendar date projection (`coverage_through`/
-- `days_remaining`/`active`) and maps the PRD `retirement_coverage` <-> epic `retirement_coverage_extension`
-- field-name variance.
--
-- LOAD-BEARING: retirement coverage EXTENDS eligibility, NEVER denies. `granted_years` is a PURE
-- function of tenure (`floor(valid_membership_years / grant_every_years) * years_per_grant`,
-- gated by `min_years`), independent of `is_retired` — a non-retired member with enough tenure
-- still earns a nonzero `granted_years` (PRD FR-12A's `years_of_coverage_earned`). `is_retired` is
-- echoed separately and gates ONLY the decision slug (`retirement_coverage_computed` iff retired
-- AND `granted_years > 0`, else `retirement_coverage_not_applicable`) + Story 4.6's `active` —
-- never an ineligible verdict either way (`on_computed`/`on_not_applicable` are routing/status
-- slugs, SM-1 posture). See `deferred-work.md` CR-4.5-D3.
--
-- PROVISIONAL POLICY (FR-12 `policy_review_required`): the "valid membership" lapse-netting question
-- (does a lapsed/withdrawn period reduce the count?) is unspecified — flagged for Trustee Panel review;
-- the producer's `valid_membership_years` derivation applies whatever policy is settled (D4). Final
-- legally-reviewed copy lands via Story 0.13. benefit_mechanism='pool' (the coverage extension governs
-- the crowdfunded death-support window, not the future v3 reserve). Idempotent (ON CONFLICT DO NOTHING).
INSERT INTO clause_versions
  (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
VALUES
  (
    '0e1c0015-0000-4000-8000-000000000015',
    'niy.retirement-coverage.r12',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-01-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R12","title_en":"Retirement coverage extension (+1 year post-retirement per 5 years of valid membership; 15 years grants +3)","rule_kind":"computed","computation":"grant_ladder","inputs":{"tenure_years":"member.valid_membership_years","retirement_flag":"member.is_retired"},"params":{"grant_every_years":5,"years_per_grant":1,"min_years":5},"output_key":"granted_years","retirement_output_key":"is_retired","on_computed":"retirement_coverage_computed","on_not_applicable":"retirement_coverage_not_applicable","family":"retirement-coverage","eligibility_extension":true,"never_auto_deny":true,"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  )
ON CONFLICT (clause_version_id) DO NOTHING;
