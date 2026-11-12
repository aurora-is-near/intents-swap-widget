import { beforeEach, describe, expect, it, vi } from 'vitest';

import { feeServiceClient } from '../network';
import { getMaintenanceStatus } from './getMaintenanceStatus';

vi.mock('../network', () => ({
  feeServiceClient: { get: vi.fn() },
}));

const mockGet = vi.mocked(feeServiceClient.get);

const maintenanceWindow = {
  name: 'Solana upgrade',
  description: 'Solana deposits are paused',
  scopes: [{ scopeType: 'chain', scopeValue: 'sol' }],
  direction: 'both',
  startsAt: '2026-11-12T10:00:00.000Z',
  finishesAt: '2026-11-12T12:00:00.000Z',
};

const respondWith = (data: unknown) => {
  mockGet.mockResolvedValueOnce({ data });
};

describe('getMaintenanceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the fee service for incidents', async () => {
    respondWith({ status: 'operational', maintenance: [] });

    await getMaintenanceStatus();

    expect(mockGet).toHaveBeenCalledWith('/incidents/widget-creator');
  });

  it('is not under maintenance when everything is operational', async () => {
    respondWith({ status: 'operational', maintenance: [] });

    await expect(getMaintenanceStatus()).resolves.toEqual({
      isUnderMaintenance: false,
    });
  });

  it('ignores chain incidents', async () => {
    respondWith({
      status: 'incidents',
      incidents: [{ name: 'Bitcoin deposits delayed' }],
      maintenance: [],
    });

    await expect(getMaintenanceStatus()).resolves.toEqual({
      isUnderMaintenance: false,
    });
  });

  it('is under maintenance when a window is in progress', async () => {
    respondWith({ status: 'operational', maintenance: [maintenanceWindow] });

    await expect(getMaintenanceStatus()).resolves.toEqual({
      isUnderMaintenance: true,
    });
  });

  it('is not under maintenance when the response has no maintenance list', async () => {
    respondWith({ status: 'operational' });

    await expect(getMaintenanceStatus()).resolves.toEqual({
      isUnderMaintenance: false,
    });
  });
});
