import type { Chain } from '@/types/execution';

/**
 * Deposit-transfer contract.
 *
 * A deliberate SUPERSET of `packages/intents-swap-widget/src/types/transfer.ts`:
 * the widget-specific fields are kept optional so `intents-swap-widget-evm` can
 * later delegate here instead of maintaining a fork of `makeTransfer` (notably
 * `makeVirtualChainTransfer`). Add fields; never remove them.
 */
export type MakeTransferArgs = {
  /**
   * ATOMIC amount, despite the name — a widget-compatibility alias where the
   * field already held an atomic value. Never pass a human-readable/decimal
   * string here. Ignored when `amountAtomic` is set; prefer `amountAtomic`.
   */
  amount?: string;
  /** Exact atomic amount. Preferred — avoids re-deriving from a display string. */
  amountAtomic?: string;
  decimals: number;
  /** Recipient — the 1Click deposit address for an Intents Connect deposit. */
  address: string;
  /** Absent means the chain's native gas asset. */
  tokenAddress?: string;
  chain: Chain;
  evmChainId?: number | null;
  isNativeEvmTokenTransfer?: boolean;
  /** Memo / destination tag. Required for Stellar. */
  memo?: string;

  // --- Widget-compatibility fields. Unused by Intents Connect deposits, kept
  // --- so the widget's callers remain expressible against this contract.
  sourceAssetId?: string;
  targetAssetId?: string;
};

export type TransferResult = {
  hash: string;
  transactionLink?: string;
};

/**
 * Structurally compatible with the widget's network plugins, so a consumer who
 * already has `evm` / `sol` / `stellar` from the `intents-swap-widget-*`
 * packages can pass them straight in.
 */
export type MakeTransfer<TOptions = unknown> = (
  args: MakeTransferArgs,
  options: TOptions,
) => Promise<Pick<TransferResult, 'hash'>>;

export type TransferPlugin<TOptions = unknown> = {
  makeTransfer: MakeTransfer<TOptions>;
};

/** Keyed the same way as the widget's `Plugins`. */
export type TransferPlugins = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evm?: TransferPlugin<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sol?: TransferPlugin<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stellar?: TransferPlugin<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  near?: TransferPlugin<any>;
};

/**
 * Resolves the atomic amount a transfer should move.
 *
 * `amountAtomic` is preferred and is what the runner always sets — it comes
 * straight from the quote, so it cannot drift from what the bridge expects.
 * `amount` is accepted for widget-plugin compatibility, where the field already
 * held an atomic value despite its name.
 */
export const resolveTransferAmount = (args: MakeTransferArgs): bigint => {
  const raw = args.amountAtomic ?? args.amount;

  if (raw === undefined || raw === '') {
    throw new Error('No amount to transfer: set amountAtomic');
  }

  const atomic = BigInt(raw);

  if (atomic <= 0n) {
    throw new Error(`Transfer amount must be positive, got ${raw}`);
  }

  return atomic;
};
