/**
 * The parts of TronWeb a deposit and a signature use. Declared structurally,
 * so this package needs no `tronweb`: the wallet's own instance is used.
 */
export type TronTransaction = { txID: string } & Record<string, unknown>;

export type TronBroadcast = {
  result?: boolean;
  txid?: string;
  /** e.g. `SIGERROR`, `BANDWITH_ERROR`, when `result` is false. */
  code?: string;
  /** Often hex-encoded text. */
  message?: string;
};

export type TronTransactionInfo = {
  id?: string;
  /** Present once the transaction is in a block. */
  blockNumber?: number;
  /** `FAILED` for a reverted contract call. */
  result?: string;
  /** Contract calls: `SUCCESS`, `REVERT`, `OUT_OF_ENERGY`… */
  receipt?: { result?: string };
  resMessage?: string;
};

export type TronWebLike = {
  defaultAddress?: { base58?: string | false };
  trx: {
    signMessageV2: (message: string) => Promise<string>;
    /** Recovers the base58 signer; never throws on a mismatch. */
    verifyMessageV2?: (message: string, signature: string) => Promise<string>;
    sign: (transaction: TronTransaction) => Promise<TronTransaction>;
    sendRawTransaction: (signed: TronTransaction) => Promise<TronBroadcast>;
    /** Confirmed (solidified) info: about a minute behind. */
    getTransactionInfo: (txid: string) => Promise<TronTransactionInfo>;
    /** The latest block's view, when the TronWeb version has it. */
    getUnconfirmedTransactionInfo?: (
      txid: string,
    ) => Promise<TronTransactionInfo>;
    getBlockByNumber?: (number: number) => Promise<{ blockID?: string }>;
  };
  transactionBuilder: {
    sendTrx: (
      to: string,
      amount: number,
      from: string,
    ) => Promise<TronTransaction>;
    triggerSmartContract: (
      contract: string,
      functionSelector: string,
      options: { feeLimit?: number; callValue?: number },
      parameters: { type: string; value: string }[],
      issuer: string,
    ) => Promise<{
      result?: { result?: boolean; message?: string };
      transaction?: TronTransaction;
    }>;
  };
};

/**
 * A TRON wallet's injected provider (TIP-1193, e.g. `window.tron` or one
 * announced over TIP-6963). Its `tronWeb` is `false` until the user lets
 * this site connect.
 */
export type TronInjectedProvider = {
  tronWeb?: TronWebLike | false;
  request?: (args: {
    method: string;
    params?: unknown[] | object;
  }) => Promise<unknown>;
  on?: (event: string, listener: (data: unknown) => void) => void;
  removeListener?: (event: string, listener: (data: unknown) => void) => void;
};

export type TronTransferOptions = {
  /** The wallet's own TronWeb, never the global `window.tronWeb`. */
  tronWeb: TronWebLike;
  /** The sender. Defaults to `tronWeb.defaultAddress.base58`. */
  address?: string;
  /** How often inclusion is checked. */
  pollIntervalMs?: number;
  /** How long inclusion is waited for before the hash is returned anyway. */
  inclusionTimeoutMs?: number;
};
