import { logger } from '@/logger';
import { feeServiceApi } from '@/network';

import { fetchFeeServiceIncidents } from './feeServiceIncidents';

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

  it('reads a malformed body as no incidents', async () => {
    mockGet.mockResolvedValue({ data: { incidents: 'nope' } });

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([]);
  });

  it('reads a failed request as no incidents', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    mockGet.mockRejectedValue(new Error('Network Error'));

    await expect(fetchFeeServiceIncidents('key')).resolves.toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});
