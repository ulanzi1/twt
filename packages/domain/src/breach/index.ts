// Story 14.3 — the personal data breach register (decision `2026-11-20-467`). Barrel: `import { breach } from '@twt/domain'`.
export * from './incidents.js';
export * from './rules.js';
export {
  BREACH_DETECTION_SOURCES,
  BREACH_ENTRY_KINDS,
  type BreachDetectionSource,
  type BreachEntryKind,
} from '../schema/breach_incidents.js';
