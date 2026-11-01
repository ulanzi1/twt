// Module Marketplace contracts barrel — Story 12.2 (Task 4; `2026-11-01-433`).
//
// The wire enums (re-declared, sync-guarded against the @twt/domain tuples by tests/modules.test.ts), the publish step-up
// context, and the transport DTOs of the admin module surface (`/api/v1/p/:pariwarId/modules/…`). Every route gates on
// `module.manage` (pariwar dimension); publish ALSO requires a fresh `module_publish` step-up. ⛔ Member shape here — the
// member shelf is Story 12.3's. Partners live HERE, on tenant routes (`…/modules/partners`), ⛔ in `../partners/` (the
// global v2 partner portal — see its README's dated note).

export {
  MODULE_STATES,
  ModuleState,
  MODULE_ARCHIVE_REASONS,
  ModuleArchiveReason,
  MODULE_ELIGIBILITY_MEMBER_STATES,
  ModuleEligibilityMemberState,
  MODULE_SCOPE_KINDS,
  ModuleScopeKind,
  MODULE_PUBLISHED_EVENT_TYPES,
  ModulePublishedEventType,
  MODULE_DISTRICT_SOURCES,
  ModuleDistrictSource,
  MODULE_PUBLISH_STEP_UP_CONTEXT,
  MODULE_MAX_SCOPE_VALUES,
  MODULE_MAX_SCOPE_VALUE_LENGTH,
} from './enums.js';

export {
  CreateModulePartnerRequest,
  AuthorModuleRequest,
  PublishModuleRequest,
  WithdrawModuleRequest,
  ModuleListQuery,
  ModulePartnerListQuery,
  ModuleScopeFilterDto,
  ModuleEligibilityFilterDto,
  ModuleBrandingBundleDto,
  ModulePartnerResponse,
  ModulePartnerListResponse,
  ModuleScopeOptionDto,
  ModuleScopeOptionsResponse,
  ModuleSummaryResponse,
  ModuleListResponse,
  ModulePublicationDto,
  ModuleDetailResponse,
  AuthorModuleResponse,
  PublishModuleResponse,
  WithdrawModuleResponse,
} from './dto.js';
