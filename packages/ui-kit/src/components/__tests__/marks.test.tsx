import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { TokenMark } from '../TokenMark/TokenMark';

const classesOf = (element: Element) => element.className.split(' ');

describe('TokenMark', () => {
  it('renders the letters in a 38px circle with the colours passed in', () => {
    render(<TokenMark bg="#DAD9F7" fg="#25235C" label="ET" />);

    const mark = screen.getByText('ET');

    expect(mark).toHaveStyle({
      width: '38px',
      height: '38px',
      background: '#DAD9F7',
      color: '#25235C',
    });
    expect(classesOf(mark)).toEqual(
      expect.arrayContaining([
        'rounded-full',
        'text-14',
        'font-extrabold',
        'items-center',
        'justify-center',
      ]),
    );
  });

  it('applies a custom size', () => {
    render(<TokenMark label="US" size={24} />);

    expect(screen.getByText('US')).toHaveStyle({
      width: '24px',
      height: '24px',
    });
  });

  it('renders a logo with alt text when src is given', () => {
    render(<TokenMark label="ET" src="/eth.svg" />);

    const logo = screen.getByRole('img', { name: 'ET' });

    expect(logo).toHaveAttribute('src', '/eth.svg');
    expect(screen.queryByText('ET')).not.toBeInTheDocument();
  });

  it('uses the alt text passed in', () => {
    render(<TokenMark alt="Ether" label="ET" src="/eth.svg" />);

    expect(screen.getByRole('img', { name: 'Ether' })).toBeInTheDocument();
  });

  it('merges className, and a conflicting class wins', () => {
    render(<TokenMark className="extra text-24" label="ET" />);

    const classes = classesOf(screen.getByText('ET'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'text-24']));
    expect(classes).not.toContain('text-14');
  });

  it('forwards the ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();

    render(<TokenMark label="ET" ref={ref} />);

    expect(ref.current).toBe(screen.getByText('ET'));
  });
});
