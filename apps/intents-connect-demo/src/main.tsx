import { createRoot } from 'react-dom/client';

import '@aurora-is-near/intents-swap-widget/styles.css';

import './index.css';
import { App } from './App';

// No StrictMode: the widget's state machine misbehaves under double-invocation
// (same guidance its own standalone docs give).
createRoot(document.getElementById('root')!).render(<App />);
