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
    '{"rule_code":"R8","title_en":"Ninety-percent contribution rule","threshold_percent":90,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0003-0000-4000-8000-000000000003',
    'niy.special-death.r9-suicide-murder',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R9","title_en":"Special death (suicide / murder) per Mar 2025 rule","provisional":true}'::jsonb,
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
-- question). Story 4.4 will AMEND niy.concealment.r14 (same clause_id, new clause_version_id)
-- with the R14 rule-engine evaluation logic — the 3.5 seed is the consent-ack v1 ONLY (do NOT
-- pre-bake scoring/flag-criteria fields here). Idempotent (ON CONFLICT DO NOTHING).
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
    '{"rule_code":"R14","title_en":"Concealment denial — undeclared IMA-listed illness","ack_text_en":"I understand that if I conceal an IMA-listed condition and my death is later linked to that condition, my nominees'' claim may be denied or flagged for State Trustee review per Niyamavali clause niy.concealment.r14.","ack_text_hi":"मैं समझता/समझती हूँ कि यदि मैं किसी IMA-सूचीबद्ध बीमारी को छिपाता/छिपाती हूँ और बाद में मेरी मृत्यु उस बीमारी से जुड़ी पाई जाती है, तो Niyamavali खंड niy.concealment.r14 के अनुसार मेरे नामितों का दावा अस्वीकार किया जा सकता है या State Trustee समीक्षा के लिए चिह्नित किया जा सकता है।","never_auto_deny":true,"provisional":true}'::jsonb,
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
-- 3 consecutive contributions, incrementing r7a_restorations_used) is a downstream Epic 8/9
-- workflow — this seed only encodes the precondition evaluation. R7(G) is declarative: it
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
    '{"rule_code":"R7(C)","title_en":"Long-gap restoration (treat as new registration)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":70,"on_pass":"treat_as_new_registration","on_fail":"r7_not_applicable","all_of":[{"op":"fact_gte","fact":"contribution.months_since_last","min":12}],"restoration":{"consecutive_required":5,"lock_in_months":3},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c0009-0000-4000-8000-000000000009',
    'niy.contribution-discipline.r7-d',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(D)","title_en":"Established member single-skip restoration (3-month lock-in plus catch-up)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":30,"on_pass":"lockin_3mo_plus_catchup","on_fail":"r7_not_applicable","all_of":[{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_equals","fact":"contribution.skips_current_year","value":1}],"restoration":{"lock_in_months":3,"catch_up_required":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000a-0000-4000-8000-00000000000a',
    'niy.contribution-discipline.r7-e',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(E)","title_en":"Established member multi-skip restoration (5-month lock-in complete all)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":40,"on_pass":"lockin_5mo_complete_all","on_fail":"r7_not_applicable","all_of":[{"op":"fact_gte","fact":"contribution.total_count","min":10},{"op":"fact_gte","fact":"contribution.skips_current_year","min":2}],"restoration":{"lock_in_months":5,"complete_all":true},"policy_review_required":true,"provisional":true}'::jsonb,
    'pool'
  ),
  (
    '0e1c000b-0000-4000-8000-00000000000b',
    'niy.contribution-discipline.r7-f',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    1,
    '2025-03-01T00:00:00+00:00'::timestamptz,
    '{"rule_code":"R7(F)","title_en":"Six-month gap restoration (5-month lock-in complete all)","rule_kind":"conditional","family":"r7-contribution-discipline","precedence":45,"on_pass":"lockin_5mo_complete_all","on_fail":"r7_not_applicable","all_of":[{"op":"fact_gte","fact":"contribution.months_since_last","min":6}],"restoration":{"lock_in_months":5,"complete_all":true},"policy_review_required":true,"provisional":true}'::jsonb,
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
