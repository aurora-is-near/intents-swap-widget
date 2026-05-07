import { keccak256, toUtf8Bytes } from 'ethers';
import { Token } from '../../types';
import { isStarknetAddress } from '../chains/isStarknetAddress';

const ALCHEMY_STARKNET_RPC_BASE =
  'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_7';

// Starknet's `starknet_call` identifies functions using selectors derived
// from keccak256(name), truncated to 250 bits.
// eslint-disable-next-line no-bitwise
const STARKNET_SELECTOR_MASK = (1n << 250n) - 1n;

const getSelectorFromName = (name: string): string => {
  const hash = BigInt(keccak256(toUtf8Bytes(name)));

  // eslint-disable-next-line no-bitwise
  return `0x${(hash & STARKNET_SELECTOR_MASK).toString(16)}`;
};

const BALANCE_OF_SELECTOR = getSelectorFromName('balanceOf');

type StarknetRpcResponse = {
  jsonrpc: string;
  result?: string[];
  error?: { code: number; message: string };
  id: number;
};

const ensureHexPrefix = (addr: string): string => {
  if (!addr.startsWith('0x')) {
    return `0x${addr}`;
  }

  return addr;
};

const TWO_POW_128 = 2n ** 128n;

const u256FromFelts = (low: string, high: string): bigint => {
  return BigInt(high) * TWO_POW_128 + BigInt(low);
};

export const getStarknetTokenBalance = async (
  token: Token,
  walletAddress: string,
  alchemyApiKey?: string,
): Promise<string | null> => {
  if (!isStarknetAddress(walletAddress)) {
    return null;
  }

  if (!token.contractAddress) {
    return null;
  }

  if (!alchemyApiKey) {
    return null;
  }

  const rpcUrl = `${ALCHEMY_STARKNET_RPC_BASE}/${alchemyApiKey}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'starknet_call',
        params: {
          request: {
            contract_address: ensureHexPrefix(token.contractAddress),
            entry_point_selector: BALANCE_OF_SELECTOR,
            calldata: [ensureHexPrefix(walletAddress)],
          },
          block_id: 'latest',
        },
      }),
    });

    const data = (await response.json()) as StarknetRpcResponse;

    if (data.error) {
      return null;
    }

    if (!data.result || data.result.length < 2) {
      return null;
    }

    const [low, high] = data.result;

    if (!low || !high) {
      return null;
    }

    return u256FromFelts(low, high).toString();
  } catch {
    return null;
  }
};
