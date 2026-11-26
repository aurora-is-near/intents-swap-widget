import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Banner } from '../Banner';

describe('Banner', () => {
  it('announces a danger banner as an alert', () => {
    render(
      <Banner title="Transaction failed" tone="danger">
        The wallet rejected the request.
      </Banner>,
    );

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Transaction failed');
    expect(alert).toHaveTextContent('The wallet rejected the request.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces a warning banner as a status', () => {
    render(
      <Banner title="Still waiting" tone="warning">
        The bridge is slower than usual.
      </Banner>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Still waiting');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses the negbg tint for a tinted danger banner', () => {
    render(<Banner tinted title="Close to liquidation" tone="danger" />);

    const classes = screen.getByRole('alert').className.split(' ');

    expect(classes).toContain('bg-negbg');
    expect(classes).not.toContain('bg-sf2');
  });
});
