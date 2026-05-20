import { getIntentsAccountTypeFromAddress } from '@/utils/chains/getIntentsAccountTypeFromAddress';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { isAuroraRecipient } from '@/utils/intents/isAuroraRecipient';
import { isAuroraSourceRefund } from '@/utils/intents/isAuroraSourceRefund';
import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import { supportsAuroraVcRefund } from '@/utils/intents/supportsAuroraVcRefund';
import type { Chains } from '@/types/chain';
import type { IntentsAccountType } from '@/types/config';
import type { Token } from '@/types/token';

type Args = {
  walletAddress: string;
  sourceToken: Pick<Token, 'isIntent' | 'blockchain'>;
  targetToken: Pick<Token, 'isIntent' | 'blockchain'>;
  intentsAccountType: IntentsAccountType | undefined;
  supportedChains: ReadonlyArray<Chains>;
  defaultRefundTo: string;
};

export const getQuoteRefundTo = ({
  walletAddress,
  sourceToken,
  targetToken,
  intentsAccountType,
  supportedChains,
  defaultRefundTo,
}: Args): string => {
  if (isAuroraRecipient(targetToken)) {
    return supportsAuroraVcRefund({ sourceToken, targetToken })
      ? 'aurora'
      : walletAddress;
  }

  if (isAuroraSourceRefund({ sourceToken, targetToken })) {
    return 'aurora';
  }

  const recipientIntentsAccountId = getIntentsAccountId({
    addressType:
      getIntentsAccountTypeFromAddress(walletAddress) ?? intentsAccountType,
    walletAddress,
  });

  const isRefundToIntentAccount =
    !!recipientIntentsAccountId &&
    (sourceToken.isIntent ||
      isAuroraToken(sourceToken) ||
      !supportedChains.includes(sourceToken.blockchain));

  if (isRefundToIntentAccount) {
    return recipientIntentsAccountId;
  }

  return defaultRefundTo;
};
