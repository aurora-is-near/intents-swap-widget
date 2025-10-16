import {
  buildVirtualChainDepositParams,
  buildVirtualChainWithdrawalParams,
  buildIntoVirtualChainParams,
  buildSwapWithVirtualChainParams,
  addVirtualChainParams as addVirtualChainParamsGeneric,
} from '@/utils/virtualChain';

export function addVirtualChainParams(
  params: any,
  recipient: string,
  refundRecipient?: string,
): void {
  return addVirtualChainParamsGeneric(params, recipient, refundRecipient);
}

export function buildAuroraDepositParams(options: {
  commonQuoteParams: any;
  intentsAccountId: string;
  destinationAssetId: string;
  targetWalletAddress: string;
}) {
  return buildVirtualChainDepositParams({
    ...options,
    virtualChain: 'aurora',
  });
}

export function buildAuroraOutOfVCParams(options: {
  commonQuoteParams: any;
  targetToken: any;
  sendAddress?: string;
  intentsAccountId: string;
  targetWalletAddress: string;
}) {
  return buildVirtualChainWithdrawalParams({
    ...options,
    virtualChain: 'aurora',
  });
}

export function buildAuroraIntoVCParams(options: {
  commonQuoteParams: any;
  targetToken: any;
  sendAddress?: string;
  targetWalletAddress: string;
  intentsAccountId: string;
  depositType: any;
}) {
  return buildIntoVirtualChainParams({
    ...options,
    virtualChain: 'aurora',
  });
}

export function buildSwapQuoteParams(options: {
  commonQuoteParams: any;
  sourceToken: any;
  targetToken: any;
  intentsAccountId: string;
  sendAddress?: string;
  targetWalletAddress: string;
}) {
  return buildSwapWithVirtualChainParams(options);
}
