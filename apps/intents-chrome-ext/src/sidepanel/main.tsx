import { createRoot } from 'react-dom/client';

import './styles/tailwind.css';

import { App } from './App';

// No StrictMode: the widget's state machine misbehaves under double effects.
createRoot(document.getElementById('root')!).render(<App />);
