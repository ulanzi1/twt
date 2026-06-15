/// <reference types="vite/client" />

// Build-time env typing for the admin SPA (Story 1.13). Vite statically replaces
// `import.meta.env.VITE_*` at build; site keys are PUBLIC (unlike server secrets), so
// the Turnstile SITE key rides here. Absent ⇒ LoginPage renders no widget (dev default).
interface ImportMetaEnv {
  /** Cloudflare Turnstile site key (public). Absent ⇒ no widget rendered. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
