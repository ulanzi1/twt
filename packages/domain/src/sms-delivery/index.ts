// SMS delivery reports — Story 6.37b. Barrel for the correlation id every SMS carries (MSG91's `CRQID`, DR3) and the
// accessors of migration 0167's report inbox and per-send delivery record (DR2, DR5–DR8, DR11, DR12).

export {
  SMS_CORRELATION_ID_PATTERN,
  SMS_CORRELATION_KINDS,
  formatSmsCorrelationId,
  isSmsCorrelationId,
  parseSmsCorrelationId,
  type SmsCorrelation,
  type SmsCorrelationKind,
  type SmsSendRowKind,
} from './correlation.js';
export {
  SMS_REPORTS_PER_REQUEST_MAX,
  SMS_REPORT_CLAIM_LIMIT,
  SMS_REPORT_LEASE_MS,
  SMS_SILENCE_WINDOW,
  claimDueSmsDeliveryReports,
  countOtpDeliveryReports,
  countSilentSmsSends,
  canReadAcrossPariwars,
  lookupSendForCorrelation,
  persistSmsDeliveryReports,
  pruneSettledSmsDeliveryReports,
  readSmsSendDeliveries,
  settleSmsDeliveryReport,
  upsertSmsSendDelivery,
  type ClaimedSmsDeliveryReport,
  type OtpDeliveryCounts,
  type SmsDeliveryReportProjection,
  type SmsReportSettlement,
  type SmsSendDeliveryReport,
  type SmsSendRowFacts,
} from './reports.js';
