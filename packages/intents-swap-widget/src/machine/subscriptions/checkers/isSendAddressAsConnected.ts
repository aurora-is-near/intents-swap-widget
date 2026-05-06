import { snapshot } from 'valtio';

import { configStore } from '@/config';

import type { Context, ContextChange } from '@/machine/context';
import { getSupportedChains } from '../../../utils/chains/getSupportedChains';

export const isSendAddressAsConnected = (
  ctx: Context,
  changes: ContextChange[],
) => {
  const { config } = snapshot(configStore);
  const { walletSupportedChains } = config;
  const { walletAddress } = ctx;
  const supportedChains = getSupportedChains({
    walletAddress,
    walletSupportedChains,
  });

  return (
    ctx.targetToken &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    !ctx.targetToken.isIntent &&
    !changes.find((change) => change?.key === 'sendAddress') &&
    supportedChains.includes(ctx.targetToken.blockchain)
  );
};
