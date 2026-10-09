// Story 6.25 (Task 2.2; AC7; `2026-10-09-299` RE8; ADR-0040) — THE IDENTITY-DATA READ PATHS, fenced in code.
//
// ADR-0009 §5 (ratified) rests the confidentiality of identity data partly on *"the narrow apps/api auth repo as the sole query
// path"*; ADR-0040 (`drafted`) amends it to admit EXACTLY two more query sites for the staff email — Q1 (the recipient
// eligibility fragment: it may only TEST `EXISTS (SELECT 1 FROM admin_credentials …)`, projecting ⛔ column) and Q2
// (`readAdminEmailCiphertext`: ONLY `email_ciphertext`, ONE user). This fence makes that a check, ⛔ a convention:
//   (1) every source file under `apps/*/src`, `packages/*/src` and `scripts/` (⛔ `dist`, ⛔ `node_modules`, comments stripped)
//       that names `admin_credentials` / `adminCredentials` is on an EXACT allowlist;
//   (2) in the 6.25 identity-read module, every `SELECT … FROM admin_credentials` projects `1` (Q1) or exactly
//       `se_q2.email_ciphertext` (Q2, once), and every `se_ac.` column is `user_id`;
//   (3) every caller of `decryptAdminEmail` is on an EXACT allowlist (the barrel export makes it importable anywhere);
//   (4) ⭐ round 3 — the CAPABILITY, ⛔ only the name: every file naming the admin email's envelope context
//       (`ADMIN_EMAIL_ENCRYPTION_CONTEXT`, or a by-value `fieldClass: ADMIN_EMAIL_FIELD_CLASS | 'admin_email'`) is on an EXACT
//       allowlist — a new `decryptTier1(…, ADMIN_EMAIL_ENCRYPTION_CONTEXT, …)` decrypts admin emails without the helper's name.
// ⭐ POSITIVE CONTROL: one planted violation per rule, into a COPY of the scanned tree, IS caught by the same checker; a commented
// plant is ⛔ caught. A new reader or caller is a NEW ADR, ⛔ an allowlist edit.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const IDENTITY_TABLE = /\badmin_credentials\b|\badminCredentials\b/;
const DECRYPT = /\bdecryptAdminEmail\b/;
// Round 4 — also a NAMESPACED constant (`encryption.ADMIN_EMAIL_FIELD_CLASS`) and a template literal. ⚠ A shorthand `{ fieldClass }`
// built from a local is out of a source fence's reach — recorded, ⛔ claimed.
const ADMIN_EMAIL_CONTEXT = /\bADMIN_EMAIL_ENCRYPTION_CONTEXT\b|fieldClass:\s*(?:[\w.]*\bADMIN_EMAIL_FIELD_CLASS\b|['"`]admin_email['"`])/;
const Q_MODULE = 'packages/domain/src/claim/staff-email-identity-read.ts';

/** The ONLY files whose code names the admin credentials table (ADR-0009's repo + the schema family + ADR-0040's Q1 / Q2). */
const IDENTITY_ALLOWLIST = [
  'apps/api/src/modules/auth/admin/admin-auth.repo.ts',
  'packages/domain/src/schema/admin_credentials.ts',
  'packages/domain/src/schema/index.ts',
  'packages/domain/src/policies/identity-auth-rls.ts',
  Q_MODULE,
].sort();

/** The ONLY files whose code names `decryptAdminEmail` (its definition, the barrel, the API delegation, the 6.25 child). */
const DECRYPT_ALLOWLIST = [
  'packages/domain/src/encryption/admin-email.ts',
  'packages/domain/src/encryption/index.ts',
  'apps/api/src/modules/auth/shared/email-index.ts',
  'apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts',
].sort();

/** The ONLY files that name the admin email's envelope context (its definition + barrel, the API's write path + request scope). */
const CONTEXT_ALLOWLIST = [
  'apps/api/src/middleware/request-context/index.ts',
  'apps/api/src/modules/auth/shared/email-index.ts',
  'packages/domain/src/encryption/admin-email.ts',
  'packages/domain/src/encryption/index.ts',
].sort();

const SOURCE = /\.(?:ts|tsx|mts|cts|js|mjs)$/;

function walk(rel: string, out: Map<string, string>): void {
  const abs = path.join(repoRoot, rel);
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const childRel = `${rel}/${name}`;
    if (statSync(path.join(abs, name)).isDirectory()) walk(childRel, out);
    else if (SOURCE.test(name)) out.set(childRel, readFileSync(path.join(abs, name), 'utf-8'));
  }
}

/** The scanned tree: `apps/*\/src`, `packages/*\/src`, `scripts/`. */
function scanTree(): Map<string, string> {
  const files = new Map<string, string>();
  for (const group of ['apps', 'packages']) {
    for (const pkg of readdirSync(path.join(repoRoot, group))) {
      const src = path.join(repoRoot, group, pkg, 'src');
      try {
        if (statSync(src).isDirectory()) walk(`${group}/${pkg}/src`, files);
      } catch {
        // ⛔ src dir
      }
    }
  }
  walk('scripts', files);
  return files;
}

/** ⭐ ONE checker for the fence and its positive control. Returns every violation as `<rule>:<file>`. */
function violationsOf(files: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  const identityReaders = [...files].filter(([, src]) => IDENTITY_TABLE.test(stripComments(src))).map(([f]) => f).sort();
  for (const f of identityReaders) if (!IDENTITY_ALLOWLIST.includes(f)) out.push(`reader:${f}`);
  const callers = [...files].filter(([, src]) => DECRYPT.test(stripComments(src))).map(([f]) => f).sort();
  for (const f of callers) if (!DECRYPT_ALLOWLIST.includes(f)) out.push(`decrypt-caller:${f}`);
  const contextUsers = [...files].filter(([, src]) => ADMIN_EMAIL_CONTEXT.test(stripComments(src))).map(([f]) => f).sort();
  for (const f of contextUsers) if (!CONTEXT_ALLOWLIST.includes(f)) out.push(`admin-email-context:${f}`);
  const q = files.get(Q_MODULE);
  if (q === undefined) {
    out.push(`missing:${Q_MODULE}`);
  } else {
    const code = stripComments(q);
    const projections = [...code.matchAll(/\bSELECT\s+((?:(?!\bSELECT\b)[\s\S])*?)\s+FROM\s+admin_credentials\b/g)].map((m) => m[1]!.replace(/\s+/g, ' ').trim());
    for (const p of projections) if (p !== '1' && p !== 'se_q2.email_ciphertext') out.push(`projection:${p}`);
    if (projections.filter((p) => p === 'se_q2.email_ciphertext').length !== 1) out.push('projection:q2-count');
    if (projections.filter((p) => p === '1').length !== 1) out.push('projection:q1-count');
    for (const m of code.matchAll(/\bse_ac\.(\w+)/g)) if (m[1] !== 'user_id') out.push(`q1-column:${m[1]!}`);
  }
  return out;
}

describe('⛔ ADR-0040 — the identity-data read paths are EXACTLY the allowlisted ones', () => {
  const tree = scanTree();

  it('⭐ the real tree has ⛔ violation — and the allowlists are EXACT (every entry is actually a reader / caller)', () => {
    expect(violationsOf(tree)).toEqual([]);
    const readers = [...tree].filter(([, s]) => IDENTITY_TABLE.test(stripComments(s))).map(([f]) => f).sort();
    expect(readers).toEqual(IDENTITY_ALLOWLIST);
    const callers = [...tree].filter(([, s]) => DECRYPT.test(stripComments(s))).map(([f]) => f).sort();
    expect(callers).toEqual(DECRYPT_ALLOWLIST);
    const contextUsers = [...tree].filter(([, s]) => ADMIN_EMAIL_CONTEXT.test(stripComments(s))).map(([f]) => f).sort();
    expect(contextUsers).toEqual(CONTEXT_ALLOWLIST);
  });

  it('⭐ POSITIVE CONTROL — one plant per rule IS caught; a COMMENTED plant is ⛔', () => {
    const plant = (f: string, extra: string) => {
      const copy = new Map(tree);
      copy.set(f, `${copy.get(f) ?? ''}\n${extra}\n`);
      return violationsOf(copy);
    };
    // (1) a new reader of the credentials table.
    expect(plant('apps/jobs/src/scheduler/staff-email-config.ts', "await pool.query('SELECT user_id FROM admin_credentials');")).toContain(
      'reader:apps/jobs/src/scheduler/staff-email-config.ts',
    );
    expect(plant('packages/domain/src/claim/admin-directory.ts', 'db.select().from(schema.adminCredentials);')).toContain(
      'reader:packages/domain/src/claim/admin-directory.ts',
    );
    // (2) Q2 projecting a second column; Q1 reaching for a credentials column.
    expect(plant(Q_MODULE, "sql`SELECT se_q2.email_ciphertext, se_q2.password_hash FROM admin_credentials se_q2`;")).toEqual(
      expect.arrayContaining(['projection:se_q2.email_ciphertext, se_q2.password_hash']),
    );
    expect(plant(Q_MODULE, 'sql`AND se_ac.failed_attempts = 0`;')).toContain('q1-column:failed_attempts');
    // (3) a new decrypt caller.
    expect(plant('apps/jobs/src/scheduler/staff-email-client.ts', 'await encryption.decryptAdminEmail(ct, deps);')).toContain(
      'decrypt-caller:apps/jobs/src/scheduler/staff-email-client.ts',
    );
    // (4) the capability without the helper's name — the constant, or a by-value context.
    expect(plant('apps/jobs/src/scheduler/staff-email-client.ts', 'await encryption.decryptTier1(ct, encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, k, r);')).toContain(
      'admin-email-context:apps/jobs/src/scheduler/staff-email-client.ts',
    );
    expect(plant('apps/jobs/src/scheduler/staff-email-config.ts', "const c = { pariwarId: NS, fieldClass: 'admin_email' };")).toContain(
      'admin-email-context:apps/jobs/src/scheduler/staff-email-config.ts',
    );
    expect(plant('apps/jobs/src/scheduler/staff-email-config.ts', 'const c = { pariwarId: NS, fieldClass: encryption.ADMIN_EMAIL_FIELD_CLASS };')).toContain(
      'admin-email-context:apps/jobs/src/scheduler/staff-email-config.ts',
    );
    expect(plant('apps/jobs/src/scheduler/staff-email-config.ts', 'const c = { pariwarId: NS, fieldClass: `admin_email` };')).toContain(
      'admin-email-context:apps/jobs/src/scheduler/staff-email-config.ts',
    );
    // A COMMENTED plant is ⛔ caught (the doc-blocks name what they forbid).
    expect(plant('apps/jobs/src/scheduler/staff-email-config.ts', '// SELECT user_id FROM admin_credentials; decryptAdminEmail(x)')).toEqual([]);
  });
});
