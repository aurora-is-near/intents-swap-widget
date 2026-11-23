// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Badge } from './Badge';
import { Card } from './Card';
import { Highlight } from './Highlight';
import { Tag } from './Tag';
import { Text } from './Text';

afterEach(cleanup);

const classesOf = (element: Element) => element.className.split(' ');

describe('Text', () => {
  it.each([
    [
      'h64',
      'H1',
      ['text-h64', 'font-extrabold', 'leading-[1.02]', 'tracking-[-0.04em]'],
    ],
    [
      'h56',
      'H2',
      ['text-h56', 'font-extrabold', 'leading-[1.05]', 'tracking-[-0.04em]'],
    ],
    [
      'h44',
      'H3',
      ['text-h44', 'font-extrabold', 'leading-[1.05]', 'tracking-[-0.04em]'],
    ],
    [
      'big',
      'P',
      ['text-big', 'font-semibold', 'leading-[1.25]', 'tracking-[-0.03em]'],
    ],
    ['label', 'DIV', ['text-[12px]', 'tracking-[0.14em]', 'text-mut2']],
  ] as const)(
    '%s renders a %s with its type style',
    (variant, tagName, expected) => {
      render(<Text variant={variant}>Borrow</Text>);

      const element = screen.getByText('Borrow');

      expect(element.tagName).toBe(tagName);
      expect(classesOf(element)).toEqual(expect.arrayContaining([...expected]));
    },
  );

  it('renders the element passed in `as`', () => {
    render(
      <Text as="span" variant="h64">
        Borrow
      </Text>,
    );

    expect(screen.getByText('Borrow').tagName).toBe('SPAN');
  });

  it('merges className, and a conflicting class wins', () => {
    render(
      <Text className="extra text-ink tracking-[0.2em]" variant="label">
        Label
      </Text>,
    );

    const classes = classesOf(screen.getByText('Label'));

    expect(classes).toEqual(
      expect.arrayContaining(['extra', 'text-ink', 'tracking-[0.2em]']),
    );
    expect(classes).not.toContain('text-mut2');
    expect(classes).not.toContain('tracking-[0.14em]');
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
      <Text ref={ref} variant="h56">
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
        'rounded-[12px]',
        'bg-accent',
        'px-[12px]',
        'text-onlime',
      ]),
    );
  });

  it('merges className and forwards the ref', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <Highlight className="px-[8px]" ref={ref}>
        easy
      </Highlight>,
    );

    const element = screen.getByText('easy');

    expect(ref.current).toBe(element);
    expect(classesOf(element)).toContain('px-[8px]');
    expect(classesOf(element)).not.toContain('px-[12px]');
  });
});

describe('Card', () => {
  it('renders the bordered surface with mobile padding', () => {
    render(<Card>Content</Card>);

    expect(classesOf(screen.getByText('Content'))).toEqual(
      expect.arrayContaining([
        'rounded-[24px]',
        'border-[1.5px]',
        'border-bd',
        'bg-sf',
        'p-(--card-p)',
        '[--card-p:22px]',
        'max-[640px]:[--card-p:16px]',
      ]),
    );
  });

  it('tint swaps the background and border colour', () => {
    render(<Card variant="tint">Content</Card>);

    const classes = classesOf(screen.getByText('Content'));

    expect(classes).toEqual(
      expect.arrayContaining(['bg-tint', 'border-limebd', 'border-[1.5px]']),
    );
    expect(classes).not.toContain('bg-sf');
    expect(classes).not.toContain('border-bd');
  });

  it('merges className, and a conflicting class wins', () => {
    render(<Card className="extra p-[10px]">Content</Card>);

    const classes = classesOf(screen.getByText('Content'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'p-[10px]']));
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

describe('Badge', () => {
  it.each([
    [
      'best',
      ['bg-accent', 'text-onlime', 'px-[10px]', 'py-[1px]', 'rounded-[7px]'],
    ],
    [
      'neutral',
      [
        'bg-sf2',
        'px-[12px]',
        'py-[6px]',
        'rounded-full',
        'text-[14px]',
        'font-semibold',
      ],
    ],
    [
      'count',
      ['bg-accent', 'text-onlime', 'rounded-full', 'px-[8px]', 'text-[13px]'],
    ],
  ] as const)('%s renders its classes', (variant, expected) => {
    render(<Badge variant={variant}>3</Badge>);

    expect(classesOf(screen.getByText('3'))).toEqual(
      expect.arrayContaining([...expected]),
    );
  });

  it('merges className, and a conflicting class wins', () => {
    render(
      <Badge className="extra bg-ink" variant="count">
        3
      </Badge>,
    );

    const classes = classesOf(screen.getByText('3'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'bg-ink']));
    expect(classes).not.toContain('bg-accent');
  });

  it('forwards the ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <Badge ref={ref} variant="best">
        USDC
      </Badge>,
    );

    expect(ref.current).toBe(screen.getByText('USDC'));
  });
});

describe('Tag', () => {
  it('renders the status tag shape', () => {
    render(<Tag tone="positive">Active</Tag>);

    expect(classesOf(screen.getByText('Active'))).toEqual(
      expect.arrayContaining([
        'inline-flex',
        'gap-[6px]',
        'rounded-full',
        'px-[10px]',
        'py-[3px]',
        'text-[12px]',
        'font-bold',
        'whitespace-nowrap',
      ]),
    );
  });

  it.each([
    ['risk', 'bg-negbg', 'text-neg'],
    ['warn', 'bg-warnbg', 'text-warn'],
    ['positive', 'bg-tint', 'text-pos'],
    ['neutral', 'bg-sf2', 'text-mut'],
  ] as const)('%s uses %s and %s', (tone, bg, fg) => {
    render(<Tag tone={tone}>Status</Tag>);

    expect(classesOf(screen.getByText('Status'))).toEqual(
      expect.arrayContaining([bg, fg]),
    );
  });

  it('merges className, and a conflicting class wins', () => {
    render(
      <Tag className="extra text-ink" tone="risk">
        At risk
      </Tag>,
    );

    const classes = classesOf(screen.getByText('At risk'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'text-ink']));
    expect(classes).not.toContain('text-neg');
  });

  it('forwards the ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <Tag ref={ref} tone="warn">
        Watch
      </Tag>,
    );

    expect(ref.current).toBe(screen.getByText('Watch'));
  });
});
