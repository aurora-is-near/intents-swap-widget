import {
  Chain,
  createWalletClient,
  custom,
  EIP1193Provider,
  encodeFunctionData,
  erc20Abi,
} from 'viem';
import {
  arbitrum,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains';

// Aurora chain configuration
const aurora: Chain = {
  id: 1313161554,
  name: 'Aurora Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.aurora.dev'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Aurora Explorer',
      url: 'https://explorer.aurora.dev',
    },
  },
};
import { getTransactionLink, isEvmChain } from '../utils';
import { MakeTransferArgs } from '../types';
import { isEvmAddress } from '../utils/evm/isEvmAddress';
import { EVM_CHAINS } from '../constants';

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const VIEM_CHAIN_MAP: Record<(typeof EVM_CHAINS)[number], Chain | null> = {
  eth: mainnet,
  gnosis,
  arb: arbitrum,
  bsc,
  base,
  op: optimism,
  pol: polygon,
  bera: null,
  avax: null,
  aurora,
};

export const useMakeEvmTransfer = () => {
  const make = async ({
    address,
    amount,
    tokenAddress,
    evmChainId,
    isNativeEthTransfer,
    chain: chainKey,
  }: MakeTransferArgs) => {
    if (!isEvmAddress(address)) {
      throw new Error(`Invalid EVM address: ${address}`);
    }

    if (!evmChainId) {
      throw new Error('EVM chain ID is required for EVM transfers.');
    }

    if (!window.ethereum) {
      throw new Error('No injected Ethereum wallet found.');
    }

    // Create wallet client from injected wallet (e.g. MetaMask)
    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });

    const [from] = await walletClient.getAddresses();

    if (!from) {
      throw new Error('No EVM account found in the injected wallet.');
    }

    const chain = isEvmChain(chainKey) ? VIEM_CHAIN_MAP[chainKey] : null;

    // Native ETH transfer
    if (isNativeEthTransfer) {
      const hash = await walletClient.sendTransaction({
        account: from,
        to: address,
        value: BigInt(amount),
        chain,
      });

      return {
        hash,
        transactionLink: getTransactionLink(evmChainId, hash),
      };
    }

    if (!tokenAddress || !isEvmAddress(tokenAddress)) {
      throw new Error(`Invalid EVM token address: ${tokenAddress}`);
    }

    // ERC20 transfer
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [address, BigInt(amount)],
    });

    const hash = await walletClient.sendTransaction({
      account: from,
      to: tokenAddress,
      data,
      chain,
    });

    return {
      hash,
      transactionLink: getTransactionLink(evmChainId, hash),
    };
  };

  return { make };
};
