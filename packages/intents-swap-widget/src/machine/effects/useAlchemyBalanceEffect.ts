import type { ListenerProps } from './types';
import { useConnectedWallets } from '@/hooks/useConnectedWallets';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useAlchemyBalanceEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { connectedWallets } = useConnectedWallets();

  useAlchemyBalanceIntegration({
    isEnabled,
    connectedWallets,
    alchemyApiKey: alchemyApiKey ?? '',
  });
};
