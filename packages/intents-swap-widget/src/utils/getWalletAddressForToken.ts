import { Token, WalletAddresses } from '../types';

export const getWalletAddressForToken = (
  walletAddress: WalletAddresses,
  token?: Token,
): string | undefined => {
  if (!walletAddress) {
    return undefined;
  }

  const { blockchain } = token ?? {};

  // Select the wallet provided for the specific chain
  if (blockchain && blockchain in walletAddress) {
    return walletAddress[blockchain];

    return;
  }

  // Fallback to the default wallet, if provided
  if (walletAddress.default) {
    return walletAddress.default;
  }
};
