import { readEvmBalances } from '@/balances/evm';
import { BalanceRpcError } from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';
import { IntentsConnectError } from '@/errors';
import type { FetchLike } from '@/http';

/** 1Click chain slug → Alchemy network. Chains outside it use RPCs. */
export const ALCHEMY_NETWORKS: Readonly<Record<string, string>> = {
  eth: 'eth-mainnet',
  bera: 'berachain-mainnet',
  base: 'base-mainnet',
  gnosis: 'gnosis-mainnet',
  arb: 'arb-mainnet',
  avax: 'avax-mainnet',
  op: 'opt-mainnet',
  pol: 'matic-mainnet',
  sol: 'solana-mainnet',
  monad: 'monad-mainnet',
  scroll: 'scroll-mainnet',
  hood: 'robinhood-mainnet',
};

const CHAIN_BY_NETWORK = Object.fromEntries(
  Object.entries(ALCHEMY_NETWORKS).map(([chain, network]) => [network, chain]),
);

export const isAlchemyChain = (chain: string): boolean =>
  chain in ALCHEMY_NETWORKS;

const PORTFOLIO_URL = (apiKey: string) =>
  `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/balances/by-address`;

/**
 * Alchemy's portfolio API misreports these on Monad (native MON and two
 * stablecoins), so — as in the widget — they are read from Alchemy's Monad
 * node directly instead.
 */
const MONAD_NODE_URL = (apiKey: string) =>
  `https://monad-mainnet.g.alchemy.com/v2/${apiKey}`;

const MONAD_DIRECT_CONTRACTS = new Set([
  '0x754704bc059f8c67012fed69bc8a327a5aafb603', // USDC
  '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', // USDT0
]);

/** The widget's page cap: three pages covers any realistic wallet. */
const MAX_PAGES = 3;
const DEFAULT_TIMEOUT = 15_000;

type PortfolioToken = {
  network: string;
  tokenAddress: string | null;
  tokenBalance: string;
};

type PortfolioResponse = {
  data?: { pageKey?: string | null; tokens?: PortfolioToken[] };
};

const isMonadDirect = (chain: string, token: BalanceToken) =>
  chain === 'monad' &&
  (isNativeToken(token) ||
    MONAD_DIRECT_CONTRACTS.has(token.contractAddress?.toLowerCase() ?? ''));

const fetchPage = async (
  apiKey: string,
  body: unknown,
  { fetch: fetchImpl, timeout = DEFAULT_TIMEOUT }: BalanceTransportOptions,
): Promise<PortfolioResponse> => {
  const doFetch: FetchLike =
    fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await doFetch(PORTFOLIO_URL(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new IntentsConnectError(
        `Alchemy responded ${response.status}: ${raw.slice(0, 200)}`,
      );
    }

    return JSON.parse(raw) as PortfolioResponse;
  } catch (error) {
    if (error instanceof IntentsConnectError) {
      throw error;
    }

    throw new BalanceRpcError(
      controller.signal.aborted
        ? `Alchemy timed out after ${timeout}ms`
        : 'Alchemy is unreachable',
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Balances of one address across every Alchemy-indexed chain in `tokens`, in
 * as few as one request. Tokens are matched on (chain, contract) — several
 * asset ids sharing a contract all get its balance — and a token absent from
 * a complete result reads as zero.
 */
export const readAlchemyBalances = async ({
  apiKey,
  address,
  tokens,
  ...transport
}: {
  apiKey: string;
  address: string;
  /** Tokens on Alchemy chains only. */
  tokens: readonly BalanceToken[];
} & BalanceTransportOptions): Promise<{
  balances: Record<string, string>;
  /**
   * Tokens Alchemy did not report before the page cap. Only non-empty for
   * wallets holding hundreds of tokens; read them another way.
   */
  unread: BalanceToken[];
}> => {
  const chains = [...new Set(tokens.map((token) => token.blockchain))];
  const networks = chains
    .map((chain) => ALCHEMY_NETWORKS[chain])
    .filter((network): network is string => !!network);

  const found = new Map<string, bigint>();
  const keyOf = (chain: string, contract: string | null | undefined) =>
    `${chain}:${contract ? contract.toLowerCase() : 'native'}`;

  let pageKey: string | null | undefined = null;
  let pages = 0;

  do {
    // eslint-disable-next-line no-await-in-loop
    const page: PortfolioResponse = await fetchPage(
      apiKey,
      {
        includeErc20Tokens: true,
        includeNativeTokens: true,
        addresses: [{ address, networks }],
        pageKey,
      },
      transport,
    );

    page.data?.tokens?.forEach((entry) => {
      const chain = CHAIN_BY_NETWORK[entry.network];

      if (chain) {
        found.set(keyOf(chain, entry.tokenAddress), BigInt(entry.tokenBalance));
      }
    });

    pageKey = page.data?.pageKey;
    pages += 1;
  } while (pageKey && pages < MAX_PAGES);

  const complete = !pageKey;
  const balances: Record<string, string> = {};
  const unread: BalanceToken[] = [];

  tokens.forEach((token) => {
    if (isMonadDirect(token.blockchain, token)) {
      return;
    }

    const value = found.get(
      keyOf(
        token.blockchain,
        isNativeToken(token) ? null : token.contractAddress,
      ),
    );

    if (value !== undefined) {
      balances[token.assetId] = value.toString();
    } else if (complete) {
      balances[token.assetId] = '0';
    } else {
      unread.push(token);
    }
  });

  const monadTokens = tokens.filter((token) =>
    isMonadDirect(token.blockchain, token),
  );

  if (monadTokens.length && address.startsWith('0x')) {
    try {
      Object.assign(
        balances,
        await readEvmBalances({
          address,
          tokens: monadTokens,
          rpcUrls: [MONAD_NODE_URL(apiKey)],
          ...transport,
        }),
      );
    } catch {
      // The rest of the portfolio is still good; Monad stays unread.
    }
  }

  return { balances, unread };
};
