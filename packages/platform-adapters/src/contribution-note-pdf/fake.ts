// Deterministic fake `ContributionNotePdfRenderer` — Story 8.7 (Task 2).
//
// The test/local-dev double, mirroring `createInMemoryClaimDocumentStorage`: every API, resolver and
// template test runs WITHOUT a browser. It produces a minimal but structurally valid PDF byte string
// (a real `%PDF-` header + `%%EOF` trailer) so content-type / non-empty-body assertions are meaningful,
// and it RECORDS the HTML it was handed — which is what makes the load-bearing AC3 assertions possible
// DB-free and browser-free: "a yellow Note contains no UTR, no *सत्यापित* stamp, and none of the
// confirmation-implying strings" is an assertion about the rendered HTML, not about PDF internals.
//
// It deliberately does NOT shape text or embed fonts — those are the ONE thing only a real engine can
// prove, and they are asserted by the single real-engine suite (`chromium.render.test.ts`). Do not
// widen this fake into a pseudo-renderer; a fake that "looks like it works" is exactly how the tofu
// failure (D5) reaches production.

import type {
  ContributionNotePdfRenderOptions,
  ContributionNotePdfRenderer,
} from '@twt/contracts';

/** One recorded render — the HTML the resolver/template produced plus the options it was rendered with. */
export interface RecordedContributionNoteRender {
  readonly html: string;
  readonly opts: ContributionNotePdfRenderOptions;
}

export interface FakeContributionNotePdfRenderer extends ContributionNotePdfRenderer {
  /** Every render this fake has served, in order — the assertion surface for template tests. */
  readonly renders: RecordedContributionNoteRender[];
  /** Make the next (and every subsequent) render throw, to exercise the route's render-failure path. */
  failWith(error: Error): void;
}

/** A minimal, structurally valid one-page PDF — enough for a real `%PDF-` sniff and a non-empty body. */
function fakePdfBytes(title: string): Uint8Array {
  const body =
    `%PDF-1.7\n` +
    `% fake renderer — Story 8.7 test double, NOT a rendered document\n` +
    `% title: ${title.replace(/[\r\n]/g, ' ')}\n` +
    `1 0 obj<</Type/Catalog>>endobj\n` +
    `trailer<</Root 1 0 R>>\n` +
    `%%EOF\n`;
  return new TextEncoder().encode(body);
}

/**
 * Construct the deterministic fake renderer. The same HTML always yields the same bytes (the AC7
 * regenerability property is testable without a browser), and `renders` exposes the HTML for the
 * status/UTR/stamp assertions.
 */
export function createFakeContributionNotePdfRenderer(): FakeContributionNotePdfRenderer {
  const renders: RecordedContributionNoteRender[] = [];
  let failure: Error | null = null;

  return {
    renders,
    failWith(error: Error): void {
      failure = error;
    },
    async render(html: string, opts: ContributionNotePdfRenderOptions): Promise<Uint8Array> {
      if (failure) throw failure;
      renders.push({ html, opts });
      return fakePdfBytes(opts.title);
    },
  };
}
