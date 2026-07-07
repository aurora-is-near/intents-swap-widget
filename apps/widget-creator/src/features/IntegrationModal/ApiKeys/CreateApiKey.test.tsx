import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PRIVACY_URL, TERMS_URL } from '@/constants';

import { CreateApiKey } from './CreateApiKey';

describe('CreateApiKey', () => {
  const onClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when the user has not yet accepted', () => {
    it('links to the Terms of Service and Privacy Policy in the acceptance label', () => {
      render(
        <CreateApiKey
          isLoading={false}
          alreadyAccepted={false}
          onClick={onClick}
        />,
      );

      expect(
        screen.getByRole('link', { name: /terms of service/i }),
      ).toHaveAttribute('href', TERMS_URL);
      expect(
        screen.getByRole('link', { name: /privacy policy/i }),
      ).toHaveAttribute('href', PRIVACY_URL);
    });

    it('does not create a key until the terms are accepted', () => {
      render(
        <CreateApiKey
          isLoading={false}
          alreadyAccepted={false}
          onClick={onClick}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /create api key/i }));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('creates a key once the terms checkbox is ticked', () => {
      render(
        <CreateApiKey
          isLoading={false}
          alreadyAccepted={false}
          onClick={onClick}
        />,
      );

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create api key/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the user has already accepted', () => {
    it('replaces the checkbox with a "terms apply" footer', () => {
      render(
        <CreateApiKey isLoading={false} alreadyAccepted onClick={onClick} />,
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(
        screen.getByText(
          (_, element) =>
            element?.tagName.toLowerCase() === 'p' &&
            /the terms of service and privacy policy apply\./i.test(
              element.textContent ?? '',
            ),
        ),
      ).toBeInTheDocument();
    });

    it('creates a key immediately without requiring the checkbox', () => {
      render(
        <CreateApiKey isLoading={false} alreadyAccepted onClick={onClick} />,
      );

      fireEvent.click(screen.getByRole('button', { name: /create api key/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
