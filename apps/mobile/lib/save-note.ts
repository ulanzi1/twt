// Contribution Note PDF → OS handoff (Story 8.7, Task 5).
//
// The Note is generated server-side on demand and stored NOWHERE (D2): there is no object storage and
// no signed URL, so the bytes arrive over the authenticated API call and we write them to the app
// CACHE directory before handing them to the OS share sheet. The cache copy is transient (the OS
// reclaims it) and the durable copy is wherever the member chooses to send it — the same posture as the
// data-export ZIP (`save-export.ts`), and for the same reason: member-facing documents belong to the
// member's own storage, not to ours.
//
// Deliberately NOT a PDF-viewer library and NOT a browser tab: `expo-file-system` + `expo-sharing` are
// already dependencies, and the OS share sheet opens the member's own PDF reader, saves to Files, or
// forwards on WhatsApp — which is exactly the artifact's purpose (and precisely why the honesty had to
// be printed ON the document rather than carried by the screen it was fetched from).

import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/**
 * Write the downloaded Note bytes to a cache file and open the OS share sheet. `contributionId` names
 * the file. The filename mirrors the server's `Content-Disposition` and, like it, carries no term the
 * vocabulary register prohibits (AC1). Resolves once the share sheet has been presented — or
 * immediately when sharing is unavailable on the platform, in which case the file still exists in the
 * cache.
 *
 * Returns whether the share sheet was actually presented, so the caller can give the member a DISTINCT
 * signal on a build/platform without one (the file exists only in the app's private cache directory —
 * that is not the same outcome as "shared", and treating the two identically leaves the member with no
 * indication of where their Note actually is).
 */
export async function saveAndShareContributionNote(
  contributionId: string,
  bytes: ArrayBuffer,
): Promise<{ readonly shared: boolean }> {
  const safeId = contributionId.replace(/[^A-Za-z0-9_-]/g, '')
  const file = new File(Paths.cache, `yogdaan-pratigya-${safeId}.pdf`)
  // Overwrite any prior copy for the same contribution — the Note is regenerated on every open, and the
  // fresh render is always the truthful one (a cached older copy could contradict a later verdict).
  file.create({ overwrite: true })
  file.write(new Uint8Array(bytes))

  const shareable = await Sharing.isAvailableAsync()
  if (shareable) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    })
  }
  return { shared: shareable }
}
