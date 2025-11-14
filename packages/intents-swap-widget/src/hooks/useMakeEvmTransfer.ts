import {
  Chain,
  createWalletClient,
  custom,
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
import { getTransactionLink, isEvmChain } from '../utils';
import { MakeTransferArgs } from '../types';
import { isEvmAddress } from '../utils/evm/isEvmAddress';
import { switchEthereumChain } from '../utils/evm/switchEthereumChain';
import { EVM_CHAINS } from '../constants';
import { Providers } from '../types/providers';

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
};

export const useMakeEvmTransfer = ({
  provider,
}: {
  provider?: Providers['evm'];
}) => {
  const make = async ({
    address,
    amount,
    tokenAddress,
    evmChainId,
    isNativeEthTransfer,
    chain: chainKey,
  }: MakeTransferArgs) => {
    const injectedProvider =
      typeof provider === 'function' ? await provider() : provider;

    if (!isEvmAddress(address)) {
      throw new Error(`Invalid EVM address: ${address}`);
    }

    if (!evmChainId) {
      throw new Error('EVM chain ID is required for EVM transfers.');
    }

    if (!injectedProvider) {
      throw new Error('No injected Ethereum wallet found.');
    }

    // Automatically switch to the correct chain if needed
    await switchEthereumChain(evmChainId, injectedProvider);

    // Create wallet client from injected wallet (e.g. MetaMask, AppKit)
    const walletClient = createWalletClient({
      transport: custom(injectedProvider),
    });

    // Try to get addresses without prompting first (works for MetaMask and already-connected wallets)
    let [from] = await walletClient.getAddresses();

    // Fallback: If no address found, request addresses (needed for AppKit/WalletConnect)
    if (!from) {
      [from] = await walletClient.requestAddresses();
    }

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
