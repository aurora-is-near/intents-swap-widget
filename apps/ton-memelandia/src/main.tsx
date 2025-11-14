import './tailwind.css';

import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { createAppKit } from './appkit-config';
import { Page } from './Page';

Sentry.init({
  dsn: 'https://d69b0ab8bdfa5560ab35c1001139df99@o4504157766942720.ingest.us.sentry.io/4510319653617664',
  sendDefaultPii: true,
  enableLogs: true,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ['error'] })],
});

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
