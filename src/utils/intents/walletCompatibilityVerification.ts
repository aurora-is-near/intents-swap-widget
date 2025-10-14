import type { CodeResult } from 'near-api-js/lib/providers/provider';
import {
  authIdentity,
  type AuthMethod,
  messageFactory,
  prepareBroadcastRequest,
  type walletMessage,
} from '@defuse-protocol/internal-utils';
import { nearRpcClient } from '../near/rpc';

/**
 * Serializes a signed intent into the protocol's wire format
 * Transforms both signature and message data into the standardized
 * encoding expected by the Near Intents Protocol
 *
 * @param signature The signature result from the wallet
 * @param credentials The signer's credentials
 * @returns Intent data serialized in protocol wire format
 */
function formatSignedIntent(
  signature: walletMessage.WalletSignatureResult,
  credentials: SignerCredentials,
): ReturnType<typeof prepareBroadcastRequest.prepareSwapSignedData> {
  return prepareBroadcastRequest.prepareSwapSignedData(signature, {
    userAddress: credentials.credential,
    userChainType: credentials.credentialType,
  });
}

function formatUserIdentity(credentials: SignerCredentials): IntentsUserId {
  return authIdentity.authHandleToIntentsUserId(
    credentials.credential,
    credentials.credentialType,
  );
}

function resolveSignerId(
  signerId: IntentsUserId | SignerCredentials,
): IntentsUserId {
  return typeof signerId === 'string' ? signerId : formatUserIdentity(signerId);
}

function createWalletVerificationMessage(
  options: IntentMessageConfig,
  chainType?: string,
): walletMessage.WalletMessage {
  const baseMessage = messageFactory.makeEmptyMessage({
    signerId: resolveSignerId(options.signerId),
    deadlineTimestamp: options.deadlineTimestamp ?? Date.now() + 5 * 60 * 1000,
    nonce: options.nonce,
  });

  // For Tron wallets, we need to add a field to ensure message size compatibility
  // with Tron Ledger app requirements (>225 bytes to avoid signing bugs)
  if (chainType === 'tron') {
    const tronMessage = JSON.parse(baseMessage.TRON.message);
    const extendedMessage = {
      ...tronMessage,
      message_size_validation:
        'Validates message size compatibility with wallet signing requirements.',
    };

    return {
      ...baseMessage,
      TRON: {
        ...baseMessage.TRON,
        message: JSON.stringify(extendedMessage, null, 2),
      },
    };
  }

  return baseMessage;
}

export async function verifyWalletSignature(
  signature: Parameters<typeof formatSignedIntent>[0],
  credential: string,
  credentialType: AuthMethod,
): Promise<boolean> {
  if (
    /**
     * NEP-413 signatures can't be verified onchain for explicit account IDs (e.g., foo.near)
     * until the user sends a one-time transaction to register their public key with the account.
     * So we fall back to local verification.
     */
    signature.type === 'NEP413'
  ) {
    return signature.signatureData.accountId === credential;
  }

  const signedIntent = formatSignedIntent(signature, {
    credential,
    credentialType,
  });

  try {
    // Warning: `CodeResult` is not correct type for `call_function`, but it's closest we have.
    await nearRpcClient.query<CodeResult>({
      request_type: 'call_function',
      account_id: 'intents.near',
      method_name: 'simulate_intents',
      args_base64: btoa(JSON.stringify({ signed: [signedIntent] })),
      finality: 'optimistic',
    });

    // If didn't throw, signature is valid
    return true;
  } catch (err) {
    return false;
  }
}

export function walletVerificationMessageFactory(
  credential: string,
  credentialType: AuthMethod,
) {
  return createWalletVerificationMessage(
    {
      signerId: { credential, credentialType },
    },
    credentialType,
  );
}

type IntentsUserId = string & { __brand: 'IntentsUserId' };
interface IntentMessageConfig {
  /**
   * User identifier either as DefuseUserId or SignerCredentials
   * If SignerCredentials is provided, it will be converted to DefuseUserId
   */
  signerId: IntentsUserId | SignerCredentials;
  /**
   * Optional deadline timestamp in milliseconds
   * @default 5 minutes from now
   */
  deadlineTimestamp?: number;
  /**
   * Optional nonce for tracking
   * @default random nonce
   */
  nonce?: Uint8Array;
  /**
   * Optional referral code for tracking
   */
  referral?: string;
  /**
   * Optional message to attach to the intent
   */
  memo?: string;
}

interface SignerCredentials {
  /** The credential (blockchain address or WebAuthn public key) that will sign or has signed the intent */
  credential: string;
  /** The type of credential (chain or authentication method) */
  credentialType: AuthMethod;
}
