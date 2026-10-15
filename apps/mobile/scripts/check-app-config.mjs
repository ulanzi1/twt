// apps/mobile/scripts/check-app-config.mjs — the `expo-config` CI job (Story 6.30 AC3; `-312` AL1 / AL7).
//
// Runs the REAL Expo config loader (`expo config --type public --json`) — ⛔ never only a vitest import:
// Expo loads `app.config.ts` with plain Node resolution, so a `.ts` import from `@twt/contracts` that
// vitest (Vite) would resolve happily fails here. For each variant:
//   • APP_VARIANT unset / development / preview ⇒ exits 0 and EQUALS the committed prototype fixture
//     (`tests/fixtures/app-config-prototype.json`, captured from `app.json` before it was removed), with
//     `extra.eas.projectId` and any `applinks:…?mode=developer` entry excluded (`-316` E1, AL7);
//   • production WITHOUT `APP_IDENTITY_*` ⇒ exits NON-ZERO (⛔ never a silent prototype production build);
//   • production with fixture identity, ⛔ no `APP_LINKS_HOST` ⇒ ⛔ no link settings;
//   • production with fixture identity + `APP_LINKS_HOST` ⇒ ONE `autoVerify` https intent filter with an
//     EXACT `path` per app-link path and `applinks:<host>`;
//   • `extra.eas.projectId`, when present, is the SAME literal in every variant.
// The fixture identity below is a TEST value — ⛔ never a production identity (Row 29 (a)).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(MOBILE, 'package.json'));
const APP_LINK_PATHS = require('@twt/contracts/src/app-links/app-link-paths.json');
const FIXTURE = JSON.parse(readFileSync(join(MOBILE, 'tests/fixtures/app-config-prototype.json'), 'utf8'));

const FIXTURE_IDENTITY = {
  APP_IDENTITY_NAME: 'Fixture App',
  APP_IDENTITY_SCHEME: 'fixtureapp',
  APP_IDENTITY_IOS_BUNDLE_ID: 'org.example.fixture',
  APP_IDENTITY_ANDROID_PACKAGE: 'org.example.fixture',
};
const FIXTURE_HOST = 'links.example.org';

/** The inherited env minus every variable the config reads — each case states its own. */
function cleanEnv(extra) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === 'APP_VARIANT' || key.startsWith('APP_IDENTITY_') || key === 'APP_LINKS_HOST' || key === 'EXPO_PUBLIC_TRUST_NAME') delete env[key];
  }
  // Expo CLI loads `apps/mobile/.env*` on top of the process env — a local dotenv file could re-inject the very
  // variables stripped above (code review 2026-10-10). The check states its own env, so dotenv is OFF.
  return { ...env, EXPO_NO_DOTENV: '1', ...extra };
}

const EXPO_CONFIG = ['--no-install', 'expo', 'config', '--type', 'public'];

function expoConfig(extraEnv) {
  const env = cleanEnv(extraEnv);
  const result = spawnSync('npx', [...EXPO_CONFIG, '--json'], { cwd: MOBILE, env, encoding: 'utf8' });
  // A spawn FAILURE (no `npx`, a signal) leaves `status` null and the streams null — ⛔ never let that read as a
  // "correctly refused" non-zero exit (code review 2026-10-10): it is a check failure with its own message.
  if (result.error) {
    return { status: 1, config: null, output: `spawn failed: ${result.error.message}`, spawnFailed: true };
  }
  if (result.status === 0) {
    let config = null;
    try {
      config = JSON.parse(result.stdout);
    } catch {
      config = null;
    }
    return { status: 0, config, output: result.stderr ?? '', spawnFailed: false };
  }
  // ⚠ `expo config --json` SWALLOWS the config's thrown message — exit 1 with BOTH streams empty (verified, Expo
  // SDK 55). The negative checks must NAME the refusal, so a failed `--json` run is re-run WITHOUT `--json`, which
  // prints `Error reading Expo config … [app.config] …` (code review 2026-10-10).
  const plain = spawnSync('npx', EXPO_CONFIG, { cwd: MOBILE, env, encoding: 'utf8' });
  const output = [result.stdout, result.stderr, plain.stdout, plain.stderr].map((part) => part ?? '').join('\n');
  return { status: result.status ?? 1, config: null, output, spawnFailed: false };
}

