// Per-Pariwar Firebase App cache — Story 5.2 (AC1, AC2; Task 1).
//
// A single `firebase-admin` SDK sends to BOTH Android (FCM HTTP v1) and iOS (APNs configured INSIDE the
// per-Pariwar Firebase project) — BigDev CONFIRMED 2026-07-05; see ADR-0027. Each Pariwar has its own FCM
// project (AR-17), so each needs its own initialized `App`. `initializeApp` is EXPENSIVE and MUST run at
// most once per Pariwar per process — this cache lazily initializes an `App` from the resolved
// service-account JSON and returns a thin `messaging()` send handle, keyed by `pariwar_id`. NEVER
// re-`initializeApp` per send.
//
// ── The `PushMessagingHandle` seam ────────────────────────────────────────────────────────────────────
// The fcm/apns providers depend on this narrow interface (just `send`), not on `firebase-admin` directly,
// so their unit tests inject a fake handle with NO SDK and NO network (Task 7). Production wires the real
// handle from this cache.
//
// ── Auth-lifecycle refresh (the deferred 5.1 `_stub.ts` seam, now real) ───────────────────────────────
// firebase-admin refreshes the service-account OAuth2 access token INTERNALLY on each send (it manages
// the JWT→access-token exchange + expiry). So the "provider auth-lifecycle refresh" property the 5.1 stub
// only marked a seam for is satisfied by the SDK itself — there is no manual token-refresh hook to build.
//
// ── KNOWN v1 gap: no cache eviction on credential rotation (operational runbook note) ─────────────────
// `resolveSecretValue` re-fetches Secret Manager FRESH every call, but this in-process `App` cache has NO
// TTL / eviction. If a Pariwar's FCM service-account JSON is ROTATED, the cached `App` keeps sending with
// the OLD credential until the process restarts. This is RESTART-REQUIRED-ON-ROTATION — documented, not
// silently unhandled. We deliberately do NOT build TTL/eviction here (unlike Story 4.8's
// member_validity_cache, which sidesteps staleness with a `cohort_epoch` key rather than a TTL — that
// pattern is not needed for a rarely-rotated service-account credential; the restart is the eviction).

import { cert, deleteApp, getApp, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';

/**
 * The narrow send seam the push providers depend on — one method, the ONLY firebase-admin surface they
 * touch. `send` resolves to the provider message id on acceptance and REJECTS (throws) on a Firebase
 * error; the providers catch + classify (push-errors.ts). Injectable as a fake in unit tests.
 */
export interface PushMessagingHandle {
  send(message: Message): Promise<string>;
}

/** The per-Pariwar Firebase App cache — lazily initializes + caches one `App` per `pariwar_id`. */
export interface FirebaseAppCache {
  /**
   * Return the messaging handle for a Pariwar, initializing + caching its `App` on first use. The
   * `serviceAccountJson` is the resolved Secret-Manager VALUE (the composition layer resolves the NAME →
   * value via `resolveSecretValue`); it is used ONLY on the first (cache-miss) call for a Pariwar — a
   * later rotation is not picked up until restart (see header).
   */
  messagingFor(pariwarId: string, serviceAccountJson: string): PushMessagingHandle;
  /** Tear down all cached `App`s (test cleanup + graceful shutdown). */
  close(): Promise<void>;
}

/** The service-account fields `cert()` requires — a malformed secret must fail here, not deep inside the SDK. */
const REQUIRED_SERVICE_ACCOUNT_FIELDS = ['project_id', 'client_email', 'private_key'] as const;

/** Parse the resolved service-account JSON into the `cert()` shape, with a clear error on malformed input. */
function parseServiceAccount(pariwarId: string, serviceAccountJson: string): ServiceAccount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error(`firebase-app: service-account JSON for pariwar '${pariwarId}' is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`firebase-app: service-account for pariwar '${pariwarId}' must be a JSON object`);
  }
  const missing = REQUIRED_SERVICE_ACCOUNT_FIELDS.filter(
    (field) => typeof (parsed as Record<string, unknown>)[field] !== 'string',
  );
  if (missing.length > 0) {
    throw new Error(
      `firebase-app: service-account for pariwar '${pariwarId}' is missing required field(s): ${missing.join(', ')}`,
    );
  }
  return parsed as ServiceAccount;
}

/**
 * Build a fresh Firebase App cache. One per process (the composition layer holds it). Each `App` is
 * initialized under a STABLE, unique name `twt-push-<pariwarId>` so it never collides with the
 * `[DEFAULT]` app or another Pariwar's app.
 */
export function createFirebaseAppCache(): FirebaseAppCache {
  const apps = new Map<string, App>();

  return {
    messagingFor(pariwarId, serviceAccountJson) {
      let app = apps.get(pariwarId);
      if (!app) {
        const appName = `twt-push-${pariwarId}`;
        try {
          const serviceAccount = parseServiceAccount(pariwarId, serviceAccountJson);
          app = initializeApp({ credential: cert(serviceAccount) }, appName);
        } catch (err) {
          // A concurrent first-send for the SAME pariwarId can race this cache-miss branch (no lock — the
          // cache is a plain Map). If firebase-admin already registered `appName` under our feet, reuse it
          // instead of surfacing an "app already exists" error to a request that did nothing wrong. `getApp`
          // itself throws if the name is genuinely unregistered, so a non-race failure still surfaces.
          try {
            app = getApp(appName);
          } catch {
            throw err;
          }
        }
        apps.set(pariwarId, app);
      }
      const messaging = getMessaging(app);
      return { send: (message) => messaging.send(message) };
    },
    async close() {
      const entries = [...apps.entries()];
      apps.clear();
      const results = await Promise.allSettled(entries.map(([, app]) => deleteApp(app)));
      const failed = results
        .map((r, i) => ({ r, pariwarId: entries[i]![0] }))
        .filter(({ r }) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new AggregateError(
          failed.map(({ r }) => (r as PromiseRejectedResult).reason),
          `firebase-app: close() failed to tear down ${failed.length} app(s) for pariwar(s): ${failed.map((f) => f.pariwarId).join(', ')}`,
        );
      }
    },
  };
}
