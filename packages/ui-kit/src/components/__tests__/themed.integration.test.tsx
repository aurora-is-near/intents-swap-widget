import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';

/**
 * jsdom does not compute Tailwind CSS, so this checks the switch the tokens
 * hang off; tokens.test.ts covers the colour each theme resolves to.
 */
function Screen() {
  const { setPreference } = useTheme();

  return (
    <Card>
      <p>Active</p>
      <Button onClick={() => setPreference('dark')} variant="secondary">
        Dark
      </Button>
      <Button onClick={() => setPreference('light')} variant="secondary">
        Light
      </Button>
      <Button>Borrow</Button>
    </Card>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
});

describe('components under ThemeProvider', () => {
  it('flip data-theme on the document between dark and light', async () => {
    render(
      <ThemeProvider>
        <Screen />
      </ThemeProvider>,
    );

    const root = document.documentElement;

    expect(screen.getByRole('button', { name: 'Borrow' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(root).toHaveAttribute('data-theme', 'light');

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(root).toHaveAttribute('data-theme', 'dark');

    await userEvent.click(screen.getByRole('button', { name: 'Light' }));

    expect(root).toHaveAttribute('data-theme', 'light');
  });
});
