// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Tooltip, TooltipProvider } from './Tooltip';

afterEach(cleanup);

function Hint() {
  return (
    <TooltipProvider delay={0}>
      <Tooltip content="Annual rate, variable">
        <Button variant="ghost">APR</Button>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('Tooltip', () => {
  it('shows on keyboard focus with role tooltip and hides on Escape', async () => {
    const user = userEvent.setup();

    render(<Hint />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();

    expect(screen.getByRole('button', { name: 'APR' })).toHaveFocus();

    const tooltip = await screen.findByRole('tooltip');

    expect(tooltip).toHaveTextContent('Annual rate, variable');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('shows on hover', async () => {
    const user = userEvent.setup();

    render(<Hint />);

    await user.hover(screen.getByRole('button', { name: 'APR' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Annual rate, variable',
    );
  });
});

describe('Tooltip description', () => {
  it('describes the trigger only while open', async () => {
    const user = userEvent.setup();

    render(<Hint />);

    const trigger = screen.getByRole('button', { name: 'APR' });

    expect(trigger).not.toHaveAttribute('aria-describedby');

    await user.tab();
    await screen.findByRole('tooltip');

    expect(trigger).toHaveAccessibleDescription('Annual rate, variable');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(trigger).not.toHaveAttribute('aria-describedby');
    });
  });
});

describe('Tooltip description with the trigger’s own', () => {
  it('keeps the trigger’s own description and adds the tooltip while open', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delay={0}>
        <p id="apr-help">Paid yearly</p>
        <Tooltip content="Annual rate, variable">
          <Button aria-describedby="apr-help" variant="ghost">
            APR
          </Button>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'APR' });

    expect(trigger).toHaveAttribute('aria-describedby', 'apr-help');

    await user.tab();
    await screen.findByRole('tooltip');

    expect(trigger).toHaveAccessibleDescription(
      'Paid yearly Annual rate, variable',
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-describedby', 'apr-help');
    });
  });
});

describe('Tooltip cancelled open', () => {
  it('leaves the trigger undescribed when the open is cancelled', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delay={0}>
        <Tooltip
          content="Annual rate, variable"
          onOpenChange={(_open, eventDetails) => eventDetails.cancel()}>
          <Button variant="ghost">APR</Button>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'APR' });

    await user.tab();

    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });
});
