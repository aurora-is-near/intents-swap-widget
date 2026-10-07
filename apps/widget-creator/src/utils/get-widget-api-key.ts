import { DEFAULT_APP_KEY, PLACEHOLDER_APP_KEY } from '@/constants';

// The API key the preview widget runs with: the user's own key once set,
// otherwise the default one.
export const getWidgetApiKey = (apiKey: string | undefined): string =>
  apiKey && apiKey !== PLACEHOLDER_APP_KEY ? apiKey : DEFAULT_APP_KEY;
