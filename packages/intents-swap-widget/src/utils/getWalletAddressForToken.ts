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
    return walletAddress[blockchain] ?? undefined;
  }

  // Fallback to the default wallet, if provided
  if (walletAddress.default) {
    return walletAddress.default;
  }

  // Without a token there is no chain to pick by, so fall back to the first
  // chain-keyed wallet (e.g. `{ sol }`) to keep it treated as connected
  if (!token) {
    return Object.values(walletAddress).find(Boolean) ?? undefined;
  }
};
