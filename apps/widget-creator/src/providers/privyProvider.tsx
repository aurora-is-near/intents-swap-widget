import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import type { PropsWithChildren } from 'react';

if (!import.meta.env.VITE_PRIVY_APP_ID) {
  throw new Error('VITE_PRIVY_APP_ID environment variable is not defined');
}

export const PrivyProvider = ({ children }: PropsWithChildren) => (
  <BasePrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
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
