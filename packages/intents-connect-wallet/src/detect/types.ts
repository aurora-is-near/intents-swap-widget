import type { WalletConnector } from '@aurora-is-near/intents-connect';

/** Wallet families that can be detected in a page. */
export type DetectedFamily = 'evm' | 'sol' | 'near';

/** An EIP-1193 provider as announced over EIP-6963. */
export type Eip1193Like = {
  request: (args: {
    method: string;
    params?: unknown[] | object;
  }) => Promise<unknown>;
  on?: (event: string, listener: (data: unknown) => void) => void;
  removeListener?: (event: string, listener: (data: unknown) => void) => void;
};

export type StandardWalletAccount = {
  address: string;
  publicKey?: Uint8Array;
  chains?: readonly string[];
};

/** A Wallet Standard wallet, as registered by Phantom, Solflare, Backpack… */
export type StandardWalletLike = {
  name: string;
  icon: string;
  chains: readonly string[];
  accounts: readonly StandardWalletAccount[];
  features: Record<string, unknown>;
};

export type NearInjectedAccount = { accountId: string; publicKey: string };

/** A NEAR wallet injected through near-connect's `near-wallet-injected` event. */
export type InjectedNearWallet = {
  manifest: { id: string; name: string; icon?: string };
  getAccounts: (data?: { network?: string }) => Promise<NearInjectedAccount[]>;
  signMessage: (params: {
    message: string;
    recipient: string;
    nonce: Uint8Array;
    network?: string;
  }) => Promise<{
    accountId: string;
    publicKey: string;
    signature: string | Uint8Array;
  }>;
  signAndSendTransactions: (params: {
    transactions: unknown[];
    network?: string;
  }) => Promise<unknown>;
  /** Prompts the user to share an account. */
  signIn?: (data?: { network?: string }) => Promise<unknown>;
  signOut?: (data?: { network?: string }) => Promise<unknown>;
};

type DetectedBase = {
  /** `<family>:<wallet id>`. Phantom shows up as both `evm:…` and `sol:…`. */
  id: string;
  name: string;
  icon?: string;
  /** The account shared with this site, or `null` while none is. */
  address: string | null;
};

export type DetectedEvmWallet = DetectedBase & {
  family: 'evm';
  /** EIP-6963 reverse-DNS id, when announced. */
  rdns?: string;
  chainId?: number;
  provider: Eip1193Like;
};

export type DetectedSolanaWallet = DetectedBase & {
  family: 'sol';
  wallet: StandardWalletLike;
};

export type DetectedNearWallet = DetectedBase & {
  family: 'near';
  /** `ed25519:…` — the runner needs it to resolve the intermediary. */
  publicKey?: string;
  wallet: InjectedNearWallet;
};

export type DetectedWallet =
  | DetectedEvmWallet
  | DetectedSolanaWallet
  | DetectedNearWallet;

export type WalletDetectorSnapshot = {
  /** False until the first detection pass has settled. */
  ready: boolean;
  wallets: readonly DetectedWallet[];
};

/** What a running source does; built-in families have one each too. */
export type WalletSourceHandle = {
  start: () => void;
  read: () => Promise<DetectedWallet[]>;
  stop: () => void;
};

/**
 * Detection for a family outside the built-in ones, shipped from that
 * family's own subpath (e.g. `./detect/stellar`), so `./detect` never pulls
 * its chain SDK.
 *
 * `read` should return the same wallet objects while nothing changed: the
 * detector compares a plug-in wallet by identity.
 */
export type WalletSource = {
  /** Unique per source. Detectors with different sources are not shared. */
  id: string;
  /** `onChange` schedules a pass; `readTimeoutMs` is the per-wallet budget. */
  create: (onChange: () => void, readTimeoutMs: number) => WalletSourceHandle;
};

/**
 * What a plug-in source's wallets carry, so `connectDetectedWallet`,
 * `disconnectDetectedWallet` and `toWalletConnector` need no family code.
 */
export type PluggableWallet = {
  /** Asks the wallet to share an account, through its own prompt. */
  connect: () => Promise<void>;
  /** Asks the wallet to revoke the connection, where it can. */
  disconnect: () => Promise<void>;
  /** This wallet as a `WalletConnector`, given the family's options. */
  toConnector: (options?: unknown) => {
    connector: WalletConnector | null;
    unsupportedReason?: UnsupportedReason;
  };
};

export type WalletDetectorOptions = {
  families?: readonly DetectedFamily[];
  /** Plug-in sources, detected alongside `families`. */
  sources?: readonly WalletSource[];
  /** Per-wallet budget for silent reads. One stuck wallet must not stall the rest. */
  readTimeoutMs?: number;
};

export type WalletDetector = {
  getSnapshot: () => WalletDetectorSnapshot;
  subscribe: (listener: () => void) => () => void;
  /** Re-reads every wallet's accounts. */
  refresh: () => Promise<void>;
  /** Removes every window and wallet listener. */
  destroy: () => void;
};

/** Why a detected wallet cannot become a `WalletConnector` (yet). */
export type UnsupportedReason =
  /** No account is shared with this site. */
  | 'NOT_CONNECTED'
  /** NEAR: the wallet did not report the account's public key. */
  | 'MISSING_PUBLIC_KEY';
