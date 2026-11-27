import type { WalletConnector } from '@aurora-is-near/intents-connect';

/** One wallet balance the user can fund a loan with. */
export type FundingAsset = {
  /** 1Click asset id. */
  assetId: string;
  symbol: string;
  /** 1Click chain slug, such as `base`. */
  chain: string;
  decimals: number;
  /** The token's contract on its chain; absent for the chain's gas token. */
  contractAddress?: string;
  /** Smallest unit. */
  amount: bigint;
  /** From the 1Click price; `undefined` when the token has none. */
  usdValue?: number;
  /** Why it can't fund a loan, if it can't. */
  unavailableReason?: string;
};

export type FundingAssets = {
  /** Non-zero balances, highest USD value first. */
  rows: FundingAsset[];
  /** 1Click slugs of the chains that could not be read, fully or partly. */
  unreadChains: string[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Reads the wallet's balances again. */
  refresh: () => void;
};

/** The connected wallet's chain family. */
export type WalletFamily = 'evm' | 'sol' | 'near' | 'stellar';

/** The connected wallet, whichever family the person picked in the modal. */
export type WalletSession = {
  address: string | undefined;
  isConnected: boolean;
  /** `null` while disconnected. */
  family: WalletFamily | null;
  /** What `IntentsConnectProvider` signs and deposits with; `null` while disconnected. */
  wallet: WalletConnector | null;
  /**
   * Opens the connect modal. Resolves once a wallet is connected (at once
   * when one already is); rejects when the modal is closed without one or
   * the wallet refuses.
   */
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};
