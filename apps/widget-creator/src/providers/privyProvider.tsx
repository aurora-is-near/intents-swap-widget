import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import type { PropsWithChildren } from 'react';

export const PrivyProvider = ({ children }: PropsWithChildren) => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    return children;
  }

  return (
    <BasePrivyProvider
      appId={appId}
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
};
