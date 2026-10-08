/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Strapi content API. Defaults to http://localhost:1337 if unset. */
  readonly VITE_CMS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
