// @twt/domain data-export barrel — Story 3.11 (Task 2).
//
// The section-assembly core behind the DPDPA data-portability ZIP (FR-95). The apps/jobs build worker
// consumes `assembleMemberExport`; the ZIP/encrypt/persist orchestration is the (thin) job runtime.

export {
  assembleMemberExport,
  listMemberEvents,
  emptySection,
  EXPORT_FILENAMES,
  EXPORT_SCHEMA_VERSION,
  type ExportEncryption,
  type AssembleMemberExportParams,
} from './assemble.js';
export {
  findActiveExport,
  insertDataExport,
  getExportForMember,
  markExportConsumed,
  markExportFailed,
} from './store.js';
