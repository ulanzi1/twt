// packages/i18n/src/classification.ts
//
// Surface-classification registry (Story 2.1, AC4). A surface is either member-facing
// (Hindi-primary, must carry full Hindi parity) or admin-facing (may ship English-only).
// Classification is DECLARATIVE — keyed by namespace (domain), NOT by a hardcoded
// app-path allow-list (there is no `apps/member` directory; the member app is
// `apps/mobile`, with `apps/public` to follow). The persisted source of truth is
// `locales/classification.json`, read by BOTH this runtime registry and the build-time
// parity gate so the two never drift.
//
// DEFAULT = member-facing (architectural-freeze row 10: member-visible surfaces are
// Hindi-primary). A namespace is parity-enforced UNLESS explicitly declared admin-facing.
// App→class mapping today: apps/admin = admin-facing; apps/mobile (+ future apps/public
// member pages) = member-facing.

import rawClassification from '../locales/classification.json';

/** The two surface classes. */
export type SurfaceClass = 'member-facing' | 'admin-facing';

/** Parsed `locales/classification.json`: the default class + per-namespace overrides. */
export interface ClassificationConfig {
  default: SurfaceClass;
  namespaces: Record<string, SurfaceClass>;
}

/** Platform default — Hindi-primary member-facing (freeze row 10). */
export const DEFAULT_SURFACE_CLASS: SurfaceClass = 'member-facing';

function isSurfaceClass(value: unknown): value is SurfaceClass {
  return value === 'member-facing' || value === 'admin-facing';
}

/**
 * Validate raw classification config, loud-throwing on malformed input (the strict
 * posture of the 1.17 config parsers). `$comment` and any other extra keys are ignored.
 */
export function parseClassificationConfig(raw: unknown): ClassificationConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('[i18n] classification config must be an object');
  }
  const obj = raw as Record<string, unknown>;

  if (!isSurfaceClass(obj.default)) {
    throw new Error(
      `[i18n] classification 'default' must be 'member-facing' or 'admin-facing', got ${JSON.stringify(obj.default)}`,
    );
  }

  const namespacesRaw = obj.namespaces ?? {};
  if (typeof namespacesRaw !== 'object' || namespacesRaw === null) {
    throw new Error("[i18n] classification 'namespaces' must be an object");
  }
  const namespaces: Record<string, SurfaceClass> = {};
  for (const [ns, cls] of Object.entries(namespacesRaw as Record<string, unknown>)) {
    if (!isSurfaceClass(cls)) {
      throw new Error(
        `[i18n] classification namespace '${ns}' must be 'member-facing' or 'admin-facing', got ${JSON.stringify(cls)}`,
      );
    }
    namespaces[ns] = cls;
  }

  return { default: obj.default, namespaces };
}

/**
 * Resolve a namespace's surface class against a config (pure). Used by both the
 * runtime registry and the build-time parity gate so they agree by construction.
 */
export function resolveClassification(config: ClassificationConfig, namespace: string): SurfaceClass {
  return config.namespaces[namespace] ?? config.default;
}

// ── Runtime registry (consumers declare classification on import) ──────────────────

const config = parseClassificationConfig(rawClassification);
const registry = new Map<string, SurfaceClass>(Object.entries(config.namespaces));

/**
 * Declare a namespace's classification at import time (AC4). Idempotent for an
 * identical re-declaration; throws on a conflicting one (a namespace cannot be both
 * member- and admin-facing).
 */
export function declareSurface(namespace: string, classification: SurfaceClass): void {
  const existing = registry.get(namespace);
  if (existing !== undefined && existing !== classification) {
    throw new Error(
      `[i18n] namespace '${namespace}' is already '${existing}'; refusing reclassification to '${classification}'`,
    );
  }
  registry.set(namespace, classification);
}

/** Resolve a namespace's class via the runtime registry, falling back to the default. */
export function classifyNamespace(namespace: string): SurfaceClass {
  return registry.get(namespace) ?? config.default;
}

/** The explicitly-declared class for a namespace, or `undefined` if it uses the default. */
export function getSurfaceClass(namespace: string): SurfaceClass | undefined {
  return registry.get(namespace);
}

/** A snapshot copy of all explicit declarations (the default is not materialised). */
export function registeredSurfaces(): ReadonlyMap<string, SurfaceClass> {
  return new Map(registry);
}
