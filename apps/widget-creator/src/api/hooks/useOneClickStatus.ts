import { useQuery } from '@tanstack/react-query';

import { getOneClickStatus } from '../requests/getOneClickStatus';

const ONE_MINUTE = 60 * 1000;

export const useOneClickStatus = () => {
  return useQuery({
    queryKey: ['oneClickStatus'],
    queryFn: getOneClickStatus,
    refetchInterval: ONE_MINUTE,
  });
};
