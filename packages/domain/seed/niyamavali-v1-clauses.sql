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
    '{"rule_code":"R7(A)","title_en":"Restoration after contribution lapse","restoration_window_days":30,"provisional":true}'::jsonb,
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
