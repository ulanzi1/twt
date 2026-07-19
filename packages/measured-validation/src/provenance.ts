// Measured-validation framework — run PROVENANCE helpers (AI-6-2). A recorded p95 is only attestable with
// its git_commit + db_version pinned to it (the versioned-evidence discipline); these resolve both.

import { execSync } from 'node:child_process';

import type pg from 'pg';

/** The current HEAD commit (short), or `unknown` outside a git checkout. */
export function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** The Postgres `server_version` the run measured against (null when the query fails). */
export async function pgServerVersion(pool: pg.Pool): Promise<string | null> {
  try {
    const res = await pool.query<{ v: string }>('SHOW server_version');
    return res.rows[0]?.v ?? null;
  } catch {
    return null;
  }
}
