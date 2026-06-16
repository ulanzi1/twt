// @twt/eslint-config-twt — rule coverage.
//
// Lints code snippets through the ACTUAL shared flat config (index.js) via the
// ESLint Node API, asserting the D1-1.6 `pg`-import rule (Story 1.16a) fires
// and is carved out correctly, and that the pre-existing cross-workspace
// relative-import ban still fires (regression guard).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import config from './index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function lint(code, relFilePath, cwd = repoRoot) {
  const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: config });
  const [result] = await eslint.lintText(code, { filePath: path.join(cwd, relFilePath) });
  return result.messages;
}

const ruleIds = (messages, ruleId) => messages.filter((m) => m.ruleId === ruleId);
const PG_RULE = '@typescript-eslint/no-restricted-imports';
const BASE_RULE = 'no-restricted-imports';

describe('D1-1.6 — pg-import containment rule', () => {
  it('fires on a value `import pg from "pg"` in the application layer', async () => {
    const messages = await lint(
      "import pg from 'pg';\nexport const p = new pg.Pool();\n",
      'apps/api/src/rogue-pool.ts',
    );
    expect(ruleIds(messages, PG_RULE)).toHaveLength(1);
  });

  it('allows `import type pg from "pg"` everywhere (typing an injected pool)', async () => {
    const messages = await lint(
      "import type pg from 'pg';\nexport function f(_p: pg.Pool): void {}\n",
      'apps/api/src/uses-pool-type.ts',
    );
    expect(ruleIds(messages, PG_RULE)).toHaveLength(0);
  });

  it('carves out the data layer (packages/domain) where the real pool is built', async () => {
    const messages = await lint(
      "import pg from 'pg';\nexport const pool = new pg.Pool();\n",
      'packages/domain/src/db.ts',
    );
    expect(ruleIds(messages, PG_RULE)).toHaveLength(0);
  });

  it('carves out test code that constructs real pools by necessity', async () => {
    const spec = await lint(
      "import pg from 'pg';\nconst pool = new pg.Pool();\n",
      'packages/events/tests/append-event.test.ts',
    );
    expect(ruleIds(spec, PG_RULE)).toHaveLength(0);

    const jobsTest = await lint(
      "import pg from 'pg';\nconst pool = new pg.Pool();\n",
      'apps/jobs/tests/audit/mirror.test.ts',
    );
    expect(ruleIds(jobsTest, PG_RULE)).toHaveLength(0);
  });

  it('carves out db.ts when linted from the package cwd (real `eslint .` scenario)', async () => {
    // Each workspace runs `eslint .` from its own dir, so `files` globs match
    // package-relative — this is the regression guard for the cwd gotcha.
    const domainCwd = path.join(repoRoot, 'packages/domain');
    const dbModule = await lint(
      "import pg from 'pg';\nexport const pool = new pg.Pool();\n",
      'src/db.ts',
      domainCwd,
    );
    expect(ruleIds(dbModule, PG_RULE)).toHaveLength(0);

    const testUtil = await lint(
      "import pg from 'pg';\nexport const pool = new pg.Pool();\n",
      'src/test-utils/integration-setup.ts',
      domainCwd,
    );
    expect(ruleIds(testUtil, PG_RULE)).toHaveLength(0);
  });

  it('still fires from a package cwd on a non-carved-out source file', async () => {
    const apiCwd = path.join(repoRoot, 'apps/api');
    const messages = await lint(
      "import pg from 'pg';\nexport const p = new pg.Pool();\n",
      'src/modules/rogue.ts',
      apiCwd,
    );
    expect(ruleIds(messages, PG_RULE)).toHaveLength(1);
  });

  it('does not ban the unrelated `pg-boss` module', async () => {
    const messages = await lint(
      "import { PgBoss } from 'pg-boss';\nexport const b = PgBoss;\n",
      'packages/queue/src/index.ts',
    );
    expect(ruleIds(messages, PG_RULE)).toHaveLength(0);
  });
});

describe('cross-workspace relative-import ban (regression guard)', () => {
  it('still fires on a relative cross-workspace import', async () => {
    const messages = await lint(
      "import { x } from '../../packages/events/src/index.js';\nexport const y = x;\n",
      'apps/api/src/cross.ts',
    );
    expect(ruleIds(messages, BASE_RULE)).toHaveLength(1);
  });
});
