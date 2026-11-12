import { useQuery } from '@tanstack/react-query';

import { chainIncidentsQueryOptions } from '@/utils/feeServiceIncidents';
import { useConfig } from '../config';

/**
 * Loads chain incidents as the widget mounts, so the first failed quote can be
 * explained without waiting on another request. Later failures ask again once
 * these are a minute old.
 */
export const IncidentsLoader = () => {
  const { apiKey } = useConfig();

  useQuery(chainIncidentsQueryOptions(apiKey));

  return null;
};
