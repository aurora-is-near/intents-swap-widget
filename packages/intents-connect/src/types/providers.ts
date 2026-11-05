/**
 * Wallet provider shapes.
 *
 * Ported verbatim from `packages/intents-swap-widget/src/types/providers.ts` so
 * that a consumer's existing widget providers satisfy these types unchanged —
 * and so the widget can later depend on this package without an adapter layer.
 *
 * `Eip1193Provider` is declared locally rather than imported from `ethers` to
 * keep this package free of chain SDK dependencies.
 */

export type Eip1193Provider = {
  request: (request: {
    method: string;
    params?: unknown[] | object;
  }) => Promise<unknown>;
};

export type EvmProvider = Eip1193Provider | (() => Promise<Eip1193Provider>);

// The `any` mirrors the widget: a Solana transaction type varies by library
// (web3.js, @solana/solana-web3.js), and pinning it here would force one of
// those libraries into this package's dependency graph.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SolanaProvider<TTransaction = any> = {
  publicKey?: { toString(): string } | null;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: TTransaction) => Promise<TTransaction>;
};

export type StellarProvider = {
  publicKey?: string;
  /**
   * Deliberately widened from the widget's `signedMessage: string`: Freighter
   * versions disagree and return either a base64 string or a `Uint8Array`, and
   * the signer has to handle both. This is a superset, so a provider typed
   * against the widget remains assignable here.
   */
  signMessage: (message: string) => Promise<{
    signedMessage: string | Uint8Array;
    signerAddress: string | undefined;
  }>;
  signTransaction: (
    tx: string,
    options?: { networkPassphrase: string; address: string },
  ) => Promise<
    { signedTxXdr: string; signerAddress: string | undefined } | string
  >;
};

/**
 * A TRON wallet, as far as signing goes. Wallet packages adapt `tronWeb`
 * onto it; nothing here depends on TronWeb.
 */
export type TronProvider = {
  /** The base58 `T…` address it signs with, when known. */
  address?: string;
  /**
   * TIP-191 (`tronWeb.trx.signMessageV2`): signs the UTF-8 text under the
   * `"\x19TRON Signed Message:\n" + length` prefix, and returns `0x` + the
   * 65-byte r‖s‖v signature in hex.
   */
  signMessage: (message: string) => Promise<string>;
};

/** What a TON wallet returns for TON Connect's `signData({ type: 'text' })`. */
export type TonSignedText = {
  /** Base64 ed25519 signature over TON Connect's sign-data digest. */
  signature: string;
  /** The address the wallet signed for, as it reports it. */
  address: string;
  /** The dApp domain the wallet folded into the digest. */
  domain: string;
  /** Unix seconds, folded into the digest too. */
  timestamp: number;
};

/**
 * A TON wallet over TON Connect, as far as signing goes. Wallet packages
 * adapt their TON Connect session onto it.
 */
export type TonProvider = {
  /** The user-friendly address it signs with, when known. */
  address?: string;
  /** `ed25519:<base58>`: a TON address doesn't carry the key. */
  publicKey: string;
  /** TON Connect `signData({ type: 'text', text })`. */
  signText: (text: string) => Promise<TonSignedText>;
};

export type NearSignedMessage = {
  accountId: string;
  publicKey: string;
  signature: string;
};

export type NearWalletBase = {
  signMessage?: (args: {
    message: string;
    recipient: string;
    nonce: Uint8Array;
    callbackUrl?: string;
  }) => Promise<NearSignedMessage | void>;
};

export type Providers = {
  evm?: undefined | null | EvmProvider;
  sol?: undefined | null | SolanaProvider;
  stellar?: undefined | null | StellarProvider;
  tron?: undefined | null | TronProvider;
  ton?: undefined | null | TonProvider;
  near?: undefined | null | (() => NearWalletBase);
};
