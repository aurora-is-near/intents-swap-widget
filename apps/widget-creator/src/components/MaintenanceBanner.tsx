import { useMaintenanceStatus } from '@/api/hooks';

export const MaintenanceBanner = () => {
  const { data } = useMaintenanceStatus();

  if (!data?.isUnderMaintenance) {
    return null;
  }

  return (
    <div
      role="status"
      className="w-full shrink-0 flex items-center justify-center gap-csw-md px-csw-2xl py-csw-lg bg-csw-status-warning">
      <p className="text-csw-body-md text-csw-gray-950 text-center">
        Intents is currently under maintenance, some features may be temporarily
        inactive. Check{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://partners.near-intents.org/shield/status"
          className="text-csw-accent-700 underline">
          status page
        </a>{' '}
        for updates.
      </p>
    </div>
  );
};
