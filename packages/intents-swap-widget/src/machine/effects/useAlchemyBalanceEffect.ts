import type { ListenerProps } from './types';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';

import { useUnsafeSnapshot } from '@/machine/snap';

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
