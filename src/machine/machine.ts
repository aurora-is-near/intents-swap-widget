import { createMachine } from 'valtio-fsm';

import { logger } from '@/logger';

import { guardStates } from '@/machine/guards';
import { initialContext } from '@/machine/context';
import type { Context } from '@/machine/context';

export type MachineState =
  | 'initial_dry'
  | 'initial_wallet'
  | 'input_valid_dry'
  | 'input_valid_internal'
  | 'input_valid_external'
  | 'quote_success_dry'
  | 'quote_success_internal'
  | 'quote_success_external'
  | 'transfer_success';

export const machine = createMachine<MachineState, Context>(
  'initial_dry',
  {
    // 1. Wallet not connected
    initial_dry: {
      transitions: ['initial_wallet', 'input_valid_dry'],
    },

    // 2. Wallet connected
    initial_wallet: {
      transitions: [
        'initial_dry',
        'input_valid_internal',
        'input_valid_external',
        'input_valid_dry',
      ],
    },

    // 3. Wallet not connected and user inputs are valid
    input_valid_dry: {
      transitions: [
        'initial_dry',
        'initial_wallet',
        'quote_success_dry',
        'initial_wallet',
      ],
    },

    // 4. Wallet connected and user inputs are valid for Intents swap
    input_valid_internal: {
      transitions: [
        'initial_dry',
        'initial_wallet',
        'quote_success_internal',
        'transfer_success',
        'input_valid_dry',
      ],
    },

    // 5. Wallet connected and user inputs are valid for external swap
    input_valid_external: {
      transitions: [
        'initial_dry',
        'initial_wallet',
        'quote_success_external',
        'transfer_success',
        'input_valid_dry',
      ],
    },

    // 6. Wallet not connected and dry quote fetched
    quote_success_dry: {
      transitions: [
        'initial_dry',
        'input_valid_dry',
        'initial_wallet',
        'input_valid_external',
        'input_valid_internal',
      ],
    },

    // 7. Wallet connected and real quote fetched
    quote_success_internal: {
      transitions: [
        'initial_dry',
        'initial_wallet',
        'input_valid_internal',
        'input_valid_external',
        'transfer_success',
        'input_valid_dry',
      ],
    },

    quote_success_external: {
      transitions: [
        'initial_dry',
        'initial_wallet',
        'input_valid_internal',
        'input_valid_external',
        'transfer_success',
        'input_valid_dry',
      ],
    },

    // 8. Transfer is made
    transfer_success: {
      transitions: ['initial_dry', 'initial_wallet'],
    },
  },
  initialContext,
);

export const moveTo = <S extends MachineState>(
  state: S,
  { onMoved }: { onMoved?: (state: S) => void } = {},
) => {
  if (machine.current === state) {
    return;
  }

  const canMove = machine.canMoveTo(state);

  if (!canMove) {
    logger.error(
      `[WIDGET] Invalid logical transition request with moveTo (from ${machine.current} to ${state})`,
    );

    return;
  }

  if (!guardStates(machine.context, [state])) {
    logger.error(
      `[WIDGET] Invalid context state for transition request with moveTo (from ${machine.current} to ${state})}`,
    );

    return;
  }

  const { current, context } = machine.moveTo(state);

  if (current === state) {
    context.state = state;
    onMoved?.(state);
  }
};
