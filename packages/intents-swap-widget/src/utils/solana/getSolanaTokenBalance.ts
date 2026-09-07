import { Token } from '../../types';
import { isSolanaAddress } from '../chains/isSolanaAddress';

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
  rpcUrl: string,
): Promise<string | null> => {
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
    return null;
  }
};

const getSolanaSplTokenBalance = async (
  token: Token,
  walletAddress: string,
  rpcUrl: string,
): Promise<string | null> => {
  if (!token.contractAddress) {
    return null;
  }

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

    const tokenAccount = data.result.value[0];

    return (
      tokenAccount?.account?.data?.parsed?.info?.tokenAmount?.amount ?? '0'
    );
  } catch (error) {
    return null;
  }
};

export const getSolanaTokenBalance = async (
  token: Token,
  walletAddress: string,
  rpcUrls: string[],
): Promise<string | null> => {
  if (!isSolanaAddress(walletAddress)) {
    return null;
  }

  const isNativeSol = token.symbol === 'SOL' && !token.contractAddress;

  if (!isNativeSol && !token.contractAddress) {
    return null;
  }

  const [rpcUrl, ...fallbackRpcUrls] = rpcUrls;

  if (!rpcUrl) {
    return null;
  }

  const balance = isNativeSol
    ? await getNativeSolanaBalance(walletAddress, rpcUrl)
    : await getSolanaSplTokenBalance(token, walletAddress, rpcUrl);

  return (
    balance ?? getSolanaTokenBalance(token, walletAddress, fallbackRpcUrls)
  );
};
