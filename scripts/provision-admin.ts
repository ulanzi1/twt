// Ops admin provisioning — create an admin identity + a role grant, out of band.
//
// ⭐ THIS IS THE PATH THE CODE ALREADY ANTICIPATED AND NOBODY WROTE.
// `mintEnrollmentToken` (apps/api/src/modules/auth/admin/admin-auth.service.ts) documents itself as
// "an out-of-band enrollment link (bootstrap / post-reset) … Issued by an ops/super-admin path (NOT
// a public route)", and `createAdminAccount` is headed "Bootstrap helper (tests + ops seed)". Both
// existed with NO caller outside tests, and `role_grants` had NO write path anywhere in `src` — so
// the admin identity system could never be bootstrapped in a deployed environment. This is that
// caller. It is deliberately a SCRIPT, not a route: admin creation is not a product surface in v1.
//
// ⚠ WHAT IT DOES NOT DO: it does NOT bypass any authorization gate. The account it creates still
// authenticates normally (password + passkey enrollment) and is still subject to every RBAC check.
// It writes exactly two things: an admin identity (`users` + `admin_credentials`, via the existing
// service helper) and one `role_grants` row.
//
// ⛔⛔ A SECOND ACCOUNT IS NOT A SECOND PERSON. The Story 2.4 tone-review gate
// (`packages/domain/src/tone-review/gate.ts`) is a bare identity comparison — `reviewedBy ===
// authoredBy` denies. Two accounts held by ONE human satisfy it mechanically while defeating the
// control, which exists so that a DIFFERENT PERSON reads the copy before it publishes. Provisioning
// an account for a real second reviewer is the intended use; provisioning one for yourself is not.
//
// IDEMPOTENT: re-running with the same email reuses the existing admin, and the grant is inserted
// only when an identical one is absent (`role_grants` has no unique constraint, so duplicate rows
// are possible and are what this check prevents).
//
// Run:
//   ADMIN_EMAIL=… ADMIN_DISPLAY_NAME='…' pnpm tsx scripts/provision-admin.ts
//   … PROVISION_DRY_RUN=1                 # resolve + validate + report, write NOTHING
//   … ADMIN_ROLE=super_admin              # default: pariwar_admin
//   … ADMIN_PARIWAR_ID=<uuid>             # default: the Bihar seed Pariwar
//   … ADMIN_PASSWORD=…                    # default: a generated 32-char secret, printed ONCE
//   … PROVISION_ALLOW_REMOTE=yes          # required when the target DB is not localhost
//
// Connection + secret resolution are IDENTICAL to the API (`resolveConnectionString` /
// `resolveSecretValue`): Secret Manager in prod, DATABASE_URL / env fallback locally. Against a
// live environment this also needs the API's KMS env (`KMS_TEST_MODE=live` + the ADMIN_*_RESOURCE
// vars) — otherwise the email blind index is derived with the fake provider and will not match
// what the running API computes.
//
// Imported by relative source path (not the `@twt/domain` / workspace specifier): a root-level
// `scripts/` file sits outside any workspace package, so the workspace symlink is not on its
// resolution path. Mirrors `scripts/seed-placeholder-tc.ts`.

import { randomBytes, randomUUID } from 'node:crypto';

import { loadConfig } from '../apps/api/src/config.js';
import type { AppDeps } from '../apps/api/src/context.js';
import { buildEncryptionDeps } from '../apps/api/src/deps.js';
import { findAdminByEmailIndex } from '../apps/api/src/modules/auth/admin/admin-auth.repo.js';
import {
  createAdminAccount,
  mintEnrollmentToken,
} from '../apps/api/src/modules/auth/admin/admin-auth.service.js';
import { emailBlindIndex } from '../apps/api/src/modules/auth/shared/email-index.js';
import {
  createDb,
  rbac,
  resolveConnectionString,
  resolveSecretValue,
} from '../packages/domain/src/index.js';

/** The Bihar seed pariwar_id — the same fallback `seed-placeholder-tc.ts` uses. */
const DEFAULT_BIHAR_PARIWAR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** The permission this tool exists to make exercisable (Story 2.4 tone-review sign-off). */
const TONE_REVIEW_KEY = 'niyamavali.review';

