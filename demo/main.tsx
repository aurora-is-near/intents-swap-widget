import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { globalStyles } from './globalStyles';

import '../src/tailwind.css';
import App from './App';

// Inject styles directly into the document head to bypass Vite's CSS processing
const styleElement = document.createElement('style');

styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

const queryClient = new QueryClient();

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
