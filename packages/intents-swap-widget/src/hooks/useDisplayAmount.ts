import { useState } from 'react';

import { isSameAmount } from '@/utils/checkers/isSameAmount';

/**
 * Keeps the amount as the user typed it while it's being edited.
 *
 * react-imask re-applies `value` to the mask on every render, and the amount
 * round-trips through the store as a bigint, so an in-progress "1."
 * (a one followed by a decimal) comes back as "1" (with no decimal). Feeding
 * that straight back would drop the decimal separator whenever something
 * re-renders mid-typing, so the prop is only taken when it represents a
 * different amount.
 */
export const useDisplayAmount = (value: string) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);

    if (!isSameAmount(value, displayValue)) {
      setDisplayValue(value);
    }
  }

  return [displayValue, setDisplayValue] as const;
};
