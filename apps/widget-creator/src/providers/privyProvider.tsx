import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import type { PropsWithChildren } from 'react';

import { PRIVY_APP_ID } from '@/constants';

export const PrivyProvider = ({ children }: PropsWithChildren) => (
  <BasePrivyProvider
    appId={PRIVY_APP_ID}
    config={{
      loginMethods: ['email'],
      appearance: {
        theme: 'dark',
        logo: undefined,
        accentColor: '#6A6FF5',
      },
      embeddedWallets: {
        createOnLogin: 'off',
      },
    }}>
    {children}
  </BasePrivyProvider>
);
