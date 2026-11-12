import type { TonSignedText } from '@aurora-is-near/intents-connect';

/** A TON wallet the session is connected to. */
export type TonPeer = {
  /** User-friendly and non-bounceable (`UQ…`): the form used everywhere. */
  address: string;
  /** The raw form (`0:…`), as TON Connect reports it. */
  rawAddress: string;
  /** `ed25519:<base58>`, when the wallet shared its key. */
  publicKey?: string;
  /** The wallet's app name, e.g. `tonkeeper`. */
  appName: string;
  name: string;
  icon?: string;
  /** Set when connected through a browser extension; a phone has none. */
  jsBridgeKey?: string;
  /** Whether the wallet can sign text (TON Connect's SignData). */
  signsText: boolean;
  /** On TON mainnet, not the testnet. */
  mainnet: boolean;
};

/** A TON wallet extension installed in this browser. */
export type TonExtension = {
  appName: string;
  name: string;
  icon?: string;
  jsBridgeKey: string;
};

/** A message of a TON Connect transaction. */
export type TonMessage = {
  /** User-friendly; its bounce flag is the message's. */
  address: string;
  /** Nanotons. */
  amount: string;
  /** Base64 BOC of the body cell. */
  payload?: string;
};

export type TonConnectClient = {
  /** The persisted session's wallet, restored once, without UI. */
  getPeer: () => Promise<TonPeer | null>;
  /** The wallet connected now, if any. */
  currentPeer: () => TonPeer | null;
  /** Fires on every connect and disconnect, either side. */
  onChange: (listener: (peer: TonPeer | null) => void) => () => void;
  /** Fires when a connected wallet goes away, e.g. ended from the phone. */
  onSessionEnd: (listener: () => void) => () => void;
  /** TON wallet extensions installed in this browser. */
  listExtensions: () => Promise<TonExtension[]>;
  /**
   * Connects an installed extension, through its own prompt. An extension
   * whose popup is closed never answers, so it gives up after `timeoutMs`
   * (60 s by default), or when `signal` aborts.
   */
  connectExtension: (
    jsBridgeKey: string,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ) => Promise<TonPeer>;
  /**
   * Starts a phone pairing: `onUri` receives the QR payload (a universal
   * `tc://` link any TON Connect wallet scans), and the promise resolves
   * once the wallet approves. Replaces any previous session.
   */
  pair: (onUri: (uri: string) => void) => Promise<TonPeer>;
  /** Abandons a pairing in progress. */
  abortPairing: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** TON Connect `signData({ type: 'text' })`, from the connected wallet. */
  signText: (text: string) => Promise<TonSignedText>;
  /** TON Connect `sendTransaction`; resolves with the signed message's BOC. */
  sendTransaction: (request: {
    validUntil: number;
    messages: TonMessage[];
  }) => Promise<{ boc: string }>;
};

export type TonTransferOptions = {
  client: TonConnectClient;
  /** toncenter-compatible endpoints, for jetton wallets and confirmation. */
  toncenterUrls?: readonly string[];
  /** toncenter's `X-API-Key`. */
  toncenterApiKey?: string;
  /** How often confirmation is checked. */
  pollIntervalMs?: number;
  /** How long confirmation is waited for before the hash is returned anyway. */
  confirmationTimeoutMs?: number;
};
