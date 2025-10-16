import axios, { type AxiosError } from 'axios';
import type { AuroraTokensResponse } from './types';
import { AURORA_API_ENDPOINTS } from '@/constants/aurora';
import { logger } from '@/logger';

/**
 * Load Aurora tokens from the Explorer API with retry logic
 * Implements exponential backoff and proper error handling
 */
export async function loadAuroraTokens(): Promise<AuroraTokensResponse> {
  let retries = 0;

  while (retries < AURORA_API_ENDPOINTS.maxRetries) {
    try {
      const { data } = await axios.get<AuroraTokensResponse>(
        AURORA_API_ENDPOINTS.tokensApi,
        {
          timeout: 10000, // 10 second timeout
          headers: {
            Accept: 'application/json',
          },
        },
      );

      return data as AuroraTokensResponse;
    } catch (error) {
      retries += 1;

      const isLastRetry = retries === AURORA_API_ENDPOINTS.maxRetries;
      const axiosError = error as AxiosError;

      logger.error(
        `[Aurora] Failed to fetch tokens (attempt ${retries}/${AURORA_API_ENDPOINTS.maxRetries})`,
        {
          error: axiosError.message,
          status: axiosError.response?.status,
        },
      );

      if (isLastRetry) {
        // Return empty response on final failure
        return { items: [], next_page_params: null };
      }

      // Exponential backoff
      const delayMs = AURORA_API_ENDPOINTS.retryDelay * retries;

      // eslint-disable-next-line no-await-in-loop -- intentional sequential retries
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  // Fallback (should never reach here)
  return { items: [], next_page_params: null };
}
