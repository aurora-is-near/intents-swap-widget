import { useMaintenanceStatus } from '@/api/hooks';
import { SHIELD_STATUS_URL } from '@/constants';

export const MaintenanceBanner = () => {
  const { data } = useMaintenanceStatus();

  // The live region stays mounted even when empty: screen readers only announce
  // content added to a region that's already on the page.
  return (
    <div role="status" className="w-full shrink-0">
      {data?.isUnderMaintenance && (
        <div className="flex items-center justify-center gap-csw-md px-csw-2xl py-csw-lg bg-csw-status-warning">
          <p className="text-csw-body-md text-csw-gray-950 text-center">
            Intents is currently under maintenance, some features may be
            temporarily inactive. Check{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={SHIELD_STATUS_URL}
              className="text-csw-accent-700 underline">
              status page
            </a>{' '}
            for updates.
          </p>
        </div>
      )}
    </div>
  );
};
