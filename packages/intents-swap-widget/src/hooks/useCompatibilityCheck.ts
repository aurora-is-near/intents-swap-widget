import { useState } from 'react';
import type { walletMessage } from '@defuse-protocol/internal-utils';
import { Buffer } from 'buffer';
import {
  verifyWalletSignature,
  walletVerificationMessageFactory,
} from '../utils/intents/walletCompatibilityVerification';
import { IntentsTransferArgs } from '../types';
import { TransferError } from '@/errors';
import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { localStorageTyped } from '@/utils/localstorage';

type Props = {
  providers: IntentsTransferArgs['providers'];
};

export function useCompatibilityCheck({ providers }: Props) {
  const [isSigning, setIsSigning] = useState(false);
  const { intentsAccountType, walletAddress } = useConfig();
  const intentsAccountId = getIntentsAccountId({
    walletAddress: walletAddress ?? '',
    addressType: intentsAccountType,
  });

  async function handleSignInternal(): Promise<walletMessage.WalletSignatureResult> {
    if (!intentsAccountId || !walletAddress) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No wallet connected' },
      });
    }

    const msg = walletVerificationMessageFactory(
      walletAddress,
      intentsAccountType,
    );

    switch (intentsAccountType) {
      case 'evm': {
        if (!providers?.evm) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No EVM provider configured' },
          });
        }

        const provider = await providers.evm();
        const signatureData = await provider.request({
          method: 'personal_sign',
          params: [msg.ERC191.message, intentsAccountId],
        });

        return {
          type: 'ERC191',
          signatureData,
          signedData: msg.ERC191,
        };
      }

      case 'near': {
        const nearProvider = providers?.near ? providers.near() : null;

        if (!nearProvider?.signMessage) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No NEAR provider configured' },
          });
        }

        const signatureData = await nearProvider.signMessage({
          message: msg.NEP413.message,
          nonce: Buffer.from(msg.NEP413.nonce),
          recipient: msg.NEP413.recipient,
        });

        if (!signatureData) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No public key returned from NEAR wallet' },
          });
        }

        return {
          type: 'NEP413',
          signatureData: {
            accountId: signatureData.accountId,
            publicKey: signatureData.publicKey.toString(),
            signature: signatureData.signature.toString(),
          },
          signedData: msg.NEP413,
        };
      }
      default:
        notReachable(intentsAccountType);
    }
  }

  const handleSign = async (): Promise<boolean> => {
    try {
      setIsSigning(true);

      const signature = await handleSignInternal();

      const isValid = await verifyWalletSignature(
        signature,
        walletAddress!,
        intentsAccountType,
      );

      // Handle NEAR public key storage
      if (isValid && intentsAccountType === 'near' && walletAddress) {
        const allKeys = localStorageTyped.getItem('nearWalletsPk') ?? {};
        const existingPublicKey = allKeys[walletAddress];

        if (!existingPublicKey && signature.type === 'NEP413') {
          localStorageTyped.setItem('nearWalletsPk', {
            ...allKeys,
            [walletAddress]: signature.signatureData.publicKey,
          });
        }
      }

      return isValid;
    } catch (error) {
      return false;
    } finally {
      setIsSigning(false);
    }
  };

  return {
    handleSign,
    isSigning,
  };
}
