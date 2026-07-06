import type { WidgetEnvironment } from '@aurora-is-near/intents-swap-widget';

export const APP_ENV: WidgetEnvironment =
  import.meta.env.VITE_APP_ENV === 'staging' ? 'staging' : 'production';
