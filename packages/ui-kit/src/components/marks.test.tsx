// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { ChainMark, ChainMarkGroup } from './ChainMark';
import { TokenMark } from './TokenMark';

afterEach(cleanup);

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
        'text-[14px]',
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
    render(<TokenMark className="extra text-[24px]" label="ET" />);

    const classes = classesOf(screen.getByText('ET'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'text-[24px]']));
    expect(classes).not.toContain('text-[14px]');
  });

  it('forwards the ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();

    render(<TokenMark label="ET" ref={ref} />);

    expect(ref.current).toBe(screen.getByText('ET'));
  });
});

describe('ChainMark', () => {
  it('defaults to 26px with an --sf ring and 9px text', () => {
    render(<ChainMark bg="#FFE2A8" fg="#4A3000" label="BT" />);

    const mark = screen.getByText('BT');

    expect(classesOf(mark)).toEqual(
      expect.arrayContaining([
        'h-[26px]',
        'w-[26px]',
        'border-2',
        'border-sf',
        'text-[9px]',
        'rounded-full',
        'font-extrabold',
      ]),
    );
    expect(mark).toHaveStyle({ background: '#FFE2A8', color: '#4A3000' });
  });

  it('size 32 has an --sf2 ring and 10px text', () => {
    render(<ChainMark label="BT" size={32} />);

    const classes = classesOf(screen.getByText('BT'));

    expect(classes).toEqual(
      expect.arrayContaining([
        'h-[32px]',
        'w-[32px]',
        'border-sf2',
        'text-[10px]',
      ]),
    );
    expect(classes).not.toContain('border-sf');
  });

  it('ringColor overrides the ring', () => {
    render(<ChainMark label="BT" ringColor="#123456" />);

    expect(screen.getByText('BT')).toHaveStyle({ borderColor: '#123456' });
  });

  it('renders a logo with alt text when src is given', () => {
    render(<ChainMark label="BT" src="/btc.svg" />);

    expect(screen.getByRole('img', { name: 'BT' })).toHaveAttribute(
      'src',
      '/btc.svg',
    );
  });

  it('merges className and forwards the ref', () => {
    const ref = createRef<HTMLSpanElement>();

    render(<ChainMark className="extra text-[12px]" label="BT" ref={ref} />);

    const classes = classesOf(screen.getByText('BT'));

    expect(ref.current).toBe(screen.getByText('BT'));
    expect(classes).toEqual(expect.arrayContaining(['extra', 'text-[12px]']));
    expect(classes).not.toContain('text-[9px]');
  });
});

describe('ChainMarkGroup', () => {
  it('overlaps every mark after the first by 8px at 26px', () => {
    render(
      <ChainMarkGroup>
        <ChainMark label="BT" />
        <ChainMark label="ET" />
        <ChainMark label="US" />
      </ChainMarkGroup>,
    );

    expect(classesOf(screen.getByText('BT'))).not.toContain('-ml-[8px]');
    expect(classesOf(screen.getByText('ET'))).toContain('-ml-[8px]');
    expect(classesOf(screen.getByText('US'))).toContain('-ml-[8px]');
  });

  it('passes its size to the marks and overlaps by 10px at 32px', () => {
    render(
      <ChainMarkGroup size={32}>
        <ChainMark label="BT" />
        <ChainMark className="extra" label="ET" />
      </ChainMarkGroup>,
    );

    expect(classesOf(screen.getByText('BT'))).toContain('h-[32px]');
    expect(classesOf(screen.getByText('BT'))).not.toContain('-ml-[10px]');
    expect(classesOf(screen.getByText('ET'))).toEqual(
      expect.arrayContaining(['h-[32px]', '-ml-[10px]', 'extra']),
    );
  });

  it("a mark's own size wins over the group's, overlap included", () => {
    render(
      <ChainMarkGroup size={26}>
        <ChainMark label="BT" />
        <ChainMark label="ET" size={32} />
      </ChainMarkGroup>,
    );

    const classes = classesOf(screen.getByText('ET'));

    expect(classes).toEqual(expect.arrayContaining(['h-[32px]', '-ml-[10px]']));
    expect(classes).not.toContain('h-[26px]');
    expect(classes).not.toContain('-ml-[8px]');
  });

  it('leaves a child that is not a mark untouched', () => {
    render(
      <ChainMarkGroup>
        <ChainMark label="BT" />
        <span className="ml-[8px]">+2</span>
        <ChainMark label="ET" />
      </ChainMarkGroup>,
    );

    const more = screen.getByText('+2');

    expect(more).not.toHaveAttribute('size');
    expect(more).toHaveClass('ml-[8px]', { exact: true });
    expect(classesOf(screen.getByText('BT'))).not.toContain('-ml-[8px]');
    expect(classesOf(screen.getByText('ET'))).toContain('-ml-[8px]');
  });

  it('merges className and forwards the ref', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <ChainMarkGroup className="extra" data-testid="group" ref={ref}>
        <ChainMark label="BT" />
      </ChainMarkGroup>,
    );

    const group = screen.getByTestId('group');

    expect(ref.current).toBe(group);
    expect(classesOf(group)).toEqual(
      expect.arrayContaining(['inline-flex', 'extra']),
    );
  });
});
