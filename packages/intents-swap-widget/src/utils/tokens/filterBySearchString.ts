import { CHAINS_LIST } from '@/constants/chains';
import type { Token } from '@/types/token';
import type { Chain } from '@/types/chain';

type Options = {
  search: string;
  chains: ReadonlyArray<Chain>;
};

export const createFilterBySearch = (options: Options) => {
  const { search } = options;

  return (token: Token) => {
    if (!search) {
      return true;
    }

    const tokenNameLowerCase = token.name.toLowerCase();
    const tokenSymbolLowerCase = token.symbol.toLowerCase();
    const tokenContractAddress = token.contractAddress?.toLowerCase();
    const searchLowerCase = search.toLowerCase();
    const chainName = CHAINS_LIST[token.blockchain].label.toLocaleLowerCase();

    return (
      // search by chain name (only for external tokens)
      (!token.isIntent && chainName.includes(searchLowerCase)) ||
      (!token.isIntent && token.blockchain.includes(searchLowerCase)) ||
      // by token name
      tokenNameLowerCase.includes(searchLowerCase) ||
      tokenSymbolLowerCase.includes(searchLowerCase) ||
      // by contract address
      (tokenContractAddress && tokenContractAddress === searchLowerCase)
    );
  };
};
