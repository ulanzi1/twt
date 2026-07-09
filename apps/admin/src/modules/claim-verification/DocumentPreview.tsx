// `<DocumentPreview>` — inline claim-document viewer (Story 6.5, Task 6; AC5, UX-DR42). Pure
// presentational. Renders the uploaded document (image or PDF) from a SHORT-LIVED SIGNED URL
// (minted server-side from `storage_object_key` — Decision D1; never a long-lived/public link),
// with simple zoom controls + the "request a better document" / "mark illegible" affordances the
// verifier acts on (Story 6.10/6.11 wire the handlers; 6.5 ships the component + callbacks).

import type { ReactElement } from 'react';
import { useState } from 'react';

export interface DocumentPreviewProps {
  /** The short-lived signed READ URL (server-minted). Empty string → an unavailable placeholder. */
  signedUrl: string;
  contentType: string;
  filename?: string;
  onRequestBetter?: () => void;
  onMarkIllegible?: () => void;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

export function DocumentPreview({
  signedUrl,
  contentType,
  filename,
  onRequestBetter,
  onMarkIllegible,
}: DocumentPreviewProps): ReactElement {
  const [zoom, setZoom] = useState(1);
  const isImage = contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf';

  return (
    <section
      aria-label="Document preview"
      data-testid="document-preview"
      className="flex flex-col gap-2 rounded border p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{filename ?? 'Uploaded document'}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded border px-2 py-0.5 text-sm"
            aria-label="Zoom out"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          >
            −
          </button>
          <span className="w-12 text-center text-xs opacity-70">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rounded border px-2 py-0.5 text-sm"
            aria-label="Zoom in"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          >
            +
          </button>
        </div>
      </header>

      {/* Pan by scrolling the overflow container; zoom by the CSS transform. */}
      <div className="max-h-[28rem] overflow-auto rounded bg-gray-50" data-testid="document-preview-viewport">
        {!signedUrl ? (
          <p className="p-6 text-center text-sm opacity-60">Preview unavailable.</p>
        ) : isImage ? (
          <img
            src={signedUrl}
            alt="Uploaded document"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            className="block"
          />
        ) : isPdf ? (
          <iframe
            src={signedUrl}
            title="Uploaded document"
            className="h-[28rem] w-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          />
        ) : (
          <p className="p-6 text-center text-sm opacity-60">
            Cannot preview this file type — <a href={signedUrl} className="underline">download</a> to view.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {onRequestBetter ? (
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            data-testid="document-request-better"
            onClick={onRequestBetter}
          >
            Request a better document
          </button>
        ) : null}
        {onMarkIllegible ? (
          <button
            type="button"
            className="rounded border border-status-warn-fg px-3 py-1 text-sm text-status-warn-fg"
            data-testid="document-mark-illegible"
            onClick={onMarkIllegible}
          >
            Mark illegible
          </button>
        ) : null}
      </div>
    </section>
  );
}
