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
