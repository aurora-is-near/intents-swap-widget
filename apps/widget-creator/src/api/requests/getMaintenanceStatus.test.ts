import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { feeServiceClient } from '../network';
import { getMaintenanceStatus } from './getMaintenanceStatus';

vi.mock('../network', () => ({
  feeServiceClient: { get: vi.fn() },
}));

const mockGet = vi.mocked(feeServiceClient.get);

const NOW = new Date('2026-11-12T11:00:00.000Z');

// Shapes as the fee service sends them.
const chainIncident = {
  id: 'f3258a84-8547-4dd2-9b5c-982304397620',
  scopeType: 'chain',
  scopeValue: 'stellar',
  direction: 'deposit',
  status: 'active',
  publicDescription: null,
  description: null,
  createdAt: '2026-11-05T21:26:44.638Z',
  updatedAt: '2026-11-05T21:26:44.638Z',
  resolvedAt: null,
};

const maintenanceWindow = {
  name: 'Solana upgrade',
  description: 'Solana deposits are paused',
  scopes: [{ scopeType: 'chain', scopeValue: 'sol' }],
  direction: '*',
  startsAt: '2026-11-12T10:00:00.000Z',
  finishesAt: '2026-11-12T12:00:00.000Z',
};

const respondWith = (data: unknown) => {
  mockGet.mockResolvedValueOnce({ data });
};

const expectMaintenance = (isUnderMaintenance: boolean) =>
  expect(getMaintenanceStatus()).resolves.toEqual({ isUnderMaintenance });

describe('getMaintenanceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the fee service for incidents', async () => {
    respondWith({ status: 'operational', maintenance: [] });

    await getMaintenanceStatus();

    expect(mockGet).toHaveBeenCalledWith('/incidents/widget-creator');
  });

  it('is not under maintenance when everything is operational', async () => {
    respondWith({ status: 'operational', maintenance: [] });

    await expectMaintenance(false);
  });

  it('ignores chain incidents', async () => {
    respondWith({
      status: 'incidents',
      incidents: [chainIncident],
      maintenance: [],
    });

    await expectMaintenance(false);
  });

  it('is under maintenance when a window is in progress', async () => {
    respondWith({ status: 'operational', maintenance: [maintenanceWindow] });

    await expectMaintenance(true);
  });

  it('is under maintenance during incidents too, when a window is in progress', async () => {
    respondWith({
      status: 'incidents',
      incidents: [chainIncident],
      maintenance: [maintenanceWindow],
    });

    await expectMaintenance(true);
  });

  it('counts a started window with no end', async () => {
    respondWith({
      status: 'operational',
      maintenance: [{ ...maintenanceWindow, finishesAt: null }],
    });

    await expectMaintenance(true);
  });

  it('ignores a window that has not started yet', async () => {
    respondWith({
      status: 'operational',
      maintenance: [
        {
          ...maintenanceWindow,
          startsAt: '2026-11-12T11:30:00.000Z',
          finishesAt: '2026-11-12T13:00:00.000Z',
        },
      ],
    });

    await expectMaintenance(false);
  });

  it('ignores a window that has finished', async () => {
    respondWith({
      status: 'operational',
      maintenance: [
        {
          ...maintenanceWindow,
          startsAt: '2026-11-12T08:00:00.000Z',
          finishesAt: '2026-11-12T10:30:00.000Z',
        },
      ],
    });

    await expectMaintenance(false);
  });

  it('ignores malformed windows', async () => {
    respondWith({
      status: 'operational',
      maintenance: [null, {}, { ...maintenanceWindow, startsAt: 'not a date' }],
    });

    await expectMaintenance(false);
  });

  it('is not under maintenance when the response has no maintenance list', async () => {
    respondWith({ status: 'operational' });

    await expectMaintenance(false);
  });

  it('is not under maintenance when the maintenance list is null', async () => {
    respondWith({ status: 'operational', maintenance: null });

    await expectMaintenance(false);
  });

  it('is not under maintenance when the response is not JSON', async () => {
    respondWith('<!doctype html><html></html>');

    await expectMaintenance(false);
  });
});
