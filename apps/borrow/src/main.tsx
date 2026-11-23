import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { createAppRouter } from './router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('index.html has no #root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App router={createAppRouter()} />
  </StrictMode>,
);
