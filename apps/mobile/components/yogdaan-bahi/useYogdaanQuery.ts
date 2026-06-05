import { useQuery } from '@tanstack/react-query'
import {
  SAMPLE_YOGDAAN_ROWS,
  SAMPLE_YOGDAAN_TOTAL_INR,
  type YogdaanRow,
} from './sample-data'

// P4 offline-cache measurement support: the query simulates a remote fetch
// (300ms delay) and returns the data + a `fetchedAt` timestamp. Cached via
// MMKV-backed PersistQueryClientProvider per `lib/query-client.ts`.
//
// Cache validation flow at P0-5 Task 10:
//   1. Open app online → query fires; fetchedAt = NOW; data renders
//   2. Toggle airplane mode + cold-restart app
//   3. Open app offline → cached query returns; fetchedAt = previous timestamp
//      → cached data renders without network
//   4. Toggle online + pull-to-refresh → query refires; new fetchedAt
//
// Per architecture §4.5 MMKV-as-substrate + TanStack Query persistQueryClient.

export type YogdaanQueryResult = {
  rows: YogdaanRow[]
  totalInr: number
  fetchedAt: number  // unix ms
}

async function fetchYogdaanRows(): Promise<YogdaanQueryResult> {
  // Simulated async fetch — 300ms latency models the "ledger summary" endpoint
  // that production will hit per architecture §3.7 + PRD FR-XX (member contribution
  // history). Returns the sample data + a fresh timestamp.
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    rows: SAMPLE_YOGDAAN_ROWS,
    totalInr: SAMPLE_YOGDAAN_TOTAL_INR,
    fetchedAt: Date.now(),
  }
}

export function useYogdaanQuery() {
  return useQuery({
    queryKey: ['yogdaan-bahi', 'summary'],
    queryFn: fetchYogdaanRows,
  })
}
