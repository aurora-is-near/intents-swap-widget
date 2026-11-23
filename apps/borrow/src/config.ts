/**
 * The Reown (WalletConnect Cloud) project id, from `VITE_REOWN_PROJECT_ID`.
 *
 * Unset (or empty), this is `undefined` and `AppKitProvider` falls back to the
 * wallet package's shared Aurora id (`connect/projectId.ts`), as decided. The
 * package exports that id only from `connect/walletconnect`, which needs the
 * `@walletconnect/universal-provider` peer Borrow does not install, so the
 * fallback is left to the provider rather than imported here. Production
 * should set Borrow's own project, whose allowed domains list the site.
 */
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID?.trim();

export const REOWN_PROJECT_ID: string | undefined =
  projectId === '' ? undefined : projectId;
