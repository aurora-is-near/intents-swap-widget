import type { IntentsAccountFamily } from '@/account';
import { isAlchemyChain, readAlchemyBalances } from '@/balances/alchemy';
import { readEvmBalances } from '@/balances/evm';
import { readNearBalances } from '@/balances/near';
import { resolveRpcs } from '@/balances/rpcs';
import { readSolanaBalances } from '@/balances/solana';
import { readStellarBalances } from '@/balances/stellar';
import { readTonBalances } from '@/balances/ton';
import { readTronBalances } from '@/balances/tron';
import { getBalanceFamily } from '@/balances/tokens';
import type {
  BalanceToken,
  BalanceTransportOptions,
  ChainRpcUrls,
  WalletBalances,
} from '@/balances/types';
import { toError } from '@/errors';
import type { IntentsApi } from '@/intentsApi/types';
import { balanceRpcUrls } from '@/near/rpcUrls';

export type BalanceSource = 'alchemy' | 'rpc' | 'none';

/** Alchemy when keyed and indexed, else RPCs when configured, else nothing. */
export const getBalanceSource = (
  chain: string,
  { alchemyApiKey, rpcs }: { alchemyApiKey?: string; rpcs: ChainRpcUrls },
): BalanceSource => {
  if (alchemyApiKey && isAlchemyChain(chain)) {
    return 'alchemy';
  }

  if (chain === 'near' || rpcs[chain]?.length) {
    return 'rpc';
  }

  return 'none';
};

export type GetWalletBalancesArgs = {
  family: IntentsAccountFamily;
  address: string;
  /** From `getTokens(intentsApi)`; tokens of other families are ignored. */
  tokens: readonly BalanceToken[];
  /** Reads EVM and Solana chains Alchemy indexes in one request. */
  alchemyApiKey?: string;
  /** TronGrid's `TRON-PRO-API-KEY`: without one, ~1 request per second. */
  tronGridApiKey?: string;
  /** toncenter's `X-API-Key`: without one, ~1 request per second. */
  tonCenterApiKey?: string;
  /**
   * Per-chain endpoints, merged over `DEFAULT_RPCS` chain by chain. `near`
   * replaces the public NEAR endpoints.
   */
  rpcs?: ChainRpcUrls;
  /** Adds the intents-api NEAR proxy as the last NEAR fallback. */
  intentsApi?: Pick<IntentsApi, 'nearRpcUrl'>;
} & BalanceTransportOptions;

type ChainRead = {
  balances: Record<string, string>;
  /** Some tokens of the chain could not be read. */
  partialError?: Error;
};

const readChainByRpc = async (
  chain: string,
  family: IntentsAccountFamily,
  args: {
    address: string;
    tokens: BalanceToken[];
    rpcs: ChainRpcUrls;
    intentsApi?: Pick<IntentsApi, 'nearRpcUrl'>;
    tronGridApiKey?: string;
    tonCenterApiKey?: string;
  } & BalanceTransportOptions,
): Promise<ChainRead> => {
  const {
    address,
    tokens,
    rpcs,
    intentsApi,
    tronGridApiKey,
    tonCenterApiKey,
    ...transport
  } = args;

  switch (family) {
    case 'evm':
      return {
        balances: await readEvmBalances({
          address,
          tokens,
          rpcUrls: rpcs[chain] ?? [],
          ...transport,
        }),
      };
    case 'sol':
      return readSolanaBalances({
        address,
        tokens,
        rpcUrls: rpcs.sol ?? [],
        ...transport,
      });
    case 'stellar':
      return {
        balances: await readStellarBalances({
          address,
          tokens,
          horizonUrls: rpcs.stellar ?? [],
          ...transport,
        }),
      };
    case 'tron':
      return {
        balances: await readTronBalances({
          address,
          tokens,
          apiUrls: rpcs.tron ?? [],
          apiKey: tronGridApiKey,
          ...transport,
        }),
      };
    case 'ton':
      return {
        balances: await readTonBalances({
          address,
          tokens,
          apiUrls: rpcs.ton ?? [],
          apiKey: tonCenterApiKey,
          ...transport,
        }),
      };
    case 'near':
      return {
        balances: await readNearBalances({
          address,
          tokens,
          rpcUrls: balanceRpcUrls(intentsApi, rpcs.near),
          ...transport,
        }),
      };
    default:
      return { balances: {} };
  }
};

/**
 * The wallet's balance of every listed token it can hold.
 *
 * Chains are read in parallel and fail independently: one unreachable RPC
 * lands in `errors` without hiding the others. If Alchemy fails, its chains
 * fall back to RPCs.
 */
export const getWalletBalances = async ({
  family,
  address,
  tokens,
  alchemyApiKey,
  tronGridApiKey,
  tonCenterApiKey,
  rpcs: customRpcs,
  intentsApi,
  ...transport
}: GetWalletBalancesArgs): Promise<WalletBalances> => {
  const rpcs = resolveRpcs(customRpcs);
  const byChain = new Map<string, BalanceToken[]>();

  tokens.forEach((token) => {
    if (getBalanceFamily(token.blockchain) !== family) {
      return;
    }

    byChain.set(token.blockchain, [
      ...(byChain.get(token.blockchain) ?? []),
      token,
    ]);
  });

  const result: WalletBalances = { balances: {}, errors: {} };
  const viaAlchemy: string[] = [];
  const viaRpc: string[] = [];

  byChain.forEach((_, chain) => {
    const source = getBalanceSource(chain, { alchemyApiKey, rpcs });

    if (source === 'alchemy') {
      viaAlchemy.push(chain);
    } else if (source === 'rpc') {
      viaRpc.push(chain);
    }
  });

  const readByRpc = (chain: string, chainTokens = byChain.get(chain)!) =>
    readChainByRpc(chain, family, {
      address,
      tokens: chainTokens,
      rpcs,
      intentsApi,
      tronGridApiKey,
      tonCenterApiKey,
      ...transport,
    }).then(
      ({ balances, partialError }) => {
        Object.assign(result.balances, balances);

        if (partialError) {
          result.errors[chain] = partialError;
        }
      },
      (error: unknown) => {
        result.errors[chain] = toError(error);
      },
    );

  const readAlchemy = async () => {
    if (!viaAlchemy.length || !alchemyApiKey) {
      return;
    }

    try {
      const { balances, unread } = await readAlchemyBalances({
        apiKey: alchemyApiKey,
        address,
        tokens: viaAlchemy.flatMap((chain) => byChain.get(chain)!),
        ...transport,
      });

      Object.assign(result.balances, balances);

      // A wallet with hundreds of tokens outruns the page cap; finish the
      // listed tokens Alchemy did not reach over RPC.
      const unreadByChain = new Map<string, BalanceToken[]>();

      unread.forEach((token) => {
        unreadByChain.set(token.blockchain, [
          ...(unreadByChain.get(token.blockchain) ?? []),
          token,
        ]);
      });

      await Promise.all(
        [...unreadByChain].map(([chain, chainTokens]) =>
          rpcs[chain]?.length
            ? readByRpc(chain, chainTokens)
            : Promise.resolve(),
        ),
      );
    } catch (error) {
      await Promise.all(
        viaAlchemy.map((chain) => {
          if (rpcs[chain]?.length) {
            return readByRpc(chain);
          }

          result.errors[chain] = toError(error);

          return Promise.resolve();
        }),
      );
    }
  };

  await Promise.all([
    readAlchemy(),
    ...viaRpc.map((chain) => readByRpc(chain)),
  ]);

  return result;
};
