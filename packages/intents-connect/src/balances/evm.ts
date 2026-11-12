import { BalanceRpcError, jsonRpcBatch } from '@/balances/jsonRpc';
import { isNativeToken } from '@/balances/tokens';
import type { BalanceToken, BalanceTransportOptions } from '@/balances/types';

/** `balanceOf(address)` selector. */
const BALANCE_OF = '0x70a08231';

export const encodeBalanceOf = (owner: string): string =>
  `${BALANCE_OF}${owner.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;

/** `0x` (no contract at the address) reads as zero. */
const hexToDecimal = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.startsWith('0x')) {
    return undefined;
  }

  return value === '0x' ? '0' : BigInt(value).toString();
};

const tokenKey = (token: BalanceToken) =>
  isNativeToken(token) ? 'native' : token.contractAddress!.toLowerCase();

/**
 * Balances of one EVM chain over plain JSON-RPC: `eth_getBalance` for the gas
 * token, `eth_call balanceOf` for ERC-20s. One call per distinct contract,
 * even when several asset ids share it.
 */
export const readEvmBalances = async ({
  address,
  tokens,
  rpcUrls,
  ...transport
}: {
  address: string;
  /** Tokens of ONE chain. */
  tokens: readonly BalanceToken[];
  rpcUrls: readonly string[];
} & BalanceTransportOptions): Promise<Record<string, string>> => {
  const keys = [...new Set(tokens.map(tokenKey))];

  const outcomes = await jsonRpcBatch(
    rpcUrls,
    keys.map((key) =>
      key === 'native'
        ? { method: 'eth_getBalance', params: [address, 'latest'] }
        : {
            method: 'eth_call',
            params: [{ to: key, data: encodeBalanceOf(address) }, 'latest'],
          },
    ),
    transport,
  );

  const byKey = new Map<string, string>();

  keys.forEach((key, index) => {
    const outcome = outcomes[index];
    const value = outcome?.ok ? hexToDecimal(outcome.result) : undefined;

    if (value !== undefined) {
      byKey.set(key, value);
    }
  });

  const balances: Record<string, string> = {};

  tokens.forEach((token) => {
    const value = byKey.get(tokenKey(token));

    if (value !== undefined) {
      balances[token.assetId] = value;
    }
  });

  return balances;
};

/**
 * One EVM balance: `balanceOf` for an ERC-20, `eth_getBalance` without
 * `tokenAddress`. Throws `BalanceRpcError` rather than reading a failure as
 * zero — a caller deciding whether funds arrived must not mistake an outage
 * for an empty account.
 */
export const readEvmTokenBalance = async ({
  owner,
  tokenAddress,
  rpcUrls,
  ...transport
}: {
  owner: string;
  /** Undefined reads the chain's native asset. */
  tokenAddress?: string;
  rpcUrls: readonly string[];
} & BalanceTransportOptions): Promise<string> => {
  const [outcome] = await jsonRpcBatch(
    rpcUrls,
    [
      tokenAddress
        ? {
            method: 'eth_call',
            params: [
              { to: tokenAddress, data: encodeBalanceOf(owner) },
              'latest',
            ],
          }
        : { method: 'eth_getBalance', params: [owner, 'latest'] },
    ],
    transport,
  );

  if (!outcome?.ok) {
    throw new BalanceRpcError(
      `balance read failed: ${outcome?.error ?? 'no response'}`,
    );
  }

  const value = hexToDecimal(outcome.result);

  if (value === undefined) {
    throw new BalanceRpcError(
      `balance read failed: unexpected result ${String(outcome.result)}`,
    );
  }

  return value;
};
