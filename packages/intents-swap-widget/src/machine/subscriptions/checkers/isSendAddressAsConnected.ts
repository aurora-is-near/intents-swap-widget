import { useSupportedChains } from '../../../hooks/useSupportedChains';
import type { Context, ContextChange } from '@/machine/context';

export const isSendAddressAsConnected = (
  ctx: Context,
  changes: ContextChange[],
) => {
  const { supportedChains } = useSupportedChains();

  return (
    ctx.targetToken &&
    !ctx.sendAddress &&
    !!ctx.walletAddress &&
    !ctx.targetToken.isIntent &&
    !changes.find((change) => change?.key === 'sendAddress') &&
    supportedChains.includes(ctx.targetToken.blockchain)
  );
};
