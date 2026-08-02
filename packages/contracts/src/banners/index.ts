// Banner/Popup contracts barrel — Story 10.9 (Task 3).
//
// The wire enums (display-mode / severity / status / derived display-state / audience / dismissal
// kind — sync-guarded against the @twt/domain tuples) + the transport DTOs (create / update /
// publish / retract / dismiss requests; the admin + member response shapes). The admin routes gate
// on `banner.manage`; the member routes are member-session-gated with no RBAC key at all.

export {
  BANNER_DISPLAY_MODES,
  BannerDisplayMode,
  BANNER_SEVERITIES,
  BannerSeverity,
  BANNER_STATUSES,
  BannerStatus,
  BANNER_DISPLAY_STATES,
  BannerDisplayState,
  BANNER_AUDIENCE_SCOPES,
  BannerAudienceScope,
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  BANNER_DISMISSAL_KINDS,
  BannerDismissalKind,
} from './enums.js';

// The pure READ-TIME PRESENTATION POLICY. It lives here, not in @twt/domain, because apps/admin is
// a browser bundle that cannot import domain (pg/drizzle/kms) and domain cannot import contracts
// (a cycle — contracts depends on domain for its sync-guards). One implementation, every consumer.
// See display-state.ts's header for the full reasoning.
export {
  type BannerDisplayInput,
  deriveBannerDisplayState,
  isBannerInWindow,
} from './display-state.js';

export {
  BANNER_SEVERITY_ORDER,
  type BannerCandidate,
  type ResolvedBanners,
  bannerSeverityRank,
  compareBannerPrecedence,
  resolveVisibleBanners,
} from './precedence.js';

export {
  CreateBannerRequest,
  UpdateBannerRequest,
  PublishBannerRequest,
  RetractBannerRequest,
  DismissBannerRequest,
  BannerResponse,
  BannerListResponse,
  MemberBannerResponse,
  MemberBannerListResponse,
  DismissBannerResponse,
} from './dto.js';
