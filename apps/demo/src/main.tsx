import './tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createAppKit } from './appkit-config';
import { App } from './App';

const container = document.getElementById('root');


if (!container) {
  throw new Error('Root element not found');
}

container.className = 'sw';

const root = createRoot(container);

createAppKit();

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
