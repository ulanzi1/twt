// SMS rate-limit domain accessors — Story 5.6 (Task 5). Barrel for the per-member transactional-SMS send
// budget (the dedicated `sms_rate_buckets` counter, SEPARATE from the OTP send budget). Transport-free
// primitives the (future) live SMS cascade site consumes before a fallback SMS send.

export {
  checkAndConsumeSmsBudget,
  deleteExpiredSmsRateBuckets,
  type CheckAndConsumeSmsBudgetInput,
  type SmsBudgetDecision,
} from './buckets.js';
