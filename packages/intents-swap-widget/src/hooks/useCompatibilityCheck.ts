import { useState } from 'react';
import type {
  AuthMethod,
  walletMessage,
} from '@defuse-protocol/internal-utils';
import { Buffer } from 'buffer';
import { TransferError } from '@/errors';
import { notReachable } from '@/utils/notReachable';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { localStorageTyped } from '@/utils/localstorage';
import {
  verifyWalletSignature,
  walletVerificationMessageFactory,
} from '../utils/intents/walletCompatibilityVerification';
import { IntentsAccountType, Providers } from '../types';
import { logger } from '../logger';
import { useIntentsAccountType } from './useIntentsAccountType';

type Props = {
  providers?: Providers;
  walletAddress?: string;
};

function assertDefined<T>(
  value: T,
  message: string,
): asserts value is NonNullable<T> {
  if (value == null) {
    logger.error(message);
    throw new TransferError({
      code: 'TRANSFER_INVALID_INITIAL',
      meta: { message },
    });
  }
}

const getAuthMethod = (accountType: IntentsAccountType): AuthMethod =>
  accountType === 'sol' ? 'solana' : accountType;

export function useCompatibilityCheck({ providers, walletAddress }: Props) {
  const [isSigning, setIsSigning] = useState(false);
  const { intentsAccountType } = useIntentsAccountType();
  const intentsAccountId = getIntentsAccountId({
    walletAddress,
    addressType: intentsAccountType,
  });

  // A passkey signs as its public key; every other account as its address.
  const getCredential = (address: string) =>
    intentsAccountType === 'webauthn'
      ? (providers?.webauthn?.publicKey ?? address)
      : address;

  async function handleSignInternal(): Promise<walletMessage.WalletSignatureResult> {
    assertDefined(walletAddress, 'No wallet connected');
    assertDefined(intentsAccountType, 'Intents account type is not defined');
    assertDefined(intentsAccountId, 'Intents account ID is not defined');

    const msg = walletVerificationMessageFactory(
      getCredential(walletAddress),
      getAuthMethod(intentsAccountType),
    );

    switch (intentsAccountType) {
      case 'evm': {
        assertDefined(providers?.evm, 'No EVM provider configured');

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
        assertDefined(providers?.sol, 'No SOL provider configured');

        const signatureData = await providers.sol.signMessage(
          msg.SOLANA.message,
        );

        return {
          type: 'SOLANA',
          signatureData,
          signedData: msg.SOLANA,
        };
      }

      case 'near': {
        const nearProvider = providers?.near ? providers.near() : null;

        assertDefined(nearProvider?.signMessage, 'No NEAR provider configured');

        const signatureData = await nearProvider.signMessage({
          message: msg.NEP413.message,
          nonce: Buffer.from(msg.NEP413.nonce),
          recipient: msg.NEP413.recipient,
        });

        assertDefined(signatureData, 'No public key returned from NEAR wallet');

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

      case 'stellar': {
        assertDefined(providers?.stellar, 'No Stellar provider configured');

        const { signedMessage } = await providers.stellar.signMessage(
          msg.STELLAR.message,
        );

        const signature = new Uint8Array(Buffer.from(signedMessage, 'base64'));

        return {
          type: 'STELLAR_SEP53',
          signatureData: signature,
          signedData: msg.STELLAR,
        };
      }

      case 'webauthn': {
        assertDefined(providers?.webauthn, 'No passkey provider configured');

        const signatureData = await providers.webauthn.signChallenge(
          msg.WEBAUTHN.challenge,
        );

        return {
          type: 'WEBAUTHN',
          signatureData,
          signedData: msg.WEBAUTHN,
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
        getCredential(walletAddress!),
        getAuthMethod(intentsAccountType),
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
