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
