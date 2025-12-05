import { jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import type { JSX } from 'react';

export const setup = (
  jsx: JSX.Element,
): RenderResult & {
  user: UserEvent;
  screen: typeof screen;
  within: typeof within;
} => {
  // https://testing-library.com/docs/user-event/options/#advancetimers
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  return {
    user,
    screen,
    within,
    ...render(jsx),
  };
};
