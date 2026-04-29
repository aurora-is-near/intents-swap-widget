import { logger } from '../../logger';
import { Token } from '../../types';

const STRK_CONTRACT =
  '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';
const BALANCE_OF_SELECTOR =
  '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e';

type StarknetRpcResponse = {
  result?: string[];
  error?: { code: number; message: string };
};

export const getStarknetTokenBalance = async (
  token: Token,
  walletAddress: string,
  rpcUrls: string[],
): Promise<string> => {
  const rpcUrl = rpcUrls[0];

  if (!rpcUrl) {
    logger.warn('No Starknet RPC URL configured');

    return '0';
  }

  const contractAddress = token.contractAddress ?? STRK_CONTRACT;

  let res: Response;

  try {
    res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'starknet_call',
        params: {
          request: {
            contract_address: contractAddress,
            entry_point_selector: BALANCE_OF_SELECTOR,
            calldata: [walletAddress],
          },
          block_id: 'latest',
        },
      }),
    });
  } catch (err) {
    logger.error(err);

    return '0';
  }

  let data: StarknetRpcResponse;

  try {
    data = (await res.json()) as StarknetRpcResponse;
  } catch (err) {
    logger.error(err);

    return '0';
  }

  if (data.error) {
    logger.error(data.error);

    return '0';
  }

  if (!data.result) {
    return '0';
  }

  // ERC20 balanceOf returns Uint256 = (low felt, high felt)
  const [low = '0x0', high = '0x0'] = data.result;
  const value = (BigInt(high) << 128n) + BigInt(low);

  return value.toString();
};
