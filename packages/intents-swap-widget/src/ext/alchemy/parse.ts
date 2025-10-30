import { CHAINS_MAP } from './types';
import { revertAlchemyChainsMap } from './utils';
import type { AlchemyBalanceItem } from './types';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { EVM_CHAIN_BASE_TOKENS } from '@/constants/chains';
import type { Token, TokenBalances } from '@/types/token';

export const parse = (
  tokensList: Token[],
  fetchedBalances: AlchemyBalanceItem[],
): TokenBalances => {
  const result: Record<string, string> = {};
  const reversedChainsMap = revertAlchemyChainsMap(CHAINS_MAP);

  fetchedBalances.forEach((bal) => {
    let match: Token | undefined;

    if (bal.tokenAddress) {
      match = tokensList.find((t) => {
        if (!bal.tokenAddress) {
          return false;
        }

        return (
          t.contractAddress?.toLowerCase() === bal.tokenAddress.toLowerCase()
        );
      });
    } else {
      const blockchain = reversedChainsMap[bal.network];

      if (blockchain) {
        match = tokensList.find(
          (t) =>
            t.contractAddress == null &&
            t.blockchain.toLowerCase() === blockchain.toLowerCase() &&
            t.symbol.toLowerCase() ===
              (isEvmChain(blockchain)
                ? (EVM_CHAIN_BASE_TOKENS[blockchain] ?? blockchain)
                : blockchain
              ).toLowerCase(),
        );
      }
    }

    if (match) {
      const bigintStr = BigInt(bal.tokenBalance).toString();

      if (bigintStr !== '0') {
        result[match.assetId] = bigintStr;
      }
    }
  });

  return result;
};
