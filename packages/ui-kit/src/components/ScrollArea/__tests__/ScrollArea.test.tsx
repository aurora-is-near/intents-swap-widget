import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { ScrollArea } from '../ScrollArea';

describe('ScrollArea', () => {
  it('scrolls its children inside a focusable viewport', () => {
    render(
      <ScrollArea viewportClassName="max-h-60">
        <p>Row 1</p>
      </ScrollArea>,
    );

    const viewport = screen.getByText('Row 1').parentElement;

    expect(viewport).toHaveClass('max-h-60', 'overscroll-contain');
  });

  it('puts className, the other props and the ref on the root', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <ScrollArea ref={ref} aria-label="Tokens" className="mt-2.5">
        <p>Row 1</p>
      </ScrollArea>,
    );

    const root = screen.getByLabelText('Tokens');

    expect(root).toBe(ref.current);
    expect(root).toHaveClass('relative', 'mt-2.5');
    expect(root).toContainElement(screen.getByText('Row 1'));
  });
});
