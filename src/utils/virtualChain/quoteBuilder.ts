import { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript';

import type { Token } from '@/types/token';
import {
  getVirtualChainConfig,
  getVirtualChainTokenMapping,
} from '@/constants/virtualChains';
import { getEvmRecipient } from './addressConverter';

export function addVirtualChainParams(
  params: any,
  recipient: string,
  refundRecipient?: string,
): void {
  const evmRecipient = getEvmRecipient(recipient);
  const evmRefundRecipient = refundRecipient
    ? getEvmRecipient(refundRecipient)
    : evmRecipient;

  params.virtualChainRecipient = evmRecipient;
  params.virtualChainRefundRecipient = evmRefundRecipient;
}

interface BuildVirtualChainDepositParams {
  commonQuoteParams: any;
  virtualChain: string;
  intentsAccountId: string;
  destinationAssetId: string;
  targetWalletAddress: string;
}

export function buildVirtualChainDepositParams({
  commonQuoteParams,
  intentsAccountId,
  destinationAssetId,
  targetWalletAddress,
}: BuildVirtualChainDepositParams) {
  const quoteParams: any = {
    ...commonQuoteParams,
    recipient: intentsAccountId,
    recipientType: QuoteRequest.recipientType.INTENTS,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    destinationAsset: destinationAssetId,
    refundTo: intentsAccountId,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  };

  addVirtualChainParams(quoteParams, targetWalletAddress, targetWalletAddress);

  return quoteParams;
}

interface BuildVirtualChainWithdrawalParams {
  commonQuoteParams: any;
  virtualChain: string;
  targetToken: Token;
  sendAddress?: string;
  intentsAccountId: string;
  targetWalletAddress: string;
}

export function buildVirtualChainWithdrawalParams({
  commonQuoteParams,
  targetToken,
  sendAddress,
  intentsAccountId,
  targetWalletAddress,
}: BuildVirtualChainWithdrawalParams) {
  const quoteParams: any = {
    ...commonQuoteParams,
    originAsset: targetToken.assetId,
    recipient: sendAddress || intentsAccountId,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    destinationAsset: targetToken.assetId,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    refundTo: intentsAccountId,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
  };

  addVirtualChainParams(quoteParams, targetWalletAddress, targetWalletAddress);

  return quoteParams;
}

interface BuildIntoVirtualChainParams {
  commonQuoteParams: any;
  virtualChain: string;
  targetToken: Token;
  sendAddress?: string;
  targetWalletAddress: string;
  intentsAccountId: string;
}

export function buildIntoVirtualChainParams({
  commonQuoteParams,
  virtualChain,
  targetToken,
  sendAddress,
  targetWalletAddress,
  intentsAccountId,
}: BuildIntoVirtualChainParams) {
  const config = getVirtualChainConfig(virtualChain);
  if (!config) {
    throw new Error(`Virtual chain ${virtualChain} is not configured`);
  }

  const nearAssetId = targetToken.contractAddress
    ? getVirtualChainTokenMapping(virtualChain, targetToken.contractAddress)
    : null;

  if (!nearAssetId) {
    throw new Error(
      `Token ${targetToken.symbol} does not have a NEAR-bridged equivalent for ${config.name}`,
    );
  }

  const recipient = sendAddress || targetWalletAddress;
  const evmRecipient = config.isEvm ? getEvmRecipient(recipient) : recipient;

  const quoteParams: any = {
    ...commonQuoteParams,
    recipient: config.chainId,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    destinationAsset: nearAssetId,
    depositType: QuoteRequest.depositType.INTENTS,
    refundTo: intentsAccountId,
    refundType: QuoteRequest.refundType.INTENTS,
  };

  if (config.isEvm) {
    addVirtualChainParams(quoteParams, evmRecipient, evmRecipient);
  }

  return quoteParams;
}

interface BuildSwapWithVirtualChainParams {
  commonQuoteParams: any;
  sourceToken: Token;
  targetToken: Token;
  intentsAccountId: string;
  sendAddress?: string;
  targetWalletAddress: string;
}

export function buildSwapWithVirtualChainParams({
  commonQuoteParams,
  sourceToken,
  targetToken,
  intentsAccountId,
  sendAddress,
  targetWalletAddress,
}: BuildSwapWithVirtualChainParams) {
  const sourceConfig = getVirtualChainConfig(sourceToken.blockchain);
  const targetConfig = getVirtualChainConfig(targetToken.blockchain);

  let originAsset = commonQuoteParams.originAsset;
  if (sourceConfig && sourceToken.contractAddress && !sourceToken.isIntent) {
    const nearAssetId = getVirtualChainTokenMapping(
      sourceToken.blockchain,
      sourceToken.contractAddress,
    );

    if (!nearAssetId) {
      throw new Error(
        `${sourceToken.symbol} cannot be withdrawn from ${sourceConfig.name}. This token is not bridged to NEAR.`,
      );
    }

    originAsset = nearAssetId;
  }

  let destinationAsset = targetToken.assetId;
  if (targetConfig && targetToken.contractAddress && !sourceToken.isIntent) {
    const nearAssetId = getVirtualChainTokenMapping(
      targetToken.blockchain,
      targetToken.contractAddress,
    );

    if (!nearAssetId) {
      throw new Error(
        `${targetToken.symbol} cannot be used as destination from external chains. This token is not bridged to NEAR.`,
      );
    }

    destinationAsset = nearAssetId;
  }

  let refundTo = targetWalletAddress;
  let refundType = QuoteRequest.refundType.ORIGIN_CHAIN;

  if (sourceToken.isIntent) {
    refundTo = intentsAccountId;
    refundType = QuoteRequest.refundType.INTENTS;
  } else if (sourceConfig && !targetConfig) {
    refundTo = intentsAccountId;
    refundType = QuoteRequest.refundType.INTENTS;
  } else if (targetConfig && !sourceToken.isIntent) {
    refundTo = intentsAccountId;
    refundType = QuoteRequest.refundType.ORIGIN_CHAIN;
  }

  const quoteParams: any = {
    ...commonQuoteParams,
    originAsset,
    recipient:
      !targetToken.isIntent && sendAddress ? sendAddress : intentsAccountId,
    recipientType: targetToken.isIntent
      ? QuoteRequest.recipientType.INTENTS
      : QuoteRequest.recipientType.DESTINATION_CHAIN,
    destinationAsset,
    depositType: sourceToken.isIntent
      ? QuoteRequest.depositType.INTENTS
      : QuoteRequest.depositType.ORIGIN_CHAIN,
    refundTo,
    refundType,
  };

  if (sourceConfig?.isEvm && targetWalletAddress) {
    addVirtualChainParams(quoteParams, targetWalletAddress);
  }

  if (targetConfig && !sourceToken.isIntent) {
    quoteParams.recipient = targetConfig.chainId;
    quoteParams.recipientType = QuoteRequest.recipientType.DESTINATION_CHAIN;

    if (targetConfig.isEvm && targetWalletAddress) {
      const recipientAddress = sendAddress || targetWalletAddress;
      addVirtualChainParams(quoteParams, recipientAddress, targetWalletAddress);
    }
  }

  return quoteParams;
}
