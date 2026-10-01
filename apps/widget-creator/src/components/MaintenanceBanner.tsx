import { useOneClickStatus } from '@/api/hooks';

export const MaintenanceBanner = () => {
  const { data } = useOneClickStatus();

  if (!data?.isDisrupted) {
    return null;
  }

  return (
    <div
      role="status"
      className="w-full shrink-0 flex items-center justify-center gap-csw-md px-csw-2xl py-csw-lg bg-csw-status-warning">
      <p className="text-csw-body-md text-csw-gray-950 text-center">
        Intents is currently under maintenance, all swaps are temporarily
        deactivated. Quotes and swapping will return as soon as maintenance
        completes.
      </p>
    </div>
  );
};
