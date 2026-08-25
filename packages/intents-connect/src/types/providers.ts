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
  near?: undefined | null | (() => NearWalletBase);
};
