import { getChainFamily } from '@/chains';
import { failGuard } from '@/errors';
import type {
  MakeTransfer,
  MakeTransferArgs,
  TransferPlugins,
  TransferResult,
} from '@/types/transfer';
import type { WalletConnector } from '@/types/wallet';

export type TransferFn = (
  args: MakeTransferArgs,
) => Promise<Pick<TransferResult, 'hash'>>;

export type TransferDeps = {
  getWallet: () => WalletConnector;
  plugins?: TransferPlugins;
  pluginOptions?: unknown;
  makeTransferOverride?: MakeTransfer<void>;
};

/**
 * Resolves the transfer implementation for an origin chain, in precedence
 * order: the explicit `makeTransfer` override, the connector's own
 * `makeTransfer`, then the chain-family plugin. `undefined` means none is
 * configured — `resume()` uses that to fall back to surfacing the deposit
 * address instead of failing a resumable execution.
 */
export const findTransfer = (
  deps: TransferDeps,
  originChain: string,
): TransferFn | undefined => {
  const { getWallet, plugins, pluginOptions, makeTransferOverride } = deps;

  if (makeTransferOverride) {
    return (args) => makeTransferOverride(args, undefined as void);
  }

  // Captured at resolution so optional members are read off the live
  // connector exactly once per deposit attempt.
  const activeWallet = getWallet();
  const walletTransfer = activeWallet.makeTransfer;

  if (walletTransfer) {
    // Invoked through the connector so a class-based implementation keeps
    // its `this`.
    return (args) => walletTransfer.call(activeWallet, args);
  }

  const family = getChainFamily(originChain);
  const plugin = family ? plugins?.[family] : undefined;

  if (!family || !plugin) {
    return undefined;
  }

  // Each plugin family expects a DIFFERENT options shape, so a multi-chain
  // integration namespaces them by family ({ evm: {…}, sol: {…}, … }) and
  // each plugin receives only its slice. A flat object (single-family
  // setups) passes through unchanged.
  const familyOptions =
    pluginOptions &&
    typeof pluginOptions === 'object' &&
    family in pluginOptions
      ? (pluginOptions as Record<string, unknown>)[family]
      : pluginOptions;

  return (args) => plugin.makeTransfer(args, familyOptions);
};

/**
 * Like `findTransfer`, but a missing implementation throws at resolution
 * rather than invocation: it is a configuration error, not a retryable
 * transfer failure.
 */
export const requireTransfer = (
  deps: TransferDeps,
  originChain: string,
): TransferFn =>
  findTransfer(deps, originChain) ??
  failGuard(
    'NO_TRANSFER_IMPLEMENTATION',
    `no transfer implementation for origin chain "${originChain}" — pass a wallet connector with makeTransfer, a plugin, or makeTransfer directly`,
  );
