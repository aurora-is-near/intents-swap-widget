import { getIntentsAccountTypeFromAddress } from '@/utils/chains/getIntentsAccountTypeFromAddress';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { isAuroraRecipient } from '@/utils/intents/isAuroraRecipient';
import { isAuroraSourceRefund } from '@/utils/intents/isAuroraSourceRefund';
import { isAuroraToken } from '@/utils/intents/isAuroraToken';
import type { Chains } from '@/types/chain';
import type { IntentsAccountType } from '@/types/config';
import type { Token } from '@/types/token';
import type { Transaction } from '@/types/transaction';

type Args = {
  walletAddress: string;
  sourceToken: Pick<Token, 'isIntent' | 'blockchain'>;
  targetToken: Pick<Token, 'isIntent' | 'blockchain'>;
  intentsAccountType: IntentsAccountType | undefined;
  supportedChains: ReadonlyArray<Chains>;
};

export const getQuoteRefundType = ({
  walletAddress,
  sourceToken,
  targetToken,
  intentsAccountType,
  supportedChains,
}: Args): NonNullable<Transaction['refundType']> => {
  if (
    isAuroraRecipient(targetToken) ||
    isAuroraSourceRefund({ sourceToken, targetToken })
  ) {
    return 'ORIGIN_CHAIN';
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

  return isRefundToIntentAccount ? 'INTENTS' : 'ORIGIN_CHAIN';
};
