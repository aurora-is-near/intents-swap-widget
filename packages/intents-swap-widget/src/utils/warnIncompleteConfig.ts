import { logger } from '@/logger';
import type { WidgetConfig } from '@/types/config';

const STUDIO_URL = 'https://studio.aurora.dev';

const API_KEY_OVERRIDES = [
  'fetchQuote',
  'fetchSourceTokens',
  'fetchTargetTokens',
] as const satisfies ReadonlyArray<keyof WidgetConfig>;

let hasWarned = false;

export const warnIncompleteConfig = (config: Partial<WidgetConfig>) => {
  const isComplete =
    !!config.apiKey ||
    API_KEY_OVERRIDES.every((property) => !!config[property]);

  if (isComplete) {
    hasWarned = false;

    return;
  }

  if (hasWarned) {
    return;
  }

  hasWarned = true;

  logger.warn(
    '[WIDGET] No widget API key is configured.\n' +
      `Get one at ${STUDIO_URL} and pass it as \`apiKey\`, or provide your own API implementations in the widget config.`,
  );
};
