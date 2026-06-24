// One-shot placeholder-T&C seed — Story 2.6 (Task 7; demoable closure for AC4/AC5).
//
// Seeds a single PENDING placeholder Terms & Conditions version for the active
// (Bihar) Pariwar so the public `/terms` page renders with the provisional banner
// in dev/staging — the epic's demoable closure ("validates against a placeholder
// T&C body"). The placeholder is pinned to ≥1 existing Bihar clause version (the
// version-pin mechanism the story builds); if the Pariwar has no clauses yet, a
// minimal placeholder clause is created first so the seed always succeeds.
//
// Lawyer-reviewed final T&C copy lands later per Story 0.13 (external dependency)
// and does NOT gate this story — hence legal_review_status stays `pending`.
//
// IDEMPOTENT: if an effective T&C already exists for the Pariwar, the seed is a
// no-op (re-running is safe). Connection is resolved exactly like db:migrate
// (Secret Manager in prod; DATABASE_URL fallback locally).
//
// Run:  DATABASE_URL=… pnpm tsx scripts/seed-placeholder-tc.ts
//   (or `pnpm seed:tc`). Optionally PUBLIC_PARIWAR_ID overrides the Bihar default.

// Imported by relative source path (not the `@twt/domain` specifier): a root-level
// `scripts/` file is outside any workspace package, so the workspace symlink is not
// on its resolution path. tsx resolves the `.js` extension to the `.ts` source. This
// mirrors how `packages/domain/scripts/migrate.ts` imports `../src/*`.
import {
  createDb,
  ids,
  niyamavali,
  resolveConnectionString,
  termsAndConditions,
  withPariwarScope,
} from '../packages/domain/src/index.js';

// The Bihar seed pariwar_id — same fallback apps/public's ACTIVE_PARIWAR_ID uses.
const DEFAULT_BIHAR_PARIWAR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const PLACEHOLDER_MARKDOWN = [
  '# Terms & Conditions',
  '',
  '_This is a provisional placeholder. The final Terms & Conditions are pending',
  'legal-counsel review (Story 0.13) and may change before publication._',
  '',
  '## 1. Membership',
  '',
  'By accepting these Terms you agree to abide by the Niyamavali (rules) of the',
  'Pariwar as published at `/niyamavali`.',
  '',
  '## 2. Contributions',
  '',
  'Members contribute to the mutual-aid pool in accordance with the contribution',
  'discipline set out in the Niyamavali.',
  '',
  '## 3. Acceptance',
  '',
  'Your acceptance is recorded against the exact version of these Terms in force at',
  'the time of signup, and remains recoverable for the life of your membership.',
  '',
].join('\n');

async function main(): Promise<void> {
  const pariwarId = ids.pariwarId(process.env.PUBLIC_PARIWAR_ID ?? DEFAULT_BIHAR_PARIWAR_ID);
  const connectionString = await resolveConnectionString();
  const { pool } = createDb(connectionString, { max: 1, logger: false });

  try {
    await withPariwarScope(pool, pariwarId, async (tx) => {
      // Idempotent: skip when a T&C is already in force for this Pariwar.
      const existing = await termsAndConditions.getEffectiveTc(tx, pariwarId);
      if (existing) {
        console.log(
          `[seed-tc] a T&C version is already effective (tc_version_id=${existing.tcVersionId}); skipping.`,
        );
        return;
      }

      // Pin to ≥1 existing Bihar clause version; create a minimal one if none exist.
      let clauses = await niyamavali.listEffectiveClauses(tx, pariwarId);
      if (clauses.length === 0) {
        const placeholderClause = await niyamavali.createClause(tx, {
          pariwarId,
          clauseId: ids.clauseId('niy.tc-placeholder.r1'),
          effectiveDate: new Date(),
          payload: { rule_code: 'TC_PLACEHOLDER' },
          benefitMechanism: 'pool',
        });
        clauses = [placeholderClause];
        console.log(
          `[seed-tc] no Bihar clause found — created placeholder clause ${placeholderClause.clauseVersionId}.`,
        );
      }
      const pin = clauses[0];
      if (!pin) throw new Error('[seed-tc] unreachable: no clause to pin');

      const row = await termsAndConditions.createTcVersion(tx, {
        pariwarId,
        bodyMarkdown: PLACEHOLDER_MARKDOWN,
        pinnedClauseVersionIds: [pin.clauseVersionId],
        effectiveFrom: new Date(),
        authoredByActor: null,
      });
      console.log(
        `[seed-tc] seeded placeholder T&C version ${row.tcVersionId} ` +
          `(status=${row.legalReviewStatus}, pinned clause_version_id=${pin.clauseVersionId}).`,
      );
    });
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error('[seed-tc] failed:', err);
  process.exit(1);
});
