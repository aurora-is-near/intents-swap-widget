import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SwapModePanel } from '../SwapModePanel';

const renderPanel = (quotes = {}) =>
  render(
    <SwapModePanel
      isQuoting={false}
      mode="confidential"
      onModeChange={vi.fn()}
      quotes={quotes}
    />,
  );

describe('SwapModePanel', () => {
  it('hides the confidential quote until the eye shows it', async () => {
    const user = userEvent.setup();

    renderPanel({ confidential: '≈ 1.367729 USDC', public: '≈ 1.37186 USDC' });

    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('≈ 1.367729 USDC')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Show the confidential quote' }),
    );

    expect(screen.getByText('≈ 1.367729 USDC')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Hide the confidential quote' }),
    );

    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('shows the standard quote with no eye', () => {
    renderPanel({ public: '≈ 1.37186 USDC' });

    expect(screen.getByText('≈ 1.37186 USDC')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /quote/ })).toHaveLength(1);
  });

  it('shows a dash, not "Hidden", before any confidential quote', () => {
    renderPanel();

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('picks a mode from the card, not from the eye', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(
      <SwapModePanel
        isQuoting={false}
        mode="public"
        onModeChange={onModeChange}
        quotes={{ confidential: '≈ 1 USDC' }}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Show the confidential quote' }),
    );

    expect(onModeChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^Confidential/ }));

    expect(onModeChange).toHaveBeenCalledWith('confidential');
  });
});
