import './tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { createAppKit } from './appkit-config';
import { Page } from './components/Page';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

container.className = 'sw';

const root = createRoot(container);

createAppKit();

const getTonConnectManifestUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/tonconnect-manifest.json`;
  }

  return '/tonconnect-manifest.json';
};

root.render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={getTonConnectManifestUrl()}>
      <Page />
    </TonConnectUIProvider>
  </StrictMode>,
);
