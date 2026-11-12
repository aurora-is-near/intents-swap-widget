import { QueryClient } from '@tanstack/react-query';

import { logger } from '@/logger';
import { feeServiceApi } from '@/network';

import {
  fetchFeeServiceIncidents,
  getChainIncidents,
  INCIDENTS_STALE_TIME_MS,
  INCIDENTS_WAIT_MS,
} from './feeServiceIncidents';

jest.mock('@/network', () => ({ feeServiceApi: { get: jest.fn() } }));

const mockGet = feeServiceApi.get as jest.Mock;

const maintenanceWindow = (overrides: Record<string, unknown> = {}) => ({
  name: 'Bridge maintenance',
  description: 'Maintenance',
  scopes: [{ scopeType: 'chain', scopeValue: '*' }],
  direction: '*',
  startsAt: '2026-11-12T10:00:00.000Z',
  finishesAt: '2026-11-12T12:00:00.000Z',
  ...overrides,
});

describe('fetchFeeServiceIncidents', () => {
  it('asks the fee service with the widget API key', async () => {
    mockGet.mockResolvedValue({ data: { status: 'operational' } });

    await fetchFeeServiceIncidents('test-key');

    expect(mockGet).toHaveBeenCalledWith('/api/incidents/test-key');
  });

  it('falls back to a placeholder key, which the fee service ignores', async () => {
    mockGet.mockResolvedValue({ data: { status: 'operational' } });

    await fetchFeeServiceIncidents(undefined);

    expect(mockGet).toHaveBeenCalledWith('/api/incidents/widget');
  });

  it('reads an operational status as no incidents', async () => {
    mockGet.mockResolvedValue({
      data: { status: 'operational', maintenance: [] },
    });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([]);
  });

  it('keeps chain and token incidents, dropping address blocks', async () => {
    mockGet.mockResolvedValue({
      data: {
        status: 'incidents',
        incidents: [
          {
            id: '1',
            scopeType: 'chain',
            scopeValue: 'eth',
            direction: 'withdraw',
            publicDescription: 'ETH withdrawals are delayed',
          },
          { scopeType: 'chain_all', scopeValue: 'sol', direction: null },
          { scopeType: 'token', scopeValue: 'nep141:wrap.near' },
          { scopeType: 'address', scopeValue: '0xabc', direction: '*' },
          { scopeType: 'chain' },
        ],
        maintenance: [],
      },
    });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([
      { scopeType: 'chain', scopeValue: 'eth', direction: 'withdraw' },
      { scopeType: 'chain_all', scopeValue: 'sol', direction: null },
      { scopeType: 'token', scopeValue: 'nep141:wrap.near' },
    ]);
  });

  it('turns each maintenance scope into a pause in its direction', async () => {
    mockGet.mockResolvedValue({
      data: {
        status: 'operational',
        maintenance: [
          maintenanceWindow(),
          maintenanceWindow({
            direction: 'deposit',
            scopes: [
              { scopeType: 'chain', scopeValue: 'btc' },
              { scopeType: 'address', scopeValue: 'bc1q' },
            ],
          }),
          { name: 'No scopes' },
        ],
      },
    });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([
      { scopeType: 'chain', scopeValue: '*', direction: '*' },
      { scopeType: 'chain', scopeValue: 'btc', direction: 'deposit' },
    ]);
  });

  it('drops incidents the fee service has resolved', async () => {
    mockGet.mockResolvedValue({
      data: {
        status: 'incidents',
        incidents: [
          {
            scopeType: 'chain',
            scopeValue: 'eth',
            status: 'active',
            resolvedAt: null,
          },
          {
            scopeType: 'chain',
            scopeValue: 'sol',
            status: 'active',
            resolvedAt: '2026-11-12T10:00:00.000Z',
          },
          { scopeType: 'chain', scopeValue: 'btc', status: 'resolved' },
        ],
      },
    });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([
      { scopeType: 'chain', scopeValue: 'eth' },
    ]);
  });

  it('reads a malformed body as no incidents', async () => {
    mockGet.mockResolvedValue({ data: { incidents: 'nope' } });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([]);
  });

  it('fails when the request fails, so the failure is not cached', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = new Error('Network Error');

    mockGet.mockRejectedValue(error);

    await expect(fetchFeeServiceIncidents('key')).rejects.toBe(error);
    expect(warn).toHaveBeenCalled();
  });
});

describe('getChainIncidents', () => {
  const ethIncident = { scopeType: 'chain', scopeValue: 'eth' };
  const solIncident = { scopeType: 'chain', scopeValue: 'sol' };

  const respondWith = (...incidents: unknown[]) =>
    mockGet.mockResolvedValueOnce({
      data: { status: 'incidents', incidents },
    });

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    mockGet.mockReset();
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
    jest.useRealTimers();
  });

  it('reuses incidents for a minute, then asks again', async () => {
    respondWith(ethIncident);
    respondWith(solIncident);

    await expect(getChainIncidents(queryClient, 'key')).resolves.toEqual([
      ethIncident,
    ]);

    jest.advanceTimersByTime(INCIDENTS_STALE_TIME_MS - 1);

    await expect(getChainIncidents(queryClient, 'key')).resolves.toEqual([
      ethIncident,
    ]);
    expect(mockGet).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2);

    await expect(getChainIncidents(queryClient, 'key')).resolves.toEqual([
      solIncident,
    ]);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('reads a failed request as no incidents, and asks again next time', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    respondWith(ethIncident);

    await expect(getChainIncidents(queryClient, 'key')).resolves.toEqual([]);
    await expect(getChainIncidents(queryClient, 'key')).resolves.toEqual([
      ethIncident,
    ]);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('stops waiting on a slow request', async () => {
    mockGet.mockReturnValueOnce(new Promise(() => {}));

    const incidents = getChainIncidents(queryClient, 'key');

    await jest.advanceTimersByTimeAsync(INCIDENTS_WAIT_MS);

    await expect(incidents).resolves.toEqual([]);
  });
});
