// The family memorial's photo objects on ERASURE (Story 11b.4, MA15 — `#decision-2026-10-24-398`).
//
// `anonymizeMember` scrubs the memorial's Tier-1 ciphertexts IN the scope tx and RETURNS the photo keys; the two erasure
// callers (`rtbf/handlers.ts`, `member-data-rights/handlers.ts`) delete the objects here, AFTER COMMIT — storage is ⛔
// transactional, so a delete inside the tx would outlive a rollback. Best-effort: a failure is logged (the anonymous
// convention — the ACTION is the signal, ⛔ the member) and never fails the erasure.

import type { FastifyBaseLogger } from 'fastify';

import type { AppDeps } from '../../context.js';

export async function deleteMemorialPhotosAfterErasure(
  deps: Pick<AppDeps, 'memorialPhotoStorage'>,
  log: FastifyBaseLogger,
  keys: readonly string[],
): Promise<void> {
  for (const key of keys) {
    try {
      await deps.memorialPhotoStorage.delete(key);
    } catch (err) {
      log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial: photo delete after erasure failed');
    }
  }
}
