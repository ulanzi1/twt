// Connection-string resolution: GCP Secret Manager for non-local paths;
// DATABASE_URL env-var fallback for local dev.
//
// Per architecture §5.4 line 3046-3055 (Workload Identity Federation) +
// §5.9 line 3320-3327 (Secret Manager for all credentials), production +
// CI execution paths fetch via Secret Manager via Application Default
// Credentials. Local-developer execution falls back to DATABASE_URL.

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const DEFAULT_SECRET_NAME = 'twt-dev-cloud-sql-conn-string';

/**
 * Resolves the database connection string. Order of precedence:
 *
 *   1. If NODE_ENV === 'production', or GOOGLE_APPLICATION_CREDENTIALS is set,
 *      or DRIZZLE_FORCE_SECRET_MANAGER === '1', fetch from Secret Manager via
 *      Application Default Credentials.
 *   2. Otherwise (local dev), read DATABASE_URL from env (loaded via dotenv).
 *
 * Never logs the resolved value.
 */
export async function resolveConnectionString(
  secretName: string = DEFAULT_SECRET_NAME,
): Promise<string> {
  // Lowercase NODE_ENV — some hosting platforms set `Production` or `PRODUCTION`.
  // Trim GOOGLE_APPLICATION_CREDENTIALS — whitespace-only strings (`" "`) are
  // truthy under `!!` but point ADC at an invalid path.
  const nodeEnv = process.env['NODE_ENV']?.toLowerCase();
  const gacPath = process.env['GOOGLE_APPLICATION_CREDENTIALS']?.trim() ?? '';
  const useSecretManager =
    nodeEnv === 'production' ||
    gacPath !== '' ||
    process.env['DRIZZLE_FORCE_SECRET_MANAGER'] === '1';

  if (useSecretManager) {
    return fetchConnectionString(secretName);
  }

  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      '[secrets] Neither Secret Manager nor DATABASE_URL is available. ' +
        'Set DATABASE_URL in packages/domain/.env for local dev, or run with ADC active ' +
        '(`gcloud auth application-default login`).',
    );
  }

  console.warn(
    '[secrets] Local-dev fallback in use; production paths require Secret Manager.',
  );
  return url;
}

/**
 * Fetches a secret from GCP Secret Manager. Uses Application Default
 * Credentials (ADC); the project is resolved from GOOGLE_CLOUD_PROJECT.
 *
 * Never logs the resolved value.
 */
export async function fetchConnectionString(secretName: string): Promise<string> {
  const projectId = process.env['GOOGLE_CLOUD_PROJECT'];
  if (!projectId) {
    throw new Error(
      '[secrets] GOOGLE_CLOUD_PROJECT env var is required to resolve Secret Manager secrets',
    );
  }

  const client = new SecretManagerServiceClient();
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  // 10s ceiling — protects `db:migrate` and process startup from indefinite hangs
  // on Secret Manager API stalls (auth-token refresh storms, network partitions).
  // Mirrors the pg.Pool connectionTimeoutMillis ceiling so failure modes are uniform.
  const [version] = await client.accessSecretVersion({ name }, { timeout: 10_000 });

  const payload = version.payload?.data;
  if (!payload) {
    throw new Error(`[secrets] Secret '${secretName}' has no payload`);
  }

  return Buffer.from(payload).toString('utf-8');
}

/**
 * Generic secret resolver (Story 1.9 — the Argon2id pepper path follows this).
 * Same precedence as `resolveConnectionString` but for an arbitrary secret name,
 * with an explicit local-dev env fallback variable. Production (or any ADC-active
 * context) fetches from Secret Manager; local dev reads `opts.envFallback` from the
 * environment. Never logs the resolved value.
 *
 *   const pepper = await resolveSecretValue('twt-dev-argon2-pepper', {
 *     envFallback: 'ARGON2_PEPPER',
 *   });
 */
export async function resolveSecretValue(
  secretName: string,
  opts: { envFallback?: string } = {},
): Promise<string> {
  const nodeEnv = process.env['NODE_ENV']?.toLowerCase();
  const gacPath = process.env['GOOGLE_APPLICATION_CREDENTIALS']?.trim() ?? '';
  const useSecretManager =
    nodeEnv === 'production' ||
    gacPath !== '' ||
    process.env['DRIZZLE_FORCE_SECRET_MANAGER'] === '1';

  if (useSecretManager) {
    return fetchConnectionString(secretName);
  }

  if (opts.envFallback) {
    const v = process.env[opts.envFallback];
    if (v !== undefined && v !== '') {
      console.warn(
        `[secrets] Local-dev fallback (${opts.envFallback}) in use for '${secretName}'; ` +
          'production paths require Secret Manager.',
      );
      return v;
    }
  }

  throw new Error(
    `[secrets] Secret '${secretName}' is unavailable: no Secret Manager context ` +
      '(set NODE_ENV=production, GOOGLE_APPLICATION_CREDENTIALS, or DRIZZLE_FORCE_SECRET_MANAGER=1) ' +
      `and no local fallback ${opts.envFallback ? `(${opts.envFallback})` : '(none configured)'} set.`,
  );
}
