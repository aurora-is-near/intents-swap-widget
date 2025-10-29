import './tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAppKit } from './appkit-config';
import { TonWidgetDemo } from './TonWidgetDemo';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

container.className = 'sw';

const root = createRoot(container);

createAppKit();

root.render(
  <StrictMode>
    <TonWidgetDemo />
  </StrictMode>,
);
