import { createRoot } from 'react-dom/client';

import './styles/tailwind.css';

import { App } from './App';

// No StrictMode: the widget's state machine misbehaves under double effects.
const render = () =>
  createRoot(document.getElementById('root')!).render(<App />);

// Outside the extension (UI work in a plain tab) there is no chrome.storage.
if (import.meta.env.DEV && !globalThis.chrome?.storage) {
  import('./devChromeShim').then(render, render);
} else {
  render();
}
