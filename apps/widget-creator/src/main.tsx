import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { PrivyProvider } from './providers';

import '@aurora-is-near/intents-swap-widget/styles.css';
import './tailwind.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider>
      <App />
    </PrivyProvider>
  </StrictMode>,
);
