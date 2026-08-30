// The SHARED Tier-1 decrypt bound and its fan-out helper. Story 11b.2a (Task 4; AC3 / D4(a)).
//
// ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────────────────────────────
// Both halves lived module-private in `public-pages/handlers.ts` until Story 11b.2a needed the same
// bound on the confirmed-contributor render. Sharing ONLY the constant while re-implementing the
// helper is the drift class AC3 exists to forbid — and it is not hypothetical: Story 11b.9's review
// filed exactly that mechanism as insufficient eight days earlier ("two independently hand-written
// SQL predicates … reconciled only by a 'change one, check the other' comment … real maintainability
// / drift risk"). The helper is also the half carrying the load-bearing behaviour, so a second
// hand-written copy is the more dangerous half to duplicate, not the safer one.
//
// A second consumer now exists, so this is SHARED TOOLING inside apps/api — ⛔ not a new package
// ([[project_no_premature_package]]).

/**
 * Max KMS `decryptDek` round-trips in flight for ONE render that decrypts a set of Tier-1 names.
 *
 * ⚠ A REAL bound, ⛔ not a page size wearing the word "bounded". At 8, a full 50-row page costs
 * ceil(50/8) = 7 sequential waves instead of 50 round-trips, while capping what a single request can
 * put in flight against a quota-limited external service.
 * ⛔ Raising this trades KMS quota safety for latency — it is a capacity decision, not a tuning knob.
 *
 * ⛔⛔ This is NOT a chunk size and must never be collapsed into one. `MEMBER_STATE_REPLAY_CHUNK_SIZE`
 * (@twt/domain) bounds how many ids fit in one SQL statement — a Postgres planning decision. This
 * bounds how many external-service round-trips may be in flight. Different questions, different
 * numbers; one shared value would couple them and they would drift.
 */
export const DIRECTORY_DECRYPT_CONCURRENCY = 8;

/**
 * Map `items` through `fn` with at most `concurrency` promises in flight, preserving INPUT ORDER.
 *
 * ⭐ Results are written into a pre-sized array at the item's own index, ⛔ never pushed in
 * completion order — the deterministic roster order is what makes "page N is the same page N on
 * every request" true, and a completion-ordered result would silently shuffle a public page. That
 * property is the reason this helper is shared rather than re-typed at each call site.
 *
 * ⚠ Rejections propagate (`Promise.all`). Callers that must degrade per item — the confirmed
 * contributor render fail-softs one row rather than the whole response — catch INSIDE `fn`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}
