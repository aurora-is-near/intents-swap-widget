import { jsonRpcBatch } from '@/balances/jsonRpc';
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
