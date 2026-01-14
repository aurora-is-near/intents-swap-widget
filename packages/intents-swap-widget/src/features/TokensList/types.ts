import type { Token } from '@/types/token';

type OddGroup = {
  label: string | null;
  count: number;
  tokens?: never;
};

type EvenGroup = {
  label?: never;
  count?: never;
  tokens: Token[];
};

// covers 3 sections max (extend if needed)
export type ListGroup<N extends number = 6> = N extends 0
  ? []
  : N extends 1
    ? [EvenGroup]
    : N extends 2
      ? [OddGroup, EvenGroup]
      : N extends 4
        ? [OddGroup, EvenGroup, OddGroup, EvenGroup]
        : N extends 6
          ? [OddGroup, EvenGroup, OddGroup, EvenGroup, OddGroup, EvenGroup]
          : never;

export type AnyListGroup = ListGroup<0 | 1 | 2 | 4 | 6>;
