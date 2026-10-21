// Story 5.13 (WC4) — MOVED to `@twt/channels` (`packages/channels/src/wa-template-config-key.ts` — ONE builder for the key family,
// now with a second consumer in apps/api). This re-export keeps every importer here byte-unchanged.
export { waTemplateConfigKey, type WaTemplatePurpose } from '@twt/channels';
