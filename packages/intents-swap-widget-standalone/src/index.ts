export * from '@aurora-is-near/intents-swap-widget';

// Override the WidgetConfigProvider from the core package with the standalone version
export {
  StandaloneWidgetConfigProvider as WidgetConfigProvider,
  type StandaloneWidgetConfigProviderProps as WidgetConfigProviderProps,
} from './StandaloneWidgetConfigProvider';
