// Data-export ZIP → OS handoff (Story 3.11, Task 7).
//
// The download returns the raw ZIP bytes (ArrayBuffer). We write them to a file in the app cache
// directory (NOT MMKV / a draft — the 3.9 PII-in-draft lesson: the plaintext export must not linger in
// key-value storage) and hand it to the OS share sheet so the member can save / send it wherever they
// want. The cache file is transient (the OS reclaims it); the durable copy is wherever the member sends
// it. Uses the expo-file-system `File`/`Paths` API + expo-sharing.

import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/**
 * Write the downloaded ZIP bytes to a cache file and open the OS share sheet. `id` names the file
 * (`twt-data-export-<id>.zip`). Resolves once the share sheet has been presented (or immediately if
 * sharing is unavailable on the platform — the file still exists in the cache).
 */
export async function saveAndShareExport(id: string, bytes: ArrayBuffer): Promise<void> {
  const file = new File(Paths.cache, `twt-data-export-${id}.zip`)
  // Overwrite any prior copy for the same id (a re-download after a fresh export).
  file.create({ overwrite: true })
  file.write(new Uint8Array(bytes))

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
    })
  }
}
