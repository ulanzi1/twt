// @twt/domain device-token barrel — Story 5.2. The push device-token registration substrate: the
// app-open-rebuild upsert, the active-token read (delivery resolver), the AC5 invalidation write, and the
// Class C cleanup prune. Consumed via `@twt/domain` `deviceToken` namespace.

export {
  upsertActiveToken,
  listActiveTokens,
  markInvalid,
  type DeviceTokenUpsertInput,
} from './registration.js';
export {
  purgeExpiredDeviceTokens,
  DEVICE_TOKEN_STALE_MAX_AGE_SECONDS,
  DEVICE_TOKEN_INVALID_MAX_AGE_SECONDS,
} from './cleanup.js';
// Story 5.7 — the in-app-engagement read (MAX last_seen_at over active tokens) the cost-optimization policy consumes.
export { getMemberLastEngagementAt } from './engagement.js';
