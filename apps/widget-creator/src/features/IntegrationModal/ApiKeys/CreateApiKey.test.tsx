import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TERMS_URL } from '@/constants';

import { CreateApiKey } from './CreateApiKey';

describe('CreateApiKey', () => {
  const onClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links to the published Terms & Conditions in the acceptance label', () => {
    render(<CreateApiKey isLoading={false} onClick={onClick} />);

    const link = screen.getByRole('link', { name: /terms and conditions/i });

    expect(link).toHaveAttribute('href', TERMS_URL);
  });

  it('does not create a key until the Terms & Conditions are accepted', () => {
    render(<CreateApiKey isLoading={false} onClick={onClick} />);

    const button = screen.getByRole('button', { name: /create api key/i });

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('creates a key once the Terms & Conditions checkbox is ticked', () => {
    render(<CreateApiKey isLoading={false} onClick={onClick} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create api key/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
