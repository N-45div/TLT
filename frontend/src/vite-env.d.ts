/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PACKAGE_ID: string;
  readonly VITE_CLAIM_REGISTRY_ID: string;
  readonly VITE_SEAL_PACKAGE_ID: string;
  readonly VITE_WALRUS_AGGREGATOR: string;
  readonly VITE_WALRUS_PUBLISHER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
