import { useAlchemyBalanceIntegration } from '@/ext/alchemy';
import type { ListenerProps } from './types';
import { useConfig } from '../../config';

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
