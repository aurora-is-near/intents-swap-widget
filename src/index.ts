import './tailwind.css'; // import so CSS is emitted in dist

// Initialize quote handlers
import { initializeQuoteHandlers } from './utils/quotes/registry';
initializeQuoteHandlers();

export { WidgetConfigProvider } from './config';
export { DEFAULT_RPCS } from './rpcs';

export * from './components';
export * from './features';
export * from './hooks';
export * from './machine';
export * from './ext';
export * from './types';
export * from './utils';
export * from './errors';
export * from './widgets';
