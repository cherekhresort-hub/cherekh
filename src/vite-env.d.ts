/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DISABLE_RATE_LIMIT?: string
  readonly VITE_EMAILJS_USER_ID?: string
  /** @deprecated use VITE_EMAILJS_USER_ID */
  readonly VITE_EMAILJS_PUBLIC_KEY?: string
  readonly VITE_EMAILJS_SERVICE_ID?: string
  readonly VITE_EMAILJS_GUEST_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_RESORT_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_RESORT_TO_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

