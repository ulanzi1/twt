// Deploy seam — Story 1.15 (AC-3 + AC-5).
//
// `deps.deployTrigger` is the §5.6 observability-seam pattern (same shape as
// `auditSink` / `turnstile`): an env-resolved abstraction with a dev/test FAKE
// (structured-log + in-memory status) as the default and a LIVE Dokploy-API client
// for staging/prod. The split is load-bearing: the dev agent authors + unit-tests
// BOTH, but the live client is only exercised against staging/prod by the operator
// (the Dokploy creds are escrow-sealed, absent from the dev/test environment).
//
// Deploy model = GitHub Actions → Dokploy API: the CI workflow builds + pushes the
// image, then the API POSTs the Dokploy deploy endpoint. This client is the API leg.
//
// Resolution mirrors `resolveIntegritySinkFromEnv` (INTEGRITY_OBSERVABILITY_MODE):
// `DEPLOY_TRIGGER_MODE=fake|live` (default `fake`). `live` reads `DOKPLOY_API_URL`
// + `DOKPLOY_API_TOKEN` (Secret-Manager-injected per env) and fails CLOSED if absent.

import { BadGatewayError } from '../../http-errors.js';
import type { DeployConfig } from './deploy-config.js';

/** Deploy lifecycle state (mirrors the `DeployStatus` transport contract). */
export type DeployStatusValue = 'unknown' | 'triggered' | 'succeeded' | 'failed';

/** A deploy-status snapshot returned by the seam. `triggeredAt` is the seam's clock. */
export interface DeployResult {
  readonly deployId: string;
  readonly status: DeployStatusValue;
  readonly triggeredAt: Date;
  readonly detail?: string | null;
}

/**
 * The injected deploy abstraction. `trigger` fires a build for the path-scoped
 * descriptor (AC-3 reader output); `latest` returns the most-recent known status
 * for a Pariwar (the GET status view, AC-1), or null if none triggered yet.
 */
export interface DeployTrigger {
  trigger(config: DeployConfig): Promise<DeployResult>;
  latest(pariwarId: string): Promise<DeployResult | null>;
}

// ── Dev/test FAKE (default) ───────────────────────────────────────────────────

/**
 * Structured-log + in-memory fake. Records the trigger to a console line and keeps
 * the last result per Pariwar in memory so the status view reflects it within a
 * process lifetime. This is the in-story-proof substrate (AC-7): the integration
 * test drives provision → trigger → status against it without a live Dokploy.
 */
export function createFakeDeployTrigger(clock: () => Date = () => new Date()): DeployTrigger {
  const lastByPariwar = new Map<string, DeployResult>();
  let counter = 0;
  return {
    trigger(config: DeployConfig): Promise<DeployResult> {
      counter += 1;
      const result: DeployResult = {
        deployId: `fake-deploy-${config.pariwarId}-${counter}`,
        status: 'triggered',
        triggeredAt: clock(),
        detail: `fake deploy queued for ${config.pathScope}`,
      };
      lastByPariwar.set(config.pariwarId, result);
      try {
        console.info(
          '[deploy-trigger:fake]',
          JSON.stringify({
            pariwarId: config.pariwarId,
            pathScope: config.pathScope,
            deployId: result.deployId,
            at: result.triggeredAt.toISOString(),
          }),
        );
      } catch {
        // A log line must never break the deploy path.
      }
      return Promise.resolve(result);
    },
    latest(pariwarId: string): Promise<DeployResult | null> {
      return Promise.resolve(lastByPariwar.get(pariwarId) ?? null);
    },
  };
}

// ── Live Dokploy-API client (staging/prod) ────────────────────────────────────

export interface DokployClientConfig {
  /** The Dokploy deploy endpoint URL (DOKPLOY_API_URL). */
  readonly apiUrl: string;
  /** Bearer token (DOKPLOY_API_TOKEN, Secret-Manager-injected). */
  readonly apiToken: string;
  /** Injectable fetch (tests pass a mock; defaults to global `fetch`). */
  readonly fetchImpl?: typeof fetch;
  readonly clock?: () => Date;
}

/** Shape the Dokploy deploy API returns (only the fields we map; tolerant of extras). */
interface DokployDeployResponse {
  deploymentId?: string;
  id?: string;
  status?: string;
  message?: string;
}

/**
 * Live Dokploy-API client. POSTs the path-scoped descriptor to the configured
 * deploy endpoint with `Authorization: Bearer <token>`; maps a non-2xx response or
 * a transport failure to a 502 `BadGatewayError` (never a raw throw into the
 * request path). Keeps the last result per Pariwar in memory for the status view.
 */
export function createLiveDokployDeployTrigger(cfg: DokployClientConfig): DeployTrigger {
  const doFetch = cfg.fetchImpl ?? fetch;
  const clock = cfg.clock ?? ((): Date => new Date());
  const lastByPariwar = new Map<string, DeployResult>();

  return {
    async trigger(config: DeployConfig): Promise<DeployResult> {
      let res: Response;
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 10_000);
      try {
        res = await doFetch(cfg.apiUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${cfg.apiToken}`,
          },
          body: JSON.stringify({
            pariwarId: config.pariwarId,
            pathScope: config.pathScope,
            branding: config.branding,
          }),
          signal: ctrl.signal,
        });
      } catch {
        throw new BadGatewayError(
          'Dokploy deploy API is unreachable',
          'provisioning.deploy_unreachable',
          { pariwarId: config.pariwarId },
        );
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        throw new BadGatewayError(
          `Dokploy deploy API returned ${res.status}`,
          'provisioning.deploy_failed',
          { pariwarId: config.pariwarId, status: res.status },
        );
      }

      let body: DokployDeployResponse = {};
      try {
        const parsed: unknown = await res.json();
        if (typeof parsed === 'object' && parsed !== null) {
          body = parsed as DokployDeployResponse;
        }
      } catch {
        // A 2xx with a non-JSON body still counts as triggered; use a fallback id.
      }

      const result: DeployResult = {
        deployId: body.deploymentId ?? body.id ?? `dokploy-${config.pariwarId}`,
        status: 'triggered',
        triggeredAt: clock(),
        detail: body.message ?? null,
      };
      lastByPariwar.set(config.pariwarId, result);
      return result;
    },
    latest(pariwarId: string): Promise<DeployResult | null> {
      return Promise.resolve(lastByPariwar.get(pariwarId) ?? null);
    },
  };
}

// ── Env resolution (mirrors resolveIntegritySinkFromEnv / DEPLOY_TRIGGER_MODE) ──

/**
 * Resolve the deploy trigger from the configured mode. `fake` (default) → the
 * in-memory fake; `live` → the Dokploy-API client built from `DOKPLOY_API_URL` +
 * `DOKPLOY_API_TOKEN` (fails CLOSED if either is absent, mirroring the integrity
 * resolver's live-fails-closed posture). The mode is validated at boot in config.ts.
 */
export function resolveDeployTriggerFromEnv(
  mode: 'fake' | 'live',
  clock: () => Date = () => new Date(),
): DeployTrigger {
  if (mode === 'fake') return createFakeDeployTrigger(clock);
  const apiUrl = process.env['DOKPLOY_API_URL'];
  const apiToken = process.env['DOKPLOY_API_TOKEN'];
  if (!apiUrl || apiUrl.trim() === '' || !apiToken || apiToken.trim() === '') {
    throw new Error(
      '[deploy-trigger] DEPLOY_TRIGGER_MODE=live requires DOKPLOY_API_URL + DOKPLOY_API_TOKEN',
    );
  }
  return createLiveDokployDeployTrigger({ apiUrl, apiToken, clock });
}
