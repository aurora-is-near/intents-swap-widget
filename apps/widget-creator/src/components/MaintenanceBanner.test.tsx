import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMaintenanceStatus } from '@/api/hooks';
import { SHIELD_STATUS_URL } from '@/constants';

import { MaintenanceBanner } from './MaintenanceBanner';

vi.mock('@/api/hooks', () => ({
  useMaintenanceStatus: vi.fn(),
}));

const mockUseMaintenanceStatus = vi.mocked(useMaintenanceStatus);

const withStatus = (data: { isUnderMaintenance: boolean } | undefined) => {
  mockUseMaintenanceStatus.mockReturnValue({ data } as ReturnType<
    typeof useMaintenanceStatus
  >);
};

describe('MaintenanceBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links to the Shield status page during maintenance', () => {
    withStatus({ isUnderMaintenance: true });

    render(<MaintenanceBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/under maintenance/i);
    expect(screen.getByRole('link', { name: /status page/i })).toHaveAttribute(
      'href',
      SHIELD_STATUS_URL,
    );
  });

  it('keeps an empty status region when there is no maintenance', () => {
    withStatus({ isUnderMaintenance: false });

    render(<MaintenanceBanner />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('keeps an empty status region while the status is loading', () => {
    withStatus(undefined);

    render(<MaintenanceBanner />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
