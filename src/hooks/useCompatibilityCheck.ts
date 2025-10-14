import { useState } from 'react';
import type { walletMessage } from '@defuse-protocol/internal-utils';
import { TransferError } from '@/errors';
import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import {
  verifyWalletSignature,
  walletVerificationMessageFactory,
} from '../utils/intents/walletCompatibilityVerification';
import { IntentsTransferArgs } from '../types';

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
    if (!intentsAccountId) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No wallet connected' },
      });
    }

    const authType =
      intentsAccountType === 'sol' ? 'solana' : intentsAccountType;

    const msg = walletVerificationMessageFactory(intentsAccountId, authType);

    switch (intentsAccountType) {
      case 'evm': {
        if (!providers.evm) {
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

      case 'sol': {
        if (!providers.sol) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No SOL provider configured' },
          });
        }

        const signatureData = await providers.sol.signMessage({
          message: msg.SOLANA.message,
        });

        return {
          type: 'SOLANA',
          signatureData,
          signedData: msg.SOLANA,
        };
      }

      case 'near': {
        if (!providers.near) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No NEAR provider configured' },
          });
        }

        const signatureData = await providers
          .near()
          .signNep413Message(
            msg.NEP413.message,
            providers.near().id,
            msg.NEP413.recipient,
            Buffer.from(msg.NEP413.nonce),
            msg.NEP413.callbackUrl,
          );

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
        intentsAccountId!,
        intentsAccountType === 'sol' ? 'solana' : intentsAccountType,
      );

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
