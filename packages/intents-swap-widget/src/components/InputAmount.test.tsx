import { jest } from '@jest/globals';
import { useState } from 'react';

import { setup } from '@/tests/setup';
import { InputAmount } from './InputAmount';

jest.useFakeTimers();

const InputAmountSetup = () => {
  const [value, setValue] = useState('');

  return <InputAmount value={value} setValue={setValue} aria-label="Amount" />;
};

describe('InputAmount', () => {
  it.each([
    '9999999999999999',
    '123456789012345678901234',
    '123456789012345678901234.123456789012345678',
  ])('does not cap %s at Number.MAX_SAFE_INTEGER', async (amount) => {
    const { user, screen } = setup(<InputAmountSetup />);
    const input = screen.getByLabelText('Amount');

    await user.type(input, amount);

    expect(input).toHaveValue(amount);
  });
});
