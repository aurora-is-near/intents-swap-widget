// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './Button';
import { Spinner } from './Spinner';

afterEach(cleanup);

const classesOf = (element: Element) => element.className.split(' ');

describe('Button', () => {
  it.each([
    [
      'primary',
      [
        'bg-ink',
        'text-sf',
        'border-0',
        'rounded-[18px]',
        'p-[20px]',
        'text-[19px]',
        'font-bold',
        'w-full',
        'leading-[normal]',
      ],
    ],
    [
      'accent',
      [
        'bg-accent',
        'text-onlime',
        'border-0',
        'rounded-[18px]',
        'p-[20px]',
        'text-[19px]',
        'font-bold',
        'w-full',
        'leading-[normal]',
      ],
    ],
    [
      'danger',
      [
        'bg-sf',
        'text-neg',
        'border-2',
        'border-[#E5694F]',
        'rounded-[18px]',
        'p-[18px]',
        'text-[19px]',
        'w-full',
        'leading-[normal]',
      ],
    ],
    [
      'secondary',
      [
        'rounded-full',
        'border-[1.5px]',
        'border-bd2',
        'bg-sf',
        'px-[18px]',
        'py-[9px]',
        'text-[15px]',
        'font-bold',
        'enabled:hover:border-ink',
        'text-ink',
        'leading-[normal]',
      ],
    ],
    [
      'ghost',
      [
        'bg-transparent',
        'border-0',
        'rounded-[12px]',
        'px-[20px]',
        'py-[10px]',
        'text-[16px]',
        'text-mut',
        'font-bold',
        'enabled:hover:bg-hov',
        'leading-[normal]',
      ],
    ],
    [
      'link',
      [
        'bg-transparent',
        'border-0',
        'p-0',
        'text-[15px]',
        'font-semibold',
        'text-mut',
        'underline',
        'leading-[normal]',
      ],
    ],
  ] as const)('%s renders its artboard classes', (variant, expected) => {
    render(<Button variant={variant}>Borrow</Button>);

    expect(classesOf(screen.getByRole('button'))).toEqual(
      expect.arrayContaining([...expected]),
    );
  });

  it('is primary and large by default, with type="button"', () => {
    render(<Button>Borrow</Button>);

    const button = screen.getByRole('button', { name: 'Borrow' });

    expect(button).toHaveAttribute('type', 'button');
    expect(classesOf(button)).toEqual(
      expect.arrayContaining(['bg-ink', 'w-full', 'p-[20px]']),
    );
  });

  it('keeps a type passed in', () => {
    render(<Button type="submit">Borrow</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it.each(['primary', 'accent'] as const)(
    'size="md" gives %s auto width, 14px 26px padding and 17px type',
    (variant) => {
      render(
        <Button size="md" variant={variant}>
          Start a new loan
        </Button>,
      );

      const classes = classesOf(screen.getByRole('button'));

      expect(classes).toEqual(
        expect.arrayContaining([
          'w-auto',
          'px-[26px]',
          'py-[14px]',
          'text-[17px]',
          'leading-[normal]',
        ]),
      );
      expect(classes).not.toContain('w-full');
      expect(classes).not.toContain('p-[20px]');
      expect(classes).not.toContain('text-[19px]');
    },
  );

  it('size="md" keeps danger the same outer size by taking its border out of the padding', () => {
    render(
      <Button size="md" variant="danger">
        Repay
      </Button>,
    );

    const classes = classesOf(screen.getByRole('button'));

    expect(classes).toEqual(
      expect.arrayContaining([
        'w-auto',
        'px-[24px]',
        'py-[12px]',
        'leading-[normal]',
      ]),
    );
    expect(classes).not.toContain('p-[18px]');
  });

  it.each(['secondary', 'ghost'] as const)(
    'size does not apply to %s',
    (variant) => {
      render(
        <Button size="md" variant={variant}>
          Max
        </Button>,
      );

      const classes = classesOf(screen.getByRole('button'));

      expect(classes).not.toContain('w-auto');
      expect(classes).not.toContain('text-[17px]');
    },
  );

  it('keeps its line-height when className sets a font size', () => {
    render(<Button className="p-[18px] text-[18px]">Repay</Button>);

    expect(classesOf(screen.getByRole('button'))).toEqual(
      expect.arrayContaining(['text-[18px]', 'leading-[normal]']),
    );
  });

  it('takes a line-height passed in className', () => {
    render(<Button className="leading-[1.2]">Repay</Button>);

    const classes = classesOf(screen.getByRole('button'));

    expect(classes).toContain('leading-[1.2]');
    expect(classes).not.toContain('leading-[normal]');
  });

  it('takes a size/line-height pair passed in className', () => {
    render(<Button className="text-[18px]/[1.2]">Repay</Button>);

    const classes = classesOf(screen.getByRole('button'));

    expect(classes).toContain('text-[18px]/[1.2]');
    expect(classes).not.toContain('leading-[normal]');
  });

  it('has the focus ring and the disabled look', () => {
    render(<Button>Borrow</Button>);

    expect(classesOf(screen.getByRole('button'))).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-[3px]',
        'focus-visible:outline-solid',
        'focus-visible:outline-ink',
        'focus-visible:outline-offset-2',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
      ]),
    );
  });

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Borrow</Button>);
    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled blocks onClick', async () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Borrow
      </Button>,
    );

    const button = screen.getByRole('button');

    expect(button).toBeDisabled();

    await userEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading sets aria-busy, shows a current-colour spinner and blocks onClick', async () => {
    const onClick = vi.fn();

    render(
      <Button loading onClick={onClick}>
        Borrow
      </Button>,
    );

    const button = screen.getByRole('button');
    const spinner = screen.getByRole('status');

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button).toContainElement(spinner);
    expect(classesOf(spinner)).toEqual(
      expect.arrayContaining(['border-t-current']),
    );

    await userEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('has no aria-busy or spinner when not loading', () => {
    render(<Button>Borrow</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('forwards its ref', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Borrow</Button>);

    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('merges className, and a conflicting class wins', () => {
    render(<Button className="extra rounded-[8px]">Borrow</Button>);

    const classes = classesOf(screen.getByRole('button'));

    expect(classes).toEqual(expect.arrayContaining(['extra', 'rounded-[8px]']));
    expect(classes).not.toContain('rounded-[18px]');
  });
});

describe('Spinner', () => {
  it('is a 22px status with an accessible label and the artboard classes', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status', { name: 'Loading' });

    expect(spinner).toHaveStyle({ width: '22px', height: '22px' });
    expect(classesOf(spinner)).toEqual(
      expect.arrayContaining([
        'rounded-full',
        'border-[3px]',
        'border-bd',
        'border-t-ink',
        'animate-[spin_0.8s_linear_infinite]',
      ]),
    );
  });

  it('takes a size and a label', () => {
    render(<Spinner label="Checking position" size={20} />);

    expect(
      screen.getByRole('status', { name: 'Checking position' }),
    ).toHaveStyle({ width: '20px', height: '20px' });
  });

  it('follows the text colour with tone="current"', () => {
    render(<Spinner tone="current" />);

    const classes = classesOf(screen.getByRole('status'));

    expect(classes).toEqual(
      expect.arrayContaining(['border-current/25', 'border-t-current']),
    );
    expect(classes).not.toContain('border-bd');
    expect(classes).not.toContain('border-t-ink');
  });

  it('forwards its ref and merges className', () => {
    const ref = createRef<HTMLSpanElement>();

    render(<Spinner ref={ref} className="extra m-[2px]" />);

    const spinner = screen.getByRole('status');

    expect(ref.current).toBe(spinner);
    expect(classesOf(spinner)).toEqual(
      expect.arrayContaining(['extra', 'm-[2px]']),
    );
  });
});
