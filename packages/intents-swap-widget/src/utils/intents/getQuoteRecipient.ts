import { getIntentsAccountTypeFromAddress } from '@/utils/chains/getIntentsAccountTypeFromAddress';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { isAuroraRecipient } from '@/utils/intents/isAuroraRecipient';
import type { IntentsAccountType } from '@/types/config';
import type { Token } from '@/types/token';

type Args = {
  walletAddress: string;
  sendAddress?: string | null;
  targetToken: Pick<Token, 'isIntent' | 'blockchain'>;
  intentsAccountType: IntentsAccountType | undefined;
  defaultRecipient: string | undefined;
};

export const getQuoteRecipient = ({
  walletAddress,
  sendAddress,
  targetToken,
  intentsAccountType,
  defaultRecipient,
}: Args): string | undefined => {
  if (isAuroraRecipient(targetToken)) {
    return 'aurora';
  }

  // Destination-chain recipients must stay in their chain-native format.
  // This matters for dry quotes, where there is no sendAddress and
  // walletAddress contains a placeholder for the target chain. Converting a
  // Solana or Stellar placeholder to an Intents account ID produces a hex
  // address that 1Click correctly rejects as an invalid destination address.
  if (!targetToken.isIntent) {
    return sendAddress ?? walletAddress;
  }

  return (
    getIntentsAccountId({
      addressType:
        getIntentsAccountTypeFromAddress(walletAddress) ?? intentsAccountType,
      walletAddress,
    }) ?? defaultRecipient
  );
};