/** The config minus what AC3 excludes from the fixture comparison. */
function comparable(config) {
  const copy = structuredClone(config);
  if (copy.extra?.eas) {
    delete copy.extra.eas.projectId;
    if (Object.keys(copy.extra.eas).length === 0) delete copy.extra.eas;
  }
  if (copy.ios?.associatedDomains) {
    copy.ios.associatedDomains = copy.ios.associatedDomains.filter((d) => !d.endsWith('?mode=developer'));
    if (copy.ios.associatedDomains.length === 0) delete copy.ios.associatedDomains;
  }
  return copy;
}

const failures = [];
const projectIds = new Map();
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

for (const variant of [undefined, 'development', 'preview']) {
  const label = `APP_VARIANT=${variant ?? '(unset)'}`;
  const run = expoConfig(variant === undefined ? {} : { APP_VARIANT: variant });
  check(`${label} resolves`, run.status === 0 && run.config !== null, run.output.trim().split('\n')[0]);
  if (run.config === null) continue;
  check(`${label} equals the prototype fixture`, isDeepStrictEqual(comparable(run.config), FIXTURE));
  projectIds.set(label, run.config.extra?.eas?.projectId);
}

// The two NEGATIVE checks must see the config's OWN refusal, not any non-zero exit (a syntax error, a missing
// binary or a crash would otherwise log `ok` — code review 2026-10-10).
const bare = expoConfig({ APP_VARIANT: 'production' });
check('APP_VARIANT=production without APP_IDENTITY_* exits non-zero, naming the missing variables',
  !bare.spawnFailed && bare.status !== 0 && /APP_IDENTITY_NAME/.test(bare.output), bare.output.trim().split('\n')[0]);

const unknown = expoConfig({ APP_VARIANT: 'prod' });
check('an unknown APP_VARIANT exits non-zero, naming the value',
  !unknown.spawnFailed && unknown.status !== 0 && /APP_VARIANT="prod"/.test(unknown.output), unknown.output.trim().split('\n')[0]);

const noHost = expoConfig({ APP_VARIANT: 'production', ...FIXTURE_IDENTITY });
check('production with the fixture identity resolves', noHost.status === 0 && noHost.config !== null, noHost.output.trim().split('\n')[0]);
if (noHost.config !== null) {
  check('production takes its identity from APP_IDENTITY_*',
    noHost.config.name === 'Fixture App' && noHost.config.scheme === 'fixtureapp' &&
    noHost.config.ios?.bundleIdentifier === 'org.example.fixture' && noHost.config.android?.package === 'org.example.fixture');
  check('production without APP_LINKS_HOST has no link settings',
    noHost.config.android?.intentFilters === undefined && noHost.config.ios?.associatedDomains === undefined);
  projectIds.set('production', noHost.config.extra?.eas?.projectId);
}

const withHost = expoConfig({ APP_VARIANT: 'production', ...FIXTURE_IDENTITY, APP_LINKS_HOST: FIXTURE_HOST });
check('production with APP_LINKS_HOST resolves', withHost.status === 0 && withHost.config !== null, withHost.output.trim().split('\n')[0]);
if (withHost.config !== null) {
  const filters = withHost.config.android?.intentFilters ?? [];
  const expectedData = Object.values(APP_LINK_PATHS).map((path) => ({ scheme: 'https', host: FIXTURE_HOST, path }));
  check('ONE autoVerify https intent filter with an EXACT path per app-link path',
    filters.length === 1 && filters[0].autoVerify === true && filters[0].action === 'VIEW' &&
    isDeepStrictEqual(filters[0].data, expectedData) &&
    isDeepStrictEqual([...filters[0].category].sort(), ['BROWSABLE', 'DEFAULT']) &&
    !JSON.stringify(filters).includes('pathPrefix'),
    JSON.stringify(filters));
  check('applinks:<host> and nothing else',
    isDeepStrictEqual(withHost.config.ios?.associatedDomains, [`applinks:${FIXTURE_HOST}`]));
}

check('extra.eas.projectId is the same literal in every variant', new Set(projectIds.values()).size <= 1,
  JSON.stringify(Object.fromEntries(projectIds)));

if (failures.length > 0) {
  console.error(`\nexpo-config: ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nexpo-config: all checks passed');