/** Scope dimensions a `pariwar`-dimension permission check can be satisfied from. */
const PARIWAR_CAPABLE_CEILINGS = new Set(['pariwar', 'global']);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[provision-admin] ${name} is required`);
  }
  return value.trim();
}

/** Redact credentials before echoing a connection string back to the operator. */
function describeTarget(connectionString: string): { display: string; host: string } {
  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    return { display: `${url.protocol}//${host}:${url.port || '5432'}${url.pathname}`, host };
  } catch {
    return { display: '<unparseable connection string>', host: '' };
  }
}

function isLocal(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * The grant shape for a role, derived from the role's OWN declared `scopeCeiling` — never assumed.
 *
 * ⚠ A grant written at the wrong dimension is worse than no grant: it is a row that LOOKS like
 * authority and fails closed at every check. `global` carries a NULL scope_value (the `role_grants`
 * schema permits NULL only there); `pariwar` binds to the Pariwar id; anything NARROWER
 * (`state`/`district`/`block`) binds to a concrete node this script cannot infer — so it demands
 * ADMIN_SCOPE_VALUE rather than silently writing a pariwar-shaped row.
 */
function grantShapeFor(
  ceiling: string,
  pariwarId: string,
): { scopeDimension: string; scopeValue: string | null } {
  if (ceiling === 'global') return { scopeDimension: 'global', scopeValue: null };
  if (ceiling === 'pariwar') return { scopeDimension: 'pariwar', scopeValue: pariwarId };
  const scopeValue = process.env['ADMIN_SCOPE_VALUE']?.trim();
  if (!scopeValue) {
    throw new Error(
      `[provision-admin] this role is held at '${ceiling}' scope, so ADMIN_SCOPE_VALUE is required ` +
        `(the concrete ${ceiling} the grant binds to). Refusing to write a pariwar-shaped grant for it.`,
    );
  }
  return { scopeDimension: ceiling, scopeValue };
}

async function main(): Promise<void> {
  const email = requireEnv('ADMIN_EMAIL');
  // Story 6.11 (R5): display_name is the controlled staff-attribution source and is NEVER
  // email-derived. Omitting it leaves it NULL, which blocks adjudication later — so it is required
  // here rather than silently deferred.
  const displayName = requireEnv('ADMIN_DISPLAY_NAME');
  const role = (process.env['ADMIN_ROLE'] ?? 'pariwar_admin').trim();
  const pariwarId = (process.env['ADMIN_PARIWAR_ID'] ?? DEFAULT_BIHAR_PARIWAR_ID).trim();
  const dryRun = process.env['PROVISION_DRY_RUN'] === '1';

  // Validate the role against the DECLARED bundles rather than trusting the input — and prove the
  // account this creates can actually do the job it is being created for.
  const bundle = rbac.bundleForRole(role);
  if (!bundle) {
    throw new Error(`[provision-admin] unknown role ${JSON.stringify(role)}`);
  }
  const holdsToneReview = bundle.permissions.includes(TONE_REVIEW_KEY);
  const ceilingReaches = PARIWAR_CAPABLE_CEILINGS.has(bundle.scopeCeiling);
  console.log(`[provision-admin] role=${role} scopeCeiling=${bundle.scopeCeiling}`);
  console.log(
    `[provision-admin]   ${TONE_REVIEW_KEY}: ${holdsToneReview ? 'held' : 'NOT held'}; ` +
      `pariwar-dimension check reachable: ${ceilingReaches ? 'yes' : 'NO'}`,
  );
  if (holdsToneReview && !ceilingReaches) {
    // The `state_trustee` trap: it holds the key but its narrower `state` ceiling is fail-closed
    // against a `pariwar`-dimension check, so the grant can never be exercised.
    console.warn(
      `[provision-admin] ⚠ ${role} holds ${TONE_REVIEW_KEY} but its ${bundle.scopeCeiling} ceiling ` +
        `cannot satisfy a pariwar-dimension check — this account could NOT record a tone-review sign-off.`,
    );
  }

  const connectionString = await resolveConnectionString();
  const target = describeTarget(connectionString);
  console.log(`[provision-admin] target: ${target.display}`);
  if (!isLocal(target.host) && process.env['PROVISION_ALLOW_REMOTE'] !== 'yes') {
    throw new Error(
      `[provision-admin] refusing to write to non-local database ${target.display} — ` +
        `set PROVISION_ALLOW_REMOTE=yes to confirm this is intentional`,
    );
  }

  const config = loadConfig();
  const pepper = await resolveSecretValue(config.argon2.pepperSecretName, {
    envFallback: config.argon2.pepperEnvFallback,
  });
  if (!pepper || pepper.trim() === '') {
    throw new Error(
      `[provision-admin] Argon2id pepper resolved empty — check '${config.argon2.pepperSecretName}'`,
    );
  }

  const { db, pool } = createDb(connectionString, { max: 1, logger: false });

  // A MINIMAL deps object, mirroring `apps/api/src/deps.ts` `createDeps` for exactly the fields the
  // two callees read — `createAdminAccount` uses pool/encryption/pepper/config.argon2.params;
  // `mintEnrollmentToken` uses clock/config.sessionSecret. Built by hand rather than via
  // `createDeps` so this script does NOT stand up the pg-boss producers, the channel adapters or
  // the audit sinks that the full graph wires. ⚠ If either callee starts reading another field,
  // this cast is what will fail — deliberately, and at the call site.
  const deps = {
    config,
    db,
    pool,
    encryption: buildEncryptionDeps(pepper),
    pepper: Buffer.from(pepper, 'utf-8'),
    clock: () => new Date(),
  } as unknown as AppDeps;

  try {
    const blindIndex = await emailBlindIndex(email, deps.encryption);
    const existing = await findAdminByEmailIndex(pool, blindIndex);

    const password = process.env['ADMIN_PASSWORD'] ?? randomBytes(24).toString('base64url');
    const generated = process.env['ADMIN_PASSWORD'] === undefined;

    let userId: string;
    if (existing) {
      userId = existing.userId;
      console.log(`[provision-admin] admin already exists for this email — reusing ${userId}`);
    } else if (dryRun) {
      userId = randomUUID();
      console.log(`[provision-admin] DRY RUN — would create admin ${userId} (${displayName})`);
    } else {
      userId = await createAdminAccount(deps, { email, password, displayName });
      console.log(`[provision-admin] created admin ${userId} (${displayName})`);
    }

    // The role grant. `role_grants` has NO write path in `src` — this raw INSERT is the whole of it.
    // $3 is a separate parameter rather than a reused $2: pg deduces inconsistent types for a
    // reused param here (uuid vs text), the landmine documented in scope-tx.spec.ts.
    const { scopeDimension, scopeValue } = grantShapeFor(bundle.scopeCeiling, pariwarId);
    const client = await pool.connect();
    try {
      const dup = await client.query(
        `SELECT id FROM role_grants
          WHERE user_id = $1 AND pariwar_id = $2 AND role = $3
            AND scope_dimension = $4 AND scope_value IS NOT DISTINCT FROM $5`,
        [userId, pariwarId, role, scopeDimension, scopeValue],
      );
      if (dup.rowCount && dup.rowCount > 0) {
        console.log(`[provision-admin] grant already present — leaving it alone`);
      } else if (dryRun) {
        console.log(
          `[provision-admin] DRY RUN — would grant ${role} @ ${scopeDimension}=${scopeValue ?? 'NULL'}`,
        );
      } else {
        await client.query(
          `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
             VALUES ($1, $2, $3, $4, $5)`,
          [userId, pariwarId, role, scopeDimension, scopeValue],
        );
        console.log(
          `[provision-admin] granted ${role} @ ${scopeDimension}=${scopeValue ?? 'NULL'} in ${pariwarId}`,
        );
      }
    } finally {
      client.release();
    }

    if (dryRun) {
      console.log('[provision-admin] DRY RUN complete — nothing was written.');
      return;
    }

    // The enrollment link is how the second person takes ownership of the account: they enroll a
    // passkey against it. It is short-lived (1h) and single-purpose.
    const token = mintEnrollmentToken(deps, userId);
    console.log('');
    console.log('  ── hand these to the account holder, over a channel you trust ──');
    console.log(`  email            : ${email}`);
    if (generated) console.log(`  password         : ${password}   (generated; shown ONCE)`);
    console.log(`  enrollment token : ${token}`);
    console.log('  (POST it to /api/v1/auth/passkey/register/options as `enrollmentToken`)');
    console.log('');
    console.log('  ⚠ A second ACCOUNT is not a second PERSON. The tone-review gate compares');
    console.log('    identities, not intent — it exists so someone else reads the copy.');
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((err: unknown) => {
  console.error('[provision-admin] failed:', err);
  process.exit(1);
});
