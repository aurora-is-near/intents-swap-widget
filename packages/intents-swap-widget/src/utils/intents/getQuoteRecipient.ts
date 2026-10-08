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
  isDry?: boolean;
};

export const getQuoteRecipient = ({
  walletAddress,
  sendAddress,
  targetToken,
  intentsAccountType,
  defaultRecipient,
  isDry = false,
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
    // A passkey account has no address on any chain, so a real quote to an
    // external chain needs an explicit send address. Its `0x` intents ID
    // must never become an on-chain recipient.
    if (intentsAccountType === 'webauthn' && !isDry) {
      return sendAddress ?? undefined;
    }

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
