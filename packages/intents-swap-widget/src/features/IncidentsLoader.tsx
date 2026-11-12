import { useQuery } from '@tanstack/react-query';

import { chainIncidentsQueryOptions } from '@/utils/feeServiceIncidents';
import { useConfig } from '../config';

/**
 * Loads chain incidents once, as the widget mounts, so a failed quote can be
 * explained without waiting on another request.
 */
export const IncidentsLoader = () => {
  const { apiKey } = useConfig();

  useQuery(chainIncidentsQueryOptions(apiKey));

  return null;
};
