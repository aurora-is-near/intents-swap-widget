// @vitest-environment jsdom
import { cleanup, isInaccessible, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('is hidden from the accessibility tree', () => {
    const { container } = render(<Skeleton height={20} width={120} />);
    const block = container.firstElementChild as HTMLElement;

    expect(block).toHaveAttribute('aria-hidden', 'true');
    expect(isInaccessible(block)).toBe(true);
  });

  it('pulses and stops pulsing under reduced motion', () => {
    const { container } = render(<Skeleton />);
    const classes = (
      container.firstElementChild as HTMLElement
    ).className.split(' ');

    expect(classes).toContain('animate-pulse');
    expect(classes).toContain('motion-reduce:animate-none');
  });

  it('takes its size and radius from props', () => {
    const { container } = render(
      <>
        <Skeleton height={20} width={120} />
        <Skeleton height={34} radius="full" width={34} />
      </>,
    );

    const [block, circle] = Array.from(container.children) as HTMLElement[];

    expect(block).toHaveStyle({
      width: '120px',
      height: '20px',
      borderRadius: '8px',
    });
    expect(circle).toHaveClass('rounded-full');
    expect(circle).toHaveStyle({ width: '34px', height: '34px' });
  });
});
