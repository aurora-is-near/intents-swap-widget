import { snapshot } from 'valtio';

import { configStore } from '@/config';

import type { Context, ContextChange } from '@/machine/context';

export const isSendAddressAsConnected = (
  ctx: Context,
  changes: ContextChange[],
) => {
  const { config } = snapshot(configStore);

  return (
    ctx.targetToken &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    !ctx.targetToken.isIntent &&
    !changes.find((change) => change?.key === 'sendAddress') &&
    config.walletSupportedChains.includes(ctx.targetToken.blockchain)
  );
};
