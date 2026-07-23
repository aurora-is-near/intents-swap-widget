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

  if (!targetToken.isIntent && sendAddress) {
    return sendAddress;
  }

  return (
    getIntentsAccountId({
      addressType:
        getIntentsAccountTypeFromAddress(walletAddress) ?? intentsAccountType,
      walletAddress,
    }) ?? defaultRecipient
  );
};
