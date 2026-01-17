import { useConfig } from '../config';
import { Providers } from '../types';
import { useAppKitProviders } from './useAppKitProviders';

export const useProviders = (): { providers?: Providers } => {
  const appKitProviders = useAppKitProviders();
  const { enableStandaloneMode, providers } = useConfig();

  if (enableStandaloneMode) {
    return { providers: appKitProviders };
  }

  return { providers };
};
