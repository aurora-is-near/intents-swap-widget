export type NearAction =
  | { type: 'Transfer'; params: { deposit: string } }
  | {
      type: 'FunctionCall';
      params: {
        methodName: string;
        args: Record<string, unknown>;
        gas: string;
        deposit: string;
      };
    };

export type NearTransaction = {
  signerId?: string;
  receiverId: string;
  actions: NearAction[];
};

export type NearTransactionOutcome = {
  transaction?: { hash?: string };
};

/**
 * The transfer-capable slice of a NEAR wallet.
 *
 * Declared here rather than in `intents-connect` because signing an intent only
 * needs `signMessage`; sending a deposit is this package's concern.
 * Structurally compatible with `NearWalletBase` from `@hot-labs/near-connect`.
 */
export type NearTransferWallet = {
  signAndSendTransactions: (args: {
    transactions: NearTransaction[];
  }) => Promise<NearTransactionOutcome[] | undefined>;
};

export type NearTransferOptions = {
  wallet: NearTransferWallet | (() => NearTransferWallet);
  /** Overrides the default public RPC list used for storage view calls. */
  rpcUrls?: readonly string[];
  /** Explicit signer account. Omit to let the wallet use its active account. */
  accountId?: string;
  /**
   * When set, the token transfer uses `ft_transfer_call` and forwards this as
   * `msg` instead of a plain `ft_transfer`.
   *
   * Leave unset for an Intents Connect deposit: the 1Click deposit address is a
   * plain account that does not implement `ft_on_transfer`, so `ft_transfer_call`
   * would refund. Set it only when depositing into a contract that expects a
   * message (e.g. `intents.near` directly, which is what the widget does).
   */
  msg?: string;
};
