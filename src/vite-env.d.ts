/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DR_ASTRA_BACKEND_URL?: string;
  readonly VITE_DEV_BACKEND_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
