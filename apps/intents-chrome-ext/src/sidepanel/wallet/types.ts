import type { WalletInfo } from '../../shared/bridge';

export type WalletFamily = 'evm' | 'sol' | 'near';

/** A wallet installed in the browser, as detected on the site's page. */
export type DetectedWallet = {
  /** Unique across families, e.g. `evm:io.metamask`, `sol:Phantom`, `near:hot-wallet`. */
  id: string;
  family: WalletFamily;
  /** How the bridge addresses it: EVM id, Solana name, or NEAR manifest id. */
  bridgeId: string;
  info: WalletInfo;
  /**
   * The account it shares with the site's origin, if any. Not proof the site
   * uses it — see `isSiteWallet`.
   */
  siteAddress: string | null;
  /** The EVM wallet the site itself is signed in with. */
  isSiteWallet: boolean;
};

/**
 * Where a usable wallet is connected — which decides the page that serves its
 * requests and the origin its prompts name:
 * - `site`: already connected to the current site (used as-is, never
 *   re-connected by the extension);
 * - `extension`: connected to the extension's own connector page.
 */
export type WalletConnection = 'site' | 'extension';

export type WalletOption = DetectedWallet & {
  connection: WalletConnection | null;
  /** The account to use; `null` until connected. */
  address: string | null;
  /** NEAR: the account's key, which the service needs to resolve it. */
  publicKey?: string;
};

export type ConnectedWallet = WalletOption & {
  connection: WalletConnection;
  address: string;
};
