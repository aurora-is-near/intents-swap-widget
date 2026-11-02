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
  /** The intents account refunds go to, when not derived from `walletAddress`. */
  intentsAccountId?: string;
  supportedChains: ReadonlyArray<Chains>;
  defaultRefundTo: string;
};

export const getQuoteRefundTo = ({
  walletAddress,
  sourceToken,
  targetToken,
  intentsAccountType,
  intentsAccountId,
  supportedChains,
  defaultRefundTo,
}: Args): string => {
  // A passkey account can only be refunded to its intents account: it has
  // no address on the origin chain or on Aurora.
  if (intentsAccountType === 'webauthn') {
    return (
      intentsAccountId ??
      getIntentsAccountId({ walletAddress, addressType: 'webauthn' }) ??
      defaultRefundTo
    );
  }

  if (isAuroraRecipient(targetToken)) {
    return supportsAuroraVcRefund({ sourceToken, targetToken })
      ? 'aurora'
      : walletAddress;
  }

  if (isAuroraSourceRefund({ sourceToken, targetToken })) {
    return 'aurora';
  }

  const recipientIntentsAccountId =
    intentsAccountId ??
    getIntentsAccountId({
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
