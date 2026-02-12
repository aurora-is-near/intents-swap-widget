import type { ListenerProps } from './types';
import { useConfig } from '../../config';
import { useAlchemyBalanceIntegration } from '@/ext/alchemy';

export type Props = ListenerProps & {
  alchemyApiKey: string | undefined;
};

export const useAlchemyBalanceEffect = ({
  isEnabled,
  alchemyApiKey,
}: Props) => {
  const { connectedWallets } = useConfig();

  useAlchemyBalanceIntegration({
    isEnabled,
    connectedWallets,
    alchemyApiKey: alchemyApiKey ?? '',
  });
};
