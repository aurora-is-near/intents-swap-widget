import { useCallback } from 'react';
import { ethers } from 'ethers';
import {
  buildExitToNearTransaction,
  type ExitToNearParams,
} from '@/utils/aurora/auroraExitPrecompile';
import { TransferError } from '@/errors';
import { logger } from '@/logger';

interface UseAuroraExitToNearProps {
  provider?: ethers.BrowserProvider | (() => Promise<any>) | null;
}

/**
 * Hook for handling Aurora exitToNear precompile calls
 * Used for Out of VC transfers from Aurora to NEAR
 */
export function useAuroraExitToNear({ provider }: UseAuroraExitToNearProps) {
  const executeExitToNear = useCallback(
    async (params: ExitToNearParams): Promise<string> => {
      if (!provider || typeof provider === 'function') {
        throw new TransferError({
          code: 'TRANSFER_INVALID_INITIAL',
          meta: { message: 'No Aurora provider available' },
        });
      }

      try {
        const signer = await provider.getSigner();
        const fromAddress = await signer.getAddress();

        // Build the transaction
        const tx = buildExitToNearTransaction(params, fromAddress);

        logger.info('[AURORA] Executing exitToNear precompile', {
          receiver: params.receiver,
          amount: params.amount,
          tokenAddress: params.tokenAddress,
          from: fromAddress,
        });

        // Send the transaction
        const txResponse = await signer.sendTransaction(tx);

        // Wait for confirmation
        const receipt = await txResponse.wait();

        if (!receipt || receipt.status === 0) {
          throw new TransferError({ code: 'DIRECT_TRANSFER_ERROR' });
        }

        logger.info('[AURORA] exitToNear transaction successful', {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
        });

        return receipt.hash;
      } catch (error) {
        logger.error('[AURORA] exitToNear failed', error);

        if (error instanceof TransferError) {
          throw error;
        }

        throw new TransferError({ code: 'DIRECT_TRANSFER_ERROR' });
      }
    },
    [provider],
  );

  return { executeExitToNear };
}
