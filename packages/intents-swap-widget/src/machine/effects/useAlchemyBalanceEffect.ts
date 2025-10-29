import { useAlchemyBalanceIntegration } from '@/ext/alchemy';

import { useUnsafeSnapshot } from '@/machine/snap';

import type { ListenerProps } from './types';

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useAlchemyBalanceEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();

  useAlchemyBalanceIntegration({
    isEnabled,
    walletAddress: ctx.walletAddress,
    alchemyApiKey: alchemyApiKey ?? '',
  });
};
