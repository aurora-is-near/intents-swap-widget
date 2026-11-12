import { getFamilyForStandard, getWalletIntentsAccountId } from '@/account';
import type { IntentsAccountFamily } from '@/account';
import { useIntentsConnect } from '@/react/context';

export type UseIntentsAccountResult = {
  /** The connected wallet's `intents.near` account, if it can have one. */
  intentsAccountId?: string;
  family?: IntentsAccountFamily;
  address?: string;
};

/** The intents account of the provider's wallet. */
export const useIntentsAccount = (): UseIntentsAccountResult => {
  const { wallet } = useIntentsConnect();

  return {
    intentsAccountId: getWalletIntentsAccountId(wallet),
    family: wallet ? getFamilyForStandard(wallet.signingStandard) : undefined,
    address: wallet?.getAddress(),
  };
};
