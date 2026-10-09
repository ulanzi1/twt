// The STAFF EMAIL's CONFIG — resolved ONCE at boot, FAIL-CLOSED (Story 6.25, Task 4.2; AC6; `2026-10-09-299` RE7). The SMS env
// pattern (`contribution-providers.ts` — a secret NAME + an `_ENV_FALLBACK`), with ONE recorded divergence:
//   ⭐ RE7 A — a SET but UNRESOLVABLE secret name HOLDS (the client reports a `config:secret_unresolvable` gap + ONE boot alarm;
//   boot proceeds) — ⛔ the SMS rule's boot failure: `apps/jobs` is ONE process that also runs the money jobs, and this channel
//   is go-live gated (roster Row 24) and non-critical.
//
// Variables (final — `-299` RE7):
//   STAFF_EMAIL_PROVIDER                              `ses` | `zeptomail` — unset ⇒ `config:provider_unset`; any other value ⇒
//                                                     `config:provider_unknown` (⚠ recorded: a typo raises ⛔ boot alarm — the
//                                                     sweep's per-run hold alarm names it)
//   STAFF_EMAIL_FROM                                  the sender address (ASCII)
//   ADMIN_APP_ORIGIN                                  the list link's base — an `https://` origin, ⛔ path (checked per sweep run)
//   STAFF_EMAIL_SES_ACCESS_KEY_ID_SECRET_NAME         (+ `STAFF_EMAIL_SES_ACCESS_KEY_ID_ENV_FALLBACK`, default
//                                                     `STAFF_EMAIL_SES_ACCESS_KEY_ID`)
//   STAFF_EMAIL_SES_SECRET_ACCESS_KEY_SECRET_NAME     (+ `STAFF_EMAIL_SES_SECRET_ACCESS_KEY_ENV_FALLBACK`, default
//                                                     `STAFF_EMAIL_SES_SECRET_ACCESS_KEY`)
//   STAFF_EMAIL_SES_REGION                            default `ap-south-1`
//   STAFF_EMAIL_SES_CONFIGURATION_SET                 optional (Row 24 (b) verifies ⛔ OPEN/CLICK destination on it)
//   STAFF_EMAIL_ZEPTOMAIL_TOKEN_SECRET_NAME           (+ `STAFF_EMAIL_ZEPTOMAIL_TOKEN_ENV_FALLBACK`, default
//                                                     `STAFF_EMAIL_ZEPTOMAIL_TOKEN`)
//   STAFF_EMAIL_ZEPTOMAIL_HOST                        default `https://cpaas.zoho.in` (the India data centre)
// ⛔ A secret VALUE or an address is ever logged — alarms carry the fixed `config:*` word only.

import { resolveSecretValue } from '@twt/domain';

import {
  createSesStaffEmailClient,
  createUnconfiguredStaffEmailClient,
  createZeptoMailStaffEmailClient,
  isSendableEmailAddress,
  type StaffEmailClient,
} from './staff-email-client.js';

export const DEFAULT_SES_REGION = 'ap-south-1';
export const DEFAULT_ZEPTOMAIL_HOST = 'https://cpaas.zoho.in';

type Env = Readonly<Record<string, string | undefined>>;
type ResolveSecret = (secretName: string, opts: { envFallback?: string }) => Promise<string>;

export interface StaffEmailWiring {
  readonly client: StaffEmailClient;
  /** ONE boot alarm (a fixed word), or `null`. */
  readonly bootAlarm: string | null;
}

const blank = (v: string | undefined): boolean => v === undefined || v.trim() === '';

/**
 * Resolve ONE secret by its NAME: unset name ⇒ `''` (unconfigured); a set name that cannot resolve ⇒ `null` (RE7 A — hold). ⭐ ANY
 * resolution fault holds (RB12's "any Secret Manager fault holds") — ⛔ a boot failure.
 */
async function secret(env: Env, resolve: ResolveSecret, nameVar: string, defaultFallback: string): Promise<string | null> {
  const name = env[nameVar];
  if (blank(name)) return '';
  try {
    // The SMS form: `<BASE>_SECRET_NAME` + `<BASE>_ENV_FALLBACK` (the env var holding the local-dev value).
    return await resolve(name!.trim(), { envFallback: env[`${nameVar.replace(/_SECRET_NAME$/, '')}_ENV_FALLBACK`] ?? defaultFallback });
  } catch {
    return null;
  }
}

/** ⭐ Build THE staff email client from the environment (boot). ⛔ Never throws. */
export async function buildStaffEmailClient(env: Env = process.env, resolve: ResolveSecret = resolveSecretValue): Promise<StaffEmailWiring> {
  const provider = env['STAFF_EMAIL_PROVIDER']?.trim() ?? '';
  if (provider === '') return { client: createUnconfiguredStaffEmailClient('config:provider_unset'), bootAlarm: null };
  const from = env['STAFF_EMAIL_FROM']?.trim() ?? '';
  const fromGap = from === '' ? 'config:sender_missing' : isSendableEmailAddress(from) ? null : 'config:sender_invalid';

  if (provider === 'ses') {
    const accessKeyId = await secret(env, resolve, 'STAFF_EMAIL_SES_ACCESS_KEY_ID_SECRET_NAME', 'STAFF_EMAIL_SES_ACCESS_KEY_ID');
    const secretAccessKey = await secret(env, resolve, 'STAFF_EMAIL_SES_SECRET_ACCESS_KEY_SECRET_NAME', 'STAFF_EMAIL_SES_SECRET_ACCESS_KEY');
    const unresolvable = accessKeyId === null || secretAccessKey === null;
    const client = createSesStaffEmailClient({
      region: env['STAFF_EMAIL_SES_REGION']?.trim() || DEFAULT_SES_REGION,
      accessKeyId: accessKeyId ?? '',
      secretAccessKey: secretAccessKey ?? '',
      from,
      configurationSet: env['STAFF_EMAIL_SES_CONFIGURATION_SET']?.trim() || null,
      gap: unresolvable ? 'config:secret_unresolvable' : fromGap,
    });
    return { client, bootAlarm: unresolvable ? 'config:secret_unresolvable' : null };
  }
  if (provider === 'zeptomail') {
    const token = await secret(env, resolve, 'STAFF_EMAIL_ZEPTOMAIL_TOKEN_SECRET_NAME', 'STAFF_EMAIL_ZEPTOMAIL_TOKEN');
    const client = createZeptoMailStaffEmailClient({
      host: env['STAFF_EMAIL_ZEPTOMAIL_HOST']?.trim() || DEFAULT_ZEPTOMAIL_HOST,
      token: token ?? '',
      from,
      gap: token === null ? 'config:secret_unresolvable' : fromGap,
    });
    return { client, bootAlarm: token === null ? 'config:secret_unresolvable' : null };
  }
  return { client: createUnconfiguredStaffEmailClient('config:provider_unknown'), bootAlarm: null };
}

/**
 * ⭐ RE7 — the list link's base: an `https://` ORIGIN (⛔ path, ⛔ query, ⛔ fragment, ⛔ credentials) — else `null` (treated as
 * unset, alarmed) — ⛔ never a link to an attacker-shaped URL. Returned WITHOUT a trailing slash.
 */
export function resolveAdminAppOrigin(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null || raw.trim() === '') return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return null;
  if ((url.pathname !== '/' && url.pathname !== '') || url.search !== '' || url.hash !== '') return null;
  // `new URL` normalises a bare origin to `…/`; the RAW must be that origin (⛔ a `/` path segment smuggled through).
  if (raw.trim().replace(/\/$/, '') !== url.origin) return null;
  return url.origin;
}
