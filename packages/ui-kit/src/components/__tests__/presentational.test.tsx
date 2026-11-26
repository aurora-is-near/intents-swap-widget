import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Card } from '../Card/Card';
import { Highlight } from '../Highlight/Highlight';
import { Text } from '../Text/Text';

const classesOf = (element: Element) => element.className.split(' ');

describe('Text', () => {
  it.each([
    [
      'h64',
      'H1',
      ['text-h64', 'font-extrabold', 'leading-1.02', 'tracking-display'],
    ],
    ['label', 'DIV', ['text-12', 'tracking-label', 'text-mut2']],
  ] as const)(
    '%s renders a %s with its type style',
    (variant, tagName, expected) => {
      render(<Text variant={variant}>Borrow</Text>);

      const element = screen.getByText('Borrow');

      expect(element.tagName).toBe(tagName);
      expect(classesOf(element)).toEqual(expect.arrayContaining([...expected]));
    },
  );

  it('merges className, and a conflicting class wins', () => {
    render(
      <Text className="extra text-ink tracking-widest" variant="label">
        Label
      </Text>,
    );

    const classes = classesOf(screen.getByText('Label'));

    expect(classes).toEqual(
      expect.arrayContaining(['extra', 'text-ink', 'tracking-widest']),
    );
    expect(classes).not.toContain('text-mut2');
    expect(classes).not.toContain('tracking-label');
  });

  it('keeps the type-scale size next to a text colour', () => {
    render(
      <Text className="text-ink" variant="h64">
        Borrow
      </Text>,
    );

    expect(classesOf(screen.getByText('Borrow'))).toEqual(
      expect.arrayContaining(['text-h64', 'text-ink']),
    );
  });

  it('forwards the ref to the element', () => {
    const ref = createRef<HTMLElement>();

    render(
      <Text ref={ref} variant="h64">
        Borrow
      </Text>,
    );

    expect(ref.current).toBe(screen.getByText('Borrow'));
  });
});

describe('Highlight', () => {
  it('renders the lime word mark', () => {
    render(<Highlight>easy</Highlight>);

    expect(classesOf(screen.getByText('easy'))).toEqual(
      expect.arrayContaining([
        'inline-block',
        'rounded-12',
        'bg-accent',
        'px-3',
        'text-onlime',
      ]),
    );
  });

  it('merges className and forwards the ref', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <Highlight className="px-2" ref={ref}>
        easy
      </Highlight>,
    );

    const element = screen.getByText('easy');

    expect(ref.current).toBe(element);
    expect(classesOf(element)).toContain('px-2');
    expect(classesOf(element)).not.toContain('px-3');
  });
});

describe('Card', () => {
  it('renders the bordered surface with mobile padding', () => {
    render(<Card>Content</Card>);

    expect(classesOf(screen.getByText('Content'))).toEqual(
      expect.arrayContaining([
        'rounded-24',
        'border-1.5',
        'border-bd',
        'bg-sf',
        'p-(--card-p)',
        '[--card-p:22px]',
        'max-[640px]:[--card-p:16px]',
      ]),
    );
  });

  it('merges className, and a conflicting class wins', () => {
    render(<Card className="extra p-2.5">Content</Card>);

    const classes = classesOf(screen.getByText('Content'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'p-2.5']));
    expect(classes).not.toContain('p-(--card-p)');
  });

  it('a caller padding is the only padding utility left', () => {
    render(<Card className="p-0">Content</Card>);

    const paddings = classesOf(screen.getByText('Content')).filter((name) =>
      /^(?:[\w-]+:)?p[xytrbl]?-/.test(name),
    );

    expect(paddings).toEqual(['p-0']);
  });

  it('forwards the ref to the div', () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref}>Content</Card>);

    expect(ref.current).toBe(screen.getByText('Content'));
    expect(ref.current?.tagName).toBe('DIV');
  });
});
