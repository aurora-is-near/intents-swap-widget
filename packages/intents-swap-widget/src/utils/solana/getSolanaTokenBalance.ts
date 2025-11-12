import { logger } from '../../logger';
import { Token } from '../../types';
import { isSolanaAddress } from './isSolanaAddress';

const ALCHEMY_SOLANA_RPC_BASE = 'https://solana-mainnet.g.alchemy.com/v2';

type SolanaRpcResponse<T> = {
  jsonrpc: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
  id: number;
};

type GetBalanceResult = {
  context: { slot: number };
  value: number;
};

type GetTokenAccountsResult = {
  context: { slot: number };
  value: Array<{
    account: {
      data: {
        parsed: {
          info: {
            tokenAmount: {
              amount: string;
              decimals: number;
              uiAmount: number;
            };
          };
        };
      };
    };
    pubkey: string;
  }>;
};

const getNativeSolanaBalance = async (
  walletAddress: string,
  alchemyApiKey: string,
): Promise<string | null> => {
  const rpcUrl = `${ALCHEMY_SOLANA_RPC_BASE}/${alchemyApiKey}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress],
      }),
    });

    const data = (await response.json()) as SolanaRpcResponse<GetBalanceResult>;

    if (data.error) {
      return null;
    }

    return data.result?.value?.toString() ?? '0';
  } catch (error) {
    logger.error('Failed to fetch native Solana balance:', error);

    return null;
  }
};

const getSolanaSplTokenBalance = async (
  token: Token,
  walletAddress: string,
  alchemyApiKey: string,
): Promise<string | null> => {
  if (!token.contractAddress) {
    return null;
  }

  const rpcUrl = `${ALCHEMY_SOLANA_RPC_BASE}/${alchemyApiKey}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          {
            mint: token.contractAddress,
          },
          {
            encoding: 'jsonParsed',
          },
        ],
      }),
    });

    const data =
      (await response.json()) as SolanaRpcResponse<GetTokenAccountsResult>;

    if (data.error) {
      return null;
    }

    if (!data.result?.value || data.result.value.length === 0) {
      return '0';
    }

    // Sum balances across all associated token accounts
    // A user can have multiple token accounts for the same mint
    const total = data.result.value.reduce<bigint>((acc, { account }) => {
      const raw = account?.data?.parsed?.info?.tokenAmount?.amount;

      return raw ? acc + BigInt(raw) : acc;
    }, 0n);

    return total.toString();
  } catch (error) {
    logger.error(
      `Failed to fetch SPL token balance for ${token.symbol}:`,
      error,
    );

    return null;
  }
};

export const getSolanaTokenBalance = (
  token: Token,
  walletAddress: string,
  alchemyApiKey: string,
): Promise<string | null> | null => {
  if (!isSolanaAddress(walletAddress)) {
    return null;
  }

  if (token.symbol === 'SOL' && !token.contractAddress) {
    return getNativeSolanaBalance(walletAddress, alchemyApiKey);
  }

  return getSolanaSplTokenBalance(token, walletAddress, alchemyApiKey);
};
