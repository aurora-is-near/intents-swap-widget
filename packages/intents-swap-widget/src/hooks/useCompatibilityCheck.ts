import { useState } from 'react';
import type { walletMessage } from '@defuse-protocol/internal-utils';
import { Buffer } from 'buffer';
import {
  verifyWalletSignature,
  walletVerificationMessageFactory,
} from '../utils/intents/walletCompatibilityVerification';
import { IntentsTransferArgs } from '../types';
import { logger } from '../logger';
import { TransferError } from '@/errors';
import { useConfig } from '@/config';
import { notReachable } from '@/utils/notReachable';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { localStorageTyped } from '@/utils/localstorage';

type Props = {
  providers: IntentsTransferArgs['providers'];
  walletAddress?: string;
};

export function useCompatibilityCheck({ providers, walletAddress }: Props) {
  const [isSigning, setIsSigning] = useState(false);
  const { intentsAccountType } = useConfig();
  const intentsAccountId = getIntentsAccountId({
    walletAddress,
    addressType: intentsAccountType,
  });

  async function handleSignInternal(): Promise<walletMessage.WalletSignatureResult> {
    if (!intentsAccountId || !walletAddress) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'No wallet connected' },
      });
    }

    if (!intentsAccountType) {
      throw new TransferError({
        code: 'TRANSFER_INVALID_INITIAL',
        meta: { message: 'Intents account type is not defined' },
      });
    }

    const authType =
      intentsAccountType === 'sol' ? 'solana' : intentsAccountType;

    const msg = walletVerificationMessageFactory(walletAddress, authType);

    switch (intentsAccountType) {
      case 'evm': {
        if (!providers?.evm) {
          throw new TransferError({
            code: 'TRANSFER_INVALID_INITIAL',
            meta: { message: 'No EVM provider configured' },
          });
        }

        const provider =
          typeof providers.evm === 'function'
            ? await providers.evm()
            : providers.evm;

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
        if (!providers?.sol) {
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
    if (!intentsAccountType) {
      return false;
    }

    try {
      setIsSigning(true);

      const signature = await handleSignInternal();

      const isValid = await verifyWalletSignature(
        signature,
        walletAddress!,
        intentsAccountType === 'sol' ? 'solana' : intentsAccountType,
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
      logger.error('Wallet compatibility check failed', error);

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
