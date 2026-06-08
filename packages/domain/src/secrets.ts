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
  const useSecretManager =
    process.env['NODE_ENV'] === 'production' ||
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] !== undefined ||
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
  const [version] = await client.accessSecretVersion({ name });

  const payload = version.payload?.data;
  if (!payload) {
    throw new Error(`[secrets] Secret '${secretName}' has no payload`);
  }

  return Buffer.from(payload).toString('utf-8');
}
