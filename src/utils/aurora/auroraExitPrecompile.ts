import { ethers } from 'ethers';
import { AURORA_BRIDGE_CONFIG } from '@/constants/aurora';

/**
 * Interface for exitToNear precompile parameters
 */
export interface ExitToNearParams {
  receiver: string; // NEAR account ID that will receive the tokens
  amount: string; // Amount to transfer (in wei for ETH or token units)
  tokenAddress?: string; // Token contract address (optional, omit for ETH)
}

/**
 * Generate calldata for exitToNear precompile
 * Used to move assets out of Aurora virtual chain to NEAR
 */
export function encodeExitToNearCall(params: ExitToNearParams): string {
  const iface = new ethers.Interface([
    'function exit_to_near(address token, uint256 amount, string receiver)',
    'function exit_to_near(uint256 amount, string receiver)', // For ETH transfers
  ]);

  if (params.tokenAddress) {
    // Token transfer
    return iface.encodeFunctionData('exit_to_near(address,uint256,string)', [
      params.tokenAddress,
      params.amount,
      params.receiver,
    ]);
  }

  // ETH transfer
  return iface.encodeFunctionData('exit_to_near(uint256,string)', [
    params.amount,
    params.receiver,
  ]);
}

/**
 * Build a transaction for exitToNear precompile
 */
export function buildExitToNearTransaction(
  params: ExitToNearParams,
  fromAddress: string,
): ethers.TransactionRequest {
  return {
    from: fromAddress,
    to: AURORA_BRIDGE_CONFIG.exitToNearPrecompile,
    data: encodeExitToNearCall(params),
    value: params.tokenAddress ? '0' : params.amount, // Send ETH value if it's an ETH transfer
  };
}
